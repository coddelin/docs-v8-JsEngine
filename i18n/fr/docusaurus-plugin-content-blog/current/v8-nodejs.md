---
title: 'V8 ❤️ Node.js'
author: 'Franziska Hinkelmann, Node Monkey Patcher'
date: 2016-12-15 13:33:37
tags:
  - Node.js
description: 'Ce billet de blog met en lumière certains des efforts récents pour améliorer le support de Node.js dans V8 et Chrome DevTools.'
---
La popularité de Node.js a augmenté régulièrement ces dernières années, et nous avons travaillé pour rendre Node.js meilleur. Ce billet de blog met en lumière certains des efforts récents dans V8 et DevTools.

## Déboguer Node.js avec DevTools

Vous pouvez maintenant [déboguer des applications Node à l'aide des outils de développement de Chrome](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t). L'équipe Chrome DevTools a déplacé le code source qui implémente le protocole de débogage de Chromium vers V8, ce qui facilite la mise à jour des sources de débogueur et des dépendances pour Node Core. D'autres fournisseurs de navigateurs et IDE utilisent également le protocole de débogage Chrome, améliorant ensemble l'expérience des développeurs travaillant avec Node.

<!--truncate-->
## Optimisations de vitesse pour ES2015

Nous travaillons dur pour rendre V8 plus rapide que jamais. [Une grande partie de nos travaux récents sur les performances se concentre sur les fonctionnalités ES6](/blog/v8-release-56), notamment les promesses, les générateurs, les destructeurs et les opérateurs rest/spread. Étant donné que les versions de V8 dans Node 6.2 et au-delà prennent en charge ES6, les développeurs Node peuvent utiliser de nouvelles fonctionnalités de langage "nativement", sans polyfills. Cela signifie que les développeurs Node sont souvent les premiers à bénéficier des améliorations de performance ES6. De même, ils sont souvent les premiers à reconnaître les régressions de performance. Grâce à une communauté Node attentive, nous avons découvert et corrigé de nombreuses régressions, y compris des problèmes de performance avec [`instanceof`](https://github.com/nodejs/node/issues/9634), [`buffer.length`](https://github.com/nodejs/node/issues/9006), [des listes d'arguments longues](https://github.com/nodejs/node/pull/9643), et [`let`/`const`](https://github.com/nodejs/node/issues/9729).

## Corrections à venir pour le module `vm` de Node.js et REPL

Le [module `vm`](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html) présente [certaines limitations de longue date](https://github.com/nodejs/node/issues/6283). Afin de traiter ces problèmes correctement, nous avons étendu l'API V8 pour implémenter un comportement plus intuitif. Nous sommes ravis d'annoncer que les améliorations du module vm font partie des projets que nous soutenons en tant que mentors dans [Outreachy pour la Fondation Node](https://nodejs.org/en/foundation/outreachy/). Nous espérons voir des progrès supplémentaires sur ce projet et d'autres dans un avenir proche.

## `async`/`await`

Avec les fonctions asynchrones, vous pouvez simplifier drastiquement le code asynchrone en réécrivant le flux de programme en attendant des promesses de manière séquentielle. `async`/`await` arrivera dans Node [avec la prochaine mise à jour de V8](https://github.com/nodejs/node/pull/9618). Nos travaux récents sur l'amélioration des performances des promesses et des générateurs ont contribué à rendre les fonctions asynchrones rapides. Dans une note connexe, nous travaillons également à fournir [des hooks de promesse](https://bugs.chromium.org/p/v8/issues/detail?id=4643), un ensemble d'APIs d'introspection nécessaires pour l'[API Node Async Hook](https://github.com/nodejs/node-eps/pull/18).

## Vous souhaitez essayer Node.js à la pointe de la technologie ?

Si vous êtes impatient de tester les nouvelles fonctionnalités de V8 dans Node et que cela ne vous dérange pas d'utiliser des logiciels instables à la pointe de la technologie, vous pouvez essayer notre branche d'intégration [ici](https://github.com/v8/node/tree/vee-eight-lkgr). [V8 est continuellement intégré dans Node](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration) avant que V8 n'atteigne Node.js, ce qui nous permet de détecter les problèmes tôt. Cependant, attention, c'est plus expérimental que Node.js tip-of-tree.
