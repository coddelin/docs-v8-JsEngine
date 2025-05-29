---
title: "WebAssembly动态分级已在Chrome 96中准备好试用"
author: "Andreas Haas — Tierisch fun"
avatars:
  - andreas-haas
date: 2021-10-29
tags:
  - WebAssembly
description: "WebAssembly动态分级已可在V8 v9.6和Chrome 96中试用，可以通过命令行标志或源试验启用"
tweet: "1454158971674271760"
---

V8拥有两个编译器，可以将WebAssembly代码编译为可执行的机器代码：基线编译器__Liftoff__ 和优化编译器 __TurboFan__。Liftoff生成代码的速度比TurboFan快得多，从而实现快速启动时间。而TurboFan可以生成更快的代码，从而实现高峰性能。

<!--truncate-->
目前Chrome的配置中，一个WebAssembly模块首先完全由Liftoff编译完成。Liftoff编译完成后，整个模块会立即在后台由TurboFan重新编译一次。在流式编译的情况下，如果Liftoff编译WebAssembly代码的速度快于代码下载速度，TurboFan可以更早开始编译。初始的Liftoff编译实现快速启动时间，而在后台进行的TurboFan编译尽快提供高峰性能。有关Liftoff、TurboFan以及整个编译过程的详细信息可以在[单独的文档](https://v8.dev/docs/wasm-compilation-pipeline)中找到。

通过TurboFan对整个WebAssembly模块编译可以提供最佳性能，但这需要付出代价：

- 执行后台TurboFan编译的CPU核心可能会阻塞其他需要CPU的任务，例如网络应用的工作线程。
- 对不重要的函数执行TurboFan编译可能会延迟对更重要函数的编译，从而可能延迟网络应用达到完全性能的时间。
- 某些WebAssembly函数可能永远不会被执行，对这些函数进行TurboFan编译可能不值得。

## 动态分级

动态分级应该可以解决这些问题，仅对那些实际被多次执行的函数进行TurboFan编译。因此动态分级可以从多个方面改变网络应用的性能：动态分级可以通过减少CPU负载并允许启动任务（而不是只用于WebAssembly编译）使用更多CPU，从而加快启动时间。动态分级也可能通过延迟重要函数的TurboFan编译而降低性能。由于V8不对WebAssembly代码使用堆栈替换，执行可能路径于Liftoff代码中的循环。例如，这也会影响代码缓存，因为Chrome仅缓存TurboFan代码，而那些从未符合TurboFan编译资格的函数，即使已存在缓存的编译好的WebAssembly模块，也会在启动时由Liftoff编译。

## 如何试用

我们鼓励感兴趣的开发者尝试动态分级对其网络应用性能的影响。这使我们能够在早期反应并避免潜在的性能退化。可以通过运行Chrome并添加命令行标志`--enable-blink-features=WebAssemblyDynamicTiering`来本地启用动态分级。

希望启用动态分级的V8嵌入者可以通过设置V8标志`--wasm-dynamic-tiering`来实现。

### 使用源试验进行现场测试

运行带有命令行标志的Chrome是一种开发者可以执行的操作，但不能期待普通用户执行此操作。为了在现场尝试应用程序，可以加入所谓的[源试验](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md)。源试验允许开发者通过与域绑定的特殊令牌，在具有终端用户的实验性的功能上进行试验。这些特殊令牌能够为包括令牌的特定页面上的终端用户启用WebAssembly动态分级。要获取自己的令牌以运行源试验，请使用[申请表单](https://developer.chrome.com/origintrials/#/view_trial/3716595592487501825)。

## 给我们反馈

我们希望收到尝试这个功能的开发者的反馈，因为这将帮助我们优化何时TurboFan编译是有利的，以及货什么时候可以避免TurboFan编译。反馈的最佳方式是[报告问题](https://bugs.chromium.org/p/chromium/issues/detail?id=1260322)。
