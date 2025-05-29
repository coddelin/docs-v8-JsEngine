---
title: "V8版本发布v9.1"
author: "Ingvar Stepanyan（[@RReverser](https://twitter.com/RReverser)），测试我的私人品牌"
avatars: 
 - "ingvar-stepanyan"
date: 2021-05-04
tags: 
 - 发布
description: "V8版本发布v9.1带来了对私有品牌检查的支持、默认启用顶层await以及性能改进。"
tweet: "1389613320953532417"
---
每隔六周，我们会创建一个新的V8分支，作为[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本都在Chrome Beta里程碑之前的V8主分支中分出。今天我们很高兴地宣布最新的分支，[V8版本9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1)，该分支将在与Chrome 91稳定版协调发布的几周内处于测试阶段。V8 v9.1充满了各种面向开发者的精彩功能。这篇文章提供了发版前的一些亮点预览。

<!--truncate-->
## JavaScript

### `FastTemplateCache`改进

V8 API向嵌入者暴露了一个`Template`接口，可以用于创建新的实例。

创建和配置新的对象实例需要一些步骤，因此通常复制现有对象会更快。V8采用两级缓存策略（小而快的数组缓存和大而慢的字典缓存）来查找基于模板的最近创建的对象并直接复制它们。

此前，模板的缓存索引是在模板创建时分配的，而不是插入缓存时分配的。这导致了快速数组缓存被保留给那些通常根本不实例化的模板。修复这个问题带来了Speedometer2-FlightJS基准测试中的4.5%的性能提升。

### 顶层`await`

[顶层`await`](https://v8.dev/features/top-level-await)从v9.1开始默认启用并且无需`--harmony-top-level-await`。

请注意，对于[Blink渲染引擎](https://www.chromium.org/blink)，顶层`await`已经在版本89中[默认启用](https://v8.dev/blog/v8-release-89#top-level-await)。

嵌入者应该注意，在启用这个功能后，`v8::Module::Evaluate`总是返回一个`v8::Promise`对象而不是完成值。如果模块评估成功，`Promise`会以完成值解析；如果评估失败，会返回错误。若评估模块非异步（即没有顶层`await`）且没有任何异步依赖项，则返回的`Promise`要么完成要么拒绝。否则，返回的`Promise`将处于未决状态。

有关更多详细信息，请查看[我们的详细说明](https://v8.dev/features/top-level-await)。

### 私有品牌检查，即`#foo in obj`

私有品牌检查语法在v9.1中默认启用，不需要`--harmony-private-brand-checks`。此功能扩展了[`in`操作符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)，使其也可以与私有字段的`#`名称一起使用，例如以下示例。

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

深入了解，请务必查看[我们的详细说明](https://v8.dev/features/private-brand-checks)。

### 简短的内置调用

在此次发布中，我们在64位桌面计算机上临时启用了取消内嵌内置（撤销[嵌入式内置](https://v8.dev/blog/embedded-builtins)）。在这些机器上，取消嵌入带来的性能收益超过了内存开销。这是由于体系结构和微体系结构的细节所致。

我们很快将发布一篇单独的博文以提供更多详细信息。

## V8 API

请使用`git log branch-heads/9.0..branch-heads/9.1 include/v8.h`查看API更改列表。

使用当前有效的V8检出，开发者可以使用`git checkout -b 9.1 -t branch-heads/9.1`来体验V8 v9.1的新功能。或者，你可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，并很快自己尝试新功能。
