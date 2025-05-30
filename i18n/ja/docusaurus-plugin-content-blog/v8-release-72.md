---
title: "V8リリース v7.2"
author: "Andreas Haas、トラップの管理者"
avatars: 
  - andreas-haas
date: "2018-12-18 11:48:21"
tags: 
  - release
description: "V8 v7.2は、ハイスピードのJavaScript解析、高速なasync-await、ia32でのメモリ消費削減、パブリッククラスフィールド、その他多数の機能を特徴としています！"
tweet: "1074978755934863361"
---
私たちは6週間ごとに、[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成しています。各バージョンはChrome Betaのマイルストーン直前にV8のGitマスターからブランチされます。本日、新しいブランチ[V8 version 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2)を発表できることを嬉しく思います。このバージョンは数週間後にChrome 72 Stableと連携してリリースされるまでベータ段階にあります。V8 v7.2は開発者向けのさまざまな便利機能が満載です。この投稿ではリリースに先立っていくつかの主要な特徴を紹介します。

<!--truncate-->
## メモリ

[組み込み機能](/blog/embedded-builtins)は現在ia32アーキテクチャでデフォルトで有効化されています。

## パフォーマンス

### JavaScript解析

平均して、ウェブページは起動時にV8の時間の9.5%をJavaScript解析に費やしています。このため、v7.2では最速のJavaScript解析を提供することに注力しました。全体的に解析速度を劇的に向上させました。v7.0以降、デスクトップでの解析速度は約30%向上しました。以下のグラフは、過去数ヶ月間における実際のFacebook読み込みベンチマークでの印象的な改善を示しています。

![facebook.comでのV8解析時間（低ければ低いほど良い）](/_img/v8-release-72/facebook-parse-time.png)

異なるケースで解析に注力してきました。以下のグラフは、人気のあるいくつかのウェブサイトでの最新のv7.2リリースに対する改善を示しています。

![V8 v7.2に対する相対的な解析時間（低いほど良い）](/_img/v8-release-72/relative-parse-times.svg)

全体的に、最近の改善により平均解析割合が9.5%から7.5%に減少し、読み込み時間が短縮されページの応答性が向上しています。

### `async`/`await`

V8 v7.2にはデフォルトで有効化された[高速な`async`/`await`の実装](/blog/fast-async#await-under-the-hood)が付属しています。また、[仕様提案](https://github.com/tc39/ecma262/pull/1250)を行い、ECMAScript仕様に正式に統合するためのウェブ互換性データを現在収集しています。

### スプレッド要素

V8 v7.2では、配列リテラルの先頭にスプレッド要素がある場合、例えば`[...x]`や`[...x, 1, 2]`の性能が大幅に向上しました。この改善は配列の展開、プリミティブ文字列、セット、マップのキー、マップの値、そして拡張して`Array.from(x)`にも適用されます。詳細については[スプレッド要素の高速化に関する詳細な記事](/blog/spread-elements)をご覧ください。

### WebAssembly

多数のWebAssemblyベンチマークを分析し、それを基に上位実行層でのコード生成を改善しました。特に、V8 v7.2では最適化コンパイラのスケジューラでのノード分割およびバックエンドでのループ回転を可能にしました。また、ラッパーキャッシュを改善し、インポートされたJavaScript数学関数の呼び出しオーバーヘッドを削減するカスタムラッパーを導入しました。さらに、多くのコードパターンに対して性能を向上させるためのレジスタ割り当ての変更を設計し、後のバージョンで実現する予定です。

### トラップハンドラー

トラップハンドラーはWebAssemblyコードの全体的なスループットを向上させています。これらはWindows、macOS、LinuxでV8 v7.2で実装され利用可能です。ChromiumではLinuxで有効化されています。WindowsとmacOSについては安定性の確認が得られ次第、続いて有効化されます。現在、Androidでの提供も進行中です。

## 非同期スタックトレース

[前述したように](/blog/fast-async#improved-developer-experience)、`error.stack`プロパティを非同期の呼び出しフレームで充実させる[ゼロコスト非同期スタックトレース](https://bit.ly/v8-zero-cost-async-stack-traces)という新しい機能が加わりました。現在、`--async-stack-traces`コマンドラインフラグの背後で利用可能です。

## JavaScript言語機能

### パブリッククラスフィールド

V8 v7.2では[パブリッククラスフィールド](/features/class-fields)をサポートしています。従来は以下のように記述していました：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('Meow!');
  }
}
```

現在では以下のように記述できます：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('Meow!');
  }
}
```

[プライベートクラスフィールド](/features/class-fields#private-class-fields)のサポートは今後のV8リリースで予定されています。

### `Intl.ListFormat`

V8 v7.2は[ `Intl.ListFormat` の提案](/features/intl-listformat)をサポートし、リストのローカライズされたフォーマットを可能にします。

```js
const lf = new Intl.ListFormat('en');
lf.format(['フランク']);
// → 'フランク'
lf.format(['フランク', 'クリスティン']);
// → 'フランクとクリスティン'
lf.format(['フランク', 'クリスティン', 'フローラ']);
// → 'フランク、クリスティン、そしてフローラ'
lf.format(['フランク', 'クリスティン', 'フローラ', 'ハリソン']);
// → 'フランク、クリスティン、フローラ、そしてハリソン'
```

詳細および使用例については、[こちらの `Intl.ListFormat` の説明ページ](/features/intl-listformat)をご覧ください。

### 正準的な `JSON.stringify`

`JSON.stringify` は孤立サロゲート用エスケープシーケンスを出力するようになり、その結果として出力が有効なUnicode（UTF-8で表現可能）になります：

```js
// 従来の動作:
JSON.stringify('\uD800');
// → '"�"'

// 新しい動作:
JSON.stringify('\uD800');
// → '"\\ud800"'
```

詳細については、[こちらの正準的な `JSON.stringify` の説明ページ](/features/well-formed-json-stringify)をご覧ください。

### モジュール名前空間エクスポート

[JavaScriptモジュール](/features/modules)では、次のような構文をすでに使用可能でした：

```js
import * as utils from './utils.mjs';
```

しかし、対称的な `export` 構文は存在していませんでした… [今回追加されるまでは](/features/module-namespace-exports)：

```js
export * as utils from './utils.mjs';
```

これは次と同等です：

```js
import * as utils from './utils.mjs';
export { utils };
```

## V8 API

`git log branch-heads/7.1..branch-heads/7.2 include/v8.h` を使用して、APIの変更リストを取得してください。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 7.2 -t branch-heads/7.2` を使用してV8 v7.2の新機能を試すことができます。あるいは、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)に登録して自分で新機能を試してみてください。
