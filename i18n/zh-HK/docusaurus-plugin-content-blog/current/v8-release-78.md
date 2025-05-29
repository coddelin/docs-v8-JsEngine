---
title: "V8 發行版本 v7.8"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 懶惰的開發者"
avatars:
  - "ingvar-stepanyan"
date: 2019-09-27
tags:
  - release
description: "V8 v7.8 提供了預載流式編譯功能、WebAssembly C API、更快的對象解構及正則匹配，以及改進的啟動速度。"
tweet: "1177600702861971459"
---
每六週，我們會基於 [發佈流程](/docs/release-process) 創建一個新的 V8 分支。每個版本都是在 Chrome Beta 里程碑之前，直接從 V8 的 Git 主分支中生成。今天，我們很高興宣布最新的分支 [V8 版本 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8)，該版本目前處於 Beta 階段，並將在幾週後與 Chrome 78 穩定版本一起發布。V8 v7.8 包含了許多面向開發者的功能，本文章將提前預覽部分亮點。

<!--truncate-->
## JavaScript 性能（大小與速度）

### 預載時的腳本流式處理

您可能還記得 [V8 v7.5 的腳本流式處理工作](/blog/v8-release-75#script-streaming-directly-from-network)，我們改進了背景編譯以直接從網絡讀取數據。在 Chrome 78 中，我們新增了預載期間的腳本流式處理功能。

之前，腳本流式處理是在 HTML 解析期間遇到 `<script>` 標籤時才開始，而解析會在編譯完成後暫停（針對普通腳本）或者腳本完成編譯後才執行（針對異步腳本）。這意味著對於像這樣的普通同步腳本：

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

…管線以前大致如下所示：

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

由於同步腳本可以使用 `document.write()`，當我們看到 `<script>` 標籤時，必須暫停 HTML 的解析。由於編譯是在 `<script>` 標籤出現時開始的，HTML 的解析與實際運行腳本之間存在一個大的間隙，期間無法繼續加載頁面。

不過，我們 _也_ 在早期階段遇到 `<script>` 標籤，這時會掃描 HTML 並尋找需要預載的資源，因此管線實際上更像這樣：

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

合理推測，如果我們預載了一個 JavaScript 文件，我們最終是想執行它的。因此，從 Chrome 76 開始，我們一直在試驗預載流式處理，其中加載腳本時也開始進行編譯。

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

更棒的是，由於我們可以在腳本完成加載之前開始編譯，因此預載流式處理的管線實際上看起來更像這樣：

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

這意味著，在某些情況下，我們可以將顯式編譯時間（`<script>` 標籤被看到到腳本開始執行之間的間隙）減少到零。在我們的實驗中，顯式編譯時間平均下降了 5–20%。

最好的是，得益於我們的實驗基礎設施，我們不僅在 Chrome 78 中默認啟用了此功能，還為 Chrome 76 及其後的版本用戶打開了這一功能。

### 更快的對象解構

對象解構的形式…

```js
const {x, y} = object;
```

…幾乎相當於糖衣語法的形式...

```js
const x = object.x;
const y = object.y;
```

…只是它還需要在 `object` 是 `undefined` 或 `null` 的情況下拋出特定錯誤....

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Cannot destructure property `x` of 'undefined' or 'null'.
const object = undefined; const {x, y} = object;
                                 ^
```

…而不是當嘗試對 `undefined` 進行解引用時會出現的正常錯誤：

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Cannot read property 'x' of undefined
const object = undefined; object.x
                                 ^
```

這個額外的檢查使得解構比簡單的變量賦值更慢，正如 [Twitter 上報告的那樣](https://twitter.com/mkubilayk/status/1166360933087752197)。

從 V8 v7.8 開始，對象解構 **與** 等效的糖衣變量賦值一樣快（事實上，這兩者生成的字節碼是相同的）。現在，代替明確的 `undefined`/`null` 檢查，我們依賴於在加載 `object.x` 時拋出異常，並且如果異常是解構導致的，我們會捕獲該異常。

### 緩慢的源位置

從 JavaScript 編譯字節碼時，會生成源位置表，將字節碼序列與源代碼中的字符位置聯繫起來。然而，這些信息僅在符號化異常或進行開發者任務（如調試和性能分析）時使用，因此大多數情況下會浪費內存。

為了避免這種情況，我們現在在編譯字節碼時不收集源位置（假設沒有調試器或分析器附加）。只有在實際生成堆棧追踪時，才會收集源位置，例如在調用 `Error.stack` 或將異常的堆棧追踪打印到控制台時。這確實會產生一些成本，因為生成源位置需要重新解析和編譯該函數，然而大多數網站在生產環境中並不會符號化堆棧追踪，因此不會看到任何可觀察的性能影響。在我們的實驗室測試中，我們觀察到 V8 的內存使用量減少了1-2.5%。

![通過延遲收集源位置節省記憶體，在 AndroidGo 設備上的效果](/_img/v8-release-78/memory-savings.svg)

### 更快的正則表達式匹配失敗

通常，正則表達式通過向前遍歷輸入字符串並從每個位置開始檢查匹配來嘗試找到匹配。一旦該位置接近字符串末端且不可能有匹配，V8 現在（在大多數情況下）停止嘗試找到新匹配的可能起點，而是快速返回匹配失敗。此優化適用於已編譯和已解釋的正則表達式，並在無法找到匹配的情況較為常見且成功匹配的最小長度相對於平均輸入字符串長度較大的工作負載中產生加速效果。

在 JetStream 2 中的 UniPoker 測試中，該工作啟發了此改進，V8 v7.8 在所有迭代平均分數上提高了20%。

## WebAssembly

### WebAssembly C/C++ API

從 v7.8 開始，V8 的 [Wasm C/C++ API](https://github.com/WebAssembly/wasm-c-api) 實現從試驗性狀態進階到正式支持狀態。它允許您在 C/C++應用中使用 V8 的特別構建作為 WebAssembly 執行引擎，不涉及 JavaScript！有關詳細信息和說明，請參閱[文檔](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit)。

### 改善啟動時間

從 WebAssembly 調用 JavaScript 函數或從 JavaScript 調用 WebAssembly 函數涉及執行一些包裝代碼，負責將函數的參數從一種表示轉換到另一種表示。生成這些包裝器可能非常耗費資源：在 [Epic ZenGarden 演示](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html) 中，包裝器的編譯佔用了啟動模組時間（編譯 + 實例化）的約20%（在一台18核心 Xeon 機器上）。

在此版本中，我們通過在多核機器上更好地利用後台線程改善了此情況。我們依賴於最近的 [函數編譯擴展](/blog/v8-release-77#wasm-compilation) 的努力，並將包裝器編譯集成到這個新的異步管線中。在相同的機器上，現在包裝器編譯只佔 Epic ZenGarden 演示啟動時間的約8%。

## V8 API

請使用 `git log branch-heads/7.7..branch-heads/7.8 include/v8.h` 查看 API 更改列表。

擁有[活躍 V8 項目檢出](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 7.8 -t branch-heads/7.8` 來試驗 V8 v7.8 的新功能。或者，您可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並很快親自試用這些新功能。
