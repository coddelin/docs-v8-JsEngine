---
title: "啟動 Ignition 和 TurboFan"
author: "V8 團隊"
date: 2017-05-15 13:33:37
tags:
  - 內部運作
description: "V8 v5.9 帶來全新 JavaScript 執行管線，基於 Ignition 解釋器和 TurboFan 優化編譯器構建。"
---
今天，我們欣然宣佈 V8 v5.9 的新 JavaScript 執行管線正式上線，並將隨 v59 版 Chrome 穩定版發布。透過新管線，我們在現實世界中的 JavaScript 應用程序實現了顯著的性能提升和記憶體節省。文末我們會更詳細地討論相關數字，但首先讓我們來了解一下這個管線本身。

<!--truncate-->
新管線基於 [Ignition](/docs/ignition)，V8 的解釋器，以及 [TurboFan](/docs/turbofan)，V8 最新的優化編譯器。這些技術可能[對](/blog/turbofan-jit)您[來說](/blog/ignition-interpreter) [已不陌生](/blog/test-the-future)，尤其是那些過去幾年來關注 V8 部落格的朋友。但這次切換到新管線標誌著兩者的一個重要里程碑。

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Ignition 的 Logo，V8 全新解釋器</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>TurboFan 的 Logo，V8 全新優化編譯器</figcaption>
</figure>

首次，Ignition 和 TurboFan 在 V8 v5.9 中被普遍且排他地用於 JavaScript 執行。此外，從 v5.9 開始，自 2010 年以來[為 V8 提供良好服務的技術](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html) Full-codegen 和 Crankshaft 不再用於 V8 的 JavaScript 執行，因為它們已無法跟上新 JavaScript 語言功能以及這些功能所需的優化。我們計劃很快將它們完全移除。這意味著，未來 V8 會擁有明顯更簡單且更易維護的架構。

## 漫長的旅程

結合 Ignition 和 TurboFan 的管線已開發近三年半。它代表了 V8 團隊從測量現實世界中 JavaScript 的性能中得到的集體洞察力的集大成，並且仔細考慮了 Full-codegen 和 Crankshaft 的局限性。它是一個基石，讓我們能夠在未來多年持續優化整個 JavaScript 語言。

TurboFan 項目最初於 2013 年底開始，目的是解決 Crankshaft 的局限性。Crankshaft 只能優化 JavaScript 語言的一部分。例如，它並非為優化使用結構化異常處理的 JavaScript 代碼而設計，即以 JavaScript 的 try、catch 和 finally 關鍵字劃分的代碼塊。要在 Crankshaft 中添加新語言功能的支持非常困難，因為這些功能幾乎總是需要為九個支援的平臺分別撰寫架構特定的代碼。此外，Crankshaft 的架構在一定程度上限制了它生成最佳機器代碼的能力。儘管需要 V8 團隊為每個芯片架構維護超過一萬行代碼，但它能從 JavaScript 中擠出來的性能提升卻很有限。

TurboFan 從一開始就設計為不僅優化當時 JavaScript 標準 ES5 中的所有語言功能，還包括計劃在 ES2015 及以後新增的所有未來功能。它引入了一個分層編譯器設計，實現了高層次和低層次編譯器優化之間的干净分離，使得在不修改架構特定代碼的情況下添加新語言功能變得更容易。TurboFan 添加了一個明確的指令選擇編譯階段，從一開始就大幅減少了為每個支持平臺撰寫架構特定代碼的需求。隨著這個新階段的引入，架構特定代碼只需要撰寫一次且很少需要更改。這些以及其他的決策，導致了一個針對所有支持架構的更易維護且可擴展的優化編譯器。

V8 的 Ignition 解釋器背後的最初動機是降低移動設備上的記憶體消耗。在 Ignition 啟用之前，由 V8 的 Full-codegen 基線編譯器生成的代碼通常佔 Chrome 總體 JavaScript 堆的將近三分之一。這減少了 Web應用程序實際數據的可用空間。當 Ignition 在 Android 設備的 Chrome M53 上啟用時，非優化 JavaScript 基線代碼所需的記憶體佔用量在基於 ARM64 的移動設備上減少了九倍。

後來 V8 團隊利用了 Ignition 的位元碼可以直接用 TurboFan 生成優化的機器碼，而不需要像 Crankshaft 那樣從原始碼重新編譯的事實。Ignition 的位元碼在 V8 中提供了一個更乾淨且更少錯誤的基線執行模型，簡化了去優化機制，這是 V8 [自適應優化](https://en.wikipedia.org/wiki/Adaptive_optimization) 的一個關鍵特性。最後，由於生成位元碼比生成 Full-codegen 的基線編譯碼速度更快，啟用 Ignition 通常可以改善腳本啟動時間，進而加速網頁加載。

通過緊密結合 Ignition 和 TurboFan 的設計，可以對整體架構帶來更多好處。例如，V8 團隊不是用手寫的組合語言編寫 Ignition 的高性能位元碼處理程序，而是使用 TurboFan 的[中介表示](https://en.wikipedia.org/wiki/Intermediate_representation)來表示處理程序的功能，並讓 TurboFan 為 V8 的眾多支持平台進行優化和最終的代碼生成。這確保了 Ignition 在所有 V8 的支持晶片架構上都表現良好，同時消除了維護九個獨立平台移植的負擔。

## 數據分析

先撇開歷史不談，現在我們來看看新管線在實際應用中的效能表現和記憶體消耗情況。

V8 團隊使用 [Telemetry - Catapult](https://catapult.gsrc.io/telemetry) 框架持續監控實際用例的效能。這篇部落格的[先前文章](/blog/real-world-performance)中，我們討論了使用真實測試數據來推動效能優化工作的重要性，以及如何使用 [WebPageReplay](https://github.com/chromium/web-page-replay) 與 Telemetry 結合以達成這一目標。切換到 Ignition 和 TurboFan 顯示出在這些真實測試用例中的效能提升，具體而言，新管線在知名網站的用戶互動測試中呈現顯著加速效果：

![減少在用戶互動基準測試中 V8 的花費時間](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

儘管 Speedometer 是一個合成基準測試，我們此前已發現它在近似現代 JavaScript 的真實工作負載方面比其他合成基準測試做得更好。切換到 Ignition 和 TurboFan 使 V8 在 Speedometer 中的得分提升了 5%-10%，具體結果依平台和設備而定。

新管線還加速了伺服器端 JavaScript 的執行。[AcmeAir](https://github.com/acmeair/acmeair-nodejs)，一個模擬虛構航空公司伺服器後端實現的 Node.js 基準測試，使用 V8 v5.9 執行速度提高了超過 10%。

![Web 和 Node.js 基準測試的改進成果](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

Ignition 和 TurboFan 還減少了 V8 的整體記憶體佔用。在 Chrome M59 中，新管線使 V8 在桌面和高端移動設備上的記憶體佔用減少了 5%-10%。這些減少是 Ignition 的記憶體節省成果，這一點在本部落格的[先前文章](/blog/ignition-interpreter)中已提到，現在擴展到所有 V8 支持的設備和平台。

這些改進只是開始。新的 Ignition 和 TurboFan 管線為進一步優化 JavaScript 的效能和縮減 V8 在 Chrome 和 Node.js 的佔用開啟了道路。未來數年，我們期待能將這些改進分享給開發者和使用者。敬請期待。
