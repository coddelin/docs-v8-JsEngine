---
title: &apos;V8 在 BlinkOn 6 會議&apos;
author: &apos;V8 團隊&apos;
date: 2016-07-21 13:33:37
tags:
  - 展示
description: &apos;V8 團隊在 BlinkOn 6 上的展示概覽。&apos;
---
BlinkOn 是 Blink、V8 和 Chromium 貢獻者的半年一次會議。BlinkOn 6 於6月16日至17日在慕尼黑舉行。V8 團隊進行了多場有關架構、設計、性能計劃以及語言實現的展示。

<!--truncate-->
以下嵌入了 V8 在 BlinkOn 上的演講。

## 真實世界的 JavaScript 性能

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長度: 31:41
- [幻燈片](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

概述了 V8 測量 JavaScript 性能的歷史、基準測試的不同時期，以及一種用於測量真實世界中人氣網站頁面加載的新技術，並詳細分解了每個 V8 元件的時間。

## Ignition：V8 的解釋器

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長度: 36:39
- [幻燈片](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

介紹了 V8 的新 Ignition 解釋器，並解釋了整個引擎的架構，以及 Ignition 如何影響記憶體使用與啟動性能。

## 我們如何衡量並優化 V8 垃圾回收中的 RAIL

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長度: 27:11
- [幻燈片](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

解釋了 V8 如何使用 RAIL（響應、動畫、閒置、加載）指標來實現低延遲垃圾回收，及我們最近所做的優化以減少移動端的卡頓。

## ECMAScript 2015及未來

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長度: 28:52
- [幻燈片](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

提供了 V8 新語言功能的實現更新，這些功能如何與網頁平台集成，以及繼續推進 ECMAScript 語言標準的過程。

## 從 V8 到 Blink 的封裝追蹤（閃電講座）

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長度: 2:31
- [幻燈片](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

突出說明了 V8 和 Blink 物件之間的追蹤封裝，及它們如何幫助防止記憶體洩漏並減少延遲。
