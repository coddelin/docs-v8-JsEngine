---
title: "`Intl.DisplayNames`"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu)) 和 Frank Yung-Fong Tang"
avatars:
  - "shu-yu-guo"
  - "frank-tang"
date: 2020-02-13
tags:
  - Intl
  - Node.js 14
description: "Intl.DisplayNames API 使得语言、地区、书写系统和货币的本地化名称变得更加方便。"
tweet: "1232333889005334529"
---
面向全球用户的 Web 应用需要以许多不同语言显示语言、地区、书写系统和货币的名称。这些名称的翻译需要数据，该数据可在 [Unicode CLDR](http://cldr.unicode.org/translation/) 中找到。将数据打包为应用的一部分会耗费开发时间。用户往往更喜欢语言和地区名称的统一翻译，而随着全球地缘政治情况的变化保持数据更新需要持续维护。

<!--truncate-->
幸运的是，大多数 JavaScript 运行时已经导入并保持这些翻译数据的更新。新的 `Intl.DisplayNames` API 使 JavaScript 开发者能够直接访问这些翻译，从而让应用更容易显示本地化名称。

## 使用示例

以下示例展示如何创建一个 `Intl.DisplayNames` 对象以使用 [ISO-3166 2字母国家代码](https://www.iso.org/iso-3166-country-codes.html) 获取英文的地区名称。

```js
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
regionNames.of('US');
// → 'United States'
regionNames.of('BA');
// → 'Bosnia & Herzegovina'
regionNames.of('MM');
// → 'Myanmar (Burma)'
```

以下示例使用 [Unicode'的语言标识符语法](http://unicode.org/reports/tr35/#Unicode_language_identifier) 获取繁体中文的语言名称。

```js
const languageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
languageNames.of('fr');
// → '法文'
languageNames.of('zh');
// → '中文'
languageNames.of('de');
// → '德文'
```

以下示例使用 [ISO-4217 3字母货币代码](https://www.iso.org/iso-4217-currency-codes.html) 获取简体中文的货币名称。在存在单数和复数形式区别的语言中，货币名称为单数形式。对于复数形式，可以使用 [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat)。

```js
const currencyNames = new Intl.DisplayNames(['zh-Hans'], {type: 'currency'});
currencyNames.of('USD');
// → '美元'
currencyNames.of('EUR');
// → '欧元'
currencyNames.of('JPY');
// → '日元'
currencyNames.of('CNY');
// → '人民币'
```

以下示例展示最终支持的数据类型“书写系统”，在英文中使用 [ISO-15924 4字母书写系统代码](http://unicode.org/iso15924/iso15924-codes.html)。

```js
const scriptNames = new Intl.DisplayNames(['en'], { type: 'script' });
scriptNames.of('Latn');
// → 'Latin'
scriptNames.of('Arab');
// → 'Arabic'
scriptNames.of('Kana');
// → 'Katakana'
```

对于更高级的用法，第二个 `options` 参数还支持 `style` 属性。`style` 属性对应于显示名称的宽度，可以是 `"long"`、`"short"` 或 `"narrow"`。不同样式的值不一定有差异。默认值是 `"long"`。

```js
const longLanguageNames = new Intl.DisplayNames(['en'], { type: 'language' });
longLanguageNames.of('en-US');
// → 'American English'
const shortLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'short' });
shortLanguageNames.of('en-US');
// → 'US English'
const narrowLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'narrow' });
narrowLanguageNames.of('en-US');
// → 'US English'
```

## 完整 API

完整的 `Intl.DisplayNames` API 如下。

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

构造函数与其他 `Intl` API 一致。它的第一个参数是一个 [语言环境列表](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)，第二个参数是一个 `options` 参数，其中包含 `localeMatcher`、`type` 和 `style` 属性。

`"localeMatcher"` 属性的处理方式与 [其他 `Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation) 相同。`type` 属性可以是 `"region"`、`"language"`、`"currency"` 或 `"script"`。`style` 属性可以是 `"long"`、`"short"` 或 `"narrow"`，默认值是 `"long"`。

`Intl.DisplayNames.prototype.of( code )` 的期望格式根据实例构造的 `type` 不同而有所变化。

- 当 `type` 是 `"region"` 时，`code` 必须是一个 [ISO-3166 2字母国家代码](https://www.iso.org/iso-3166-country-codes.html) 或一个 [UN M49 3数字地区代码](https://unstats.un.org/unsd/methodology/m49/)。
- 当 `type` 为 `"language"` 时，`code` 必须符合 [Unicode 的语言标识符语法](https://unicode.org/reports/tr35/#Unicode_language_identifier)。
- 当 `type` 为 `"currency"` 时，`code` 必须是 [ISO-4217 3 字母货币代码](https://www.iso.org/iso-4217-currency-codes.html)。
- 当 `type` 为 `"script"` 时，`code` 必须是 [ISO-15924 4 字母文字代码](https://unicode.org/iso15924/iso15924-codes.html)。

## 结论

与其他 `Intl` APIs 类似，随着 `Intl.DisplayNames` 得到更广泛的支持，库和应用程序将选择不再使用其自身的翻译数据包，而是更喜欢利用原生功能。

## `Intl.DisplayNames` 支持

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
