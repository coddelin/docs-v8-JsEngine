---
title: "V8 發佈 v6.5"
author: "V8 團隊"
date: 2018-02-01 13:33:37
tags:
  - 發佈
description: "V8 v6.5 增加了對 WebAssembly 流式編譯的支持，並引入了新的“非信任代碼模式”。"
tweet: "959174292406640640"
---
每六週，我們會根據 [發佈流程](/docs/release-process) 創建一個新的 V8 分支。每個版本都從 V8 的 Git 主分支分出，時間選定在 Chrome Beta 里程碑之前。今天，我們很高興地宣佈最新的分支 [V8 版本 6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5)，它目前處於 Beta 階段，並將在幾週內與 Chrome 65 的穩定版本一起正式發佈。V8 v6.5 提供了各種面向開發者的功能。本篇文章為即將到來的正式發佈提供了一些亮點的預覽。

<!--truncate-->
## 非信任代碼模式

為應對最近的名為 Spectre 的推測性側通道攻擊，V8 引入了 [非信任代碼模式](/docs/untrusted-code-mitigations)。如果您嵌入了 V8 ，並且您的應用程序需要處理用戶生成的、不可信的代碼，可考慮啟用此模式。請注意，此模式是默認啟用的，包括在 Chrome 中。

## WebAssembly 語法流式編譯支持

WebAssembly API 提供了一個專門函數來支持配合 `fetch()` API 的 [流式編譯](https://developers.google.com/web/updates/2018/04/loading-wasm)：

```js
const module = await WebAssembly.compileStreaming(fetch('foo.wasm'));
```

此 API 自 V8 v6.1 和 Chrome 61 起已可使用，然而初始實現並未真正利用流式編譯。但從 V8 v6.5 和 Chrome 65 起，我們充分利用了此 API，在下載模組字節的同時編譯 WebAssembly 模組。一旦完成某個函數所有字節的下載，我們就將它傳遞到背景線程進行編譯。

測量顯示，通過此 API，Chrome 65 中的 WebAssembly 編譯可在高端機器上達到最高 50 Mbit/s 的下載速度。這意味著，如果按 50 Mbit/s 的速度下載 WebAssembly 代碼，其編譯會在下載完成時即同步完成。

在下圖中，我們測量了以 25 Mbit/s、50 Mbit/s 和 100 Mbit/s 的下載速度下載並編譯一個包含 67 MB 的 WebAssembly 模組和約 190,000 個函數耗時。

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

當下載時間長於 WebAssembly 模組編譯時間時，例如上圖中在 25 Mbit/s 和 50 Mbit/s 的情況下，`WebAssembly.compileStreaming()` 幾乎在最後字節下載完成的瞬間就完成了編譯。

當下載時間短於編譯時間時，`WebAssembly.compileStreaming()` 的耗時則與不下載模組就直接編譯模組的耗時大致相同。

## 性能

我們繼續努力擴展 JavaScript 內建函數的快速路徑，並增加了一種機制以檢測和防止被稱為“去優化迴圈”的破壞性情況。這種迴圈會發生在優化代碼去優化後，_而無法找到錯誤原因_。在這種情況下，TurboFan 不斷嘗試優化，最終在約 30 次嘗試後放棄。如果您在第二階數組內建函數的回調中改變了數組形狀，例如改變數組的 `length`——在 V8 v6.5 中，我們記錄下此情況，並在未來的優化嘗試中停止此處的內建數組函數內聯。

我們還通過內聯許多以往因為加載函數和調用自身的副作用而被排除的內建函數擴展了快速路徑，例如函數調用。而 `String.prototype.indexOf` 則獲得了 [函數調用中高達 10× 的性能提升](https://bugs.chromium.org/p/v8/issues/detail?id=6270)。

在 V8 v6.4 中，我們已內聯支持 `Array.prototype.forEach`、`Array.prototype.map` 和 `Array.prototype.filter`。在 V8 v6.5 中，我們新增了以下內聯支持：

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

此外，我們擴展了所有這些內建函數的快速路徑。最初，我們會在看到包含浮點數的數組或者 [數組中存在“空洞”](/blog/elements-kinds)（例如 `[3, 4.5, , 6]`）時放棄。但現在，我們已能處理空洞的浮點數數組，唯一例外是 `find` 和 `findIndex`，它們的規範要求將空洞轉換成 `undefined` 令我們的努力受阻（_暫時如此...！_）。

下圖顯示了我們的內聯內建功能相比於 V8 v6.4 的改進增量，按整數數組、雙精度數組以及帶空洞的雙精度數組分類。時間以毫秒為單位。

![自 V8 v6.4 以來的性能改進](/_img/v8-release-65/performance-improvements.svg)

## V8 API

請使用 `git log branch-heads/6.4..branch-heads/6.5 include/v8.h` 來獲取 API 變更的清單。

擁有[活動的 V8 源碼檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 6.5 -t branch-heads/6.5` 來試驗 V8 v6.5 中的新功能。或者，您可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，很快自己試用這些新功能。
