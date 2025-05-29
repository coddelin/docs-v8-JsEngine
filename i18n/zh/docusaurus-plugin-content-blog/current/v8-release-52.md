---
title: 'V8 发布 v5.2'
author: 'V8 团队'
date: 2016-06-04 13:33:37
tags:
  - 发布
description: 'V8 v5.2 包括对 ES2016 语言特性的支持。'
---
大约每六周，我们会基于我们的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本从 V8 的 Git 主分支直接分支而来，时间点正好在 Chrome 为 Chrome Beta 里程碑分支之前。今天，我们很高兴宣布我们的最新分支，[V8 版本 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2)，它将在配合 Chrome 52 稳定版发布之前处于 Beta 状态。V8 5.2 包含了各种面向开发者的功能，因此我们想要提前预览一些亮点内容，以期几周后的发布。

<!--truncate-->
## ES2015 和 ES2016 支持

V8 v5.2 包含对 ES2015（又称 ES6）和 ES2016（又称 ES7）的支持。

### 幂运算符

此次发布包含对 ES2016 幂运算符的支持，这是对 `Math.pow` 的中缀表示替代。

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### 规范演进

关于支持不断演进的规范以及围绕 Web 兼容性问题和尾调用的标准讨论的复杂性，更多信息请参见 V8 博客文章 [ES2015、ES2016 和更远](/blog/modern-javascript)。

## 性能

V8 v5.2 进一步优化了 JavaScript 内置函数的性能，包括对 Array 操作（如 isArray 方法、in 运算符和 Function.prototype.bind）的改进。这是基于对流行网页的运行时调用统计的新分析来加速内置函数的持续优化工作的一部分。更多信息请参见 [V8 Google I/O 2016 演讲](https://www.youtube.com/watch?v=N1swY14jiKc)，并关注即将发布的关于从实际网站中获取的性能优化的博客文章。

## V8 API

请查看我们的 [API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档通常会在每次重大发布的几周后定期更新。

拥有[活动 V8 检出](https://v8.dev/docs/source-code#using-git)的开发者可以使用 `git checkout -b 5.2 -t branch-heads/5.2` 体验 V8 v5.2 中的新功能。或者您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快亲自试用这些新功能。
