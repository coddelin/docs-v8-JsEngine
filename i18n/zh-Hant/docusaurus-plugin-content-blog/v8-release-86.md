---
title: "V8 發佈 v8.6"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))，一位鍵盤模糊測試者"
avatars: 
 - "ingvar-stepanyan"
date: 2020-09-21
tags: 
 - release
description: "V8 發佈 v8.6 帶來了更尊重的代碼、性能改進和規範性更改。"
tweet: "1308062287731789825"
---
每六周，我們會根據我們的[發佈流程](https://v8.dev/docs/release-process)創建一個新的 V8 分支。每個版本都會在 Chrome Beta 里程碑之前從 V8 的 Git 主分支中分出來。今天我們很高興宣佈我們最新的分支，[V8 版本 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6)，這版本目前處於測試階段，並將在數週內與 Chrome 86 Stable 一同發佈。V8 v8.6 包含了各種開發人員可享用的功能。本文章旨在提前介紹一些亮點，以期待此次發佈。

<!--truncate-->
## 更尊重的代碼

v8.6 版本使 V8 代碼庫[更加尊重](https://v8.dev/docs/respectful-code)。團隊參與了整個 Chromium 團隊的努力，依據 Google 對種族平等的承諾，在項目中更換了一些用詞不恰當的術語。這是一項持續進行的努力，也歡迎任何外部貢獻者的幫助！你可以在[這裡](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit)查看尚未完成的任務列表。

## JavaScript

### 開源的 JS-Fuzzer

JS-Fuzzer 是由 Oliver Chang 原創的一個基於變異的 JavaScript 模糊測試工具。在過去，它一直是 V8 [穩定性](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1)和[安全性](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1)的基石，如今它已經[開源](https://chromium-review.googlesource.com/c/v8/v8/+/2320330)。

該模糊測試工具使用 [Babel](https://babeljs.io/) AST 轉換對現有的跨引擎測試用例進行變異，並通過可擴展的[變異器類](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/)進行配置。我們最近還開始運行模糊測試工具的差異測試模式，以檢測 JavaScript [正確性問題](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1)。歡迎您的貢獻！更多詳情可參考[README](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md)。

### `Number.prototype.toString` 的性能提升

在一般情況下，將一個 JavaScript 數字轉換為字符串可能是一個令人意外的複雜操作；我們必須考慮到浮點精度、科學計數法、NaN、無窮大、捨入等問題。在計算之前，我們甚至不知道生成的字符串會有多大。因此，我們的 `Number.prototype.toString` 的實現會跳到一個 C++ 執行時函數。

但是，大部分時間裡，你只需要打印一個簡單的小整數（稱為“Smi”）。這是一個更簡單的操作，並且調用 C++ 執行時函數的開銷已經變得毫無意義。所以，我們與 Microsoft 的朋友合作，在 `Number.prototype.toString` 中為小整數添加了一條簡單的快速路徑，這部分代碼使用 Torque 編寫，可減少這種常見情況下的開銷。此改進使數字打印微基準測試效率提高了約 75%。

### 移除了 `Atomics.wake`

`Atomics.wake` 被重命名為 `Atomics.notify` 以符合 [v7.3 版中的規範變更](https://v8.dev/blog/v8-release-73#atomics.notify)。現在，已移除過時的 `Atomics.wake` 別名。

### 小規範更改

- 匿名類現在有一個 `.name` 屬性，其值為空字符串 `''`。[規範變更](https://github.com/tc39/ecma262/pull/1490)。
- `\8` 和 `\9` 轉義序列現在在[寬鬆模式](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode)中的模板字符串字面量以及[嚴格模式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)中的所有字符串字面量中都是非法的。[規範變更](https://github.com/tc39/ecma262/pull/2054)。
- 內建的 `Reflect` 對象現在有一個 `Symbol.toStringTag` 屬性，其值為 `'Reflect'`。[規範變更](https://github.com/tc39/ecma262/pull/2057)。

## WebAssembly

### Liftoff 上的 SIMD

Liftoff 是 WebAssembly 的基準編譯器，從 V8 v8.5 開始已在所有平台上提供。[SIMD 提案](https://v8.dev/features/simd) 使 WebAssembly 能夠利用常見的硬件向量指令來加速計算密集型工作負載。目前正處於 [Origin Trial](https://v8.dev/blog/v8-release-84#simd-origin-trial) 階段，允許開發者在標準化之前試驗此功能。

直到現在，SIMD 只在 TurboFan（V8 的高級編譯器）中實現。這是必要的，以便從 SIMD 指令中獲得最大性能。使用 SIMD 指令的 WebAssembly 模組相比用 TurboFan 編譯的標量版本，啟動速度更快，運行性能通常也更高。例如，給定一個接收浮點數数组並將其值限制為零的函數（此處以 JavaScript 表達為明晰）：

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

讓我們比較一下使用 Liftoff 和 TurboFan 實現的此函數的兩種不同實現：

1. 一種標量實現，循環展開四次。
2. 一種 SIMD 實現，使用 `i32x4.max_s` 指令。

以 Liftoff 標量實現為基準，我們看到以下結果：

![一張圖表顯示 Liftoff SIMD 比 Liftoff 標量快約 2.8×，而 TurboFan SIMD 比標量快約 7.5×](/_img/v8-release-86/simd.svg)

### 更快的 Wasm-to-JS 調用

如果 WebAssembly 調用導入的 JavaScript 函數，我們會通過所謂的“Wasm-to-JS 包裝器”（或“導入包裝器”）進行調用。此包裝器[將參數轉換](https://webassembly.github.io/spec/js-api/index.html#tojsvalue)為 JavaScript 能理解的對象，並且在調用 JavaScript 返回時，會將返回值[轉換回 WebAssembly](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue)。

為了確保 JavaScript 的 `arguments` 對象完全反映從 WebAssembly 傳遞的參數，如果檢測到參數數量不匹配，我們使用所謂的“arguments adapter trampoline”進行調用。

然而在很多情況下，這並不需要，因為被調用的函數不使用 `arguments` 對象。在 v8.6 中，我們的微軟貢獻者提交了一個[補丁](https://crrev.com/c/2317061)，避免了這些情況下通過 arguments adapter 進行調用，使受影響的調用速度顯著提高。

## V8 API

### 使用 `Isolate::HasPendingBackgroundTasks` 檢測待處理的背景任務

新的 API 函數 `Isolate::HasPendingBackgroundTasks` 允許嵌入者檢查是否存在最終會發起新前台任務的待處理背景工作，如 WebAssembly 編譯。

此 API 應該可以解決嵌入者關閉 V8 而仍有待處理的 WebAssembly 編譯最終啟動更多腳本執行的問題。有了 `Isolate::HasPendingBackgroundTasks`，嵌入者可以等待新前台任務，而不是關閉 V8。

請使用 `git log branch-heads/8.5..branch-heads/8.6 include/v8.h` 獲取 API 更改列表。

擁有有效 V8 源碼檢出的開發者可以使用 `git checkout -b 8.6 -t branch-heads/8.6` 試驗 V8 v8.6 的新功能。或者你可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，很快自行試用新功能。
