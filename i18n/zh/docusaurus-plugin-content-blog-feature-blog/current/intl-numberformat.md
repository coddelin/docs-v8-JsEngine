---
title: '`Intl.NumberFormat`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias)) 和 Shane F. Carr'
avatars:
  - 'mathias-bynens'
  - 'shane-carr'
date: 2019-08-08
tags:
  - Intl
  - io19
description: 'Intl.NumberFormat 支持基于区域的数字格式化。'
tweet: '1159476407329873920'
---
你可能已经熟悉了 `Intl.NumberFormat` API，因为它已经在现代环境中被支持了一段时间。

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

在其最基本的形式中，`Intl.NumberFormat` 允许创建一个可重用的格式化实例，该实例支持基于区域的数字格式化。就像其他 `Intl.*Format` API 一样，格式化实例支持 `format` 和 `formatToParts` 方法：

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

**注意：** 尽管使用 `Number.prototype.toLocaleString` 也可以实现许多 `Intl.NumberFormat` 的功能，但 `Intl.NumberFormat` 通常是更好的选择，因为它允许创建一个可重复使用的格式化实例，这通常 [更高效](/blog/v8-release-76#localized-bigint)。

最近，`Intl.NumberFormat` API 增添了一些新功能。

## `BigInt` 支持

除了 `Number`，`Intl.NumberFormat` 现在还可以格式化 [`BigInt`](/features/bigint)：

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

## 度量单位

`Intl.NumberFormat` 当前支持以下所谓的 _简单单位_：

- 角度: `degree`
- 面积: `acre`, `hectare`
- 浓度: `percent`
- 数字: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- 时间: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- 长度: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- 质量: `gram`,  `kilogram`, `ounce`, `pound`, `stone`
- 温度: `celsius`, `fahrenheit`
- 体积: `liter`, `milliliter`, `gallon`, `fluid-ounce`

要使用带有本地化单位的数字格式化，请使用 `style` 和 `unit` 选项：

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

请注意，随着时间推移，可能会增加对更多单位的支持。请参阅规范获取 [最新的完整列表](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers)。

上述简单单位可以按任意分子和分母组合，以表达复合单位，例如“每英亩升”或“每秒米”：

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

## 紧凑、科学与工程计数法

_紧凑计数法_ 使用特定于区域的符号来表示大数字。它是科学计数法的更人性化的替代方案：

```js
{
  // 测试标准计数法。
  const formatter = new Intl.NumberFormat('en', {
    notation: 'standard', // 这是隐含的默认值。
  });
  formatter.format(1234.56);
  // → '1,234.56'
  formatter.format(123456);
  // → '123,456'
  formatter.format(123456789);
  // → '123,456,789'
}

{
  // 测试紧凑计数法。
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
**注意：** 默认情况下，紧凑计数法会四舍五入到最接近的整数，但始终保留 2 位有效数字。可以设置 `{minimum,maximum}FractionDigits` 或 `{minimum,maximum}SignificantDigits` 以覆盖该行为。
:::

`Intl.NumberFormat` 也可以格式化数字为[科学计数法](https://en.wikipedia.org/wiki/Scientific_notation)：

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'scientific',
});
formatter.format(299792458);
// → '2.998E8 m/s'
```

[工程计数法](https://en.wikipedia.org/wiki/Engineering_notation)也支持：

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

## 显示符号

在某些情况下（例如显示增量）明确显示符号会更有帮助，即使数字是正数。新的 `signDisplay` 选项可以实现这个功能：

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

要避免当值为 `0` 时显示符号，可以使用 `signDisplay: 'exceptZero'`：

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
// 注意：-0 仍然显示符号，这是预期的行为：
formatter.format(-0);
// → '-0%'
```

对于货币，`currencySign` 选项支持 _账目格式_，它提供用于负货币金额的本地化特定格式；例如，用括号将金额括起来：

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

## 更多信息

相关的[规范提案](https://github.com/tc39/proposal-unified-intl-numberformat)有更多信息和示例，包括关于如何检测每个 `Intl.NumberFormat` 功能的指南。
