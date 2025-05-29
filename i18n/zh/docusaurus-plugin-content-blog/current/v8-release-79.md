---
title: 'V8 版本 v7.9 发布'
author: 'Santiago Aboy Solanes，指针压缩高手'
avatars:
  - 'santiago-aboy-solanes'
date: 2019-11-20
tags:
  - 发布
description: 'V8 v7.9 的功能包括移除了 Double ⇒ Tagged 转换的弃用处理，内建函数中处理 API getters，OSR 缓存，以及支持多代码空间的 WebAssembly。'
tweet: '1197187184304050176'
---
每六周我们都会基于 [发布流程](/docs/release-process) 创建一个新的 V8 分支。每个版本都是在 Chrome 测试版里程碑之前直接从 V8 的 Git 主分支分出。今天，我们很高兴地宣布最新的分支 [V8 version 7.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.9)。该版本目前处于测试版阶段，并将在几周内与 Chrome 79 稳定版同步发布。V8 v7.9 包含各种面向开发者的功能和改进。本文将提前预览其中的一些亮点。

<!--truncate-->
## 性能（大小与速度）

### 移除 Double ⇒ Tagged 转换的弃用处理

您可能还记得在之前的博客文章中提到，V8 会跟踪对象形状中字段的表示方式。当字段的表示发生变化时，当前对象的形状必须被“弃用”，并创建一个新的形状来采用新的字段表示。

一个例外情况是，当旧的字段值可以保证与新的表示兼容时。在这种情况下，我们可以直接在对象形状上原地替换新的表示，这样仍然可以适用于旧对象的字段值。在 V8 v7.6 中，我们为 Smi ⇒ Tagged 和 HeapObject ⇒ Tagged 转换启用了这些原地表示变化，但由于使用了 MutableHeapNumber 优化，我们无法避免 Double ⇒ Tagged 的转变。

在 V8 v7.9 中，我们移除了 MutableHeapNumber，改为在 Double 表示字段中隐式使用可变的 HeapNumbers。这意味着我们需要更谨慎地处理 HeapNumbers（现在它们在双字段中是可变的，其他情况下是不可变的），但 HeapNumbers 与 Tagged 表示兼容，因此我们也可以避免 Double ⇒ Tagged 情况下的弃用。

这个相对简单的变化使 Speedometer AngularJS 的得分提高了 4%。

![Speedometer AngularJS 得分提升](/_img/v8-release-79/speedometer-angularjs.svg)

### 在内建函数中处理 API getters

以前，V8 在处理由嵌入 API（例如 Blink）定义的 getters 时总是会跳转到 C++ 运行时。这包括 HTML 规范中定义的 getters，如 `Node.nodeType`、`Node.nodeName` 等。

V8 会在内建函数中执行整个原型链遍历以加载 getter，然后在发现 getter 是由 API 定义时跳转到运行时。在 C++ 运行时，会再次遍历原型链以获取 getter，然后再执行它，这重复了很多工作。

通常，[内联缓存（IC）机制](https://mathiasbynens.be/notes/shapes-ics) 可以通过在首次跳转到 C++ 运行时后安装一个 IC 处理器来缓解这种情况。但随着新的 [延迟反馈分配](https://v8.dev/blog/v8-release-77#lazy-feedback-allocation) 引入，在函数执行一段时间之前，V8 不会安装 IC 处理器。

现在，在 V8 v7.9 中，这些 getters 在内建函数中得到了直接处理，即使没有安装 IC 处理器，通过利用可以直接调用 API getter 的特殊 API 存根。这使得 Speedometer 的 Backbone 和 jQuery 基准测试中 IC 运行时的花费时间减少了 12%。

![Speedometer Backbone 和 jQuery 提升](/_img/v8-release-79/speedometer.svg)

### OSR 缓存

当 V8 确认某些函数很热门时，会标记它们将在下一次调用时进行优化。当函数再次执行时，V8 使用优化编译器编译函数，并从后续调用开始使用优化代码。然而，对于包含长时间运行循环的函数，这并不够。V8 使用一种称为“在堆栈替换”（OSR）的技术来为当前正在执行的函数安装优化代码。这让我们可以在函数的第一次执行中，在它陷入一个热门循环时开始使用优化代码。

如果函数被再次执行，则很可能再次进行 OSR。在 V8 v7.9 之前，我们需要再次重新优化函数以进行 OSR。然而，从 v7.9 开始，我们增加了 OSR 缓存来保留用于 OSR 替换的优化代码，以与被 OSR 函数中作为入口点的循环头部关联。这使某些峰值性能基准的性能提高了 5–18%。

![OSR 缓存改进](/_img/v8-release-79/osr-caching.svg)

## WebAssembly

### 支持多个代码空间

到目前为止，每个 WebAssembly 模块都只有一个代码空间（针对 64 位架构），并且在创建模块时会预留该空间。这使我们能够在模块内部使用近距离调用，但在 arm64 上代码空间被限制为 128 MB，同时在 x64 上需预留 1 GB 的空间。

在 v7.9 中，V8 实现了对 64 位架构多个代码空间的支持。这使我们可以只预留估算需要的代码空间，并在需要时稍后添加更多代码空间。针对代码空间之间距离过远以至于无法使用近距离跳转的情况，会使用远跳。目前 V8 每个进程不再局限于约 1000 个 WebAssembly 模块，而是支持数百万模块，仅受实际可用内存的限制。

## V8 API

请使用 `git log branch-heads/7.8..branch-heads/7.9 include/v8.h` 查看 API 变更列表。

拥有[当前 V8 检出版本](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 7.9 -t branch-heads/7.9` 来试验 V8 v7.9 的新功能。或者你可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快自己体验这些新功能。
