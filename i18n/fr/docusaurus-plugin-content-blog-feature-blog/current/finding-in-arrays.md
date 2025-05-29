---
title: 'Trouver des éléments dans les `Array`s et les TypedArrays'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2021-10-27
tags:
  - ECMAScript
description: 'Méthodes JavaScript pour trouver des éléments dans les Arrays et les TypedArrays'
tweet: '1453354998063149066'
---
## Trouver des éléments depuis le début

Trouver un élément qui satisfait une condition dans un `Array` est une tâche courante et se fait avec les méthodes `find` et `findIndex` sur `Array.prototype` et les divers prototypes TypedArray. `Array.prototype.find` prend un prédicat et retourne le premier élément dans le tableau pour lequel ce prédicat retourne `true`. Si le prédicat ne retourne `true` pour aucun élément, la méthode retourne `undefined`.

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex` fonctionne de manière similaire, sauf qu'elle retourne l'index lorsque trouvé, et `-1` lorsque non trouvé. Les versions TypedArray de `find` et `findIndex` fonctionnent exactement de la même manière, avec la seule différence qu'elles opèrent sur des instances TypedArray à la place des instances Array.

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## Trouver des éléments depuis la fin

Que faire si vous voulez trouver le dernier élément dans le `Array` ? Ce cas d'utilisation survient souvent naturellement, comme par exemple en choisissant de dédupliquer plusieurs correspondances en faveur du dernier élément, ou en sachant à l'avance que l'élément est probablement près de la fin du `Array`. Avec la méthode `find`, une solution consiste à inverser d'abord l'entrée, comme ceci :

```js
inputArray.reverse().find(predicate)
```

Cependant, cela inverse le `inputArray` original sur place, ce qui est parfois indésirable.

Avec les méthodes `findLast` et `findLastIndex`, ce cas d'utilisation peut être résolu directement et de manière ergonomique. Elles se comportent exactement comme leurs homologues `find` et `findIndex`, sauf qu'elles commencent leur recherche à partir de la fin du `Array` ou TypedArray.

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

## Support pour `findLast` et `findLastIndex`

<feature-support chrome="97"
                 firefox="non https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partiel https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="non"
                 babel="oui https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
