---
title: "`Intl.NumberFormat`について"
author: "Mathias Bynens（[@mathias](https://twitter.com/mathias)）とShane F. Carr"
avatars: 
  - "mathias-bynens"
  - "shane-carr"
date: 2019-08-08
tags: 
  - Intl
  - io19
description: "Intl.NumberFormatは、ロケールに対応した数値のフォーマットを可能にします。"
tweet: "1159476407329873920"
---
すでにご存知かもしれませんが、`Intl.NumberFormat` APIはモダンな環境でしばらくの間サポートされてきました。

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

`Intl.NumberFormat`の最も基本的な形では、ロケールに対応した数値フォーマットをサポートする再利用可能なフォーマッタインスタンスを作成できます。他の`Intl.*Format` APIと同様に、フォーマッタインスタンスは`format`メソッドと`formatToParts`メソッドの両方をサポートしています。

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

**注意:** `Intl.NumberFormat`の機能の多くは`Number.prototype.toLocaleString`を使用して実現できますが、再利用可能なフォーマッタインスタンスを作成することができるため、通常`Intl.NumberFormat`のほうが良い選択肢です。その結果、[より効率的](/blog/v8-release-76#localized-bigint)になることがよくあります。

最近、`Intl.NumberFormat` APIに新しい機能が追加されました。

## `BigInt`サポート

`Number`だけではなく、`Intl.NumberFormat`は現在[`BigInt`](/features/bigint)もフォーマット可能です。

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

## 計測単位

`Intl.NumberFormat`は現在以下のいわゆる_単純な単位_をサポートしています。

- 角度: `degree`
- 面積: `acre`, `hectare`
- 濃度: `percent`
- デジタル: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- 時間: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- 長さ: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- 質量: `gram`, `kilogram`, `ounce`, `pound`, `stone`
- 温度: `celsius`, `fahrenheit`
- 容量: `liter`, `milliliter`, `gallon`, `fluid-ounce`

ローカライズされた単位で数値をフォーマットするには、`style`と`unit`オプションを使用します。

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

時間とともに、より多くの単位のサポートが追加される可能性があります。最新の情報については仕様の[最新リスト](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers)をご覧ください。

上記の単純単位を組み合わせて、「1エーカーあたりのリットル」や「1秒あたりのメートル」のような複合単位を表現することができます。

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

## コンパクト、科学、およびエンジニアリング記法

_コンパクト記法_はローカルに対応した記号を使用して大きな数値を表現します。これは科学記法の使いやすい代替手段です。

```js
{
  // 標準記法のテスト。
  const formatter = new Intl.NumberFormat('en', {
    notation: 'standard', // デフォルトの設定。
  });
  formatter.format(1234.56);
  // → '1,234.56'
  formatter.format(123456);
  // → '123,456'
  formatter.format(123456789);
  // → '123,456,789'
}

{
  // コンパクト記法のテスト。
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
注意: デフォルトでは、コンパクト記法は最も近い整数に丸め、常に2つの有効数字を保持します。`{minimum,maximum}FractionDigits`または`{minimum,maximum}SignificantDigits`のいずれかを設定することで、この動作を上書きすることができます。
:::

`Intl.NumberFormat`は、[科学記数法](https://en.wikipedia.org/wiki/Scientific_notation)で数値をフォーマットすることもできます:

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'scientific',
});
formatter.format(299792458);
// → '2.998E8 m/s'
```

[工学記数法](https://en.wikipedia.org/wiki/Engineering_notation)もサポートされています:

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

## 符号表示

特定の状況（例えば差分を表示する場合）では、数値が正であっても符号を明示的に表示することが役立ちます。新しい`signDisplay`オプションを使用するとこれが可能になります:

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

値が`0`のときに符号を表示しないようにするには、`signDisplay: 'exceptZero'`を使用します:

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
// 注意: -0は期待通りに符号付きで表示されます:
formatter.format(-0);
// → '-0%'
```

通貨の場合、`currencySign`オプションにより_会計フォーマット_が有効になります。これは負の通貨額をローカル固有のフォーマットで表示します。例えば、金額を括弧内に表示するなどです:

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

## 詳細情報

関連する[仕様提案](https://github.com/tc39/proposal-unified-intl-numberformat)には、各`Intl.NumberFormat`機能個別の特徴検出方法を含む、詳細情報や例が記載されています。
