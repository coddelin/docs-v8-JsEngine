---
title: &apos;`Intl.PluralRules`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-10-04
tags:
  - Intl
description: &apos;複数形を処理することは、一見簡単そうに見えますが、実際には言語ごとにそれぞれの複数形ルールがあります。Intl.PluralRules API がその助けになります！&apos;
tweet: &apos;915542989493202944&apos;
---
国際化（Iñtërnâtiônàlizætiøn）は難しいです。複数形を処理することは、一見簡単そうに見えますが、実際には言語ごとにそれぞれの複数形ルールがあります。

英語の複数形に関しては、可能な結果は2種類だけです。「猫（cat）」という言葉を例にしましょう：

- 1 cat、すなわち英語で一つのものとされる `&apos;one&apos;` 形式
- 2 cats、そして 42 cats、0.5 cats など、つまり唯一のもう一つの形式となる `&apos;other&apos;`（英語では複数形とされます）。

新しい [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) を使用すると、指定された数に基づいて選択した言語にどの形式が適用されるかを判断できます。

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;);
pr.select(0);   // &apos;other&apos; (例: &apos;0 cats&apos;)
pr.select(0.5); // &apos;other&apos; (例: &apos;0.5 cats&apos;)
pr.select(1);   // &apos;one&apos;   (例: &apos;1 cat&apos;)
pr.select(1.5); // &apos;other&apos; (例: &apos;0.5 cats&apos;)
pr.select(2);   // &apos;other&apos; (例: &apos;0.5 cats&apos;)
```

<!--truncate-->
他の国際化 API とは異なり、`Intl.PluralRules` は自体ではフォーマットを実行しない低レベルの API です。これに基づいて独自のフォーマッタを構築できます：

```js
const suffixes = new Map([
  // 注: 実際のシナリオでは、複数形をこのようにハードコーディングすることはありません;
  // それらは翻訳ファイルの一部となります。
  [&apos;one&apos;,   &apos;cat&apos;],
  [&apos;other&apos;, &apos;cats&apos;],
]);
const pr = new Intl.PluralRules(&apos;en-US&apos;);
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // &apos;1 cat&apos;
formatCats(0);   // &apos;0 cats&apos;
formatCats(0.5); // &apos;0.5 cats&apos;
formatCats(1.5); // &apos;1.5 cats&apos;
formatCats(2);   // &apos;2 cats&apos;
```

比較的単純な英語の複数形ルールでは、これは大げさに思えるかもしれません; しかし、すべての言語が同じルールに従っているわけではありません。いくつかの言語は単一の複数形形式しか持たず、いくつかの言語は複数の形式を持っています。[ウェールズ語](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules)には、6つの異なる複数形形式があります！

```js
const suffixes = new Map([
  [&apos;zero&apos;,  &apos;cathod&apos;],
  [&apos;one&apos;,   &apos;gath&apos;],
  // 注: この単語の場合、`two` 形式は特定の単語については `&apos;one&apos;` 形式と同じですが、
  // ウェールズ語のすべての単語に対して真ではありません。
  [&apos;two&apos;,   &apos;gath&apos;],
  [&apos;few&apos;,   &apos;cath&apos;],
  [&apos;many&apos;,  &apos;chath&apos;],
  [&apos;other&apos;, &apos;cath&apos;],
]);
const pr = new Intl.PluralRules(&apos;cy&apos;);
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // &apos;0 cathod&apos;
formatWelshCats(1);   // &apos;1 gath&apos;
formatWelshCats(1.5); // &apos;1.5 cath&apos;
formatWelshCats(2);   // &apos;2 gath&apos;
formatWelshCats(3);   // &apos;3 cath&apos;
formatWelshCats(6);   // &apos;6 chath&apos;
formatWelshCats(42);  // &apos;42 cath&apos;
```

複数の言語をサポートしつつ正確な複数形の処理を実現するには、言語とその複数形ルールのデータベースが必要です。[Unicode CLDR](http://cldr.unicode.org/) にはこれらのデータが含まれていますが、JavaScript で使用するには、JavaScript コードと一緒に埋め込んで配布する必要があります。これによりロード時間、解析時間、およびメモリ使用量が増加します。`Intl.PluralRules` API はその負担を JavaScript エンジンに移し、より効率的な国際化された複数形対応を可能にします。

:::note
**注意:** CLDR データには、言語ごとの形式のマッピングが含まれていますが、個々の単語の単数/複数形式のリストは含まれていません。それらは引き続き自分で翻訳して提供する必要があります。
:::

## 序数

`Intl.PluralRules` API は、オプションの `options` 引数にある `type` プロパティを介してさまざまな選択ルールをサポートしています。その暗黙のデフォルト値（上記の例で使用されているもの）は `&apos;cardinal&apos;` です。代わりに、指定された数の序数指標（例： `1` → `1st`, `2` → `2nd` など）を見つけるには、`{ type: &apos;ordinal&apos; }` を使用してください：

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;, {
  type: &apos;ordinal&apos;
});
const suffixes = new Map([
  [&apos;one&apos;,   &apos;st&apos;],
  [&apos;two&apos;,   &apos;nd&apos;],
  [&apos;few&apos;,   &apos;rd&apos;],
  [&apos;other&apos;, &apos;th&apos;],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // &apos;0th&apos;
formatOrdinals(1);   // &apos;1st&apos;
formatOrdinals(2);   // &apos;2nd&apos;
formatOrdinals(3);   // &apos;3rd&apos;
formatOrdinals(4);   // &apos;4th&apos;
formatOrdinals(11);  // &apos;11th&apos;
formatOrdinals(21);  // &apos;21st&apos;
formatOrdinals(42);  // &apos;42nd&apos;
formatOrdinals(103); // &apos;103rd&apos;
```

`Intl.PluralRules`は他の国際化の機能と比較して低レベルのAPIです。そのため、たとえ直接使用していない場合でも、それに依存するライブラリやフレームワークを間接的に使用している可能性があります。

このAPIがより広く利用可能になるにつれ、[Globalize](https://github.com/globalizejs/globalize#plural-module)のようなライブラリは、ハードコーディングされたCLDRデータベースへの依存をネイティブ機能に移行し、読み込み時間のパフォーマンス、解析時間のパフォーマンス、実行時間のパフォーマンス、およびメモリ使用量を向上させるでしょう。

## `Intl.PluralRules`のサポート

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
