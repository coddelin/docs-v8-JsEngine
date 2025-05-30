---
title: "V8 リリース v9.0"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))、スタンディングインライン"
avatars: 
 - "ingvar-stepanyan"
date: 2021-03-17
tags: 
 - リリース
description: "V8 リリース v9.0 は正規表現のマッチインデックスサポートとさまざまなパフォーマンス改善をもたらします。"
tweet: "1372227274712494084"
---
6週間ごとに、V8の[リリースプロセス](https://v8.dev/docs/release-process)の一環として新しいブランチを作成します。それぞれのバージョンはChrome Betaマイルストーン直前にV8のGitマスターから分岐します。本日、最新のブランチである[V8バージョン9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0)を発表します。このバージョンは、数週間後にChrome 90 Stableと共にリリースされるまでベータ版です。V8 v9.0は、開発者に向けたさまざまな便利な機能に満ちています。この投稿では、リリースに先立ち、そのハイライトをいくつか紹介します。

<!--truncate-->
## JavaScript

### 正規表現のマッチインデックス

v9.0から、開発者は正規表現のキャプチャグループのマッチポジションの開始位置と終了位置の配列を取得するオプションを選択できるようになります。この配列は、正規表現に `/d` フラグが付いている場合、マッチオブジェクトの `.indices` プロパティから利用可能です。

```javascript
const re = /(a)(b)/d;      // /d フラグに注目。
const m = re.exec('ab');
console.log(m.indices[0]); // インデックス0は完全なマッチ。
// → [0, 2]
console.log(m.indices[1]); // インデックス1は1つ目のキャプチャグループ。
// → [0, 1]
console.log(m.indices[2]); // インデックス2は2つ目のキャプチャグループ。
// → [1, 2]
```

詳しい情報は、[解説記事](https://v8.dev/features/regexp-match-indices)をご覧ください。

### より速い `super` プロパティアクセス

`super` プロパティ（例: `super.x`）へのアクセスが、V8のインラインキャッシュシステムとTurboFanによる効率的なコード生成を使用して最適化されました。これらの変更により、`super` プロパティアクセスは通常のプロパティアクセスに近づきました。以下のグラフでその改善を見ることができます。

![最適化されたスーパープロパティアクセスと通常のプロパティアクセスの比較](/_img/fast-super/super-opt.svg)

[専用ブログ投稿](https://v8.dev/blog/fast-super)で詳細をご覧ください。

### `for ( async of` の禁止

最近、[構文上のあいまいさ](https://github.com/tc39/ecma262/issues/2034)が発見され、V8 v9.0で[修正](https://chromium-review.googlesource.com/c/v8/v8/+/2683221)されました。

トークンシーケンス `for ( async of` は現在、パースされなくなりました。

## WebAssembly

### より速い JS-to-Wasm 呼び出し

V8は、WebAssembly関数とJavaScript関数のパラメータを異なる表現で使用します。このため、JavaScriptがエクスポートされたWebAssembly関数を呼び出す際には、*JS-to-Wasmラッパー*を通過する必要があります。このラッパーは、JavaScriptのパラメータをWebAssemblyの形式に変換し、逆方向に結果を適応させる役割を果たします。

残念ながら、これにはパフォーマンスコストが伴い、JavaScriptからWebAssemblyへの呼び出しはJavaScriptからJavaScriptへの呼び出しほど速くありませんでした。このオーバーヘッドを最小化するために、JS-to-Wasmラッパーが呼び出し箇所でインライン化されるようになり、コードが簡素化され、この余分なフレームが取り除かれました。

たとえば、2つの浮動小数点数を加算するWebAssembly関数があるとしましょう:

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

そして、JavaScriptからその関数を呼び出してベクトル（型付き配列として表現）を加算するとします:

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// ウォームアップ。
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// 測定。
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

この単純化されたマイクロベンチマークでは、以下の改善が見られます:

![マイクロベンチマーク比較](/_img/v8-release-90/js-to-wasm.svg)

この機能はまだ実験的であり、`--turbo-inline-js-wasm-calls` フラグを通じて有効化できます。

詳しくは、[設計文書](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit)をご覧ください。

## V8 API

APIの変更リストを取得するには、`git log branch-heads/8.9..branch-heads/9.0 include/v8.h` を使用してください。

アクティブなV8チェックアウトを持つ開発者は、`git checkout -b 9.0 -t branch-heads/9.0` を使用してV8 v9.0の新機能を試すことができます。または、[Chromeのベータチャネルに登録](https://www.google.com/chrome/browser/beta.html)して新機能を直接試してみることもできます。
