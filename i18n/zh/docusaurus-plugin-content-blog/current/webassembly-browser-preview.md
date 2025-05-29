---
title: 'WebAssembly 浏览器预览'
author: 'V8团队'
date: 2016-10-31 13:33:37
tags:
  - WebAssembly
description: 'WebAssembly 或 Wasm 是一种新的网页运行环境和编译目标，现在可以在 Chrome Canary 中通过标志开启！'
---
今天我们很高兴与 [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview) 和 [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/) 一起宣布 WebAssembly 浏览器预览。[WebAssembly](http://webassembly.org/) 或 Wasm 是一种为网页设计的新运行环境和编译目标，由 Google、Mozilla、Microsoft、Apple 和 [W3C WebAssembly 社区组](https://www.w3.org/community/webassembly/) 的合作伙伴共同设计。

<!--truncate-->
## 这个里程碑意味着什么？

这个里程碑意义重大，因为它标志着：

- 我们的 [MVP](http://webassembly.org/docs/mvp/)（最低可行产品）设计的候选版本释出（包括 [语义](http://webassembly.org/docs/semantics/)、[二进制格式](http://webassembly.org/docs/binary-encoding/)和 [JS API](http://webassembly.org/docs/js/)）
- WebAssembly 的兼容和稳定实现已经在 V8 和 SpiderMonkey 的主分支中加入标志，在 Chakra 的开发版本中进行开发，并在 JavaScriptCore 中持续推进
- 一个供开发者用来从 C/C++ 源文件编译 WebAssembly 模块的[可用工具链](http://webassembly.org/getting-started/developers-guide/)
- 一份[路线图](http://webassembly.org/roadmap/)，在获得社区反馈后，将默认启用 WebAssembly

你可以在 [项目网站](http://webassembly.org/)上阅读更多关于 WebAssembly 的信息，并根据我们的[开发者指南](http://webassembly.org/getting-started/developers-guide/)尝试使用 Emscripten 从 C 和 C++ 编译 WebAssembly。二进制格式和 JS API 文档分别概述了 WebAssembly 的二进制编码方式以及如何在浏览器中实例化 WebAssembly 模块。下面是一个快速示例，展示了 wasm 的样子：

![一个在 WebAssembly 中实现的最大公约数函数，显示了原始字节、文本格式（WAST）和 C 源代码。](/_img/webassembly-browser-preview/gcd.svg)

由于 WebAssembly 在 Chrome 中仍然需要通过标志开启 ([chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly))，目前尚不建议用于生产环境。然而，浏览器预览期标志着我们正在积极收集[反馈](http://webassembly.org/community/feedback/)关于规范设计和实现的意见。我们鼓励开发者测试编译和移植应用程序，并在浏览器中运行它们。

V8 继续在 [TurboFan 编译器](/blog/turbofan-jit)中优化 WebAssembly 的实现。从去年三月首次宣布实验支持以来，我们已经增加了支持并行编译。此外，我们即将完成一个备用的 asm.js 管道，该管道在[底层](https://www.chromestatus.com/feature/5053365658583040)将 asm.js 转换为 WebAssembly，以便现有的 asm.js 网站可以提前获得一些 WebAssembly 的即时编译好处。

## 接下来是什么？

除非社区反馈促使重大设计变化，否则 WebAssembly 社区组计划于2017年第一季度发布官方规范，届时浏览器将被建议默认启用 WebAssembly。从那时起，二进制格式将重置为版本1，且 WebAssembly 将不包含版本号，支持功能检测，并且向后兼容。可以在 WebAssembly 项目网站上找到更详细的[路线图](http://webassembly.org/roadmap/)。
