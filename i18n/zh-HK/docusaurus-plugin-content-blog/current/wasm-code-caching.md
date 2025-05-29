---
title: "WebAssembly 開發人員的程式碼快取"
author: "[比爾·巴奇 (Bill Budge)](https://twitter.com/billb)，在快取中放入 Ca-ching!"
avatars:
  - bill-budge
date: 2019-06-17
tags:
  - WebAssembly
  - internals
description: "本文解釋了 Chrome 的 WebAssembly 程式碼快取，並說明開發人員如何利用它來加速載入大型 WebAssembly 模組的應用程式。"
tweet: "1140631433532334081"
---
有句開發人員中的諺語叫做：最快的程式碼是不需要執行的程式碼。同樣，最快編譯的程式碼是不需要編譯的程式碼。WebAssembly 程式碼快取是 Chrome 和 V8 中的一項新優化，試圖通過快取編譯器生成的原生程式碼來避免程式碼編譯。我們之前曾[寫過](/blog/code-caching) [探討過](/blog/improved-code-caching) [如何](/blog/code-caching-for-devs) 總結 Chrome 和 V8 快取 JavaScript 程式碼的方式，以及如何利用這項優化的最佳實踐。在本文中，我們將描述 Chrome 的 WebAssembly 程式碼快取的運作方式，以及開發人員如何利用它來加速大型 WebAssembly 模組的應用程式載入。

<!--truncate-->
## WebAssembly 編譯重點回顧

WebAssembly 是在網頁上運行非 JavaScript 程式碼的一種方式。網頁應用可以通過載入 `.wasm` 資源使用 WebAssembly，該資源包含其他編程語言（如 C、C++ 或 Rust 等）部分編譯後的程式碼（未來還會有更多）。WebAssembly 編譯器的工作是解碼 `.wasm` 資源，驗證其格式是否正確，然後將其編譯為用戶機器可以執行的原生機器程式碼。

V8 擁有兩個 WebAssembly 編譯器：Liftoff 和 TurboFan。[Liftoff](/blog/liftoff) 是基線編譯器，旨在儘可能快地編譯模組，以便儘早開始執行。而 TurboFan 是 V8 的 JavaScript 和 WebAssembly 優化編譯器，旨在背景執行以生成高質量的原生程式碼，從而在長期內為網頁應用提供最佳性能。針對大型 WebAssembly 模組，TurboFan 完成將 WebAssembly 模組編譯為原生程式碼可能需要相當長的時間 —— 30 秒到一分鐘甚至更久。

這時程式碼快取就派上用場了。一旦 TurboFan 完成大型 WebAssembly 模組的編譯，Chrome 可以將編譯的程式碼儲存到快取中，這樣在下次載入模組時，可以跳過 Liftoff 和 TurboFan 的編譯過程，導致更快的啟動速度和更低的功耗 —— 編譯程式碼非常耗 CPU。

