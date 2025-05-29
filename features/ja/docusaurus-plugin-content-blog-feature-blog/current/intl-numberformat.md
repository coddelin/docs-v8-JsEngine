---
title: &apos;`Intl.NumberFormat`について&apos;
author: &apos;Mathias Bynens（[@mathias](https://twitter.com/mathias)）とShane F. Carr&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;shane-carr&apos;
date: 2019-08-08
tags:
  - Intl
  - io19
description: &apos;Intl.NumberFormatは、ロケールに対応した数値のフォーマットを可能にします。&apos;
tweet: &apos;1159476407329873920&apos;
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
const formatter = new Intl.NumberFormat(&apos;en&apos;);
formatter.format(987654.321);
// → &apos;987,654.321&apos;
formatter.formatToParts(987654.321);
// → [
// →   { type: &apos;integer&apos;, value: &apos;987&apos; },
// →   { type: &apos;group&apos;, value: &apos;,&apos; },
// →   { type: &apos;integer&apos;, value: &apos;654&apos; },
// →   { type: &apos;decimal&apos;, value: &apos;.&apos; },
// →   { type: &apos;fraction&apos;, value: &apos;321&apos; }
// → ]
```

**注意:** `Intl.NumberFormat`の機能の多くは`Number.prototype.toLocaleString`を使用して実現できますが、再利用可能なフォーマッタインスタンスを作成することができるため、通常`Intl.NumberFormat`のほうが良い選択肢です。その結果、[より効率的](/blog/v8-release-76#localized-bigint)になることがよくあります。

最近、`Intl.NumberFormat` APIに新しい機能が追加されました。

## `BigInt`サポート

`Number`だけではなく、`Intl.NumberFormat`は現在[`BigInt`](/features/bigint)もフォーマット可能です。

```js
const formatter = new Intl.NumberFormat(&apos;fr&apos;);
formatter.format(12345678901234567890n);
// → &apos;12 345 678 901 234 567 890&apos;
formatter.formatToParts(123456n);
// → [
// →   { type: &apos;integer&apos;, value: &apos;123&apos; },
// →   { type: &apos;group&apos;, value: &apos; &apos; },
// →   { type: &apos;integer&apos;, value: &apos;456&apos; }
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
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;kilobyte&apos;,
});
formatter.format(1.234);
// → &apos;1.234 kB&apos;
formatter.format(123.4);
// → &apos;123.4 kB&apos;
```

時間とともに、より多くの単位のサポートが追加される可能性があります。最新の情報については仕様の[最新リスト](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers)をご覧ください。

上記の単純単位を組み合わせて、「1エーカーあたりのリットル」や「1秒あたりのメートル」のような複合単位を表現することができます。

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
});
formatter.format(299792458);
// → &apos;299,792,458 m/s&apos;
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
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;standard&apos;, // デフォルトの設定。
  });
  formatter.format(1234.56);
  // → &apos;1,234.56&apos;
  formatter.format(123456);
  // → &apos;123,456&apos;
  formatter.format(123456789);
  // → &apos;123,456,789&apos;
}

{
  // コンパクト記法のテスト。
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;compact&apos;,
  });
  formatter.format(1234.56);
  // → &apos;1.2K&apos;
  formatter.format(123456);
  // → &apos;123K&apos;
  formatter.format(123456789);
  // → &apos;123M&apos;
}
```

:::note
注意: デフォルトでは、コンパクト記法は最も近い整数に丸め、常に2つの有効数字を保持します。`{minimum,maximum}FractionDigits`または`{minimum,maximum}SignificantDigits`のいずれかを設定することで、この動作を上書きすることができます。
:::

`Intl.NumberFormat`は、[科学記数法](https://en.wikipedia.org/wiki/Scientific_notation)で数値をフォーマットすることもできます:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;scientific&apos;,
});
formatter.format(299792458);
// → &apos;2.998E8 m/s&apos;
```

[工学記数法](https://en.wikipedia.org/wiki/Engineering_notation)もサポートされています:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;engineering&apos;,
});
formatter.format(299792458);
// → &apos;299.792E6 m/s&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 符号表示

特定の状況（例えば差分を表示する場合）では、数値が正であっても符号を明示的に表示することが役立ちます。新しい`signDisplay`オプションを使用するとこれが可能になります:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;percent&apos;,
  signDisplay: &apos;always&apos;,
});
formatter.format(-12.34);
// → &apos;-12.34%&apos;
formatter.format(12.34);
// → &apos;+12.34%&apos;
formatter.format(0);
// → &apos;+0%&apos;
formatter.format(-0);
// → &apos;-0%&apos;
```

値が`0`のときに符号を表示しないようにするには、`signDisplay: &apos;exceptZero&apos;`を使用します:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;percent&apos;,
  signDisplay: &apos;exceptZero&apos;,
});
formatter.format(-12.34);
// → &apos;-12.34%&apos;
formatter.format(12.34);
// → &apos;+12.34%&apos;
formatter.format(0);
// → &apos;0%&apos;
// 注意: -0は期待通りに符号付きで表示されます:
formatter.format(-0);
// → &apos;-0%&apos;
```

通貨の場合、`currencySign`オプションにより_会計フォーマット_が有効になります。これは負の通貨額をローカル固有のフォーマットで表示します。例えば、金額を括弧内に表示するなどです:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;currency&apos;,
  currency: &apos;USD&apos;,
  signDisplay: &apos;exceptZero&apos;,
  currencySign: &apos;accounting&apos;,
});
formatter.format(-12.34);
// → &apos;($12.34)&apos;
formatter.format(12.34);
// → &apos;+$12.34&apos;
formatter.format(0);
// → &apos;$0.00&apos;
formatter.format(-0);
// → &apos;($0.00)&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 詳細情報

関連する[仕様提案](https://github.com/tc39/proposal-unified-intl-numberformat)には、各`Intl.NumberFormat`機能個別の特徴検出方法を含む、詳細情報や例が記載されています。
