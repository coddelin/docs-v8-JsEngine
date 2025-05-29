---
title: 'V8リリース v7.1'
author: 'Stephan Herhut ([@herhut](https://twitter.com/herhut)), クローン作成者のクローン'
avatars:
  - stephan-herhut
date: 2018-10-31 15:44:37
tags:
  - リリース
description: 'V8 v7.1 では、埋め込みバイトコードハンドラー、改良されたTurboFanエスケープ分析、postMessage(wasmModule)、Intl.RelativeTimeFormat、そしてglobalThisが導入されています！'
tweet: '1057645773465235458'
---
6週間ごとに、私たちはV8の新しいブランチを[リリースプロセス](/docs/release-process)の一環として作成します。各バージョンは、Chrome Betaのマイルストーン直前にV8のGitマスターからブランチされます。本日は、最新のブランチ[V8バージョン7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1)を発表できることを嬉しく思います。これは数週間でChrome 71 Stableと連携してリリースされるまでベータ版です。V8 v7.1は、開発者向けの便利な機能で満たされています。この投稿では、リリースに向けたハイライトの一部をプレビューとして紹介します。

<!--truncate-->
## メモリ

v6.9/v7.0での[バイナリにビルトインを直接埋め込む](https://v8.dev/blog/embedded-builtins)作業に続いて、インタープリター用のバイトコードハンドラーも[バイナリに埋め込まれるようになりました](https://bugs.chromium.org/p/v8/issues/detail?id=8068)。これにより、Isolateごとに平均約200 KBが節約されます。

## パフォーマンス

TurboFanのエスケープ分析が改良され、最適化ユニットにローカルなオブジェクトだけでなく、[高階関数のローカル関数コンテキストも処理できるようになりました](https://bit.ly/v8-turbofan-context-sensitive-js-operators)。以下の例を考えてみましょう:

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

注目すべきは、`x`がローカルクロージャー`y => y + x`の自由変数である点です。V8 v7.1では、`x`のコンテキスト割り当てを完全に省略することが可能となり、一部の場合で最大**40%**の改善が得られます。

![新しいエスケープ分析によるパフォーマンス改善(値が小さいほど良い)](/_img/v8-release-71/improved-escape-analysis.svg)

エスケープ分析は、ローカル配列への変数インデックスアクセスの一部についても削除可能となりました。以下はその例です:

```js
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; ++i)
    total += args[i];
  return total;
}

function sum2(x, y) {
  return sum(x, y);
}
```

注意すべき点は、`args`が`sum2`にローカルであることです（`sum`が`sum2`にインライン展開されると仮定）。V8 v7.1では、TurboFanが`args`の割り当てを完全に除去し、インデックスアクセス`args[i]`を三項演算子`i === 0 ? x : y`で置き換えることが可能になりました。これにより、JetStream/EarleyBoyerベンチマークで約2%の改善が得られます。将来的に、要素が2つ以上の配列にもこの最適化を拡張する可能性があります。

## Wasmモジュールの構造化複製

ついに、[`postMessage`がWasmモジュールに対応しました](https://github.com/WebAssembly/design/pull/1074)。`WebAssembly.Module`オブジェクトは、ウェブワーカーに`postMessage`で送信できるようになりました。ただし、これはウェブワーカー（同じプロセス内の別スレッド）に限定されており、クロスプロセスシナリオ（クロスオリジン`postMessage`や共有ウェブワーカーなど）には拡張されていません。

## JavaScript言語機能

[`Intl.RelativeTimeFormat` API](/features/intl-relativetimeformat)は、ローカライズされた相対時刻（例: 「昨日」、「42秒前」、「3か月後」など）のフォーマットを可能にしながら性能を犠牲にしません。以下はその例です:

```js
// 英語の言語で、出力で常に数値を使用する必要がない
// 相対時間フォーマッターを作成します。
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

[`Intl.RelativeTimeFormat`の解説はこちらをご覧ください](/features/intl-relativetimeformat)。

V8 v7.1は[`globalThis`提案](/features/globalthis)もサポートし、厳密関数やモジュールでもプラットフォームに依存せずグローバルオブジェクトにアクセスできる普遍的なメカニズムを実現します。

## V8 API

API変更のリストを取得するには、`git log branch-heads/7.0..branch-heads/7.1 include/v8.h`を使用してください。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 7.1 -t branch-heads/7.1`を使用してV8 v7.1の新機能を試すことができます。あるいは[ChromeのBetaチャネルに登録](https://www.google.com/chrome/browser/beta.html)し、すぐに新機能を試してみることもできます。
