---
title: "V8 发布 v7.5"
author: "Dan Elphick，被弃用功能的克星"
avatars: 
  - "dan-elphick"
date: "2019-05-16 15:00:00"
tags: 
  - 发布
description: "V8 v7.5 引入了 WebAssembly 编译产物的隐式缓存、大规模内存操作、JavaScript 中的数值分隔符以及更多功能！"
tweet: "1129073370623086593"
---
每隔六周，我们会根据 [发布流程](/docs/release-process) 创建一个新的 V8 分支。每个版本都在 Chrome Beta 里程碑之前直接从 V8 的 Git 主分支中分出。今天我们很高兴地宣布最新的分支，[V8 版本 7.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.5)，它将在几个星期后与 Chrome 75 的稳定版一同发布。在此期间处于 Beta 阶段。V8 v7.5 包含了丰富多样的开发者友好功能。本文提前展示了一些亮点功能，敬请期待正式发布。

<!--truncate-->
## WebAssembly

### 隐式缓存

我们计划在 Chrome 75 中推出 WebAssembly 编译产物的隐式缓存。这意味着用户第二次访问相同页面时无需重新编译已经浏览过的 WebAssembly 模块，而是直接从缓存中加载。这类似于 [Chromium 的 JavaScript 代码缓存](/blog/code-caching-for-devs)。

如果您希望在自己的 V8 嵌入中使用类似功能，请参考 Chromium 的实现。

### 大规模内存操作

[大规模内存提案](https://github.com/webassembly/bulk-memory-operations) 为 WebAssembly 添加了用于更新大块内存或表格的新指令。

`memory.copy` 可将数据从一个区域复制到另一个区域，即使区域重叠（类似于 C 的 `memmove`）。`memory.fill` 将一个区域填充为指定的字节值（类似于 C 的 `memset`）。与 `memory.copy` 相似，`table.copy` 可将一个表格区域的数据复制到另一区域，即使区域重叠。

```wasm
;; 将 500 字节从源地址 1000 复制到目标地址 0。
(memory.copy (i32.const 0) (i32.const 1000) (i32.const 500))

;; 从地址 100 开始填充 1000 字节，值为 `123`。
(memory.fill (i32.const 100) (i32.const 123) (i32.const 1000))

;; 将 10 个表格元素从源地址 5 复制到目标地址 15。
(table.copy (i32.const 15) (i32.const 5) (i32.const 10))
```

该提案还提供了一种方法，可将常量区域复制到线性内存或表格中。为此，我们需要首先定义一个“被动”段。与“活动”段不同，这些段在模块实例化期间不会被初始化，而是可以通过 `memory.init` 和 `table.init` 指令复制到内存或表格区域中。

```wasm
;; 定义一个被动数据段。
(data $hello passive "Hello WebAssembly")

;; 将 "Hello" 复制到内存地址 10。
(memory.init (i32.const 10) (i32.const 0) (i32.const 5))

;; 将 "WebAssembly" 复制到内存地址 1000。
(memory.init (i32.const 1000) (i32.const 6) (i32.const 11))
```

## JavaScript 中的数值分隔符

较大的数值字面量很难迅速被人眼解析，尤其是当数字有许多重复部分时：

```js
1000000000000
   1019436871.42
```

为了提高可读性，[一种新的 JavaScript 语言特性](/features/numeric-separators) 允许在数字字面量中使用下划线作为分隔符。因此，以上代码现在可以重新编写以按千分位分组，例如：

```js
1_000_000_000_000
    1_019_436_871.42
```

现在更容易看出，第一个数字是万亿，第二个数字是约 10 亿的级别。

有关数字分隔符的更多示例和信息，请查看 [我们的说明](/features/numeric-separators)。

## 性能

### 从网络直接流式加载脚本

从 Chrome 75 开始，V8 可以直接从网络将脚本流式加载到流式解析器中，而无需等待 Chrome 主线程。

虽然以前的 Chrome 版本也实现了流式解析和编译，但由于历史原因，来自网络的脚本源数据必须先通过 Chrome 主线程，然后再转发给流式任务。这意味着流式解析器可能会因主线程上其他操作（例如 HTML 解析、布局或其他 JavaScript 执行）阻塞，而等待本已从网络到达的数据。

![在 Chrome 74 及更早版本中，后台解析任务会被主线程活动阻塞](/_img/v8-release-75/before.jpg)

在 Chrome 75 中，我们将网络的“数据管道”直接连接到 V8，使我们可以在流式解析期间直接读取网络数据，从而跳过对主线程的依赖。

![在 Chrome 75+ 中，后台解析任务不再受主线程活动的阻塞](/_img/v8-release-75/after.jpg)

这让我们能够更早完成流式编译，从而改善使用流式编译的页面的加载时间，并减少并发（但停滞）的流式解析任务数量，从而降低内存消耗。

## V8 API

请使用 `git log branch-heads/7.4..branch-heads/7.5 include/v8.h` 获取 API 更改的列表。

拥有[活动的 V8 代码库](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 7.5 -t branch-heads/7.5` 来试验 V8 v7.5 中的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并尽快亲自尝试新功能。
