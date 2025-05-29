---
title: 'より高速で多機能な国際化API'
author: '[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)'
date: 2019-04-25 16:45:37
avatars:
  - 'sathya-gunasekaran'
tags:
  - ECMAScript
  - Intl
description: 'JavaScriptの国際化APIが拡張され、V8での実装がより高速化しています！'
tweet: '1121424877142122500'
---
[ECMAScript国際化APIの仕様書](https://tc39.es/ecma402/) (ECMA-402、または`Intl`) は、日付フォーマット、数値フォーマット、複数形選択、並べ替えなどのロケール固有の重要な機能を提供します。Chrome V8とGoogle国際化チームは、V8のECMA-402の実装に機能を追加しつつ、技術的負債を整理し、パフォーマンスや他のブラウザとの互換性を向上させる取り組みを行っています。

<!--truncate-->
## 基本的なアーキテクチャ改善

当初、ECMA-402仕様は主にV8拡張を使用しJavaScriptで実装され、V8コーディングベースの外部に存在していました。外部拡張APIの使用は、型チェック、外部C++オブジェクトのライフタイム管理、内部プライベートデータのストレージに関するV8の内部API利用を制限しました。スタートアップ性能を改善する一環として、この実装は後にV8コードベースに移動され、これらのビルトインの[スナップショット作成](/blog/custom-startup-snapshots)が可能になりました。

V8は専門化された`JSObject`を使用し、ECMAScriptで指定されたJavaScriptのビルトインオブジェクト（`Promise`、`Map`、`Set`など）を記述するためのカスタム[シェイプ（隠しクラス）](https://mathiasbynens.be/notes/shapes-ics)を持っています。この方法を活用することで、必要な内部スロット数を事前に割り当て、高速なアクセスを生成できます。この結果物件を段階的に1つずつ追加する必要が無くなり、性能が向上しメモリ使用が改善されます。

`Intl`の実装は、歴史的な分離の影響でこのようなアーキテクチャに基づいていませんでした。その結果、国際化仕様で指定されるビルトインJavaScriptオブジェクト（`NumberFormat`、`DateTimeFormat`など）は、一般的な`JSObject`とされ、内部スロットのいくつかのプロパティ追加の処理が必要でした。

専門化された`JSObject`が欠けているもう1つの影響として、型チェックがより複雑になりました。型情報はプライベートシンボルの下に保存され、費用がかかるプロパティアクセスで型チェックがJS側とC++側で行われました。専用のシェイプを見るよりも効率的ではありませんでした。

### コードベースの近代化

現在、V8でのセルフホストビルトインの記述から遠ざかる動きの中で、ECMA402実装を近代化する良い機会となりました。

### セルフホストJSからの移行

セルフホスティングは簡潔で読み取りやすいコードを提供しますが、ICU APIへのアクセスのための遅いランタイム呼び出しが頻繁に使用されることで、性能の問題が生じました。この結果、多くのICU機能がJavaScriptで複製され、ランタイム呼び出しの数を削減しました。

ビルトインをC++で書き直すことで、ランタイム呼び出しのオーバーヘッドがなくなり、ICU APIへのアクセスがはるかに高速化しました。

### ICUの改善

ICUは、Unicodeおよびグローバリゼーションのサポートを提供するために使用されるC/C++ライブラリセットで、主要なJavaScriptエンジンを含む多くのアプリケーションによって使用されています。`Intl`をV8のICUベースの実装に切り替える過程で、[いくつか](https://unicode-org.atlassian.net/browse/ICU-20140)の[ICUのバグ](https://unicode-org.atlassian.net/browse/ICU-9562)を[発見し](https://unicode-org.atlassian.net/browse/ICU-20098)、修正しました。

新しい提案を実装する一環として、[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat)、[`Intl.ListFormat`](/features/intl-listformat) 、`Intl.Locale`のような場合、これらの新しいECMAScript提案をサポートするためにICUを拡張し、[いくつか](https://unicode-org.atlassian.net/browse/ICU-13256)の[新しい](https://unicode-org.atlassian.net/browse/ICU-20121)[API](https://unicode-org.atlassian.net/browse/ICU-20342)を追加しました。

これらの追加は、他のJavaScriptエンジンがこれらの提案を迅速に実装するのを助け、ウェブの進化を推進します！例えば、FirefoxではICU作業を基にした複数の新しい`Intl` APIの実装が進行中です。

## パフォーマンス

この作業の結果として、いくつかの高速なパスを最適化し、さまざまな`Intl`オブジェクトと`Number.prototype`、`Date.prototype`、`String.prototype`の`toLocaleString`メソッドの初期化をキャッシュすることで、国際化APIの性能を向上させました。

たとえば、新しい`Intl.NumberFormat`オブジェクトの作成は約24倍高速化されました。

![[Microbenchmarks](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js) 各種`Intl`オブジェクトの作成性能をテストしたもの](/_img/intl/performance.svg)

より良いパフォーマンスを得るために、`toLocaleString`や`localeCompare`のようなメソッドを呼び出す代わりに、`Intl.NumberFormat`、`Intl.DateTimeFormat`、または`Intl.Collator`オブジェクトを明確に作成して*再利用*することをお勧めします。

## 新しい`Intl`機能

これらすべての作業は、新機能を構築するための素晴らしい基盤を提供しており、ステージ3にある新しい国際化提案をすべて引き続き提供しています。

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) はChrome 71で提供され、[`Intl.ListFormat`](/features/intl-listformat)はChrome 72で、[`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale)はChrome 74で提供されています。また、[`Intl.DateTimeFormat`用の`dateStyle`と`timeStyle`オプション](https://github.com/tc39/proposal-intl-datetime-style)および[`Intl.DateTimeFormat`のためのBigIntサポート](https://github.com/tc39/ecma402/pull/236)はChrome 76で提供されます。[`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange)、[`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/)、および[`Intl.NumberFormat`用の追加オプション](https://github.com/tc39/proposal-unified-intl-numberformat/)が現在V8で開発中で、近日中に提供される予定です！

これらの新しいAPIの多くや、さらにその先にあるものは、開発者が国際化を支援できるように新機能を標準化するための取り組みの成果です。[`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames)は、言語、地域、またはスクリプトの表示名をローカライズできるステージ1の提案です。[`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange)は、日付範囲を簡潔かつロケール対応でフォーマットする方法を定義するステージ3提案です。[統合された`Intl.NumberFormat` API提案](https://github.com/tc39/proposal-unified-intl-numberformat)は、測定単位、通貨表示ポリシー、符号表示ポリシー、科学的記数法、およびコンパクト表記のサポートを追加することで`Intl.NumberFormat`を改善するステージ3提案です。あなたも[そのGitHubリポジトリ](https://github.com/tc39/ecma402)で貢献することでECMA-402の未来に関与できます。

## 結論

`Intl`は、ウェブアプリを国際化する際に必要となるいくつかの操作のための機能豊富なAPIを提供しており、多量のデータやコードを送信することなく、その重労働をブラウザに委ねられます。これらのAPIを適切に使用することで、異なるロケールでUIがより良く機能するようになります。Google V8チームとi18nチームが、TC39とそのサブグループであるECMA-402と協力して取り組んだ成果により、より優れたパフォーマンスでより多くの機能にアクセスできるようになり、将来的にはさらに改善が期待されます。
