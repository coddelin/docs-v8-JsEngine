---
title: 'V8リリース v4.5'
author: 'V8チーム'
date: 2015-07-17 13:33:37
tags:
  - リリース
description: 'V8 v4.5はパフォーマンスの向上と、いくつかのES2015機能のサポートを追加しました。'
---
約6週間ごとに、[リリースプロセス](https://v8.dev/docs/release-process)の一環として新しいV8のブランチを作成します。各バージョンは、ChromeがChrome Betaマイルストーンのためにブランチを切る直前にV8のGitマスターからブランチされます。本日、私たちは最新のブランチ、[V8バージョン4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5)を発表できることを嬉しく思います。このバージョンは、Chrome 45 Stableと連携してリリースされるまでベータ版として提供されます。V8 v4.5には開発者向けの興味深い新機能がたくさん含まれているため、数週間後のリリースに先立ち、そのハイライトの一部をプレビューします。

<!--truncate-->
## 改善されたECMAScript 2015 (ES6)サポート

V8 v4.5は、いくつかの[ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/)機能をサポートします。

### アロー関数

[アロー関数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)を使用すると、よりスムーズなコードを書くことができます。

```js
const data = [0, 1, 3];
// アロー関数なしのコード
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// アロー関数を使用したコード
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

アロー関数のもう一つの大きな利点は、`this`の静的なバインディングです。その結果、メソッド内でのコールバックの使用が大幅に簡単になります。

```js
class MyClass {
  constructor() { this.a = 'こんにちは、'; }
  hello() { setInterval(() => console.log(this.a + '世界!'), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### 配列/TypedArray関数

ES2015で規定されている[配列およびTypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#Methods)の新しいすべてのメソッドが、V8 v4.5でサポートされるようになりました。これにより、配列やTypedArrayを扱う際に便利になります。追加されたメソッドの中には`Array.from`と`Array.of`があります。また、各TypedArrayでほとんどの`Array`メソッドを反映する方法も追加されました。

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)により、オブジェクトを迅速にマージおよびクローンできるようになります。

```js
const target = { a: 'こんにちは、' };
const source = { b: '世界!' };
// オブジェクトをマージする。
Object.assign(target, source);
console.log(target.a + target.b);
```

この機能は機能をミックスインするためにも使用できます。

## より多くのJavaScript言語機能が“最適化可能”に

V8の伝統的な最適化コンパイラー[Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)は、長年にわたり多くの一般的なJavaScriptパターンを最適化する優れた仕事をしてきました。ただし、JavaScript全体の言語をサポートする能力はなく、`try`/`catch`や`with`のような一部の言語機能を関数内で使用すると、その関数を最適化できない状態になってしまいます。その場合、V8はより遅いベースラインコンパイラーにフォールバックしなければなりませんでした。

V8の新しい最適化コンパイラー[TurboFan](/blog/turbofan-jit)の設計目標の1つは、ECMAScript 2015の機能を含むJavaScript全体を最終的に最適化できるようにすることです。V8 v4.5では、Crankshaftでサポートされていないいくつかの言語機能を最適化するためにTurboFanの使用が開始されました。これには、`for`-`of`、`class`、`with`、および算出プロパティ名が含まれます。

以下は`for-of`を使用したコードの例で、TurboFanによってコンパイルできるようになったものです：

```js
const sequence = ['最初', '二番目', '三番目'];
for (const value of sequence) {
  // このスコープは最適化可能です。
  const object = {a: 'こんにちは、', b: '世界!', c: value};
  console.log(object.a + object.b + object.c);
}
```

これらの言語機能を使用する関数は当初、Crankshaftでコンパイルされた他のコードと同じピークパフォーマンスには達しませんが、TurboFanは現在のベースラインコンパイラーをはるかに超える速度向上を可能にします。さらに良いことに、TurboFanのための最適化を引き続き開発することで、性能は急速に向上し続けるでしょう。

## V8 API

[API変更の概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)についてはぜひご覧ください。この文書は主要なリリースから数週間後に定期的に更新されます。

[アクティブなV8チェックアウト](https://v8.dev/docs/source-code#using-git)を持つ開発者は、新機能を試すために`git checkout -b 4.5 -t branch-heads/4.5`を使用できます。また、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)に登録して、新機能をすぐに自分で試してみることも可能です。
