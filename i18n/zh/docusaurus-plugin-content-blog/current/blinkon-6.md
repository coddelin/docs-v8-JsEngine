---
title: "在 BlinkOn 6 会议上的 V8"
author: "V8 团队"
date: 2016-07-21 13:33:37
tags:
  - 演讲
description: "V8 团队在 BlinkOn 6 上的演讲概述。"
---
BlinkOn 是 Blink、V8 和 Chromium 贡献者的半年一次会议。BlinkOn 6 于 6 月 16 日和 6 月 17 日在慕尼黑举行。V8 团队进行了多场关于架构、设计、性能计划及语言实现的演讲。

<!--truncate-->
以下是 V8 在 BlinkOn 的演讲。

## 实际 JavaScript 性能

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 长度: 31:41
- [幻灯片](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

概述了 V8 测量 JavaScript 性能的历史，不同的基准测试阶段，以及一种可以通过详细分解每个 V8 组件时间来测量真实世界流行网站页面加载的新技术。

## Ignition：V8 的解释器

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 长度: 36:39
- [幻灯片](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

介绍了 V8 的新 Ignition 解释器，解释了整个引擎的架构，以及 Ignition 如何影响内存使用和启动性能。

## 我们如何在 V8 的垃圾回收中测量和优化 RAIL

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 长度: 27:11
- [幻灯片](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

解释了 V8 如何利用响应(Response)、动画(Animation)、空闲(Idle)、加载(Loading) (RAIL) 指标来实现低延迟垃圾回收，以及我们最近减少移动端卡顿的优化措施。

## ECMAScript 2015及未来

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 长度: 28:52
- [幻灯片](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

提供了关于 V8 中新语言特性实现的更新，这些特性如何与 Web 平台集成，以及不断发展的 ECMAScript 标准化过程。

## 从 V8 到 Blink 的追踪包装 (闪电演讲)

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 长度: 2:31
- [幻灯片](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

重点讲解了 V8 和 Blink 对象之间的追踪包装，以及它们如何帮助防止内存泄漏和减少延迟。
