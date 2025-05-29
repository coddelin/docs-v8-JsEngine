---
title: &apos;V8 发布 v9.2&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-07-16
tags:
 - 发布
description: &apos;V8 v9.2 发布引入了用于相对索引的 `at` 方法和指针压缩改进。&apos;
tweet: &apos;&apos;
---
每六周，作为我们的[发布流程](https://v8.dev/docs/release-process)的一部分，我们会创建一个新的 V8 分支。每个版本都是在 Chrome Beta 里程碑之前立即从 V8 的 Git 主分支分出分支。今天，我们很高兴地宣布我们的最新分支，[V8 版本 9.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.2)，它将处于 Beta 阶段，直到几周后与 Chrome 92 稳定版一起发布。V8 v9.2 充满了各种面向开发者的功能。本文将为即将发布的版本提供一些亮点预览。

<!--truncate-->
## JavaScript

### `at` 方法

新的 `at` 方法现在可以在 Arrays，TypedArrays 和 Strings 上使用。当传递负值时，它会从可索引的末尾相对索引。当传递正值时，它的行为与属性访问完全相同。例如，`[1,2,3].at(-1)` 是 `3`。请查看[我们的说明文档](https://v8.dev/features/at-method)了解更多信息。

## 共享指针压缩 Cage

V8 在包括 x64 和 arm64 在内的 64 位平台上支持[指针压缩](https://v8.dev/blog/pointer-compression)。这通过将一个 64 位指针分为两部分来实现。上部 32 位可以被视为基地址，而下部 32 位可以被视为该基地址的索引。

```
            |----- 32 位 -----|----- 32 位 -----|
指针:       |________基地址_______|_______索引_______|
```

目前，在 GC 堆中，Isolate 在一个 4GB 的虚拟内存 "cage" 内完成所有分配，这确保了所有指针具有相同的 32 位基地址。在基地址保持不变的情况下，64 位指针可以仅通过 32 位索引传递，因为可以重建完整的指针。

在 v9.2 中，默认设置已更改为同一进程内的所有 Isolate 共享同一个 4GB 虚拟内存 cage。这是为了提前支持 JS 中实验性的共享内存功能原型化。由于每个工作线程都有自己的 Isolate，因此有自己的 4GB 虚拟内存 cage，如果使用单独的 Isolate cage，则指针无法在 Isolates 之间传递，因为它们不共享相同的基地址。这一更改还具有减少启动工作线程时虚拟内存压力的额外好处。

这一改动的权衡是，整个进程中所有线程的 V8 堆总大小被限制在最大 4GB。这一限制对于每个进程生成许多线程的服务器工作负载可能是不可取的，因为这样做会比之前更快耗尽虚拟内存。嵌入者可以通过 GN 参数 `v8_enable_pointer_compression_shared_cage = false` 关闭共享指针压缩 cage。

## V8 API

请使用 `git log branch-heads/9.1..branch-heads/9.2 include/v8.h` 获取 API 更改列表。

拥有 V8 活跃检出的开发者可以使用 `git checkout -b 9.2 -t branch-heads/9.2` 来试验 V8 v9.2 中的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快自行尝试新功能。
