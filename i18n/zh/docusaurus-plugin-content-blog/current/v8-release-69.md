---
title: "V8 发布 v6.9"
author: "V8 团队"
date: 2018-08-07 13:33:37
tags:
  - 发布
description: "V8 v6.9 通过嵌入的内置函数实现了内存使用减少，通过 Liftoff 提升了 WebAssembly 的启动速度，改善了 DataView 和 WeakMap 的性能，还有更多功能！"
tweet: "1026825606003150848"
---
每隔六周，我们会按照[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本从 V8 的 Git 主分支被分离出来，紧接在 Chrome Beta 里程碑之前。今天我们很高兴宣布最新的分支，[V8 版本 6.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9)，该分支处于 Beta 阶段，几周后将与 Chrome 69 稳定版发布同步。V8 v6.9 包含了各种面向开发者的增值内容。这篇文章预览了一些亮点，为发布做准备。

## 通过嵌入的内置函数减少内存占用

V8 带有一个广泛的内置函数库。这些函数包括内置对象的方法，如 `Array.prototype.sort` 和 `RegExp.prototype.exec`，还有各种内部功能。由于生成它们需要较长的时间，内置函数会在构建时被编译并序列化到一个[快照](/blog/custom-startup-snapshots)中，然后在运行时反序列化以创建初始的 JavaScript 堆状态。

当前的内置函数在每个 Isolate（一个 Isolate 大致相当于 Chrome 中的一个浏览器标签页）中占用了 700 KB。这种做法效率较低，我们从去年开始着手减少这种开销。在 V8 v6.4 中，我们推出了[延迟反序列化](/blog/lazy-deserialization)，确保每个 Isolate 只为实际需要的内置函数付费（但每个 Isolate 仍有自己的副本）。

[嵌入的内置函数](/blog/embedded-builtins)更进一步。嵌入的内置函数由所有 Isolate 共享，并嵌入到二进制文件中，而不是复制到 JavaScript 堆中。无论运行了多少个 Isolate，内置函数在内存中仅存在一次。这种特性尤其在默认启用[网站隔离](https://developers.google.com/web/updates/2018/07/site-isolation)后变得有用。使用嵌入的内置函数，我们在 x64 上浏览排名前一万的网站时观察到 V8 堆大小中位值下降了 _9%_。其中有 50% 的网站至少节省了 1.2 MB，30% 节省了至少 2.1 MB，10% 节省了 3.7 MB 或更多。

V8 v6.9 提供了对 x64 平台嵌入内置函数的支持。其他平台将在即将发布的版本中跟进。更多细节请参阅我们的[专门博文](/blog/embedded-builtins)。

## 性能

### Liftoff，WebAssembly 的新第一层编译器

WebAssembly 有了一个新的基础编译器，用于加快复杂网站带有大型 WebAssembly 模块的启动速度（如 Google Earth 和 AutoCAD）。根据硬件不同，我们观察到速度提升超过 10 倍。更多细节请参阅[关于 Liftoff 的详细博文](/blog/liftoff)。

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Liftoff 的标志，V8 的 WebAssembly 基础编译器</figcaption>
</figure>

### 更快的 `DataView` 操作

[`DataView`](https://tc39.es/ecma262/#sec-dataview-objects) 方法已经在 V8 Torque 中被重新实现，与之前的运行时实现相比避免了代价高昂的 C++ 调用。此外，现在在 TurboFan 中编译 JavaScript 时，我们对 `DataView` 方法进行内联调用，从而在热点代码中实现更高的峰值性能。使用 `DataView` 现在与使用 `TypedArray` 一样高效，最终使 `DataView` 在性能关键场景中成为可行的选择。我们将在即将发布的关于 `DataView` 的博文中详细介绍，请继续关注！

### 垃圾回收期间更快处理 `WeakMap`

V8 v6.9 通过改善 `WeakMap` 的处理减少了 Mark-Compact 垃圾回收暂停时间。现在并发和增量标记可以处理 `WeakMap`，而此前这些工作全部是在 Mark-Compact GC 的最终原子暂停阶段完成。由于并非所有工作都可移至暂停之外，GC 现在也进行更多并行处理以进一步减少暂停时间。这些优化基本上将[Web Tooling 基准测试](https://github.com/v8/web-tooling-benchmark)中 Mark-Compact GC 的平均暂停时间减少了一半。

`WeakMap` 的处理使用了一个固定点迭代算法，在某些情况下可能会退化为二次运行时行为。通过新版本，V8 现在能够切换到另一种算法，该算法在 GC 未能在一定次数的迭代内完成时，保证在线性时间内完成。此前，可能构造出最坏的情况示例，即使堆相对较小，也需要 GC 几秒钟时间完成，而线性算法则在几毫秒内完成。

## JavaScript 语言特性

V8 v6.9 支持 [`Array.prototype.flat` 和 `Array.prototype.flatMap`](/features/array-flat-flatmap)。

`Array.prototype.flat` 递归地将给定数组展平到指定的 `depth`，默认为 `1`：

```js
// 展平一级：
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// 递归展平直到数组中不再有嵌套数组：
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap` 类似于 `Array.prototype.map`，但会将结果展平到一个新数组中。

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

详细信息请参阅 [我们的 `Array.prototype.{flat,flatMap}` 说明文档](/features/array-flat-flatmap)。

## V8 API

请使用 `git log branch-heads/6.8..branch-heads/6.9 include/v8.h` 来获取 API 更改列表。

拥有 [活跃的 V8 仓库](/docs/source-code#using-git) 的开发人员可以使用 `git checkout -b 6.9 -t branch-heads/6.9` 来尝试 V8 v6.9 的新功能。或者你也可以 [订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并亲自尝试这些新功能。
