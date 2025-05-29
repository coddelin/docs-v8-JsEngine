---
title: &apos;無 JIT 的 V8&apos;
author: &apos;Jakob Gruber ([@schuay](https://twitter.com/schuay))&apos;
avatars:
  - &apos;jakob-gruber&apos;
date: 2019-03-13 13:03:19
tags:
  - internals
description: &apos;V8 v7.4 支援在執行期間不分配可執行記憶體的 JavaScript 執行功能。&apos;
tweet: &apos;1105777150051999744&apos;
---
V8 v7.4 現已支援在執行期間不分配可執行記憶體的 JavaScript 執行功能。

在其預設配置中，V8 大量依賴於在執行期間分配和修改可執行記憶體的能力。例如，[TurboFan 優化編譯器](/blog/turbofan-jit)會針對熱 JavaScript 函式即時生成原生代碼，而多數 JavaScript 正則表達式則由 [irregexp 引擎](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)編譯成原生代碼。在執行期間創建可執行記憶體是 V8 快速的部分原因。

<!--truncate-->
但在某些情況下，運行 V8 而不分配可執行記憶體可能是理想的選擇：

1. 部分平台（例如 iOS、智慧電視、遊戲機）禁止非特權應用程式寫入可執行記憶體，因此到目前為止無法使用 V8；以及
1. 禁止寫入可執行記憶體可減少應用程式遭到攻擊的面。

V8 的新無 JIT 模式旨在解決這些問題。當 V8 使用 `--jitless` 標誌啟動時，V8 不會進行任何執行期間的可執行記憶體分配。

它如何運作？基本上，V8 切換到基於現有技術的僅解釋器模式：所有 JS 使用者代碼都通過 [Ignition 解釋器](/blog/ignition-interpreter) 進行執行，正則表達式的模式匹配同樣會被解釋。目前 WebAssembly 尚不支援，但解釋也可能成為現實。V8 的內建函數仍然編譯為原生代碼，但不再是受管 JS 堆的一部分，這得益於我們最近的努力將其 [嵌入 V8 二進位檔](/blog/embedded-builtins)。

最終，這些改變使我們能夠創建 V8 的堆，而無需對其任何記憶體區域執行權限。

## 結果

由於無 JIT 模式禁用了優化編譯器，因此會帶來性能損失。我們研究了一系列基準來更好地理解 V8 的性能特性變化。 [Speedometer 2.0](/blog/speedometer-2) 旨在代表典型的網頁應用程式；[Web Tooling Benchmark](/blog/web-tooling-benchmark) 包括一組常見的 JS 開發工具；我們還包括了模擬 [YouTube Living Room 應用程式的瀏覽工作流程](https://chromeperf.appspot.com/report?sid=518c637ffa0961f965afe51d06979375467b12b87e72061598763e5a36876306) 的基準。所有測量均在 x64 Linux 桌面上本地完成，進行了 5 次運行。

![無 JIT 模式與默認 V8 的性能比較。分數正規化為默認配置的 V8 為 100。](/_img/jitless/benchmarks.svg)

Speedometer 2.0 在無 JIT 模式下大約慢了 40%。性能降低的一半主要歸因於禁用了優化編譯器，另一半則歸因於正則表達式解釋器，該解釋器最初的目的是作為調試工具，未來將見到性能改進。

Web Tooling Benchmark 更多地依賴於 TurboFan 優化代碼，因此在啟用無 JIT 模式時性能降低了 80%。

最後，我們測量了包括視頻播放和菜單操作的 YouTube Living Room 應用程式的模擬瀏覽流程。此處，無 JIT 模式大致持平，與標準 V8 配置相比僅顯示出 JS 執行速度的 6% 降低。該基準表明，峰值優化代碼性能並不總是與 [真實世界性能](/blog/real-world-performance) 相關聯，在許多情況下即使在無 JIT 模式下嵌入者仍然可以保持合理的性能。

記憶體消耗僅稍有變化，通過加載一組具有代表性網站，V8 的堆大小中位數減少了 1.7%。

我們鼓勵在受限制平台上或具有特殊安全要求的嵌入者考慮使用 V8 的新無 JIT 模式，此模式現已在 V8 v7.4 支援。如往常一樣，問題和反饋可在 [v8-users](https://groups.google.com/forum/#!forum/v8-users) 討論組中提出。

## 常見問題

*`--jitless` 和 `--no-opt` 有什麼區別？*

`--no-opt` 禁用 TurboFan 優化編譯器。`--jitless` 禁止所有執行期間的可執行記憶體分配。
