---
title: "在`Array`和TypedArray中查找元素"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2021-10-27
tags: 
  - ECMAScript
description: "JavaScript方法用于在数组和TypedArray中查找元素"
tweet: "1453354998063149066"
---
## 从开头查找元素

在`Array`中查找满足某个条件的元素是一个常见任务，可以通过`Array.prototype`和各种TypedArray原型上的`find`和`findIndex`方法来完成。`Array.prototype.find`接受一个谓词并返回数组中第一个使该谓词返回`true`的元素。如果没有元素使谓词返回`true`，则方法返回`undefined`。

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex`的工作方式类似，不过当找到时会返回索引，当未找到时返回`-1`。TypedArray版本的`find`和`findIndex`工作原理完全相同，只是它们操作的是TypedArray实例而非Array实例。

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## 从末尾查找元素

如果你想查找`Array`中的最后一个元素呢？这种用例通常自然而然地出现，例如选择在多个匹配中使用最后一个元素，或者提前知道元素可能在`Array`末尾附近。使用`find`方法，一个解决方案是首先反转输入，比如这样：

```js
inputArray.reverse().find(predicate)
```

然而，这会就地反转原始的`inputArray`，这有时并不是我们预期的。

借助`findLast`和`findLastIndex`方法，这种用例可以更直接且方便地解决。它们的行为与`find`和`findIndex`完全相同，唯一的区别是搜索从`Array`或TypedArray的末尾开始。

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

## `findLast`和`findLastIndex`支持情况

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
