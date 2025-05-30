---
title: "2019年JavaScript的成本"
author: "Addy Osmani（[@addyosmani](https://twitter.com/addyosmani)），JavaScript清道夫，與Mathias Bynens（[@mathias](https://twitter.com/mathias)），主線程解放者"
avatars: 
  - "addy-osmani"
  - "mathias-bynens"
date: 2019-06-25
tags: 
  - internals
  - parsing
description: "處理JavaScript的主要成本是下載和CPU執行時間。"
tweet: "1143531042361487360"
---
:::note
**注意:** 如果你比較喜歡觀看演講而非閱讀文章，請欣賞以下影片！如果不是，跳過影片繼續閱讀。
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/X9eRLElSW1c" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=X9eRLElSW1c">“JavaScript的成本”</a> 由Addy Osmani在2019年的#PerfMatters大會中演講。</figcaption>
</figure>

<!--truncate-->
近幾年來，[JavaScript的成本](https://medium.com/@addyosmani/the-cost-of-javascript-in-2018-7d8950fbb5d4)發生了一個重大變化，即瀏覽器解析和編譯腳本速度的改善。在**2019年，處理腳本的主要成本現在是下載和CPU執行時間。**

如果瀏覽器的主線程忙於執行JavaScript，則用戶交互可能會被延遲，因此優化腳本執行時間和網絡瓶頸可能會產生影響。

## 可操作的高層次指南

這對Web開發者意味著什麼？解析和編譯成本**不再像我們曾經認為的那麼慢**。對於JavaScript包需要關注的三件事是：

- **提高下載速度**
    - 保持你的JavaScript包體積小，尤其是針對移動設備。小的包體積能提高下載速度、降低內存使用，並減少CPU成本。
    - 避免只有單一的巨大包；如果包超過大約50–100 kB，將它拆分成多個小包。（使用HTTP/2多路複用，多個請求和響應消息可以同時進行，減少額外請求的開銷。）
    - 在移動端，你需要更加減少傳送的內容，特別是因為網絡速度問題，但也要保持內存使用量低。
- **提高執行速度**
    - 避免[長時間任務](https://w3c.github.io/longtasks/)占用主線程，推遲頁面變得可交互的時間。下載後，腳本執行時間現在是主要成本。
- **避免大的內聯腳本**（因為它們仍然在主線程中被解析和編譯）。一個好的經驗法則是：如果腳本超過1 kB，避免將它內聯（此外1 kB也是[代碼緩存](/blog/code-caching-for-devs)對外置腳本啟動的大小）。

## 為什麼下載和執行時間重要？

為什麼優化下載和執行時間很重要？下載時間對低端網絡至關重要。儘管4G（甚至5G）在全球範圍內的增長，我們的[有效連接類型](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType)仍然不穩定，許多人在外出時會遇到類似3G（甚至更糟）的速度。

JavaScript執行時間對於處理器速度較慢的手機很重要。由於CPU、GPU和熱節流的區別，高端和低端手機的性能存在巨大差距。這對JavaScript性能很重要，因為執行是受CPU限制的。

事實上，在像Chrome這樣的瀏覽器中，頁面加載所花費的總時間中，最高可達30%的時間用於JavaScript執行。以下是具有典型工作負載的網站（Reddit.com）在高端桌面機器上的頁面加載情況：

![JavaScript處理占頁面加載期間在V8中所花費時間的10–30%。](/_img/cost-of-javascript-2019/reddit-js-processing.svg)

在移動端，普通手機（Moto G4）執行Reddit的JavaScript的時間比高端設備（Pixel 3）要長3–4倍，而在低端設備（&lt;$100的Alcatel 1X）上則要長6倍以上：

![不同設備類別（低端、中端和高端）執行Reddit JavaScript的成本](/_img/cost-of-javascript-2019/reddit-js-processing-devices.svg)

:::note
**注意:** Reddit在桌面和移動端具有不同的體驗，因此MacBook Pro的結果無法與其他結果進行比較。
:::

當您嘗試優化 JavaScript 執行時間時，請留意可能長時間壟斷 UI 執行緒的[長任務](https://web.dev/long-tasks-devtools/)。即使頁面在視覺上看起來已就緒，這些都可能阻止關鍵任務的執行。將它們分解為較小的任務。通過拆分代碼並優先排序加載順序，您可以更快地使頁面變得可交互，並希望降低輸入延遲。

![長任務壟斷主執行緒。您應該將它們分解。](/_img/cost-of-javascript-2019/long-tasks.png)

## V8 為提高解析/編譯做了什麼改進？

自 Chrome 60 起，V8 的原始 JavaScript 解析速度已提高 2 倍。同時，由於 Chrome 中其他並行化優化工作，原始解析（和編譯）成本也變得不那麼明顯/重要。

V8 通過在工作執行緒上進行解析和編譯，將主執行緒上的解析和編譯工作量平均減少了 40%（例如在 Facebook 減少 46%，Pinterest 減少 62%），最高的改進為 81%（YouTube）。這是在已有的非主執行緒流式解析/編譯所做工作之外的改進。

![不同版本上的 V8 解析時間](/_img/cost-of-javascript-2019/chrome-js-parse-times.svg)

我們還可以可視化這些改變在不同版本的 V8 上對 CPU 時間的影響。在 Chrome 61 解析 Facebook 的 JavaScript 所用的同一時間內，Chrome 75 現在還可以解析 Facebook 的 JavaScript 和 Twitter 的 JavaScript 6 次。

![在 Chrome 61 解析 Facebook 的 JS 所用的時間內，Chrome 75 現在能解析 Facebook 的 JS 和 Twitter 的 JS 6 次。](/_img/cost-of-javascript-2019/js-parse-times-websites.svg)

讓我們來深入了解這些改變是如何實現的。簡而言之，腳本資源可以流式解析並在工作執行緒上編譯，即：

- V8 可以在不阻塞主執行緒的情況下解析+編譯 JavaScript。
- 流式運行在完整的 HTML 解析器遇到 `<script>` 標籤後開始。對於會阻塞解析的腳本，HTML 解析器會暫停，而對於異步腳本它則繼續運行。
- 對於大多數現實中的連接速度，V8 的解析速度比下載速度更快，因此 V8 在最後一個腳本字節被下載後幾毫秒內完成解析+編譯。

稍微深入一些的解釋是… 更早版本的 Chrome 會完全下載腳本後才開始解析，這是一種直觀的方法，但不能充分利用 CPU。在 41 至 68 版本之間，Chrome 開始在下載腳本開始時即刻解析異步和延遲腳本，並在單獨的執行緒上進行。

![腳本以多個塊的形式到達。一旦看到至少 30 kB，V8 就開始流式解析。](/_img/cost-of-javascript-2019/script-streaming-1.svg)

在 Chrome 71，我們改用了基於任務的設置，調度器可以同時解析多個異步/延遲腳本。此改變的影響是主執行緒解析時間減少約 20%，在實際網站測量中，總體上的 TTI/FID 改善幅度約為 2%。

![Chrome 71 改用了基於任務的設置，調度器可以同時解析多個異步/延遲腳本。](/_img/cost-of-javascript-2019/script-streaming-2.svg)

在 Chrome 72，我們切換為使用流式作為主要解析方式：現在普通的同步腳本也以此方式解析（不包括內嵌腳本）。此外，我們停止在主執行緒需要時取消基於任務的解析，因為這只會不必要地重複已完成的工作。

[以前的 Chrome 版本](/blog/v8-release-75#script-streaming-directly-from-network) 支持流式解析和編譯，其中來自網絡的腳本源數據必須先進入 Chrome 的主執行緒，然後才會被轉發到流處理器。

這通常導致流式解析器需要等待來自網絡但尚未被轉發到流任務的數據，而這些數據可能被主執行緒上的其他工作（例如 HTML 解析、佈局或 JavaScript 執行）阻塞。

我們目前正在嘗試在預加載時開始解析，而主執行緒跳轉之前是此計劃的阻礙因素。

Leszek Swirski 的 BlinkOn 演講提供了更多詳細信息：

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/D1UJgiG4_NI" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=D1UJgiG4_NI">“0*時間內解析 JavaScript”</a>由 Leszek Swirski 在 BlinkOn 10 上展示。</figcaption>
</figure>

## 這些改變如何體現於您在開發者工具中所看到的？

除了以上之外，開發者工具中還有[一個問題](https://bugs.chromium.org/p/chromium/issues/detail?id=939275)，其以完全阻塞方式顯示整個解析器任務，暗示它在使用 CPU。然而，當解析器缺乏主執行緒上的數據時，它會阻塞。自從我們從單一流處理器執行緒移至流式任務後，這一點變得非常顯而易見。以下是 Chrome 69 中的顯示方式：

![開發者工具的問題，以完全阻塞的方式顯示整個解析器任務，暗示它在使用 CPU](/_img/cost-of-javascript-2019/devtools-69.png)

“解析腳本”任務顯示耗時 1.08 秒。然而，解析 JavaScript 並沒有那麼慢！大部分時間只是在主線程上等待數據傳輸。

Chrome 76 呈現了不同的情況：

![在 Chrome 76 中，解析被分解為多個較小的流式任務。](/_img/cost-of-javascript-2019/devtools-76.png)

一般來說，DevTools 性能面板非常適合對頁面上發生的事情進行高層次的概覽。如果需要 JavaScript 解析和編譯時間等 V8 特定的詳細指標，我們建議使用 [帶有運行時調用統計 (RCS) 的 Chrome Tracing](/docs/rcs)。在 RCS 結果中，`Parse-Background` 和 `Compile-Background` 告訴您在主線程外解析和編譯 JavaScript 所花費的時間，而 `Parse` 和 `Compile` 則捕捉主線程的指標。

![](/_img/cost-of-javascript-2019/rcs.png)

## 這些變化在現實中的影響是什麼？

讓我們看看一些現實世界的網站以及腳本流式處理的應用情況。

![在 MacBook Pro 上，主線程 vs 工作線程解析和編譯 Reddit 的 JavaScript 所花費的時間](/_img/cost-of-javascript-2019/reddit-main-thread.svg)

Reddit.com 有幾個超過 100 kB 的包裹，這些包裹被外層函數包裹，導致主線程上有許多 [延遲編譯](/blog/preparser)。在上圖中，主線程時間是最重要的，因為主線程工作繁忙會延遲交互。Reddit 大部分時間都在主線程上執行，對工作/背景線程的使用極少。

他們可以通過把一些較大的包分解為較小的包（例如，每個 50 kB）並去掉包裹，來最大程度地實現並行化 — 這樣每個包可以分別進行流式解析和編譯，並減少啟動期間主線程解析/編譯的時間。

![在 MacBook Pro 上，主線程 vs 工作線程解析和編譯 Facebook 的 JavaScript 所花費的時間](/_img/cost-of-javascript-2019/facebook-main-thread.svg)

我們還可以看看像 Facebook.com 這樣的網站。Facebook 加載了約 6MB 的壓縮 JS，分佈在約 292 個請求中，其中有些是異步的，有些是預加載的，有些是以較低優先級加載的。他們的許多腳本都很小且顆粒化 — 這有助於背景/工作線程的整體並行化，因為這些較小的腳本可以同時進行流式解析/編譯。

值得注意的是，您可能不是 Facebook，並可能沒有像 Facebook 或 Gmail 這樣長壽命的應用程序，因此在桌面上這麼多腳本可能並不合理。然而，通常情況下，保持包的粗粒度並只加載您真正需要的內容。

儘管大多數 JavaScript 解析和編譯工作可以在背景線程上以流式方式進行，但仍有一些工作必須在主線程上完成。當主線程繁忙時，頁面無法響應用戶輸入。請密切關注代碼下載和執行對用戶體驗的影響。

:::note
**注意：** 目前，並非所有的 JavaScript 引擎和瀏覽器都實現了腳本流式處理作為加載優化。我們仍然相信這裡的整體指導對於良好的用戶體驗是有幫助的。
:::

## 解析 JSON 的成本

由於 JSON 語法比 JavaScript 語法簡單得多，因此 JSON 的解析效率比 JavaScript 高。這一知識可以用來改善發送大型類 JSON 配置對象字面量的 Web 應用的啟動性能（例如內嵌 Redux 存儲）。與其像下面這樣內嵌數據為 JavaScript 對象字面量：

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…更好地以 JSON 字符串化的形式表示，並在運行時進行 JSON 解析：

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

只要 JSON 字符串只評估一次，`JSON.parse` 方法相比 JavaScript 對象字面量[快得多](https://github.com/GoogleChromeLabs/json-parse-benchmark)，尤其是在冷啟動時。一個良好的經驗法則是，對 10 kB 或更大的對象應用此技術 — 但正如所有性能建議所言，在進行更改之前，測量實際影響。

![與等價的 JavaScript 字面量相比，`JSON.parse('…')` 在解析、編譯和執行方面[快得多](https://github.com/GoogleChromeLabs/json-parse-benchmark) — 不僅在 V8 上（快 1.7 倍），在所有主流 JavaScript 引擎上也是如此。](/_img/cost-of-javascript-2019/json.svg)

下面這段視頻深入介紹了性能差異的來源，從 02:10 開始。

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/ff4fgQxPaO0?start=130" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=ff4fgQxPaO0">“借助 <code>JSON.parse</code> 實現更快的應用程序”</a>，由 Mathias Bynens 在 #ChromeDevSummit 2019 演講。</figcaption>
</figure>

參閱[我們的 _JSON ⊂ ECMAScript_ 功能說明](/features/subsume-json#embedding-json-parse)，其提供了一個範例實作，它可根據任意物件產生有效的 JavaScript 程式來執行 `JSON.parse`。

使用純物件文字表示大量數據時，存在額外的風險：它們可能會被解析 _兩次_！

1. 第一次解析發生在文字表示被預解析時。
2. 第二次解析發生在文字表示被懶解析時。

第一次解析無法避免。但幸運的是，第二次解析可以通過將物件文字放置在頂層或位於[PIFE](/blog/preparser#pife)中來避免。

## 重複訪問時的解析/編譯如何處理？

V8 的 (字節)碼快取優化可以幫助解決問題。當第一次請求腳本時，Chrome 下載它並將其交給 V8 編譯，同時將該檔案存儲在瀏覽器的磁碟快取中。當第二次請求 JS 檔案時，Chrome 從瀏覽器快取中取出文件並再次交給 V8 編譯。然而，此次已編譯的代碼會被序列化，並作為元數據附加到快取的腳本文件中。

![V8 中代碼快取工作的可視化](/_img/cost-of-javascript-2019/code-caching.png)

第三次請求時，Chrome 從快取中取出檔案及其元數據，並將兩者交給 V8。V8 序列化元數據並可跳過編譯。如果前兩次訪問發生在 72 小時內，代碼快取會啟動。Chrome 當使用服務工作者快取腳本時，也有積極代碼快取功能。您可以在[網頁開發人員的代碼快取](/blog/code-caching-for-devs)中了解更多資訊。

## 結論

下載和執行時間是 2019 年載入脚本的主要瓶頸。針對頁面首屏內容使用小型同步（內嵌）腳本包，並配合一個或多個延遲腳本，用於頁面的其餘內容。分解大型包以僅傳遞用戶需要的代碼，且在需要時傳遞，這最大限度提高了 V8 的並行化。

在移動設備上，由於網絡、內存消耗和較慢 CPU 的執行時間，您需要傳遞更少的腳本。通過平衡延遲與可快取性，最大化離主執行緒解析和編譯工作的進行。

## 延伸閱讀

- [極速解析，第 1 部分：優化掃描器](/blog/scanner)
- [極速解析，第 2 部分：懶解析](/blog/preparser)
