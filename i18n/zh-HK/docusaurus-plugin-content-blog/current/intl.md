---
title: "更快且功能更豐富的國際化 API"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: 2019-04-25 16:45:37
avatars:
  - "sathya-gunasekaran"
tags:
  - ECMAScript
  - Intl
description: "JavaScript 的國際化 API 正在擴展，其中 V8 的實現速度正在加快！"
tweet: "1121424877142122500"
---
[ECMAScript 國際化 API 規範](https://tc39.es/ecma402/) (ECMA-402 或 `Intl`) 提供了關鍵的區域特定功能，例如日期格式化、數字格式化、複數形式選擇和排序。Chrome V8 和 Google 國際化團隊合作為 V8 的 ECMA-402 實現添加功能，同時清理技術債務並改善效能和與其他瀏覽器的互操作性。

<!--truncate-->
## 底層架構改進

最初，ECMA-402 規範主要在使用 V8 擴展的 JavaScript 中實現，並不在 V8 程式碼庫內部。使用外部擴展 API 意味著 V8 的多個內部使用 API（包括類型檢查、外部 C++ 對象的生命週期管理以及內部私有數據存儲）無法被使用。作為改進啟動效能的一部分，這一實現後來被移動到 V8 程式碼庫內以啟用這些內建的 [快照](/blog/custom-startup-snapshots)。

V8 使用具備特殊 [形狀 (隱藏類)](https://mathiasbynens.be/notes/shapes-ics) 的 `JSObject` 來描述由 ECMAScript 指定的內建 JavaScript 對象（例如 `Promise`、`Map`、`Set` 等）。使用這種方法，V8 能預分配所需的內部槽數量並生成快速訪問，而不是每次只添加一個屬性，導致效能降低和內存使用增加。

`Intl` 的實現並沒有遵循這種類型的架構，這是由於歷史分裂的結果。相反，所有內建 JavaScript 對象（如 `NumberFormat` 和 `DateTimeFormat`）都是通用的 `JSObject`，必須通過多次屬性添加來過渡其內部槽。

缺乏專門的 `JSObject` 導致了一個額外問題：類型檢查變得更加複雜。類型資訊儲存在私有符號下，並且通過昂貴的屬性訪問來檢查類型，而不是直接檢查形狀。

### 現代化程式碼庫

隨著目前逐漸遠離在 V8 中編寫自托管內建程式碼，這次正好是現代化 ECMA402 實現的好時機。

### 遠離自托管 JavaScript

儘管自托管有助於簡潔和可讀性程式碼，頻繁使用慢速運行時調用來訪問 ICU API 導致了效能問題。因此，大量 ICU 功能被重複實現在 JavaScript 中以減少這些運行時呼叫的次數。

通過用 C++ 重寫內建函數，現在訪問 ICU API 變得更快，因為不再有運行時呼叫的開銷。

### 改善 ICU

ICU 是一套 C/C++ 庫，用於提供 Unicode 和全球化支持，被眾多應用程序使用，包括所有主要的 JavaScript 引擎。作為將 `Intl` 切換到 V8 中的 ICU 的一部分，我們[找到了](https://unicode-org.atlassian.net/browse/ICU-20140) [並](https://unicode-org.atlassian.net/browse/ICU-9562) [修復了](https://unicode-org.atlassian.net/browse/ICU-20098) 幾個 ICU 錯誤。

在實現新提案如 [`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat)、[`Intl.ListFormat`](/features/intl-listformat) 和 `Intl.Locale` 的過程中，我們通過新增[幾個](https://unicode-org.atlassian.net/browse/ICU-13256) [新](https://unicode-org.atlassian.net/browse/ICU-20121) [API](https://unicode-org.atlassian.net/browse/ICU-20342) 擴展了 ICU，以支持這些新的 ECMAScript 提案。

所有這些改進幫助其他 JavaScript 引擎更快實現這些提案，推動了 Web 的進展！例如，Firefox 正在基於我們的 ICU 工作開發多個新的 `Intl` API。

## 效能

通過這項工作，我們通過優化多個快速路徑和緩存各種 `Intl` 對象的初始化以及 `Number.prototype`、`Date.prototype` 和 `String.prototype` 上的 `toLocaleString` 方法，改善了國際化 API 的效能。

例如，創建新的 `Intl.NumberFormat` 對象的速度提高了約 24 倍。

![[微基準測試](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js) 測試創建各種 `Intl` 對象的效能](/_img/intl/performance.svg)

請注意，為了更好的效能，建議顯式創建*並重複使用* `Intl.NumberFormat` 或 `Intl.DateTimeFormat` 或 `Intl.Collator` 物件，而不是直接調用像 `toLocaleString` 或 `localeCompare` 這樣的方法。

## 新的 `Intl` 功能

所有這些工作為構建新功能提供了良好的基礎，而且我們正在繼續發布所有處於第三階段的國際化提案。

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) 已在 Chrome 71 中推出，[`Intl.ListFormat`](/features/intl-listformat) 已在 Chrome 72 中推出，[`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale) 已在 Chrome 74 中推出，而 [`Intl.DateTimeFormat` 的 `dateStyle` 和 `timeStyle` 選項](https://github.com/tc39/proposal-intl-datetime-style) 及 [`Intl.DateTimeFormat` 的 BigInt 支援](https://github.com/tc39/ecma402/pull/236) 也在 Chrome 76 中推出。[`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange)、[`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/) 和 [`Intl.NumberFormat` 的附加選項](https://github.com/tc39/proposal-unified-intl-numberformat/) 正在 V8 中開發，我們希望能很快發布它們！

其中許多新 API 和其他尚未推出的功能，都是因為我們致力於標準化新功能以幫助開發者進行國際化。[`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames) 是一個第一階段的提案，允許用戶本地化語言、地區或文字的顯示名稱。[`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange) 是一個第三階段的提案，規範了一種以簡潔且符合語言環境的方式格式化日期範圍的方法。[統一的 `Intl.NumberFormat` API 提案](https://github.com/tc39/proposal-unified-intl-numberformat) 是一個第三階段的提案，它通過新增對測量單位、貨幣與符號顯示政策，以及科學與緊湊符號法的支援來改進 `Intl.NumberFormat`。您也可以通過在[其 GitHub 儲存庫](https://github.com/tc39/ecma402)中貢獻來參與 ECMA-402 的未來。

## 結論

`Intl` 提供了一個功能豐富的 API，用於國際化您的網頁應用所需的多種操作，減少了數據或程式碼的傳輸負擔，並將繁重的工作交給瀏覽器完成。正確思考這些 API 的使用方式可以使您的使用者界面在不同語言環境下表現得更好。由於 Google V8 和 i18n 團隊與 TC39 及其 ECMA-402 小組的合作，您現在可以使用更多功能且帶來更好的效能，並期待未來進一步的改進。
