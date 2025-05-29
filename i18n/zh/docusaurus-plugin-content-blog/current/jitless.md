---
title: '无即时编译的 V8'
author: 'Jakob Gruber ([@schuay](https://twitter.com/schuay))'
avatars:
  - 'jakob-gruber'
date: 2019-03-13 13:03:19
tags:
  - 内部结构
description: 'V8 v7.4 支持在运行时不分配可执行内存的情况下执行 JavaScript。'
tweet: '1105777150051999744'
---
V8 v7.4 现在支持在运行时不分配可执行内存的情况下执行 JavaScript。

在默认配置中，V8 强烈依赖运行时分配和修改可执行内存的能力。例如，[TurboFan 优化编译器](/blog/turbofan-jit)会即时为热点 JavaScript (JS) 函数生成本机代码，而大多数 JS 正则表达式是通过 [irregexp 引擎](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html) 编译成本机代码的。在运行时创建可执行内存是使 V8 快速的重要原因之一。

<!--truncate-->
但在某些情况下，在不分配可执行内存的情况下运行 V8 是有利的：

1. 一些平台（例如 iOS、智能电视、游戏机）禁止非特权应用程序写入可执行内存，因此目前无法在这些平台上使用 V8；并且
1. 禁止写入可执行内存可以减少应用程序被攻击的风险面。

V8 的新无即时编译模式旨在解决这些问题。当 V8 使用 `--jitless` 标志启动时，它将在没有任何运行时分配可执行内存的情况下运行。

它是如何工作的呢？本质上，V8 切换到基于现有技术的仅解释器模式：所有的 JS 用户代码都通过 [Ignition 解释器](/blog/ignition-interpreter) 运行，正则表达式模式匹配同样被解释执行。目前 WebAssembly 尚不支持，但解释的可能性仍然存在。V8 的内建功能仍被编译为本机代码，但由于我们最近的努力将其 [嵌入到 V8 二进制文件中](/blog/embedded-builtins)，它们不再是托管的 JS 堆的一部分。

最终，这些变化让我们得以创建一个不需要任何内存区域拥有可执行权限的 V8 堆。

## 结果

由于无即时编译模式禁用了优化编译器，因此它会带来性能损失。我们查看了各种基准测试以更好地理解 V8 的性能特征变化。[Speedometer 2.0](/blog/speedometer-2) 旨在代表典型的 Web 应用程序；[Web Tooling Benchmark](/blog/web-tooling-benchmark) 包含了一组常见的 JS 开发工具；我们还包括一个模拟 [客厅 YouTube 应用的浏览工作流程](https://chromeperf.appspot.com/report?sid=518c637ffa0961f965afe51d06979375467b12b87e72061598763e5a36876306) 的基准测试。所有测量均在 x64 Linux 桌面上本地完成，并运行了 5 次。

![无即时编译与默认 V8 的性能对比。得分归一化为 V8 默认配置的 100。](/_img/jitless/benchmarks.svg)

在无即时编译模式下，Speedometer 2.0 的性能约降低了 40%。大约一半的回归归因于禁用了优化编译器。另一半则是由于正则表达式解释器，原本是作为调试工具设计的，并将在未来看到性能改进。

Web Tooling Benchmark 更倾向于在 TurboFan 优化代码中花费更多时间，因此在启用无即时编译模式时显示了 80% 的更大回归。

最后，我们测量了在客厅 YouTube 应用中的模拟浏览会话，包括视频播放和菜单导航。在这里，无即时编译模式表现大致相当，仅表现出比标准 V8 配置慢 6% 的 JS 执行速度减缓。该基准测试显示，代码的峰值优化性能并不总是与[实际使用性能](/blog/real-world-performance)相关联，并且在许多情况下，嵌入者即使在无即时编译模式下也能保持合理的性能。

内存消耗仅略有变化，对于加载一组具有代表性的网站，V8 堆大小的中位数减少了 1.7%。

我们鼓励在受限平台或具有特殊安全需求的嵌入者考虑 V8 的新无即时编译模式，该模式现已在 V8 v7.4 中提供。与往常一样，欢迎在 [v8-users](https://groups.google.com/forum/#!forum/v8-users) 讨论组中提出问题和反馈。

## 常见问题

*`--jitless` 与 `--no-opt` 有何区别？*

`--no-opt` 禁用 TurboFan 优化编译器。而 `--jitless` 则禁用了运行时对可执行内存的任何分配。
