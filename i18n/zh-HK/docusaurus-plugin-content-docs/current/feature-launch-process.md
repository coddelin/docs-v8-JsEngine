---
title: '實作及發佈 JavaScript/WebAssembly 語言特性'
description: '此文件詳細說明在 V8 中實作及發佈 JavaScript 或 WebAssembly 語言特性的流程。'
---
一般而言，V8 遵循 [Blink Intent 已定義共識標準流程](https://www.chromium.org/blink/launching-features/#process-existing-standard)，以處理 JavaScript 和 WebAssembly 語言特性。以下是 V8 特有的附註。請遵循 Blink Intent 流程，除非附註另有規定。

如果對於 JavaScript 特性有任何疑問，請發送電子郵件至 [syg@chromium.org](mailto:syg@chromium.org) 和 [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com)。

對於 WebAssembly 特性，請發送電子郵件至 [gdeepti@chromium.org](mailto:gdeepti@chromium.org) 和 [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com)。

## 附註

### JavaScript 特性通常等待至 Stage 3 以上

通常，V8 會等到 JavaScript 特性提案在 [TC39 的 Stage 3 或更高階段](https://tc39.es/process-document/)才能進行實作。TC39 有其自身的共識流程，而 Stage 3 或更高階段表明 TC39 代表（包括所有瀏覽器供應商）已達成特性提案可供實作的明確共識。此外部共識流程意味著 Stage 3+ 特性不需要發送 Intent 電子郵件，除了 Intent to Ship。

### TAG 審查

對於較小的 JavaScript 或 WebAssembly 特性，通常不需要進行 TAG 審查，因為 TC39 和 Wasm CG 已提供顯著的技術監督。如果特性較大或影響面廣泛（例如需要修改其他 Web 平台 API 或改動 Chromium），則建議進行 TAG 審查。

### 需要同時使用 V8 和 blink flags

在實作特性時，需要同時使用 V8 flag 和 blink `base::Feature`。

Blink 特性是必須的，這樣 Chrome 就可以在緊急情況下關閉特性而不需分發新二進制檔案。這通常在以下文件中執行：[`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h)、[`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc)、以及 [`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc)。

### 上線前需進行模糊測試

JavaScript 和 WebAssembly 特性必須進行至少 4 週的模糊測試，或一（1）個版本里程碑周期，並修復所有模糊測試中的錯誤，才能上線。

對於完成代碼的 JavaScript 特性，透過將特性的 flag 移至 [`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h) 中的 `JAVASCRIPT_STAGED_FEATURES_BASE` 宏開始進行模糊測試。

對於 WebAssembly，請參考 [WebAssembly 上線檢查清單](/docs/wasm-shipping-checklist)。

### [Chromestatus](https://chromestatus.com/) 和審查門檻

Blink Intent 流程包括一系列的審查門檻，這些門檻必須在 [Chromestatus](https://chromestatus.com/) 中特性的條目上獲得批准，才能發送尋求 API OWNER 批准的 Intent to Ship。

這些門檻主要針對 Web API 量身定制，有些門檻可能不適用於 JavaScript 和 WebAssembly 特性。以下是一般指導。具體情況因特性而異，請勿盲目套用指導！

#### 隱私

大多數 JavaScript 和 WebAssembly 特性不會影響隱私。偶爾，某些特性可能增加新的指紋識別向量，揭露使用者操作系統或硬體的資訊。

#### 安全

雖然 JavaScript 和 WebAssembly 是許多安全漏洞攻擊的常見載體，但大多數新特性不會增加額外的攻擊面。進行 [模糊測試](#fuzzing) 是必要的，並能減少部分風險。

影響已知熱門攻擊向量（例如 JavaScript 中的 `ArrayBuffer`）的特性，以及可能啟用側信道攻擊的特性，需要額外審查並必須進行審核。

#### 企業

在 TC39 和 Wasm CG 的標準化流程中，JavaScript 和 WebAssembly 特性已經過嚴格的向下相容性審查。特性故意向下不相容的情況極為罕見。

對於 JavaScript，最近上線的特性也可以透過 `chrome://flags/#disable-javascript-harmony-shipping` 進行停用。

#### 可調試性

JavaScript 和 WebAssembly 特性的可調試性因特性而異。僅添加新的內建方法的 JavaScript 特性不需要額外的調試器支援，而添加新功能的 WebAssembly 特性可能需要大量額外的調試器支援。

更多詳情請參閱 [JavaScript 特性調試檢查清單](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9) 和 [WebAssembly 特性調試檢查清單](https://goo.gle/devtools-wasm-checklist)。

有懷疑時，此門適用。

#### 測試

與其使用 WPT，Test262 測試對於 JavaScript 特性而言已足夠，而 WebAssembly 規範測試對於 WebAssembly 特性而言亦已足夠。

不需要添加 Web 平台測試 (WPT)，因為 JavaScript 和 WebAssembly 語言特性有其各自的互通測試庫，由多個實作運行。不過如果您認為有益，請隨意添加一些。

對於 JavaScript 特性，要求在 [Test262](https://github.com/tc39/test262) 中進行明確的正確性測試。請注意，[臨時目錄](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging)中的測試已足夠。

對於 WebAssembly 特性，要求在 [WebAssembly 規範測試庫](https://github.com/WebAssembly/spec/tree/master/test) 中進行明確的正確性測試。

至於性能測試，JavaScript 已經構成大多數現有性能基準測試（如 Speedometer）的基礎。

### CC 給誰

**每封** “意圖 `某事`” 的郵件（例如“意圖實作”）都應 CC 至 [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com)，同時也 CC 至 [blink-dev@chromium.org](mailto:blink-dev@chromium.org)。這樣，其他 V8 的嵌入者也能保持同步。

### 規範庫的連結

Blink 意圖流程要求有一個解釋器。與其撰寫新文檔，您可以選擇直接鏈接到相應的規範庫（例如 [`import.meta`](https://github.com/tc39/proposal-import-meta)）。
