---
title: &apos;Promise combinators&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-12
tags:
  - ECMAScript
  - ES2020
  - ES2021
  - io19
  - Node.js 16
description: &apos;Il existe quatre combinateurs de promesses en JavaScript : Promise.all, Promise.race, Promise.allSettled et Promise.any.&apos;
tweet: &apos;1138819493956710400&apos;
---
Depuis l'introduction des promesses dans ES2015, JavaScript a pris en charge exactement deux combinateurs de promesses : les méthodes statiques `Promise.all` et `Promise.race`.

Deux nouvelles propositions sont actuellement en cours de standardisation : `Promise.allSettled` et `Promise.any`. Avec ces ajouts, il y aura un total de quatre combinateurs de promesses en JavaScript, chacun permettant différents cas d'utilisation.

<!--truncate-->
Voici un aperçu des quatre combinateurs :


| nom                                        | description                                     | statut                                                          |
| ------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | ne s'arrête pas brusquement                         | [ajouté dans ES2020 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)               | s'arrête lorsque l'une des valeurs d'entrée est rejetée  | ajouté dans ES2015 ✅                                              |
| [`Promise.race`](#promise.race)             | s'arrête lorsque l'une des valeurs d'entrée est achevée   | ajouté dans ES2015 ✅                                              |
| [`Promise.any`](#promise.any)               | s'arrête lorsque l'une des valeurs d'entrée est réalisée | [ajouté dans ES2021 ✅](https://github.com/tc39/proposal-promise-any)        |


Jetons un œil à un exemple d'utilisation pour chaque combinateur.

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all` vous permet de savoir si toutes les promesses d'entrée ont été réalisées ou si l'une d'entre elles a été rejetée.

Imaginez que l'utilisateur clique sur un bouton et que vous souhaitez charger des feuilles de style pour rendre une interface utilisateur complètement nouvelle. Ce programme lance une requête HTTP pour chaque feuille de style en parallèle :

```js
const promises = [
  fetch(&apos;/component-a.css&apos;),
  fetch(&apos;/component-b.css&apos;),
  fetch(&apos;/component-c.css&apos;),
];
try {
  const styleResponses = await Promise.all(promises);
  enableStyles(styleResponses);
  renderNewUi();
} catch (reason) {
  displayError(reason);
}
```

Vous voulez uniquement commencer à rendre la nouvelle interface utilisateur une fois que _toutes_ les requêtes ont réussi. Si quelque chose tourne mal, vous voulez afficher un message d'erreur dès que possible, sans attendre que les autres tâches soient terminées.

Dans ce cas, vous pouvez utiliser `Promise.all`: vous voulez savoir quand toutes les promesses sont réalisées, _ou_ dès que l'une d'entre elles est rejetée.

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race` est utile si vous voulez exécuter plusieurs promesses, et soit…

1. faire quelque chose avec le premier résultat réussi qui arrive (dans le cas où l'une des promesses est réalisée), _ou_
1. faire quelque chose dès qu'une des promesses est rejetée.

Autrement dit, si l'une des promesses est rejetée, vous voulez conserver ce rejet pour traiter le cas d'erreur séparément. L'exemple suivant fait exactement cela :

```js
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ]);
  renderResult(result);
} catch (error) {
  renderError(error);
}
```

Nous lançons une tâche computationnelle coûteuse qui pourrait prendre longtemps, mais nous la mettons en concurrence avec une promesse qui est rejetée après 2 secondes. En fonction de la première promesse réalisée ou rejetée, nous rendons soit le résultat calculé, soit le message d'erreur, dans deux chemins de code distincts.

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled` vous donne un signal lorsque toutes les promesses d'entrée sont _achevées_, ce qui signifie qu'elles sont soit _réalisées_ soit _rejetées_. Ceci est utile dans les cas où vous ne vous souciez pas de l'état de la promesse, vous voulez juste savoir quand le travail est terminé, que ce soit réussi ou non.

Par exemple, vous pouvez lancer une série d'appels API indépendants et utiliser `Promise.allSettled` pour vous assurer qu'ils sont tous terminés avant de faire autre chose, comme retirer un indicateur de chargement :

```js
const promises = [
  fetch(&apos;/api-call-1&apos;),
  fetch(&apos;/api-call-2&apos;),
  fetch(&apos;/api-call-3&apos;),
];
// Imaginez que certaines de ces requêtes échouent et que d'autres réussissent.

await Promise.allSettled(promises);
// Tous les appels API sont terminés (échoués ou réussis).
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any` vous donne un signal dès que l'une des promesses est remplie. C'est similaire à `Promise.race`, sauf que `any` ne rejette pas immédiatement lorsqu'une des promesses est rejetée.

```js
const promises = [
  fetch(&apos;/endpoint-a&apos;).then(() => &apos;a&apos;),
  fetch(&apos;/endpoint-b&apos;).then(() => &apos;b&apos;),
  fetch(&apos;/endpoint-c&apos;).then(() => &apos;c&apos;),
];
try {
  const first = await Promise.any(promises);
  // Une des promesses a été remplie.
  console.log(first);
  // → par exemple &apos;b&apos;
} catch (error) {
  // Toutes les promesses ont été rejetées.
  console.assert(error instanceof AggregateError);
  // Journalisez les valeurs de rejet :
  console.log(error.errors);
  // → [
  //     <TypeError: Échec de la récupération de /endpoint-a>,
  //     <TypeError: Échec de la récupération de /endpoint-b>,
  //     <TypeError: Échec de la récupération de /endpoint-c>
  //   ]
}
```

Cet exemple de code vérifie quel endpoint répond le plus rapidement, puis l'enregistre. Ce n'est que si _toutes_ les requêtes échouent que nous arrivons dans le bloc `catch`, où nous pouvons ensuite gérer les erreurs.

Les rejets de `Promise.any` peuvent représenter plusieurs erreurs à la fois. Pour prendre en charge cela au niveau du langage, un nouveau type d'erreur appelé `AggregateError` est introduit. En plus de son utilisation de base dans l'exemple ci-dessus, les objets `AggregateError` peuvent également être créés de manière programmatique, tout comme les autres types d'erreurs :

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], &apos;Quelque chose s'est mal passé !&apos;);
```
