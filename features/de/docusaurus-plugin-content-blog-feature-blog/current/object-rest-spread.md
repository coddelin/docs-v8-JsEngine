---
title: &apos;Objekt Rest- und Spread-Eigenschaften&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-06-06
tags:
  - ECMAScript
  - ES2018
description: &apos;Dieser Artikel erklärt, wie Objekt-Rest- und Spread-Eigenschaften in JavaScript funktionieren, und geht noch einmal auf Array-Rest- und Spread-Elemente ein.&apos;
tweet: &apos;890269994688315394&apos;
---
Bevor wir über _Objekt-Rest- und Spread-Eigenschaften_ sprechen, machen wir eine Reise in die Vergangenheit und erinnern uns an ein sehr ähnliches Merkmal.

## ES2015 Array-Rest- und Spread-Elemente

Das gute alte ECMAScript 2015 führte _Rest-Elemente_ für die Array-Destrukturierung und _Spread-Elemente_ für Array-Literale ein.

```js
// Rest-Elemente für Array-Destrukturierungszuweisung:
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// Spread-Elemente für Array-Literale:
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: Objekt-Rest- und Spread-Eigenschaften 🆕

Was gibt es also Neues? Nun, ein [Vorschlag](https://github.com/tc39/proposal-object-rest-spread) erlaubt auch Rest- und Spread-Eigenschaften für Objektliterale.

```js
// Rest-Eigenschaften für Objekt-Destrukturierungszuweisung:
const person = {
    firstName: &apos;Sebastian&apos;,
    lastName: &apos;Markbåge&apos;,
    country: &apos;USA&apos;,
    state: &apos;CA&apos;,
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: &apos;USA&apos;, state: &apos;CA&apos; }

<!--truncate-->
// Spread-Eigenschaften für Objektliterale:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: &apos;Sebastian&apos;, lastName: &apos;Markbåge&apos;, country: &apos;USA&apos;, state: &apos;CA&apos; }
```

Spread-Eigenschaften bieten eine elegantere Alternative zu [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) in vielen Situationen:

```js
// Ein Objekt flach klonen:
const data = { x: 42, y: 27, label: &apos;Schatz&apos; };
// Der alte Weg:
const clone1 = Object.assign({}, data);
// Der neue Weg:
const clone2 = { ...data };
// Beide ergeben:
// { x: 42, y: 27, label: &apos;Schatz&apos; }

// Zwei Objekte zusammenführen:
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// Der alte Weg:
const settings1 = Object.assign({}, defaultSettings, userSettings);
// Der neue Weg:
const settings2 = { ...defaultSettings, ...userSettings };
// Beide ergeben:
// { logWarnings: false, logErrors: true }
```

Es gibt jedoch einige subtile Unterschiede in der Art und Weise, wie Spread mit Settern umgeht:

1. `Object.assign()` löst Setter aus; Spread nicht.
1. Sie können `Object.assign()` daran hindern, eigene Eigenschaften über geerbte schreibgeschützte Eigenschaften zu erstellen, aber nicht den Spread-Operator.

[Axel Rauschmayer’s Erklärung](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them) erläutert diese Feinheiten im Detail.

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
