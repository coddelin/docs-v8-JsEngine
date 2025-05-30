---
title: "ReactにおけるV8の性能の崖についての物語"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)) と Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "benedikt-meurer"
  - "mathias-bynens"
date: "2019-08-28 16:45:00"
tags: 
  - internals
  - presentations
description: "この記事では、V8がさまざまなJavaScript値に対して最適なメモリ内表現を選択する方法と、それがShapeの仕組みにどのように影響を与えるかについて説明しています。これらすべては、Reactコアにおける最近のV8の性能の崖を説明する助けとなります。"
tweet: "1166723359696130049"
---
[以前](https://mathiasbynens.be/notes/shapes-ics)に、JavaScriptエンジンがShapesとInline Cachesを使用してオブジェクトと配列のアクセスを最適化する方法や、[エンジンがプロトタイプのプロパティアクセスを高速化する仕組み](https://mathiasbynens.be/notes/prototypes)について詳しく探りました。この記事では、V8がさまざまなJavaScript値に対して最適なメモリ内表現を選択する方法と、それがShapeの仕組みにどのように影響を与えるかについて説明しています。これらすべては[Reactコアにおける最近のV8の性能の崖](https://github.com/facebook/react/issues/14365)を説明する助けとなります。

<!--truncate-->
:::note
**注意:** 記事を読むよりプレゼンテーションを見るのがお好きな方は、以下のビデオをお楽しみください！そうでない方は、ビデオを飛ばして読み進めてください。
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">「JavaScriptエンジンの基礎：良い点、悪い点、そして醜い点」</a> AgentConf 2019でMathias BynensとBenedikt Meurerがプレゼンしました。</figcaption>
</figure>

## JavaScriptの型

すべてのJavaScript値は現在8つの異なる型のうちの正確に1つを持ちます: `Number`, `String`, `Symbol`, `BigInt`, `Boolean`, `Undefined`, `Null`, および `Object`。

![](/_img/react-cliff/01-javascript-types.svg)

JavaScriptでは、これらの型は`typeof`演算子を使用して観察可能です（1つの注目すべき例外を除いて）:

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null`は`'object'`を返し、`'null'`ではありません。これにもかかわらず、`Null`は独自の型です。なぜそうなるのかを理解するためには、すべてのJavaScript型の集合が2つのグループに分けられることを考慮してください:

- _オブジェクト_ (`Object`型)
- _プリミティブ_ (非オブジェクト値)

従って、`null`は「オブジェクト値なし」を意味し、`undefined`は「値なし」を意味します。

![](/_img/react-cliff/02-primitives-objects.svg)

この考え方に従い、Brendan Eichは、JavaScriptを設計する際に、Javaの精神で右側のすべての値（すなわちすべてのオブジェクトと`null`値）に対して`typeof`が`'object'`を返すようにしました。これが仕様に独立した`Null`型が存在するにもかかわらず、`typeof null === 'object'`となる理由です。

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## 値の表現

JavaScriptエンジンは、任意のJavaScript値をメモリに表現できる必要があります。しかし、値のJavaScript型がJavaScriptエンジンがその値をメモリでどのように表現するかとは別であることに注意してください。

例えば、値`42`はJavaScriptで`number`型です。

```js
typeof 42;
// → 'number'
```

`42`のような整数をメモリに表現する方法は複数あります:

:::table-wrapper
| 表現                       | ビット                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------- |
| 2の補数8ビット            | `0010 1010`                                                                         |
| 2の補数32ビット           | `0000 0000 0000 0000 0000 0000 0010 1010`                                           |
| 圧縮バイナリコード         | `0100 0010`                                                                         |
| 32ビットIEEE-754浮動小数点 | `0100 0010 0010 1000 0000 0000 0000 0000`                                           |
| 64ビットIEEE-754浮動小数点 | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

ECMAScriptは、数値を64ビット浮動小数点値（ダブル精度浮動小数点またはFloat64としても知られる）の形式で標準化しています。しかし、それはJavaScriptエンジンが常に数値をFloat64表現で保存していることを意味するわけではありません。これを行うことは非常に効率が悪くなります！エンジンは観察可能な動作が正確にFloat64に一致する限り、他の内部表現を選ぶことができます。

現実世界のJavaScriptアプリケーションのほとんどの数字は[有効なECMAScript配列インデックス](https://tc39.es/ecma262/#array-index)であり、0から2³²−2の範囲の整数値です。

```js
array[0]; // 最小可能な配列インデックス。
array[42];
array[2**32-2]; // 最大可能な配列インデックス。
```

JavaScriptエンジンは、このような数字に対してインデックスで配列要素にアクセスするコードを最適化するため、最適なメモリ内表現を選択できます。プロセッサがメモリアクセス操作を行うには、配列インデックスが[2の補数](https://en.wikipedia.org/wiki/Two%27s_complement)で利用可能でなければなりません。配列インデックスをFloat64として表現するのは非効率的であり、エンジンは配列要素にアクセスするたびにFloat64と2の補数の間で変換を行わなければならなくなります。

32ビットの2の補数表現は配列操作だけでなく非常に役立ちます。一般的には、**プロセッサは浮動小数点演算より整数演算をはるかに高速に実行します**。これが次の例で、最初のループが二番目のループよりも簡単に倍速になる理由です。

```js
for (let i = 0; i < 1000; ++i) {
  // 高速 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // 低速 🐌
}
```

操作の場合も同様です。次のコードにおける剰余演算子のパフォーマンスは、整数かどうかに依存します。

```js
const remainder = value % divisor;
// `value`と`divisor`が整数として表現されている場合、高速 🚀
// それ以外の場合は低速 🐌
```

両方のオペランドが整数として表現されている場合、CPUは結果を非常に効率的に計算できます。V8は`divisor`が2のベキ乗である場合に追加の高速パスを持っています。値が浮動小数点として表現されている場合、計算ははるかに複雑で時間がかかります。

整数演算が一般的に浮動小数点演算よりもはるかに高速に実行されるため、エンジンがすべての整数とすべての整数演算結果に対して常に2の補数を使用すればよいように思えます。しかし、そうするとECMAScript仕様の違反になります！ECMAScriptはFloat64を標準化しているため、**特定の整数演算は実際に浮動小数点数を生成します**。このような場合にJSエンジンが正しい結果を生成することが重要です。

```js
// Float64には53ビットの安全な整数範囲があります。その範囲を超えると、
// 精度を失う必要があります。
2**53 === 2**53+1;
// → true

// Float64は負のゼロをサポートしているため -1 * 0 は -0 でなければなりませんが、
// 2の補数では負のゼロを表現する方法がありません。
-1*0 === -0;
// → true

// Float64にはゼロ除算によって作られる無限が含まれています。
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64にはNaNもあります。
0/0 === NaN;
```

左側の値は整数であっても、右側の値はすべて浮動小数点数です。このため、上記の操作のいずれも32ビットの2の補数で正しく実行することはできません。JavaScriptエンジンは、整数演算がFancyなFloat64結果を適切に生成するように特別な注意を払う必要があります。

31ビットの符号付き整数範囲内の小さな整数に対して、V8は`Smi`という特別な表現を使用します。`Smi`ではないものは`HeapObject`として表現され、これはメモリ内のエンティティのアドレスです。数値の場合、`HeapObject`の特別な種類である`HeapNumber`を使用して、`Smi`範囲外の数値を表現します。

```js
-Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

上記の例が示すように、いくつかのJavaScript数値は`Smi`として表現され、その他は`HeapNumber`として表現されます。現実世界のJavaScriptプログラムでは小さな整数が一般的なため、V8は特に`Smi`を最適化しています。`Smi`はメモリ内の専用エンティティとして割り当てる必要がなく、一般的に高速な整数演算を可能にします。

ここでの重要なポイントは、**同じJavaScript型の値であっても、内部的に完全に異なる方法で表現される場合がある**ということです。

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

これが内部でどのように機能するかを説明します。次のオブジェクトがあるとしましょう：

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

この場合、`x`の値 `42`は`Smi`としてエンコードできるため、オブジェクト内に直接格納できます。一方、`y`の値 `4.2`は値を保持するための別のエンティティが必要であり、オブジェクトはそのエンティティを指します。

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

次に、以下のJavaScriptスニペットを実行するとどうなるでしょう：

```js
o.x += 10;
// → o.x は現在 52
o.y += 1;
// → o.y は現在 5.2
```

この場合、`x`の値は、`Smi`範囲に収まる新しい値 `52`として、インプレースで更新できます。

![](/_img/react-cliff/05-update-smi.svg)

しかし、新しい値 `y=5.2` は `Smi` に適合せず、前の値 `4.2` とも異なるため、V8 は `y` への代入のために新しい `HeapNumber` エンティティを割り当てる必要があります。

![](/_img/react-cliff/06-update-heapnumber.svg)

`HeapNumber` は不変であり、特定の最適化を可能にします。たとえば、`y` の値を `x` に代入する場合:

```js
o.x = o.y;
// → o.x は現在 5.2 です
```

…同じ値に新しい `HeapNumber` を割り当てる代わりに、同じ `HeapNumber` をリンクするだけで済むようになります。

![](/_img/react-cliff/07-heapnumbers.svg)

`HeapNumber` が不変であることの欠点の一つは、以下のように頻繁に `Smi` 範囲外の値にフィールドを更新すると遅くなることです:

```js
// `HeapNumber` インスタンスを作成。
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // 追加の `HeapNumber` インスタンスを作成。
  o.x += 1;
}
```

最初の行では初期値 `0.1` を持つ `HeapNumber` インスタンスが作成されます。ループ本体ではこの値が次のように変化します: `1.1`, `2.1`, `3.1`, `4.1`, そして最終的に `5.1`。この過程で合計6つの `HeapNumber` インスタンスが作成され、ループ終了後にはそのうち5つがゴミとなります。

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

この問題を回避するために、V8 は最適化として `Smi` 以外の数値フィールドもインプレースで更新できる方法を提供します。数値フィールドが `Smi` 範囲外の値を保持している場合、V8 はそのフィールドを形状上で`Double` フィールドとしてマークし、実際の値が Float64 としてエンコードされるいわゆる `MutableHeapNumber` を割り当てます。

![](/_img/react-cliff/09-mutableheapnumber.svg)

フィールドの値が変更される場合、V8 は新しい `HeapNumber` を割り当てる必要がなくなり、その代わりに `MutableHeapNumber` をインプレースで更新できるようになります。

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

ただし、このアプローチにも注意が必要です。`MutableHeapNumber` の値が変更可能であるため、これらが渡されないことが重要です。

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

たとえば、`o.x` を別の変数 `y` に代入すると、次回 `o.x` が変更されたときに `y` の値も変わってしまうのは、JavaScript の仕様に違反します! そのため `o.x` にアクセスするときには、数値を通常の `HeapNumber` に *リボックス* してから `y` に代入する必要があります。

浮動小数点数に対しては、V8 が上記の “ボクシング” を裏で処理します。しかし、小さな整数の場合、`Smi` がより効率的な表現であるため `MutableHeapNumber` アプローチでは無駄になります。

```js
const object = { x: 1 };
// → object 内の `x` に “ボクシング” は行われない

object.x += 1;
// → オブジェクト内にある `x` の値を更新
```

効率性を保つため、小さな整数であれば、形状上でフィールドを `Smi` の表現としてマークし、その範囲に収まる限り数値をインプレースで更新するだけで済みます。

![](/_img/react-cliff/12-smi-no-boxing.svg)

## 形状の非推奨化および移行

では、フィールドが最初は `Smi` を含むが、後に小さな整数範囲外の数値を保持する場合はどうなるでしょうか? たとえば、`x` が最初は `Smi` として表現されている同じ形状を使用する2つのオブジェクトが次のような場合:

```js
const a = { x: 1 };
const b = { x: 2 };
// → オブジェクトは現在 `x` を `Smi` フィールドとして持つ

b.x = 0.2;
// → `b.x` は現在 `Double` として表現されている

y = a.x;
```

これは、`x` が `Smi` 表現としてマークされている同じ形状を指す2つのオブジェクトで始まります:

![](/_img/react-cliff/13-shape.svg)

`b.x` が `Double` 表現に変化すると、V8 は `x` が `Double` 表現に割り当てられ、空の形状に戻る新しい形状を割り当てます。V8 はまた、新しい値 `0.2` を保持するために `x` プロパティ用の `MutableHeapNumber` を割り当てます。そして、この新しい形状を指すようにオブジェクト `b` を更新し、オブジェクト内のスロットを先ほど割り当てた `MutableHeapNumber` を指すように変更します。最後に、古い形状を非推奨としてマークし、遷移ツリーからのリンクを解除します。これは、空の形状から新しく作成した形状への `'x'` 用の新しい遷移を持つことで行います。

![](/_img/react-cliff/14-shape-transition.svg)

この時点では、古い形状を完全に削除することはできません。というのも、それはまだ `a` に使用されており、古い形状を指すすべてのオブジェクトを探してそれらを積極的に更新するのはコストが高すぎるからです。その代わりに、V8 はこれを遅延的に行います。`a` へのプロパティアクセスや代入が行われると、新しい形状に移行します。このアイデアは、最終的に非推奨形状を到達不可能にし、ガベージコレクタがそれを削除することです。

![](/_img/react-cliff/15-shape-deprecation.svg)

チェーン内で変更される表現のフィールドが最後でない場合、より厄介なケースが発生します:

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

この場合、V8 は関連するプロパティが導入される前の最後の形状であるいわゆる _分割形状_ を見つける必要があります。この例では `y` を変更しているため、`y` を持たない最後の形状、つまりこの例では `x` を導入した形状を見つける必要があります。

![](/_img/react-cliff/16-split-shape.svg)

分割シェイプから始めて、以前のすべての遷移を再生する新しい`y`の遷移チェーンを作成しますが、`'y'`が`Double`の表現であるとマークされるようにします。そして、この新しい遷移チェーンを`y`に使用し、古いサブツリーを非推奨としてマークします。最後のステップで、インスタンス`o`を新しいシェイプに移行し、現在`y`の値を保持するための`MutableHeapNumber`を使用します。この方法で、新しいオブジェクトは古いパスを取りません。そして、古いシェイプへのすべての参照がなくなると、ツリ内の非推奨シェイプ部分が消えます。

## 拡張性と整合性レベルの遷移

`Object.preventExtensions()`は、オブジェクトに新しいプロパティが追加されるのを永久に防ぎます。試みた場合、例外をスローします。（厳格モードでない場合、例外はスローされず、静かに何も起こりません。）

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: プロパティyを追加できません;
//            オブジェクトは拡張可能ではありません
```

`Object.seal`は`Object.preventExtensions`と同じことを行いますが、さらにすべてのプロパティを非設定可能にマークします。これにより、それらを削除したり、列挙可能性や設定可能性、書き換え可能性を変更したりできなくなります。

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: プロパティyを追加できません;
//            オブジェクトは拡張可能ではありません
delete object.x;
// TypeError: プロパティxを削除できません
```

`Object.freeze`は`Object.seal`と同じことを行いますが、既存のプロパティの値が変更されるのを防ぎ、それらを書き込み不可にマークします。

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: プロパティyを追加できません;
//            オブジェクトは拡張可能ではありません
delete object.x;
// TypeError: プロパティxを削除できません
object.x = 3;
// TypeError: 読み取り専用プロパティxに割り当てることはできません
```

具体的な例を考えてみましょう。2つのオブジェクトがあり、それぞれ単一のプロパティ`x`を持ち、その後2番目のオブジェクトの拡張を防ぐ場合です。

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

最初は、空のシェイプからプロパティ`'x'`（`Smi`として表現）を保持する新しいシェイプへの遷移のようになります。`b`の拡張を防ぐとき、新しいシェイプへの特別な遷移を実行し、それを非拡張可能としてマークします。この特別な遷移は新しいプロパティを導入するわけではありません — 単なるマーカーです。

![](/_img/react-cliff/17-shape-nonextensible.svg)

`x`のシェイプをその場で更新するだけでは不十分である理由に注意してください。それは他のオブジェクト`a`で必要だからで、`a`はまだ拡張可能です。

## Reactのパフォーマンス問題

習得した知識をすべてまとめて、[最近のReactのIssue #14365](https://github.com/facebook/react/issues/14365)を理解してみましょう。Reactチームが実際のアプリケーションをプロファイリングした際、Reactのコアに影響を与える奇妙なV8パフォーマンスの崖を発見しました。以下はそのバグの簡略化された再現例です：

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

2つのフィールドが`Smi`表現を持つオブジェクトがあります。このオブジェクトのさらに拡張を禁止し、最終的に2番目のフィールドを`Double`表現に強制します。

これにより、次のような設定が作成されます：

![](/_img/react-cliff/18-repro-shape-setup.svg)

両方のプロパティは`Smi`表現としてマークされており、最終遷移は非拡張可能としてシェイプをマークする拡張性遷移です。

`y`を`Double`表現に変更する必要がありますが、これはスプリットシェイプを見つけることから始まります。この場合、スプリットシェイプは`x`を導入したシェイプです。ただし、V8は混乱しました。スプリットシェイプは拡張可能で、現在のシェイプは非拡張とマークされていたからです。V8はこの場合の遷移を正しく再生する方法が分かりませんでした。そのため、結果としてV8は単に現行シェイプツリーに接続されず、他のオブジェクトとも共有されない別のシェイプを作成しました。これを_孤立したシェイプ_と考えることができます：

![](/_img/react-cliff/19-orphaned-shape.svg)

これが多数のオブジェクトに起こった場合、シェイプシステム全体が役に立たなくなる可能性が高いです。

Reactのケースでは、以下のような状況が発生しました：各`FiberNode`には、プロファイリングがオンになっているときにタイムスタンプを保持するいくつかのフィールドがあります。

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

例えばこれらのフィールド（`actualStartTime`など）は`0`や`-1`で初期化され、これにより`Smi`表現でスタートします。ただし後に[`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now)からの浮動小数点タイムスタンプがこれらのフィールドに保存され、それによって`Smi`に収まらなくなるので`Double`表現に切り替わります。加えて、Reactは`FiberNode`のインスタンスの拡張も防ぎます。

