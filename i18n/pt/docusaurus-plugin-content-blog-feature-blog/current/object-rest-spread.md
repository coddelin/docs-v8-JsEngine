---
title: "Propriedades de descanso e espalhamento de objeto"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-06-06
tags:
  - ECMAScript
  - ES2018
description: "Este artigo explica como as propriedades de descanso e espalhamento de objeto funcionam em JavaScript, e revisita os elementos de descanso e espalhamento de arrays."
tweet: "890269994688315394"
---
Antes de discutir _propriedades de descanso e espalhamento de objeto_, vamos dar uma volta pela memória e relembrar um recurso muito semelhante.

## Elementos de descanso e espalhamento de array do ES2015

O bom e velho ECMAScript 2015 introduziu _elementos de descanso_ para a atribuição de destruturação de array e _elementos de espalhamento_ para literais de array.

```js
// Elementos de descanso para atribuição de destruturação de array:
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// Elementos de espalhamento para literais de array:
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: propriedades de descanso e espalhamento de objeto 🆕

Então, o que há de novo? Bem, [uma proposta](https://github.com/tc39/proposal-object-rest-spread) permite propriedades de descanso e espalhamento para literais de objeto também.

```js
// Propriedades de descanso para atribuição de destruturação de objeto:
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
// Propriedades de espalhamento para literais de objeto:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

As propriedades de espalhamento oferecem uma alternativa mais elegante ao [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) em muitas situações:

```js
// Clonar superficialmente um objeto:
const data = { x: 42, y: 27, label: 'Treasure' };
// A maneira antiga:
const clone1 = Object.assign({}, data);
// A maneira nova:
const clone2 = { ...data };
// Ambos resultam em:
// { x: 42, y: 27, label: 'Treasure' }

// Mesclar dois objetos:
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// A maneira antiga:
const settings1 = Object.assign({}, defaultSettings, userSettings);
// A maneira nova:
const settings2 = { ...defaultSettings, ...userSettings };
// Ambos resultam em:
// { logWarnings: false, logErrors: true }
```

No entanto, existem algumas diferenças sutis em como o espalhamento lida com setters:

1. `Object.assign()` aciona setters; o espalhamento não.
1. Você pode impedir que `Object.assign()` crie propriedades próprias via propriedades de leitura herdadas, mas não o operador de espalhamento.

[O artigo de Axel Rauschmayer](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them) explica esses detalhes com mais profundidade.

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
