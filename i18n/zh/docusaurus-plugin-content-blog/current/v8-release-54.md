---
title: "V8发布版本v5.4"
author: "V8团队"
date: 2016-09-09 13:33:37
tags:
  - 发布
description: "V8 v5.4带来了性能改进和减少内存消耗的功能。"
---
每六周，我们会根据[发布流程](/docs/release-process)，创建一个新的V8分支。每个版本都是在Chrome Beta里程碑之前，从V8的Git主分支分出来的。今天我们很高兴宣布我们最新的分支，[V8版本5.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.4)，将在测试版中一段时间，直到几周后与Chrome 54稳定版同步发布。V8 v5.4包含各种面向开发者的功能，因此我们希望提前预览一些亮点以期待发布。

<!--截断-->
## 性能改进

V8 v5.4在内存占用和启动速度方面进行了多项关键改进。这主要帮助加速初始脚本执行并减少Chrome的页面加载时间。

### 内存

在衡量V8的内存消耗时，有两项指标非常重要：_峰值内存_消耗和_平均内存_消耗。通常来说，减少峰值消耗和降低平均消耗同样重要，因为执行脚本即使短暂耗尽可用内存，也可能导致_内存不足_崩溃，即使其平均内存消耗不算很高。为了优化，划分V8内存为两类是有用的：_堆内存_包含实际的JavaScript对象，_堆外内存_则包含其他内容，例如由编译器、解析器和垃圾回收器分配的内部数据结构。

在5.4版本中，我们优化了V8的垃圾回收器，针对512MB或以下内存的小型设备。根据显示的网站，此优化将_堆内存_的峰值消耗减少最多**40%**。

V8 JavaScript解析器内的内存管理进行了简化，避免了不必要的分配，减小了_堆外内存_的峰值使用量最多**20%**。这些内存节约特别有助于减少大脚本文件，包括asm.js应用程序的内存使用。

### 启动&速度

我们对V8的解析器进行的简化不仅帮助减少了内存消耗，也提高了解析器的运行时性能。这些简化，加上对JavaScript原生功能的优化以及对JavaScript对象属性访问使用全局[内联缓存](https://en.wikipedia.org/wiki/Inline_caching)，带来了显著的启动性能提升。

我们的[内部启动测试套件](https://www.youtube.com/watch?v=xCx4uC7mn6Y)用于测量真实世界的JavaScript性能，取得了中值提升5%的效果。[Speedometer](http://browserbench.org/Speedometer/)基准测试也受益于这些优化，与v5.2相比改善了[约10到13%](https://chromeperf.appspot.com/report?sid=f5414b72e864ffaa4fd4291fa74bf3fd7708118ba534187d36113d8af5772c86&start_rev=393766&end_rev=416239)。

![](/_img/v8-release-54/speedometer.png)

## V8 API

请查看我们的[API变化摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。这份文档通常在每次主要发布后几周内更新。

拥有[活动的V8代码检出](/docs/source-code#using-git)的开发者可以使用`git checkout -b 5.4 -t branch-heads/5.4`来尝试V8 v5.4的新功能。或者，您可以[订阅Chrome的测试版频道](https://www.google.com/chrome/browser/beta.html)，自己试试这些新功能。
