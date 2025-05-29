---
title: &apos;`Object.fromEntries`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)), JavaScript ウィスパラー&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-18
tags:
  - ECMAScript
  - ES2019
  - io19
description: &apos;Object.fromEntries は、Object.entries を補完する JavaScript ライブラリへの有益な追加機能です。&apos;
tweet: &apos;1140993821897121796&apos;
---
`Object.fromEntries` は、組み込みの JavaScript ライブラリへの有益な追加機能です。その機能を説明する前に、既存の `Object.entries` API を理解することが助けになります。

## `Object.entries`

`Object.entries` API はしばらく前から存在しています。

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

オブジェクト内の各キーと値のペアについて、`Object.entries` は配列を返します。その配列の最初の要素がキー、2番目の要素が値です。

`for`-`of` と組み合わせて使うと、`Object.entries` はすべてのキーと値のペアをエレガントにループ処理するための非常に便利な方法を提供します。

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [[&apos;x&apos;, 42], [&apos;y&apos;, 50]]

for (const [key, value] of entries) {
  console.log(`The value of ${key} is ${value}.`);
}
// 出力:
// The value of x is 42.
// The value of y is 50.
```

しかし、これまでのところ、entries の結果から元のオブジェクトに戻す簡単な方法はありませんでした… 今までは！

## `Object.fromEntries`

新しい `Object.fromEntries` API は、`Object.entries` の逆の動作をします。これにより、エントリを基にオブジェクトを簡単に再構築できるようになります。

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [[&apos;x&apos;, 42], [&apos;y&apos;, 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

一般的な使用例として、オブジェクトの変換があります。これを行うにはエントリをループ処理し、すでにおなじみの配列メソッドを使用します。

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

この例では、オブジェクトを `filter` してキーの長さが `1` のものだけを取得します。つまり、キー `x` と `y` のみで、キー `abc` は取得しません。その後、残りのエントリを `map` して、各キーと値のペアを更新して返します。この例では、各値を `2` 倍にして新しい値を得ます。結果として、新しいオブジェクトが得られます。そこには `x` と `y` のプロパティのみがあります。

<!--truncate-->
## オブジェクトとマップの比較

JavaScript は `Map` をサポートしており、通常のオブジェクトより適したデータ構造であることがよくあります。そのため、コード全体を完全に制御できる場合、オブジェクトの代わりにマップを使用することがあります。しかしながら、開発者として、常に表現形式を選択できるわけではありません。操作するデータが外部 API から取得されたものや、マップではなくオブジェクトを返すライブラリ関数から取得されたものの場合があります。

`Object.entries` を使用すると、オブジェクトをマップに変換することが簡単になりました。

```js
const object = { language: &apos;JavaScript&apos;, coolness: 9001 };

// オブジェクトをマップに変換:
const map = new Map(Object.entries(object));
```

逆の処理も同様に有用です。たとえコードがマップを使用していても、データをシリアライズして JSON に変換して API リクエストを送る必要がある場合や、マップではなくオブジェクトを期待する別のライブラリにデータを渡す必要がある場合があります。このようなケースでは、マップデータに基づいてオブジェクトを作成する必要があります。`Object.fromEntries` を使用すれば、この処理は簡単に行えます。

```js
// マップをオブジェクトに戻す:
const objectCopy = Object.fromEntries(map);
// → { language: &apos;JavaScript&apos;, coolness: 9001 }
```

`Object.entries` と `Object.fromEntries` の両方が言語に組み込まれていることで、マップとオブジェクトの間を簡単に変換することが可能になります。

### 注意: データ損失に注意

上記の例のようにマップをプレーンなオブジェクトに変換する場合、各キーが一意に文字列化されるという暗黙の前提があります。この前提が成立しない場合、データ損失が発生します。

```js
const map = new Map([
  [{}, &apos;a&apos;],
  [{}, &apos;b&apos;],
]);
Object.fromEntries(map);
// → { &apos;[object Object]&apos;: &apos;b&apos; }
// 注意: 値 &apos;a&apos; はどこにも見つかりません。両方のキーが
// 同じ文字列 &apos;[object Object]&apos; に変換されるためです。
```

`Object.fromEntries` または他の方法でマップをオブジェクトに変換する前に、マップのキーが一意の `toString` 結果を生成することを確認してください。

## `Object.fromEntries` のサポート

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
