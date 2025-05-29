---
title: '穩定的 `Array.prototype.sort`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-07-02
tags:
  - ECMAScript
  - ES2019
  - io19
description: '現在可以保證 Array.prototype.sort 是穩定的。'
tweet: '1146067251302244353'
---
假設你有一個狗狗的陣列，每隻狗有一個名字和一個評級。（如果這聽起來是個奇怪的例子，你應該知道，Twitter 上有一個專門做這件事的賬號……請不要深究！）

```js
// 注意，陣列已按 `name` 字母序排序。
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// 按 `rating` 降序排序狗狗。
// （會就地更新 `doggos`。）
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
陣列按名字的字母序進行了事先的排序。為了改用評級排序（以便我們首先獲取評級最高的狗狗），我們使用 `Array#sort`，傳入一個自定義的回調函數來比較評級。這是你可能期望的結果：

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

狗狗按評級進行排序，但在相同評級內，它們仍按名字的字母序排序。例如，Choco 和 Ghost 的評級同為 14，但 Choco 排在 Ghost 前面，因為這是它們在原始陣列中的順序。

然而，要實現這一結果，JavaScript 引擎不能僅使用任意一種排序算法——它必須是所謂的“穩定排序”。長期以來，JavaScript 規範並未要求 `Array#sort` 的排序穩定性，而是將其留給實作決定。由於這種行為未明確定義，你也可能得到如下的排序結果，其中 Ghost 突然排在了 Choco 前面：

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

換句話說，JavaScript 開發者無法依賴排序的穩定性。實際上，情況甚至更加令人抓狂，因為某些 JavaScript 引擎對於短陣列使用穩定排序，而對於較長的陣列則使用不穩定排序。這非常令人困惑，因為開發者在測試其程式碼時看到了穩定的結果，但在進入生產環境且陣列稍大時卻突然得到了不穩定的結果。

但有個好消息。我們[提出了一個規範的修改建議](https://github.com/tc39/ecma262/pull/1340)，使得 `Array#sort` 成為穩定的，該建議已被接受。現在所有主流的 JavaScript 引擎都實作了一個穩定的 `Array#sort`。這對於 JavaScript 開發者來說又少了一個需要擔心的問題。真是很棒！

(哦，還有[我們對 `TypedArray` 做了同樣的改進](https://github.com/tc39/ecma262/pull/1433)：該排序現在也是穩定的。)

:::note
**注意：** 儘管規範現在要求穩定性，但 JavaScript 引擎仍然可以自由實作其喜歡的排序算法。例如，[V8 使用 Timsort](/blog/array-sort#timsort)。規範並未指定任何特定的排序算法。
:::

## 功能支援

### 穩定的 `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="yes"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### 穩定的 `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
