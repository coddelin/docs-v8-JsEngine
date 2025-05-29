---
title: "优化哈希表：隐藏哈希代码"
author: "[Sathya Gunasekaran](https://twitter.com/_gsathya)，哈希代码的守护者"
avatars:
  - "sathya-gunasekaran"
date: 2018-01-29 13:33:37
tags:
  - 内部机制
tweet: "958046113390411776"
description: "JavaScript 中的多种数据结构（如 Map、Set、WeakSet 和 WeakMap）底层都使用哈希表。本文解释了 V8 v6.3 如何改进哈希表的性能。"
---
ECMAScript 2015 引入了多种新数据结构，如 Map、Set、WeakSet 和 WeakMap，这些数据结构的底层都使用哈希表。本文详细介绍了 [最近的改进](https://bugs.chromium.org/p/v8/issues/detail?id=6404)，即 [V8 v6.3+](/blog/v8-release-63) 如何存储哈希表中的键。

<!--truncate-->
## 哈希代码

[_哈希函数_](https://en.wikipedia.org/wiki/Hash_function) 用于将给定键映射到哈希表中的一个位置。_哈希代码_ 是将哈希函数应用于给定键后产生的结果。

在 V8 中，哈希代码只是一个随机数，与对象的值无关。因此，我们无法重新计算它，这意味着必须存储它。

对于用作键的 JavaScript 对象，之前，哈希代码存储为对象上的一个私有符号。在 V8 中，私有符号类似于 [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)，但它不可枚举并且不会泄漏到用户空间的 JavaScript 中。

```js
function GetObjectHash(key) {
  let hash = key[hashCodeSymbol];
  if (IS_UNDEFINED(hash)) {
    hash = (MathRandom() * 0x40000000) | 0;
    if (hash === 0) hash = 1;
    key[hashCodeSymbol] = hash;
  }
  return hash;
}
```

这种方式表现良好，因为我们不必在将对象添加到哈希表之前为哈希代码字段保留内存，而是在对象上存储一个新私有符号。

V8 还可以像优化任何其他属性查找一样，使用 IC 系统优化哈希代码符号的查找，从而提供非常快速的哈希代码查找。这对于 [单态 IC 查找](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching)（键具有相同的 [隐藏类](/)）效果很好。然而，大多数现实世界的代码并不遵循这种模式，通常键具有不同的隐藏类，从而导致 [多态 IC 查找](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching) 的哈希代码较慢。

使用私有符号方法的另一个问题是，它会在存储哈希代码时触发键的 [隐藏类转换](/#fast-property-access)。这不仅导致哈希代码查找的多态性变差，而且导致键上的其他属性查找性能下降，并从优化代码中 [去优化](https://floitsch.blogspot.com/2012/03/optimizing-for-v8-inlining.html)。

## JavaScript 对象的底层存储

在 V8 中，JavaScript 对象（`JSObject`）使用两个字（不包括其头部）：一个字用于存储指向元素底层存储的指针，另一个字用于存储指向属性底层存储的指针。

元素底层存储用于存储看起来像 [数组索引](https://tc39.es/ecma262/#sec-array-index) 的属性，而属性底层存储用于存储键为字符串或符号的属性。有关这些底层存储的更多信息，请参阅 Camillo Bruni 的这篇 [V8 博文](/blog/fast-properties)。

```js
const x = {};
x[1] = 'bar';      // ← 存储在元素中
x['foo'] = 'bar';  // ← 存储在属性中
```

## 隐藏哈希代码

存储哈希代码的最简单解决方案是将 JavaScript 对象的大小扩展一个字，并将哈希代码直接存储在对象上。然而，这会对未添加到哈希表的对象浪费内存。相反，我们可以尝试将哈希代码存储在元素存储或属性存储中。

元素底层存储是一个数组，包含其长度和所有元素。在这里几乎无能为力，因为将哈希代码存储在保留槽中（如第 0 索引）在对象未用作哈希表键时仍然浪费内存。

让我们看看属性底层存储。有两种类型的数据结构用作属性底层存储：数组和字典。

与在元素存储中使用的数组没有上限不同，用于属性存储的数组有 1022 个值的上限。在超过此限制时，V8 出于性能原因会转为使用字典。（我稍微简化了一下——在其他情况下，V8 也可以使用字典，但数组能存储的值有固定的上限。）

因此，属性底层存储有三种可能的状态：

1. 空（没有属性）
2. 数组（可存储最多 1022 个值）
3. 字典

让我们逐一讨论这些。

### 属性存储为备份存储时为空

在空的情况下，我们可以直接将哈希码存储在`JSObject`的此偏移位置。

![](/_img/hash-code/properties-backing-store-empty.png)

### 属性存储为备份存储时是数组

V8表示小于2<sup>31</sup>（在32位系统上）的整数为非盒装的[小整数](https://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations)（Smi）。在一个Smi中，最低有效位是一个标记，用于将其与指针区分开来，其余31位保存实际的整数值。

通常，数组将它们的长度存储为Smi。由于我们知道此数组的最大容量仅为1022，我们只需要10位来存储长度。我们可以使用剩余的21位来存储哈希码！

![](/_img/hash-code/properties-backing-store-array.png)

### 属性存储为备份存储时是字典

对于字典的情况，我们将字典大小增加1个字以便在字典开头的专用槽中存储哈希码。在这种情况下，我们利用这额外的内存开销，因为其相对尺寸增加不像数组情况那样大。

![](/_img/hash-code/properties-backing-store-dictionary.png)

有了这些更改，哈希码查找不再需要通过复杂的JavaScript属性查找机制。

## 性能改进

[SixSpeed](https://github.com/kpdecker/six-speed)基准跟踪了Map和Set的性能，这些更改带来了大约500%的性能提升。

![](/_img/hash-code/sixspeed.png)

这一更改还带来了[ARES6](https://webkit.org/blog/7536/jsc-loves-es6/)中Basic基准的5%性能提升。

![](/_img/hash-code/ares-6.png)

这还导致了[Emberperf](http://emberperf.eviltrout.com/)基准套件中测试Ember.js的某个基准中18%的性能提升。

![](/_img/hash-code/emberperf.jpg)
