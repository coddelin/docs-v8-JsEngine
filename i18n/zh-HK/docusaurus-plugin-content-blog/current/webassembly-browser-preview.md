---
title: "WebAssembly 瀏覽器預覽"
author: "V8 團隊"
date: 2016-10-31 13:33:37
tags:
  - WebAssembly
description: "WebAssembly 或 Wasm 是一種全新的 web 運行時和編譯目標，現已在 Chrome Canary 中啟用旗標！"
---
今天我們很高興能與 [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview) 和 [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/) 同時宣布 WebAssembly 瀏覽器預覽。[WebAssembly](http://webassembly.org/) 或 Wasm 是一種由 Google、Mozilla、Microsoft、Apple 和 [W3C WebAssembly 社群組](https://www.w3.org/community/webassembly/) 的協作者設計的新型網頁運行時和編譯目標。

<!--truncate-->
## 此里程碑標誌著什麼？

此里程碑非常重要，因為它標誌著：

- 我們的 [MVP](http://webassembly.org/docs/mvp/)（最低可行產品）設計（包括 [語義](http://webassembly.org/docs/semantics/)、[二進位格式](http://webassembly.org/docs/binary-encoding/) 和 [JS API](http://webassembly.org/docs/js/)）的釋出候選版
- 在 V8 和 SpiderMonkey 主分支中的旗標後實現 WebAssembly 的兼容和穩定實現，Chakra 的開發版本中正在進行，JavaScriptCore 中也正在進行中
- 開發者可以將 WebAssembly 模組從 C/C++ 原始碼檔案編譯的一個 [可用工具鏈](http://webassembly.org/getting-started/developers-guide/)
- 一個 [計劃](http://webassembly.org/roadmap/)，若無基於社群反饋的改變，準備默認啟用 WebAssembly

你可以在 [專案網站](http://webassembly.org/)上了解更多關於 WebAssembly 的信息，並跟隨我們的 [開發者指南](http://webassembly.org/getting-started/developers-guide/) 測試使用 Emscripten 從 C 和 C++ 編譯 WebAssembly。二進位格式和 JS API 文件分別概述了 WebAssembly 的二進位編碼和在瀏覽器中實例化 WebAssembly 模組的機制。以下是一個示例來展示 wasm 的樣子：

![在 WebAssembly 中實現最大公因數函數，顯示其原始位元、文本格式（WAST）和 C 原始碼。](/_img/webassembly-browser-preview/gcd.svg)

由於 WebAssembly 在 Chrome 中仍然標記為旗標（[chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)），目前尚不建議用於生產用途。但是，瀏覽器預覽階段標誌著一段時間，期間我們正在積極收集 [設計](http://webassembly.org/community/feedback/) 和規範實現的反饋。鼓勵開發者測試編譯和移植應用程序並在瀏覽器中運行它們。

V8 繼續在 [TurboFan 編譯器](/blog/turbofan-jit) 中優化 WebAssembly 的實現。自去年三月我們首次宣布實驗性支持以來，我們已添加了並行編譯支持。此外，我們接近完成一個替代的 asm.js 管道，該管道將 asm.js 轉換為 WebAssembly [背後執行](https://www.chromestatus.com/feature/5053365658583040)，使現有的 asm.js 網站在提前編譯中獲得 WebAssembly 的部分優勢。

## 下一步是什麼？

除非社群反饋中出現重大設計變更，WebAssembly 社群組計劃在 2017 年第一季度產出官方規範，屆時將鼓勵瀏覽器默認啟用 WebAssembly。從那時起，二進位格式將重設為版本 1，WebAssembly 將不再有版本號，並進行功能測試和保持向後兼容。更詳細的 [計劃](http://webassembly.org/roadmap/) 可以在 WebAssembly 專案網站上找到。
