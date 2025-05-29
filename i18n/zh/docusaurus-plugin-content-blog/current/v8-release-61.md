---
title: &apos;V8 发布 v6.1&apos;
author: &apos;V8 团队&apos;
date: 2017-08-03 13:33:37
tags:
  - 发布
description: &apos;V8 v6.1 带来了减少的二进制大小，并包括性能改进。此外，asm.js 现在经过验证并编译为 WebAssembly。&apos;
---
每隔六周，我们都会按照我们的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都会在 Chrome Beta 版本里程碑之前直接从 V8 的 Git 主分支分支出来。今天，我们很高兴地宣布我们的最新分支，[V8 版本 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1)，该版本将在几周内与 Chrome 61 稳定版协同发布。在此之前，它处于 Beta 阶段。V8 v6.1 为开发人员带来了各种各样的好东西。我们希望提前预览一些亮点，以迎接正式发布。

<!--truncate-->
## 性能改进

通过[迭代](http://exploringjs.com/es6/ch_iteration.html)或使用 [`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) 方法访问 Map 和 Set 中的所有元素变得显著更快，从 V8 版本 6.0 开始，原始性能提升高达 11 倍。更多信息请查看[专门的博客文章](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/)。

![](/_img/v8-release-61/iterating-collections.svg)

除此之外，其他语言功能的性能改进工作也在继续。例如，[`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf) 方法对于主要使用对象字面量和 `Object.create` 而不是类和构造函数的无构造函数代码来说非常重要，该方法现在的速度始终与使用 [`instanceof` 操作符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof) 相当甚至更快。

![](/_img/v8-release-61/checking-prototype.svg)

使用可变数量的参数进行函数调用和构造函数调用也显著加快。通过[`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply)和[`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct)进行的调用在最新版本中获得了高达 17 倍的性能提升。

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach` 现在在 TurboFan 中内联，并针对所有主要非稀疏[元素类型](/blog/elements-kinds)进行了优化。

## 二进制大小减少

V8 团队已完全移除了废弃的 Crankshaft 编译器，从而显著减少了二进制大小。伴随着内置生成器的移除，这使得 V8 部署的二进制文件大小减少了超过 700 KB，具体取决于确切的平台。

## asm.js 现在经过验证并编译为 WebAssembly

如果 V8 遇到 asm.js 代码，它现在会尝试验证它。有效的 asm.js 代码会被转译为 WebAssembly。根据 V8 的性能评估，这通常会提高吞吐性能。由于增加了验证步骤，启动性能中可能会出现一些孤立的回退。

请注意，这一功能仅在 Chromium 端默认启用。如果您是嵌入者并希望利用 asm.js 验证器，请启用标志 `--validate-asm`。

## WebAssembly

调试 WebAssembly 时，当 WebAssembly 代码中断点被触发时，现在可以在 DevTools 中显示局部变量。

## V8 API

请查看我们的[API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档会在每次主要版本发布的几周后定期更新。

拥有[活跃 V8 检出](https://docs/source-code#using-git)的开发人员可以使用 `git checkout -b 6.1 -t branch-heads/6.1` 来试验 V8 v6.1 中的新功能。或者，您也可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并尽快亲自尝试这些新功能。
