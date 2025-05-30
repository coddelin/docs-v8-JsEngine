---
title: "V8における高速な`for`-`in`"
author: "Camillo Bruni ([@camillobruni](http://twitter.com/camillobruni))"
avatars: 
  - "camillo-bruni"
date: "2017-03-01 13:33:37"
tags: 
  - internals
description: "V8がJavaScriptのfor-inを可能な限り高速化した技術的な詳細を説明します。"
---
`for`-`in`は多くのフレームワークで使用される広く普及した言語機能です。その普及にもかかわらず、実装の観点から見るとやや分かりづらい言語構造の一つです。V8はこの機能を可能な限り高速化するために大変な努力を重ねました。昨年にかけて、`for`-`in`は完全に仕様に準拠し、コンテキストによっては最大で3倍速くなりました。

<!--truncate-->
多くの人気ウェブサイトはfor-inを多用しており、その最適化から恩恵を受けています。例えば、2016年初頭にFacebookはスタートアップ時のJavaScript全体の約7%を`for`-`in`の実装に費やしていました。この数字はWikipediaではさらに高くなり、約8%に達していました。これらの遅いケースのパフォーマンスを改善することで、Chrome 51はこれら二つのウェブサイトのパフォーマンスを大幅に向上させました:

![](/_img/fast-for-in/wikipedia.png)

![](/_img/fast-for-in/facebook.png)

WikipediaとFacebookの両方が、様々な`for`-`in`改善によりスクリプト全体の時間を4%削減しました。他のV8の改善によって同期間中にさらに速くなり、合計で4%以上のスクリプトの改善が得られました。

このブログ記事の残りの部分では、この重要な言語機能を高速化し、長年の仕様違反を同時に修正する方法について説明します。

## 仕様

_**TL;DR;** パフォーマンスの理由でfor-in反復の意味論は曖昧です。_

