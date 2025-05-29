---
title: &apos;V8 發布 v7.9&apos;
author: &apos;Santiago Aboy Solanes，指針壓縮技術專家&apos;
avatars:
  - &apos;santiago-aboy-solanes&apos;
date: 2019-11-20
tags:
  - release
description: &apos;V8 v7.9 功能移除了 Double ⇒ Tagged 過渡的棄用處理，內建函數中的 API getter處理、OSR 快取，和支持多代碼區的 Wasm。&apos;
tweet: &apos;1197187184304050176&apos;
---
每六週，我們會在 [發布流程](/docs/release-process)中創建一個 V8 新分支。每個版本都是在 Chrome Beta 里程碑之前直接從 V8 的 Git 主分支中分支出來的。今天我們很高興宣佈我們最新的分支，[V8 版本 7.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.9)，目前處於 Beta 階段，並將在幾週後與 Chrome 79 穩定版協調發布。V8 v7.9 滿載了各種面向開發者的功能。此篇文章提供了一些亮點的預覽，以迎接正式發布。

<!--truncate-->
## 性能（大小與速度）

### 移除了 Double ⇒ Tagged 過渡的棄用處理

您可能還記得之前的博客文章提到 V8 追蹤物件形狀中字段的表示方式。當字段的表示方式發生變化時，當前物件的形狀需要被“棄用”，並創建一個具有新字段表示的新形狀。

其中一個例外是當舊字段值保證可以與新表示方式兼容。在這些情況下，我們可以直接在物件形狀上就地替換為新的表示方式，並且仍然可以適用於舊物件的字段值。在 V8 v7.6 中，我們啟用了 Smi ⇒ Tagged 和 HeapObject ⇒ Tagged 過渡的就地表示方式更改，但由於我們的 MutableHeapNumber 優化，無法避免 Double ⇒ Tagged。

在 V8 v7.9 中，我們移除了 MutableHeapNumber，而是使用屬於 Double 表示字段的隱式可變 HeapNumbers。這意味著我們需要更加小心處理 HeapNumbers（如果它們位於 double 字段則現在是可變的，否則不可變），但 HeapNumbers 與 Tagged 表示方式兼容，因此我們也可以避免在 Double ⇒ Tagged 情況下的棄用處理。

這個相對簡單的更改使 Speedometer AngularJS 的得分提高了 4%。

![Speedometer AngularJS 分數提高](/_img/v8-release-79/speedometer-angularjs.svg)

### 在內建函數中處理 API getters

此前，當處理嵌入 API 定義的 getters（例如 Blink）時，V8 總是漏到 C++ 運行時。這些包括 HTML 規範中定義的 getters，例如 `Node.nodeType`、`Node.nodeName` 等。

V8 會在內建函數中整個原型鏈遍歷以加載 getter，然後一旦意識到 getter 是由 API 定義的，就跳出到運行時。在 C++ 運行時，它會再次遍歷原型鏈以獲取 getter，然後執行它，重複了許多工作。

一般來說，[內聯快取（IC）機制](https://mathiasbynens.be/notes/shapes-ics)可以幫助減輕這一問題，因為 V8 會在第一次漏到 C++ 運行時後安裝 IC 處理器。但是，隨著新的[懶反饋分配](https://v8.dev/blog/v8-release-77#lazy-feedback-allocation)，V8 不會在函數執行一定時間之前安裝 IC 處理器。

現在在 V8 v7.9 中，即使這些 getters 沒有安裝 IC 處理器，通過利用特殊的 API stub，可以直接調用 API getter，而不需要漏到 C++ 運行時。根據 Speedometer 的 Backbone 和 jQuery 基準測試，這使在 IC 運行時所用的時間減少了 12%。

![Speedometer Backbone 和 jQuery 改進](/_img/v8-release-79/speedometer.svg)

### OSR 快取

當 V8 確定某些函數是熱點函數時，它會在下一次調用時標記它們進行優化。當函數再次執行時，V8 使用優化編譯器編譯該函數，並從隨後的調用開始使用優化代碼。然而，對於具有長時間運行的循環的函數，這種方法就不夠了。V8 使用一種稱為棧上替換（OSR）的技巧來為當前正在執行的函數安裝優化代碼。這使我們可以在函數的第一次執行中開始使用優化代碼，而此時它處於熱循環中。

如果函數再次執行，則非常可能再次進行 OSR。在 V8 v7.9 之前，我們需要重新優化函數以便進行 OSR。然而從 v7.9 開始，我們添加了 OSR 快取機制，保留 OSR 替換的優化代碼，並由進入 OSR 函數的循環頭作為鍵值。這使得某些峰值性能基準的性能提高了 5–18%。

![OSR 快取改進](/_img/v8-release-79/osr-caching.svg)

## WebAssembly

### 支援多個程式碼空間

目前為止，每個 WebAssembly 模組在 64 位元架構中僅包含一個程式碼空間，並在模組創建時保留。這允許我們在模組內使用近距呼叫，但限制了在 arm64 上程式碼空間為 128 MB，並需要在 x64 上預留 1 GB。

在 v7.9 中，V8 對 64 位元架構新增了支援多個程式碼空間的功能。這使我們可以僅保留估計需要的程式碼空間，並在需要時新增更多程式碼空間。對於程式碼空間之間距離太遠而無法使用近距跳轉的情況，我們使用遠距跳轉。現在，V8 對每個進程的支援從大約 1000 個 WebAssembly 模組提升到了數百萬個，僅受實際可用記憶體的限制。

## V8 API

請使用 `git log branch-heads/7.8..branch-heads/7.9 include/v8.h` 以取得 API 變更的清單。

擁有[有效 V8 檢出版本](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 7.9 -t branch-heads/7.9` 來試驗 V8 v7.9 的新功能。另外，您也可以[訂閱 Chrome Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並即將親自體驗這些新功能。
