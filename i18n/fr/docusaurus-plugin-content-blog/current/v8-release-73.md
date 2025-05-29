---
title: 'Publication de la version v7.3 de V8'
author: 'Clemens Backes, maître des compilateurs'
avatars:
  - clemens-backes
date: 2019-02-07 11:30:42
tags:
  - publication
description: 'V8 v7.3 inclut des améliorations de performances pour WebAssembly et les opérations asynchrones, des traces de pile asynchrones, Object.fromEntries, String#matchAll, et bien plus encore !'
tweet: '1093457099441561611'
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du maître Git de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes heureux d’annoncer notre nouvelle branche, [V8 version 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3), qui est en bêta jusqu'à sa publication en coordination avec Chrome 73 Stable dans plusieurs semaines. V8 v7.3 est rempli de toutes sortes d’améliorations pour les développeurs. Ce post offre un aperçu de certains des points forts avant la publication.

<!--truncate-->
## Traces de pile asynchrones

Nous activons [le drapeau `--async-stack-traces`](/blog/fast-async#improved-developer-experience) par défaut. [Les traces de pile asynchrones sans coût](https://bit.ly/v8-zero-cost-async-stack-traces) facilitent le diagnostic des problèmes en production avec du code fortement asynchrone, car la propriété `error.stack` habituellement envoyée aux fichiers ou services de journalisation fournit maintenant plus d’informations sur la cause du problème.

## `await` plus rapide

En relation avec le drapeau `--async-stack-traces` mentionné ci-dessus, nous activons également par défaut le drapeau `--harmony-await-optimization`, qui est une condition préalable pour `--async-stack-traces`. Consultez [fonctions asynchrones et promesses plus rapides](/blog/fast-async#await-under-the-hood) pour plus de détails.

## Démarrage Wasm plus rapide

Grâce à des optimisations des internes de Liftoff, nous avons considérablement amélioré la vitesse de compilation de WebAssembly sans nuire à la qualité du code généré. Pour la plupart des workloads, le temps de compilation a été réduit de 15 à 25 %.

![Temps de compilation de Liftoff sur [la démo Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)](/_img/v8-release-73/liftoff-epic.svg)

## Fonctionnalités du langage JavaScript

V8 v7.3 apporte plusieurs nouvelles fonctionnalités du langage JavaScript.

### `Object.fromEntries`

L’API `Object.entries` n’est pas nouvelle :

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

Malheureusement, il n’y avait pas de moyen simple de revenir du résultat `entries` à un objet équivalent… jusqu’à maintenant ! V8 v7.3 prend en charge [`Object.fromEntries()`](/features/object-fromentries), une nouvelle API intégrée qui effectue l’inverse de `Object.entries` :

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Pour plus d’informations et des exemples d’utilisation, consultez [notre explainer sur `Object.fromEntries`](/features/object-fromentries).

### `String.prototype.matchAll`

Un cas d'utilisation fréquent des expressions régulières globales (`g`) ou adhésives (`y`) est de les appliquer à une chaîne et d’itérer sur toutes les correspondances. La nouvelle API `String.prototype.matchAll` facilite plus que jamais cela, notamment pour les expressions régulières avec des groupes de capture :

```js
const string = 'Dépôts favoris de GitHub : tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} à ${match.index} avec '${match.input}'`);
  console.log(`→ propriétaire : ${match.groups.owner}`);
  console.log(`→ dépôt : ${match.groups.repo}`);
}

// Résultat :
//
// tc39/ecma262 à 23 avec 'Dépôts favoris de GitHub : tc39/ecma262 v8/v8.dev'
// → propriétaire : tc39
// → dépôt : ecma262
// v8/v8.dev à 36 avec 'Dépôts favoris de GitHub : tc39/ecma262 v8/v8.dev'
// → propriétaire : v8
// → dépôt : v8.dev
```

Pour plus de détails, lisez [notre explainer sur `String.prototype.matchAll`](/features/string-matchall).

### `Atomics.notify`

`Atomics.wake` a été renommé en `Atomics.notify`, conformément à [un changement récent de la spécification](https://github.com/tc39/ecma262/pull/1220).

## API V8

Veuillez utiliser `git log branch-heads/7.2..branch-heads/7.3 include/v8.h` pour obtenir une liste des changements de l’API.

Les développeurs ayant [une copie active de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.3 -t branch-heads/7.3` pour expérimenter les nouvelles fonctionnalités de V8 v7.3. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités bientôt.