[for-inの仕様文章を見ると、予期せぬ形で曖昧に記述されています](https://tc39.es/ecma262/#sec-for-in-and-for-of-statements)。これはさまざまな実装間で観察可能です。正しいトラップが設定された[Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)オブジェクトを反復する場合の例を見てみましょう。

```js
const proxy = new Proxy({ a: 1, b: 1},
  {
    getPrototypeOf(target) {
    console.log('getPrototypeOf');
    return null;
  },
  ownKeys(target) {
    console.log('ownKeys');
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    console.log('getOwnPropertyDescriptor name=' + prop);
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
});
```

V8/Chrome 56では以下の出力が得られます:

```
ownKeys
getPrototypeOf
getOwnPropertyDescriptor name=a
a
getOwnPropertyDescriptor name=b
b
```

対照的に、Firefox 51では同じスニペットで異なる順序のステートメントが得られます:

```
ownKeys
getOwnPropertyDescriptor name=a
getOwnPropertyDescriptor name=b
getPrototypeOf
a
b
```

どちらのブラウザも仕様を尊重していますが、この仕様は命令の明確な順序を強制していません。この抜け穴を正しく理解するために、仕様文章を見てみましょう:

> EnumerateObjectProperties ( O )
> 引数Oで抽象操作EnumerateObjectPropertiesが呼び出された場合、以下の手順が実行されます:
>
> 1. Assert: Type(O) is Object.
> 2. 指定されたルールに従うプロパティを列挙する次のメソッドを持つIteratorオブジェクト(25.1.1.2)を返します。IteratorオブジェクトはECMAScriptコードから直接アクセス可能ではありません。プロパティを列挙する仕組みと順序は指定されていませんが、以下の規則に準拠していなければなりません。

通常、仕様の指示は正確であり必要な手順を具体的に示します。しかし、このケースでは単純な記述リストを基準としており、実行順序は実装者に委ねられています。典型的には、こうした仕様部分はJavaScriptエンジンがすでに異なる実装を行った後に書き込まれる傾向があります。仕様は次の指示を提供することで緩い終端を結ぼうとしています:

1. Iteratorのthrowとreturnメソッドはnullであり、呼び出されることはありません。
1. Iteratorのnextメソッドはオブジェクトのプロパティを処理してプロパティキーがIterator値として返されるべきかどうかを決定します。
1. 返されるプロパティキーには、シンボルであるキーが含まれません。
1. ターゲットオブジェクトのプロパティは列挙中に削除される場合があります。
1. 列挙中に削除されたプロパティはIteratorのnextメソッドによって処理される前に無視されます。列挙中にターゲットオブジェクトに新しいプロパティが追加された場合、その新しく追加されたプロパティがアクティブな列挙で処理されることは保証されません。
1. プロパティ名は任意の列挙の中でIteratorのnextメソッドによって最大1回のみ返されます。
1. ターゲットオブジェクトのプロパティを列挙することには、そのプロトタイプのプロパティや、そのプロトタイプのプロトタイプなどを再帰的に列挙することが含まれます。ただし、プロトタイプのプロパティはすでにIteratorのnextメソッドによって処理されたプロパティと同じ名前である場合処理されません。
1. プロトタイプオブジェクトのプロパティがすでに処理されているかを判断する際に、`[[Enumerable]]`属性の値は考慮されません。
1. プロトタイプオブジェクトの列挙可能なプロパティ名は、プロトタイプオブジェクトを引数として`EnumerateObjectProperties`を呼び出すことによって取得されなければなりません。
1. `EnumerateObjectProperties`は、対象オブジェクトの固有プロパティキーをその`[[OwnPropertyKeys]]`内部メソッドを呼び出すことによって取得しなければなりません。

これらの手順は退屈に聞こえるかもしれませんが、仕様には明確でかなり読みやすい例実装が含まれています。

```js
function* EnumerateObjectProperties(obj) {
  const visited = new Set();
  for (const key of Reflect.ownKeys(obj)) {
    if (typeof key === 'symbol') continue;
    const desc = Reflect.getOwnPropertyDescriptor(obj, key);
    if (desc && !visited.has(key)) {
      visited.add(key);
      if (desc.enumerable) yield key;
    }
  }
  const proto = Reflect.getPrototypeOf(obj);
  if (proto === null) return;
  for (const protoKey of EnumerateObjectProperties(proto)) {
    if (!visited.has(protoKey)) yield protoKey;
  }
}
```

ここまで読み進めてきた方は、V8が仕様の例実装を完全には踏襲していないことに気づかれたかもしれません。例えば、仕様例の`for-in`ジェネレーターは逐次的に動作するのに対し、V8はほぼ性能上の理由からすべてのキーを事前に収集します。これは完全に問題ない行為で、実際に仕様本文は操作A〜Jの順序が定義されていないことを明確に述べています。それにもかかわらず、この投稿の後半でわかるように、V8は2016年までのあるコーナーケースにおいて仕様を完全には尊重していませんでした。

## Enumキャッシュ

`for`-`in`ジェネレーターの例実装はキーを収集して供給する逐次的なパターンを踏襲しています。V8ではプロパティキーが最初のステップで収集されてから反復段階で使用されます。これにより、V8ではいくつかの点が容易になります。これを理解するためにオブジェクトモデルを見てみましょう。

例えば、`{a:'value a', b:'value b', c:'value c'}`のような単純なオブジェクトは、プロパティについて詳しいフォロー投稿で示すように、V8内でさまざまな内部表現を持つことがあります。これは、インオブジェクト、ファスト、スローなどのプロパティの種類に応じて、実際のプロパティ名が異なる場所に保存されることを意味します。したがって、列挙可能なキーを収集することは簡単な作業ではありません。

V8は隠れクラスまたはMapと呼ばれる仕組みによってオブジェクトの構造を追跡します。同じMapを持つオブジェクトは同じ構造を持っています。さらに各Mapにはプロパティの保存場所、プロパティ名、列挙可能性などの詳細を含む共有データ構造であるディスクリプタ配列があります。

しばらくの間、JavaScriptオブジェクトが最終的な形状に到達し、これ以上プロパティが追加または削除されないと仮定しましょう。この場合、キーデータソースとしてディスクリプタ配列を使用できます。この方法は列挙可能なプロパティがある場合に限られます。非列挙可能なプロパティをフィルタリングするオーバーヘッドを避けるために、V8はMapのディスクリプタ配列を介してアクセス可能な個別の`EnumCache`を使用します。

![](/_img/fast-for-in/enum-cache.png)

V8は遅いディクショナリオブジェクトが頻繁に変更される（つまり、プロパティの追加と削除を通じて）ことを予測しているので、ディクショナリプロパティを持つ遅いオブジェクトにはディスクリプタ配列が存在しません。したがって、遅いプロパティにはEnumCacheが提供されていません。同様の仮定がインデックス付きプロパティに対しても適用され、それらはEnumCacheにも含まれていません。

重要なポイントをまとめてみましょう。

- Mapはオブジェクト形状を追跡するために使用されます。
- ディスクリプタ配列はプロパティ（名前、設定可能性、可視性）に関する情報を保存します。
- ディスクリプタ配列はMap間で共有できます。
- 各ディスクリプタ配列には、インデックス付きプロパティ名ではなく、列挙可能な名前付きキーのみをリスト化するEnumCacheを持つことができます。

## `for`-`in`の仕組み

これでMapの動作やEnumCacheがディスクリプタ配列とどのように関係しているかを部分的に理解できました。V8はIgnition（バイトコードインタープリタ）およびTurboFan（最適化コンパイラ）を介してJavaScriptを実行し、どちらも`for-in`を同様の方法で扱います。簡単にするために、擬似C++スタイルを使用して`for-in`が内部的にどのように実現されているかを説明します。

```js
// For-In Prepare:
FixedArray* keys = nullptr;
Map* original_map = object->map();
if (original_map->HasEnumCache()) {
  if (object->HasNoElements()) {
    keys = original_map->GetCachedEnumKeys();
  } else {
    keys = object->GetCachedEnumKeysWithElements();
  }
} else {
  keys = object->GetEnumKeys();
}

// For-In Body:
for (size_t i = 0; i < keys->length(); i++) {
  // For-In Next:
  String* key = keys[i];
  if (!object->HasProperty(key) continue;
  EVALUATE_FOR_IN_BODY();
}
```

`for-in`は主に次の3つのステップに分けられます。

1. 反復するキーを準備する。
2. 次のキーを取得する。
3. `for`-`in`の本体を評価する。

「prepare」ステップはこれら3つの中で最も複雑であり、ここでEnumCacheが活用されます。上記の例では、オブジェクト（およびそのプロトタイプ）に要素（整数でインデックス付けされたプロパティ）が存在しない場合に、V8が直接EnumCacheを使用することを確認できます。インデックス付きプロパティ名が存在する場合、V8はC++で実装されたランタイム関数にジャンプし、それらを既存のEnumCacheに追加します。以下の例がその動作を示しています：

```cpp
FixedArray* JSObject::GetCachedEnumKeysWithElements() {
  FixedArray* keys = object->map()->GetCachedEnumKeys();
  return object->GetElementsAccessor()->PrependElementIndices(object, keys);
}

FixedArray* Map::GetCachedEnumKeys() {
  // 共有可能なEnumCacheから列挙可能なプロパティキーを取得
  FixedArray* keys_cache = descriptors()->enum_cache()->keys_cache();
  if (enum_length() == keys_cache->length()) return keys_cache;
  return keys_cache->CopyUpTo(enum_length());
}

FixedArray* FastElementsAccessor::PrependElementIndices(
      JSObject* object, FixedArray* property_keys) {
  Assert(object->HasFastElements());
  FixedArray* elements = object->elements();
  int nof_indices = CountElements(elements)
  FixedArray* result = FixedArray::Allocate(property_keys->length() + nof_indices);
  int insertion_index = 0;
  for (int i = 0; i < elements->length(); i++) {
    if (!HasElement(elements, i)) continue;
    result[insertion_index++] = String::FromInt(i);
  }
  // プロパティキーを最後に挿入。
  property_keys->CopyTo(result, nof_indices - 1);
  return result;
}
```

既存のEnumCacheが見つからない場合、再びC++にジャンプし、最初に示した仕様ステップに従います：

```cpp
FixedArray* JSObject::GetEnumKeys() {
  // レシーバーの列挙キーを取得。
  FixedArray* keys = this->GetOwnEnumKeys();
  // プロトタイプチェーンを辿る。
  for (JSObject* object : GetPrototypeIterator()) {
     // 重複しないキーをリストに追加。
     keys = keys->UnionOfKeys(object->GetOwnEnumKeys());
  }
  return keys;
}

FixedArray* JSObject::GetOwnEnumKeys() {
  FixedArray* keys;
  if (this->HasEnumCache()) {
    keys = this->map()->GetCachedEnumKeys();
  } else {
    keys = this->GetEnumPropertyKeys();
  }
  if (this->HasFastProperties()) this->map()->FillEnumCache(keys);
  return object->GetElementsAccessor()->PrependElementIndices(object, keys);
}

FixedArray* FixedArray::UnionOfKeys(FixedArray* other) {
  int length = this->length();
  FixedArray* result = FixedArray::Allocate(length + other->length());
  this->CopyTo(result, 0);
  int insertion_index = length;
  for (int i = 0; i < other->length(); i++) {
    String* key = other->get(i);
    if (other->IndexOf(key) == -1) {
      result->set(insertion_index, key);
      insertion_index++;
    }
  }
  result->Shrink(insertion_index);
  return result;
}
```

この簡素化されたC++コードは、2016年初頭にUnionOfKeysメソッドの見直しを開始するまでのV8における実装に対応しています。よく見ると、リストから重複を取り除くための単純なアルゴリズムを使用していることがわかります。これは、プロトタイプチェーンに多くのキーがある場合に性能が悪化する可能性があります。これが私たちが次のセクションで最適化を追求する決定をした理由です。

## `for`-`in` の問題点

前のセクションで示唆したように、UnionOfKeysメソッドは最悪ケースでの性能が悪いです。これは、ほとんどのオブジェクトが高速なプロパティを持つという正当な仮定に基づいており、その結果、EnumCacheから恩恵を受けるようになっています。第2の仮定として、プロトタイプチェーン上の列挙可能なプロパティが少ないため、重複を見つけるのに費やされる時間が制限されるというものでした。しかし、オブジェクトが遅い辞書プロパティを持ち、プロトタイプチェーン上に多くのキーがある場合、UnionOfKeysはボトルネックとなり、for-inに入るたびに列挙可能なプロパティ名を収集する必要があります。

性能問題に加えて、既存のアルゴリズムには仕様に準拠していないという別の問題もありました。以下の例では、V8が何年もの間間違った動作をしていました：

```js
var o = {
  __proto__ : {b: 3},
  a: 1
};
Object.defineProperty(o, 'b', {});

for (var k in o) console.log(k);
```

出力：

```
a
b
```

直感に反するかもしれませんが、これが出力するのは`a`だけであるべきです（`a` と `b` ではなく）。投稿の冒頭で示した仕様テキストを思い出すと、ステップGとJでは、レシーバー上の非列挙可能なプロパティがプロトタイプチェーン上のプロパティをシャドウすることが暗示されています。

さらに事態を複雑にするのが、ES6で導入された[プロキシ](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy)オブジェクトです。これによりV8コードの多くの仮定が崩れました。仕様準拠の方法でfor-inを実装するには、合計13個の異なるプロキシトラップのうち、以下の5つを発火させる必要があります。

:::table-wrapper
| 内部メソッド             | ハンドラーメソッド           |
| --------------------- | -------------------------- |
| `[[GetPrototypeOf]]`  | `getPrototypeOf`           |
| `[[GetOwnProperty]]`  | `getOwnPropertyDescriptor` |
| `[[HasProperty]]`     | `has`                      |
| `[[Get]]`             | `get`                      |
| `[[OwnPropertyKeys]]` | `ownKeys`                  |
:::

これは元のGetEnumKeysコードの複製バージョンを必要としました。このコードは仕様の例実装により近づけようとしました。ES6プロキシとシャドウプロパティの処理の欠如が、2016年初頭に私たちがfor-inのすべてのキーを抽出する方法をリファクタリングする主な動機となりました。

## `KeyAccumulator`について

私たちは`KeyAccumulator`という個別のヘルパークラスを導入しました。これは`for`-`in`のキーを収集する複雑さに対処するためのものです。ES6仕様の進展に伴い、新機能である`Object.keys`や`Reflect.ownKeys`は独自のわずかに修正されたキー収集方法を必要としました。一箇所で設定可能にすることにより、`for`-`in`のパフォーマンスを向上させ、コードの重複を避けることができました。

`KeyAccumulator`は、限定された一連のアクションのみをサポートする高速部分と、複雑なケース（例えばES6プロキシ）をすべてサポートする遅い部分で構成されています。

![](/_img/fast-for-in/keyaccumulator.png)

シャドウプロパティを正しくフィルタリングするためには、これまでに確認された非列挙可能プロパティの別リストを維持する必要があります。パフォーマンス上の理由から、オブジェクトのプロトタイプチェーンに列挙可能プロパティが存在すると判明した場合にのみこれを実行します。

## パフォーマンス改善

`KeyAccumulator`を導入することで、最適化可能なパターンがいくつか増えました。最初の改善は、元のUnionOfKeysメソッドのネストされたループを回避することでした。このループは遅いコーナーケースを引き起こしていました。次のステップでは、既存のEnumCachesを利用し、不要なコピーを避けるための詳細な事前チェックを実施しました。

仕様準拠の実装がより高速であることを示すために、以下の4つの異なるオブジェクトを見てみましょう:

```js
var fastProperties = {
  __proto__ : null,
  'property 1': 1,
  …
  'property 10': n
};

var fastPropertiesWithPrototype = {
  'property 1': 1,
  …
  'property 10': n
};

var slowProperties = {
  __proto__ : null,
  'dummy': null,
  'property 1': 1,
  …
  'property 10': n
};
delete slowProperties['dummy']

var elements = {
  __proto__: null,
  '1': 1,
  …
  '10': n
}
```

- `fastProperties`オブジェクトは標準的な高速プロパティを持っています。
- `fastPropertiesWithPrototype`オブジェクトは、`Object.prototype`を使用してプロトタイプチェーンに追加の非列挙可能プロパティを持っています。
- `slowProperties`オブジェクトは遅い辞書プロパティを持っています。
- `elements`オブジェクトは、インデックス付きプロパティのみを持っています。

以下のグラフは、最適化コンパイラを使用せずに、タイトなループで`for`-`in`ループを数百万回実行した元のパフォーマンスを比較しています。

![](/_img/fast-for-in/keyaccumulator-benchmark.png)

導入部分で述べたように、これらの改善は特にWikipediaやFacebookで非常に目に見えるものとなりました。

![](/_img/fast-for-in/wikipedia.png)

![](/_img/fast-for-in/facebook.png)

Chrome 51で利用可能になった最初の改善に加えて、2番目のパフォーマンスの調整がさらに重要な改善をもたらしました。以下のグラフは、Facebookページでの起動時のスクリプトに費やされた合計時間の追跡データを示しています。V8リビジョン37937周辺の範囲では、さらに4％のパフォーマンス向上が確認されました！

![](/_img/fast-for-in/fastkeyaccumulator.png)

`for`-`in`の改善の重要性を強調するために、2016年に構築したツールのデータに依ることができます。このツールにより、約[25の代表的な実世界のウェブサイト](/blog/real-world-performance)に対してV8の測定を抽出できます。以下の表は、Chrome 49におけるV8 C++エントリーポイント（ランタイム関数とビルトイン）で費やされた相対時間を示しています。

:::table-wrapper
| 順位 | 名前                                  | 合計時間 |
| :------: | ------------------------------------- | ---------- |
| 1        | `CreateObjectLiteral`                 | 1.10%      |
| 2        | `NewObject`                           | 0.90%      |
| 3        | `KeyedGetProperty`                    | 0.70%      |
| 4        | `GetProperty`                         | 0.60%      |
| 5        | `ForInEnumerate`                      | 0.60%      |
| 6        | `SetProperty`                         | 0.50%      |
| 7        | `StringReplaceGlobalRegExpWithString` | 0.30%      |
| 8        | `HandleApiCallConstruct`              | 0.30%      |
| 9        | `RegExpExec`                          | 0.30%      |
| 10       | `ObjectProtoToString`                 | 0.30%      |
| 11       | `ArrayPush`                           | 0.20%      |
| 12       | `NewClosure`                          | 0.20%      |
| 13       | `NewClosure_Tenured`                  | 0.20%      |
| 14       | `ObjectDefineProperty`                | 0.20%      |
| 15       | `HasProperty`                         | 0.20%      |
| 16       | `StringSplit`                         | 0.20%      |
| 17       | `ForInFilter`                         | 0.10%      |
:::
