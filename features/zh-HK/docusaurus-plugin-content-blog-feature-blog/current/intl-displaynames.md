---
title: &apos;`Intl.DisplayNames`&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu)) 和 Frank Yung-Fong Tang&apos;
avatars:
  - &apos;shu-yu-guo&apos;
  - &apos;frank-tang&apos;
date: 2020-02-13
tags:
  - Intl
  - Node.js 14
description: &apos;Intl.DisplayNames API 讓程式可以本地化顯示語言、地區、文字書寫系統和貨幣的名稱。&apos;
tweet: &apos;1232333889005334529&apos;
---
面向全球使用者的網頁應用需要以多種語言展示語言、地區、文字書寫系統和貨幣的名稱。這些名稱的翻譯需要數據，而這些數據可從 [Unicode CLDR](http://cldr.unicode.org/translation/) 獲取。將這些數據作為應用的一部分進行打包會增加開發成本。用戶傾向於一致的語言和地區名稱翻譯，並且隨著世界的地緣政治變化保持數據的最新需要不斷的維護。

<!--truncate-->
幸運的是，大多數 JavaScript 執行環境已經附帶並保持這些翻譯數據的更新。新的 `Intl.DisplayNames` API 讓 JavaScript 開發者可以直接訪問這些翻譯數據，從而更輕鬆地在應用中顯示本地化名稱。

## 使用範例

以下範例展示了如何建立一個 `Intl.DisplayNames` 對象，以使用 [ISO-3166 二位國家代碼](https://www.iso.org/iso-3166-country-codes.html) 來獲取英文的地區名稱。

```js
const regionNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;region&apos; });
regionNames.of(&apos;US&apos;);
// → &apos;United States&apos;
regionNames.of(&apos;BA&apos;);
// → &apos;Bosnia & Herzegovina&apos;
regionNames.of(&apos;MM&apos;);
// → &apos;Myanmar (Burma)&apos;
```

以下範例使用 [Unicode 的語言標識符語法](http://unicode.org/reports/tr35/#Unicode_language_identifier)，獲取繁體中文的語言名稱。

```js
const languageNames = new Intl.DisplayNames([&apos;zh-Hant&apos;], { type: &apos;language&apos; });
languageNames.of(&apos;fr&apos;);
// → &apos;法文&apos;
languageNames.of(&apos;zh&apos;);
// → &apos;中文&apos;
languageNames.of(&apos;de&apos;);
// → &apos;德文&apos;
```

以下範例使用 [ISO-4217 三位貨幣代碼](https://www.iso.org/iso-4217-currency-codes.html) 獲取簡體中文的貨幣名稱。在具有單數和複數形式的語言中，貨幣名稱為單數形式。對於複數形式，可使用 [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat)。

```js
const currencyNames = new Intl.DisplayNames([&apos;zh-Hans&apos;], {type: &apos;currency&apos;});
currencyNames.of(&apos;USD&apos;);
// → &apos;美元&apos;
currencyNames.of(&apos;EUR&apos;);
// → &apos;歐元&apos;
currencyNames.of(&apos;JPY&apos;);
// → &apos;日元&apos;
currencyNames.of(&apos;CNY&apos;);
// → &apos;人民幣&apos;
```

以下範例展示了最後一種受支持的類型——文字書寫系統，在英文中使用 [ISO-15924 四位文字代碼](http://unicode.org/iso15924/iso15924-codes.html)。

```js
const scriptNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;script&apos; });
scriptNames.of(&apos;Latn&apos;);
// → &apos;Latin&apos;
scriptNames.of(&apos;Arab&apos;);
// → &apos;Arabic&apos;
scriptNames.of(&apos;Kana&apos;);
// → &apos;Katakana&apos;
```

對於更進階的使用方式，`options` 的第二個參數還支持 `style` 屬性。`style` 屬性對應於顯示名稱的寬度，可以是 `"long"`、`"short"` 或 `"narrow"` 之中的任一個。不同 style 的值不一定總是存在差異。默認值為 `"long"`。

```js
const longLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos; });
longLanguageNames.of(&apos;en-US&apos;);
// → &apos;American English&apos;
const shortLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos;, style: &apos;short&apos; });
shortLanguageNames.of(&apos;en-US&apos;);
// → &apos;US English&apos;
const narrowLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos;, style: &apos;narrow&apos; });
narrowLanguageNames.of(&apos;en-US&apos;);
// → &apos;US English&apos;
```

## 完整 API

`Intl.DisplayNames` 的完整 API 如下。

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

構造函數與其他 `Intl` API 保持一致。其第一個參數是 [區域列表](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)，第二個參數是`options`，包含 `localeMatcher`、`type` 和 `style` 屬性。

`"localeMatcher"` 屬性與 [其他 `Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation) 的處理方式相同。`type` 屬性可以是 `"region"`、`"language"`、`"currency"` 或 `"script"`。`style` 屬性可以是 `"long"`、`"short"` 或 `"narrow"`，默認為 `"long"`。

`Intl.DisplayNames.prototype.of( code )` 取決於實例的 `type`，要求根據以下格式提供 `code`。

- 當 `type` 為 `"region"` 時，`code` 必須是 [ISO-3166 二位國家代碼](https://www.iso.org/iso-3166-country-codes.html) 或 [UN M49 三位地區代碼](https://unstats.un.org/unsd/methodology/m49/)。
- 當 `type` 為 `"language"` 時，`code` 必須符合 [Unicode&apos;s language identifier grammar](https://unicode.org/reports/tr35/#Unicode_language_identifier)。
- 當 `type` 為 `"currency"` 時，`code` 必須是 [ISO-4217 三字母貨幣代碼](https://www.iso.org/iso-4217-currency-codes.html)。
- 當 `type` 為 `"script"` 時，`code` 必須是 [ISO-15924 四字母文字代碼](https://unicode.org/iso15924/iso15924-codes.html)。

## 結論

與其他 `Intl` API 相似，隨著 `Intl.DisplayNames` 逐漸被廣泛採用，庫和應用程式將傾向於捨棄打包和運輸自己的翻譯資料，而選擇使用原生功能。

## `Intl.DisplayNames` 支援

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
