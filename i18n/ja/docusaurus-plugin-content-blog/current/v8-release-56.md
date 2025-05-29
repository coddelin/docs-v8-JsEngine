---
title: 'V8 リリース v5.6'
author: 'V8 チーム'
date: 2016-12-02 13:33:37
tags:
  - リリース
description: 'V8 v5.6は、新しいコンパイラパイプライン、パフォーマンスの向上、そしてECMAScript言語機能のサポートが増強されています。'
---
毎6週間ごとに、私たちはV8の新しいブランチを作成します。これは私たちの[リリースプロセス](/docs/release-process)の一環です。それぞれのバージョンはChrome Betaのマイルストーン直前にV8のGitマスターから分岐されます。本日は最新のブランチ、[V8 バージョン 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6)を発表できることを嬉しく思います。このバージョンは数週間後にChrome 56 Stableと連携してリリースされるまで、ベータ版となります。V8 5.6は開発者向けの魅力的な要素で満たされていますので、リリースに向けたハイライトをいくつか紹介したいと思います。

<!--truncate-->
## ES.next（およびその他）向けのIgnitionとTurboFanパイプラインが搭載

5.6から、V8はJavaScript言語全体を最適化することができます。さらに、多くの言語機能はV8の新しい最適化パイプラインを通じて処理されます。このパイプラインは、V8の[Ignitionインタープリタ](/blog/ignition-interpreter)をベースラインとして使用し、頻繁に実行されるメソッドをV8のより強力な[TurboFan最適化コンパイラ](/docs/turbofan)で最適化します。この新しいパイプラインは、新しい言語機能（例：ES2015とES2016仕様の多くの新機能）が追加された場合や、Crankshaft（[V8の「従来の」最適化コンパイラ](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)）が特定のメソッドを最適化できない場合（例：try-catch、with）に起動します。

なぜ一部のJavaScript言語機能のみを新しいパイプラインにルーティングするのか？新しいパイプラインは、JS言語の全スペクトラム（過去と現在）の最適化により適しており、より健康的でモダンなコードベースであり、低メモリデバイスでの使用を含む実際のユースケース向けに特別に設計されています。

私たちはV8に追加された最新のES.next機能（ES.next = ES2015以降で指定されたJavaScriptの機能）を使用してIgnition/TurboFanを使用し始めており、性能を向上させながらより多くの機能をそれにルーティングする予定です。中期的には、V8チームはV8のすべてのJavaScript実行を新しいパイプラインに切り替えることを目指しています。ただし、短期的には、Crankshaftが新しいIgnition/TurboFanパイプラインよりもJavaScriptを高速に実行する場合の実際のユースケースが存在する限り、両方のパイプラインをサポートして、すべての状況でV8内で実行されるJavaScriptコードが可能な限り高速になるようにします。

では、なぜ新しいパイプラインが新しいIgnitionインタープリタと新しいTurboFan最適化コンパイラの両方を使用するのか？JavaScriptを迅速かつ効率的に実行するには、JavaScript仮想マシン内で実行の詳細な作業を行うための複数のメカニズムまたは階層を持つ必要があります。例えば、コードを迅速に実行し始める最初の階層を持つことと、ホットな関数をより長くコンパイルして長時間実行するコードの性能を最大化する最適化階層を持つことが役立ちます。

IgnitionとTurboFanは、V8の2つの新しい実行階層であり、互いに一緒に使用することで最も効果的です。効率性、シンプルさ、サイズを考慮して、TurboFanはV8のIgnitionインタープリタが生成する[バイトコード](https://en.wikipedia.org/wiki/Bytecode)からJavaScriptメソッドを最適化するように設計されています。両方のコンポーネントを密接に連携するように設計することで、互いの存在によって最適化が実現されます。その結果、TurboFanによって最適化されるすべての関数は最初にIgnitionインタープリタを通じて実行されます。この統一されたIgnition/TurboFanパイプラインを使用すると、これまで最適化できなかった機能の最適化が可能になり、TurboFanの最適化プロセスの利点を活用できます。例えば、[ジェネレーター](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)をIgnitionとTurboFanの両方を通じてルーティングすることで、ジェネレーターのランタイム性能が約3倍に向上しました。

V8がIgnitionとTurboFanを採用する旅についての詳細は、[Benediktのブログ投稿](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/)をご覧ください。

## パフォーマンスの改善

V8 v5.6は、メモリとパフォーマンスのフットプリントにおける多くの重要な改善を提供します。

### メモリによるジャンクの軽減

[並行リメンバーセットフィルタリング](https://bugs.chromium.org/p/chromium/issues/detail?id=648568)が導入されました：[Orinoco](/blog/orinoco)への一歩前進です。

### 大幅に向上したES2015のパフォーマンス

開発者は通常、新しい言語機能をトランスパイラを使用して導入します。その2つの課題は、互換性の後方性と性能への懸念です。

V8の目標は、トランスパイラーとV8の“ネイティブ”なES.nextのパフォーマンスとのギャップを縮小し、この課題を排除することです。新しい言語機能のパフォーマンスをトランスパイルされたES5と同等にするために大きな進展を遂げました。このリリースでは、ES2015の機能のパフォーマンスが以前のV8リリースよりも大幅に向上しており、場合によってはトランスパイルされたES5と同等のパフォーマンスに近づいています。

特に[spread](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator)演算子は、ネイティブで使用可能な準備ができているはずです。以前は以下のように書いていたところ…

```js
// Math.maxと同じですが、引数がない場合は-∞ではなく0を返します。
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

…今では以下のように書けます…

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

…そして類似のパフォーマンス結果を得られます。特にV8 v5.6には次のようなマイクロベンチマークの速度向上が含まれています：

- [destructuring](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [destructuring-array](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [destructuring-string](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [for-of-array](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [generator](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [spread](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [spread-generator](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [spread-literal](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

以下のチャートでV8 v5.4とv5.6の比較をご覧ください。

![V8 v5.4とv5.6のES2015機能パフォーマンスを[SixSpeed](https://fhinkel.github.io/six-speed/)で比較](/_img/v8-release-56/perf.png)

これは始まりに過ぎません。今後のリリースでさらに多くの改善が期待されます！

## 言語機能

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart)と[`String.prototype.padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd)は、ECMAScriptに追加された最新のステージ4機能です。これらのライブラリ関数はv5.6で正式にリリースされました。

:::note
**注意:** 再び未リリース状態に戻りました。
:::

## WebAssemblyブラウザプレビュー

Chromium 56（V8 v5.6を含む）はWebAssemblyのブラウザプレビューをリリースします。詳しくは[専用のブログ記事](/blog/webassembly-browser-preview)をご参照ください。

## V8 API

API変更の[概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは各主要リリースの数週間後に定期的に更新されています。

[アクティブなV8のチェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 5.6 -t branch-heads/5.6`コマンドを使用してV8 v5.6の新しい機能を試すことができます。または、[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して、新しい機能をお試しいただけます。
