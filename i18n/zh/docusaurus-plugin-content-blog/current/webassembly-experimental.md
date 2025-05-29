---
title: "在 V8 中对 WebAssembly 的实验性支持"
author: "Seth Thompson，WebAssembly 专员"
date: "2016-03-15 13:33:37"
tags: 
  - WebAssembly
description: "从今天开始，在 V8 和 Chromium 中可以通过启用标志使用 WebAssembly 的实验性支持。"
---
_关于 WebAssembly 的全面概述以及未来社区协作的路线图，请参阅 Mozilla Hacks 博客上的 [A WebAssembly Milestone](https://hacks.mozilla.org/2016/03/a-webassembly-milestone/)。_

自 2015 年 6 月以来，来自 Google、Mozilla、微软、苹果以及 [W3C WebAssembly Community Group](https://www.w3.org/community/webassembly/participants) 的合作伙伴一直在努力 [设计](https://github.com/WebAssembly/design)、[规范化](https://github.com/WebAssembly/spec) 并实现 ([1](https://www.chromestatus.com/features/5453022515691520), [2](https://platform-status.mozilla.org/#web-assembly), [3](https://github.com/Microsoft/ChakraCore/wiki/Roadmap), [4](https://webkit.org/status/#specification-webassembly)) WebAssembly, 一种新的网络运行时和编译目标。[WebAssembly](https://webassembly.github.io/) 是一种低级的、可移植的字节码，设计为以紧凑的二进制格式编码，并在一个内存安全的沙盒中以接近原生的速度执行。作为现有技术的演变，WebAssembly 与 Web 平台紧密集成，同时在网络上下载更快且比 [asm.js](http://asmjs.org/)（JavaScript 的低级子集）更快启动。

<!--truncate-->
从今天开始，在 V8 和 Chromium 中可以通过启用标志使用 WebAssembly 的实验性支持。要在 V8 中试用，请通过命令行使用版本为 5.1.117 或更高版本的 `d8`，并添加 `--expose_wasm` 标志，或者在 Chrome Canary 51.0.2677.0 或更高版本的 `chrome://flags#enable-webassembly` 中启用实验性 WebAssembly 功能。重启浏览器后，JavaScript 上下文中将会出现一个新的 `Wasm` 对象，该对象暴露了一个能够实例化并运行 WebAssembly 模块的 API。**多亏了 Mozilla 和微软合作伙伴的努力，两种兼容的 WebAssembly 实现也在 [Firefox Nightly](https://hacks.mozilla.org/2016/03/a-webassembly-milestone) 和 [Microsoft Edge](http://blogs.windows.com/msedgedev/2016/03/15/previewing-webassembly-experiments) 的内部版本中（展示于视频录屏）通过启用标志运行。**

WebAssembly 项目网站有一个 [demo](https://webassembly.github.io/demo/) 展示其在 3D 游戏中的运行使用。在支持 WebAssembly 的浏览器中，演示页面将加载并实例化一个使用 WebGL 及其他 Web 平台 API 来渲染交互式游戏的 wasm 模块。在其他浏览器中，演示页面会回退到相同游戏的 asm.js 版本。

![[WebAssembly 演示](https://webassembly.github.io/demo/)](/_img/webassembly-experimental/tanks.jpg)

在底层，V8 中的 WebAssembly 实现旨在重用大量现有的 JavaScript 虚拟机基础设施，特别是 [TurboFan 编译器](/blog/turbofan-jit)。一个专门的 WebAssembly 解码器通过一次性检查类型、本地变量索引、函数引用、返回值和控制流结构来验证模块。解码器生成一个 TurboFan 图，该图经过各种优化处理，最终由同一个生成优化 JavaScript 和 asm.js 机器码的后端转化为机器码。在接下来的几个月中，团队将专注于通过编译器调优、并行性和编译策略改进来提高 V8 实现的启动时间。

即将发生的两个变化也将显著改善开发者体验。WebAssembly 的标准文本表示将允许开发者像查看其他 Web 脚本或资源一样查看 WebAssembly 二进制的源代码。此外，当前的 `Wasm` 占位对象将被重新设计，以提供一组更强大、更规范的方法和属性，用于从 JavaScript 中实例化和检查 WebAssembly 模块。
