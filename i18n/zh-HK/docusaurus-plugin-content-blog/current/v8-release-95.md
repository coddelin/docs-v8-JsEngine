---
title: "V8 發佈 v9.5"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-09-21
tags:
 - release
description: "V8 發佈 v9.5 帶來更新的國際化 API 和 WebAssembly 異常處理支援。"
tweet: "1440296019623759872"
---
每四週，我們會根據 [發佈流程](https://v8.dev/docs/release-process) 建立一個新的 V8 分支。每個版本都是在 Chrome Beta 里程碑之前直接從 V8 的 Git 主分支建立的。今天我們很高興地宣布我們最新的分支，[V8 版本 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5)，目前處於 Beta 階段，預計幾週後將與 Chrome 95 正式版同步發佈。V8 v9.5 充滿了各種面向開發者的精彩功能。這篇文章將搶先介紹一些亮點。

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

在 v8.1 中，我們在 Chrome 81 中推出了 [`Intl.DisplayNames` API](https://v8.dev/features/intl-displaynames) API，支援的類型有 “language”、“region”、“script” 和 “currency”。隨著 v9.5 的發佈，我們新增兩個新的支援類型：“calendar” 和 “dateTimeField”。它們分別返回各種日曆類型和日期時間字段的顯示名稱：

```js
const esCalendarNames = new Intl.DisplayNames(['es'], { type: 'calendar' });
const frDateTimeFieldNames = new Intl.DisplayNames(['fr'], { type: 'dateTimeField' });
esCalendarNames.of('roc');  // "calendario de la República de China"
frDateTimeFieldNames.of('month'); // "mois"
```

我們還增強了對 “language” 類型的支援，新增了一個 languageDisplay 選項，該選項可以是 “standard” 或 “dialect”（如果未指定，默認值為 “dialect”）：

```js
const jaDialectLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' });
const jaStandardLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' , languageDisplay: 'standard'});
jaDialectLanguageNames.of('en-US')  // "アメリカ英語"
jaDialectLanguageNames.of('en-AU')  // "オーストラリア英語"
jaDialectLanguageNames.of('en-GB')  // "イギリス英語"

jaStandardLanguageNames.of('en-US') // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of('en-AU') // "英語 (オーストラリア)"
jaStandardLanguageNames.of('en-GB') // "英語 (イギリス)"
```

### 擴展的 `timeZoneName` 選項

`Intl.DateTimeFormat API` 在 v9.5 中新增了四個 `timeZoneName` 選項的新值：

- “shortGeneric” 以短的通用非地點格式輸出時區名稱，例如“PT”、“ET”，不指明是否處於夏令時。
- “longGeneric” 以長的通用非地點格式輸出時區名稱，例如“Pacific Time”、“Mountain Time”，不指明是否處於夏令時。
- “shortOffset” 以短的本地化 GMT 格式輸出時區名稱，例如“GMT-8”。
- “longOffset” 以長的本地化 GMT 格式輸出時區名稱，例如“GMT-0800”。

## WebAssembly

### 異常處理

V8 現在支援 [WebAssembly 異常處理 (Wasm EH) 提案](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md)，使得使用兼容工具鏈（例如 [Emscripten](https://emscripten.org/docs/porting/exceptions.html)）編譯的模組可以在 V8 中執行。該提案旨在與之前使用 JavaScript 的變通方法相比保持更低的開銷。

例如，我們將 [Binaryen](https://github.com/WebAssembly/binaryen/) 優化器用舊的和新的異常處理實現編譯為 WebAssembly。

啟用異常處理時，代碼大小的增加 [從約 43%（基於舊的 JavaScript 異常處理）降至僅 9%（使用新的 Wasm EH 特性）](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209)。

我們在一些大型測試文件上運行 `wasm-opt.wasm -O3` 時，啟用 Wasm EH 的版本與不啟用異常的基線相比未見性能損失，而基於 JavaScript 的異常處理版本用時增加了約 30%。

然而，Binaryen 很少使用異常檢查。在異常密集的工作負載中，性能差異可能會更大。

## V8 API

主要的 v8.h 標頭檔案已被拆分為幾個部分，可以單獨包含。例如，`v8-isolate.h` 現在包含了 `v8::Isolate` 類別。許多聲明方法的標頭文件，可傳遞 `v8::Local<T>` 現在可以引入 `v8-forward.h` 來獲取 `v8::Local` 和所有 V8 堆物件類型的定義。

請使用 `git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h` 來獲取 API 更改的列表。
