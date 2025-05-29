---
title: "WebAssembly JSPI 即將進入來源試驗"
description: "我們將解釋 JSPI 起始來源試驗的意義"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-03-06
tags:
  - WebAssembly
---
WebAssembly 的 JavaScript Promise Integration (JSPI) API 即將隨 Chrome M123 版本進入來源試驗。這意味著您可以測試您和您的用戶是否能從此新的 API 中受益。

JSPI 是一個 API，允許編譯成 WebAssembly 的所謂序列代碼訪問 _非同步_ 的 Web API。許多 Web API 是以 JavaScript `Promise` 為基礎設計的：它們並未立即執行請求的操作，而是返回一個 `Promise` 來完成操作。當操作最終完成時，瀏覽器的任務執行器會使用 Promise 調用任何回調。JSPI 透過鉤入這種架構來允許 WebAssembly 應用程式在返回 `Promise` 時暫停，並在 `Promise` 被解析後恢復。

<!--truncate-->
您可以在[此處](https://v8.dev/blog/jspi)了解有關 JSPI 的更多資訊以及如何使用它，其規範本身位於[此處](https://github.com/WebAssembly/js-promise-integration)。

## 要求

除了註冊來源試驗，您還需要生成相應的 WebAssembly 和 JavaScript。如果您使用 Emscripten，這將非常簡單。您應確保至少使用版本 3.1.47。

## 註冊來源試驗

JSPI 尚未正式發布；它目前正在進行標準化過程，直到該過程的第 4 阶段才能正式發布。欲今日使用，您可以在 Chrome 瀏覽器中設置一個標籤；或者，您可以申請一個來源試驗令牌，這樣您的用戶不需要自己設置標籤即可使用它。

您可以在[此處](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889)進行註冊，請確保遵循註冊流程。欲了解有關來源試驗的一般資訊，[此處](https://developer.chrome.com/docs/web-platform/origin-trials)是一個不錯的起點。

## 一些可能的注意事項

在 WebAssembly 社區中針對 JSPI API 的某些方面進行了一些[討論](https://github.com/WebAssembly/js-promise-integration/issues)。因此，有些變更已被提議，可能需要一些時間才能完全通過系統。我們預計這些變更將會*軟推出*：當變更可用時我們將分享它們，但現有 API 至少會維持到來源試驗結束。

此外，某些已知問題可能在來源試驗期間無法完全解決：

對於密集生成分支計算的應用程式，使用 JSPI 訪問非同步 API 的封裝序列性能可能受到影響。這是因為創建封裝調用時使用的資源在調用之間不會被緩存；我們依賴垃圾收集來清理創建的堆棧。
我們目前為每個封裝調用分配固定大小的堆棧。這些堆棧必須足夠大，以容納複雜的應用程式。然而，這也意味著一個有大量簡單封裝調用且正在進行中的應用程式可能會面臨內存壓力。

這兩個問題都不大可能妨礙對 JSPI 的試驗；我們期望它們在 JSPI 正式發布之前得到解決。

## 反饋

由於 JSPI 是一個標準化工作，我們希望任何問題和反饋都可以在[此處](https://github.com/WebAssembly/js-promise-integration/issues)分享。然而，Bug 報告可以在標準的 Chrome Bug 報告[網站](https://issues.chromium.org/new)提出。如果您懷疑代碼生成有問題，請使用[這個](https://github.com/emscripten-core/emscripten/issues)來報告問題。

最後，我們希望聽到您發現的任何好處。使用[問題追蹤器](https://github.com/WebAssembly/js-promise-integration/issues)分享您的經驗。
