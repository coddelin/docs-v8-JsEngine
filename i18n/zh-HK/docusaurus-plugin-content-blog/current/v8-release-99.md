---
title: "V8 發佈 v9.9"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 在他的 99% 時間代碼中"
avatars:
 - "ingvar-stepanyan"
date: 2022-01-31
tags:
 - release
description: "V8 發佈 v9.9 帶來了全新的國際化 API。"
tweet: "1488190967727411210"
---
每隔四週，我們就會按照我們的[發佈流程](https://v8.dev/docs/release-process)創建一個新的 V8 分支。每個版本都會在 Chrome 測試版里程碑之前，從 V8 的 Git 主分支分出。今天我們很高興地宣布我們的新分支，[V8 版本 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9)，它將處於測試階段，直到幾週後與 Chrome 99 正式穩定版同期發佈。V8 v9.9 包含了各種面向開發人員的好功能。這篇文章提前介紹了一些亮點功能，迎接發佈。

<!--truncate-->
## JavaScript

### Intl.Locale 擴展

在 v7.4 中，我們推出了[`Intl.Locale` API](https://v8.dev/blog/v8-release-74#intl.locale)。在 v9.9 中，我們為 `Intl.Locale` 對象新增了七個屬性：`calendars`，`collations`，`hourCycles`，`numberingSystems`，`timeZones`，`textInfo` 和 `weekInfo`。

`Intl.Locale` 的 `calendars`，`collations`，`hourCycles`，`numberingSystems` 和 `timeZones` 屬性返回在常用應用中的首選標識符數組，設計用於與其他 `Intl` API 配合使用：

```js
const arabicEgyptLocale = new Intl.Locale('ar-EG')
// ar-EG
arabicEgyptLocale.calendars
// ['gregory', 'coptic', 'islamic', 'islamic-civil', 'islamic-tbla']
arabicEgyptLocale.collations
// ['compat', 'emoji', 'eor']
arabicEgyptLocale.hourCycles
// ['h12']
arabicEgyptLocale.numberingSystems
// ['arab']
arabicEgyptLocale.timeZones
// ['Africa/Cairo']
```

`Intl.Locale` 的 `textInfo` 屬性返回一個指定與文本相關的屬性的對象。目前只有一個屬性，`direction`，用於指示語言的默認文本方向。設計用於 [HTML 的 `dir` 屬性](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) 和 [CSS 的 `direction` 屬性](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)。它指示字符順序——`ltr`（從左到右）或 `rtl`（從右到左）：

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

`Intl.Locale` 的 `weekInfo` 屬性返回一個指定與週相關信息的對象。返回對象中的 `firstDay` 屬性是一個介於 1 到 7 的數字，用於說明每週的第一天，供日曆使用。1 表示星期一，2 表示星期二，3 表示星期三，4 表示星期四，5 表示星期五，6 表示星期六，7 表示星期日。返回對象中的 `minimalDays` 屬性是指為了被日曆認定為新的一周，該月或該年的第一周應具備的最少天數。返回對象中的 `weekend` 屬性是一個通常包含兩個整數的數組，與 `firstDay` 編碼方式相同，說明在日曆中，哪些天數被視為“週末”。注意，在每個地區，“週末”包含的天數可能不同，而且不一定連續。

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// 一週的第一天是星期六。週末是星期五和星期六。
// 一個月或一年的第一週是一週內至少包含 1
// 天的那一周。
```

### Intl 枚舉功能

在 v9.9 中，我們新增了一個函數 [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf)，它返回 v8 中對 `Intl` API 所支持的標識符組成的數組。支持的 `code` 值有 `calendar`、`collation`、`currency`、`numberingSystem`、`timeZone` 和 `unit`。這個新方法中的信息旨在讓網頁開發人員輕鬆發現已被實現的支持值。

```js
Intl.supportedValuesOf('calendar')
// ['buddhist', 'chinese', 'coptic', 'dangi', ...]

Intl.supportedValuesOf('collation')
// ['big5han', 'compat', 'dict', 'emoji', ...]

Intl.supportedValuesOf('currency')
// ['ADP', 'AED', 'AFA', 'AFN', 'ALK', 'ALL', 'AMD', ...]

Intl.supportedValuesOf('numberingSystem')
// ['adlm', 'ahom', 'arab', 'arabext', 'bali', ...]

Intl.supportedValuesOf('timeZone')
// ['Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', ...]

Intl.supportedValuesOf('unit')
// ['acre', 'bit', 'byte', 'celsius', 'centimeter', ...]
```

## V8 API

請使用 `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h` 來獲取 API 更改列表。
