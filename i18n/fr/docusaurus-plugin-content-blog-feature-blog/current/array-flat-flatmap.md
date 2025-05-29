---
title: '`Array.prototype.flat` et `Array.prototype.flatMap`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: 'Array.prototype.flat aplatit un tableau jusqu'à une profondeur spécifiée. Array.prototype.flatMap équivaut à effectuer un map suivi d'un flat séparément.'
tweet: '1138457106380709891'
---
## `Array.prototype.flat`

Le tableau dans cet exemple est profond de plusieurs niveaux : il contient un tableau qui lui-même contient un autre tableau.

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ tableau extérieur
//                ^^^^^^^^  tableau intérieur
//                    ^^^   tableau le plus intérieur
```

`Array#flat` retourne une version aplatie d'un tableau donné.

```js
array.flat();
// → [1, 2, [3]]

// …est équivalent à :
array.flat(1);
// → [1, 2, [3]]
```

La profondeur par défaut est `1`, mais vous pouvez passer n'importe quel nombre pour aplatir récursivement jusqu'à cette profondeur. Pour continuer d'aplatir récursivement jusqu'à ce que le résultat ne contienne plus de tableaux imbriqués, on passe `Infinity`.

```js
// Aplatir récursivement jusqu'à ce que le tableau ne contienne plus de tableaux imbriqués :
array.flat(Infinity);
// → [1, 2, 3]
```

Pourquoi cette méthode s'appelle-t-elle `Array.prototype.flat` et non `Array.prototype.flatten` ? [Lisez notre article sur le #SmooshGate pour le découvrir !](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

Voici un autre exemple. Nous avons une fonction `duplicate` qui prend une valeur et retourne un tableau contenant cette valeur deux fois. Si nous appliquons `duplicate` à chaque valeur d'un tableau, nous obtenons un tableau imbriqué.

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

Vous pouvez ensuite appeler `flat` sur le résultat pour aplatir le tableau :

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

Étant donné que ce schéma est très courant en programmation fonctionnelle, il existe maintenant une méthode dédiée `flatMap` pour cela.

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` est un peu plus efficace que d'effectuer un `map` suivi d'un `flat` séparément.

Vous êtes intéressé par les cas d'utilisation de `flatMap` ? Découvrez [l'explication d'Axel Rauschmayer](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values).

## Prise en charge de `Array#{flat,flatMap}`

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
