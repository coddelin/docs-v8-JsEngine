---
title: &apos;在 `Array` 和 TypedArray 中查找元素&apos;
author: &apos;郭書宇 ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-10-27
tags:
  - ECMAScript
description: &apos;JavaScript 方法用於在 Arrays 和 TypedArrays 中查找元素&apos;
tweet: &apos;1453354998063149066&apos;
---
## 從開頭查找元素

在 `Array` 中查找滿足某個條件的元素是一項常見任務，可以使用 `Array.prototype` 和各種 TypedArray 的 `find` 和 `findIndex` 方法完成。`Array.prototype.find` 接收一個謂詞，並返回陣列中第一個對該謂詞返回 `true` 的元素。如果謂詞對任何元素都未返回 `true`，則該方法返回 `undefined`。

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex` 的工作原理類似，但它在找到元素時返回索引，未找到時返回 `-1`。TypedArray 的 `find` 和 `findIndex` 方法與此完全相同，唯一的區別是它們操作的是 TypedArray 實例而不是 Array 實例。

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## 從結尾查找元素

如果您想查找 `Array` 中的最後一個元素怎麼辦？這種使用場景經常自然地出現，例如希望在多個匹配項中選擇最後一個元素以去重，或者事先知道該元素可能靠近 `Array` 的末尾。對於 `find` 方法，一種解決方案是先反轉輸入，如下所示：

```js
inputArray.reverse().find(predicate)
```

然而，這會在原地反轉原始的 `inputArray`，這有時可能是不可取的。

使用 `findLast` 和 `findLastIndex` 方法，可以更直接和方便地解決這種情況。它們的行為與對應的 `find` 和 `findIndex` 完全相同，不同之處在於它們是從 `Array` 或 TypedArray 的結尾開始搜索。

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

## `findLast` 和 `findLastIndex` 支援

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
