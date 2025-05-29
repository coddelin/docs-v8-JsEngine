---
title: "V8 发布 v5.8"
author: "V8 团队"
date: "2017-03-20 13:33:37"
tags: 
  - 发布
description: "V8 v5.8 启用了任意堆大小的使用并改进了启动性能。"
---
每六周，我们会根据我们的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都会在 Chrome Beta 重要里程碑之前直接从 V8 的 Git 主版本分支出来。今天，我们很高兴地宣布我们的最新分支，[V8 版本 5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8)，它将在几周后与 Chrome 58 稳定版协调后发布之前进入 Beta 状态。V8 5.8 包含各种面向开发者的改进。我们希望为您预览一些亮点，以期待最终的发布。

<!--truncate-->
## 任意堆大小

历史上，V8 的堆限制是方便地设置为适合带有一定余量的 32 位有符号整数范围。随着时间的推移，这种便利导致了 V8 中代码书写的不严谨，混用了不同位宽类型，有效地破坏了增加限制的能力。在 V8 v5.8 中，我们启用了任意堆大小的使用。请参阅[专门的博客文章](/blog/heap-size-limit)以了解更多信息。

## 启动性能

在 V8 v5.8 中，我们继续努力逐步减少启动期间 V8 所花的时间。减少编译和解析代码的时间，以及对 IC 系统的优化，使得我们的[真实世界启动工作负载](/blog/real-world-performance)改进了大约 5%。

## V8 API

请查阅我们的[API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文档会在每次重大版本发布后几周定期更新。

具有[活动 V8 检出](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 5.8 -t branch-heads/5.8` 来试验 V8 5.8 中的新功能。您也可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快亲自尝试新功能。
