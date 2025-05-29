---
title: "Chrome 歡迎 Speedometer 2.0！"
author: "Blink 和 V8 團隊"
date: "2018-01-24 13:33:37"
tags: 
  - 基準測試
description: "基於 Speedometer 2.0，對於我們在 Blink 和 V8 中所作的性能改進概述。"
tweet: "956232641736421377"
---
自 2014 年 Speedometer 1.0 初次發布以來，Blink 和 V8 團隊一直將這個基準測試作為流行 JavaScript 框架實際使用的代理，我們在這個基準測試中取得了相當大的速度提升。我們獨立驗證了這些改進確實能轉化為實際用戶的好處，通過衡量真實世界的網站，觀察到流行網站的頁面加載時間的改進同樣提高了 Speedometer 的分數。

<!--truncate-->
JavaScript 在此期間迅速發展，增加了許多新的語言特性，比如 ES2015 以及後續的標準。同樣的情況也適用於框架本身，因此 Speedometer 1.0 隨著時間的推移變得過時。因此使用 Speedometer 1.0 作為優化指標可能存在未涵蓋到新代碼模式的風險，而這些模式正在被積極使用。

Blink 和 V8 團隊歡迎 [Speedometer 2.0 基準測試的最新更新發布](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/)。將原始概念應用於一系列現代框架、轉譯器和 ES2015 特性，使這個基準測試再次成為優化的首選。Speedometer 2.0 是 [我們的真實世界性能基準工具組](/blog/real-world-performance) 的極佳補充。

## Chrome 到目前為止的成果

Blink 和 V8 團隊已經完成了第一輪的改進，這凸顯了這個基準測試對我們的重要性，並繼續專注於真實世界性能的旅程。我們將 2017 年 7 月的 Chrome 60 與最新的 Chrome 64 進行比較，在 2016 年中的 Macbook Pro（4 核心，16GB RAM）上，我們實現了總分（每分鐘運行次數）約 21% 的提升。

![Chrome 60 和 64 的 Speedometer 2 分數對比](/_img/speedometer-2/scores.png)

讓我們來深入了解 Speedometer 2.0 的各個子項目。我們通過改進 [`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18)，將 React 運行時的性能提升了一倍。由於 [加速 JSON 解析](https://chromium-review.googlesource.com/c/v8/v8/+/700494) 和各種其他性能修復，Vanilla-ES2015、AngularJS、Preact 和 VueJS 的性能提高了 19%–42%。jQuery-TodoMVC 應用的運行時得益於對 Blink 的 DOM 實現的改進，包括 [更輕量化的表單控制](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd) 和 [對 HTML 解析器的調整](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef)。對 V8 的內聯緩存和優化編譯器的進一步調整帶來了整體性能的提升。

![從 Chrome 60 到 64 的 Speedometer 2 子測試的分數提升](/_img/speedometer-2/improvements.png)

Speedometer 1.0 的一個重大變化是最終分數的計算方式。以前的所有分數平均值更傾向於僅對最慢的子項目進行改進。當查看每個子項目耗費的絕對時間時，我們發現例如 EmberJS-Debug 的版本需要約 35 倍於最快基準的時間。因此，為了提高整體分數，專注於 EmberJS-Debug 具有最高潛力。

![](/_img/speedometer-2/time.png)

Speedometer 2.0 使用幾何平均值作為最終得分，更加偏向於對每個框架進行平均投資。我們可以考慮上文提到的 Preact 最近的 16.5% 改進。不因為其對總耗時的較小貢獻而忽略這些 16.5% 的改進，這是一種更加公平的方式。

我們期待在 Speedometer 2.0 中帶來更多的性能改進，並通過此提升整個網絡的性能。請繼續關注更多性能成果分享。
