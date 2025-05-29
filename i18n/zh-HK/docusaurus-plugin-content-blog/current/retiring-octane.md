---
title: "退休 Octane"
author: "V8 團隊"
date: 2017-04-12 13:33:37
tags:
  - 基準測試
description: "V8 團隊認為是時候將 Octane 作為推薦基準測試退出歷史舞臺。"
---
JavaScript 基準測試的歷史是一個不斷演變的故事。隨著網頁從簡單的文檔擴展到動態的客戶端應用，新的 JavaScript 基準測試被創建以衡量新用例中重要的工作負載。這種不斷變化導致了各個基準測試有限的壽命。隨著網頁瀏覽器和虛擬機 (VM) 實現開始對特定的測試用例進行過度優化，基準測試本身停止成為其原始用途的有效代理工具。最早的 JavaScript 基準測試之一 [SunSpider](https://webkit.org/perf/sunspider/sunspider.html)，在早期推動了快速優化編譯器的推出。然而，隨著 VM 工程師揭示了 [微基準測試的局限性](https://blog.mozilla.org/nnethercote/2014/06/16/a-browser-benchmarking-manifesto/) 並找到新的方法去 [優化](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#the-notorious-sunspider-examples) [繞過](https://bugzilla.mozilla.org/show_bug.cgi?id=787601) SunSpider 的 [局限性](https://bugs.webkit.org/show_bug.cgi?id=63864)，瀏覽器社區 [正式退役](https://trac.webkit.org/changeset/187526/webkit) SunSpider 作為推薦基準測試。

<!--truncate-->
## Octane 的起源

為了彌補早期微基準測試的一些不足，[Octane 基準測試套件](https://developers.google.com/octane/) 最初於 2012 年發布。它從一組早期的簡單 [V8 測試用例](http://www.netchain.com/Tools/v8/) 演變而來，並成為衡量網頁性能的常用基準測試。Octane 包括 17 個不同的測試，設計涵蓋了多種不同的工作負載，從 Martin Richards 的核心模擬測試到 [Microsoft 的 TypeScript 編譯器](http://www.typescriptlang.org/) 自我編譯的一個版本。Octane 的內容代表了當時對於衡量 JavaScript 性能的通行智慧。

## 回報減少與過度優化

在發布後的頭幾年，Octane 為 JavaScript VM 生態系統提供了獨特的價值。它使包括 V8 在內的引擎能夠針對一類追求性能極致的應用進行性能優化。這些對 CPU 負擔大的工作負載最初未受到 VM 實現的充分支持。Octane 協助引擎開發者推進優化，使得計算密集型的應用達到了使 JavaScript 成為 C++ 或 Java 替代方案的可行速度。此外，Octane 推動了垃圾回收的改進，幫助網頁瀏覽器避免長時間或不可預測的中斷。

然而到了 2015 年，大多數 JavaScript 實現已完成所需的編譯器優化，足以在 Octane 上實現高分。在 Octane 上追求更高的基準測試分數轉化為對真實網頁性能越來越邊際的改進。對於執行 [Octane 與載入常用網站](/blog/real-world-performance)（例如 Facebook、Twitter 或 Wikipedia）的執行分析顯示，該基準測試未能像真實世界的代碼那樣運行 V8 的 [解析器](https://medium.com/dev-channel/javascript-start-up-performance-69200f43b201#.7v8b4jylg) 或瀏覽器的 [加載棧](https://medium.com/reloading/toward-sustainable-loading-4760957ee46f#.muk9kzxmb)。此外，Octane 的 JavaScript 風格與大多數現代框架和庫所採用的慣例和模式（更不用說轉碼的代碼或新的 ES2015+ 語言功能）不相符。這意味著使用 Octane 測量 V8 的性能未能捕捉現代網頁的重要使用案例，例如快速加載框架、支持具有新狀態管理模式的大型應用程序，或確保 ES2015+ 功能 [與它們的 ES5 等價物一樣快速](/blog/high-performance-es2015)。

此外，我們開始注意到，JavaScript 優化為了提高 Octane 分數，往往對真實世界中的場景產生不利影響。Octane 鼓勵積極使用內聯以減少函數呼叫的開銷，但針對 Octane 量身定制的內聯策略在真實世界案例中因增加編譯成本和更高的記憶體使用量而導致性能退化。即使某些優化在真實世界中可能確實有用，例如 [動態提前分配](http://dl.acm.org/citation.cfm?id=2754181)，追求更高的 Octane 分數可能會導致開發過於特殊化的啟發式方法，而這些方法在更通用的案例中幾乎沒有影響，甚至降低性能。我們發現基於 Octane 的提前分配啟發式方法導致 [現代框架如 Ember](https://bugs.chromium.org/p/v8/issues/detail?id=3665) 的性能退化。`instanceof` 操作符是另一個專門針對 Octane 特定案例的優化示例，導致 Node.js 應用程序中的[重大退化](https://github.com/nodejs/node/issues/9634)。

另一個問題是，隨著時間推移，Octane 中的小錯誤本身成為了優化的目標。例如，在 Box2DWeb 基準測試中，利用[一個 bug](http://crrev.com/1355113002)——兩個對象用 `<` 和 `>=` 操作符進行比較——使 Octane 性能提升了約 15%。不幸的是，這個優化在真實世界中沒有任何效果，並且使更通用類型的比較優化變得複雜。Octane 有時甚至對真實世界的優化產生負面影響：其他 VM 開發者[注意到](https://bugzilla.mozilla.org/show_bug.cgi?id=1162272) Octane 似乎對延遲解析這一技術不利，此技術能幫助大多數真實網站加快載入速度，因為通常會遇到許多無用的程式碼。

## 超越 Octane 和其他合成基準測試

以上例子只是許多提高 Octane 分數但卻損害真實網站運行性能的優化中的一部分。不幸的是，類似問題也存在於其他靜態或合成基準測試中，如 Kraken 和 JetStream。簡而言之，此類基準測試不足以衡量真實世界速度，並且誘使 VM 工程師過度優化狹窄的使用案例，而忽視通用案例，導致 JavaScript 程式碼在實際使用中變慢。

鑒於大多數 JS VM 的分數已趨於平穩，以及優化特定 Octane 基準測試與實現更廣泛的真實世界程式碼加速之間的矛盾不斷加劇，我們認為是時候將 Octane 作為推薦基準測試退役了。

Octane 推動了 JS 生態系統在計算密集型 JavaScript 的大幅進步。然而，下一個前沿是改善[真實網頁](/blog/real-world-performance)、現代庫、[框架](http://stateofjs.com/2016/frontend/)、ES2015+ [語言特性](/blog/high-performance-es2015)、新的[狀態管理](http://redux.js.org/)、[不可變對象分配](https://facebook.github.io/immutable-js/)以及[模組](https://webpack.github.io/) [打包](http://browserify.org/)的性能。由於 V8 在多種環境中運行，包括 Node.js 中的伺服器端，我們也投入時間了解真實世界的 Node 應用並通過類似 [AcmeAir](https://github.com/acmeair/acmeair-nodejs) 的工作負載測量伺服器端 JavaScript 性能。

請隨時回來了解更多關於[我們測量方法的改進](/blog/real-world-performance)和[新工作負載](/blog/optimizing-v8-memory)的文章，這些改進更能代表真實世界性能。我們很高興繼續追求對使用者和開發者而言最重要的性能！
