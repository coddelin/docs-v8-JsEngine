---
title: &apos;`await` de niveau supérieur&apos;
author: &apos;Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))&apos;
avatars:
  - &apos;myles-borins&apos;
date: 2019-10-08
tags:
  - ECMAScript
  - Node.js 14
description: &apos;`await` de niveau supérieur arrive dans les modules JavaScript ! Vous pourrez bientôt utiliser `await` sans avoir besoin d&apos;être dans une fonction asynchrone.&apos;
tweet: &apos;1181581262399643650&apos;
---
[`await` de niveau supérieur](https://github.com/tc39/proposal-top-level-await) permet aux développeurs d&apos;utiliser le mot-clé `await` en dehors des fonctions asynchrones. Il agit comme une grande fonction asynchrone, obligeant d&apos;autres modules qui les `import` à attendre avant de commencer à évaluer leur corps.

<!--truncate-->
## L&apos;ancien comportement

Lorsque `async`/`await` a été introduit pour la première fois, tenter d&apos;utiliser un `await` en dehors d&apos;une fonction `async` entraînait une `SyntaxError`. De nombreux développeurs utilisaient des expressions de fonction async immédiatement invoquées afin d&apos;accéder à cette fonctionnalité.

```js
await Promise.resolve(console.log(&apos;🎉&apos;));
// → SyntaxError: await is only valid in async function

(async function() {
  await Promise.resolve(console.log(&apos;🎉&apos;));
  // → 🎉
}());
```

## Le nouveau comportement

Avec `await` de niveau supérieur, le code ci-dessus fonctionne comme prévu dans les [modules](/features/modules) :

```js
await Promise.resolve(console.log(&apos;🎉&apos;));
// → 🎉
```

:::note
**Remarque :** `await` de niveau supérieur fonctionne _uniquement_ au niveau supérieur des modules. Il n&apos;y a pas de prise en charge pour les scripts classiques ou les fonctions non asynchrones.
:::

## Cas d&apos;utilisation

Ces cas d&apos;utilisation sont tirés du [dépôt de proposition de spécification](https://github.com/tc39/proposal-top-level-await#use-cases).

### Dépendances dynamiques

```js
const strings = await import(`/i18n/${navigator.language}`);
```

Cela permet aux modules d&apos;utiliser des valeurs d&apos;exécution pour déterminer les dépendances. Cela est utile pour des cas comme les scissions développement/production, l&apos;internationalisation, les scissions d&apos;environnement, etc.

### Initialisation des ressources

```js
const connection = await dbConnector();
```

Cela permet aux modules de représenter des ressources et également de produire des erreurs dans les cas où le module ne peut pas être utilisé.

### Alternatives pour les dépendances

L&apos;exemple suivant tente de charger une bibliothèque JavaScript depuis le CDN A, et revient au CDN B en cas d&apos;échec :

```js
let jQuery;
try {
  jQuery = await import(&apos;https://cdn-a.example.com/jQuery&apos;);
} catch {
  jQuery = await import(&apos;https://cdn-b.example.com/jQuery&apos;);
}
```

## Ordre d&apos;exécution des modules

L&apos;une des plus grandes modifications de JavaScript avec `await` de niveau supérieur est l&apos;ordre d&apos;exécution des modules dans votre graphe. Le moteur JavaScript exécute les modules en [traversée en post-ordre](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order) : en commençant par le sous-arbre le plus à gauche de votre graphe de modules, les modules sont évalués, leurs liaisons sont exportées, et leurs frères et sœurs sont exécutés, suivis par leurs parents. Cet algorithme s&apos;exécute de manière récursive jusqu&apos;à l&apos;exécution de la racine de votre graphe de modules.

Avant `await` de niveau supérieur, cet ordre était toujours synchrone et déterministe : entre plusieurs exécutions de votre code, votre graphe était garanti de s&apos;exécuter dans le même ordre. Une fois que `await` de niveau supérieur est implémenté, cette même garantie existe, mais seulement tant que vous n&apos;utilisez pas `await` de niveau supérieur.

Voici ce qui se passe lorsque vous utilisez `await` de niveau supérieur dans un module :

1. L&apos;exécution du module en cours est différée jusqu&apos;à ce que la promesse attendue soit résolue.
1. L&apos;exécution du module parent est différée jusqu&apos;à ce que le module enfant qui a appelé `await`, et tous ses frères et sœurs, exportent des liaisons.
1. Les modules frères, ainsi que les frères et sœurs des modules parents, peuvent continuer à s&apos;exécuter dans le même ordre synchrone — en supposant qu&apos;il n&apos;y a pas de cycles ou d&apos;autres promesses `await` dans le graphe.
1. Le module qui a appelé `await` reprend son exécution après la résolution de la promesse `await`.
1. Le module parent et les arbres suivants continuent de s&apos;exécuter dans un ordre synchrone tant qu&apos;il n&apos;y a pas d&apos;autres promesses `await`.

## Cela ne fonctionne-t-il pas déjà dans DevTools ?

En effet, oui ! Le REPL dans [Chrome DevTools](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await), [Node.js](https://github.com/nodejs/node/issues/13209), et Safari Web Inspector prennent en charge `await` de niveau supérieur depuis un certain temps maintenant. Cependant, cette fonctionnalité n&apos;était pas standard et limitée au REPL ! Elle est distincte de la proposition `await` de niveau supérieur, qui fait partie de la spécification du langage et ne s&apos;applique qu&apos;aux modules. Pour tester du code en production s&apos;appuyant sur `await` de niveau supérieur de manière conforme à la sémantique de la proposition de spécification, assurez-vous de tester dans votre application réelle, et pas uniquement dans DevTools ou le REPL de Node.js !

## `await` de niveau supérieur n&apos;est-il pas problématique ?

Peut-être avez-vous vu [le célèbre gist](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221) de [Rich Harris](https://twitter.com/Rich_Harris) qui mettait initialement en lumière un certain nombre de préoccupations concernant l'`await` de niveau supérieur et exhortait le langage JavaScript à ne pas implémenter cette fonctionnalité. Quelques préoccupations spécifiques étaient :

- L'`await` de niveau supérieur pourrait bloquer l'exécution.
- L'`await` de niveau supérieur pourrait bloquer la récupération de ressources.
- Il n'y aurait aucune histoire d'interopérabilité claire pour les modules CommonJS.

La version au stade 3 de la proposition traite directement de ces problèmes :

- Comme les modules sœurs peuvent s'exécuter, il n'y a pas de blocage définitif.
- L'`await` de niveau supérieur se produit pendant la phase d'exécution du graphe des modules. À ce stade, toutes les ressources ont déjà été récupérées et liées. Il n'y a aucun risque de bloquer la récupération des ressources.
- L'`await` de niveau supérieur est limité aux modules. Il n'y a explicitement aucun support pour les scripts ou pour les modules CommonJS.

Comme pour toute nouvelle fonctionnalité de langage, il y a toujours un risque de comportement inattendu. Par exemple, avec l'`await` de niveau supérieur, les dépendances circulaires de modules pourraient introduire une impasse.

Sans l'`await` de niveau supérieur, les développeurs JavaScript utilisaient souvent des expressions de fonction immédiatement invoquées asynchrones juste pour accéder à `await`. Malheureusement, ce modèle entraîne moins de déterminisme dans l'exécution du graphe et l'analysabilité statique des applications. Pour ces raisons, l'absence d'`await` de niveau supérieur était considérée comme un risque plus élevé que les dangers introduits par la fonctionnalité.

## Support pour l'`await` de niveau supérieur

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="non https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="non https://github.com/babel/proposals/issues/44"></feature-support>
