---
title: "V8发布v6.8版本"
author: "V8团队"
date: "2018-06-21 13:33:37"
tags: 
  - 发布
description: "V8 v6.8特性包括减少内存消耗以及多个性能优化。"
tweet: "1009753739060826112"
---
每六周，我们都会根据[发布流程](/docs/release-process)创建一个新的V8分支。每个版本都在Chrome Beta里程碑之前从V8的Git主分支分出。今天我们很高兴宣布我们的最新分支，[V8版本6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8)，该版本目前处于测试阶段，并将在几周后与Chrome 68稳定版一起发布。V8 v6.8为开发者带来了各种好东西。这篇文章为即将发布的版本提供了一些亮点的预览。

<!--truncate-->
## 内存

JavaScript函数不必要地保留了外部函数及其元数据（称为`SharedFunctionInfo`或`SFI`）。特别是在依赖短暂IIFE的函数密集型代码中，这可能导致无效的内存泄漏。在此更改之前，一个活动的`Context`（即函数激活的堆内表示形式）会使创建上下文的函数的`SFI`保持活动状态：

![](/_img/v8-release-68/context-jsfunction-before.svg)

通过让`Context`指向一个`ScopeInfo`对象，该对象包含调试所需的精简信息，我们可以打破对`SFI`的依赖。

![](/_img/v8-release-68/context-jsfunction-after.svg)

我们已经在一组前十的移动页面上观察到了3%的V8内存改善。

同时，我们减少了`SFI`本身的内存消耗，移除了不必要的字段或在可能时压缩它们，并将其大小减少了约25%，未来还会有进一步的优化。即使在将它们与上下文解耦后，我们观察到以典型网站上的代码中，`SFI`占用了2-6%的V8内存，因此大规模的函数代码也能看到内存使用的改善。

## 性能

### 数组解构优化

优化编译器没有为数组解构生成理想的代码。例如，使用`[a, b] = [b, a]`交换变量的速度曾经是`const tmp = a; a = b; b = tmp`的两倍。通过解除逃逸分析限制以消除所有临时分配，在使用临时数组时，数组解构的性能已经与赋值序列一样快速。

### `Object.assign`性能提升

到目前为止，`Object.assign`有一个用C++编写的快速路径。每次调用`Object.assign`都需要跨越JavaScript到C++的边界。提升性能的一种显而易见方式是改为在JavaScript端实现快速路径。我们有两种选择：要么实现为原生JS内建（在这种情况下将带来一些不必要的开销），要么[使用CodeStubAssembler技术](/blog/csa)实现（提供了更多的灵活性）。我们选择了后一种解决方案。新的`Object.assign`实现使[Speedometer2/React-Redux的分数提升约15%，总Speedometer 2分数提升1.5%](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590)。

### `TypedArray.prototype.sort`性能提升

`TypedArray.prototype.sort`有两种路径：当用户不提供比较函数时使用快速路径，其他情况下使用慢速路径。迄今为止，慢速路径重用了`Array.prototype.sort`的实现，该实现远超排序`TypedArray`所需的功能。V8 v6.8用[CodeStubAssembler](/blog/csa)中实现替换了慢速路径。（不是直接使用CodeStubAssembler，而是基于它的一种领域专用语言。）

对没有比较函数的`TypedArray`排序的性能保持不变而使用比较函数排序时性能提升了最多2.5倍。

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

在V8 v6.8中，你可以在Linux x64平台上开始使用[基于异常的边界检查](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit)。这一内存管理优化显著提升了WebAssembly的执行速度。该功能已在Chrome 68中使用，未来将逐步支持更多平台。

## V8 API

请使用`git log branch-heads/6.7..branch-heads/6.8 include/v8.h`来获取API变化列表。

拥有[活动V8代码库](/docs/source-code#using-git)的开发者可以使用`git checkout -b 6.8 -t branch-heads/6.8`来体验V8 v6.8的新特性。或者你可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，很快就能自己尝试这些新特性。
