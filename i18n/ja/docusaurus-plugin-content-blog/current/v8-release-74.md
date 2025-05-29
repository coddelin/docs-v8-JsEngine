---
title: 'V8リリース v7.4'
author: 'Georg Neis'
date: 2019-03-22 16:30:42
tags:
  - リリース
description: 'V8 v7.4はWebAssemblyスレッド/Atomics、プライベートクラスフィールド、パフォーマンスおよびメモリ改善、その他多数の機能を提供します！'
tweet: '1109094755936489472'
---
6週間ごとに、私たちは新しいV8のブランチをリリースプロセスの一環として作成します。[リリースプロセス](/docs/release-process)の詳細を参照してください。各バージョンは、Chromeのベータ段階に入る直前にV8のGitマスターから分岐されます。本日は最新のブランチ[V8バージョン7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4)のお知らせです。このバージョンは数週間後にChrome 74 Stableと連携してリリースされるまでベータ版となります。V8 v7.4は開発者向けのさまざまな機能が満載です。この投稿では、リリース前にいくつかのハイライトを事前に紹介します。

<!--truncate-->
## JITを使わないV8

V8は現在、実行時に実行可能なメモリを割り当てずに*JavaScript*を実行することをサポートしています。この機能についての詳細な情報は[専用ブログ投稿](/blog/jitless)で紹介しています。

## WebAssembly スレッド/Atomicsの提供開始

