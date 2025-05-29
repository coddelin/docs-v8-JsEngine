---
title: &apos;V8 版本 v7.0&apos;
author: &apos;Michael Hablich&apos;
avatars:
  - michael-hablich
date: 2018-10-15 17:17:00
tags:
  - release
description: &apos;V8 v7.0 包含 WebAssembly 線程、Symbol.prototype.description，以及更多平台上的內嵌內建功能！&apos;
tweet: &apos;1051857446279532544&apos;
---
每六週，我們會根據 [發布流程](/docs/release-process) 建立 V8 的一個新分支。每個版本都是在 Chrome Beta 基準點之前，從 V8 的 Git 主分支分出來的。今天，我們很高興地宣布我們的最新分支，[V8 版本 7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0)，該版本將處於 Beta 階段，直到幾週後隨著 Chrome 70 穩定版一起發布。V8 v7.0 包含各種面向開發者的實用功能。本篇文章將提前預覽一些亮點功能，供大家期待發布。

<!--truncate-->
## 內嵌內建功能

[內嵌內建功能](/blog/embedded-builtins) 通過在多個 V8 隔離中共享生成的代碼來節省記憶體。從 V8 v6.9 開始，我們在 x64 平台啟用了內嵌內建功能。V8 v7.0 將這些記憶體節省功能擴展到了除了 ia32 之外的所有剩餘平台。

## WebAssembly 線程預覽

WebAssembly (Wasm) 支持將用 C++ 和其他語言編寫的代碼編譯後在網頁上運行。一項非常實用的本地應用特性就是使用線程——一種並行計算的基本工具。大多數 C 和 C++ 開發者對 pthreads（應用線程管理的標準化 API）應該很熟悉。

[WebAssembly 社群小組](https://www.w3.org/community/webassembly/) 一直在努力將線程引入網頁，以支持真正的多線程應用。作為這一工作的部分內容，V8 已經在 WebAssembly 引擎中實現了對線程的必要支持。要在 Chrome 中使用該功能，您可以通過 `chrome://flags/#enable-webassembly-threads` 啟用它，或者您的網站可以註冊參加 [Origin Trial](https://github.com/GoogleChrome/OriginTrials)。Origin Trial 允許開發者在新的網頁功能完全標準化之前進行實驗，這對於收集真實世界的反饋、驗證和改進新功能至關重要。

## JavaScript 語言功能

[`description` 屬性](https://tc39.es/proposal-Symbol-description/) 正被新增到 `Symbol.prototype`。這提供了一種更便捷的方法來訪問 `Symbol` 的描述。以前，描述只能通過 `Symbol.prototype.toString()` 間接訪問。感謝 Igalia 為此實現做出的貢獻！

`Array.prototype.sort` 現在在 V8 v7.0 中是穩定的。此前，V8 對超過 10 個元素的陣列使用不穩定的快排（QuickSort）。現在，我們採用了穩定的 TimSort 演算法。詳情請參閱[我們的部落格文章](/blog/array-sort)。

## V8 API

請使用 `git log branch-heads/6.9..branch-heads/7.0 include/v8.h` 來獲取 API 變更的清單。

擁有 [活動 V8 檢出](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 7.0 -t branch-heads/7.0` 來試驗 V8 v7.0 中的新功能。或者，您也可以[訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試這些新功能。
