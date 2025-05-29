---
title: "稳定的 `Array.prototype.sort`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-07-02
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Array.prototype.sort 现在已保证是稳定的。"
tweet: "1146067251302244353"
---
假设你有一个由狗组成的数组，每只狗都有一个名字和一个评分。（如果这个例子听起来很奇怪，你应该知道有一个专门研究这个内容的 Twitter 帐号……别问！）

```js
// 注意数组已经按 `name` 字母顺序预排序。
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// 按 `rating` 降序排序狗。
// （这个操作会原地更新 `doggos`。）
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
数组已按名字的字母顺序预排序。为了改用评分进行排序（这样可以得到评分最高的狗），我们使用 `Array#sort`，并传递一个比较评分的自定义回调函数。以下是可能的期望结果：

```js
[
  { name: 'Choco',  rating: 14 },
  { name: 'Ghost',  rating: 14 },
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

狗按评分排序，但在每个评分范围内，它们仍按名字的字母顺序排列。例如，Choco 和 Ghost 的评分都是 14，但在排序结果中，Choco 位于 Ghost 之前，因为这是它们在原始数组中的顺序。

然而，为了获得这个结果，JavaScript 引擎不能使用 _任何_ 排序算法——它必须是所谓的“稳定排序”。很长时间以来，JavaScript 规范并未要求 `Array#sort` 的排序稳定性，而是将此行为留给了具体实现。由于该行为未被指定，你也可能得到这样的排序结果，其中 Ghost 突然出现在 Choco 之前：

```js
[
  { name: 'Ghost',  rating: 14 }, // 😢
  { name: 'Choco',  rating: 14 }, // 😢
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

换句话说，JavaScript 开发者无法依赖排序稳定性。在实践中，情况甚至更令人恼火，因为一些 JavaScript 引擎会对较短的数组使用稳定排序，而对较大的数组使用不稳定排序。这确实令人困惑，因为开发人员会测试他们的代码，看到稳定的结果，但在生产中当数组稍大时，又突然得到不稳定的结果。

但有一些好消息。我们 [提出了一项规范修改提议](https://github.com/tc39/ecma262/pull/1340)，使 `Array#sort` 稳定，并且该提议已被接受。所有主流 JavaScript 引擎现在都实现了稳定的 `Array#sort`。对于 JavaScript 开发者来说，这是一件少操心的事情。不错吧！

（哦，[我们也对 `TypedArray` 做了同样的事情](https://github.com/tc39/ecma262/pull/1433)：现在它的排序也稳定了。）

:::note
**注意：** 虽然根据规范现在已经要求稳定性，但 JavaScript 引擎仍然可以自由选择他们喜欢的排序算法。例如 [V8 使用 Timsort](/blog/array-sort#timsort)。规范并未强制规定任何特定的排序算法。
:::

## 功能支持

### 稳定的 `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="yes"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### 稳定的 `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
