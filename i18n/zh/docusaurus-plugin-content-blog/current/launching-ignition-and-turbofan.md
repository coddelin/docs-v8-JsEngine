---
title: "启动 Ignition 和 TurboFan"
author: "V8 团队"
date: 2017-05-15 13:33:37
tags:
  - 内部
description: "V8 v5.9 引入了全新的 JavaScript 执行管线，基于 Ignition 解释器和 TurboFan 优化编译器构建而成。"
---
今天我们很高兴宣布 V8 v5.9 的新 JavaScript 执行管线即将推出，并将在 v59 稳定版的 Chrome 中上线。借助这一新管线，我们在现实世界的 JavaScript 应用中实现了显著的性能提升和内存节省。我们将在本文最后详细讨论相关数据，但首先让我们来看看这条管线。 

<!--truncate-->
新管线基于[V8的解释器 Ignition](/docs/ignition)和[V8最新的优化编译器 TurboFan](/docs/turbofan)构建。这些技术对于过去几年关注 V8 博客的读者来说[应该](/blog/turbofan-jit) [已经](/blog/ignition-interpreter) [非常熟悉](/blog/test-the-future)，但新管线的启用标志着两者迈出了重要的里程碑。

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Ignition 的标志，V8全新的解释器</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>TurboFan 的标志，V8全新的优化编译器</figcaption>
</figure>

首次，Ignition 和 TurboFan 在 V8 v5.9 中被普遍且独占地应用于 JavaScript 执行。此外，从 v5.9 开始，Full-codegen 和 Crankshaft，这些[自 2010 年以来支持 V8 的技术](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)，将不再用于 JavaScript 的执行，因为它们已经无法跟上新的 JavaScript 语言特性及其要求的优化。我们计划很快将它们彻底移除。这意味着 V8 的架构未来将更加简单且易于维护。

## 一段漫长的旅程

结合 Ignition 和 TurboFan 的管线已开发了近三年半。它代表了 V8 团队从测量现实世界的 JavaScript 性能中汲取经验，并仔细审视 Full-codegen 和 Crankshaft 的不足的成果。它是我们未来几年能够继续优化整个 JavaScript 语言的基础。

TurboFan 项目最初于 2013 年末启动，用以解决 Crankshaft 的不足。Crankshaft 只能优化 JavaScript 语言的一部分功能。例如，它无法优化使用结构化异常处理的 JavaScript 代码，即通过 JavaScript 的 try、catch 和 finally 关键字标明的代码块。为 Crankshaft 添加对新语言功能的支持很困难，因为这些功能几乎总是需要为九个支持的平台编写特定架构的代码。此外，Crankshaft 的架构在生成最佳机器代码的能力方面也有限。尽管需要 V8 团队为每种芯片架构维护超过一万行代码，它在 JavaScript 的性能提升上仍然有限。

TurboFan 从一开始就设计为不仅优化当时 JavaScript 标准中的所有语言功能（ES5），还优化计划出现在 ES2015 及未来版本中的所有功能。它采用分层的编译器设计，使高阶和低阶编译器优化能够清晰分离，从而无需修改特定架构的代码即可轻松添加新的语言功能。TurboFan 增加了一个显式指令选择编译阶段，使得初始支持的平台所需的架构专属代码大幅减少。通过这一新阶段，架构专属代码只需编写一次，并且很少需要修改。这些及其他决定使得 V8 所支持的所有架构都有了一个更易维护且可扩展的优化编译器。

V8 的 Ignition 解释器的初衷是减少移动设备上的内存消耗。在启用 Ignition 之前，V8 的 Full-codegen 基线编译器生成的代码通常占用 Chrome JavaScript 堆的三分之一。这使得留给网页应用实际数据的空间更少。当 Ignition 在有限内存的 ARM64 移动设备上启用用于 Android 的 Chrome M53 时，基线未优化 JavaScript 代码所需内存缩减了九倍。

后来，V8团队利用了Ignition字节码可以直接与TurboFan生成优化的机器码，而不需要像Crankshaft那样从源代码重新编译的事实。Ignition字节码为V8提供了一个更清晰且更少错误的基础执行模型，从而简化了V8的关键功能——[自适应优化](https://en.wikipedia.org/wiki/Adaptive_optimization)中的去优化机制。最后，由于生成字节码比生成Full-codegen的基础编译代码更快，启用Ignition通常能改善脚本启动时间，从而加速网页加载。

通过将Ignition和TurboFan的设计紧密结合，整个架构还能带来更多优势。例如，与其用手写汇编代码开发Ignition的高性能字节码处理器，V8团队选择使用TurboFan的[中间表示](https://en.wikipedia.org/wiki/Intermediate_representation)来表达处理器的功能，并让TurboFan进行优化和最终代码生成，适配V8支持的众多平台。这确保了Ignition在V8支持的所有芯片架构上都能良好运行，同时免去了维护九个独立平台端口的负担。

## 数据分析

撇开历史不谈，现在让我们看看新流水线的实际性能和内存消耗。

V8团队通过使用[Telemetry - Catapult](https://catapult.gsrc.io/telemetry)框架持续监控真实用例的性能。我们之前在[博客](/blog/real-world-performance)中讨论过，为何使用真实世界测试数据来推动性能优化工作如此重要，以及我们如何结合[WebPageReplay](https://github.com/chromium/web-page-replay)和Telemetry实现这一目标。切换到Ignition和TurboFan后，这些真实测试用例中的性能都有所提升。具体来说，新流水线使用户交互测试中著名网站的运行速度显著加快：

![V8在用户交互基准测试中耗时减少](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

虽然Speedometer是一个合成基准测试，但我们之前发现它比其他合成基准测试更好地贴近了现代JavaScript的真实工作负载。切换到Ignition和TurboFan使V8的Speedometer分数提高了5%-10%，具体取决于平台和设备。

新流水线还加速了服务器端JavaScript。[AcmeAir](https://github.com/acmeair/acmeair-nodejs) 是一个Node.js的基准测试，它模拟了一个虚构航空公司的服务器后端实现，在使用V8 v5.9时运行速度提升了超过10%。

![Web及Node.js基准测试的提升](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

Ignition和TurboFan还降低了V8的整体内存占用。在Chrome M59中，新流水线使V8在桌面和高端移动设备上的内存占用减少了5%-10%。这是将Ignition的内存节约效果扩展到V8支持的所有设备和平台的结果，[之前博客](/blog/ignition-interpreter)中已有详细介绍。

这些改进只是起点。新的Ignition和TurboFan流水线为进一步提升JavaScript性能及缩小V8在Chrome和Node.js中的占用铺平了道路，未来几年还将继续改进。随着我们向开发者和用户推出这些优化，请保持关注。
