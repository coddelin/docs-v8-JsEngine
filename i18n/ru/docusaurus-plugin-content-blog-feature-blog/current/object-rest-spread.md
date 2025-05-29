---
title: "Объектные свойства rest и spread"
author: "Матиас Биненс ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-06-06
tags: 
  - ECMAScript
  - ES2018
description: "В этой статье объясняется, как работают объектные свойства rest и spread в JavaScript, а также рассматриваются элементы rest и spread для массивов."
tweet: "890269994688315394"
---
Прежде чем обсуждать _объектные свойства rest и spread_, давайте вспомним очень похожую функцию из прошлого.

## ES2015: элементы rest и spread для массивов

Хороший старый ECMAScript 2015 ввел _элементы rest_ для деструктурирующего присваивания массивов и _элементы spread_ для литералов массивов.

```js
// Элементы rest для деструктурирующего присваивания массивов:
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// Элементы spread для литералов массивов:
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: объектные свойства rest и spread 🆕

Что же нового? [_пропоузал](https://github.com/tc39/proposal-object-rest-spread) добавляет возможность использовать свойства rest и spread для литералов объектов.

```js
// Свойства rest для деструктурирующего присваивания объектов:
const person = {
    firstName: 'Себастьян',
    lastName: 'Маркбåге',
    country: 'США',
    state: 'Калифорния',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Себастьян
console.log(lastName); // Маркбåге
console.log(rest); // { country: 'США', state: 'Калифорния' }

<!--truncate-->
// Свойства spread для литералов объектов:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Себастьян', lastName: 'Маркбåге', country: 'США', state: 'Калифорния' }
```

Свойства spread предлагают более элегантную альтернативу [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) во многих ситуациях:

```js
// Мелкое клонирование объекта:
const data = { x: 42, y: 27, label: 'Сокровище' };
// Старый способ:
const clone1 = Object.assign({}, data);
// Новый способ:
const clone2 = { ...data };
// Оба результата дадут:
// { x: 42, y: 27, label: 'Сокровище' }

// Слияние двух объектов:
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// Старый способ:
const settings1 = Object.assign({}, defaultSettings, userSettings);
// Новый способ:
const settings2 = { ...defaultSettings, ...userSettings };
// Оба результата дадут:
// { logWarnings: false, logErrors: true }
```

Однако существуют некоторые тонкости в поведении spread относительно сеттеров:

1. `Object.assign()` вызывает сеттеры; spread — нет.
1. Вы можете предотвратить создание собственных свойств в `Object.assign()` через наследуемые свойства, которые имеют только чтение, но это невозможно сделать с оператором spread.

[Статья Акселя Раушмейера](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them) объясняет эти особенности более подробно.

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
