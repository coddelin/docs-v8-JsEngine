---
title: 'V8发布v8.9版本'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 等待来电'
avatars:
 - 'ingvar-stepanyan'
date: 2021-02-04
tags:
 - 发布
description: 'V8发布v8.9版本，改进了参数数量不匹配时的调用性能。'
tweet: '1357358418902802434'
---
每隔六周，我们会创建一个新的V8分支，作为我们[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本都是在Chrome Beta里的一个里程碑之前，从V8的Git主干分支创建的。今天我们很高兴地宣布我们最新的分支，[V8版本8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9)，它将会处于测试版阶段，直到几周后与Chrome 89稳定版协调发布。V8 v8.9充满了各种面向开发者的增强功能。本篇文章预览了一些发布亮点。

<!--truncate-->
## JavaScript

### 顶层`await`

[顶层`await`](https://v8.dev/features/top-level-await)在主要嵌入了V8的[Blink渲染引擎](https://www.chromium.org/blink)89中可用。

在独立版本的V8中，顶层`await`仍需通过`--harmony-top-level-await`标识打开。

更多细节请参阅[我们的说明](https://v8.dev/features/top-level-await)。

## 性能

### 更快的参数数量不匹配调用

JavaScript允许以不同于预期参数数量调用函数，也就是说，可以传递比声明的形式参数更少或更多的参数。前者称为欠应用，后者称为过应用。

在欠应用情况下，其余参数会赋值为`undefined`。对于过应用情况，可以通过使用剩余参数和`Function.prototype.arguments`属性访问超出的参数，或者这些超出的参数会被忽略。从目前来看，许多Web和Node.js框架使用JS的这个特性来接受可选参数并创建更灵活的API。

直到最近，V8为了处理参数数量不匹配情况，专门设计了arguments适配器帧。不幸的是，这种参数适配会带来性能开销，并且在现代前端和中间件框架中常常需要这样的功能。经过精巧的设计（例如颠倒堆栈中的参数排列顺序），我们可以移除这种额外的帧，简化V8代码库，并几乎完全消除这种额外开销。

![通过微基准测试测量移除arguments适配器帧对性能的影响。](/_img/v8-release-89/perf.svg)

图表显示当运行在[JIT-less模式](https://v8.dev/blog/jitless) (Ignition)时，性能提升了11.2%，且不再有任何额外开销。当使用TurboFan时，性能提升高达40%。与无参数数量不匹配情况相比的开销来源于对[函数结束部分](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052)的小优化。更多细节请参阅[设计文档](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit)。

如果你想深入了解这些性能改进的细节，可以查看[专门的博客文章](https://v8.dev/blog/adaptor-frame)。

## V8 API

请使用`git log branch-heads/8.8..branch-heads/8.9 include/v8.h`获取API更改的列表。

有一个活跃的V8检出的开发者可以使用`git checkout -b 8.9 -t branch-heads/8.9`尝试V8 v8.9中的新功能。或者你可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，尽快亲自尝试新功能。
