---
title: "用于相对索引的`at`方法"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2021-07-13
tags:
  - ECMAScript
description: "JavaScript现在为数组、TypedArrays 和字符串新增了相对索引方法。"
---

新的`at`方法适用于`Array.prototype`、各种TypedArray原型和`String.prototype`，使得访问集合末尾附近的元素变得更容易和简洁。

从集合末尾访问第N个元素是一种常见操作。然而，通常的做法较为冗长，比如`my_array[my_array.length - N]`，或者性能可能不佳，比如`my_array.slice(-N)[0]`。新的`at`方法通过解释负索引为“从末尾开始”使该操作更加符合人体工学。之前的示例可以表示为`my_array.at(-N)`。

<!--truncate-->
为了统一性，也支持正索引，其等价于普通的属性访问。

这个新方法足够简单，其完整语义可以通过以下符合规范的polyfill实现来理解：

```js
function at(n) {
  // 将参数转换为整数
  n = Math.trunc(n) || 0;
  // 允许从末尾用负索引
  if (n < 0) n += this.length;
  // 越界访问返回 undefined
  if (n < 0 || n >= this.length) return undefined;
  // 否则，这只是普通的属性访问
  return this[n];
}
```

## 关于字符串的一点说明

由于`at`最终执行的是普通的索引操作，在字符串值上调用`at`会返回代码单元，就像普通索引一样。不过，对于Unicode字符串，代码单元可能并不是你想要的！请考虑[`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt)是否更适合你的用例。

## `at`方法支持情况

<feature-support chrome="92"
                 firefox="90"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
