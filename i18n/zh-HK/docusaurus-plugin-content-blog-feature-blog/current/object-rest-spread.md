---
title: &apos;物件的剩餘與展開特性&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-06-06
tags:
  - ECMAScript
  - ES2018
description: &apos;本文解釋了 JavaScript 中物件剩餘與展開特性的運作方式，並回顧了陣列的剩餘與展開元素。&apos;
tweet: &apos;890269994688315394&apos;
---
在討論 _物件的剩餘與展開特性_ 之前，我們先回顧一下非常相似的一個功能。

## ES2015 陣列的剩餘與展開元素

早在 ECMAScript 2015 引入了用於陣列解構賦值的 _剩餘元素_ 和用於陣列字面值的 _展開元素_。

```js
// 陣列解構賦值中的剩餘元素：
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// 陣列字面值中的展開元素：
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: 物件的剩餘與展開特性 🆕

那麼有什麼新東西呢？一個[提案](https://github.com/tc39/proposal-object-rest-spread)使得物件字面值也可以使用剩餘與展開特性。

```js
// 物件解構賦值中的剩餘特性：
const person = {
    firstName: &apos;Sebastian&apos;,
    lastName: &apos;Markbåge&apos;,
    country: &apos;USA&apos;,
    state: &apos;CA&apos;,
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: &apos;USA&apos;, state: &apos;CA&apos; }

<!--truncate-->
// 物件字面值中的展開特性：
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: &apos;Sebastian&apos;, lastName: &apos;Markbåge&apos;, country: &apos;USA&apos;, state: &apos;CA&apos; }
```

展開特性在許多情況下提供了一個比 [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) 更優雅的替代方案：

```js
// 淺拷貝一個物件：
const data = { x: 42, y: 27, label: &apos;Treasure&apos; };
// 舊方法：
const clone1 = Object.assign({}, data);
// 新方法：
const clone2 = { ...data };
// 結果相同：
// { x: 42, y: 27, label: &apos;Treasure&apos; }

// 合併兩個物件：
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// 舊方法：
const settings1 = Object.assign({}, defaultSettings, userSettings);
// 新方法：
const settings2 = { ...defaultSettings, ...userSettings };
// 結果相同：
// { logWarnings: false, logErrors: true }
```

然而，展開操作符在處理 setter 時存在一些細微的差異：

1. `Object.assign()` 會觸發 setter，而展開操作符不會。
2. 繼承的唯讀屬性可以阻止 `Object.assign()` 新增屬性，但對展開操作符不起作用。

[Axel Rauschmayer 的文章](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them)更詳細地解釋了這些注意事項。

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
