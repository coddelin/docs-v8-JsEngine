---
title: 'Méthode `at` pour l'indexation relative'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2021-07-13
tags:
  - ECMAScript
description: 'JavaScript dispose maintenant d'une méthode d'indexation relative pour les tableaux, TypedArrays et chaînes de caractères.'
---

La nouvelle méthode `at` sur `Array.prototype`, les différents prototypes de TypedArray et `String.prototype` facilite et rend plus succincte l'accès à un élément proche de la fin de la collection.

Accéder au Nième élément depuis la fin d'une collection est une opération courante. Cependant, les façons habituelles de le faire sont verbeuses, comme `my_array[my_array.length - N]`, ou pourraient ne pas être performantes, comme `my_array.slice(-N)[0]`. La nouvelle méthode `at` rend cette opération plus ergonomique en interprétant les indices négatifs comme signifiant « depuis la fin ». Les exemples précédents peuvent être exprimés comme `my_array.at(-N)`.

<!--truncate-->
Pour uniformité, les indices positifs sont également pris en charge et équivalent à un accès ordinaire aux propriétés.

Cette nouvelle méthode est suffisamment simple pour que ses pleines sémantiques puissent être comprises grâce à cette implémentation conforme en polyfill ci-dessous :

```js
function at(n) {
  // Convertir l'argument en entier
  n = Math.trunc(n) || 0;
  // Autoriser l'indexation négative depuis la fin
  if (n < 0) n += this.length;
  // Un accès hors limites renvoie undefined
  if (n < 0 || n >= this.length) return undefined;
  // Sinon, c'est juste un accès normal aux propriétés
  return this[n];
}
```

## Un mot sur les chaînes

Étant donné que `at` effectue finalement un indexage ordinaire, appeler `at` sur des valeurs String retourne des unités de code, tout comme le ferait l'indexation ordinaire. Et comme l'indexation ordinaire sur des chaînes, les unités de code ne sont peut-être pas ce que vous souhaitez pour les chaînes Unicode ! Veuillez envisager si [`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt) est plus approprié pour votre cas d'utilisation.

## Prise en charge de la méthode `at`

<feature-support chrome="92"
                 firefox="90"
                 safari="non"
                 nodejs="non"
                 babel="oui https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
