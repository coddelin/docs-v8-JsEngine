---
title: 'V8发布v6.3'
author: 'V8团队'
date: 2017-10-25 13:33:37
tags:
  - 发布
description: 'V8 v6.3包含性能改进、减少内存消耗以及对新的JavaScript语言特性的支持。'
tweet: '923168001108643840'
---
每隔六周，我们都会创建一个新的V8分支，作为我们[发布流程](/docs/release-process)的一部分。每个版本都在Chrome Beta里程碑之前从V8的Git主分支分离出来。今天，我们很高兴地宣布我们最新的分支，[V8版本6.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3)，它将在未来几周与Chrome 63稳定版协调发布前处于测试阶段。V8 v6.3充满了各种面向开发者的亮点。此帖子提供了一些亮点的预览，以期待发布。

<!--truncate-->
## 速度

[Jank Busters](/blog/jank-busters) III作为[Orinoco](/blog/orinoco)项目的一部分已经发布。并行标记（[标记工作的70%-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984)在非阻塞线程上完成）已推出。

解析器现在不再[需要第二次预解析函数](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11)。这在我们的内部启动Top25基准上转换为[解析时间中值提升14%](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml)。

`string.js`已完全移植到CodeStubAssembler。感谢[@peterwmwong](https://twitter.com/peterwmwong)的[出色贡献](https://chromium-review.googlesource.com/q/peter.wm.wong)! 对于开发者来说，这意味着从V8 v6.3开始，内建字符串函数如`String#trim`会快得多。

`Object.is()`的性能现在大致与替代方案相当。总体来讲，V8 v6.3继续走向改善ES2015+性能的道路。此外，我们提高了[符号的多态访问速度](https://bugs.chromium.org/p/v8/issues/detail?id=6367)、[构造函数调用的多态内联](https://bugs.chromium.org/p/v8/issues/detail?id=6885)以及[(标记的)模板字符串](https://pasteboard.co/GLYc4gt.png)。

![V8过去六个版本的性能变化](/_img/v8-release-63/ares6.svg)

弱优化功能列表已移除。详细信息可在[专用博客文章](/blog/lazy-unlinking)中找到。

上述内容是速度改进的非详尽列表。还有很多其他与性能相关的工作已经完成。

## 内存消耗

[写屏障已改用CodeStubAssembler](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8)。每个隔离环境节省约100 KB的内存。

## JavaScript语言特性

V8现在支持以下第3阶段特性：[通过`import()`动态模块导入](/features/dynamic-import)、[`Promise.prototype.finally()`](/features/promise-finally)和[异步迭代器/生成器](https://github.com/tc39/proposal-async-iteration)。

使用[动态模块导入](/features/dynamic-import)，根据运行时条件导入模块变得非常简单。这在应用程序需要延迟加载某些代码模块时非常方便。

[`Promise.prototype.finally`](/features/promise-finally)提供了一种在Promise解决后轻松清理的方法。

通过引入[异步迭代器/生成器](https://github.com/tc39/proposal-async-iteration)，使用异步函数进行迭代变得更为便捷。

在`Intl`方面，[`Intl.PluralRules`](/features/intl-pluralrules)现在已支持。此API支持高性能的国际化复数处理。

## 观察器/调试

在Chrome 63中，[代码块覆盖率](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44)也在DevTools UI中获得支持。请注意，从V8 v6.2开始，观察器协议已经支持代码块覆盖率。

## V8 API

请查看我们的[API更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档在每次主要版本发布后几周定期更新。

拥有[活动的V8检出](/docs/source-code#using-git)的开发者可以使用git checkout -b 6.3 -t branch-heads/6.3来试验V8 v6.3中的新功能。或者，您可以[订阅Chrome测试版频道](https://www.google.com/chrome/browser/beta.html)，并很快自己尝试这些新功能。
