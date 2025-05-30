---
title: "在 V8 中對 WebAssembly 的實驗性支持"
author: "Seth Thompson，WebAssembly 管理員"
date: "2016-03-15 13:33:37"
tags: 
  - WebAssembly
description: "從今天開始，V8 和 Chromium 在啟用標誌後提供對 WebAssembly 的實驗性支持。"
---
_要詳細了解 WebAssembly 以及未來社區合作的路線圖，請參閱 Mozilla Hacks 博客上的 [A WebAssembly Milestone](https://hacks.mozilla.org/2016/03/a-webassembly-milestone/)。_

自 2015 年 6 月以來，來自 Google、Mozilla、Microsoft、Apple 以及 [W3C WebAssembly 社區小組](https://www.w3.org/community/webassembly/participants) 的合作夥伴一直在努力 [設計](https://github.com/WebAssembly/design)、[規範化](https://github.com/WebAssembly/spec) 以及實現 ([1](https://www.chromestatus.com/features/5453022515691520), [2](https://platform-status.mozilla.org/#web-assembly), [3](https://github.com/Microsoft/ChakraCore/wiki/Roadmap), [4](https://webkit.org/status/#specification-webassembly)) WebAssembly，一種新的網頁運行時和編譯目標。[WebAssembly](https://webassembly.github.io/) 是一種低級、可移植的位元組碼，旨在以緊湊的二進制格式編碼並在記憶體安全的沙盒中以近乎原生的速度執行。作為現有技術的演化，WebAssembly 與網頁平臺緊密集成，並且相比於 [asm.js](http://asmjs.org/)，下載和初始化速度更快。

<!--truncate-->
從今天開始，V8 和 Chromium 在啟用標誌後提供對 WebAssembly 的實驗性支持。要在 V8 中試用，在命令行中運行 `d8` 版本 5.1.117 或更高版本，並加上 `--expose_wasm` 標誌；或者在 Chrome Canary 51.0.2677.0 或更高版本中啟用 `chrome://flags#enable-webassembly` 下的實驗性 WebAssembly 功能。重新啟動瀏覽器後，JavaScript 環境中將可使用新的 `Wasm` 物件，該物件提供了一個可以實例化和運行 WebAssembly 模組的 API。**感謝 Mozilla 和 Microsoft 的合作夥伴的努力，在 [Firefox Nightly](https://hacks.mozilla.org/2016/03/a-webassembly-milestone) 中和 [Microsoft Edge](http://blogs.windows.com/msedgedev/2016/03/15/previewing-webassembly-experiments)（在視頻截圖中展示的內部構建）中，也有兩個與之相容的 WebAssembly 實現以標誌形式運行。**

WebAssembly 項目網站有一個 [demo](https://webassembly.github.io/demo/)，展示了運行時在 3D 遊戲中的使用。在支持 WebAssembly 的瀏覽器中，演示頁面將加載並初始化使用 WebGL 和其他網頁平臺 API 的 wasm 模組以渲染交互式遊戲。在其他瀏覽器中，演示頁面會回退到相同遊戲的 asm.js 版本。

![[WebAssembly demo](https://webassembly.github.io/demo/)](/_img/webassembly-experimental/tanks.jpg)

在內部，V8 中的 WebAssembly 實現設計為重複利用現有的 JavaScript 虛擬機基礎設施，特別是 [TurboFan 編譯器](/blog/turbofan-jit)。專門的 WebAssembly 解碼器通過單次通過檢查類型、本地變數索引、函數引用、返回值和控制流程結構來驗證模組。解碼器生成一個 TurboFan 圖，該圖經由多個優化通道處理，最終由相同的後端轉換為機器碼，該後端還為優化的 JavaScript 和 asm.js 生成機器碼。在未來幾個月中，團隊將專注於通過編譯器調整、並行處理和編譯策略改進來提高 V8 實現的啟動速度。

即將進行的兩項變化還將大幅提升開發人員的體驗。一種標準的 WebAssembly 文本表示將使開發人員能像查看其他網站腳本或資源那樣查看 WebAssembly 二進制的源碼。此外，目前的佔位符 `Wasm` 物件將被重新設計，以提供更強大、符合風格的屬性和方法，以從 JavaScript 中實例化和檢查 WebAssembly 模組。
