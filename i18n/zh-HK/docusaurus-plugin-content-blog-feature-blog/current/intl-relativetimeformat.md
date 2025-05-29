---
title: &apos;`Intl.RelativeTimeFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.RelativeTimeFormat 提供了在不犧牲效能的情況下進行相對時間的本地化格式化功能。&apos;
tweet: &apos;1054387117571354624&apos;
---
現代的網頁應用程式通常會使用「昨天」、「42秒前」或「3個月後」此類短語，而不是完整的日期和時間戳。這些 _相對時間格式化值_ 已變得如此常見，以至於許多流行的函式庫都實作了能夠以本地化方式格式化它們的工具函數。（例子包括 [Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize) 和 [date-fns](https://date-fns.org/docs/)。）

<!--truncate-->
實作一個本地化的相對時間格式化器的一個問題是，您需要為每種想要支援的語言準備一組習慣用語或短語（例如「昨天」或「上個季度」）。[Unicode CLDR](http://cldr.unicode.org/) 提供了這些資料，但要在 JavaScript 中使用它，必須內嵌這些資料並與其他函式庫代碼一起打包。這不幸地增加了這些函式庫的程式包大小，對載入時間、解析/編譯成本、記憶體消耗產生負面影響。

全新的 `Intl.RelativeTimeFormat` API 將這個負擔轉移到了 JavaScript 引擎上，該引擎可以提供區域語言資料並直接供 JavaScript 開發者使用。`Intl.RelativeTimeFormat` 提供了在不犧牲效能的情況下進行相對時間的本地化格式化功能。

## 使用範例

以下範例展示了如何使用英文創建一個相對時間格式化器。

```js
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;in 3.14 seconds&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;15 minutes ago&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;in 8 hours&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;2 days ago&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;5 months ago&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;in 2 quarters&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;42 years ago&apos;
```

注意，傳遞給 `Intl.RelativeTimeFormat` 建構函數的參數可以是儲存 [BCP 47 語言標籤](https://tools.ietf.org/html/rfc5646) 的字符串，也可以是 [這類語言標籤的陣列](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)。

以下是一個使用不同語言（西班牙語）的範例：

```js
const rtf = new Intl.RelativeTimeFormat(&apos;es&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;dentro de 3,14 segundos&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;hace 15 minutos&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;dentro de 8 horas&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;hace 2 días&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;dentro de 3 semanas&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;hace 5 meses&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;dentro de 2 trimestres&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;hace 42 años&apos;
```

此外，`Intl.RelativeTimeFormat` 建構函數接受一個可選的 `options` 引數，可對輸出進行細粒度控制。以下是幾段以預設設置為基礎的英文輸出的範例來說明其靈活性：

```js
// 為英文語言創建相對時間格式化器，使用默認設定（就像前面一樣）。
// 在此示例中，默認值被明確傳遞進去。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos;, // 其他值：&apos;lookup&apos;
  style: &apos;long&apos;, // 其他值：&apos;short&apos; 或 &apos;narrow&apos;
  numeric: &apos;always&apos;, // 其他值：&apos;auto&apos;
});

// 現在，讓我們試試一些特殊案例！

rtf.format(-1, &apos;day&apos;);
// → &apos;1 day ago&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;in 0 days&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;in 1 day&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;1 week ago&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;in 0 weeks&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;in 1 week&apos;
```

您可能注意到上述格式化器生成了字串 `&apos;1 day ago&apos;` 而不是 `&apos;yesterday&apos;`，以及稍顯尷尬的 `&apos;in 0 weeks&apos;` 而不是 `&apos;this week&apos;`。發生這種情況的原因是，格式化器默認使用數值形式輸出。

要改變此行為，將 `numeric` 選項設置為 `&apos;auto&apos;`（而不是默認的 `&apos;always&apos;`）：

```js
// 為英文語言創建一個相對時間格式化器，其輸出不必總是使用數值形式。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;today&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;tomorrow&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;last week&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;this week&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;next week&apos;
```

類似於其他 `Intl` 類別，`Intl.RelativeTimeFormat` 除了 `format` 方法外，還有一個 `formatToParts` 方法。儘管 `format` 涵蓋了最常見的使用情況，但如果需要獲取生成輸出的個別部分，`formatToParts` 會很有幫助：

```js
// 創建一個針對英語的相對時間格式化器，
// 輸出中不一定需要使用數字值。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;昨天&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;昨天&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;3 週後&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;3 週後&apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;週&apos; },
//    { type: &apos;literal&apos;, value: &apos; weeks&apos; }]
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
