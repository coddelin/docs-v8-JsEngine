---
title: 'Propriétés rest et spread des objets'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-06-06
tags:
  - ECMAScript
  - ES2018
description: 'Cet article explique comment fonctionnent les propriétés rest et spread des objets en JavaScript, et revient sur les éléments rest et spread des tableaux.'
tweet: '890269994688315394'
---
Avant de discuter des _propriétés rest et spread des objets_, faisons un petit retour en arrière pour nous rappeler une fonctionnalité très similaire.

## Éléments rest et spread des tableaux dans ES2015

Le bon vieux ECMAScript 2015 a introduit les _éléments rest_ pour l'affectation par déstructuration des tableaux et les _éléments spread_ pour les littéraux de tableaux.

```js
// Éléments rest pour l'affectation par déstructuration des tableaux :
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// Éléments spread pour les littéraux de tableaux :
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018 : propriétés rest et spread des objets 🆕

Quoi de neuf alors ? Eh bien, [une proposition](https://github.com/tc39/proposal-object-rest-spread) permet également les propriétés rest et spread pour les littéraux d'objets.

```js
// Propriétés rest pour l'affectation par déstructuration des objets :
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
// Propriétés spread pour les littéraux d'objets :
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

Les propriétés spread offrent une alternative plus élégante à [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) dans de nombreuses situations :

```js
// Cloner un objet de manière superficielle :
const data = { x: 42, y: 27, label: 'Treasure' };
// L'ancienne méthode :
const clone1 = Object.assign({}, data);
// La nouvelle méthode :
const clone2 = { ...data };
// Résultat identique :
// { x: 42, y: 27, label: 'Treasure' }

// Fusionner deux objets :
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// L'ancienne méthode :
const settings1 = Object.assign({}, defaultSettings, userSettings);
// La nouvelle méthode :
const settings2 = { ...defaultSettings, ...userSettings };
// Résultat identique :
// { logWarnings: false, logErrors: true }
```

Cependant, il existe des différences subtiles concernant la gestion des accesseurs par le spread :

1. `Object.assign()` déclenche les accesseurs ; le spread ne le fait pas.
1. Vous pouvez empêcher `Object.assign()` de créer des propriétés propres via des propriétés héritées en lecture seule, mais pas avec l'opérateur spread.

[L'article d'Axel Rauschmayer](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them) explique ces subtilités plus en détail.

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
