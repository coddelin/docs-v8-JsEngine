---
title: &apos;クラスの静的初期化ブロック&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-03-30
tags:
  - ECMAScript
description: &apos;JavaScript クラスに静的初期化専用の構文が登場しました。&apos;
tweet: &apos;1376925666780798989&apos;
---
新しいクラス静的初期化ブロック構文により、クラス定義ごとに1度だけ実行するコードをまとめて1つの場所に配置することができます。以下の例では、疑似乱数生成器が静的ブロックを使用してエントロピーのプールを初期化し、`class MyPRNG` の定義が評価される際に1度だけ実行されることを示しています。

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error(&apos;エントロピープールが枯渇しました&apos;);
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
var y = &apos;外部の y&apos;;
class A {
  static fieldA = &apos;A.fieldA&apos;;
}
class B extends A {
  static fieldB = &apos;B.fieldB&apos;;
  static {
    let x = super.fieldA;
    // → &apos;A.fieldA&apos;
    var y = this.fieldB;
    // → &apos;B.fieldB&apos;
  }
}
// 静的ブロックは独自の `var` スコープであるため、`var` はホイスティングされません！
y;
// → &apos;外部の y&apos;
```

## 複数のブロック

クラスには複数の静的初期化ブロックを持つことができます。これらのブロックはテキスト順に評価されます。また、静的フィールドがある場合は、すべての静的要素がテキスト順に評価されます。

```js
class C {
  static field1 = console.log(&apos;フィールド 1&apos;);
  static {
    console.log(&apos;静的ブロック 1&apos;);
  }
  static field2 = console.log(&apos;フィールド 2&apos;);
  static {
    console.log(&apos;静的ブロック 2&apos;);
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
getDPrivateField(new D(&apos;プライベート&apos;));
// → プライベート
```

以上です。オブジェクト指向をお楽しみください！

## クラス静的初期化ブロックのサポート状況

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="未対応"
                 safari="未対応"
                 nodejs="未対応"
                 babel="対応済み https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
