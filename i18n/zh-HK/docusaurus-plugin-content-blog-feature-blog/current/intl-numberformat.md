---
title: "`Intl.NumberFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)) 與 Shane F. Carr"
avatars:
  - "mathias-bynens"
  - "shane-carr"
date: 2019-08-08
tags:
  - Intl
  - io19
description: "Intl.NumberFormat 支援語系感知的數字格式化功能。"
tweet: "1159476407329873920"
---
你可能已經熟悉 `Intl.NumberFormat` API，因為它在現代環境中已被支援了一段時間。

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

在其最基本的形式中，`Intl.NumberFormat` 讓您可以建立一個可重用的格式器實例，支援語系感知的數字格式化。就像其他 `Intl.*Format` API 一樣，格式器實例同時支持 `format` 與 `formatToParts` 方法：

<!--truncate-->
```js
const formatter = new Intl.NumberFormat('en');
formatter.format(987654.321);
// → '987,654.321'
formatter.formatToParts(987654.321);
// → [
// →   { type: 'integer', value: '987' },
// →   { type: 'group', value: ',' },
// →   { type: 'integer', value: '654' },
// →   { type: 'decimal', value: '.' },
// →   { type: 'fraction', value: '321' }
// → ]
```

**注意：** 雖然大部分的 `Intl.NumberFormat` 功能可以使用 `Number.prototype.toLocaleString` 達成，但通常選擇 `Intl.NumberFormat` 更好，因為它可以建立可重用的格式器實例，通常是 [更高效的](/blog/v8-release-76#localized-bigint)。

最近，`Intl.NumberFormat` API 獲得了一些新功能。

## `BigInt` 支援

除了 `Number`，`Intl.NumberFormat` 現在也能格式化 [`BigInt`](/features/bigint)：

```js
const formatter = new Intl.NumberFormat('fr');
formatter.format(12345678901234567890n);
// → '12 345 678 901 234 567 890'
formatter.formatToParts(123456n);
// → [
// →   { type: 'integer', value: '123' },
// →   { type: 'group', value: ' ' },
// →   { type: 'integer', value: '456' }
// → ]
```

<feature-support chrome="76 /blog/v8-release-76#localized-bigint"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 測量單位

`Intl.NumberFormat` 目前支持以下所謂的 _簡單單位_：

- 角度: `degree`
- 面積: `acre`, `hectare`
- 濃度: `percent`
- 數位: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- 時間長度: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- 長度: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- 質量: `gram`,  `kilogram`, `ounce`, `pound`, `stone`
- 溫度: `celsius`, `fahrenheit`
- 容量: `liter`, `milliliter`, `gallon`, `fluid-ounce`

要使用本地化單位格式化數字，可使用 `style` 與 `unit` 選項：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'kilobyte',
});
formatter.format(1.234);
// → '1.234 kB'
formatter.format(123.4);
// → '123.4 kB'
```

請注意，隨著時間推移，可能會增加更多單位支持。請參閱規範以獲取 [最新的單位列表](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers)。

上述簡單單位可以組合為任意的分子與分母配對，用於表示複合單位，比如“每英畝升”或“每秒公尺”：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299,792,458 m/s'
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 簡略、科學與工程記號

_簡略記號_ 使用語系特有的符號來表示大數字。它是一種比科學記號更易懂的替代方式：

```js
{
  // 測試標準記號。
  const formatter = new Intl.NumberFormat('en', {
    notation: 'standard', // 這是默認值。
  });
  formatter.format(1234.56);
  // → '1,234.56'
  formatter.format(123456);
  // → '123,456'
  formatter.format(123456789);
  // → '123,456,789'
}

{
  // 測試簡略記號。
  const formatter = new Intl.NumberFormat('en', {
    notation: 'compact',
  });
  formatter.format(1234.56);
  // → '1.2K'
  formatter.format(123456);
  // → '123K'
  formatter.format(123456789);
  // → '123M'
}
```

:::note
**注意：** 默認情況下，簡略記號會四捨五入到整數，但始終保留 2 位有效數字。您可以設置 `{minimum,maximum}FractionDigits` 或 `{minimum,maximum}SignificantDigits` 來覆蓋此行為。
:::

`Intl.NumberFormat` 也可以用於格式化數字為[科學記號](https://en.wikipedia.org/wiki/Scientific_notation)：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'scientific',
});
formatter.format(299792458);
// → '2.998E8 m/s'
```

[工程記號](https://en.wikipedia.org/wiki/Engineering_notation)也支持：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'engineering',
});
formatter.format(299792458);
// → '299.792E6 m/s'
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 符號顯示

在某些情境下（例如表示變化量），即使數字是正的，也應明確顯示符號。新的 `signDisplay` 選項允許此功能：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'percent',
  signDisplay: 'always',
});
formatter.format(-12.34);
// → '-12.34%'
formatter.format(12.34);
// → '+12.34%'
formatter.format(0);
// → '+0%'
formatter.format(-0);
// → '-0%'
```

若要在數值為 `0` 時不顯示符號，可使用 `signDisplay: 'exceptZero'`：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'percent',
  signDisplay: 'exceptZero',
});
formatter.format(-12.34);
// → '-12.34%'
formatter.format(12.34);
// → '+12.34%'
formatter.format(0);
// → '0%'
// 注意：-0 仍會顯示符號，這是預期行為：
formatter.format(-0);
// → '-0%'
```

對於貨幣，`currencySign` 選項允許_會計格式_，此格式針對負的貨幣金額提供特定於語言的格式，例如以括號括住金額：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'exceptZero',
  currencySign: 'accounting',
});
formatter.format(-12.34);
// → '($12.34)'
formatter.format(12.34);
// → '+$12.34'
formatter.format(0);
// → '$0.00'
formatter.format(-0);
// → '($0.00)'
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 更多資訊

相關的[規範提案](https://github.com/tc39/proposal-unified-intl-numberformat)提供了更多資訊和範例，包括如何檢測每個 `Intl.NumberFormat` 特性的建議。
