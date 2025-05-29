---
title: "深入探讨TurboFan JIT"
author: "Ben L. Titzer，软件工程师和TurboFan机械师"
avatars:
  - "ben-titzer"
date: 2015-07-13 13:33:37
tags:
  - 内部构造
description: "深入了解V8新型TurboFan优化编译器的设计。"
---
[上周我们宣布](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html)我们已经为某些类型的JavaScript启用了TurboFan。在这篇文章中，我们希望更深入地了解TurboFan的设计。

<!--truncate-->
性能一直是V8战略的核心。TurboFan结合了先进的中间表示和多层的翻译和优化管道，以生成比CrankShaft JIT之前可能实现的质量更好的机器代码。TurboFan中的优化数量更多、技术更复杂且应用更彻底，使得流畅的代码移动、控制流优化和精确的数值范围分析成为可能，而这些在以前是难以实现的。

## 分层的架构

随着支持的新语言功能增加、新的优化被添加以及针对新计算机架构的目标，编译器往往会随着时间而变得复杂。借助TurboFan，我们借鉴了许多编译器的经验，并开发了一个分层架构，以使编译器能够随着时间的推移应对这些需求。源级语言（JavaScript）、VM的功能（V8）和架构的复杂性（从x86到ARM到MIPS）之间的更清晰的分离，带来了更干净、更健壮的代码。分层允许编译器开发人员在实现优化和功能时更局部地进行推理，同时编写更有效的单元测试。这也节省了代码。在TurboFan支持的七个目标架构中，每个架构需要的特定平台代码都少于3,000行，而CrankShaft则需要13,000-16,000。这使得ARM、Intel、MIPS和IBM的工程师能够更有效地为TurboFan做出贡献。由于其灵活的设计将JavaScript前端从依赖架构的后端分离开来，TurboFan能够更容易地支持即将推出的ES6所有功能。

## 更复杂的优化

TurboFan JIT通过多种高级技术实现了比CrankShaft更积极的优化。JavaScript以大致未优化的形式进入编译器管道，并逐渐被翻译和优化成更低层次的形式，直到生成机器代码。设计的核心是一个更宽松的节点海内部表示（IR），允许更有效的重新排序和优化。

![TurboFan图示例](/_img/turbofan-jit/example-graph.png)

数值范围分析帮助TurboFan更好地理解数字处理代码。基于图的IR允许大多数优化表达为简单的局部归约，更容易独立编写和测试。一种优化引擎系统地、彻底地应用这些局部规则。从图形表示过渡到最终代码时，涉及一种创新的调度算法，利用重新排序自由将代码移出循环并转移到较少执行路径中。最后，架构特定的优化如复杂指令选择利用每个目标平台的特点以获得最佳质量代码。

## 提供新的性能水平

我们已经[看到了一些显著的提速](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html)效果，但仍有大量工作需要完成。敬请期待更多优化的启用以及TurboFan将在更多类型代码中启用！
