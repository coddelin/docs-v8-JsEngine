---
title: &apos;`Array.prototype.flat` 和 `Array.prototype.flatMap`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: &apos;Array.prototype.flat 將陣列展平到指定的深度。Array.prototype.flatMap 等同於先執行 map 再分別執行 flat。&apos;
tweet: &apos;1138457106380709891&apos;
---
## `Array.prototype.flat`

此範例中的陣列是多層嵌套的：它包含一個陣列，而這個陣列又包含另一個陣列。

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ 外層陣列
//                ^^^^^^^^ 內層陣列
//                    ^^^   最內層陣列
```

`Array#flat` 回傳一個展平後的陣列。

```js
array.flat();
// → [1, 2, [3]]

// …等同於：
array.flat(1);
// → [1, 2, [3]]
```

預設的展平深度是 `1`，但您可以傳入任何數字值來遞迴展平到該深度。若要持續展平直到結果不再包含嵌套陣列，可以使用 `Infinity`。

```js
// 持續遞迴展平直到陣列不再包含嵌套陣列：
array.flat(Infinity);
// → [1, 2, 3]
```

這個方法為什麼叫做 `Array.prototype.flat` 而不是 `Array.prototype.flatten` 呢？[閱讀我們的 #SmooshGate 撰寫內容來了解！](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

以下是另一個範例。我們有一個 `duplicate` 函數，它接受一個值並回傳一個包含該值兩次的陣列。如果我們將 `duplicate` 套用到陣列中的每個值，我們會得到一個嵌套陣列。

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

接著您可以對結果呼叫 `flat` 來展平陣列：

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

由於此模式在函數式編程中相當常見，因此現在有一個專屬的 `flatMap` 方法。

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` 比起分別執行 `map` 和 `flat` 更加高效。

對 `flatMap` 的使用案例感興趣嗎？請查看 [Axel Rauschmayer 的解釋](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values)。

## `Array#{flat,flatMap}` 支援

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
