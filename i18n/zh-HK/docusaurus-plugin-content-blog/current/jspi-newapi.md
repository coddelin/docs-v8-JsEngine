---
title: &apos;WebAssembly JSPI 引入了全新的 API&apos;
description: &apos;本文詳述了即將對 JavaScript Promise Integration (JSPI) API 做出的一些變更。&apos;
author: &apos;Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl&apos;
date: 2024-06-04
tags:
  - WebAssembly
---
WebAssembly 的 JavaScript Promise Integration (JSPI) API 引入了全新的 API，適用於 Chrome M126 版本。我們將討論這些變更內容、如何配合 Emscripten 使用，以及 JSPI 的發展路線圖。

JSPI 是一個 API，允許使用*同步* API 的 WebAssembly 應用程式訪問 *非同步* 的 Web API。許多 Web API 是基於 JavaScript `Promise` 對象設計的：它們不會立即執行請求的操作，而是返回一個 `Promise` 以執行操作。另一方面，許多編譯為 WebAssembly 的應用程式來自 C/C++ 界，這些程式通常使用會阻塞調用者直到完成的 API。

<!--truncate-->
JSPI 可以掛鉤到 Web 架構中，允許 WebAssembly 應用程式在返回 `Promise` 時被掛起，並在該 `Promise` 被解決後恢復執行。

