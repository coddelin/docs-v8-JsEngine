---
title: "プライベートブランドチェック、別名`#foo in obj`"
author: "Marja Hölttä ([@marjakh](https://twitter.com/marjakh))"
avatars:
  - "marja-holtta"
date: 2021-04-14
tags:
  - ECMAScript
description: "プライベートブランドチェックにより、オブジェクト内のプライベートフィールドの存在を確認できます。"
tweet: "1382327454975590401"
---

[`in`演算子](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)は、与えられたオブジェクト（またはそのプロトタイプチェーン内の任意のオブジェクト）が与えられたプロパティを持っているかどうかを確認するために使用できます:

```javascript
const o1 = {'foo': 0};
console.log('foo' in o1); // true
const o2 = {};
console.log('foo' in o2); // false
const o3 = Object.create(o1);
console.log('foo' in o3); // true
```

プライベートブランドチェック機能は、この`in`演算子を拡張して[プライベートクラスフィールド](https://v8.dev/features/class-fields#private-class-fields)もサポートします:

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }
  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false

class B {
  #foo = 0;
}

A.test(new B()); // false; 同じ#fooではない
```

プライベート名はそれを定義するクラスの内部でのみ利用可能であるため、テストは上記の`static test`のようなメソッド内など、クラス内部で行う必要があります。

サブクラスのインスタンスは、親クラスからプライベートフィールドを自身のプロパティとして受け取ります:

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

しかし、`Object.create`で作成されたオブジェクトや、その後に`__proto__`セッターや`Object.setPrototypeOf`を使用してプロトタイプが設定されたオブジェクトは、プライベートフィールドを自身のプロパティとして受け取りません。プライベートフィールドの検索は自身のプロパティに対してのみ機能するため、`in`演算子はこれらの継承されたフィールドを見つけることができません:

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, プライベートフィールドは継承されているが所有されていない
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, プライベートフィールドは継承されているが所有されていない
A.test(o2.__proto__); // true
```

存在しないプライベートフィールドにアクセスするとエラーが発生します。通常のプロパティでは、存在しないプロパティにアクセスすると`undefined`が返されますが、エラーは発生しませんでした。プライベートブランドチェックの導入までは、必要なプライベートフィールドがオブジェクトに含まれていない場合にフォールバック動作を実装するために開発者は`try`-`catch`を使用する必要がありました:

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // オブジェクトに#fooがなかった場合のフォールバック
    }
  }
  #foo = 0;
}
```

現在では、プライベートブランドチェックを使用してプライベートフィールドの存在を確認できます:

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // オブジェクトに#fooがなかった場合のフォールバック
    }
  }
  #foo = 0;
}
```

しかし注意が必要です - 1つのプライベートフィールドの存在が、そのオブジェクトがクラスで宣言されたすべてのプライベートフィールドを持っていることを保証するわけではありません！次の例は、クラスで宣言された2つのプライベートフィールドのうち1つしか持っていない、半分構築されたオブジェクトを示しています:

```javascript
let halfConstructed;
class F {
  m() {
    console.log(#x in this); // true
    console.log(#y in this); // false
  }
  #x = 0;
  #y = (() => {
    halfConstructed = this;
    throw 'error';
  })();
}

try {
  new F();
} catch {}

halfConstructed.m();
```

## プライベートブランドチェックのサポート

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
