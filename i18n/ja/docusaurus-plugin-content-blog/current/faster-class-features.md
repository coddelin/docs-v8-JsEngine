---
title: "新しいクラス機能を使用するインスタンスの初期化がより高速に"
author: "[Joyee Cheung](https://twitter.com/JoyeeCheung), インスタンス初期化担当"
avatars:
  - "joyee-cheung"
date: 2022-04-20
tags:
  - 内部構造
description: "V8 v9.7以降、新しいクラス機能を使用したインスタンスの初期化がより高速になりました。"
tweet: "1517041137378373632"
---

クラスフィールドはV8 v7.2以降でサポートされ、プライベートクラスメソッドはv8.4以降でサポートされています。提案が2021年にステージ4に到達してから、新しいクラス機能のサポートを改善する作業が開始されました。それまでに、この採用に影響を与える2つの主な問題がありました:

<!--truncate-->
1. クラスフィールドとプライベートメソッドの初期化が通常のプロパティの割り当てよりもはるかに遅かった。
2. クラスフィールド初期化は、Node.jsやDenoのような組み込みツールが自身やユーザーアプリケーションのブートストラップを高速化するために使用する[起動スナップショット](https://v8.dev/blog/custom-startup-snapshots)で壊れていました。

最初の問題はV8 v9.7で修正され、2つ目の問題の修正はV8 v10.0でリリースされました。この投稿では、最初の問題がどのように修正されたかを取り扱います。他の問題については、[こちらの記事](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/)をご覧ください。

## クラスフィールドの最適化

通常のプロパティの割り当てとクラスフィールドの初期化の間のパフォーマンスギャップを解消するために、既存の[インラインキャッシュ(IC)システム](https://mathiasbynens.be/notes/shapes-ics)を後者に対応するよう更新しました。v9.7以前では、V8はクラスフィールド初期化に常にコストの高いランタイム呼び出しを使用していましたが、v9.7以降では、V8が初期化パターンを十分に予測可能と見なした場合、新しいICを使用して操作を通常のプロパティ割り当てと同様に高速化します。

![初期化のパフォーマンス、最適化後](/_img/faster-class-features/class-fields-performance-optimized.svg)

![初期化のパフォーマンス、解釈時](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### クラスフィールドの元の実装

プライベートフィールドを実装するために、V8は内部のプライベートシンボルを利用します。これらは標準の`Symbol`に似ていますが、プロパティキーとして使用される場合には列挙可能ではありません。以下のクラスを例にとります:


```js
class A {
  #a = 0;
  b = this.#a;
}
```

V8はクラスフィールド初期化子（`#a = 0`および`b = this.#a`）を収集し、初期化子を関数本体とする合成インスタンスメンバー関数を生成します。この合成関数のバイトコードは以下のようなものでした:

```cpp
// `#a`のプライベート名シンボルをr1にロード
LdaImmutableCurrentContextSlot [2]
Star r1

// 0をr2にロード
LdaZero
Star r2

// ターゲットをr0に移動
Mov <this>, r0

// %AddPrivateField()ランタイム関数を使用して、インスタンス内の
// プライベート名シンボル`#a`をキーとするプロパティの値として0を格納。
// つまり、`#a = 0`。
CallRuntime [AddPrivateField], r0-r2

// プロパティ名`b`をr1にロード
LdaConstant [0]
Star r1

// `#a`のプライベート名シンボルをロード
LdaImmutableCurrentContextSlot [2]

// インスタンスから`#a`をキーとするプロパティの値をr2にロード
LdaKeyedProperty <this>, [0]
Star r2

// ターゲットをr0に移動
Mov <this>, r0

// %CreateDataProperty()ランタイム関数を使用して、`#a`をキーとするプロパティ
// の値を`b`をキーとするプロパティの値として格納、つまり、`b = this.#a`。
CallRuntime [CreateDataProperty], r0-r2
```

前述のスニペットのクラスを次のようなクラスと比較します:

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

技術的には、これら2つのクラスは等価ではありません。`this.#a`と`this._a`の可視性の違いを無視した場合でも、仕様では"set"セマンティクスではなく"define"セマンティクスが義務付けられています。つまり、クラスフィールドの初期化はセッターや`set`プロキシトラップをトリガーしません。そのため、最初のクラスの近似はプロパティを初期化するためにシンプルな割り当てではなく`Object.defineProperty()`を使用する必要があります。加えて、基底のコンストラクタでターゲットが別のインスタンスにオーバーライドされる場合、プライベートフィールドがすでにそのインスタンスに存在する場合にはエラーをスローします:

```js
class A {
  constructor() {
    // %AddPrivateField()呼び出しの大まかな翻訳:
    const _a = %PrivateSymbol('#a')
    if (_a in this) {
      throw TypeError('同じオブジェクトに#aを2回初期化することはできません');
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // %CreateDataProperty()呼び出しの大まかな翻訳:
    Object.defineProperty(this, 'b', {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```

提案が確定する前に指定されたセマンティクスを実装するために、V8はより柔軟なランタイム関数への呼び出しを使用していました。上記のバイトコードで示されているように、パブリックフィールドの初期化は `%CreateDataProperty()` ランタイム呼び出しで実装され、プライベートフィールドの初期化は `%AddPrivateField()` で実装されました。ランタイムに呼び出すことは大きなオーバーヘッドを伴うため、クラスフィールドの初期化は通常のオブジェクトプロパティの代入と比較してはるかに遅くなっていました。

しかし、ほとんどの使用ケースでは、セマンティクスの違いはさほど重要ではありません。これらのケースでは、プロパティの最適化された代入のパフォーマンスを得るのが望ましいです。そのため、提案が確定した後に最適化実装が作成されました。

### プライベートクラスフィールドおよび算出パブリッククラスフィールドの最適化

プライベートクラスフィールドと算出パブリッククラスフィールドの初期化を高速化するために、この操作を処理するための [inline cache(IC) システム](https://mathiasbynens.be/notes/shapes-ics) に接続する新しい仕組みを導入しました。この新しい仕組みは以下の3つの共同する部分から構成されています:

- バイトコードジェネレーターでは、新しいバイトコード `DefineKeyedOwnProperty` が導入されました。これは、クラスフィールドのイニシャライザーに対応する `ClassLiteral::Property` ASTノードのコードを生成する際に出力されます。
- TurboFan JIT では、新しいIRオペコード `JSDefineKeyedOwnProperty` が対応しており、新しいバイトコードからコンパイル可能です。
- IC システムでは、新しい `DefineKeyedOwnIC` が導入され、新しいバイトコードのインタープリタハンドラや新しいIRオペコードからコンパイルされたコードで使用されます。この新しいICは実装を簡素化するために、通常のプロパティストア用に設計された `KeyedStoreIC` の一部コードを再利用しています。

現在、V8がこのクラスを検出すると:

```js
class A {
  #a = 0;
}
```

以下のようなバイトコードが、イニシャライザー `#a = 0` に対して生成されます:

```cpp
// `#a` のプライベートネームシンボルを r1 にロード
LdaImmutableCurrentContextSlot [2]
Star0

// DefineKeyedOwnProperty バイトコードを使用して、プライベートネームシンボル `#a` をキーとし、インスタンスに 0 を値として保存します。
// これはつまり `#a = 0` を意味します。
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

イニシャライザーが十分な回数実行されると、V8は初期化される各フィールドに対して1つの [フィードバックベクタースロット](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8) を割り当てます。このスロットには、追加されるフィールドのキー（プライベートフィールドの場合はプライベートネームシンボル）と、 フィールド初期化の結果としてインスタンスが遷移した [非表示クラス](https://v8.dev/docs/hidden-classes) のペアが含まれます。後の初期化では、ICはフィードバックを使用して、同じ非表示クラスを持つインスタンス上でフィールドが同じ順序で初期化されているかどうかを確認します。初期化が以前にV8が確認したパターンと一致している場合（通常はそうです）、V8は高速パスを取り、ランタイムへの呼び出しを避けて事前生成されたコードで初期化を行い、操作を高速化します。初期化がこれまでにV8が確認したパターンと一致しない場合、V8は遅いケースを処理するためにランタイム呼び出しにフォールバックします。

### 名前付きパブリッククラスフィールドの最適化

名前付きパブリッククラスフィールドの初期化を高速化するために、既存の `DefineNamedOwnProperty` バイトコードを再利用しました。これは、インタープリタまたは `JSDefineNamedOwnProperty` IRオペコードからコンパイルされたコードを介して `DefineNamedOwnIC` を呼び出します。

現在、V8がこのクラスを検出すると:

```js
class A {
  #a = 0;
  b = this.#a;
}
```

以下のようなバイトコードが、`b = this.#a` イニシャライザーに対して生成されます:

```cpp
// `#a` のプライベートネームシンボルをロード
LdaImmutableCurrentContextSlot [2]

// インスタンスから `#a` をキーとするプロパティの値を r2 にロード
// 備考: リファクタリングで LdaKeyedProperty が GetKeyedProperty にリネームされました
GetKeyedProperty <this>, [2]

// DefineKeyedOwnProperty バイトコードを使用して、`#a` をキーとするプロパティを、`b` をキーとするプロパティの値として保存します。
// つまり、`b = this.#a;` を意味します。
DefineNamedOwnProperty <this>, [0], [4]
```

元の `DefineNamedOwnIC` 機構は、名前付きパブリッククラスフィールドの処理に単純に接続することができませんでした。なぜなら、それはもともとオブジェクトリテラルの初期化のためだけに設計されていたからです。以前は、初期化中の対象が、作成以降まだユーザーによって触れられていないオブジェクトであると予想されていました（オブジェクトリテラルでは常にそうでした）。しかし、クラスフィールドは、クラスが基底クラスを拡張し、そのコンストラクターが対象をオーバーライドする場合に、ユーザー定義オブジェクト上で初期化できるからです。

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log('object:', object);
          console.log('key:', key);
          console.log('desc:', desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // 観測不可能。
}

// object: { a: 1 },
// key: 'a',
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```

これらのターゲットに対処するために、ICが初期化されようとしているオブジェクトがプロキシである場合、既にフィールドがオブジェクト上に存在する場合、またはICが以前に見たことのない隠れクラスをオブジェクトが持っている場合には実行時に戻るようにICを修正しました。エッジケースが十分一般的になればそれを最適化することも可能ですが、これまでのところ、それらの性能を犠牲にして実装の簡素化を選ぶ方が良さそうです。

## プライベートメソッドの最適化

### プライベートメソッドの実装

[仕様](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd)では、プライベートメソッドはインスタンス上でインストールされるものとして説明されていますが、クラス上ではありません。ただし、メモリを節約するために、V8の実装ではプライベートメソッドをクラスに関連付けられたコンテキストにプライベートブランドシンボルと共に保存します。コンストラクタが呼び出されると、V8はインスタンスにそのコンテキストへの参照を保存し、プライベートブランドシンボルをキーとして使用します。

![プライベートメソッドを持つクラスの評価とインスタンス化](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

プライベートメソッドがアクセスされると、V8は実行コンテキストからクラスコンテキストを見つけるためにコンテキストチェーンをたどり、見つかったコンテキストから静的に既知のスロットを読み込んでクラスのプライベートブランドシンボルを取得します。そして、そのブランドシンボルによってインスタンスがこのクラスから生成されたかどうかを確認します。ブランドチェックが通ると、V8は同じコンテキスト内の別の既知スロットからプライベートメソッドを読み込み、アクセスを完了します。

![プライベートメソッドのアクセス](/_img/faster-class-features/access-private-methods.svg)

以下のコードスニペットを例として挙げます:

```js
class A {
  #a() {}
}
```

V8は以前、`A`のコンストラクタに以下のようなバイトコードを生成していました:

```cpp
// クラスAのプライベートブランドシンボルをコンテキストからロードし、r1に保存します。
LdaImmutableCurrentContextSlot [3]
Star r1

// ターゲットをr0にロードします。
Mov <this>, r0
// 現在のコンテキストをr2にロードします。
Mov <context>, r2
// ランタイム関数%AddPrivateBrand()を呼び出し、プライベートブランドをキーとしてインスタンスにコンテキストを保存します。
CallRuntime [AddPrivateBrand], r0-r2
```

ランタイム関数`%AddPrivateBrand()`への呼び出しも含まれていたため、そのオーバーヘッドにより、プライベートメソッドのみを持つクラスのコンストラクタよりも公的なメソッドだけのクラスのコンストラクタははるかに遅くなっていました。

### プライベートブランドの初期化の最適化

プライベートブランドのインストールを高速化するために、ほとんどの場合プライベートフィールドの最適化のために追加された`DefineKeyedOwnProperty`メカニズムを再利用します:

```cpp
// クラスAのプライベートブランドシンボルをコンテキストからロードし、r1に保存します
LdaImmutableCurrentContextSlot [3]
Star0

// DefineKeyedOwnPropertyバイトコードを使用して、プライベートブランドをキーとしてインスタンスにコンテキストを保存します
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![異なるメソッドを持つクラスのインスタンス初期化の性能](/_img/faster-class-features/private-methods-performance.svg)

ただし、注意点があります: クラスが`super()`を呼び出す派生クラスである場合、プライベートメソッドの初期化 - 本事例では、プライベートブランドシンボルのインストール - は`super()`が返った後に行う必要があります:

```js
class A {
  constructor() {
    // `super()`がまだ返っていないため、新しいB()呼び出しからThrowされます。
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

上記で説明したように、ブランドを初期化する際にV8はまたインスタンスにクラスコンテキストへの参照を保存します。この参照はブランドチェックでは使用されませんが、デバッガがインスタンスに関連付けられているプライベートメソッドのリストをクラスの情報を知らなくても取得できるようにするために存在します。`super()`がコンストラクタ内で直接呼び出される場合、V8はコンテキストレジスタからコンテキストをロードするだけで初期化を実行できます（これがバイトコードにおける`Mov <context>, r2`や`Ldar <context>`が行う操作です）。ただし、`super()`はネストされたアロー関数から呼び出され、その関数が異なるコンテキストから呼び出される場合もあります。この場合、V8はコンテキストレジスタではなくコンテキストチェーンを検索するランタイム関数（依然として`%AddPrivateBrand()`と命名）にフォールバックします。以下の`callSuper`関数の場合のように:

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...何かをする
    run(callSuper)
  }
};

new A((fn) => fn());
```

V8は現在次のバイトコードを生成します:

```cpp
// スーパークラスのコンストラクタを呼び出してインスタンスを構築し、それをr3に保存します。
...

// 現在のコンテキストから深さ1のクラスコンテキストからプライベートブランドシンボルをロードし、r4に保存します
LdaImmutableContextSlot <context>, [3], [1]
Star4

// 深さ1をSmiとしてr6にロードします
LdaSmi [1]
Star6

// 現在のコンテキストをr5にロードします
Mov <context>, r5

// ランタイム関数%AddPrivateBrand()を使用して現在のコンテキストから深さ1のクラスコンテキストを見つけ、プライベートブランドシンボルをキーとしてインスタンスに保存します
CallRuntime [AddPrivateBrand], r3-r6
```

この場合、ランタイム呼び出しのコストが戻るため、このクラスのインスタンスを初期化するのは、公開メソッドのみを持つクラスのインスタンスを初期化する場合と比較して依然として遅くなります。`%AddPrivateBrand()`が行う処理を実装する専用のバイトコードを使用することは可能ですが、ネストされた矢印関数内で`super()`を呼び出すケースは非常にまれであるため、実装の簡潔さを優先してパフォーマンスを犠牲にしました。

## 最後に

このブログ投稿で述べた作業は、[Node.js 18.0.0 リリース](https://nodejs.org/en/blog/announcements/v18-release-announce/)にも含まれています。以前、Node.jsは埋め込みブートストラップスナップショットにそれらを含めたり、コンストラクタの性能を向上させるために、プライベートフィールドを使用していたいくつかの組み込みクラスでシンボルプロパティへの切り替えを行いました（詳しくは[このブログ投稿](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/)をご覧ください）。V8でのクラス機能のサポートが改善されたことで、Node.jsはこれらのクラスにおいて[プライベートクラスフィールドに戻しました](https://github.com/nodejs/node/pull/42361)。Node.jsのベンチマークでは、[これらの変更が性能上の問題を引き起こすことはない](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385)ことが示されました。

この実装に貢献してくれたIgaliaとBloombergに感謝します！
