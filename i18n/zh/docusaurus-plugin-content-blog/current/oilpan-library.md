---
title: &apos;Oilpan库&apos;
author: &apos;Anton Bikineev、Omer Katz（[@omerktz](https://twitter.com/omerktz)）和Michael Lippautz（[@mlippautz](https://twitter.com/mlippautz)），高效且有效的文件搬运者&apos;
avatars:
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags:
  - 内部构造
  - 内存
  - cppgc
description: &apos;V8附带了Oilpan，一个用于托管托管C++内存的垃圾回收库。&apos;
tweet: &apos;1458406645181165574&apos;
---

虽然此篇文章标题可能暗示深入探讨有关油底壳的书籍集合——这个主题因其设计规范意外地涉及了大量文献——实际上，我们会仔细探讨Oilpan，它是一个通过V8作为库托管的C++垃圾回收器，从V8 v9.4开始。

<!--truncate-->
Oilpan是一个[基于跟踪的垃圾回收器](https://en.wikipedia.org/wiki/Tracing_garbage_collection)，意味着它通过在标记阶段遍历对象图来确定活动对象。然后在清扫阶段回收死对象，这些阶段可能会与实际C++应用代码交替或并行运行。堆对象的引用处理是精确的，而原生栈则是保守的。这意味着Oilpan知道堆上的引用位置，但必须扫描栈内存，假定随机的位序列表示指针。在没有原生栈的情况下进行垃圾回收时，Oilpan还支持对某些对象进行压缩（整理堆的碎片）。

那么，通过V8作为一个库提供它意味着什么呢？

Blink是从WebKit分支出来的，最初使用引用计数（一种[C++代码中广为人知的范式](https://en.cppreference.com/w/cpp/memory/shared_ptr)）来管理其堆上内存。引用计数应该可以解决内存管理问题，但其因循环常常导致内存泄漏问题。此外，Blink有时为了性能原因会省略引用计数，从而导致[释放后使用问题](https://en.wikipedia.org/wiki/Dangling_pointer)。Oilpan最初是专门为Blink开发的，以简化编程模型，解决内存泄漏和释放后使用问题。我们相信Oilpan成功地简化了模型并提高了代码的安全性。

引入Oilpan到Blink的另一个可能不那么明显的原因是帮助与其他垃圾回收系统（如V8）集成，这最终体现在实现[统一的JavaScript和C++堆](https://v8.dev/blog/tracing-js-dom)，其中Oilpan负责处理C++对象[^1]。随着越来越多的对象层次结构被管理以及与V8的集成改善，Oilpan随着时间变得越来越复杂，团队认识到他们是在重新发明与V8的垃圾回收器相同的概念，同时解决相同的问题。在Blink中的集成需要构建约3万个目标才能实际运行一个“hello world”的统一堆垃圾回收测试。

2020年初，我们开始了将Oilpan从Blink中提取、并将其封装成一个库的旅程。我们决定将代码托管在V8中，尽可能重用抽象，并对垃圾回收接口进行了清理。除了解决上述所有问题，[一个库](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/)还可以使其他项目能够使用垃圾回收的C++。我们在V8 v9.4中推出了这一库，并在Chromium M94中开始在Blink中启用它。

## 它包含什么？

与V8的其他部分类似，Oilpan现在提供了一个[稳定的API](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/)，嵌入器可以依赖常规的[V8约定](https://v8.dev/docs/api)。例如，这意味着API已被正确记录（见[GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17)），并且在被移除或更改时会经历一个弃用期。

Oilpan 的核心功能作为一个独立的 C++ 垃圾回收器存在于 `cppgc` 命名空间中。该设置还支持重用现有的 V8 平台以创建用于托管 C++ 对象的堆。垃圾回收可以配置为自动运行，并集成到任务基础设施中，也可以在考虑原生堆栈的情况下显式触发。其设计理念是让只需要托管 C++ 对象的嵌入者避免完全处理 V8，可以参考这个 [Hello World 程序](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc) 作为示例。这种配置的一个嵌入者是 PDFium，它使用 Oilpan 的独立版本来 [保护 XFA](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer)，从而实现更动态的 PDF 内容。

方便的是，针对 Oilpan 核心功能的测试使用了这种设置，这意味着只需几秒钟即可构建并运行特定的垃圾回收测试。截至目前，已有 [>400 个这样的单元测试](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/) 针对 Oilpan 的核心功能。该设置还作为一个实验场所，用于尝试新功能，验证关于原始性能的假设。

Oilpan 库还负责通过 V8 的统一堆处理 C++ 对象，从而实现 C++ 和 JavaScript 对象图完全交错。这种配置在 Blink 中用于管理 DOM 和其他部分的 C++ 内存。Oilpan 还公开了一个 trait 系统，可以扩展垃圾回收器核心功能，以支持具有特定存活性需求的类型。通过这种方式，Blink 能提供自己的集合库，甚至支持在 C++ 中构建类似 JavaScript 的临时映射 ([`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap))。我们不建议所有人这样做，但这表明了系统的能力以满足定制化需求。

## 我们的未来方向是什么？

Oilpan 库为我们提供了一个坚实的基础，我们可以利用它来提高性能。以前我们需要通过 V8 的公共 API 来指定垃圾回收的特定功能以与 Oilpan 交互，现在我们可以直接实现所需的功能。这允许快速迭代，并在可能的情况下采取捷径以提高性能。

我们还看到了通过 Oilpan 提供某些基本容器的潜力，从而避免重复造轮子。这将使其他嵌入者受益于以前专为 Blink 创建的数据结构。

展望 Oilpan 的光明未来，我们需要提到现有的 [`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75) API 将不再进一步改进，并可能在某个时间点被弃用。假定嵌入者已经实现了自己的跟踪系统，迁移到 Oilpan 应该只需将 C++ 对象分配到新创建的 [Oilpan 堆](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91)，然后将其附加到 V8 Isolate。现有的参考建模基础设施，如 [`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334) (用于进入 V8 的引用) 和 [内部字段](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502) (用于从 V8 外出引用)，均被 Oilpan 支持。

敬请期待未来更多的垃圾回收改进！

遇到问题或有建议？请告诉我们：

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail: [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: 关于跨组件垃圾回收的更多信息，请参阅 [研究文章](https://research.google/pubs/pub48052/)。
