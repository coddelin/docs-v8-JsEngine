---
title: "Trie stable `Array.prototype.sort`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-07-02
tags:
  - ECMAScript
  - ES2019
  - io19
description: 'Array.prototype.sort est maintenant garanti d'être stable.'
tweet: "1146067251302244353"
---
Disons que vous avez un tableau de chiens, où chaque chien a un nom et une note. (Si cet exemple vous semble bizarre, sachez qu'il existe un compte Twitter qui se spécialise exactement là-dedans… Ne demandez pas !)

```js
// Notez comment le tableau est pré-trié par ordre alphabétique par `name`.
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// Triez les chiens par `rating` en ordre décroissant.
// (Cela met à jour `doggos` en place.)
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
Le tableau est pré-trié par ordre alphabétique par nom. Pour trier par note à la place (afin d'obtenir les chiens les mieux notés en premier), nous utilisons `Array#sort`, en passant un callback personnalisé qui compare les notes. Voici le résultat que vous attendriez probablement :

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

Les chiens sont triés par note, mais à l'intérieur de chaque note, ils sont toujours triés par ordre alphabétique par nom. Par exemple, Choco et Ghost ont la même note de 14, mais Choco apparaît avant Ghost dans le résultat du tri, car c'est l'ordre qu'ils avaient dans le tableau original également.

Pour obtenir ce résultat cependant, le moteur JavaScript ne peut pas utiliser _n'importe quel_ algorithme de tri — il doit s'agir d'un tri dit « stable ». Pendant longtemps, la spécification JavaScript ne nécessitait pas la stabilité du tri pour `Array#sort`, et laissait plutôt cela à l'implémentation. Et parce que ce comportement n'était pas spécifié, vous pouviez également obtenir ce résultat de tri, où Ghost apparaît soudainement avant Choco :

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

Autrement dit, les développeurs JavaScript ne pouvaient pas compter sur la stabilité des tris. En pratique, la situation était encore plus frustrante, car certains moteurs JavaScript utilisaient un tri stable pour les tableaux courts et un tri instable pour les tableaux plus grands. Cela était vraiment déroutant, car les développeurs testaient leur code, voyaient un résultat stable, mais obtenaient soudainement un résultat instable en production lorsque le tableau était légèrement plus grand.

Mais il y a de bonnes nouvelles. Nous [avons proposé une modification de la spécification](https://github.com/tc39/ecma262/pull/1340) qui rend `Array#sort` stable, et elle a été acceptée. Tous les principaux moteurs JavaScript implémentent maintenant un tri stable via `Array#sort`. C'est juste une chose de moins à laquelle les développeurs JavaScript doivent s'inquiéter. Cool !

(Oh, et [nous avons fait la même chose pour les `TypedArray`s](https://github.com/tc39/ecma262/pull/1433) : ce tri est également stable maintenant.)

:::note
**Note :** Bien que la stabilité soit maintenant requise par la spécification, les moteurs JavaScript sont toujours libres d'implémenter l'algorithme de tri de leur choix. [V8 utilise Timsort](/blog/array-sort#timsort), par exemple. La spécification ne mandate aucun algorithme de tri en particulier.
:::

## Support de fonctionnalité

### Trie stable `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="oui"
                 safari="oui"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="oui https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### Trie stable `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="oui"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="oui https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
