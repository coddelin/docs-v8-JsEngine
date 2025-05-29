---
title: "对象的剩余和扩展属性"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-06-06
tags: 
  - ECMAScript
  - ES2018
description: "本文解释了 JavaScript 中对象的剩余和扩展属性如何工作，并重新介绍了数组的剩余和扩展元素。"
tweet: "890269994688315394"
---
在讨论_对象的剩余和扩展属性_之前，让我们回忆一下一个非常相似的功能。

## ES2015 数组的剩余和扩展元素

经典的 ECMAScript 2015 引入了用于数组解构赋值的_剩余元素_和数组字面量的_扩展元素_。

```js
// 数组解构赋值的剩余元素:
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// 数组字面量的扩展元素:
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: 对象的剩余和扩展属性 🆕

那么有哪些新特性呢？[一个提案](https://github.com/tc39/proposal-object-rest-spread)使对象字面量也支持剩余和扩展属性。

```js
// 对象解构赋值的剩余属性:
const person = {
    firstName: 'Sebastian',
    lastName: 'Markbåge',
    country: 'USA',
    state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: 'USA', state: 'CA' }

<!--truncate-->
// 对象字面量的扩展属性:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

扩展属性在许多情况下提供了更加优雅的替代方式，替代 [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)：

```js
// 浅克隆一个对象:
const data = { x: 42, y: 27, label: 'Treasure' };
// 旧方法:
const clone1 = Object.assign({}, data);
// 新方法:
const clone2 = { ...data };
// 两者结果一致:
// { x: 42, y: 27, label: 'Treasure' }

// 合并两个对象:
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// 旧方法:
const settings1 = Object.assign({}, defaultSettings, userSettings);
// 新方法:
const settings2 = { ...defaultSettings, ...userSettings };
// 两者结果一致:
// { logWarnings: false, logErrors: true }
```

然而，关于扩展处理 setters 的方式存在一些微妙的差异:

1. `Object.assign()`会触发 setters；而扩展不会。
1. 你可以阻止 `Object.assign()`通过继承的只读属性创建自己的属性，但扩展操作符无法做到。

[Axel Rauschmayer 的文章](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them)详细解释了这些问题。

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
