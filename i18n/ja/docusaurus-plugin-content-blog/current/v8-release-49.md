---
title: "V8リリース v4.9"
author: "V8チーム"
date: 2016-01-26 13:33:37
tags:
  - リリース
description: "V8 v4.9では改良された`Math.random`の実装が搭載され、いくつかの新しいES2015言語機能への対応が追加されました。"
---
約6週間ごとに、私たちは[リリースプロセス](/docs/release-process)の一環として新しいV8ブランチを作成しています。各バージョンはV8のGitマスターから直前に分岐し、Chrome Betaマイルストーン用にChromeが分岐するタイミングで行われます。本日、最新のブランチ[V8バージョン4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9)を発表できることを嬉しく思います。このバージョンはChrome 49 Stableと連動してリリースされるまでベータ版です。V8 4.9は開発者向けの魅力的な機能が満載で、数週間後のリリースに先立ち、そのいくつかのハイライトを紹介したいと思います。

<!--truncate-->
## 91%のECMAScript 2015 (ES6) サポート

V8リリース4.9では、これまでのリリース以上に多くのJavaScript ES2015機能を提供し、[Kangax互換性表](https://kangax.github.io/compat-table/es6/)（1月26日時点）で91%の達成度に到達しました。V8は現在、デストラクチャリング、デフォルトパラメータ、Proxyオブジェクト、Reflect APIをサポートしています。リリース4.9は、`class`や`let`のようなブロックレベル構造が厳密モード外でも利用できるようにし、正規表現のスティッキーフラグやカスタマイズ可能な`Object.prototype.toString`出力のサポートも追加しています。

### デストラクチャリング

変数宣言、パラメータ、および代入は、オブジェクトと配列の[デストラクチャリング](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)をパターンを使用してサポートするようになりました。例:

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

配列パターンは残りの配列に割り当てられる残りのパターンを含むことができます:

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

さらに、パターン要素にはデフォルト値を設定することができ、対応するプロパティが一致しない場合に使用されます:

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// または…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

デストラクチャリングを使用して、オブジェクトや配列からのデータアクセスをよりコンパクト化できます。

### プロキシとReflect

長年の開発を経て、V8はES2015仕様に準拠した完全な[プロキシ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)の実装を提供するようになりました。プロキシは、プロパティのアクセスをカスタマイズするための開発者が提供するフックセットを通じて、オブジェクトや関数を仮想化する強力なメカニズムです。オブジェクト仮想化に加えて、プロキシはインターセプションの実装、プロパティ設定の検証の追加、デバッグやプロファイリングの簡略化、[メンブレン](http://tvcutsem.github.io/js-membranes/)のような高度な抽象化を解放することができます。

オブジェクトをプロキシ化するには、さまざまなトラップを定義するハンドラのプレースホルダーオブジェクトを作成し、プロキシが仮想化するターゲットオブジェクトに適用する必要があります:

```js
const target = {};
const handler = {
  get(target, name='world') {
    return `Hello, ${name}!`;
  }
};

const foo = new Proxy(target, handler);
foo.bar;
// → 'Hello, bar!'
```

ProxyオブジェクトにはReflectモジュールが付随し、すべてのプロキシトラップに適切なデフォルトを定義します:

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`デバッグ: フィールドが取得されました: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`デバッグ: フィールドが設定されました: ${name} 値: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = 'John Doe';
// デバッグ: フィールドが設定されました: name 値: John Doe
const title = `Mr. ${debugMe.name}`; // → 'Mr. John Doe'
// デバッグ: フィールドが取得されました: name
```

[MDN Proxyページ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Examples)の例セクションで、プロキシとReflect APIの使用法についての詳細をご覧ください。

### デフォルトパラメータ

ES5以前では、関数定義におけるオプションパラメータには、パラメータがundefinedかどうかを確認するためのボイラープレートコードが必要でした:

```js
function sublist(list, start, end) {
  if (typeof start === 'undefined') start = 0;
  if (typeof end === 'undefined') end = list.length;
  ...
}
```

ES2015では、関数パラメータに[デフォルト値](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)を設定できるようになり、より明確で簡潔な関数定義が可能になりました:

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

デフォルトパラメーターと分割代入は当然組み合わせることができます:

```js
function vector([x, y, z] = []) { … }
```

### クラスと非厳密モードでのレキシカル宣言

V8はバージョン4.1と4.2以降でそれぞれレキシカル宣言（`let`、`const`、ブロックローカルな`function`）とクラスをサポートしてきましたが、これまではこれらを使用するためには厳密モードが必要でした。V8リリース4.9以降、ES2015仕様に従い、これらの機能が厳密モード外でも使用可能になりました。これによりDevToolsのコンソールでのプロトタイピングが非常に簡単になりますが、新しいコードでは一般的に厳密モードへの移行を開発者に推奨します。

### 正規表現

V8は正規表現での新しい[stickyフラグ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky)をサポートします。stickyフラグは、文字列内検索を通常のように文字列の先頭から行うか、`lastIndex`プロパティ（sticky）の位置から行うかを切り替えます。この動作は、多数の異なる正規表現を用いて任意の長さの入力文字列を効率的に解析する際に便利です。sticky検索を有効にするには、正規表現に`y`フラグを追加します（例: `const regex = /foo/y;`）。

### カスタマイズ可能な`Object.prototype.toString`の出力

`Symbol.toStringTag`を使うことで、ユーザー定義型は`Object.prototype.toString`に渡した時（あるいは文字列型への強制変換の結果として）カスタマイズされた出力を返せるようになりました:

```js
class Custom {
  get [Symbol.toStringTag]() {
    return 'Custom';
  }
}
Object.prototype.toString.call(new Custom);
// → '[object Custom]'
String(new Custom);
// → '[object Custom]'
```

## 改良された`Math.random()`

V8 v4.9には`Math.random()`の実装における改善が含まれています。[先月発表されたように](/blog/math-random)、V8のPRNGアルゴリズムを[xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf)に切り替え、より高品質な疑似乱数性を提供します。

## V8 API

APIの変更点については[まとめ](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは各主要リリース後数週間以内に定期的に更新されます。

[V8のアクティブなチェックアウト](https://v8.dev/docs/source-code#using-git)を行っている開発者は、`git checkout -b 4.9 -t branch-heads/4.9`を使用してV8 v4.9の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読して新機能を試すこともできます。
