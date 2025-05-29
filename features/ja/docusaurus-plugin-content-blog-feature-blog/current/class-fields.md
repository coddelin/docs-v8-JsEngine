---
title: &apos;公開および非公開のクラスフィールド&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: &apos;いくつかの提案が既存のJavaScriptクラス構文を新機能で拡張しています。この記事では、V8 v7.2およびChrome 72で導入された新しい公開クラスフィールド構文と、近日公開予定の非公開クラスフィールド構文について説明します。&apos;
tweet: &apos;1121395767170740225&apos;
---
いくつかの提案が既存のJavaScriptクラス構文を新機能で拡張しています。この記事では、V8 v7.2およびChrome 72で導入された新しい公開クラスフィールド構文と、近日公開予定の非公開クラスフィールド構文について説明します。

以下は、`IncreasingCounter`という名前のクラスのインスタンスを作成するコード例です：

```js
const counter = new IncreasingCounter();
counter.value;
// ログに&apos;現在の値を取得中！&apos;と出力
// → 0
counter.increment();
counter.value;
// ログに&apos;現在の値を取得中！&apos;と出力
// → 1
```

注意: `value` にアクセスすると、結果を返す前にコード（メッセージをログに出力する）が実行されます。さて、このクラスをJavaScriptでどのように実装しますか？🤔

## ES2015のクラス構文

以下は、ES2015のクラス構文を使用して`IncreasingCounter`を実装する方法です：

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log(&apos;現在の値を取得中！&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

このクラスでは、`value`ゲッターと`increment`メソッドをプロトタイプに追加しています。さらに興味深いのは、`_count` というインスタンスプロパティを作成し、そのデフォルト値を`0`に設定するコンストラクタが含まれていることです。現在は、`_count` がクラスの利用者によって直接使用されないようにするために、アンダースコアのプレフィックスを使用することが多いですが、これは単なる慣例にすぎず、言語によって特に保護されているわけではありません。

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// ログに&apos;現在の値を取得中！&apos;と出力
// → 0

// 人々が`_count`インスタンスプロパティを読み取ったり
// いじったりするのを防ぐことはできません。😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// ログに&apos;現在の値を取得中！&apos;と出力
// → 42
```

## 公開クラスフィールド

新しい公開クラスフィールド構文を使用すると、クラスの定義を簡略化できます：

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log(&apos;現在の値を取得中！&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

`_count` プロパティはクラスの最上部で宣言され、きれいに整理されています。もはやフィールドを定義するためだけにコンストラクタを必要としません。素晴らしいですね！

しかし、この例では`_count`は依然として公開プロパティであり、直接アクセスを防ぎたい場合があります。

## 非公開クラスフィールド

そこで登場するのが非公開クラスフィールドです。新しい非公開フィールド構文は公開フィールドに似ていますが、[フィールドを非公開としてマークするには`#`を使用します](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md)。`#`はフィールド名の一部とみなすことができます：

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log(&apos;現在の値を取得中！&apos;);
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

非公開フィールドはクラス本体の外でアクセスできません：

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## 公開および非公開の静的プロパティ

クラスフィールド構文は公開および非公開の静的プロパティやメソッドを作成するためにも使用できます：

```js
class FakeMath {
  // `PI` は静的公開プロパティです。
  static PI = 22 / 7; // 十分近似値です。

  // `#totallyRandomNumber` は静的非公開プロパティです。
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber` は静的非公開メソッドです。
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random` は静的公開メソッド (ES2015構文) で、
  // `#computeRandomNumber` を利用します。
  static random() {
    console.log(&apos;ランダムな数がお好きと聞きました…&apos;);
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// ログに&apos;ランダムな数がお好きと聞きました…&apos;と出力
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## 簡単なサブクラス化

クラスフィールド構文の利点は、追加のフィールドを導入するサブクラスを扱う際にさらに明確になります。次のような`Animal`という基本クラスを考えます：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

`Cat`というサブクラスを作成し、追加のインスタンスプロパティを導入する場合、従来であれば`Animal`基本クラスのコンストラクターを実行するために最初に`super()`を呼び出してからプロパティを作成する必要がありました：

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log(&apos;ニャー!&apos;);
  }
}
```

猫が風呂を楽しむことはないと示すためだけにこれだけのボイラープレートが必要でした。幸運なことに、クラスフィールド構文を使用すれば、`super()`呼び出しを含むコンストラクター全体が不要になります:

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log(&apos;ニャー!&apos;);
  }
}
```

## 機能サポート

### 公開クラスフィールドのサポート

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="yes https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### プライベートクラスフィールドのサポート

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### プライベートメソッドとアクセサーのサポート

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
