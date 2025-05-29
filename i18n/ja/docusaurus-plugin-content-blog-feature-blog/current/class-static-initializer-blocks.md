---
title: 'クラスの静的初期化ブロック'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2021-03-30
tags:
  - ECMAScript
description: 'JavaScript クラスに静的初期化専用の構文が登場しました。'
tweet: '1376925666780798989'
---
新しいクラス静的初期化ブロック構文により、クラス定義ごとに1度だけ実行するコードをまとめて1つの場所に配置することができます。以下の例では、疑似乱数生成器が静的ブロックを使用してエントロピーのプールを初期化し、`class MyPRNG` の定義が評価される際に1度だけ実行されることを示しています。

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error('エントロピープールが枯渇しました');
      }
      seed = MyPRNG.entropyPool.pop();
    }
    this.seed = seed;
  }

  getRandom() { … }

  static entropyPool = [];
  static {
    for (let i = 0; i < 512; i++) {
      this.entropyPool.push(probeEntropySource());
    }
  }
}
```

## スコープ

各静的初期化ブロックは自身の `var` と `let`/`const` のスコープを持っています。静的フィールドの初期化と同様に、静的ブロック内の `this` 値はクラスコンストラクタそのものを指します。同様に、静的ブロック内の `super.property` は親クラスの静的プロパティを参照します。

```js
var y = '外部の y';
class A {
  static fieldA = 'A.fieldA';
}
class B extends A {
  static fieldB = 'B.fieldB';
  static {
    let x = super.fieldA;
    // → 'A.fieldA'
    var y = this.fieldB;
    // → 'B.fieldB'
  }
}
// 静的ブロックは独自の `var` スコープであるため、`var` はホイスティングされません！
y;
// → '外部の y'
```

## 複数のブロック

クラスには複数の静的初期化ブロックを持つことができます。これらのブロックはテキスト順に評価されます。また、静的フィールドがある場合は、すべての静的要素がテキスト順に評価されます。

```js
class C {
  static field1 = console.log('フィールド 1');
  static {
    console.log('静的ブロック 1');
  }
  static field2 = console.log('フィールド 2');
  static {
    console.log('静的ブロック 2');
  }
}
// → フィールド 1
//   静的ブロック 1
//   フィールド 2
//   静的ブロック 2
```

## プライベートフィールドへのアクセス

クラス静的初期化ブロックは常にクラス内でネストされているため、そのクラスのプライベートフィールドにアクセスできます。

```js
let getDPrivateField;
class D {
  #privateField;
  constructor(v) {
    this.#privateField = v;
  }
  static {
    getDPrivateField = (d) => d.#privateField;
  }
}
getDPrivateField(new D('プライベート'));
// → プライベート
```

以上です。オブジェクト指向をお楽しみください！

## クラス静的初期化ブロックのサポート状況

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="未対応"
                 safari="未対応"
                 nodejs="未対応"
                 babel="対応済み https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
