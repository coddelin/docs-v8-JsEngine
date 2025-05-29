---
title: "V8 リリース v7.6"
author: "Adam Klein"
avatars:
  - "adam-klein"
date: 2019-06-19 16:45:00
tags:
  - リリース
description: "V8 v7.6では、Promise.allSettled、高速なJSON.parse、ローカライズされたBigInts、より迅速な凍結/封印された配列など、多くの新機能が追加されています！"
tweet: "1141356209179516930"
---
6週間ごとに、私たちはV8の新しいブランチを作成します。これは[リリースプロセス](/docs/release-process)の一環です。各バージョンはChrome Betaマイルストーンの直前にV8のGitマスターから分岐します。本日、数週間後にChrome 76 Stableと協調してリリースされるまでベータ版である、最新のブランチ[V8 バージョン 7.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6)を発表できることを嬉しく思います。V8 v7.6には開発者向けの数多くの機能が盛り込まれています。この投稿では、リリース前に注目すべきポイントのいくつかを紹介します。

<!--truncate-->
## パフォーマンス（サイズと速度）

### `JSON.parse` の改善

モダンなJavaScriptアプリケーションでは、JSONは構造化データを通信する形式として一般的に使用されています。JSON解析を高速化することで、この通信の遅延を削減できます。V8 v7.6では、JSONパーサーを全面的に改良し、JSONのスキャンと解析を大幅に高速化しました。これにより、人気のあるウェブページから提供されるデータの解析が最大2.7倍速くなります。

![さまざまなウェブサイトでの`JSON.parse`の性能向上を示すグラフ](/_img/v8-release-76/json-parsing.svg)

V8 v7.5まで、JSONパーサーは受信JSONデータのネスト深度に応じてネイティブスタックスペースを使用する再帰的なパーサーでした。そのため、非常に深くネストされたJSONデータではスタック不足が発生する可能性がありました。V8 v7.6では、利用可能なメモリによってのみ制限される独自のスタックを管理する反復型パーサーに切り替えました。

新しいJSONパーサーは、メモリ効率も向上しています。プロパティをバッファリングしてから最終的なオブジェクトを作成することで、結果を最適に割り当てる方法を決定できるようになりました。名前付きプロパティを持つオブジェクトの場合、受信JSONデータの名前付きプロパティに必要な正確なスペース量でオブジェクトを割り当てます（最大128個の名前付きプロパティ）。JSONオブジェクトがインデックス付きプロパティ名を含んでいる場合は、平坦な配列または辞書のいずれかの最小スペースを使用する要素のバックストアを割り当てます。JSON配列は、入力データ内の要素数に正確に適合した配列に解析されます。

### 凍結/封印された配列の改善

凍結または封印された配列（および配列状オブジェクト）での呼び出しの性能が多くの改善を受けました。V8 v7.6では、`frozen`が凍結または封印された配列または配列状オブジェクトである以下のJavaScriptコーディングパターンを高速化します。

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- `fn(...frozen)`のようなスプレッド呼び出し
- `fn(...[...frozen])`のようなネストされた配列スプレッドを含むスプレッド呼び出し
- `fn.apply(this, [...frozen])`のような配列スプレッド付きのapply呼び出し

以下のグラフは改善点を示しています。

![さまざまな配列操作での性能向上を示すグラフ](/_img/v8-release-76/frozen-sealed-elements.svg)

[詳細は「V8の高速凍結＆封印要素」設計文書をご覧ください。](https://bit.ly/fast-frozen-sealed-elements-in-v8)

### Unicode文字列の処理

[文字列をUnicodeに変換する](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea)最適化により、`String#localeCompare`、`String#normalize`、およびいくつかの`Intl` APIの呼び出しが大幅に高速化されました。たとえば、この変更により、1バイト文字列に対する`String#localeCompare`の生データ処理速度が約2倍向上しました。

## JavaScript言語機能

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled)は、入力されたすべてのプロミスが_解決済み_（_fulfilled_または_rejected_状態）になったときの信号を提供します。プロミスの状態に関係なく、作業が完了したかどうかを知りたい場合に有用です。[プロミス結合子に関する解説](/features/promise-combinators)にはさらに詳細な情報と例が含まれています。

