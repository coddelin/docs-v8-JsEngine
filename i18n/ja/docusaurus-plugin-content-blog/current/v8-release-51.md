---
title: 'V8リリース v5.1'
author: 'V8チーム'
date: 2016-04-23 13:33:37
tags:
  - リリース
description: 'V8 v5.1では、パフォーマンスの向上、ジャンクの削減、メモリ消費量の削減、ECMAScript言語機能のサポート強化が含まれています。'
---
V8の[リリースプロセス](/docs/release-process)の最初のステップは、ChromiumがChrome Betaマイルストーン（約6週間ごと）のために分岐を行う直前に、Gitのマスターから新しいブランチを作成することです。我々の最新のリリースブランチは[V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1)であり、Chrome 51 Stableと連携して安定版をリリースするまでベータ版の状態を維持します。このバージョンのV8における開発者向けの新機能のハイライトをご紹介します。

<!--truncate-->
## ECMAScriptサポートの向上

V8 v5.1には、ES2017ドラフト仕様の準拠に向けた多くの変更が含まれています。

### `Symbol.species`

例えば、`Array.prototype.map`のような配列メソッドは、その出力としてサブクラスのインスタンスを構築しますが、[`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species)を変更してこれをカスタマイズすることが可能です。同様の変更が他の組み込みクラスにも適用されています。

### `instanceof`のカスタマイズ

コンストラクタは、独自の[`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols)メソッドを実装でき、デフォルトの動作をオーバーライドすることができます。

### イテレータのクローズ処理

[`for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)ループ（または[スプレッド](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)演算子のような他の組み込みイテレーション）の一部として作成されたイテレータは、ループが早期終了した場合にクローズメソッドが呼び出されるようにチェックされるようになりました。これにより、イテレーション終了後のクリーンアップが可能です。

### RegExpサブクラスの`exec`メソッド

RegExpサブクラスは、`exec`メソッドをオーバーライトして、コアのマッチングアルゴリズムを変更できます。これにより、`String.prototype.replace`のような高レベルの関数が呼び出されることが保証されます。

### 関数名推論

関数式に推論された関数名が、通常[`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name)プロパティに反映されるようになり、ES2015でのこれらのルールの形式化に従っています。この変更は、既存のスタックトレースに影響を与える可能性があり、過去のV8バージョンと異なる名前が付けられる場合があります。また、計算されたプロパティ名を持つプロパティやメソッドにも有用な名前が付けられます。

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

[`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values)メソッドは、他のコレクションタイプと同様に、配列の内容を反復するイテレータを返します。

## パフォーマンスの向上

V8 v5.1では、以下のJavaScriptの機能にいくつかの注目すべきパフォーマンス改良をもたらしました。

- `for`-`in`のようなループの実行
- `Object.assign`
- PromiseおよびRegExpのインスタンス化
- `Object.prototype.hasOwnProperty`の呼び出し
- `Math.floor`、`Math.round`、および`Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join`および`Array.prototype.toString`
- 文字列の繰り返しのフラット化（例: `'.'.repeat(1000)`）

## WebAssembly（Wasm）

V8 v5.1では[WebAssembly](/blog/webassembly-experimental)の初期サポートが導入されました。`d8`で`--expose_wasm`フラグを有効にすることで使用できます。また、Chrome 51（ベータチャネル）で[Wasmデモ](https://webassembly.github.io/demo/)を試すことも可能です。

## メモリ

V8は[Orinoco](/blog/orinoco)のさらなるスライスを実装しました：

- パラレルな若い世代のエバキュエーション
- スケーラブルなリメンバードセット
- ブラックアロケーション

これにより、必要に応じてジャンクを削減し、メモリ消費量を削減する効果があります。

## V8 API

[API変更の概要](https://bit.ly/v8-api-changes)をご確認ください。この文書は、各主要リリースの数週間後に定期的に更新されます。

アクティブな[V8リポジトリ](https://v8.dev/docs/source-code#using-git)を持つ開発者は、`git checkout -b 5.1 -t branch-heads/5.1`を使用してV8 v5.1の新機能を試すことができます。また、[Chromeのベータチャネル](https://www.google.com/chrome/browser/beta.html)に登録して、新機能を自分で試すことも可能です。
