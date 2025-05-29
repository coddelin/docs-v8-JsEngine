---
title: "退休 Octane"
author: "V8 团队"
date: "2017-04-12 13:33:37"
tags: 
  - 基准测试
description: "V8 团队认为现在是时候将 Octane 从推荐基准测试中退休了。"
---
JavaScript 基准测试的历史是一段不断演进的故事。当 Web 从简单的文档扩展到动态客户端应用程序时，人们创建了新的 JavaScript 基准测试来测量那些对新用途变得重要的工作负载。这种不断的变化使得单个基准测试具有有限的生命周期。当网络浏览器和虚拟机（VM）的实现开始过度优化特定测试用例时，基准测试本身不再是其原始用途的有效代理。最早的 JavaScript 基准测试之一 [SunSpider](https://webkit.org/perf/sunspider/sunspider.html)，为推出快速优化编译器提供了早期的动力。然而，随着 VM 工程师发现了 [微基准测试的局限性](https://blog.mozilla.org/nnethercote/2014/06/16/a-browser-benchmarking-manifesto/) 并找到新的方法来 [优化](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#the-notorious-sunspider-examples) [规避](https://bugzilla.mozilla.org/show_bug.cgi?id=787601) SunSpider 的 [局限性](https://bugs.webkit.org/show_bug.cgi?id=63864)，浏览器社区 [宣布退休](https://trac.webkit.org/changeset/187526/webkit) SunSpider 作为推荐基准测试。

<!--截断-->
## Octane 的起源

为了缓解早期微基准测试的一些弱点，[Octane 基准测试套件](https://developers.google.com/octane/) 于 2012 年首次发布。它起源于一组早期简单的 [V8 测试用例](http://www.netchain.com/Tools/v8/)，并成为网络综合性能的常用基准测试。Octane 包括 17 个不同的测试，它们旨在涵盖多种不同的工作负载，从 Martin Richards 的内核仿真测试到 [微软的 TypeScript 编译器](http://www.typescriptlang.org/) 自编译的版本。Octane 的内容反映了其创建时评估 JavaScript 性能的普遍观点。

## 收益递减和过度优化

在发布后的前几年，Octane 为 JavaScript VM 生态系统提供了独特的价值。它使包括 V8 在内的引擎能够为强调峰值性能的应用程序优化性能。这些 CPU 密集型工作负载最初没有被 VM 实现很好地服务。Octane 帮助引擎开发人员实现了优化，使得计算密集型应用程序达到速度，使 JavaScript 成为可行的替代 C++ 或 Java 的方案。此外，Octane 推动了垃圾回收方面的改进，帮助网络浏览器避免长时间或不可预测的暂停。

然而，到 2015 年，大多数 JavaScript 实现已经实施了为在 Octane 上取得高分所需的编译器优化。在 Octane 上争取更高的基准测试分数转化为对真实网页性能越来越边际的提升。调查运行 [Octane 与加载常见网站](/blog/real-world-performance) （例如 Facebook、Twitter 或 Wikipedia） 的执行情况，发现基准测试本身并没有像真实世界代码一样调动 V8 的 [解析器](https://medium.com/dev-channel/javascript-start-up-performance-69200f43b201#.7v8b4jylg) 或浏览器 [加载栈](https://medium.com/reloading/toward-sustainable-loading-4760957ee46f#.muk9kzxmb)。此外，Octane 的 JavaScript 风格与大多数现代框架和库（更不用说编译后的代码或新的 ES2015+ 语言特性）使用的惯用法和模式不匹配。这意味着使用 Octane 来衡量 V8 性能并不能捕获现代网络的关键用例，例如快速加载框架、支持带有新状态管理模式的大型应用程序或确保 ES2015+ 特性 [与其 ES5 等价物一样快](/blog/high-performance-es2015)。

此外，我们开始注意到，为了在 Octane 上取得更高分数的 JavaScript 优化往往会对实际场景产生负面影响。Octane 鼓励积极的函数内联以减少函数调用的开销，但专门为提高 Octane 分数设计的内联策略却导致了在实际使用场景中的性能回退，比如增加了编译成本和更高的内存使用。即使某些优化在实际场景中可能确实有用，例如[动态预分配](http://dl.acm.org/citation.cfm?id=2754181)，为了追求更高的 Octane 分数常常会开发出过于具体的启发式方法，这些方法对更广泛的场景几乎没有效果，甚至可能降低性能。我们发现基于 Octane 的预分配启发式方法导致了[现代框架如 Ember](https://bugs.chromium.org/p/v8/issues/detail?id=3665)性能下降。`instanceof` 操作符是另一个例子，这种优化专门针对 Octane 特定用例，它导致了[Node.js 应用中的显著性能回退](https://github.com/nodejs/node/issues/9634)。

另一个问题是，随着时间的推移，Octane 中的小问题本身也成为了优化的目标。例如，在 Box2DWeb 基准中，利用[一个错误](http://crrev.com/1355113002)，两个对象使用 `<` 和 `>=` 操作符进行比较，可以在 Octane 上提高约 15% 的性能。然而，这种优化对实际场景没有任何效果，并使更广泛的比较优化变得复杂。Octane 有时甚至会对实际场景优化产生负面影响：其他虚拟机工程师[注意到](https://bugzilla.mozilla.org/show_bug.cgi?id=1162272) Octane 似乎对惰性解析这一技术产生负面影响，而这一技术能够帮助大多数真实网站在加载时变得更快，因为网络上通常存在大量的无效代码。

## 超越 Octane 和其他合成基准测试

这些例子只是许多优化中一部分，这些优化提高了 Octane 分数但却损害了实际网站的运行性能。不幸的是，类似的问题也存在于其他静态或合成基准测试中，比如 Kraken 和 JetStream。简单来说，这些基准测试不足以有效地衡量真正的实际速度，并且会促使虚拟机工程师过度优化特定用例，而对通用场景的优化投入不足，从而导致实际使用中的 JavaScript 代码变慢。

考虑到大多数 JavaScript 虚拟机中分数的停滞以及为特定 Octane 基准优化与为更广泛的实际代码提升速度之间日益加剧的矛盾，我们认为现在是时候将 Octane 从推荐的基准测试中退休了。

Octane 使 JavaScript 生态系统在计算密集型 JavaScript 上取得了巨大进展。然而，下一步的突破是改善[真实网页](/blog/real-world-performance)、现代库、[框架](http://stateofjs.com/2016/frontend/)、ES2015+ [语言特性](/blog/high-performance-es2015)、新的[状态管理](http://redux.js.org/)模式、[不可变对象分配](https://facebook.github.io/immutable-js/)和[模块](https://webpack.github.io/) [打包](http://browserify.org/)的性能。由于 V8 在许多环境中运行，包括服务器端的 Node.js，我们也在投入时间研究真实的 Node 应用程序，并通过类似[AcmeAir](https://github.com/acmeair/acmeair-nodejs)的工作负载来测量服务器端 JavaScript 的性能。

请关注我们的其他文章，了解有关[测量方法改进](/blog/real-world-performance)和[新工作负载](/blog/optimizing-v8-memory)的信息，这些内容更好地代表了真实场景的性能。我们很高兴继续追求对用户和开发者最重要的性能改进！
