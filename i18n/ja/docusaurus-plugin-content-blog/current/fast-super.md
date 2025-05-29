---
title: "超高速な`super`プロパティのアクセス"
author: "[Marja Hölttä](https://twitter.com/marjakh), super optimizer"
avatars:
  - marja-holtta
date: 2021-02-18
tags:
  - JavaScript
description: "V8 v9.0におけるより高速なsuperプロパティアクセス"
tweet: "1362465295848333316"
---

[`super`キーワード](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)は、オブジェクトの親に存在するプロパティや関数にアクセスするために使用できます。

以前は、superプロパティ（例えば`super.x`）へのアクセスはランタイム呼び出しを介して実装されていました。V8 v9.0以降、非最適化コードで[インラインキャッシュ (IC)システム](https://mathiasbynens.be/notes/shapes-ics)を再利用し、ランタイムへのジャンプなしで適切な最適化コードを生成するようになりました。

<!--truncate-->
以下のグラフからわかるように、以前はランタイム呼び出しのため、superプロパティのアクセスは通常のプロパティアクセスよりも桁違いに遅かったですが、現在ではかなり近づいています。

![superプロパティアクセスと通常プロパティアクセスの比較（最適化済み）](/_img/fast-super/super-opt.svg)

![superプロパティアクセスと通常プロパティアクセスの比較（非最適化）](/_img/fast-super/super-no-opt.svg)

superプロパティアクセスはベンチマークが難しいです。関数内部でのみ発生するため、個別のプロパティアクセスではなく、より大きな作業単位で測定する必要があります。したがって、関数呼び出しのオーバーヘッドも測定に含まれます。上記のグラフはsuperプロパティアクセスと通常のプロパティアクセス間の差をやや過小評価していますが、旧アクセス方法と新しいアクセス方法の違いを示すには十分正確です。

非最適化（インタプリテッド）モードでは、superプロパティアクセスは通常のプロパティアクセスより常に遅くなります。これは、（コンテキストからのホームオブジェクトの読み取り、ホームオブジェクトからの`__proto__`の読み取りといった）追加の読み取り操作が必要なためです。最適化コードでは、可能であればホームオブジェクトを定数として埋め込みます。これをさらに改善するために、その`__proto__`も定数として埋め込むことが可能です。

### プロトタイプ継承と`super`

まず基本から始めましょう。superプロパティアクセスとは何を意味するのでしょうか？

```javascript
class A { }
A.prototype.x = 100;

class B extends A {
  m() {
    return super.x;
  }
}
const b = new B();
b.m();
```

ここでは`A`が`B`のスーパークラスであり、`b.m()`は予想どおり`100`を返します。

![クラス継承の図](/_img/fast-super/inheritance-1.svg)

[JavaScriptのプロトタイプ継承](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)の実際はさらに複雑です。

![プロトタイプ継承の図](/_img/fast-super/inheritance-2.svg)

`__proto__`と`prototype`プロパティを慎重に区別する必要があります。この2つは同じものではありません！さらに混乱を招くことに、オブジェクト`b.__proto__`はしばしば「`b`のプロトタイプ」と呼ばれます。

`b.__proto__`は、`b`がプロパティを継承するオブジェクトです。一方、`B.prototype`は`new B()`で作成されたオブジェクトの`__proto__`となるオブジェクトです。つまり、`b.__proto__ === B.prototype`が成り立ちます。

さらに、`B.prototype`は自身の`__proto__`プロパティを持ち、それは`A.prototype`と等しいです。これらは一緒にプロトタイプチェーンを形成します。

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

このチェーンを通じて、`b`はこれらのオブジェクトのいずれかに定義されているすべてのプロパティにアクセスできます。メソッド`m`は`B.prototype`のプロパティ（`B.prototype.m`）です—そのため、`b.m()`は機能します。

ここで、`super.x`をメソッド`m`内で、ホームオブジェクトの`__proto__`でプロパティ`x`を検索し、プロトタイプチェーンを上にたどるプロパティ検索として定義できます。

ホームオブジェクトとはメソッドが定義されているオブジェクトです。この場合、`m`のホームオブジェクトは`B.prototype`です。その`__proto__`は`A.prototype`であり、ここからプロパティ`x`を探し始めます。この場合、検索開始オブジェクトで即座にプロパティ`x`が見つかりますが、一般的にはプロトタイプチェーンのさらに上で見つかる場合もあります。

もし`B.prototype`に`x`という名前のプロパティがあったとしても、それは無視されます。なぜなら、プロトタイプチェーンでその上から検索を始めるからです。また、この場合、superプロパティの検索はレシーバ（メソッドを呼び出す際の`this`値）には依存しません。

```javascript
B.prototype.m.call(some_other_object); // 依然として100を返します
```

ただし、プロパティにゲッターがある場合、レシーバはゲッターに`this`値として渡されます。

まとめると：superプロパティアクセス（`super.x`）では、検索開始オブジェクトはホームオブジェクトの`__proto__`で、レシーバはsuperプロパティアクセスが発生するメソッドのレシーバです。

通常のプロパティアクセス`o.x`では、オブジェクト`o`でプロパティ`x`を探し始め、プロトタイプチェーンをたどります。また、`x`にゲッターが存在する場合、`o`がレシーバーとして使用されます。つまり、検索開始オブジェクトとレシーバーは同じオブジェクト（`o`）です。

*スーパープロパティアクセスは、検索開始オブジェクトとレシーバーが異なるという点を除けば、通常のプロパティアクセスと同様です。*

### より速い`super`実装

上記の理解は、速いスーパープロパティアクセスの実装の鍵でもあります。V8はすでにプロパティアクセスを高速化するよう設計されており、レシーバーと検索開始オブジェクトが異なる場合にもこれを一般化しました。

V8のデータ駆動型インラインキャッシュ(IC)システムは、速いプロパティアクセスを実現するための中核的な部分です。詳しくは、上記リンク先の[高レベルな説明](https://mathiasbynens.be/notes/shapes-ics)や、[V8のオブジェクト表現](https://v8.dev/blog/fast-properties)、および[V8のデータ駆動型ICシステムの実装に関する詳細](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing)をご覧ください。

`super`を高速化するために、新しい[Ignition](https://v8.dev/docs/ignition)バイトコード`LdaNamedPropertyFromSuper`を追加しました。これにより、インタープリタモードでICシステムに組み込むことが可能となり、スーパープロパティアクセス用の最適化コードを生成できるようになりました。

新しいバイトコードにより、スーパープロパティの読み取りを高速化するために新しいIC`LoadSuperIC`を追加できます。通常のプロパティ読み取りを処理する`LoadIC`と同様に、`LoadSuperIC`はこれまでに見た検索開始オブジェクトの形状を追跡し、それらの形状のオブジェクトからプロパティを読み取る方法を記憶します。

`LoadSuperIC`は既存のプロパティ読み取り用IC機構を再利用しますが、異なる検索開始オブジェクトを用います。ICレイヤーがすでに検索開始オブジェクトとレシーバーを区別していたため、実装は簡単であるべきでした。ただし、検索開始オブジェクトとレシーバーが常に同じであることを前提とした場合、意図せず検索開始オブジェクトを使用したり、その逆をするバグが発生しました。これらのバグは修正され、現在では検索開始オブジェクトとレシーバーが異なるケースを正しくサポートしています。

スーパープロパティアクセスの最適化コードは、[TurboFan](https://v8.dev/docs/turbofan)コンパイラの`JSNativeContextSpecialization`フェーズによって生成されます。この実装では、既存のプロパティ検索機構（[`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130)）を一般化して、レシーバーと検索開始オブジェクトが異なるケースを処理します。

さらに最適化コードは、`JSFunction`に保存されていたホームオブジェクトを移動させたときにさらに効率的になりました。現在はクラスコンテキストに保存されており、TurboFanは可能な限りそれを定数として最適化コードに埋め込むことができるようになりました。

## `super`のその他の使用例

オブジェクトリテラルのメソッド内での`super`は、クラスメソッド内での`super`と同様に動作し、同様に最適化されています。

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // returns 100
```

もちろん、最適化されていない特殊なケースもあります。例えば、スーパープロパティの書き込み（`super.x = ...`）は最適化されていません。また、ミックスインを使用するとアクセス場所がメガモーフィックになり、スーパープロパティアクセスが遅くなります:

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ このアクセス場所はメガモーフィックです
  }
  return Mixin;
}

class Base {
  m() { return 0; }
}

const myClass = createMixin(
  createMixin(
    createMixin(
      createMixin(
        createMixin(Base)
      )
    )
  )
);
(new myClass()).m();
```

すべてのオブジェクト指向パターンが可能な限り高速になるようにするためには、まだやるべきことがあります。今後の最適化にご期待ください！
