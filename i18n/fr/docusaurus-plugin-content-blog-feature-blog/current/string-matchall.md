---
title: &apos;`String.prototype.matchAll`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-02-02
tags:
  - ECMAScript
  - ES2020
  - io19
description: &apos;String.prototype.matchAll facilite l&apos;itération sur tous les objets correspondants produits par une expression régulière donnée.&apos;
---
Il est courant d&apos;appliquer à plusieurs reprises la même expression régulière sur une chaîne pour obtenir toutes les correspondances. Dans une certaine mesure, cela est déjà possible aujourd&apos;hui en utilisant la méthode `String#match`.

Dans cet exemple, nous trouvons tous les mots constitués uniquement de chiffres hexadécimaux, puis nous enregistrons chaque correspondance :

```js
const string = &apos;Nombres hex magiques : DEADBEEF CAFE&apos;;
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// Résultat :
//
// &apos;DEADBEEF&apos;
// &apos;CAFE&apos;
```

Cependant, cela ne vous donne que les _sous-chaînes_ qui correspondent. Habituellement, vous ne voulez pas seulement les sous-chaînes, mais aussi des informations supplémentaires telles que l&apos;index de chaque sous-chaîne ou les groupes capturés dans chaque correspondance.

Il est déjà possible de faire cela en écrivant votre propre boucle et en suivant vous-même les objets correspondants, mais cela peut être un peu irritant et pas très pratique :

```js
const string = &apos;Nombres hex magiques : DEADBEEF CAFE&apos;;
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// Résultat :
//
// [ &apos;DEADBEEF&apos;, index: 19, input: &apos;Nombres hex magiques : DEADBEEF CAFE&apos; ]
// [ &apos;CAFE&apos;,     index: 28, input: &apos;Nombres hex magiques : DEADBEEF CAFE&apos; ]
```

La nouvelle API `String#matchAll` rend cela plus facile que jamais : vous pouvez désormais écrire une simple boucle `for`-`of` pour obtenir tous les objets correspondants.

```js
const string = &apos;Nombres hex magiques : DEADBEEF CAFE&apos;;
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// Résultat :
//
// [ &apos;DEADBEEF&apos;, index: 19, input: &apos;Nombres hex magiques : DEADBEEF CAFE&apos; ]
// [ &apos;CAFE&apos;,     index: 28, input: &apos;Nombres hex magiques : DEADBEEF CAFE&apos; ]
```

`String#matchAll` est particulièrement utile pour les expressions régulières avec des groupes de capture. Elle vous donne des informations complètes pour chaque correspondance individuelle, y compris les groupes capturés.

```js
const string = &apos;Dépôts GitHub préférés : tc39/ecma262 v8/v8.dev&apos;;
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} at ${match.index} with &apos;${match.input}&apos;`);
  console.log(`→ propriétaire : ${match.groups.owner}`);
  console.log(`→ dépôt : ${match.groups.repo}`);
}

<!--truncate-->
// Résultat :
//
// tc39/ecma262 at 23 with &apos;Dépôts GitHub préférés : tc39/ecma262 v8/v8.dev&apos;
// → propriétaire : tc39
// → dépôt : ecma262
// v8/v8.dev at 36 with &apos;Dépôts GitHub préférés : tc39/ecma262 v8/v8.dev&apos;
// → propriétaire : v8
// → dépôt : v8.dev
```

L&apos;idée générale est que vous écrivez simplement une boucle `for`-`of`, et `String#matchAll` s&apos;occupe du reste pour vous.

:::note
**Remarque :** Comme son nom l&apos;indique, `String#matchAll` est conçu pour parcourir _tous_ les objets correspondants. En tant que tel, il doit être utilisé avec des expressions régulières globales, c&apos;est-à-dire celles avec le drapeau `g` activé, car toute expression régulière non globale ne produirait qu&apos;une seule correspondance (au maximum). Appeler `matchAll` avec une expression régulière non globale entraîne une exception `TypeError`.
:::

## Prise en charge de `String.prototype.matchAll`

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="oui https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
