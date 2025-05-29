---
title: '如何衡量 V8 的真實世界性能'
author: 'V8 團隊'
date: 2016-12-21 13:33:37
tags:
  - 基準測試
description: 'V8 團隊開發了一種新方法來衡量和理解真實世界中的 JavaScript 性能。'
---
過去一年中，V8 團隊開發了一種新方法來衡量和理解真實世界中的 JavaScript 性能。我們使用從這個方法中獲得的洞察來改變 V8 團隊提高 JavaScript 性能的方式。我們的新方法對真實世界的關注代表著我們從傳統性能重點的一個重大轉變。我們相信，隨著我們在 2017 年繼續應用此方法，它將顯著提高用戶和開發者對 V8 在 Chrome 和 Node.js 中提供可預測性能的依賴能力。

<!--truncate-->
老話說得好，“被測量的事物才能被改善”，這在 JavaScript 虛擬機 (VM) 開發領域尤其如此。選擇正確的指標以指導性能優化是 VM 團隊長期以來可以做的最重要的事情之一。以下時間表大致說明了自從 V8 初次發布以來 JavaScript 基準測試的演變：

![JavaScript 基準測試的演變](/_img/real-world-performance/evolution.png)

歷史上，V8 和其他 JavaScript 引擎通過合成基準測試來測量性能。最初，VM 開發者使用了像 [SunSpider](https://webkit.org/perf/sunspider/sunspider.html) 和 [Kraken](http://krakenbenchmark.mozilla.org/) 這樣的微基準測試。隨著瀏覽器市場的成熟，第二個基準測試時代開始，期間使用了較大的但仍然是合成的測試套件，比如 [Octane](http://chromium.github.io/octane/) 和 [JetStream](http://browserbench.org/JetStream/)。

微基準測試和靜態測試套件有一些好處：它們易於啟動，簡單易懂，能夠在任何瀏覽器中運行，從而使對比分析變得容易。但是，這種便利性也帶來了一些缺點。由於它們包含的測試案例有限，很難設計出能夠準確反映網頁整體特徵的基準測試。此外，基準測試通常更新頻率較低，因此很難跟上 JavaScript 開發中新趨勢和模式的變化。最終，多年來 VM 作者探索了傳統基準的每個角落，並在此過程中發現並利用了在基準測試執行期間通過調整或甚至跳過外部不可觀測工作來改善基準測試得分的機會。這種基準測試得分驅動的改善和對基準測試的過度優化並不總是對用戶或開發者帶來太多益處，而歷史表明，從長遠來看，製作一個“不可被操縱”的合成基準測試非常困難。

## 測量真實網站：WebPageReplay 和 Runtime Call Stats

出於直覺認為我們僅通過傳統靜態基準測試只看到性能故事的一部分，V8 团队著手通过基准测试真实网站的加载情况来测量真实世界的性能。我们希望測量反映终端用户实际浏览网页的使用案例，所以我們決定基於像 Twitter、Facebook 和 Google Maps 這樣的網站導出性能指標。使用名為 [WebPageReplay](https://github.com/chromium/web-page-replay) 的一項 Chrome 基礎設施，我們能夠以確定性的方式記錄並重播頁面加載。

同時，我們開發了一個名為 Runtime Call Stats 的工具，它使我們能夠剖析不同的 JavaScript 代碼對不同 V8 組件的壓力程度。首次，我們不僅能夠輕鬆對真實網站進行 V8 更改測試，還可以完全理解 V8 在不同工作負載下為什麼以及是如何表現的。

我們現在監控大約 25 個網站的測試套件的變化以指導 V8 的優化。除了上述網站以及其他 Alexa 前 100 網站以外，我們選擇了一些常見框架（React、Polymer、Angular、Ember 等）所編寫的網站，多個不同地理區域的網站，以及一些與我們合作的網站或庫的開發團隊，比如 Wikipedia、Reddit、Twitter 和 Webpack。我們相信這 25 個網站代表了全網，對這些網站的性能改進將直接體現在當今由 JavaScript 開發者編寫的類似網站的速度提升上。

有關我們網站測試套件和 Runtime Call Stats 開發的深入演講，請查看 [BlinkOn 6 關於真實世界性能的演講](https://www.youtube.com/watch?v=xCx4uC7mn6Y)。您甚至可以[自己運行 Runtime Call Stats 工具](/docs/rcs)。

## 真正帶來改變

使用執行時調用統計（Runtime Call Stats）分析這些新的實際性能指標並與傳統基準進行比較，我們更深入地了解了不同工作負載如何以不同方式對 V8 施加壓力。

透過這些測量，我們發現 Octane 性能其實並不是我們測試的 25 個網站的大部分性能的良好代理。在下圖中可以看出：Octane 的色條分佈與任何其他工作負載都非常不同，尤其是那些真實網站的工作負載。在執行 Octane 時，V8 的瓶頸通常是 JavaScript 代碼的執行。但是，大多數真實網站則更注重 V8 的解析器和編譯器。我們意識到為 Octane 進行的優化通常對真實網頁影響不大，而在某些情況下，[這些優化甚至使真實網站變得更慢](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#a-closer-look-at-octane)。

![運行全體 Octane、運行 Speedometer 項目，以及從我們的測試套件在 Chrome 57 上載入網站的時間分佈](/_img/real-world-performance/startup-distribution.png)

我們還發現另一基準測試實際上是對真實網站的更佳代理。[Speedometer](http://browserbench.org/Speedometer/)，一個包含使用 React、Angular、Ember 以及其他框架編寫的應用程序的 WebKit 基準測試，展現出與 25 個網站非常相似的運行時配置。雖然沒有任何基準測試能與真實網頁的準確性匹配，但我們認為 Speedometer 在模擬現代 JavaScript 網頁的真實工作負載方面比 Octane 更出色。

## 結論：更快的 V8，惠及所有人

在過去的一年中，實際網站測試套件以及我們的執行時調用統計工具使我們能交付 V8 性能優化，讓整個頁面載入速度平均提升 10-20%。鑑於 Chrome 一直致力於優化頁面載入速度，2016 年這項指標的改善達到兩位數是一項重要成就。同樣的優化使 Speedometer 的得分提升了 20-30%。

這些性能提升應能在其他使用現代框架和相似 JavaScript 模式的網站上反映出來。我們對如 `Object.create` 和 [`Function.prototype.bind`](https://benediktmeurer.de/2015/12/25/a-new-approach-to-function-prototype-bind/) 等內建函數的改進、對物件工廠模式的優化、對 V8 的[內嵌快取](https://en.wikipedia.org/wiki/Inline_caching)的工作以及持續進行的解析器改進，旨在為所有開發人員使用的被忽視的 JavaScript 領域提供普遍適用的提升，而不僅僅是我們跟蹤的代表性網站。

我們計劃擴大使用真實網站來指導 V8 性能研究。敬請期待更多基準測試和腳本性能的見解。
