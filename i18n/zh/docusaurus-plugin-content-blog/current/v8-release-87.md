---
title: "V8 发布 v8.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), V8 旗手"
avatars:
 - "ingvar-stepanyan"
date: 2020-10-23
tags:
 - 发布
description: "V8 发布 v8.7，带来了新的原生调用 API、Atomics.waitAsync、错误修复以及性能改进。"
tweet: "1319654229863182338"
---
每六周，我们会创建一个新的 V8 分支，作为我们[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本都会在 Chrome Beta 的里程碑之前立即从 V8 的 Git 主分支创建分支。今天，我们很高兴宣布我们的最新分支，[V8 版本 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7)，它将在几周内作为 Chrome 87 稳定版进行协调发布前的 Beta 测试。V8 v8.7 包含各种面向开发者的新功能。本文章将对发布前的一些亮点进行预览。

<!--truncate-->
## JavaScript

### 不安全的快速 JS 调用

V8 v8.7 带来了增强的 API，用于从 JavaScript 进行原生调用。

该功能仍处于实验阶段，可以通过 V8 中的 `--turbo-fast-api-calls` 标志或 Chrome 中的 `--enable-unsafe-fast-js-calls` 标志启用。它设计用于提升 Chrome 中某些原生图形 API 的性能，同时也可以供其他嵌入者使用。它为开发者提供了创建 `v8::FunctionTemplate` 实例的新方式，详见此[头文件](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h)。使用原始 API 创建的函数将不受影响。

关于更多信息和可用功能的列表，请查阅[此说明文档](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing)。

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) 现已在 V8 v8.7 中可用。

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) 和 [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) 是底层同步原语，可用于实现互斥锁和其他同步方式。然而，由于 `Atomics.wait` 是阻塞的，因此无法在主线程上调用（尝试这样做会抛出 TypeError）。非阻塞版本 [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) 也可以在主线程上使用。

查看[我们关于 `Atomics` API 的说明](https://v8.dev/features/atomics)以了解更多详情。

## V8 API

请使用 `git log branch-heads/8.6..branch-heads/8.7 include/v8.h` 查看 API 更改的列表。

拥有活跃 V8 检出的开发者可以使用 `git checkout -b 8.7 -t branch-heads/8.7` 来实验 V8 v8.7 中的新功能。或者您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并且即将亲自尝试新功能。