最初は上記の簡略化された例は次のように見えます：

![](/_img/react-cliff/20-fibernode-shape.svg)

共有されたシェイプツリーを共有する2つのインスタンスがすべて想定通りに動作しています。ただし、本当のタイムスタンプを保存すると、V8はスプリットシェイプの見つけ方に混乱しました：

![](/_img/react-cliff/21-orphan-islands.svg)

V8は`node1`に新しい孤立した形状を割り当て、しばらくして同じことが`node2`にも起こり、各自の形状を持つ2つの_孤立島_を作り出します。多くの実際のReactアプリでは、2つどころか、これらの`FiberNode`が数万も存在します。この状況がV8のパフォーマンスにとってあまり良くなかったことは想像に難くありません。

幸運にも、[私たちはこのパフォーマンスの問題を修正しました](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/) [V8 v7.4](/blog/v8-release-74)において、残っているパフォーマンスの問題を解消するために[フィールド表現変更をより安価にする方法を検討しています](https://bit.ly/v8-in-place-field-representation-changes)。修正後、V8は正しい動作を行います:

![](/_img/react-cliff/22-fix.svg)

2つの`FiberNode`インスタンスは、`'actualStartTime'`が`Smi`フィールドである拡張不可能な形状を指します。最初に`node1.actualStartTime`への代入が行われると、新しい移行チェーンが作成され、以前のチェーンは廃止されます:

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

新しいチェーンで拡張移行が適切に再現されていることに注目してください。

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

`node2.actualStartTime`への代入後、両方のノードは新しい形状を参照し、移行ツリーの廃止された部分はガベージコレクタによってクリーンアップされる可能性があります。

:::note
**注:** この形状の廃止/移行が複雑であると思うかもしれませんが、そのとおりです。実際、実世界のWebサイトでは、このメカニズムはメリットよりも問題を引き起こす可能性があると疑っています（パフォーマンス、メモリ使用量、複雑さの観点で）。特に[ポインター圧縮](https://bugs.chromium.org/p/v8/issues/detail?id=7703)により、このメカニズムを使用してオブジェクト内に直接倍精度の値を格納することができなくなるためです。このため、[V8の形状廃止メカニズムを完全に削除](https://bugs.chromium.org/p/v8/issues/detail?id=9606)することを目指しています。言い換えれば、それは_\*サングラスをかけて\*_廃止されつつあるのです。_イエーイ…_
:::

Reactチームは[FiberNodeの時間および期間フィールドが最初から`Double`表現を持つことを保証することで問題を軽減しました](https://github.com/facebook/react/pull/14383):

```js
class FiberNode {
  constructor() {
    // 最初から`Double`表現を強制します。
    this.actualStartTime = Number.NaN;
    // 後で、必要な値に初期化することができます:
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

`Number.NaN`の代わりに、`Smi`範囲に収まらない任意の浮動小数点値を使用することができます。例としては`0.000001`、`Number.MIN_VALUE`、`-0`、`Infinity`などがあります。

具体的なReactのバグはV8固有のものであり、一般的には開発者は特定のバージョンのJavaScriptエンジン用に最適化すべきではありません。それでも、物事がうまくいかないときに対処方法があることは嬉しいものです。

JavaScriptエンジンが内部でいくつかの魔法を行うことを覚えておいてください。そして可能であれば型を混ぜないことで助けることができます。例えば、数値フィールドを`null`で初期化しないでください。これによりフィールド表現追跡のすべてのメリットが無効になり、またコードをより読みやすくします:

```js
// このようにしないでください！
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

言い換えれば、**読みやすいコードを書けば、パフォーマンスが追随します！**

## まとめ

この深掘りで以下を取り上げました:

- JavaScriptは“プリミティブ”と“オブジェクト”を区別し、`typeof`は嘘をつきます。
- 同じJavaScript型を持つ値でも、背後で異なる表現を持つことができます。
- V8はJavaScriptプログラム内のすべてのプロパティに最適な表現を見つけようとします。
- V8が形状廃止と移行、拡張性の移行をどのように処理するかについて議論しました。

この知識に基づいて、パフォーマンスを向上させるための実用的なJavaScriptコーディングのヒントを特定しました:

- オブジェクトをいつも同じ方法で初期化し、形状が効果的になるようにします。
- フィールドの初期値を適切に選択して、JavaScriptエンジンが表現を選択しやすくします。
