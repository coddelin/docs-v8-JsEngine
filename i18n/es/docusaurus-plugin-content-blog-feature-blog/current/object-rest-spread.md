---
title: 'Propiedades de reposo y propagación de objetos'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-06-06
tags:
  - ECMAScript
  - ES2018
description: 'Este artículo explica cómo funcionan las propiedades de reposo y propagación de objetos en JavaScript, y revisa los elementos de reposo y propagación de arrays.'
tweet: '890269994688315394'
---
Antes de discutir _propiedades de reposo y propagación de objetos_, hagamos un viaje al pasado y recordemos una característica muy similar.

## Elementos de reposo y propagación de arrays en ES2015

La buena vieja ECMAScript 2015 introdujo _elementos de reposo_ para la asignación de desestructuración de arrays y _elementos de propagación_ para literales de arrays.

```js
// Elementos de reposo para la asignación de desestructuración de arrays:
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// Elementos de propagación para literales de arrays:
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: propiedades de reposo y propagación de objetos 🆕

¿Qué hay de nuevo entonces? Bueno, [una propuesta](https://github.com/tc39/proposal-object-rest-spread) permite propiedades de reposo y propagación para literales de objetos también.

```js
// Propiedades de reposo para la asignación de desestructuración de objetos:
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
// Propiedades de propagación para literales de objetos:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

Las propiedades de propagación ofrecen una alternativa más elegante a [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) en muchas situaciones:

```js
// Clonar un objeto superficialmente:
const data = { x: 42, y: 27, label: 'Treasure' };
// La manera antigua:
const clone1 = Object.assign({}, data);
// La manera nueva:
const clone2 = { ...data };
// Ambos resultan en:
// { x: 42, y: 27, label: 'Treasure' }

// Fusionar dos objetos:
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// La manera antigua:
const settings1 = Object.assign({}, defaultSettings, userSettings);
// La manera nueva:
const settings2 = { ...defaultSettings, ...userSettings };
// Ambos resultan en:
// { logWarnings: false, logErrors: true }
```

Sin embargo, hay algunas diferencias sutiles en cómo la propagación maneja los setters:

1. `Object.assign()` activa setters; la propagación no lo hace.
1. Puedes evitar que `Object.assign()` cree propiedades propias mediante propiedades heredadas de solo lectura, pero no con el operador de propagación.

[La redacción de Axel Rauschmayer](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them) explica estos inconvenientes con más detalle.

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
