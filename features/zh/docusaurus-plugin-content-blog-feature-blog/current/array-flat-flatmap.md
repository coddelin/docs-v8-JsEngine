---
title: '`Array.prototype.flat` 和 `Array.prototype.flatMap`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: 'Array.prototype.flat 可以根据指定的深度扁平化数组。Array.prototype.flatMap 相当于先 map 再单独 flat 的结合体。'
tweet: '1138457106380709891'
---
## `Array.prototype.flat`

这里的数组是多层嵌套的：它包含一个数组，而这个数组又包含另一个数组。

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ 外层数组
//                ^^^^^^^^  内层数组
//                    ^^^   最内层数组
```

`Array#flat` 返回给定数组的扁平化版本。

```js
array.flat();
// → [1, 2, [3]]

// …等价于：
array.flat(1);
// → [1, 2, [3]]
```

默认的深度是 `1`，但你可以传入任意数字来递归扁平化达到该深度。要一直递归扁平化直到结果中不再有嵌套的数组，我们可以传入 `Infinity`。

```js
// 递归扁平化直到数组中不再含嵌套数组：
array.flat(Infinity);
// → [1, 2, 3]
```

为什么这个方法叫 `Array.prototype.flat` 而不是 `Array.prototype.flatten`？[阅读我们关于 #SmooshGate 的文章了解更多！](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

这里是另一个例子。我们有一个 `duplicate` 函数，它接收一个值，并返回一个包含该值两次的数组。如果我们对数组中的每个值应用 `duplicate`，就得到一个嵌套数组。

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

然后可以对结果调用 `flat` 来扁平化数组：

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

由于这种模式在函数式编程中非常常见，现在有一个专门的 `flatMap` 方法供我们使用。

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` 相对于单独进行`map`和`flat`操作效率稍高一些。

对 `flatMap` 的用例感兴趣吗？看看 [Axel Rauschmayer 的解释](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values)。

## `Array#{flat,flatMap}` 支持情况

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