你可以在[這篇部落格文章](https://v8.dev/blog/jspi)和[規範文件](https://github.com/WebAssembly/js-promise-integration)中了解有關 JSPI 以及如何使用它的更多資訊。

## 有哪些新變更？

### `Suspender` 對象的終結

2024 年 1 月，Wasm CG 的 Stacks 小組[投票](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md)修改 JSPI 的 API。具體來說，我們將不再使用明確的 `Suspender` 對象，而是使用 JavaScript/WebAssembly 邊界作為確定哪些計算被掛起的切點。

這一差異雖小但意義重大：當計算需要被掛起時，是最近一個調用已包裝的 WebAssembly 導出的方法決定了掛起的“切點”。

這意味著，使用 JSPI 的開發者對切點的控制會稍微減少。另一方面，不用顯式管理 `Suspender` 對象會使 API 更容易使用。

### 不再使用 `WebAssembly.Function`

API 的風格也有所變化。不再使用 `WebAssembly.Function` 構造函數來描述 JSPI 包裝器，而是提供了特定的函數和構造函數。

這一變更帶來了多個好處：

- 它移除了對[*類型反射*提案](https://github.com/WebAssembly/js-types)的依賴。
- 它簡化了對 JSPI 的工具化支持：新的 API 函數不再需要對 WebAssembly 函數類型進行顯式參考。

這種改變是基於不再顯式引用 `Suspender` 對象的決定而實現的。

### 返回而不掛起

第三個變更涉及掛起調用的行為。從掛起的導入調用 JavaScript 函數時，不再總是掛起，而是僅當 JavaScript 函數實際上返回 `Promise` 時掛起。

雖然這一改變似乎與 [W3C TAG 的建議](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises)相悖，但對 JSPI 使用者來說這是一種安全的優化。這是安全的，因為 JSPI 實際上扮演的是調用返回 `Promise` 函數的*調用者*角色。

這一改變對大多數應用程式的影響可能很小；然而，某些應用程式將通過避免不必要的瀏覽器事件循環而顯著受益。

### 新的 API

API 非常簡單：提供了一個函數，將從 WebAssembly 模組導出的函數轉換為返回 `Promise` 的函數：

```js
Function Webassembly.promising(Function wsFun)
```

注意，即使參數類型是 JavaScript 的 `Function`，實際上它僅限於 WebAssembly 函數。

在掛起方面，新增了一個 `WebAssembly.Suspending` 類以及一個將 JavaScript 函數作為參數的構造函數。在 WebIDL 中，這表示如下：

```js
interface Suspending{
  constructor (Function fun);
}
```

注意這個 API 有一種不對稱的感覺：有一個函數接受一個 WebAssembly 函數並返回一個具備掛起響應且返回 `Promise` 的新函數；而要標記一個掛起函數，你需要將其包裝在一個 `Suspending` 對象中。這反映了一個在底層發生的更深層的現實。

導入的掛起行為本質上是調用該導入的*調用*的一部分：即，實例化模組內的某個函數調用該導入並導致掛起。

另一方面，`promising` 函數接受一個常規 WebAssembly 函數並返回一個新的，能響應掛起並且返回 `Promise` 的函數。

### 使用新 API

如果您是 Emscripten 的使用者，那麼使用新 API 通常不需要對您的代碼進行任何更改。您必須使用至少是版本 3.1.61 的 Emscripten，並且您必須使用至少是版本 126.0.6478.17（Chrome M126）的 Chrome。

如果您正在自行整合，那麼您的代碼應該會顯著變得更簡單。特別是，不再需要撰寫用於存儲傳入的 `Suspender` 對象（並在調用導入時檢索它）的代碼。您可以直接在 WebAssembly 模組內使用常規的順序代碼。

### 舊 API

舊 API 將至少運行到 2024 年 10 月 29 日（Chrome M128）。在此之後，我們計劃移除舊 API。

請注意，Emscripten 本身將從版本 3.1.61 開始不再支持舊 API。

### 檢測您的瀏覽器中使用的是哪個 API

更改 API 不應被輕易決定。在此案例中我們能夠這樣做，因為 JSPI 本身仍然是臨時的。有一個簡單的方法可以測試您的瀏覽器啟用了哪個 API：

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

`oldAPI` 函數在您的瀏覽器啟用了舊的 JSPI API 時返回 true，而 `newAPI` 函數在啟用了新的 JSPI API 時返回 true。

## JSPI 的進展

### 實作層面

我們對 JSPI 工作的最大改變實際上對大多數程序員來說是不可見的：即所謂的可增長堆疊。

目前的 JSPI 實作是基於分配固定大小的堆疊事先完成的。事實上，所分配的堆疊相當大。這是因為我們必須能夠支援可能需要深層堆疊以正確處理遞迴的任意 WebAssembly 計算。

然而，這並不是一個可持續的策略：我們希望支持擁有數百萬個暫停協程的應用程式；如果每個堆疊大小為 1MB，這是不可能實現的。

可增長堆疊是指一種允許 WebAssembly 堆疊根據需要增長的堆疊分配策略。這樣，我們可以針對僅需要少量堆疊空間的應用程式使用非常小的堆疊，並在應用程式用盡空間時增長堆疊大小（亦稱堆疊溢出）。

有幾個潛在的技術可以用於實作可增長堆疊。我們正在研究的一種是分段堆疊。分段堆疊由一系列堆疊區段組成&mdash;每個區段都有固定大小，但不同的區段可能有不同的大小。

請注意，雖然我們可能正在解決協程的堆疊溢出問題，但我們不打算使主堆疊或中央堆疊變得可增長。因此，如果您的應用程式用盡了堆疊空間，可增長堆疊不會解決您的問題，除非您使用 JSPI。

### 標準化進程

截至發佈，目前有一個活躍的 [JSPI 的原點試驗](https://v8.dev/blog/jspi-ot)。新的 API 將在原點試驗剩餘期間啟動&mdash;隨 Chrome M126 一起提供。

舊的 API 在原點試驗期間也將可用；然而，計劃在 Chrome M128 之後不久就執行退役。

之後，JSPI 的主要重點將集中於標準化進程。截至發佈時，JSPI 正處於 W3C Wasm CG 流程的第 3 階段。下一步，也即是進入第 4 階段，標誌著 JSPI 作為 JavaScript 和 WebAssembly 生態系統標準 API 的關鍵採納。

我們希望知道您對這些 JSPI 變更的想法！參與討論請到 [W3C WebAssembly Community Group repo](https://github.com/WebAssembly/js-promise-integration)。
