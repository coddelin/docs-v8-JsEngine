---
title: "`Intl.PluralRules`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-10-04
tags: 
  - Intl
description: "複数形を処理することは、一見簡単そうに見えますが、実際には言語ごとにそれぞれの複数形ルールがあります。Intl.PluralRules API がその助けになります！"
tweet: "915542989493202944"
---
国際化（Iñtërnâtiônàlizætiøn）は難しいです。複数形を処理することは、一見簡単そうに見えますが、実際には言語ごとにそれぞれの複数形ルールがあります。

英語の複数形に関しては、可能な結果は2種類だけです。「猫（cat）」という言葉を例にしましょう：

- 1 cat、すなわち英語で一つのものとされる `'one'` 形式
- 2 cats、そして 42 cats、0.5 cats など、つまり唯一のもう一つの形式となる `'other'`（英語では複数形とされます）。

新しい [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) を使用すると、指定された数に基づいて選択した言語にどの形式が適用されるかを判断できます。

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (例: '0 cats')
pr.select(0.5); // 'other' (例: '0.5 cats')
pr.select(1);   // 'one'   (例: '1 cat')
pr.select(1.5); // 'other' (例: '0.5 cats')
pr.select(2);   // 'other' (例: '0.5 cats')
```

<!--truncate-->
他の国際化 API とは異なり、`Intl.PluralRules` は自体ではフォーマットを実行しない低レベルの API です。これに基づいて独自のフォーマッタを構築できます：

```js
const suffixes = new Map([
  // 注: 実際のシナリオでは、複数形をこのようにハードコーディングすることはありません;
  // それらは翻訳ファイルの一部となります。
  ['one',   'cat'],
  ['other', 'cats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 cat'
formatCats(0);   // '0 cats'
formatCats(0.5); // '0.5 cats'
formatCats(1.5); // '1.5 cats'
formatCats(2);   // '2 cats'
```

比較的単純な英語の複数形ルールでは、これは大げさに思えるかもしれません; しかし、すべての言語が同じルールに従っているわけではありません。いくつかの言語は単一の複数形形式しか持たず、いくつかの言語は複数の形式を持っています。[ウェールズ語](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules)には、6つの異なる複数形形式があります！

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // 注: この単語の場合、`two` 形式は特定の単語については `'one'` 形式と同じですが、
  // ウェールズ語のすべての単語に対して真ではありません。
  ['two',   'gath'],
  ['few',   'cath'],
  ['many',  'chath'],
  ['other', 'cath'],
]);
const pr = new Intl.PluralRules('cy');
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // '0 cathod'
formatWelshCats(1);   // '1 gath'
formatWelshCats(1.5); // '1.5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

複数の言語をサポートしつつ正確な複数形の処理を実現するには、言語とその複数形ルールのデータベースが必要です。[Unicode CLDR](http://cldr.unicode.org/) にはこれらのデータが含まれていますが、JavaScript で使用するには、JavaScript コードと一緒に埋め込んで配布する必要があります。これによりロード時間、解析時間、およびメモリ使用量が増加します。`Intl.PluralRules` API はその負担を JavaScript エンジンに移し、より効率的な国際化された複数形対応を可能にします。

:::note
**注意:** CLDR データには、言語ごとの形式のマッピングが含まれていますが、個々の単語の単数/複数形式のリストは含まれていません。それらは引き続き自分で翻訳して提供する必要があります。
:::

## 序数

`Intl.PluralRules` API は、オプションの `options` 引数にある `type` プロパティを介してさまざまな選択ルールをサポートしています。その暗黙のデフォルト値（上記の例で使用されているもの）は `'cardinal'` です。代わりに、指定された数の序数指標（例： `1` → `1st`, `2` → `2nd` など）を見つけるには、`{ type: 'ordinal' }` を使用してください：

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0th'
formatOrdinals(1);   // '1st'
formatOrdinals(2);   // '2nd'
formatOrdinals(3);   // '3rd'
formatOrdinals(4);   // '4th'
formatOrdinals(11);  // '11th'
formatOrdinals(21);  // '21st'
formatOrdinals(42);  // '42nd'
formatOrdinals(103); // '103rd'
```

`Intl.PluralRules`は他の国際化の機能と比較して低レベルのAPIです。そのため、たとえ直接使用していない場合でも、それに依存するライブラリやフレームワークを間接的に使用している可能性があります。

このAPIがより広く利用可能になるにつれ、[Globalize](https://github.com/globalizejs/globalize#plural-module)のようなライブラリは、ハードコーディングされたCLDRデータベースへの依存をネイティブ機能に移行し、読み込み時間のパフォーマンス、解析時間のパフォーマンス、実行時間のパフォーマンス、およびメモリ使用量を向上させるでしょう。

## `Intl.PluralRules`のサポート

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
