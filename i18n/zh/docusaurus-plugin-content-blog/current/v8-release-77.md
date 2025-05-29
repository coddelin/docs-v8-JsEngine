---
title: "V8 发布 v7.7"
author: "Mathias Bynens（[@mathias](https://twitter.com/mathias)），发布说明的懒惰编写者"
avatars:
  - "mathias-bynens"
date: 2019-08-13 16:45:00
tags:
  - 发布
description: "V8 v7.7 包括延迟反馈分配、更快的 WebAssembly 后台编译、堆栈跟踪改进，以及新的 Intl.NumberFormat 功能。"
tweet: "1161287541611323397"
---
每六周，我们根据 [发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都是在 Chrome Beta 里程碑之前从 V8 的 Git 主分支派生出来的。今天我们很高兴地宣布我们的最新分支，[V8 版本 7.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7)，该版本将在 beta 阶段持续到几周后与 Chrome 77 正式版同步发布。V8 v7.7充满了各种面向开发人员的新功能。本篇文章在正式发布之前预览了一些亮点。

<!--truncate-->
## 性能（大小和速度）

### 延迟反馈分配

为了优化 JavaScript，V8 收集了关于传递给各种操作（例如 `+` 或 `o.foo`）的操作数类型的反馈。此反馈用于通过针对这些特定类型定制操作来优化操作。这些信息存储在“反馈向量”中，这些信息对于实现更快的执行时间非常重要，但我们也要支付为这些反馈向量分配内存所需的成本。

为了减少 V8 的内存使用，我们现在仅在函数执行了一定量的字节码后才延迟分配反馈向量。这避免了为短期函数分配反馈向量，这些函数不会从收集的反馈中受益。我们的实验室实验表明，延迟分配反馈向量可节省约 2-8% 的 V8 堆大小。

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

来自实际使用中的实验表明，对于 Chrome 用户，这减少了 V8 的堆大小：桌面平台减少 1-2%，移动平台减少 5-6%。桌面平台没有性能回退，而在内存有限的低端手机上，我们实际上看到性能有所提升。请期待我们关于内存节省最近工作的更详细博客文章。

### 可扩展的 WebAssembly 后台编译

在过去的几个周期中，我们一直致力于 WebAssembly 后台编译的可扩展性。您的计算机核心数越多，您从此工作中受益越多。以下图表是在 24 核 Xeon 机器上创建的，编译 [Epic ZenGarden 演示](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)。根据使用的线程数量，与 V8 v7.4 相比，编译时间减少了一半以上。

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### 堆栈跟踪改进

几乎所有由 V8 抛出的错误在创建时都会捕获堆栈跟踪。这个堆栈跟踪可以通过非标准的 `error.stack` 属性从 JavaScript 访问。首次通过 `error.stack` 检索堆栈跟踪时，V8 会将基础结构化堆栈跟踪序列化为字符串。这个序列化的堆栈跟踪会被保留，以加速未来对 `error.stack` 的访问。

在过去的几个版本中，我们对堆栈跟踪逻辑进行了一些 [内部重构](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit)（[跟踪问题](https://bugs.chromium.org/p/v8/issues/detail?id=8742)），简化了代码，并将堆栈跟踪序列化性能提高了多达 30%。

## JavaScript 语言功能

[`Intl.NumberFormat` API](/features/intl-numberformat) 用于本地化数字格式化，在这个版本中获得了新的功能！它现在支持紧凑表示法、科学表示法、工程表示法、符号显示和测量单位。

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299,792,458 m/s'
```

请参阅 [我们的功能说明](/features/intl-numberformat) 了解更多详情。

## V8 API

请使用 `git log branch-heads/7.6..branch-heads/7.7 include/v8.h` 获取 API 更改列表。

有 [活跃的 V8 检出](/docs/source-code#using-git) 的开发人员可以使用 `git checkout -b 7.7 -t branch-heads/7.7` 来试用 V8 v7.7 中的新功能。或者，您可以 [订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，很快亲自体验这些新功能。
