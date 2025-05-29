---
title: 'V8 发布 v5.9'
author: 'V8 团队'
date: 2017-04-27 13:33:37
tags:
  - 发布
description: 'V8 v5.9 包括新的 Ignition + TurboFan 管道，并在所有平台上添加了 WebAssembly TrapIf 支持。'
---
每六周，我们都会按照[发布流程](/docs/release-process)从 V8 的 Git 主分支创建一个新分支，每个版本会在 Chrome Beta 里程碑之前分离出来。今天我们很高兴地宣布我们的最新分支，[V8 版本 5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9)，它将在 beta 状态下运行，直到几周后与 Chrome 59 稳定版协调发布。V8 5.9 包含各种面向开发人员的好功能。我们希望能在发布之前预览一些亮点。

<!--truncate-->
## Ignition+TurboFan 启动

V8 v5.9 将成为第一个默认启用 Ignition+TurboFan 的版本。总体而言，这个切换应该会降低内存消耗并加快 web 应用程序的启动速度，并且我们不预计会出现稳定性或性能问题，因为新的管道已经经过了大量测试。不过，如果您的代码突然开始出现显著的性能问题，请[联系我们](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。

有关更多信息，请参阅[我们的专门博客文章](/blog/launching-ignition-and-turbofan)。

## WebAssembly `TrapIf` 在所有平台上的支持

[WebAssembly `TrapIf` 支持](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe)显著减少了编译代码所需的时间（约减少 30%）。

![](/_img/v8-release-59/angrybots.png)

## V8 API

请查看我们的[API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。在每次重大发布后的几周，该文档都会定期更新。

拥有[活动 V8 检出版本](/docs/source-code#using-git)的开发人员可以使用 `git checkout -b 5.9 -t branch-heads/5.9` 来试验 V8 5.9 的新功能。或者，您可以[订阅 Chrome's Beta 渠道](https://www.google.com/chrome/browser/beta.html)，并很快亲自试用这些新功能。
