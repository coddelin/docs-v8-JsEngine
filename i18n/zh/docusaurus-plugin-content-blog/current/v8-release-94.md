---
title: "V8 发布 v9.4"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-09-06
tags:
 - 发布
description: "V8 发布 v9.4 为 JavaScript 带来了类静态初始化块功能。"
tweet: "1434915404418277381"
---
每六周，我们按照我们的[发布流程](https://v8.dev/docs/release-process)创建一个新的 V8 分支。每个版本都在 Chrome Beta 版本里程碑之前从 V8 的 Git 主分支分支而来。今天我们很高兴地宣布我们的最新分支，[V8 版本 9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)，它目前处于 beta 阶段，直到几周后与 Chrome 94 稳定版一起发布。V8 v9.4 包含了各种面向开发者的精彩内容。这篇文章提供了发布前一些亮点的预览。

<!--truncate-->
## JavaScript

### 类静态初始化块

类通过静态初始化块可以实现每次类被评估时运行一次的代码分组功能。

```javascript
class C {
  // 该块将在类本身被评估时运行
  static { console.log("C 的静态初始化块"); }
}
```

从 v9.4 开始，类静态初始化块可以直接使用，无需设置 `--harmony-class-static-blocks` 标志。有关这些块作用域的详细语义，请参阅[我们的说明文档](https://v8.dev/features/class-static-initializer-blocks)。

## V8 API

请使用 `git log branch-heads/9.3..branch-heads/9.4 include/v8.h` 获取 API 更改列表。

活跃的 V8 检出用户可以使用 `git checkout -b 9.4 -t branch-heads/9.4` 来试验 V8 v9.4 中的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快自行尝试这些新功能。
