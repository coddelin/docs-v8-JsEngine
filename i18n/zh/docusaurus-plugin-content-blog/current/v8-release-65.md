---
title: "V8 发布 v6.5"
author: "V8 团队"
date: 2018-02-01 13:33:37
tags:
  - 发布
description: "V8 v6.5 增加了对流式 WebAssembly 编译的支持，并引入了新的“非可信代码模式”。"
tweet: "959174292406640640"
---
每六周，我们会根据[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都会在 Chrome Beta 里程碑之前从 V8 的 Git 主分支创建。今天我们很高兴宣布最新的分支 [V8 version 6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5)，它将处于 Beta 状态，直到几周后与 Chrome 65 的稳定版协调发布。V8 v6.5 充满了各种面向开发者的功能。本篇文章提供该版本发布前的一些亮点预览。

<!--truncate-->
## 非可信代码模式

为了应对最新的投机侧信道攻击（称为 Spectre），V8 引入了一个[非可信代码模式](/docs/untrusted-code-mitigations)。如果你嵌入了 V8，请考虑利用此模式，以防你的应用程序处理用户生成的、不可信的代码。请注意，此模式是在默认情况下启用的，包括在 Chrome 中。

## WebAssembly 代码的流式编译

WebAssembly API 提供了一个特殊功能，以支持结合 `fetch()` API 的[流式编译](https://developers.google.com/web/updates/2018/04/loading-wasm)：

```js
const module = await WebAssembly.compileStreaming(fetch('foo.wasm'));
```

自 V8 v6.1 和 Chrome 61 起，这个 API 就已经可用，尽管最初的实现实际上没有使用流式编译。然而，在 V8 v6.5 和 Chrome 65 中，我们利用了这个 API，在下载模块字节的同时已经开始编译 WebAssembly 模块。当我们下载完某个函数的所有字节时，会将该函数传递给后台线程以进行编译。

我们的测量表明，使用此 API 时，Chrome 65 中的 WebAssembly 编译在高端机器上能够达到最多 50 Mbit/s 的下载速度。如果你以 50 Mbit/s 的速度下载 WebAssembly 代码，那么代码的编译将在下载完成时立即完成。

下图显示了下载和编译一个拥有 67 MB 大小和约 190,000 个函数的 WebAssembly 模块所需的时间。我们测量了 25 Mbit/s、50 Mbit/s 和 100 Mbit/s 的下载速度。

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

当下载时间比 WebAssembly 模块编译时间更长时，例如在上图中的 25 Mbit/s 和 50 Mbit/s 的情况下，那么 `WebAssembly.compileStreaming()` 几乎会在最后的字节下载完后立即完成编译。

当下载时间短于编译时间时，`WebAssembly.compileStreaming()` 将花费几乎与未下载模块时编译 WebAssembly 模块相同的时间。

## 性能

我们继续努力扩展 JavaScript 内置函数的快速路径，引入了一种机制，用以检测和防止一个被称为“反优化循环”的不利情况发生。当优化代码被反优化时，可能会发生_没有办法知道问题出在哪里_的情况。在这种情况下，TurboFan 继续尝试优化，大约尝试 30 次后最终放弃。如果你在我们的任意二阶数组内置函数的回调函数中做了某些操作来改变数组的结构，例如改变数组的 `length`，那么在 V8 v6.5 中，我们注意到此类情况会发生，并会在未来的优化尝试中停止该内置函数在此位置的内联行为。

我们还通过内联许多原本因加载的函数之间的副作用而被排除的内置函数来扩大快速路径，例如调用函数。而 `String.prototype.indexOf` 的函数调用性能提升了 [10 倍](https://bugs.chromium.org/p/v8/issues/detail?id=6270)。

在 V8 v6.4 中，我们已经为 `Array.prototype.forEach`、`Array.prototype.map` 和 `Array.prototype.filter` 添加了内联支持。在 V8 v6.5 中，我们又增加了以下内置函数的内联支持：

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

此外，我们还扩展了所有这些内置函数的快速路径。起初我们会在遇到包含浮点数的数组时放弃，或（放弃程度更严重地）[如果数组中有“空洞”](/blog/elements-kinds)，例如 `[3, 4.5, , 6]`。现在，我们在除 `find` 和 `findIndex` 以外的所有情况下都可以处理有空洞的浮点数组，其中在这些情况下规格要求将空洞转为 `undefined`暂时阻碍了我们的努力（_暂时如此……！_）。

以下图片显示了与 V8 v6.4 相比，嵌入内置方法的性能提升变化，具体包括整数数组、双精度数组以及带孔的双精度数组。时间单位为毫秒。

![自 V8 v6.4 以来的性能提升](/_img/v8-release-65/performance-improvements.svg)

## V8 API

请使用 `git log branch-heads/6.4..branch-heads/6.5 include/v8.h` 获取 API 更改的列表。

拥有[活跃 V8 检出版本](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 6.5 -t branch-heads/6.5` 来试验 V8 v6.5 中的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，尽快亲自尝试新功能。
