---
title: 'オブジェクトの残余プロパティとスプレッドプロパティ'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-06-06
tags:
  - ECMAScript
  - ES2018
description: 'この記事では、JavaScriptでのオブジェクトの残余プロパティとスプレッドプロパティの動作方法について説明し、配列の残余要素とスプレッド要素についても再確認します。'
tweet: '890269994688315394'
---
オブジェクトの残余プロパティとスプレッドプロパティについて説明する前に、非常に似た機能を思い出してみましょう。

## ES2015 配列の残余要素とスプレッド要素

古き良きECMAScript 2015は、配列の分割代入における残余要素と配列リテラルにおけるスプレッド要素を導入しました。

```js
// 配列の分割代入における残余要素:
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// 配列リテラルにおけるスプレッド要素:
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: オブジェクトの残余プロパティとスプレッドプロパティ 🆕

それでは、何が新しいのでしょうか？ [提案](https://github.com/tc39/proposal-object-rest-spread)により、オブジェクトリテラルにも残余プロパティとスプレッドプロパティが使用可能になります。

```js
// オブジェクトの分割代入における残余プロパティ:
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
// オブジェクトリテラルにおけるスプレッドプロパティ:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

スプレッドプロパティは多くの状況で[`Object.assign()`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)よりもエレガントな代替手段を提供します。

```js
// オブジェクトを浅くクローニングする:
const data = { x: 42, y: 27, label: 'Treasure' };
// 従来の方法:
const clone1 = Object.assign({}, data);
// 新しい方法:
const clone2 = { ...data };
// どちらも以下の結果になります:
// { x: 42, y: 27, label: 'Treasure' }

// 二つのオブジェクトを統合する:
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// 従来の方法:
const settings1 = Object.assign({}, defaultSettings, userSettings);
// 新しい方法:
const settings2 = { ...defaultSettings, ...userSettings };
// どちらも以下の結果になります:
// { logWarnings: false, logErrors: true }
```

ただし、スプレッドがセッターを扱う方法にはいくつか微妙な違いがあります。

1. `Object.assign()`はセッターをトリガーしますが、スプレッドはしません。
1. 継承された読み取り専用プロパティを介して`Object.assign()`が独自プロパティの作成を防ぐことができますが、スプレッド演算子では防げません。

[Axel Rauschmayerの詳細な解説](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them)にこれらの注意点がより詳しく説明されています。

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
