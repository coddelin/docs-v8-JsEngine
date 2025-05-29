---
title: &apos;WebAssembly 動態分層可於 Chrome 96 試用&apos;
author: &apos;Andreas Haas — 有趣的階層&apos;
avatars:
  - andreas-haas
date: 2021-10-29
tags:
  - WebAssembly
description: &apos;WebAssembly 動態分層可於 V8 v9.6 和 Chrome 96 試用，可透過命令行標誌或來源試驗進行&apos;
tweet: &apos;1454158971674271760&apos;
---

V8 有兩個編譯器用於將 WebAssembly 程式碼編譯為可執行的機器代碼：基線編譯器 __Liftoff__ 和優化編譯器 __TurboFan__。Liftoff 能比 TurboFan 更快地生成代碼，從而提供快速的啟動時間。而 TurboFan 則生成更快的代碼，從而實現高峰性能。

<!--truncate-->
在當前 Chrome 的配置中，WebAssembly 模組會先完全由 Liftoff 編譯。當 Liftoff 編譯完成後，整個模組會被 TurboFan 在背景中重新編譯一次。通過流式編譯，如果 Liftoff 編譯 WebAssembly 程式碼的速度比下載程式碼的速度快，那麼 TurboFan 編譯可以更早開始。最初的 Liftoff 編譯提供快速的啟動時間，而背景中的 TurboFan 編譯則提供盡快的高峰性能。有關 Liftoff、TurboFan 和整個編譯過程的更多詳情，請參閱[單獨的文件](https://v8.dev/docs/wasm-compilation-pipeline)。

用 TurboFan 編譯整個 WebAssembly 模組可以在編譯完成後提供最佳性能，但這也需要付出代價：

- 執行背景中 TurboFan 編譯的 CPU 核心可能會阻止需要 CPU 的其他任務，例如 web 應用程序的 worker。
- 不重要的函數的 TurboFan 編譯可能會延遲更重要函數的 TurboFan 編譯，從而可能延遲 web 應用程序達到完全性能的時間。
- 某些 WebAssembly 函數可能永遠不會執行，而將資源花費在編譯這些函數可能並不值得。

## 動態分層

動態分層應該通過僅用 TurboFan 編譯那些實際多次執行的函數來緩解這些問題。因此動態分層可以以多種方式改變 web 應用程序的性能：動態分層可以通過減少 CPU 負載來加速啟動時間，從而允許 WebAssembly 編譯以外的啟動任務更充分地利用 CPU。動態分層也可能通過延遲重要函數的 TurboFan 編譯來降低性能。由於 V8 不對 WebAssembly 程式碼使用栈上替換，執行可能會卡在 Liftoff 的代碼中，例如循環中。而且代碼快取也會受到影響，因為 Chrome 僅快取 TurboFan 代碼，所有那些從未符合 TurboFan 編譯條件的函數即使在快取中已存在已編譯的 WebAssembly 模組也必須在啟動時用 Liftoff 編譯。

## 如何試用

我們鼓勵感興趣的開發者試驗動態分層對其 web 應用程序性能的影響。這將使我們能夠快速調整，以避免潛在的性能回退。可通過運行帶有命令行標誌 `--enable-blink-features=WebAssemblyDynamicTiering` 的 Chrome 來本地啟用動態分層。

想要啟用動態分層的 V8 嵌入者可通過設置 V8 標誌 `--wasm-dynamic-tiering` 來實現。

### 通過來源試驗在現場測試

運行帶有命令行標誌的 Chrome 是開發者可以執行的操作，但不應期望終端使用者這麼做。要在現場試驗您的應用程序，可以加入所謂的[來源試驗](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md)。來源試驗允許您通過與域相關的特殊令牌嘗試向終端使用者提供實驗功能。此特殊令牌在包含令牌的特定頁面上為終端使用者啟用 WebAssembly 動態分層。若要獲得自己的令牌以運行來源試驗，請[使用申請表](https://developer.chrome.com/origintrials/#/view_trial/3716595592487501825)。

## 向我們反饋

我們期待來自嘗試此功能的開發者的反饋意見，因為這將有助於我們確定 TurboFan 編譯合適的時機，以及當 TurboFan 編譯無效且可以避免時。發送反饋的最佳方法是[提交問題](https://bugs.chromium.org/p/chromium/issues/detail?id=1260322)。
