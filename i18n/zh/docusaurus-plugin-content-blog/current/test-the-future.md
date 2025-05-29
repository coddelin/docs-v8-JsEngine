---
title: "帮助我们测试 V8 的未来！"
author: "Daniel Clifford（[@expatdanno](https://twitter.com/expatdanno)），原慕尼黑 V8 酿酒师"
date: "2017-02-14 13:33:37"
tags: 
  - internals
description: "今天就在 Chrome Canary 中预览 V8 的新编译管道：Ignition 和 TurboFan！"
---
V8 团队目前正在开发一种新的默认编译管道，将帮助我们为[真实世界的 JavaScript](/blog/real-world-performance)带来未来的加速效果。您可以在 Chrome Canary 中预览新管道，帮助我们确保当我们为所有 Chrome 频道推出新配置时不会出现任何意外。

<!--truncate-->
新的编译管道使用 [Ignition 解释器](/blog/ignition-interpreter)和 [TurboFan 编译器](/docs/turbofan)来执行所有的 JavaScript（取代经典的由 Full-codegen 和 Crankshaft 编译器组成的管道）。Chrome Canary 和 Chrome 开发者频道的随机子集用户已经在测试新配置。然而，任何人都可以通过在 about:flags 中设置标志来选择加入新管道（或切换回旧管道）。

您可以通过选择使用新管道，并在您喜欢的网站中使用 Chrome，帮助测试新管道。如果您是 Web 开发者，请使用新编译管道测试您的 Web 应用程序。如果您注意到在稳定性、正确性或性能方面出现回归，请[将问题报告到 V8 的问题跟踪器](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。

## 如何启用新管道

### 在 Chrome 58 中

1. 安装最新的[Beta](https://www.google.com/chrome/browser/beta.html)
2. 在 Chrome 中打开 URL `about:flags`
3. 搜索 "**实验性 JavaScript 编译管道**"，并设置为 "**Enabled**"

![](/_img/test-the-future/58.png)

### 在 Chrome 59.0.3056及以上版本中

1. 安装最新的 [Canary](https://www.google.com/chrome/browser/canary.html) 或 [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel)
2. 在 Chrome 中打开 URL `about:flags`
3. 搜索 "**经典 JavaScript 编译管道**"，并设置为 "**Disabled**"

![](/_img/test-the-future/59.png)

标准值为 "**默认**"，这意味着新管道**或**经典管道会根据 A/B 测试配置激活。

## 如何报告问题

如果您在使用新管道时发现您的浏览体验与默认管道相比发生显著变化，请告知我们。如果您是 Web 开发者，请测试您的（移动）Web 应用程序在新管道上的性能，看看会受到哪些影响。如果您发现您的 Web 应用程序行为异常（或测试失败），请告知我们：

1. 确保您已根据上一节正确启用新管道。
2. [在 V8 的问题跟踪器上创建一个问题](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。
3. 附上可以用于重现问题的示例代码。
