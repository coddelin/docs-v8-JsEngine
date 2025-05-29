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
description: &apos;`Intl.RelativeTimeFormat`は、パフォーマンスを犠牲にすることなく、相対的な時刻のローカライズされた形式化を可能にします。&apos;
tweet: &apos;1054387117571354624&apos;
---
現代のウェブアプリケーションでは、完全な日付やタイムスタンプの代わりに「昨日」「42秒前」「3ヶ月後」といったフレーズを使用することが増えています。このような_相対的な時刻形式の値_は非常に一般的となり、いくつかの人気のあるライブラリがこれをローカライズして形式化するユーティリティ関数を実装しています。（例として、[Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize)、[date-fns](https://date-fns.org/docs/)があります。）

<!--truncate-->
ローカライズされた相対時刻形式を実装する際の問題の一つは、サポートしたい言語ごとに慣用的な単語やフレーズ（「昨日」や「前四半期」など）のリストが必要になることです。[Unicode CLDR](http://cldr.unicode.org/)はこのデータを提供していますが、それをJavaScriptで使用するには、ライブラリコードと一緒に埋め込んで送信する必要があります。このことがライブラリのバンドルサイズを増加させ、ロード時間、パース・コンパイルコスト、メモリ消費に悪影響を与えます。

新しい`Intl.RelativeTimeFormat`APIはその負担をJavaScriptエンジンに移します。このエンジンはロケールデータを提供し、JavaScript開発者が直接利用できるようにします。`Intl.RelativeTimeFormat`は、パフォーマンスを犠牲にすることなく、相対的な時刻のローカライズされた形式化を可能にします。

## 使用例

次の例は、英語を使用して相対時刻フォーマッタを作成する方法を示しています。

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

引数として渡される`Intl.RelativeTimeFormat`コンストラクタは、[BCP 47言語タグ](https://tools.ietf.org/html/rfc5646)を保持する文字列または[そのような言語タグの配列](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)のいずれかである可能性があります。

次は、異なる言語（スペイン語）を使用する例です。

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

さらに、`Intl.RelativeTimeFormat`コンストラクタは、出力を細かく制御するためのオプション引数を受け取ります。柔軟性を示すために、デフォルト設定に基づく英語の出力の例をいくつか見てみましょう。

```js
// 英語を使用する相対時刻フォーマッタを作成し、
// デフォルト設定（以前と同様）を使用します。この例では、デフォルト値が明示的に渡されています。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos; // 他の値: &apos;lookup&apos;
  style: &apos;long&apos;, // 他の値: &apos;short&apos; または &apos;narrow&apos;
  numeric: &apos;always&apos;, // 他の値: &apos;auto&apos;
});

// 特別なケースを試してみましょう！

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

上記のフォーマッタが`&apos;1 day ago&apos;`ではなく`&apos;yesterday&apos;`を生成し、少し不自然な`&apos;in 0 weeks&apos;`ではなく`&apos;this week&apos;`を生成したことに気付いたかもしれません。デフォルトでは、フォーマッタは出力で数値を使用します。

この動作を変更するには、`numeric`オプションを暗黙的なデフォルト値の`&apos;always&apos;`ではなく`&apos;auto&apos;`に設定します：

```js
// 出力で常に数値を使用する必要がない英語用の相対時刻フォーマッタを作成します。
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

他の`Intl`クラスに類似して、`Intl.RelativeTimeFormat`には`format`メソッドに加えて`formatToParts`メソッドがあります。`format`は最も一般的な使用例を網羅していますが、生成された出力の個々の部分にアクセスする必要がある場合に`formatToParts`が役立つことがあります。

```js
// 英語で常に数値を使わなくてもよい出力をするための
// 相対時間フォーマッタを作成します。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;昨日&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;昨日&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;3週間後&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;3週間後&apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;week&apos; },
//    { type: &apos;literal&apos;, value: &apos;週間&apos; }]
```

その他のオプションとその動作についての詳細は、[提案リポジトリのAPI文書](https://github.com/tc39/proposal-intl-relative-time#api)をご覧ください。

## 結論

`Intl.RelativeTimeFormat`はV8 v7.1およびChrome 71でデフォルトで利用可能です。このAPIがより広く利用可能になるにつれて、[Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize)、および[date-fns](https://date-fns.org/docs/)のようなライブラリが、ハードコードされたCLDRデータベースへの依存をやめ、ネイティブの相対時間フォーマット機能を採用するようになります。その結果、ロード時間のパフォーマンス、解析とコンパイル時間のパフォーマンス、実行時のパフォーマンス、メモリ使用量が改善されるでしょう。

## `Intl.RelativeTimeFormat`のサポート

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
