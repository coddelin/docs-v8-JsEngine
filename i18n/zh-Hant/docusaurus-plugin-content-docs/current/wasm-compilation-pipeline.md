---
title: "WebAssembly 編譯流水線"
description: "這篇文章解釋了 V8 的 WebAssembly 編譯器以及它們何時編譯 WebAssembly 程式碼。"
---

WebAssembly 是一種二進位格式，可以有效率且安全地在網頁上執行非 JavaScript 的編程語言程式碼。在本文中，我們深入探討 V8 中的 WebAssembly 編譯流水線，並解釋我們如何使用不同的編譯器來提供良好的效能。

## Liftoff

最初，V8 不會編譯任何 WebAssembly 模組中的函式。相反，當函式第一次被調用時，這些函式會由基準編譯器 [Liftoff](/blog/liftoff) 延遲編譯。Liftoff 是一種[單遍編譯器](https://en.wikipedia.org/wiki/One-pass_compiler)，即它只需遍歷一次 WebAssembly 程式碼，並為每條 WebAssembly 指令立即生成機器碼。單遍編譯器擅長快速生成程式碼，但只能應用少量的優化措施。事實上，Liftoff 可以非常快速地編譯 WebAssembly 程式碼，每秒可編譯數十兆位元組。

一旦 Liftoff 編譯完成，生成的機器碼就會註冊到 WebAssembly 模組中，因此未來對該函式的調用可以直接使用編譯後的程式碼。

## TurboFan

Liftoff 在極短的時間內生成還算不錯的機器碼。但因為它是獨立地為每條 WebAssembly 指令生成程式碼，所以幾乎沒有空間進行優化，例如改善暫存器分配或常見編譯器優化（如冗餘載入消除、強度削減或函式內聯）。

這就是為什麼那些被頻繁執行的「熱函式」會被 [TurboFan](/docs/turbofan) 重新編譯，TurboFan 是 V8 中的優化編譯器，適用於 WebAssembly 和 JavaScript。TurboFan 是一種[多遍編譯器](https://en.wikipedia.org/wiki/Multi-pass_compiler)，這表示在生成機器碼之前，它會構建多個內部程式碼表示形式。這些額外的內部表示形式允許進一步的優化和更好的暫存器分配，從而生成顯著更快的程式碼。

V8 會監控 WebAssembly 函式的調用頻率。一旦某個函式達到某個閾值，該函式就被認為是「熱函式」，並在背景執行緒上觸發重新編譯。一旦編譯完成，生成的新程式碼將被註冊到 WebAssembly 模組中，取代現有的 Liftoff 程式碼。任何新對該函式的調用將使用由 TurboFan 生成的新優化程式碼，而不是 Liftoff 的程式碼。不過需要注意的是，我們並未進行堆疊內替換（on-stack-replacement）。也就是說，如果 TurboFan 程式碼在函式被調用後才可用，則該函式的調用將使用 Liftoff 程式碼完成其執行。

## 程式碼快取

如果 WebAssembly 模組是通過 `WebAssembly.compileStreaming` 編譯的，那麼 TurboFan 生成的機器碼也會被快取。當同一 WebAssembly 模組再次從同一 URL 提取時，快取的程式碼可以立即使用，無需再次編譯。有關程式碼快取的更多資訊可參考[另一篇部落格文章](/blog/wasm-code-caching)。

程式碼快取會在生成的 TurboFan 程式碼量達到某個閾值時觸發。這表示對於大型的 WebAssembly 模組，TurboFan 程式碼會逐步快取，而對於小型的 WebAssembly 模組，TurboFan 程式碼可能從未被快取。Liftoff 程式碼不會快取，因為 Liftoff 編譯幾乎與從快取中加載程式碼一樣快。

## 偵錯

如前所述，TurboFan 進行了多項優化，其中許多涉及重排程式碼、消除變數或甚至跳過整個程式碼段。這意味著如果您想在特定指令處設置斷點，可能無法確定程式執行應該在哪裡停止。換句話說，TurboFan 程式碼不太適合進行偵錯。因此，當通過開啟 DevTools 開啟偵錯時，所有 TurboFan 程式碼都會再次被 Liftoff 程式碼取代（「降級」），因為每條 WebAssembly 指令精確對應於機器碼的一個段落，並且所有的局部和全域變數都保持完整。

## 性能分析

為了使事情顯得更加混亂，在 DevTools 中，當 Performance 頁籤被開啟並點擊"Record"按鈕時，所有程式碼將再次被 "升級"（重新編譯為 TurboFan）。"Record" 按鈕啟動性能分析。分析 Liftoff 程式碼並不具有代表性，因為它僅在 TurboFan 尚未完成時使用，並且可能比 TurboFan 的輸出顯著更慢，而 TurboFan 的輸出將在絕大多數時間內執行。

## 用於試驗的標誌

為了實驗，V8 和 Chrome 可以設定只用 Liftoff 或只用 TurboFan 編譯 WebAssembly 程式碼。甚至可以實驗延遲編譯，在函數第一次被調用時才編譯該函數。以下參數啟用這些實驗模式：

- 僅限 Liftoff：
    - 在 V8 中，設置 `--liftoff --no-wasm-tier-up` 參數。
    - 在 Chrome 中，停用 WebAssembly 分層編譯（`chrome://flags/#enable-webassembly-tiering`），並啟用 WebAssembly 基線編譯器（`chrome://flags/#enable-webassembly-baseline`）。

- 僅限 TurboFan：
    - 在 V8 中，設置 `--no-liftoff --no-wasm-tier-up` 參數。
    - 在 Chrome 中，停用 WebAssembly 分層編譯（`chrome://flags/#enable-webassembly-tiering`），並停用 WebAssembly 基線編譯器（`chrome://flags/#enable-webassembly-baseline`）。

- 延遲編譯：
    - 延遲編譯是一種編譯模式，函數僅在第一次被調用時進行編譯。類似於生產配置，函數首先通過 Liftoff 編譯（阻塞執行）。在 Liftoff 編譯完成後，該函數在後臺以 TurboFan 重新編譯。
    - 在 V8 中，設置 `--wasm-lazy-compilation` 參數。
    - 在 Chrome 中，啟用 WebAssembly 延遲編譯（`chrome://flags/#enable-webassembly-lazy-compilation`）。

## 編譯時間

有多種方式測量 Liftoff 和 TurboFan 的編譯時間。在 V8 的生產配置中，可以通過測量 `new WebAssembly.Module()` 執行完成所需的時間，或者 `WebAssembly.compile()` 承諾被解析所需的時間來測量 Liftoff 的編譯時間。為了測量 TurboFan 的編譯時間，可以在僅用 TurboFan 的配置中進行相同的測量。

![Google Earth 的 WebAssembly 編譯的追蹤。](https://earth.google.com/web)

在 `chrome://tracing/` 中啟用 `v8.wasm` 類別，還可以更詳細地測量編譯時間。Liftoff 編譯是從開始編譯到 `wasm.BaselineFinished` 事件的時間，TurboFan 編譯則在 `wasm.TopTierFinished` 事件結束。對於 `WebAssembly.compileStreaming()`，編譯從 `wasm.StartStreamingCompilation` 事件開始；對於 `new WebAssembly.Module()`，從 `wasm.SyncCompile` 事件開始；而對於 `WebAssembly.compile()`，從 `wasm.AsyncCompile` 事件開始。Liftoff 編譯用 `wasm.BaselineCompilation` 事件表示，TurboFan 編譯用 `wasm.TopTierCompilation` 事件表示。上圖顯示的是 Google Earth 的追蹤，並重點標註了關鍵事件。

更詳細的追蹤數據可以通過 `v8.wasm.detailed` 類別獲得，其中包括單個函數的編譯時間等信息。
