---
title: &apos;Поиск элементов в `Array` и TypedArrays&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-10-27
tags:
  - ECMAScript
description: &apos;Методы JavaScript для поиска элементов в массивах и TypedArrays&apos;
tweet: &apos;1453354998063149066&apos;
---
## Поиск элементов с начала

Поиск элемента, удовлетворяющего определенному условию в `Array`, является распространенной задачей и выполняется с помощью методов `find` и `findIndex` объектов `Array.prototype` и прототипов TypedArray. Метод `Array.prototype.find` принимает предикат и возвращает первый элемент массива, для которого предикат возвращает `true`. Если предикат не возвращает `true`, метод возвращает `undefined`.

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

Метод `Array.prototype.findIndex` работает аналогично, за исключением того, что он возвращает индекс, если элемент найден, и `-1`, если элемент отсутствует. Версии `find` и `findIndex` для TypedArray работают точно так же, за исключением того, что они применяются к экземплярам TypedArray вместо обычных массивов.

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## Поиск элементов с конца

Что, если нужно найти последний элемент в массиве `Array`? Такая ситуация часто возникает естественным образом, например, при необходимости удалить дубликаты и оставить последний элемент или если заранее известно, что элемент, вероятно, находится ближе к концу массива. С методом `find` одно из решений состоит в том, чтобы сначала перевернуть массив, например:

```js
inputArray.reverse().find(predicate)
```

Однако, это меняет порядок элементов в оригинальном `inputArray` напрямую, что иногда не подходит.

С методами `findLast` и `findLastIndex` такую задачу можно решить прямо и удобно. Они работают точно так же, как их аналоги `find` и `findIndex`, за исключением того, что начинают поиск с конца массива или TypedArray.

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

## Поддержка `findLast` и `findLastIndex`

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
