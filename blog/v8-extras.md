---
title: 'V8 extras'
author: 'Domenic Denicola ([@domenic](https://twitter.com/domenic)), Streams Sorcerer'
avatars:
  - 'domenic-denicola'
date: 2016-02-04 13:33:37
tags:
  - internals
description: 'V8 v4.8 includes “V8 extras”, a simple interface designed with the goal of allowing embedders to write high-performance, self-hosted APIs.'
---
V8 implements a large subset of the JavaScript language’s built-in objects and functions in JavaScript itself. For example, you can see our [promises implementation](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js) is written in JavaScript. Such built-ins are called _self-hosted_. These implementations are included in our [startup snapshot](/blog/custom-startup-snapshots) so that new contexts can be quickly created without needing to setup and initialize the self-hosted built-ins at runtime.

Embedders of V8, such as Chromium, sometimes desire to write APIs in JavaScript too. This works especially well for platform features that are self-contained, like [streams](https://streams.spec.whatwg.org/), or for features that are part of a “layered platform” of higher-level capabilities built on top of pre-existing lower-level ones. Although it’s always possible to run extra code at startup time to bootstrap embedder APIs (as is done in Node.js, for example), ideally embedders should be able to get the same speed benefits for their self-hosted APIs that V8 does.

V8 extras are a new feature of V8, as of our [v4.8 release](/blog/v8-release-48), designed with the goal of allowing embedders to write high-performance, self-hosted APIs via a simple interface. Extras are embedder-provided JavaScript files which are compiled directly into the V8 snapshot. They also have access to a few helper utilities that make it easier to write secure APIs in JavaScript.

## An example

A V8 extra file is simply a JavaScript file with a certain structure:

```js
(function(global, binding, v8) {
  'use strict';
  const Object = global.Object;
  const x = v8.createPrivateSymbol('x');
  const y = v8.createPrivateSymbol('y');

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, 'Vec2', {
    value: Vec2,
    enumerable: false,
    configurable: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

There are a few things to notice here:

- The `global` object is not present in the scope chain, so any access to it (such as that for `Object`) has to be done explicitly through the provided `global` argument.
- The `binding` object is a place to store values for or retrieve values from the embedder. A C++ API `v8::Context::GetExtrasBindingObject()` provides access to the `binding` object from the embedder’s side. In our toy example, we let the embedder perform norm computation; in a real example you might delegate to the embedder for something trickier like URL resolution. We also add the `Vec2` constructor to the `binding` object, so that embedder code can create `Vec2` instances without going through the potentially-mutable `global` object.
- The `v8` object provides a small number of APIs to allow you to write secure code. Here we create private symbols to store our internal state in a way that cannot be manipulated from the outside. (Private symbols are a V8-internal concept and do not make sense in standard JavaScript code.) V8’s built-ins often use “%-function calls” for these sort of things, but V8 extras cannot use %-functions since they are an internal implementation detail of V8 and not suitable for embedders to depend on.

You might be curious about where these objects come from. All three of them are initialized in [V8’s bootstrapper](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc), which installs some basic properties but mostly leaves the initialization to V8’s self-hosted JavaScript. For example, almost every .js file in V8 installs something on `global`; see e.g. [promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439) or [uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371). And we install APIs onto the `v8` object in [a number of places](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs). (The `binding` object is empty until manipulated by an extra or embedder, so the only relevant code in V8 itself is when the bootstrapper creates it.)

Finally, to tell V8 that we’ll be compiling in an extra, we add a line to our project’s gypfile:

```js
'v8_extra_library_files': ['./Vec2.js']
```

(You can see a real-world example of this [in V8’s gypfile](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170).)

## V8 extras in practice

V8 extras provide a new and lightweight way for embedders to implement features. JavaScript code can more easily manipulate JavaScript built-ins like arrays, maps, or promises; it can call other JavaScript functions without ceremony; and it can deal with exceptions in an idiomatic way. Unlike C++ implementations, features implemented in JavaScript via V8 extras can benefit from inlining, and calling them does not incur any boundary-crossing costs. These benefits are especially pronounced when compared to a traditional bindings system like Chromium’s Web IDL bindings.

V8 extras were introduced and refined over the last year, and Chromium is currently using them to [implement streams](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js). Chromium is also considering V8 extras for implementing [scroll customization](https://codereview.chromium.org/1333323003) and [efficient geometry APIs](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ).

V8 extras are still a work in progress, and the interface has some rough edges and disadvantages we hope to address over time. The primary area with room for improvement is the debugging story: errors are not easy to track down, and runtime debugging is most often done with print statements. In the future, we hope to integrate V8 extras into Chromium’s developer tools and tracing framework, both for Chromium itself and for any embedders that speak the same protocol.

Another cause for caution when using V8 extras is the extra developer effort required to write secure and robust code. V8 extras code operates directly on the snapshot, just like the code for V8’s self-hosted built-ins. It accesses the same objects as userland JavaScript, with no binding layer or separate context to prevent such access. For example, something as seemingly-simple as `global.Object.prototype.hasOwnProperty.call(obj, 5)` has six potential ways in which it could fail due to user code modifying the built-ins (count them!). Embedders like Chromium need to be robust against any user code, no matter its behavior, and so in such environments more care is necessary when writing extras than when writing traditional C++-implemented features.

If you’d like to learn more about V8 extras, check out our [design document](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz) which goes into much more detail. We look forward to improving V8 extras, and adding more features that allow developers and embedders to write expressive, high-performance additions to the V8 runtime.