### `BigInt`サポートの向上

[`BigInt`](/features/bigint)は、言語内のAPIサポートが改善されました。`toLocaleString`メソッドを使用することで、`BigInt`をローカルに対応した形式でフォーマットできるようになりました。これは通常の数値と同様に動作します。

```js
12345678901234567890n.toLocaleString('en'); // 🐌
// → '12,345,678,901,234,567,890'
12345678901234567890n.toLocaleString('de'); // 🐌
// → '12.345.678.901.234.567.890'
```

複数の数値や`BigInt`を同じロケールでフォーマットする予定がある場合は、現在`BigInt`をサポートしている`Intl.NumberFormat` APIの`format`と`formatToParts`メソッドを使用すると効率的です。この方法では、再利用可能な単一のフォーマットインスタンスを作成できます。

```js
const nf = new Intl.NumberFormat('fr');
nf.format(12345678901234567890n); // 🚀
// → '12 345 678 901 234 567 890'
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: 'integer', value: '123' },
// →   { type: 'group', value: ' ' },
// →   { type: 'integer', value: '456' }
// → ]
```

### `Intl.DateTimeFormat` の改善点

アプリは通常、ホテルの予約、サービスの請求期間、音楽フェスティバルなどのイベントの期間を示すために、日時間隔や範囲を表示します。`Intl.DateTimeFormat` API は、ロケール固有の形式で日時範囲を便利にフォーマットするための `formatRange` および `formatRangeToParts` メソッドをサポートするようになりました。

```js
const start = new Date('2019-05-07T09:20:00');
// → '2019年5月7日'
const end = new Date('2019-05-09T16:00:00');
// → '2019年5月9日'
const fmt = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const output = fmt.formatRange(start, end);
// → '2019年5月7日～9日'
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { 'type': 'month',   'value': 'May',  'source': 'shared' },
// →   { 'type': 'literal', 'value': ' ',    'source': 'shared' },
// →   { 'type': 'day',     'value': '7',    'source': 'startRange' },
// →   { 'type': 'literal', 'value': ' – ',  'source': 'shared' },
// →   { 'type': 'day',     'value': '9',    'source': 'endRange' },
// →   { 'type': 'literal', 'value': ', ',   'source': 'shared' },
// →   { 'type': 'year',    'value': '2019', 'source': 'shared' },
// → ]
```

さらに、`format`、`formatToParts`、および `formatRangeToParts` メソッドでは、新しい `timeStyle` および `dateStyle` オプションがサポートされるようになりました:

```js
const dtf = new Intl.DateTimeFormat('de', {
  timeStyle: 'medium',
  dateStyle: 'short'
});
dtf.format(Date.now());
// → '19.06.19, 13:33:37'
```

## ネイティブスタックウォーキング

V8 は、独自のコールスタックをウォークすることができます（例: DevTools でのデバッグやプロファイリング時）。ただし、Windows オペレーティングシステムでは、x64 アーキテクチャで TurboFan によって生成されたコードを含むコールスタックをウォークすることができませんでした。この制約により、V8 を使用するプロセスをネイティブデバッガーや ETW サンプリングで分析する際に「壊れたスタック」を引き起こす可能性がありました。最近の変更により、Windows がこれらのスタックを x64 でウォークできるようにするための必要なメタデータを [登録](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0)することが可能になり、v7.6 ではこれがデフォルトで有効になっています。

## V8 API

`git log branch-heads/7.5..branch-heads/7.6 include/v8.h` を使用して、API の変更点一覧を取得してください。

[アクティブな V8 チェックアウト](/docs/source-code#using-git) を持つ開発者は、`git checkout -b 7.6 -t branch-heads/7.6` を使用して V8 v7.6 の新機能を試すことができます。または、[Chrome のベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読して、自分で新機能を試すこともできます。
