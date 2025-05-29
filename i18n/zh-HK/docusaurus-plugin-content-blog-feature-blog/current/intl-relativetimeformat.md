---
title: "`Intl.RelativeTimeFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-10-22
tags: 
  - Intl
  - Node.js 12
  - io19
description: "Intl.RelativeTimeFormat 提供了在不犧牲效能的情況下進行相對時間的本地化格式化功能。"
tweet: "1054387117571354624"
---
現代的網頁應用程式通常會使用「昨天」、「42秒前」或「3個月後」此類短語，而不是完整的日期和時間戳。這些 _相對時間格式化值_ 已變得如此常見，以至於許多流行的函式庫都實作了能夠以本地化方式格式化它們的工具函數。（例子包括 [Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize) 和 [date-fns](https://date-fns.org/docs/)。）

<!--truncate-->
實作一個本地化的相對時間格式化器的一個問題是，您需要為每種想要支援的語言準備一組習慣用語或短語（例如「昨天」或「上個季度」）。[Unicode CLDR](http://cldr.unicode.org/) 提供了這些資料，但要在 JavaScript 中使用它，必須內嵌這些資料並與其他函式庫代碼一起打包。這不幸地增加了這些函式庫的程式包大小，對載入時間、解析/編譯成本、記憶體消耗產生負面影響。

全新的 `Intl.RelativeTimeFormat` API 將這個負擔轉移到了 JavaScript 引擎上，該引擎可以提供區域語言資料並直接供 JavaScript 開發者使用。`Intl.RelativeTimeFormat` 提供了在不犧牲效能的情況下進行相對時間的本地化格式化功能。

## 使用範例

以下範例展示了如何使用英文創建一個相對時間格式化器。

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

注意，傳遞給 `Intl.RelativeTimeFormat` 建構函數的參數可以是儲存 [BCP 47 語言標籤](https://tools.ietf.org/html/rfc5646) 的字符串，也可以是 [這類語言標籤的陣列](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)。

以下是一個使用不同語言（西班牙語）的範例：

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

此外，`Intl.RelativeTimeFormat` 建構函數接受一個可選的 `options` 引數，可對輸出進行細粒度控制。以下是幾段以預設設置為基礎的英文輸出的範例來說明其靈活性：

```js
// 為英文語言創建相對時間格式化器，使用默認設定（就像前面一樣）。
// 在此示例中，默認值被明確傳遞進去。
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // 其他值：'lookup'
  style: 'long', // 其他值：'short' 或 'narrow'
  numeric: 'always', // 其他值：'auto'
});

// 現在，讓我們試試一些特殊案例！

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

您可能注意到上述格式化器生成了字串 `'1 day ago'` 而不是 `'yesterday'`，以及稍顯尷尬的 `'in 0 weeks'` 而不是 `'this week'`。發生這種情況的原因是，格式化器默認使用數值形式輸出。

要改變此行為，將 `numeric` 選項設置為 `'auto'`（而不是默認的 `'always'`）：

```js
// 為英文語言創建一個相對時間格式化器，其輸出不必總是使用數值形式。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

類似於其他 `Intl` 類別，`Intl.RelativeTimeFormat` 除了 `format` 方法外，還有一個 `formatToParts` 方法。儘管 `format` 涵蓋了最常見的使用情況，但如果需要獲取生成輸出的個別部分，`formatToParts` 會很有幫助：

```js
// 創建一個針對英語的相對時間格式化器，
// 輸出中不一定需要使用數字值。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → '昨天'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: '昨天' }]

rtf.format(3, 'week');
// → '3 週後'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: '3 週後' },
//    { type: 'integer', value: '3', unit: '週' },
//    { type: 'literal', value: ' weeks' }]
```

如需了解更多選項及其行為，請參考 [提案倉庫中的 API 文件](https://github.com/tc39/proposal-intl-relative-time#api)。

## 結論

`Intl.RelativeTimeFormat` 在 V8 v7.1 和 Chrome 71 中默認提供。隨著此 API 越來越廣泛地可用，您會發現像 [Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize) 和 [date-fns](https://date-fns.org/docs/) 這類庫逐漸拋棄硬編碼的 CLDR 資料庫，轉而使用原生的相對時間格式化功能，從而提升加載時間性能、解析和編譯時間性能、運行時性能以及內存使用效率。

## `Intl.RelativeTimeFormat` 支援

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