WebAssembly スレッド/Atomicsは、Android以外のオペレーティングシステムで有効になりました。これにより、[origin trial/プレビュー](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4)は終了します。[Web Fundamentalsの記事](https://developers.google.com/web/updates/2018/10/wasm-threads)では、Emscripten を使用してWebAssembly Atomicsを活用する方法が説明されています。

これにより、WebAssemblyを通じてユーザーのマシンの複数のコアを使用できるようになり、ウェブ上で新しい計算負荷の高いユースケースが可能になります。

## パフォーマンス

### 引数の不一致がある場合のより速い呼び出し

JavaScriptでは宣言された形式パラメータよりも少ない、または多い引数で関数を呼び出すことが完全に有効です。前者は_アンダーアプリケーション_、後者は_オーバーアプリケーション_と呼ばれます。アンダーアプリケーションの場合、残りの形式パラメータは`undefined`に割り当てられ、オーバーアプリケーションの場合、余分なパラメータは無視されます。

しかし、JavaScript関数は[`arguments`オブジェクト](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)を使用したり、[rest パラメータ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)を使ったり、さらには非標準の[関数プロトタイプの`arguments`プロパティ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments)を利用することで実際の引数にアクセスすることができます。その結果、JavaScriptエンジンは実際の引数にアクセスするための方法を提供する必要があります。V8では_argアダプション_という技術を使用してこれを実現しています。しかし、このアダプションはパフォーマンスコストを伴い、モダンなフロントエンドやミドルウェアフレームワークでは一般的に使用されます（つまり、多くのAPIにはオプションのパラメータや可変長引数リストがあります）。

エンジンが実際の引数が観測されないことを知っている場合には、引数アダプションが必要ないシナリオがあります。たとえば、被呼び出し側が厳密モード関数であり、`arguments`やrest パラメータを使用していない場合です。この場合、V8は引数アダプションを完全にスキップして呼び出しのオーバーヘッドを最大**60%**削減します。

![引数アダプションをスキップした場合のパフォーマンス効果。詳細は[マイクロベンチマーク](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js)で測定された結果を参照。](/_img/v8-release-74/argument-mismatch-performance.svg)

グラフは、引数の不一致がある場合でも（被呼び出し側が実際の引数を観測できない場合）、もはやオーバーヘッドが存在しないことを示しています。詳細については、[設計文書](https://bit.ly/v8-faster-calls-with-arguments-mismatch)を参照してください。

### ネイティブアクセサのパフォーマンス改善

Angularチームは[発見しました](https://mhevery.github.io/perf-tests/DOM-megamorphic.html)、ネイティブアクセサ（つまりDOMプロパティアクセサ）の`get`関数を直接呼び出すと、Chromeでは[モノモルフィック](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching)または[メガモルフィック](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching)プロパティアクセスよりも著しく遅くなることが分かりました。これが遅い理由は、プロパティアクセスのために既に存在していた高速パスではなく、[`Function#call()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)を介したDOMアクセサの呼び出しに対して遅いパスを選択していたためです。

![](/_img/v8-release-74/native-accessor-performance.svg)

ネイティブアクセサへの呼び出しのパフォーマンスを向上させ、メガモーフィックプロパティのアクセスよりも著しく高速化されました。詳細は[V8 issue #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820)を参照してください。

### パーサの性能

Chromeでは、十分に大きいスクリプトがダウンロード中にワーカースレッドで「ストリーミング」パースされます。このリリースでは、カスタムUTF-8デコーディングによるソースストリームの性能問題を特定して修正し、平均8%高速なストリーミングパースを実現しました。

さらに、V8の準パーサに問題を見つけました。これにより、最大によくワーカースレッドで実行されるプロパティ名が不必要に重複排除されていました。この重複排除を除去することで、ストリーミングパーサの性能がさらに10.5%向上しました。この修正は、ストリーミングされない小さいスクリプトやインラインスクリプトのメインスレッドのパース時間も改善します。

![上記のグラフの各ドロップは、ストリーミングパーサの性能改善の一部を示しています。](/_img/v8-release-74/parser-performance.jpg)

## メモリ

### バイトコードの解放

JavaScriptソースからコンパイルされたバイトコードは、通常約15%のV8ヒープ空間を占めます。これには関連するメタデータも含まれます。初期化時にのみ実行される関数や、コンパイル後にほとんど使用されない関数が多数あります。

V8のメモリオーバーヘッドを削減するために、最近実行されていない場合にガベージコレクション中にコンパイル済みバイトコードを関数から解放する機能を実装しました。これを可能にするために、関数のバイトコードの年齢を追跡し、ガベージコレクション中に年齢をインクリメントし、関数が実行されるとゼロにリセットします。一定の年齢閾値を超えたバイトコードは、次のガベージコレクションで収集される対象となり、将来再び実行される場合はバイトコードを遅延的に再コンパイルします。

バイトコード解放に関する実験では、Chromeユーザーに対して大幅なメモリ節約を提供し、V8ヒープ内のメモリ使用量を5–15%削減し、性能の低下やJavaScriptコードのコンパイルにかかるCPU時間の増加もほとんどありませんでした。

![](/_img/v8-release-74/bytecode-flushing.svg)

### バイトコード死基本ブロックの除去

Ignitionバイトコードコンパイラは、`return` または `break` 文の後など、死コードを生成しないように試みます:

```js
return;
deadCall(); // スキップされる
```

以前は、これがステートメントリスト内の終了ステートメントに対して事実上行われていましたが、真と判明している条件のショートカットなどの他の最適化は考慮されていませんでした:

```js
if (2.2) return;
deadCall(); // スキップされない
```

V8 v7.3でこれを解決しようとしましたが、依然としてステートメントレベルでの変更であり、制御フローがより複雑になる場合には機能しませんでした: 例えば。

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // スキップされない
```

上記の `deadCall()` は、新しい基本ブロックの開始部分にあり、ループ内の`break`文のターゲットとしてステートメントレベルでは到達可能です。

V8 v7.4では、Ignitionの主要な制御フロープリミティブである`Jump`バイトコードが参照していない場合、全体の基本ブロックが死コードと見なされるようになりました。上記の例では、`break`が生成されないため、ループには`break`文がありません。したがって、`deadCall()`から始まる基本ブロックには参照先のジャンプがなく、死コードと見なされます。この変更はユーザーコードへの大きな影響を期待していませんが、ジェネレーター、`for-of`、`try-catch`などのさまざまなデスギアリングを簡素化するために特に有用です。特に基本ブロックが実装中に複雑なステートメントを部分的に「復活」させるという種類のバグを排除します。

## JavaScript言語機能

### プライベートクラスフィールド

V8 v7.2では、公開クラスフィールド構文のサポートが追加されました。クラスフィールドは、インスタンスプロパティを定義するためだけにコンストラクタ関数が必要であるという要件を回避することでクラス構文を簡素化します。V8 v7.4から、フィールドの先頭に`#`を付けることでそれをプライベートとしてマークできます。

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('現在の値を取得します!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

公開フィールドとは異なり、プライベートフィールドはクラスの本文外ではアクセスできません:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

詳細については、[公開フィールドとプライベートフィールドの解説](/features/class-fields)をご覧ください。

### `Intl.Locale`

JavaScriptアプリケーションは通常`'en-US'`や`'de-CH'`のような文字列を使用してロケールを識別します。`Intl.Locale`はロケールを扱うためのより強力なメカニズムを提供し、言語、カレンダー、番号体系、時間のサイクルなど、ロケール固有の好みを簡単に抽出できるようにします。

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → 'es-419-u-ca-gregory-hc-h12'
```

### ハッシュバング文法

JavaScriptプログラムは、現在 `#!` で始めることができます。これは、[ハッシュバング](https://github.com/tc39/proposal-hashbang)と呼ばれるものです。ハッシュバングの後に続く行全体を、単一行コメントとして処理します。これにより、Node.jsなどのコマンドラインJavaScriptホストでの非公式な使用法に対応します。以下は現在、有効なJavaScriptプログラムです:

```js
#!/usr/bin/env node
console.log(42);
```

## V8 API

`git log branch-heads/7.3..branch-heads/7.4 include/v8.h` を使用して、APIの変更点の一覧を取得してください。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 7.4 -t branch-heads/7.4` を使用して、V8 v7.4の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)に登録し、近いうちに新機能を試してみてください。
