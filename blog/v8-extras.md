---
title: "V8扩展功能"
author: "Domenic Denicola ([@domenic](https://twitter.com/domenic)), 流处理大师"
avatars: 
  - "domenic-denicola"
date: "2016-02-04 13:33:37"
tags: 
  - 内部结构
description: "V8 v4.8包含“V8扩展功能”，一个旨在让嵌入者编写高性能、基于自身的API的简单接口。"
---
V8在JavaScript本身中实现了JavaScript语言内置对象和函数的大部分子集。例如，您可以看到我们的[Promise实现](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js)是用JavaScript编写的。这类内置对象称为_基于自身的_。这些实现包含在我们[启动快照](/blog/custom-startup-snapshots)中，因此可以快速创建新上下文，而无需在运行时设置和初始化基于自身的内置对象。

<!--truncate-->
V8的嵌入者（如Chromium）有时也希望用JavaScript编写API。这对自包含的平台功能（比如[流](https://streams.spec.whatwg.org/)）或者作为基于已有低级功能构建的高级功能的“分层平台”的一部分描写的功能特别有效。虽然始终可以通过启动时运行额外代码来启动嵌入者API（例如，在Node.js中这样做），但理想情况下，嵌入者也应该能够获得与V8相同的速度优势用于他们的基于自身的API。

V8扩展功能是V8的新功能，从我们的[v4.8版本发布](/blog/v8-release-48)开始，旨在通过简单的接口让嵌入者编写高性能、基于自身的API。扩展功能是嵌入者提供的JavaScript文件，这些文件直接编译到V8快照中。它们也可以使用一些辅助工具，这些工具使得用JavaScript编写安全的API更加容易。

## 一个示例

一个V8扩展文件只是一个具有特定结构的JavaScript文件：

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

这里有一些需要注意的事项：

- `global`对象不在范围链中，因此对它的任何访问（例如对`Object`的访问）都必须通过提供的`global`参数显式完成。
- `binding`对象是一个存储值或者从嵌入者处检索值的地方。一个C++ API `v8::Context::GetExtrasBindingObject()`提供了从嵌入者一端访问`binding`对象的能力。在我们的示例中，我们让嵌入者执行向量计算；在真正的示例中，您可能将更复杂的任务（例如URL解析）委托给嵌入者。我们还将`Vec2`构造函数添加到`binding`对象中，以便嵌入者代码可以创建`Vec2`实例而无需通过可能会被修改的`global`对象。
- `v8`对象提供了一小部分API，使您可以编写安全的代码。这里我们创建私有符号，以一种无法从外部操作的方式存储我们的内部状态。（私有符号是一个V8内部概念，在标准JavaScript代码中没有意义。）V8的内置对象通常使用“%-函数调用”来处理此类事情，但V8扩展功能不能使用%-函数，因为它们是V8的内部实现细节，并不适合嵌入者依赖。

您可能会好奇这些对象来自哪里。它们的初始化均发生在[V8的引导程序](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc)中，该引导程序安装了一些基本属性，但大部分初始化都由V8的基于自身的JavaScript完成。例如，V8中的几乎每个.js文件都会在`global`上安装一些东西；例如，请参阅[promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439)或[uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371)。我们还在[许多地方](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs)将API安装到`v8`对象中。（`binding`对象直到被嵌入者或额外文件操作时才会被初始化，因此V8本身中唯一重要的代码是引导程序创建它时的代码。）

最后，为了告诉V8我们将编译扩展，我们需要在项目的gyp文件中添加一行：

```js
'v8_extra_library_files': ['./Vec2.js']
```

（你可以在[V8的gyp文件](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170)中看到一个实际的例子。）

## V8扩展的实际应用

V8扩展为嵌入者提供了一种全新且轻量的实现功能的方法。JavaScript代码可以更轻松地操作JavaScript内建对象，比如数组、映射或Promise；它可以无需复杂的过程调用其他JavaScript函数；并且它可以用惯用的方式处理异常。与C++实现不同，通过V8扩展用JavaScript实现的功能可以受益于内联化，调用它们时不会产生跨边界的成本。与传统的绑定系统（如Chromium的Web IDL绑定）相比，这些优势尤为明显。

V8扩展在过去的一年中被引入和改进，Chromium目前使用它们来[实现流](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js)。Chromium还在考虑使用V8扩展来实现[滚动自定义](https://codereview.chromium.org/1333323003)和[高效的几何API](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ)。

V8扩展仍在改进中，其接口还有一些缺陷和不足，希望随着时间的推移能够得到解决。主要的改进空间是调试功能：错误难以追踪，运行时调试通常是通过打印语句完成的。未来，我们希望将V8扩展集成到Chromium的开发者工具和跟踪框架中，无论是对于Chromium本身，还是对于使用相同协议的任何嵌入者。

在使用V8扩展时另一个需要注意的问题是开发者需要付出额外的努力来编写安全且健壮的代码。V8扩展代码直接在快照之上运行，就像V8自托管内建对象的代码一样。它访问与用户层JavaScript相同的对象，没有绑定层或独立的上下文来阻止这种访问。例如，看似简单的`global.Object.prototype.hasOwnProperty.call(obj, 5)`由于用户代码修改内建对象，可能会导致六种可能的失败（算一下！）。像Chromium这样的嵌入者必须对任何用户代码无论其行为如何都具备鲁棒性，因此在编写扩展时比在编写传统C++实现的功能时需要更加小心。

如果你想了解更多关于V8扩展的信息，请查看我们的[设计文档](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz)，其中有更为详细的说明。我们期待改进V8扩展，并添加更多功能，使开发人员和嵌入者能够为V8运行时编写富有表现力的高性能扩展功能。
