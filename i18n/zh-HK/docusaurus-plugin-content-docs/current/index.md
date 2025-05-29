---
title: "文件檔"
description: "V8 專案的文件檔。"
slug: "/"
---
V8 是 Google 開放源碼的高效能 JavaScript 與 WebAssembly 引擎，由 C++ 編寫。它被用於 Chrome 以及 Node.js 等多個應用中。

本文件檔旨在為希望在其應用程式中使用 V8 的 C++ 開發人員以及任何對 V8 的設計和效能感興趣的人提供指引。本文件將引導您認識 V8，其餘資料則展示如何在代碼中使用 V8 和描述其部分設計細節，同時提供一組 JavaScript 基準測試以評估 V8 的效能。

## 關於 V8

V8 實現了 <a href="https://tc39.es/ecma262/">ECMAScript</a> 和 <a href="https://webassembly.github.io/spec/core/">WebAssembly</a>，並可運行於使用 x64、IA-32 或 ARM 處理器的 Windows、macOS 和 Linux 系統上。其他系統（如 IBM i、AIX）以及處理器（如 MIPS、ppcle64、s390x）由外部維護，詳見 [ports](/ports)。V8 可嵌入任意 C++ 應用程式中。

V8 編譯並執行 JavaScript 原始碼，處理物件的記憶體分配，並回收其不再需要的物件。V8 的停機回收、分代式、精確垃圾回收器是其效能的關鍵之一。

JavaScript 通常在瀏覽器中用於客戶端腳本，例如操作文件物件模型 (DOM) 物件。不過，DOM 通常不是由 JavaScript 引擎提供的，而是由瀏覽器提供。對 V8 而言也如此——Google Chrome 提供了 DOM。然而，V8 提供了 ECMA 標準中指定的所有數據類型、運算符、物件和函數。

V8 使任何 C++ 應用程式能將其自定義物件和函數暴露於 JavaScript 代碼中。您可以自行決定希望對 JavaScript 暴露的物件和函數。

## 文件概覽

- [從原始碼構建 V8](/build)
    - [檢出 V8 原始碼](/source-code)
    - [使用 GN 編譯](/build-gn)
    - [為 ARM/Android 進行交叉編譯和偵錯](/cross-compile-arm)
    - [為 iOS 進行交叉編譯](/cross-compile-ios)
    - [GUI 和 IDE 的設置](/ide-setup)
    - [在 Arm64 上編譯](/compile-arm64)
- [貢獻](/contribute)
    - [尊重式編碼](/respectful-code)
    - [V8 的公共 API 與其穩定性](/api)
    - [成為 V8 提交者](/become-committer)
    - [提交者的責任](/committer-responsibility)
    - [Blink 網測（也稱為佈局測試）](/blink-layout-tests)
    - [代碼覆蓋評估](/evaluate-code-coverage)
    - [發布流程](/release-process)
    - [設計審查指南](/design-review-guidelines)
    - [實現和發布 JavaScript/WebAssembly 語言功能](/feature-launch-process)
    - [WebAssembly 功能分階段發布和啟用的核對表](/wasm-shipping-checklist)
    - [Flake 二分測試](/flake-bisect)
    - [端口的處理](/ports)
    - [官方支援](/official-support)
    - [合併與打補丁](/merge-patch)
    - [Node.js 集成構建](/node-integration)
    - [報告安全漏洞](/security-bugs)
    - [本地執行基準測試](/benchmarks)
    - [測試](/test)
    - [問題的分類與處理](/triage-issues)
- 偵錯
    - [使用模擬器進行 ARM 偵錯](/debug-arm)
    - [為 ARM/Android 進行交叉編譯和偵錯](/cross-compile-arm)
    - [使用 GDB 偵錯內建函數](/gdb)
    - [通過 V8 偵錯協議進行調試](/inspector)
    - [GDB JIT 編譯介面整合](/gdb-jit)
    - [調查記憶體洩漏](/memory-leaks)
    - [堆疊跟蹤 API](/stack-trace-api)
    - [使用 D8](/d8)
    - [V8 工具](https://v8.dev/tools)
- 嵌入 V8
    - [嵌入 V8 的指南](/embed)
    - [版本號](/version-numbers)
    - [內建函數](/builtin-functions)
    - [國際化支援](/i18n)
    - [不受信任代碼的緩解措施](/untrusted-code-mitigations)
- 底層運作
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Torque 使用手冊](/torque)
    - [撰寫 Torque 內建函數](/torque-builtins)
    - [撰寫 CSA 內建函數](/csa-builtins)
    - [新增 WebAssembly 指令碼](/webassembly-opcode)
    - [隱藏類別（即 "隱式類別"）](/hidden-classes)
    - [Slack 跟蹤是什麼？](/blog/slack-tracking)
    - [WebAssembly 編譯管道](/wasm-compilation-pipeline)
- 撰寫可優化的 JavaScript
    - [使用 V8 的基於範例的探查器](/profile)
    - [使用 V8 探查 Chromium](/profile-chromium)
    - [在 Linux 上使用 `perf` 與 V8](/linux-perf)
    - [V8 跟蹤](/trace)
    - [使用執行時調用統計](/rcs)
