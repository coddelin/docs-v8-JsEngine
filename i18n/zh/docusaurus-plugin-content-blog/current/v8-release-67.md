---
title: "V8 发布 v6.7"
author: "V8 团队"
date: 2018-05-04 13:33:37
tags:
  - 发布
tweet: "992506342391742465"
description: "V8 v6.7 添加了更多不受信任代码的防护并提供了 BigInt 支持。"
---
每六周，我们都会基于我们的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本分支都在 Chrome Beta 里程碑之前立即从 V8 的 Git 主分支中分出。今天我们很高兴地宣布我们的最新分支，[V8 版本 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7)，该版本目前处于测试阶段，几周后将与 Chrome 67 稳定版同步发布。V8 v6.7 包含了各种面向开发者的实用功能。这篇文章提供了期待发布的一些亮点预览。

<!--truncate-->
## JavaScript 语言功能

V8 v6.7 默认启用了 BigInt 支持。BigInt 是 JavaScript 中的新数字原始类型，可以表示任意精度的整数。阅读[我们的 BigInt 功能说明](/features/bigint)，了解 BigInt 在 JavaScript 中的用法，并查阅[我们关于 V8 实现详细信息的文章](/blog/bigint)。

## 不受信任代码的防护

在 V8 v6.7 中，我们实现了[更多针对侧信道漏洞的防护措施](/docs/untrusted-code-mitigations)，以防止信息泄漏到不受信任的 JavaScript 和 WebAssembly 代码。

## V8 API

请使用 `git log branch-heads/6.6..branch-heads/6.7 include/v8.h` 获取 API 更改的列表。

拥有[有效 V8 仓库检出版本](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 6.7 -t branch-heads/6.7` 来试验 V8 v6.7 的新功能。或者你也可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快亲自尝试这些新功能。
