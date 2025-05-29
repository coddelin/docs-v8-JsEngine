---
title: &apos;`Array.prototype.flat` и `Array.prototype.flatMap`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: &apos;Array.prototype.flat сводит многомерный массив в одномерный до указанной глубины. Array.prototype.flatMap эквивалентно применению map, за которым следует flat.&apos;
tweet: &apos;1138457106380709891&apos;
---
## `Array.prototype.flat`

Массив в этом примере имеет несколько уровней вложенности: он содержит массив, который, в свою очередь, содержит другой массив.

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ внешний массив
//                ^^^^^^^^  вложенный массив
//                    ^^^   самый глубокий массив
```

`Array#flat` возвращает одномерную версию многомерного массива.

```js
array.flat();
// → [1, 2, [3]]

// …эквивалентно:
array.flat(1);
// → [1, 2, [3]]
```

Глубина по умолчанию равна `1`, но можно указать любое число для рекурсивного свёртывания до этой глубины. Чтобы продолжать свёртывание рекурсивно, пока в результате не останется вложенных массивов, нужно передать `Infinity`.

```js
// Рекурсивное свёртывание до полного удаления вложенных массивов:
array.flat(Infinity);
// → [1, 2, 3]
```

Почему этот метод называется `Array.prototype.flat`, а не `Array.prototype.flatten`? [Прочтите наш разбор #SmooshGate, чтобы узнать!](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

Вот ещё один пример. У нас есть функция `duplicate`, которая принимает значение и возвращает массив, содержащий это значение дважды. Если применить `duplicate` к каждому значению массива, получится вложенный массив.

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

Затем можно вызвать `flat` для результата, чтобы свести массив:

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

Поскольку этот шаблон очень распространён в функциональном программировании, для него теперь существует специальный метод `flatMap`.

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` немного эффективнее, чем выполнение `map`, за которым следует `flat` по отдельности.

Интересуетесь вариантами использования `flatMap`? Ознакомьтесь с [объяснением Акселя Раушмайера](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values).

## Поддержка `Array#{flat,flatMap}`

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
