---
title: &apos;`Array.prototype.flat` と `Array.prototype.flatMap`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: &apos;Array.prototype.flat は配列を指定した深さまでフラット化します。Array.prototype.flatMap は map を実行し、その後 flat を実行するのと同等です。&apos;
tweet: &apos;1138457106380709891&apos;
---
## `Array.prototype.flat`

この例の配列はいくつかのレベルでネストされています。配列の中にさらに配列があり、その中にも別の配列が含まれます。

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ 外側の配列
//                ^^^^^^^^  内側の配列
//                    ^^^   最内の配列
```

`Array#flat` は指定された配列のフラット化されたバージョンを返します。

```js
array.flat();
// → [1, 2, [3]]

// …は以下と同じです:
array.flat(1);
// → [1, 2, [3]]
```

デフォルトの深さは `1` です。ただし、任意の数値を渡して、その深さまで再帰的にフラット化できます。結果にネストされた配列が含まれなくなるまで再帰的にフラット化するには、`Infinity` を渡します。

```js
// 配列にネストされた配列がなくなるまで再帰的にフラット化:
array.flat(Infinity);
// → [1, 2, 3]
```

このメソッドが `Array.prototype.flat` と呼ばれる理由で、なぜ `Array.prototype.flatten` ではないのかについては、こちらをお読みください: [#SmooshGate の詳細を確認！](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

もうひとつの例を見てみます。`duplicate` という関数は引数に値を取り、その値を2回含む配列を返します。この関数を配列のそれぞれの値に適用すると、ネストされた配列が得られます。

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

その後、結果に対して `flat` を呼び出して配列をフラット化することができます:

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

このパターンが関数型プログラミングで非常に一般的なので、専用の `flatMap` メソッドが登場しました。

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` は `map` を実行し、その後別途 `flat` を実行するよりもわずかに効率的です。

`flatMap` の使用例について興味がありますか？ [Axel Rauschmayer の解説をチェックしてください](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values)。

## `Array#{flat,flatMap}` のサポート

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
