---
title: "V8发布版本v7.0"
author: "Michael Hablich"
avatars: 
  - michael-hablich
date: "2018-10-15 17:17:00"
tags: 
  - 发布
description: "V8 v7.0包括WebAssembly线程、Symbol.prototype.description以及更多平台上的嵌入式内置功能！"
tweet: "1051857446279532544"
---
每六周，我们会根据[发布流程](/docs/release-process)创建一个新的V8分支。每个版本都会在Chrome Beta的一个里程碑之前，从V8的Git主分支分支而出。今天我们很高兴地宣布我们的最新分支，[V8版本7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0)，它将在几周内与Chrome 70稳定版协调发布之前进入Beta版。V8 v7.0充满了对开发者有吸引力的各种内容。本文旨在提供发布前的一些亮点预览。

<!--truncate-->
## 嵌入式内置功能

[嵌入式内置功能](/blog/embedded-builtins)通过在多个V8隔离体之间共享生成的代码来节省内存。从V8 v6.9开始，我们在x64平台上启用了嵌入式内置功能。V8 v7.0将这些内存节省带到了除ia32以外的所有剩余平台。

## WebAssembly线程预览

WebAssembly（Wasm）支持将用C++和其他语言编写的代码编译后在 web 上运行。原生应用的一个非常实用的功能是使用线程--一种用于并行计算的原语。大多数C和C++开发者会熟悉pthreads，这是一种标准化的应用线程管理API。

[WebAssembly社区组](https://www.w3.org/community/webassembly/)一直在努力将线程引入web，以启用真正的多线程应用程序。作为这项工作的一部分，V8已经在WebAssembly引擎中实现了线程的必要支持。要在Chrome中使用这个功能，可以通过`chrome://flags/#enable-webassembly-threads`启用，或者你的网站可以参加[Origin试用](https://github.com/GoogleChrome/OriginTrials)。Origin试用允许开发者在新Web特性完全标准化之前进行试验，这有助于我们收集真实世界的反馈，这对新特性的验证和改进至关重要。

## JavaScript语言特性

[一个`description`属性](https://tc39.es/proposal-Symbol-description/)正在被添加到`Symbol.prototype`。这提供了一种更符合人体工程学的方式来访问`Symbol`的描述。以前，描述只能通过`Symbol.prototype.toString()`间接访问。感谢Igalia贡献了这个实现！

`Array.prototype.sort`在V8 v7.0中现在是稳定的。以前，V8对元素超过10个的数组使用的是不稳定的快速排序（QuickSort）。现在，我们使用了稳定的TimSort算法。查看[我们的博文](/blog/array-sort)了解更多细节。

## V8 API

请使用`git log branch-heads/6.9..branch-heads/7.0 include/v8.h`查看API更改列表。

拥有[活动的V8检出](/docs/source-code#using-git)的开发者可以使用`git checkout -b 7.0 -t branch-heads/7.0`来试验V8 v7.0中的新功能。或者，你可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，很快就能亲自尝试这些新功能了。
