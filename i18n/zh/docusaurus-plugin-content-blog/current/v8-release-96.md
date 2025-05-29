---
title: "V8发布v9.6版本"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-10-13
tags: 
 - 发布
description: "V8 v9.6版本为WebAssembly带来了对引用类型的支持。"
tweet: "1448262079476076548"
---
每四周，我们会根据[发布流程](https://v8.dev/docs/release-process)创建一个新的V8分支。每个版本均在Chrome Beta里程碑之前，从V8的Git主分支创建分支。今天，我们很高兴宣布我们的最新分支，[V8版本9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6)，将在Beta中运行，直到几周后与Chrome 96稳定版协调发布。V8 v9.6充满了各种对开发者友好的功能。本篇文章对即将发布的亮点进行预览。

<!--truncate-->
## WebAssembly

### 引用类型

[引用类型提案](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)已在V8 v9.6发布，它允许在WebAssembly模块中透明使用JavaScript的外部引用。`externref`（以前称为`anyref`）数据类型提供了一种安全持有JavaScript对象引用的方法，并与V8的垃圾回收器完全集成。

一些工具链已经为引用类型提供了可选支持，例如[用于Rust的wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html)和[AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options)。

## V8 API

请使用`git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h`获取API更改列表。

拥有活跃V8检出的开发者可以使用 `git checkout -b 9.6 -t branch-heads/9.6` 来试验V8 v9.6中的新功能。或者你也可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，并即将自行尝试新功能。
