---
title: "Jank Busters 第一部分"
author: "卡顿终结者：Jochen Eisinger，Michael Lippautz 和 Hannes Payer"
avatars:
  - "michael-lippautz"
  - "hannes-payer"
date: 2015-10-30 13:33:37
tags:
  - 内存
description: "本文讨论了在 Chrome 41 和 Chrome 46 之间实施的一些优化，这些优化显著减少了垃圾回收的暂停时间，从而提高了用户体验。"
---
卡顿，也就是肉眼可见的卡顿，可以在 Chrome 未能在 16.66 毫秒内渲染一帧时被注意到（导致每秒 60 帧的运动中断）。截至今天，大多数 V8 的垃圾回收工作是在主渲染线程上执行的，参见图 1，这通常导致在需要维护过多对象时出现卡顿。消除卡顿一直是 V8 团队的优先任务之一（[1](https://blog.chromium.org/2011/11/game-changer-for-interactive.html)，[2](https://www.youtube.com/watch?v=3vPOlGRH6zk)，[3](/blog/free-garbage-collection)）。本文讨论了在 Chrome 41 和 Chrome 46 之间实施的一些优化，这些优化显著减少了垃圾回收的暂停时间，从而提高了用户体验。

<!--截断-->
![图 1: 垃圾回收在主线程上执行](/_img/jank-busters/gc-main-thread.png)

垃圾回收期间导致卡顿的一个主要来源是处理各种簿记数据结构。这些数据结构中的许多启用了与垃圾回收无关的优化。两个示例是所有 ArrayBuffer 的列表，以及每个 ArrayBuffer 的视图列表。这些列表允许高效实现 DetachArrayBuffer 操作，而不会对访问 ArrayBuffer 视图造成性能影响。然而，在网页创建了数百万个 ArrayBuffer 的情况下（例如基于 WebGL 的游戏），在垃圾回收期间更新这些列表会导致显著卡顿。在 Chrome 46 中，我们移除了这些列表，并改为在每次对 ArrayBuffer 的加载和存储之前插入检查，通过分散整个程序执行期间的簿记列表遍历成本来减少卡顿。尽管每次访问的检查理论上可能减慢大量使用 ArrayBuffer 的程序的吞吐量，但实际上 V8 的优化编译器通常可以移除冗余检查并将剩余检查提升到循环外，从而实现更顺畅的执行轮廓，几乎没有或没有整体性能损失。

另一个导致卡顿的来源是与跟踪 Chrome 和 V8 之间共享对象生命周期相关的簿记。虽然 Chrome 和 V8 的内存堆是独立的，但它们必须为某些对象同步，比如由 Chrome 的 C++ 代码实现但可从 JavaScript 访问的 DOM 节点。V8 创建了一种称为句柄的不透明数据类型，使得 Chrome 可以操作 V8 堆对象而无需了解其实现细节。对象的生命周期绑定到句柄：只要 Chrome 保留句柄，V8 的垃圾回收器就不会丢弃该对象。V8 为每个通过 V8 API 返回给 Chrome 的句柄创建一个内部数据结构，称为全局引用，这些全局引用告诉 V8 的垃圾回收器对象仍然存活。对于 WebGL 游戏，Chrome 可能创建数百万个这样的句柄，而 V8 随之需要创建相应的全局引用来管理它们的生命周期。在主垃圾回收暂停期间处理这些大量的全局引用会表现为卡顿。幸运的是，通过简单的静态 [逃逸分析](https://en.wikipedia.org/wiki/Escape_analysis)，传递到 WebGL 的对象通常只是传递并且实际上从未被修改。本质上，对于通常以小数组作为参数的 WebGL 函数，其底层数据在堆栈上复制，使得全局引用变得不必要。这种混合方法的结果是渲染密集型 WebGL 游戏的暂停时间减少了多达 50%。

V8 的大多数垃圾回收是在主渲染线程上执行的。将垃圾回收操作移至并发线程减少了垃圾回收器的等待时间，并进一步减少了卡顿。这是一个本质上复杂的任务，因为主 JavaScript 应用程序和垃圾回收器可能同时观察和修改相同的对象。迄今为止，并发性仅限于清理普通对象 JS 堆的旧代。最近，我们还实现了 V8 堆的代码空间和映射空间的并发清理。此外，我们实施了未使用页的并发解除映射以减少必须在主线程上执行的工作量，参见图 2。

![图2: 一些垃圾回收操作在并发垃圾回收线程上执行。](/_img/jank-busters/gc-concurrent-threads.png)

所讨论的优化对基于WebGL的游戏中表现得非常明显，例如[Turbolenz的Oort Online演示](http://oortonline.gl/)。以下视频比较了Chrome 41和Chrome 46：

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PgrCJpbTs9I" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

我们目前正在将更多的垃圾回收组件改进为增量式、并发和并行，以进一步缩短主线程上的垃圾回收暂停时间。请持续关注，我们还有一些有趣的补丁正在开发中。
