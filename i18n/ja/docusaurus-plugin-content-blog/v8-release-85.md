---
title: "V8 リリース v8.5"
author: "Zeynep Cankara、いくつかのマップを追跡中"
avatars: 
 - "zeynep-cankara"
date: 2020-07-21
tags: 
 - リリース
description: "V8 リリース v8.5 は Promise.any、String#replaceAll、論理代入演算子、WebAssembly マルチ値と BigInt サポート、そしてパフォーマンス改善を特徴とします。"
tweet: 
---
V8 の[リリースプロセス](https://v8.dev/docs/release-process)の一環として、私たちは6週間ごとに新しいブランチを作成します。各バージョンは、Chrome ベータマイルストーン直前に V8 の Git マスターからブランチされています。本日、私たちは最新のブランチ [V8 バージョン 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5) を発表できることを嬉しく思っています。このバージョンは数週間で Chrome 85 安定版と連動してリリースされるまでベータ版となります。V8 v8.5 は、開発者向けの様々な特典が詰まっています。この投稿ではリリースを見越していくつかのハイライトを事前に紹介します。

<!--truncate-->
## JavaScript

### `Promise.any` と `AggregateError`

`Promise.any` は入力された promise のうち1つが成功した瞬間に結果の promise を解決する promise コンビネータです。

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // いずれかの promise が成功しました。
  console.log(first);
  // → 例: 'b'
} catch (error) {
  // 全ての promise が失敗しました。
  console.assert(error instanceof AggregateError);
  // 拒否された値をログに記録:
  console.log(error.errors);
}
```

もし入力されたすべての promise が拒否された場合、結果の promise は `AggregateError` オブジェクトを持つ形で拒否され、そのプロパティ `errors` は拒否された値の配列を保持します。

[こちらの説明](https://v8.dev/features/promise-combinators#promise.any)をご覧ください。

### `String.prototype.replaceAll`

`String.prototype.replaceAll` は、グローバル `RegExp` を作成せずにサブ文字列のすべての出現箇所を置換する簡単な方法を提供します。

```js
const queryString = 'q=query+string+parameters';

// 機能しますが、正規表現内でエスケープが必要です。
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// よりシンプル！
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

[こちらの説明](https://v8.dev/features/string-replaceall)をご覧ください。

### 論理代入演算子

論理代入演算子は、論理操作 `&&`、`||`、または `??` を代入と組み合わせた新しい複合代入演算子です。

```js
x &&= y;
// おおよそ x && (x = y) と同等
x ||= y;
// おおよそ x || (x = y) と同等
x ??= y;
// おおよそ x ?? (x = y) と同等
```

数学的およびビット単位の複合代入演算子とは異なり、論理代入演算子は条件付きで代入を実行します。

[こちらの説明](https://v8.dev/features/logical-assignment)をより詳しくお読みください。

## WebAssembly

### Liftoff が全プラットフォームで提供開始

V8 v6.9 以降、[Liftoff](https://v8.dev/blog/liftoff) は Intel プラットフォーム上で WebAssembly のベースラインコンパイラとして使用されています（Chrome 69 ではデスクトップシステムで有効化されています）。これまで、モバイルシステムではベースラインコンパイラによって生じるコード生成量の増加に伴うメモリ増加の懸念があったため控えていましたが、ここ最近の実験によりメモリの増加がほとんど無視できることを確認できました。それに伴いすべてのアーキテクチャでデフォルトで Liftoff を有効化することになり、特に ARM デバイス（32および64ビット）でコンパイル速度が向上します。Chrome 85 でもこれに対応し、Liftoff が含まれています。

### マルチ値サポート提供開始

[マルチ値のコードブロックや関数戻り値](https://github.com/WebAssembly/multi-value)に対する WebAssembly サポートが一般利用可能となりました。これは最近の公式 WebAssembly 標準への提案の取り込みを反映したもので、すべてのコンパイル層でサポートされています。

例えば、以下は有効な WebAssembly 関数です:

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

この関数がエクスポートされている場合、JavaScript からも呼び出すことができ、配列を返します:

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

逆に、JavaScript 関数が配列（または任意のイテレータ）を返す場合、それをインポートして WebAssembly モジュール内でマルチ戻り値関数として呼び出すことができます:

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

さらに重要なこととして、ツールチェーンではこの機能を利用して WebAssembly モジュール内でよりコンパクトで高速なコードを生成できるようになりました。

### JS BigInts のサポート

WebAssemblyに関する最新の公式標準変更に基づき、[WebAssembly I64値をJavaScriptのBigIntに変換する機能](https://github.com/WebAssembly/JS-BigInt-integration)のサポートが追加され、一般利用が可能となりました。

これにより、i64をパラメータや戻り値として使用するWebAssembly関数をJavaScriptから精度を損なうことなく呼び出すことができます:

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

JavaScriptからは、BigIntのみがI64のパラメータとして渡すことができます:

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: parameters are not of type BigInt
  });
```

## V8 API

`git log branch-heads/8.4..branch-heads/8.5 include/v8.h`を使用してAPI変更のリストを確認してください。

V8のアクティブなチェックアウトを行っている開発者は、`git checkout -b 8.5 -t branch-heads/8.5`を使用してV8 v8.5の新機能を試すことができます。または、[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して新機能を体験することも可能です。