WebAssembly 程式碼快取使用 Chrome 用於 JavaScript 程式碼快取的相同機制。我們使用相同類型的儲存機制，以及相同的雙鍵快取技術，按照[網站隔離](https://developers.google.com/web/updates/2018/07/site-isolation)的要求，將不同來源編譯的程式碼相隔離，這是一個重要的 Chrome 安全功能。

## WebAssembly 程式碼快取的演算法

目前，WebAssembly 快取僅於串流 API 呼叫 `compileStreaming` 和 `instantiateStreaming` 中實現。這些操作基於 HTTP 抓取 `.wasm` 資源，便於使用 Chrome 的資源抓取和快取機制，同時提供了方便的資源 URL，可用作識別 WebAssembly 模組的鍵。快取演算法的工作方式如下：

1. 當 `.wasm` 資源首次請求（即 _冷運行_）時，Chrome 從網絡下載並將其串流至 V8 進行編譯。Chrome 同時將 `.wasm` 資源儲存到瀏覽器的資源快取中，快取存儲於用戶設備的文件系統中。該資源快取使得 Chrome 在下次需要資源時能更快載入。
1. 當 TurboFan 完全完成模組編譯，並且 `.wasm` 資源足夠大時（目前為 128 kB），Chrome 將已編譯的程式碼寫入 WebAssembly 程式碼快取。該程式碼快取在物理上與步驟 1 中的資源快取分開。
1. 當 `.wasm` 資源第二次請求（即 _熱運行_）時，Chrome 從資源快取載入 `.wasm` 資源，同時查詢程式碼快取。如果有快取命中，則將編譯模組位元組傳輸至渲染進程並傳遞給 V8，V8 將反序列化程式碼，而不是重新編譯模組。反序列化比編譯更快且更少消耗 CPU 資源。
1. 快取的程式碼可能已不再有效。這可能發生是因為 `.wasm` 資源發生了改變，或者因為 V8 變更了 —— 預期至少每 6 週發生一次，因為 Chrome 的快速發布週期。在此情況下，快取的原生程式碼將從快取中清除，並按第 1 步繼續編譯。

基於以上描述，我們可以提供一些建議，幫助改善網站對 WebAssembly 程式碼快取的使用。

## 提示 1：使用 WebAssembly 串流 API

由於程式碼快取僅適用於串流 API，因此請使用 `compileStreaming` 或 `instantiateStreaming` 來編譯或實例化您的 WebAssembly 模組，如以下 JavaScript 程式碼片段所示：

```js
(async () => {
  const fetchPromise = fetch('fibonacci.wasm');
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();
```

這篇[文章](https://developers.google.com/web/updates/2018/04/loading-wasm)詳細說明了使用 WebAssembly 串流 API 的優勢。Emscripten 預設嘗試使用此 API 來為您的應用程式產生載入程式碼。需要注意的是，串流要求 `.wasm` 資源必須擁有正確的 MIME 類型，因此伺服器必須在響應中傳送 `Content-Type: application/wasm` 標頭。

## 提示 2：提高快取友好性

由於程式碼快取取決於資源 URL 和 `.wasm` 資源是否是最新的，開發者應該盡量保持二者穩定。如果 `.wasm` 資源是從不同的 URL 獲取的，那麼會被視為不同資源，V8 必須重新編譯模組。同樣，如果資源快取中的 `.wasm` 資源不再有效，那麼 Chrome 必須丟棄任何快取的程式碼。

### 保持程式碼穩定

每當您發布新的 WebAssembly 模組時，必須完全重新編譯。僅在必要時發布程式碼的新版本以提供新功能或修復錯誤。如果您的程式碼未更改，請告知 Chrome。當瀏覽器對資源 URL（例如 WebAssembly 模組）發出 HTTP 請求時，它會包含該 URL 上次抓取的日期和時間。如果伺服器知道檔案未更改，它可以返回 `304 Not Modified` 響應，這表示 Chrome 和 V8 已快取的資源和程式碼仍然有效。另一方面，返回 `200 OK` 響應會更新快取的 `.wasm` 資源並使程式碼快取失效，將 WebAssembly 恢復為冷啟動狀態。請遵循[網站資源最佳實踐](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)，透過響應告訴瀏覽器 `.wasm` 資源是否可快取、預期有效時間或最後修改時間。

### 不要更改程式碼的 URL

快取的已編譯程式碼與 `.wasm` 資源的 URL 相關聯，使其能夠輕鬆查找而無需掃描實際資源。這意味著更改資源的 URL（包括任何查詢參數）會在資源快取中建立一個新的入口，這也需要完全重新編譯並創建新的程式碼快取入口。

### 選擇大尺寸（但不要太大！）

WebAssembly 程式碼快取的主要啟發原則是 `.wasm` 資源的大小。如果 `.wasm` 資源小於某個閾值大小，我們不會快取編譯的模組位元組。其原因是 V8 可以非常快速地編譯小模組，甚至可能比從快取中載入編譯的程式碼還快。目前，閾值是 `.wasm` 資源大小超過 128 KB。

但更大的尺寸在某些情況下更好也有其限制。由於快取會占用使用者機器上的空間，Chrome 謹慎地不會消耗太多空間。當前，在桌面電腦上，程式碼快取通常存儲幾百 MB 的資料。由於 Chrome 的快取限制最大條目大小為總快取大小的一部分，因此編譯後的 WebAssembly 程式碼的進一步限制約為 150 MB（總快取大小的一半）。需要注意的是，編譯的模組通常比相應的 `.wasm` 資源大 5–7 倍，這是以典型桌面機器為基準。

此大小啟發原則以及快取行為可能會隨著我們決定對使用者和開發者最有效的策略而改變。

### 使用服務工作者

WebAssembly 程式碼快取已為工作者和服務工作者啟用，因此可以使用它們來加載、編譯並快取新的程式碼版本，讓下次應用啟動時可供使用。每個網站至少需要對 WebAssembly 模組進行一次完整編譯——使用工作者可隱藏此編譯過程，不讓使用者察覺。

## 追蹤

作為開發者，您可能需要檢查 Chrome 是否正在快取您編譯的模組。WebAssembly 程式碼快取事件預設未在 Chrome 開發者工具中公開，因此查明模組是否被快取的最佳方式是使用稍微底層的 `chrome://tracing` 特性。

`chrome://tracing` 會記錄特定時間段內 Chrome 的追踪痕跡。追踪會記錄整個瀏覽器的行為，包括其他標籤頁、窗口和擴展，因此最好在乾淨的使用者配置檔案中完成追踪，禁用擴展並關閉其他瀏覽器標籤頁：

```bash
# 開啟一個新的 Chrome 瀏覽器會話，使用乾淨的使用者設定檔並禁用擴充功能
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

移至 `chrome://tracing` 並點擊「記錄」以開始追蹤會話。在出現的對話框中，點擊「編輯類別」並在右側的「預設禁用分類」下勾選 `devtools.timeline` 類別（您可以取消選中任何其他預選擇的類別以減少收集的數據量）。然後點擊對話框中的「記錄」按鈕開始追蹤。

在另一個分頁加載或重新加載您的應用程式。讓它運行足夠長時間（10 秒或以上），以確保 TurboFan 編譯完成。完成後，點擊「停止」結束追蹤。一個事件的時間線視圖將出現。在追蹤窗口的右上角，有一個文本框，就在「查看選項」右邊。輸入 `v8.wasm` 以篩選掉非 WebAssembly 的事件。您應該看到以下一個或多個事件：

- `v8.wasm.streamFromResponseCallback` —— 通過 instantiateStreaming 傳遞的資源抓取接收了一個回應。
- `v8.wasm.compiledModule` —— TurboFan 完成了 `.wasm` 資源的編譯。
- `v8.wasm.cachedModule` —— Chrome 將編譯的模組寫入代碼緩存。
- `v8.wasm.moduleCacheHit` —— Chrome 在加載 `.wasm` 資源時從緩存中找到了代碼。
- `v8.wasm.moduleCacheInvalid` —— V8 無法反序列化緩存的代碼，因為它已過期。

在冷啟動時，我們期望看到 `v8.wasm.streamFromResponseCallback` 和 `v8.wasm.compiledModule` 事件。這表明 WebAssembly 模組已接收並成功編譯。如果未觀察到任何事件，請檢查您的 WebAssembly 流 API 調用是否正確。

在冷啟動之後，如果大小門檻值被超過，我們也期望看到 `v8.wasm.cachedModule` 事件，表示編譯的代碼已被送入緩存。有可能看到此事件但寫入未成功，目前無法觀察到此情況。但事件的元數據可以顯示代碼的大小。非常大的模組可能無法適應緩存。

當緩存正常工作時，一次熱啟動會產生兩個事件：`v8.wasm.streamFromResponseCallback` 和 `v8.wasm.moduleCacheHit`。這些事件的元數據允許您查看編譯代碼的大小。

有關使用 `chrome://tracing` 更多資訊，請參閱[我們的文章：開發者的 JavaScript（字節）代碼緩存](/blog/code-caching-for-devs)。

## 結論

對於大多數開發者來說，代碼緩存應該是“開箱即用”的。就像任何緩存一樣，它在條件穩定時效果最好。Chrome 的緩存啟發式可能會在不同版本間改變，但代碼緩存確實具有可以使用的行為，以及可以避免的限制。使用 `chrome://tracing` 的仔細分析可以幫助您調整和優化您的 Web 應用程序對於 WebAssembly 代碼緩存的使用。
