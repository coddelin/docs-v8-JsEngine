---
title: 'Chrome的一小步，V8的一大堆'
author: '堆的守护者Ulan Degenbaev, Hannes Payer, Michael Lippautz，以及DevTools战士Alexey Kozyatinskiy'
avatars:
  - 'ulan-degenbaev'
  - 'michael-lippautz'
  - 'hannes-payer'
date: 2017-02-09 13:33:37
tags:
  - 内存
description: 'V8最近增加了其堆大小的硬限制。'
---
V8对其堆大小有一个硬限制。这充当了防止应用程序内存泄漏的保护措施。当应用程序达到这一硬限制时，V8会执行一系列最后的垃圾回收措施。如果垃圾回收未能释放内存，V8会停止执行并报告内存不足故障。如果没有这一硬限制，内存泄漏的应用程序可能会占用所有系统内存，从而影响其他应用程序的性能。

<!--truncate-->
具有讽刺意味的是，这一保护机制使得JavaScript开发者更难调查内存泄漏问题。应用程序可以在开发者通过DevTools检查堆之前耗尽内存。此外，DevTools进程本身可能会耗尽内存，因为它使用普通的V8实例。例如，在当前稳定版Chrome中，对[这个演示](https://ulan.github.io/misc/heap-snapshot-demo.html)进行堆快照会由于内存不足而中止执行。

历史上，V8的堆限制被设置得很方便，可以适应带有一定余量的32位整数范围。随着时间推移，这种方便导致了V8中不严谨的代码，这些代码混淆了不同位宽的类型，从而实际上破坏了增加限制的能力。最近我们清理了垃圾回收器代码，使使用更大的堆大小成为可能。DevTools已经利用了这一功能，并且在前述演示中进行堆快照在最新的Chrome Canary中可以正常工作。

我们还在DevTools中添加了一个功能，可以在应用程序接近内存耗尽时暂停应用程序。这个功能对调查导致应用程序短时间内分配大量内存的bug很有用。在使用最新的Chrome Canary运行[这个演示](https://ulan.github.io/misc/oom.html)时，DevTools会在内存耗尽故障发生之前暂停应用程序，并增加堆限制，给用户机会检查堆，评估控制台上的表达式以释放内存，然后继续执行以进行进一步调试。

![](/_img/heap-size-limit/debugger.png)

V8嵌入者可以使用`ResourceConstraints` API中的[`set_max_old_generation_size_in_bytes`](https://codesearch.chromium.org/chromium/src/v8/include/v8-isolate.h?q=set_max_old_generation_size_in_bytes)函数增加堆限制。但是要注意，垃圾回收器的一些阶段对堆大小有线性依赖关系。随着堆的增大，垃圾回收暂停可能会增加。
