---
title: "高性能C++垃圾回收器"
author: "Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), 和 Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz))，C++内存专家"
avatars: 
  - "anton-bikineev"
  - "omer-katz"
  - "michael-lippautz"
date: 2020-05-26
tags: 
  - 内部
  - 内存
  - cppgc
description: "本文描述了Oilpan C++垃圾回收器，其在Blink中的使用以及如何优化清扫，即释放不可达内存的过程。"
tweet: "1265304883638480899"
---

过去我们曾[写过](https://v8.dev/blog/trash-talk) [关于](https://v8.dev/blog/concurrent-marking) [垃圾回收](https://v8.dev/blog/tracing-js-dom)的文章，介绍了JavaScript、文档对象模型（DOM）的垃圾回收以及这些功能在V8中的实现和优化。然而，Chromium中并非所有内容都是JavaScript，因为大部分浏览器及其Blink渲染引擎是用C++编写的，而V8嵌入其中。JavaScript可以用来与DOM交互，然后由渲染管线处理。

<!--truncate-->
由于围绕DOM的C++对象图与JavaScript对象密切交织，Chromium团队几年前切换到了一个名为[Oilpan](https://www.youtube.com/watch?v=_uxmEyd6uxo)的垃圾回收器来管理这类内存。Oilpan是一个用C++编写的垃圾回收器，用于管理C++内存，并可以通过[跨组件跟踪](https://research.google/pubs/pub47359/)与V8连接，将错综复杂的C++/JavaScript对象图视作一个堆。

本文是Oilpan系列博客的第一篇，将概述Oilpan的核心原理及其C++ API。在本文中，我们将介绍一些支持的功能，解释它们如何与垃圾回收器的各个子系统交互，并深入探讨如何在清扫器中并发回收对象。

最令人兴奋的是，Oilpan目前已在Blink中实现，但正以[垃圾回收库](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/)的形式移动到V8中。目的是让更多的V8嵌入者和C++开发者能更方便地使用C++垃圾回收。

## 背景

Oilpan实现了一个[标记-清扫](https://en.wikipedia.org/wiki/Tracing_garbage_collection)垃圾回收器，其中垃圾回收分为两个阶段：*标记*阶段扫描托管堆中的活动对象，*清扫*阶段回收托管堆中的死对象。

我们在介绍[V8中的并发标记](https://v8.dev/blog/concurrent-marking)时已经介绍过标记的基本概念。简而言之，扫描所有对象以找到活动对象可以看作是图遍历，其中对象是节点，对象之间的指针是边。遍历从根开始，包括寄存器、本地执行堆栈（以下简称为“堆栈”）和其他全局变量，如[此处](https://v8.dev/blog/concurrent-marking#background)所述。

在这一方面，C++与JavaScript并无不同。然而，与JavaScript相比，C++对象是静态类型的，因此不能在运行时更改其表示。由Oilpan管理的C++对象利用了这一特点，并通过访问者模式提供指向其他对象的指针描述（图中的边）。以下是描述Oilpan对象的基本模式：

```cpp
class LinkedNode final : public GarbageCollected<LinkedNode> {
 public:
  LinkedNode(LinkedNode* next, int value) : next_(next), value_(value) {}
  void Trace(Visitor* visitor) const {
    visitor->Trace(next_);
  }
 private:
  Member<LinkedNode> next_;
  int value_;
};

LinkedNode* CreateNodes() {
  LinkedNode* first_node = MakeGarbageCollected<LinkedNode>(nullptr, 1);
  LinkedNode* second_node = MakeGarbageCollected<LinkedNode>(first_node, 2);
  return second_node;
}
```

在上面的例子中，`LinkedNode`通过继承`GarbageCollected<LinkedNode>`表明由Oilpan管理。当垃圾回收器处理对象时，它通过调用对象的`Trace`方法发现其外部指针。`Member`类型是一个智能指针，其语法与例如`std::shared_ptr`类似，由Oilpan提供，用于在标记过程中保持图的状态一致。所有这些特性使得Oilpan能够精确地知道指针在其托管对象中的位置。

热心的读者可能注意到~~并可能感到害怕~~，在上述示例中，`first_node` 和 `second_node` 被保存在栈上的原始 C++ 指针上。Oilpan 不为栈操作添加抽象，仅依赖保守的栈扫描来在处理根时找到指向其托管堆的指针。这是通过逐字迭代栈并将这些字解释为指向托管堆的指针来实现的。这意味着访问栈分配的对象不会对性能造成负担。相反，它将成本转移到垃圾回收时，保守地扫描栈。在渲染器中集成的 Oilpan 尝试延迟垃圾回收，直到它达到一个可以保证没有有趣栈的状态。由于 Web 是基于事件驱动的，并且执行是通过在事件循环中处理任务来驱动的，这种机会很多。

Oilpan 被用于 Blink，这是一个大型的 C++ 代码库，拥有许多成熟代码，同时也支持：

- 通过混入和对这些混入的引用（内部指针）实现多重继承。
- 在执行构造函数时触发垃圾回收。
- 通过 `Persistent` 智能指针将对象从非托管内存中保持活跃状态，这些指针被视为根。
- 涵盖顺序（如 vector）和关联（如 set 和 map）容器的集合，同时支持集合的压缩。
- 弱引用、弱回调和[ephemerons](https://en.wikipedia.org/wiki/Ephemeron)。
- 回收单个对象之前执行的终结器回调。

## 为 C++ 进行清扫

敬请期待一篇单独的博客文章，详细介绍 Oilpan 中的标记工作原理。在本文中，我们假设标记已完成，并且 Oilpan 使用其 `Trace` 方法发现了所有可达对象。标记完成后，所有可达对象的标记位都已经设置。

清扫现在处于阶段，回收死亡对象（在标记期间无法到达的对象），并将其底层内存返回给操作系统或供后续分配使用。接下来我们展示了 Oilpan 的清扫器如何工作，无论是使用上还是约束方面，还展示了它如何实现高回收吞吐量。

清扫器通过迭代堆内存并检查标记位来找到死亡对象。为了保留 C++ 语义，清扫器必须在释放对象内存之前调用每个死亡对象的析构函数。非平凡析构函数被实现为终结器。

从程序员的角度来看，析构函数执行的顺序没有定义，因为清扫器使用的迭代方式不考虑构造顺序。这引入了一个限制，即终结器不允许触摸其他堆上的对象。这对于需要终结顺序的用户代码来说是一个常见挑战，因为托管语言通常不支持终结语义中的顺序（例如 Java）。Oilpan 使用 Clang 插件静态验证了许多其他内容，包括销毁对象期间未访问堆对象：

```cpp
class GCed : public GarbageCollected<GCed> {
 public:
  void DoSomething();
  void Trace(Visitor* visitor) {
    visitor->Trace(other_);
  }
  ~GCed() {
    other_->DoSomething();  // 错误：终结器 '~GCed' 访问了
                            // 可能被终结的字段 'other_'。
  }
 private:
  Member<GCed> other_;
};
```

对于好奇者：Oilpan 为复杂使用场景提供了预终结回调，这些场景需要在对象销毁前访问堆。这些回调在每个垃圾回收周期中比析构函数引入更多开销，因此在 Blink 中只偶尔使用。

## 增量和并发清扫

现在我们已经介绍了托管 C++ 环境中析构函数的限制，是时候更详细地了解 Oilpan 如何实现和优化清扫阶段了。

在深入细节之前，重要的是要回顾一般程序在 Web 上如何执行。任何执行，例如 JavaScript 程序以及垃圾回收，都从主线程通过在[事件循环](https://en.wikipedia.org/wiki/Event_loop)中分派任务驱动。渲染器与其他应用环境相似，支持与主线程并发运行的后台任务，以辅助处理任何主线程的工作。

从简单开始，Oilpan 最初实现了 stop-the-world 清扫，这作为垃圾回收终结暂停的一部分运行，中断了主线程上的应用执行：

![Stop-the-world 清扫](/_img/high-performance-cpp-gc/stop-the-world-sweeping.svg)

对于具有软实时约束的应用，处理垃圾回收时的决定性因素是延迟。Stop-the-world 清扫可能导致显著的暂停时间，从而导致用户可见的应用延迟。作为减少延迟的下一步，清扫被改为增量式：

![增量清扫](/_img/high-performance-cpp-gc/incremental-sweeping.svg)

通过增量方式，清理的工作被分解并分配到额外的主线程任务中。在最佳情况下，这些任务会完全在[空闲时间](https://research.google/pubs/pub45361/)内执行，避免干扰常规应用程序的执行。在内部，清理器根据页面的概念将工作划分为更小的单元。页面可以处于两种有趣的状态：*待清理*页面是清理器仍需处理的页面，*已清理*页面是清理器已经处理过的页面。分配仅考虑已清理页面，并将从维护可用内存块列表的空闲列表中为本地分配缓冲区（LABs）补充内存。通过空闲列表获取内存时，应用程序将首先尝试在已清理页面中查找内存，然后通过将清理算法内联到分配中帮助处理待清理页面，如果没有可用内存，则向操作系统请求新内存。

Oilpan多年来一直使用增量清理，但随着应用程序及其生成的对象图越来越大，清理开始影响应用程序性能。为了改进增量清理，我们开始利用后台任务来并发回收内存。这里有两个基本的不变量用于排除执行清理器的后台任务和分配新对象的应用程序之间的任何数据竞争：

- 清理器仅处理无效内存，因为定义中无效内存是应用程序无法访问的。
- 应用程序仅在已清理页面上进行分配，因为定义中已清理页面不会再被清理器处理。

这两个不变量确保了对象及其内存不应有竞争者。不幸的是，C++严重依赖析构函数，而析构函数被实现为终结器。Oilpan强制要求终结器在主线程上运行，以协助开发者并消除应用程序代码中的数据竞争问题。为了解决此问题，Oilpan将对象的终结推迟到主线程。更具体地说，无论何时并发清理器遇到具有终结器（析构函数）的对象，它都会将其推送到终结队列中，该队列将在一个单独的终结阶段中处理，而该阶段始终在同时运行应用程序的主线程上执行。使用并发清理的整体工作流程如下所示：

![使用后台任务的并发清理](/_img/high-performance-cpp-gc/concurrent-sweeping.svg)

由于终结器可能需要访问对象的所有负载，在执行终结器之后才会将相应的内存添加到空闲列表中。如果没有执行终结器，则在后台线程上运行的清理器会立即将回收的内存添加到空闲列表中。

# 结果

后台清理已在Chrome M78中发布。我们的[真实世界的基准测试框架](https://v8.dev/blog/real-world-performance)显示主线程清理时间减少了25%-50%（平均减少42%）。下面是一些选定的统计数据。

![主线程清理时间（单位：毫秒）](/_img/high-performance-cpp-gc/results.svg)

主线程上剩余的时间花在执行终结器上。针对Blink中大量实例化的对象类型正在进行减少终结器的工作。令人兴奋的是，所有这些优化都是在应用程序代码中完成的，因为如果没有终结器，清理会自动调整。

随着我们越来越接近一个所有V8用户都可以使用的发布版本，敬请期待关于C++垃圾回收的一般帖子以及Oilpan库更新的更多信息。
