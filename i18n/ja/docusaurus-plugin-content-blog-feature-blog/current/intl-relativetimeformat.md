---
title: "`Intl.RelativeTimeFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: "`Intl.RelativeTimeFormat`は、パフォーマンスを犠牲にすることなく、相対的な時刻のローカライズされた形式化を可能にします。"
tweet: "1054387117571354624"
---
現代のウェブアプリケーションでは、完全な日付やタイムスタンプの代わりに「昨日」「42秒前」「3ヶ月後」といったフレーズを使用することが増えています。このような_相対的な時刻形式の値_は非常に一般的となり、いくつかの人気のあるライブラリがこれをローカライズして形式化するユーティリティ関数を実装しています。（例として、[Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize)、[date-fns](https://date-fns.org/docs/)があります。）

<!--truncate-->
ローカライズされた相対時刻形式を実装する際の問題の一つは、サポートしたい言語ごとに慣用的な単語やフレーズ（「昨日」や「前四半期」など）のリストが必要になることです。[Unicode CLDR](http://cldr.unicode.org/)はこのデータを提供していますが、それをJavaScriptで使用するには、ライブラリコードと一緒に埋め込んで送信する必要があります。このことがライブラリのバンドルサイズを増加させ、ロード時間、パース・コンパイルコスト、メモリ消費に悪影響を与えます。

新しい`Intl.RelativeTimeFormat`APIはその負担をJavaScriptエンジンに移します。このエンジンはロケールデータを提供し、JavaScript開発者が直接利用できるようにします。`Intl.RelativeTimeFormat`は、パフォーマンスを犠牲にすることなく、相対的な時刻のローカライズされた形式化を可能にします。

## 使用例

次の例は、英語を使用して相対時刻フォーマッタを作成する方法を示しています。

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

引数として渡される`Intl.RelativeTimeFormat`コンストラクタは、[BCP 47言語タグ](https://tools.ietf.org/html/rfc5646)を保持する文字列または[そのような言語タグの配列](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)のいずれかである可能性があります。

次は、異なる言語（スペイン語）を使用する例です。

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

さらに、`Intl.RelativeTimeFormat`コンストラクタは、出力を細かく制御するためのオプション引数を受け取ります。柔軟性を示すために、デフォルト設定に基づく英語の出力の例をいくつか見てみましょう。

```js
// 英語を使用する相対時刻フォーマッタを作成し、
// デフォルト設定（以前と同様）を使用します。この例では、デフォルト値が明示的に渡されています。
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit' // 他の値: 'lookup'
  style: 'long', // 他の値: 'short' または 'narrow'
  numeric: 'always', // 他の値: 'auto'
});

// 特別なケースを試してみましょう！

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

上記のフォーマッタが`'1 day ago'`ではなく`'yesterday'`を生成し、少し不自然な`'in 0 weeks'`ではなく`'this week'`を生成したことに気付いたかもしれません。デフォルトでは、フォーマッタは出力で数値を使用します。

この動作を変更するには、`numeric`オプションを暗黙的なデフォルト値の`'always'`ではなく`'auto'`に設定します：

```js
// 出力で常に数値を使用する必要がない英語用の相対時刻フォーマッタを作成します。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

他の`Intl`クラスに類似して、`Intl.RelativeTimeFormat`には`format`メソッドに加えて`formatToParts`メソッドがあります。`format`は最も一般的な使用例を網羅していますが、生成された出力の個々の部分にアクセスする必要がある場合に`formatToParts`が役立つことがあります。

```js
// 英語で常に数値を使わなくてもよい出力をするための
// 相対時間フォーマッタを作成します。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → '昨日'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: '昨日' }]

rtf.format(3, 'week');
// → '3週間後'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: '3週間後' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: '週間' }]
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
