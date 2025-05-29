---
title: &apos;`Array` および TypedArray で要素を検索する&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-10-27
tags:
  - ECMAScript
description: &apos;JavaScript のメソッドで Array と TypedArray の要素を検索する&apos;
tweet: &apos;1453354998063149066&apos;
---
## 配列の最初から要素を検索する

`Array` 内で条件を満たす要素を検索することは一般的なタスクであり、`Array.prototype` または様々な TypedArray プロトタイプ上で利用できる `find` および `findIndex` メソッドで行います。`Array.prototype.find` は述語を受け取り、その述語が `true` を返す最初の要素を配列から返します。述語がどの要素に対しても `true` を返さない場合、このメソッドは `undefined` を返します。

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex` は同様に動作しますが、見つかった場合はインデックスを、見つからない場合は `-1` を返します。TypedArray バージョンの `find` および `findIndex` も全く同じ方法で動作しますが、唯一の違いはそれが Array インスタンスではなく TypedArray インスタンスに対して動作する点です。

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## 配列の最後から要素を検索する

もし `Array` の最後の要素を検索したい場合はどうしますか？この使用例は自然に発生することがあります。例えば、複数の一致を重複排除して最後の要素を選ぶ場合や、その要素が配列の末尾付近にあると予想される場合です。`find` メソッドでは、まず入力を反転させる方法を使うことができます。以下のように:

```js
inputArray.reverse().find(predicate)
```

しかし、それは元の `inputArray` をインプレースで反転させることになり、時には好ましくないことがあります。

`findLast` および `findLastIndex` メソッドを使用することで、この使用例を直接そして効率的に解決することができます。これらのメソッドは `find` や `findIndex` と同様に動作しますが、`Array` または TypedArray の末尾から検索を開始する点が異なります。

```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.findLast((element) => element.v % 2 === 0);
// → {v:4}
inputArray.findLast((element) => element.v % 7 === 0);
// → undefined
inputArray.findLastIndex((element) => element.v % 2 === 0);
// → 3
inputArray.findLastIndex((element) => element.v % 7 === 0);
// → -1
```

## `findLast` および `findLastIndex` のサポート

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
