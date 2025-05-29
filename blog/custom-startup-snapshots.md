---
title: 'Custom startup snapshots'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed)), Software Engineer and engine pre-heater supplier'
avatars:
  - 'yang-guo'
date: 2015-09-25 13:33:37
tags:
  - internals
description: 'V8 embedders can utilize snapshots to skip over the startup time incurred by initializations of JavaScript programs.'
---
The JavaScript specification includes a lot of built-in functionality, from [math functions](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math) to a [full-featured regular expression engine](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions). Every newly-created V8 context has these functions available from the start. For this to work, the global object (for example, the window object in a browser) and all the built-in functionality must be set up and initialized into V8’s heap at the time the context is created. It takes quite some time to do this from scratch.

Fortunately, V8 uses a shortcut to speed things up: just like thawing a frozen pizza for a quick dinner, we deserialize a previously-prepared snapshot directly into the heap to get an initialized context. On a regular desktop computer, this can bring the time to create a context from 40 ms down to less than 2 ms. On an average mobile phone, this could mean a difference between 270 ms and 10 ms.

Applications other than Chrome that embed V8 may require more than vanilla Javascript. Many load additional library scripts at startup, before the “actual” application runs. For example, a simple TypeScript VM based on V8 would have to load the TypeScript compiler on startup in order to translate TypeScript source code into JavaScript on-the-fly.

As of the release of V8 v4.3 two months ago, embedders can utilize snapshotting to skip over the startup time incurred by such an initialization. The [test case](https://chromium.googlesource.com/v8/v8.git/+/4.5.103.9/test/cctest/test-serialize.cc#661) for this feature shows how this API works.

To create a snapshot, we can call `v8::V8::CreateSnapshotDataBlob` with the to-be-embedded script as a null-terminated C string. After creating a new context, this script is compiled and executed. In our example, we create two custom startup snapshots, each of which define functions on top of what JavaScript already has built in.

We can then use `v8::Isolate::CreateParams` to configure a newly-created isolate so that it initializes contexts from a custom startup snapshot. Contexts created in that isolate are exact copies of the one from which we took a snapshot. The functions defined in the snapshot are available without having to define them again.

There is an important limitation to this: the snapshot can only capture V8’s heap. Any interaction from V8 with the outside is off-limits when creating the snapshot. Such interactions include:

- defining and calling API callbacks (i.e. functions created via `v8::FunctionTemplate`)
- creating typed arrays, since the backing store may be allocated outside of V8

And of course, values derived from sources such as `Math.random` or `Date.now` are fixed once the snapshot has been captured. They are no longer really random nor reflect the current time.

Limitations aside, startup snapshots remain a great way to save time on initialization. We can shave off 100 ms from the startup spent on loading the TypeScript compiler in our example above (on a regular desktop computer). We're looking forward to seeing how you might put custom snapshots to use!
