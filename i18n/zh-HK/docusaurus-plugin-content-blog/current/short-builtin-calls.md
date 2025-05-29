---
title: '精簡內建函式呼叫'
author: '[Toon Verwaest](https://twitter.com/tverwaes), 縮短距離'
avatars:
  - toon-verwaest
date: 2021-05-06
tags:
  - JavaScript
description: '在 V8 v9.1 中，我們暫時在桌面端取消內建函式的嵌入，以避免由於遠距間接呼叫所帶來的效能問題。'
tweet: '1394267917013897216'
---

在 V8 v9.1 中，我們暫時取消在桌面端的[內建函式嵌入](https://v8.dev/blog/embedded-builtins)。雖然嵌入內建函式能顯著改善記憶體使用處理，我們發現嵌入函式與 JIT 編譯程式碼之間的函式呼叫可能帶來顯著的效能損失。此成本會依 CPU 的微架構而異。在本文中，我們會解釋為何這種情況會發生、效能表現如何，以及我們長期規劃的解決方案。

<!--truncate-->
## 程式碼配置

V8 的即時編譯器 (JIT) 產生的機器碼是在 VM 拿到的記憶體頁面上動態配置的。V8 在一個連續的位址空間區域中配置記憶體頁面，該區域本身要麼隨機位於記憶體某處 (基於 [位址空間隨機化佈局](https://en.wikipedia.org/wiki/Address_space_layout_randomization) 的原因)，要麼位於我們為 [指標壓縮](https://v8.dev/blog/pointer-compression) 而分配的一個 4-GiB 虛擬記憶體區籠中。

V8 JIT 的程式碼很常呼叫內建函式。內建函式本質上是作為 VM 一部分的機器碼片段。有些內建函式實現了完整的 JavaScript 標準庫函式，例如 [`Function.prototype.bind`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_objects/Function/bind)，但也有許多內建函式是介於 JS 高階語義與 CPU 低階功能之間的補助機器碼片段。例如，如果一個 JavaScript 函式想呼叫另一個 JavaScript 函式，通常會使用一個 `CallFunction` 的內建函式來確定目標 JavaScript 函式應如何被呼叫；即，是否為代理函式或普通函式，或需要多少參數等等。由於這些片段在我們建構 VM 時已經確定，因此它們被「嵌入」在 Chrome 二進位檔中，這意味著它們位於 Chrome 二進位檔程式碼區域內。

## 直接呼叫與間接呼叫

在 64 位架構上，包括這些內建函式的 Chrome 二進位檔與 JIT 程式碼之間的距離可能是任意的。根據 [x86-64](https://en.wikipedia.org/wiki/X86-64) 指令集的規範，我們無法使用直接呼叫：直接呼叫只能接受一個 32 位元的有號立即值作為呼叫的位址偏移，而目標可能超過 2 GiB 的距離。因此，我們需要依賴透過暫存器或記憶體操作元的間接呼叫。但這樣的呼叫更依賴預測，因為從呼叫指令本身無法立即得知呼叫的目標位址。而在 [ARM64](https://en.wikipedia.org/wiki/AArch64) 上，我們完全無法使用直接呼叫，因為範圍被限制在 128 MiB。因此，在這兩種情況下我們都依賴於 CPU 的間接分支預測的準確性。

## 間接分支預測的限制

針對 x86-64，我們希望能更依賴直接呼叫。這應該能減少間接分支預測帶來的負擔，因為在指令解碼後目標即已知，而且也不需要將目標從常量或記憶體加載到暫存器中。但這並不僅僅是機器碼中看到的明顯差異。

由於 [Spectre v2](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) 的影響，許多裝置/作業系統組合已經停用了間接分支預測。這意味著在這樣的組態中，我們在依賴 `CallFunction` 内建函式的 JIT 程式碼函式呼叫中會遇到相當昂貴的停滯。

更重要的是，雖然 64 位指令集架構（即「CPU 的高階語言」）支援遠距離位址的間接呼叫，但微架構可以自由地實作具有任意限制的最佳化。間接分支預測器似乎常見地推定呼叫距離不會超過某個距離（例如，4GiB），以便每次預測所需的記憶體更少。比如，[Intel 最佳化手冊](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf) 明確地指出：

> 對於 64 位應用程式來說，當分支的目標位於分支 4 GB 以外時，分支預測效能可能會受到負面影響。

在 ARM64 平臺上，直接調用的架構性調用範圍限制為 128 MiB，而[蘋果 M1](https://en.wikipedia.org/wiki/Apple_M1) 晶片的微架構間接調用預測範圍也有限制在 4 GiB。對於超過 4 GiB 的間接調用目標，幾乎總是出現預測錯誤。由於 M1 的[重新排序緩衝區](https://en.wikipedia.org/wiki/Re-order_buffer)特別大（這是 CPU 中允許未來預測指令進行投機性無序執行的組件），頻繁出現的預測錯誤會導致非常大的性能懲罰。

## 臨時解決方案：複製內建函式

為了避免頻繁預測錯誤的成本，並在 x86-64 平臺上儘可能地避免不必要地依賴分支預測，我們決定暫時將內建函式複製到 V8 的指針壓縮區域中，這僅限於內存足夠的桌面設備。這樣可以將複製的內建函式代碼放置在動態生成的代碼附近。性能結果高度依賴於設備配置，但以下是我們性能機器的一些結果：

![從實際頁面中記錄的瀏覽基準測試](/_img/short-builtin-calls/v8-browsing.svg)

![基準測試得分提升](/_img/short-builtin-calls/benchmarks.svg)

解除內建函式的嵌入會使受影響設備的每個 V8 實例內存使用量增加 1.2 至 1.4 MiB。作為更好的長期解決方案，我們正在研究將 JIT 代碼分配得更靠近 Chrome 二進位檔的可能性。這樣，我們可以重新嵌入內建函式以恢復內存效益，同時還可進一步提升從 V8 生成代碼到 C++ 代碼調用的性能。
