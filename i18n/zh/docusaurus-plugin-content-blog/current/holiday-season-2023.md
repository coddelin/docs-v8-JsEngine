---
title: "V8比以往更快、更安全！"
author: "[Victor Gomes](https://twitter.com/VictorBFG)，格吕酒专家"
avatars:
  - victor-gomes
date: 2023-12-14
tags:
  - JavaScript
  - WebAssembly
  - 安全性
  - 基准测试
description: "V8在2023年的令人印象深刻的成就"
tweet: ""
---

欢迎来到激动人心的V8世界，在这里速度不仅仅是一种特性，而是一种生活方式。随着我们向2023告别，是时候庆祝V8今年取得的令人印象深刻的成就了。

通过创新的性能优化，V8继续拓展Web不断演变的边界。我们引入了新的中层编译器，并对顶级编译器基础设施、运行时和垃圾回收器进行了多项改进，从而实现了全方位的显著速度提升。

<!--truncate-->
除了性能提升，我们还为JavaScript和WebAssembly引入了令人兴奋的新功能。我们还发布了一种通过[WebAssembly垃圾回收（WasmGC）](https://v8.dev/blog/wasm-gc-porting)有效地将带垃圾回收的编程语言引入Web的新方法。

但我们对卓越的承诺远不止于此——我们还优先考虑了安全性。我们改进了沙盒基础设施，并引入了[控制流完整性（CFI）](https://en.wikipedia.org/wiki/Control-flow_integrity)到V8，为用户提供了更安全的环境。

下面，我们列出了今年的一些重要亮点。

# Maglev：新的中层优化编译器

我们引入了一个名为[Maglev](https://v8.dev/blog/maglev)的新优化编译器，战略性地定位于我们现有的[Sparkplug](https://v8.dev/blog/sparkplug)和[TurboFan](https://v8.dev/docs/turbofan)编译器之间。它充当了一个高速优化编译器，高效地以令人印象深刻的速度生成优化代码。它生成代码的速度大约是我们基线非优化编译器Sparkplug的20倍，但比顶级TurboFan快10到100倍。我们注意到Maglev显著的性能改进，[JetStream](https://browserbench.org/JetStream2.1/)提高了8.2%，[Speedometer](https://browserbench.org/Speedometer2.1/)提高了6%。Maglev更快的编译速度以及对TurboFan依赖的减少使V8在运行Speedometer时总能耗节省了10%。尽管[尚未完全完成](https://en.m.wikipedia.org/wiki/Full-employment_theorem)，Maglev的当前状态足以支持它在Chrome 117版本中上线。更多细节请查看我们的[博客文章](https://v8.dev/blog/maglev)。

# Turboshaft：顶级优化编译器的新架构

Maglev并不是我们在改进编译器技术方面唯一的投资。我们还引入了Turboshaft，一个适用于顶级优化编译器Turbofan的新内部架构，使其更容易扩展新优化并提高编译速度。自从Chrome 120，所有与CPU无关的后端阶段都使用Turboshaft而不是Turbofan，并且编译速度大约是以前的两倍。这样既节省了能源，也为明年及未来的更多令人兴奋的性能提升奠定了基础。敬请期待后续更新！

# 更快的HTML解析器

我们注意到基准测试时间的一大部分被HTML解析消耗。虽然不是直接针对V8的提升，但我们主动采取行动，利用我们在性能优化方面的专业知识为Blink添加了一个更快的HTML解析器。这些改动使Speedometer得分显著提高了3.4%。对Chrome的影响是如此积极，以至于WebKit项目迅速将这些改动集成到[其代码库](https://github.com/WebKit/WebKit/pull/9926)中。我们为能够为实现更快的网络这一共同目标做出贡献而感到自豪！

# 更快的DOM分配

我们一直在积极投资于DOM领域。对[Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md)——DOM对象的分配器的内存分配策略进行了重大优化。它获得了一个页面池，显著减少了与内核往返的成本。Oilpan现在支持压缩和未压缩的指针，并且我们避免对Blink中的高流量字段进行压缩。鉴于解压频率较高，它对性能产生了广泛影响。此外，鉴于分配器速度很快，我们对频繁分配的类进行了oilpan化处理，使分配工作负载提高了3倍，并在DOM繁重的基准测试如Speedometer上显示出显著提升。

# 新的JavaScript功能

JavaScript 继续通过新标准化的功能进行演进，今年也不例外。我们发布了[可调整大小的 ArrayBuffers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers)和[ArrayBuffer 传输](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer)，字符串的[`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) 和 [`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed)，[正则表达式的 `v` 标志](https://v8.dev/features/regexp-v-flag)（又称 Unicode 集合表示法），[`JSON.parse` with source](https://github.com/tc39/proposal-json-parse-with-source)，[数组分组](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy)，[`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers)，以及[`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync)。遗憾的是，在发现一个与网页不兼容的问题后，我们不得不撤回[迭代器辅助函数](https://github.com/tc39/proposal-iterator-helpers)，但我们已与 TC39 合作修复了这个问题，并将在不久后重新发布。最后，我们还通过[消除一些冗余的临时死区检查](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing)让 ES6+ 的 JS 代码运行更快，适用于 `let` 和 `const` 绑定。

# WebAssembly 更新

今年，许多新的功能和性能改进在 Wasm 上推出了。我们启用了对[多内存](https://github.com/WebAssembly/multi-memory)、[尾调用](https://github.com/WebAssembly/tail-call)（详见我们的[博客文章](https://v8.dev/blog/wasm-tail-call)），以及[宽松 SIMD](https://github.com/WebAssembly/relaxed-simd)的支持，从而释放了下一阶段的性能潜力。我们完成了为内存需求高的应用程序实现[memory64](https://github.com/WebAssembly/memory64)，并正在等待该提案达到[阶段 4](https://github.com/WebAssembly/memory64/issues/43)以便发布！我们确保整合了[异常处理提案](https://github.com/WebAssembly/exception-handling)的最新更新，同时仍支持之前的格式。此外，我们继续投资于 [JSPI](https://v8.dev/blog/jspi)，以[使另一大类别的应用程序在网页上成为可能](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m)。敬请期待明年！

# WebAssembly 垃圾回收

说到将新类别的应用程序引入网页，我们经过数年的[提案](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md)标准化和[实现](https://bugs.chromium.org/p/v8/issues/detail?id=7748)工作，终于发布了 WebAssembly 垃圾回收（WasmGC）。现在，Wasm 具有一种内置方式来分配由 V8 的现有垃圾回收器管理的对象和数组。这使得用 Java、Kotlin、Dart 和类似垃圾回收语言编写的应用程序可以编译为 Wasm——在这些情况下，它们的运行速度通常是编译为 JavaScript 的两倍。详情请参阅[我们的博客文章](https://v8.dev/blog/wasm-gc-porting)。

# 安全性

在安全性方面，我们今年的三个主要主题是沙箱、模糊测试和控制流完整性（CFI）。在[沙箱](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing)方面，我们专注于构建缺失的基础设施，例如代码表和可信指针表。在模糊测试方面，我们从模糊测试基础设施到特殊用途的模糊器以及更好的语言覆盖范围进行了投资。[本演讲](https://www.youtube.com/watch?v=Yd9m7e9-pG0)中提到了我们的一部分工作。最后，在 CFI 方面，我们为[CFI 架构](https://v8.dev/blog/control-flow-integrity)奠定了基础，以便能够在尽可能多的平台上实现。除了这些，还有一些较小但值得注意的努力，包括围绕 `the_hole` [缓解一种流行的漏洞利用技术](https://crbug.com/1445008)的工作，以及以 [V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md) 形式推出的新漏洞赏金计划。

# 总结

全年以来，我们致力于实现众多增量性能增强。与博客文章中详细描述的项目相结合，这些小项目的总体影响是巨大的！以下是基准测试分数，展示了 2023 年 V8 取得的性能改进，总体上 JetStream 提升了`14%`，Speedometer 提升了令人印象深刻的`34%`。

![在13英寸 M1 MacBook Pro 上测量的网页性能基准。](/_img/holiday-season-2023/scores.svg)

这些结果表明 V8 比以往更快速且更安全了。各位开发者，请系好安全带吧，因为有了 V8，快速和激情的网页之旅才刚刚开始！我们承诺继续让 V8 成为世界上最好的 JavaScript 和 WebAssembly 引擎！

从我们 V8 团队的所有成员这里，祝愿你们度过一个充满快速、安全和精彩体验的假日季，在网页的旅途中一路顺风！
