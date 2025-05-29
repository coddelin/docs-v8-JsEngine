---
title: "V8 发布版本 v5.3"
author: "V8 团队"
date: 2016-07-18 13:33:37
tags:
  - 发布
description: "V8 v5.3 带来了性能改进以及降低内存消耗。"
---
我们每隔大约六周就会创建一个新的 V8 分支，作为我们 [发布流程](/docs/release-process) 的一部分。每个版本都从 V8 的 Git master 分支出来，并在 Chrome 分支 Chrome Beta 里程碑之前完成。因此，我们很高兴地宣布我们的最新分支， [V8 版本 5.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.3)，会在 Beta 阶段运行，直到它与 Chrome 53 Stable 协调发布。V8 v5.3 充满了各种面向开发者的好功能，我们期待几周后发布的这款版本，先为您预览一些亮点。

<!--truncate-->
## 内存

### 新的 Ignition 解释器

Ignition，即 V8 的新解释器，已开发完整功能，并将在 Chrome 53 上针对低内存 Android 设备启用。此解释器带来了即时的 JIT 编译代码内存节约效果，同时也便于 V8 实现未来的优化，提升代码执行期间的启动速度。Ignition 与 V8 的现有优化编译器（TurboFan 和 Crankshaft）搭配运行，确保“热点”代码仍然可以达到最佳性能。我们还在持续改进解释器性能，希望能够很快在所有平台（移动端和桌面端）上启用 Ignition。关注即将发布的博客文章，了解关于 Ignition 的设计、架构和性能改进的更多信息。嵌入式版本的 V8 可以通过标志 `--ignition` 启用 Ignition 解释器。

### 减少卡顿

V8 v5.3 包括一些优化，以减少应用程序卡顿以及垃圾回收时间。这些优化包括：

- 优化弱全局句柄以减少处理外部内存的时间
- 合并堆以完成垃圾回收从而减少疏散卡顿
- 优化 V8 的垃圾回收标记阶段的 [黑色分配](/blog/orinoco) 操作

这些改进总体上将垃圾回收的暂停时间减少约 25%（通过浏览一组流行网页时测量得到的结果）。想了解更多关于减少卡顿的垃圾回收优化，请参阅博客文章 “Jank Busters”系列：[第 1 部分](/blog/jank-busters) 和 [第 2 部分](/blog/orinoco)。

## 性能

### 改进页面启动时间

V8 团队最近开始监测在加载 25 个现实世界的网页（包括 Facebook、Reddit、Wikipedia 和 Instagram 等流行站点）时的性能改进情况。通过比较 V8 v5.1（在 Chrome 51 中的测量结果，时间为 4 月）与 V8 v5.3（在近期的 Chrome Canary 53 中测量结果），我们在这些测量网页上的总启动时间改善了约 7%。这些通过加载真实网页而获得的改进也与 Speedometer 基准测试所显示的相似进展相符，后者在 V8 v5.3 中加速了 14%。有关我们的新测试工具、运行时改进以及 V8 在页面加载期间资源占用时间分析的更详细内容，请关注即将发布的启动性能博客文章。

### ES2015 `Promise` 性能

V8 在 [Bluebird ES2015 `Promise` 基准测试套件](https://github.com/petkaantonov/bluebird/tree/master/benchmark) 上的表现提升了 20–40%，具体因架构和基准测试而异。

![V8 在 Nexus 5x 上的 Promise 性能变化](/_img/v8-release-53/promise.png)

## V8 API

欢迎查看我们的 [API 变更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档在每个主要版本发布后几周会定期更新。

拥有 [V8 活动检出](https://v8.dev/docs/source-code#using-git) 的开发者可以使用 `git checkout -b 5.3 -t branch-heads/5.3` 来试验 V8 5.3 的新功能。或者，您可以 [订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并尽快自行体验这些新功能。
