---
title: "文档"
description: "V8 项目的文档。"
slug: "/"
---
V8 是 Google 开源的高性能 JavaScript 和 WebAssembly 引擎，用 C++ 编写。它被用于 Chrome 和 Node.js 等。

本文档面向希望在其应用程序中使用 V8 的 C++ 开发者，以及对 V8 的设计和性能感兴趣的任何人。本文档将介绍 V8，而其余文档将向您展示如何在代码中使用 V8，并描述一些其设计细节，同时提供一组用于衡量 V8 性能的 JavaScript 基准测试。

## 关于 V8

V8 实现了 <a href="https://tc39.es/ecma262/">ECMAScript</a> 和 <a href="https://webassembly.github.io/spec/core/">WebAssembly</a>，并运行在使用 x64、IA-32 或 ARM 处理器的 Windows、macOS 和 Linux 系统上。其他系统（IBM i、AIX）和处理器（MIPS、ppcle64、s390x）由外部维护，详见 [端口](/ports)。V8 可以嵌入到任何 C++ 应用程序中。

V8 编译并执行 JavaScript 源代码，负责对象的内存分配，并对不再需要的对象进行垃圾回收。V8 的全停顿（stop-the-world）、分代的、精确的垃圾回收器是其性能的关键之一。

JavaScript 通常用于浏览器中的客户端脚本，例如用于操作文档对象模型（DOM）对象。然而，DOM 通常并不是由 JavaScript 引擎提供的，而是由浏览器提供的。对 V8 来说也是如此 —— Google Chrome 提供 DOM。然而，V8 提供了 ECMA 标准中规定的所有数据类型、操作符、对象和函数。

V8 允许任何 C++ 应用程序向 JavaScript 代码暴露其自身的对象和函数。您可以自由决定希望向 JavaScript 暴露哪些对象和函数。

## 文档概述

- [从源代码构建 V8](/build)
    - [检出 V8 源代码](/source-code)
    - [使用 GN 构建](/build-gn)
    - [为 ARM/Android 交叉编译和调试](/cross-compile-arm)
    - [为 iOS 交叉编译](/cross-compile-ios)
    - [设置 GUI 和 IDE](/ide-setup)
    - [在 Arm64 上编译](/compile-arm64)
- [贡献](/contribute)
    - [尊重的代码](/respectful-code)
    - [V8 的公共 API 及其稳定性](/api)
    - [成为 V8 提交者](/become-committer)
    - [提交者的责任](/committer-responsibility)
    - [Blink 网络测试（又称布局测试）](/blink-layout-tests)
    - [评估代码覆盖率](/evaluate-code-coverage)
    - [发布流程](/release-process)
    - [设计审查指南](/design-review-guidelines)
    - [实现和发布 JavaScript/WebAssembly 语言特性](/feature-launch-process)
    - [WebAssembly 特性阶段和发布清单](/wasm-shipping-checklist)
    - [故障点分析](/flake-bisect)
    - [处理端口](/ports)
    - [官方支持](/official-support)
    - [合并与修补](/merge-patch)
    - [Node.js 集成构建](/node-integration)
    - [报告安全漏洞](/security-bugs)
    - [本地运行基准测试](/benchmarks)
    - [测试](/test)
    - [问题分类](/triage-issues)
- 调试
    - [使用模拟器调试 ARM](/debug-arm)
    - [为 ARM/Android 交叉编译和调试](/cross-compile-arm)
    - [使用 GDB 调试内建函数](/gdb)
    - [通过 V8 Inspector Protocol 调试](/inspector)
    - [GDB JIT 编译接口集成](/gdb-jit)
    - [调查内存泄漏](/memory-leaks)
    - [堆栈跟踪 API](/stack-trace-api)
    - [使用 D8](/d8)
    - [V8 工具](https://v8.dev/tools)
- 嵌入 V8
    - [嵌入 V8 指南](/embed)
    - [版本号](/version-numbers)
    - [内建函数](/builtin-functions)
    - [国际化支持](/i18n)
    - [不可信代码的缓解措施](/untrusted-code-mitigations)
- 内部机制
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Torque 用户手册](/torque)
    - [编写 Torque 内建函数](/torque-builtins)
    - [编写 CSA 内建函数](/csa-builtins)
    - [添加一个新的 WebAssembly 操作码](/webassembly-opcode)
    - [映射（即“隐藏类”）](/hidden-classes)
    - [松弛跟踪 - 那是什么？](/blog/slack-tracking)
    - [WebAssembly 编译管道](/wasm-compilation-pipeline)
- 编写可优化的 JavaScript
    - [使用 V8 的基于采样的探查器](/profile)
    - [使用 V8 对 Chromium 进行性能分析](/profile-chromium)
    - [在 Linux 上使用 `perf` 与 V8 配合](/linux-perf)
    - [跟踪 V8](/trace)
    - [使用运行时调用统计](/rcs)
