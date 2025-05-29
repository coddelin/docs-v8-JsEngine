---
title: &apos;Publication de V8 v5.7&apos;
author: &apos;l&apos;équipe de V8&apos;
date: 2017-02-06 13:33:37
tags:
  - publication
description: &apos;V8 v5.7 active WebAssembly par défaut, inclut des améliorations de performance et un support accru des fonctionnalités du langage ECMAScript.&apos;
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est branchée à partir du maître Git de V8 juste avant une étape de Chrome Beta. Aujourd'hui, nous sommes ravis d'annoncer notre dernière branche, [V8 version 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7), qui sera en bêta jusqu'à sa sortie en coordination avec Chrome 57 Stable dans plusieurs semaines. V8 5.7 est rempli de toutes sortes de nouveautés pour les développeurs. Nous souhaitons vous donner un aperçu de certains des points forts en prévision de la publication.

<!--truncate-->
## Améliorations des performances

### Fonctions asynchrones natives aussi rapides que les promesses

Les fonctions asynchrones sont maintenant presque aussi rapides que le même code écrit avec des promesses. Les performances d'exécution des fonctions asynchrones ont quadruplé selon nos [microbenchmarks](https://codereview.chromium.org/2577393002). Pendant la même période, les performances globales des promesses ont également doublé.

![Améliorations des performances asynchrones dans V8 sur Linux x64](/_img/v8-release-57/async.png)

### Améliorations continues d'ES2015

V8 continue de rendre les fonctionnalités du langage ES2015 plus rapides afin que les développeurs puissent utiliser de nouvelles fonctionnalités sans subir de coût en termes de performance. L'opérateur de propagation, le destructuring et les générateurs sont désormais [presque aussi rapides que leurs équivalents naïfs en ES5](https://fhinkel.github.io/six-speed/).

### RegExp 15% plus rapide

La migration des fonctions RegExp d'une implémentation JavaScript autonome vers une architecture qui s'intègre au générateur de code TurboFan a permis d'obtenir des performances globales ~15% plus rapides pour RegExp. Plus de détails peuvent être trouvés dans [l'article de blog dédié](/blog/speeding-up-regular-expressions).

## Fonctionnalités du langage JavaScript

Plusieurs ajouts récents à la bibliothèque standard ECMAScript sont inclus dans cette version. Deux méthodes de chaîne de caractères, [`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) et [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd), offrent des fonctionnalités de mise en forme utile, tandis que [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts) permet aux auteurs de personnaliser leur formatage de date/heure d'une manière adaptée à la langue locale.

## WebAssembly activé

Chrome 57 (qui inclut V8 v5.7) sera la première version à activer WebAssembly par défaut. Pour plus de détails, consultez les documents de démarrage sur [webassembly.org](http://webassembly.org/) et la documentation API sur [MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API).

## Ajouts à l'API V8

Veuillez consulter notre [résumé des modifications de l'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque version majeure. Les développeurs ayant une [version active de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.7 -t branch-heads/5.7` pour expérimenter les nouvelles fonctionnalités de V8 v5.7. Vous pouvez également [vous inscrire au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) pour essayer bientôt les nouvelles fonctionnalités par vous-même.

### `PromiseHook`

Cette API C++ permet aux utilisateurs d'implémenter du code de profilage qui trace le cycle de vie des promesses. Cela active la prochaine API [AsyncHook de Node](https://github.com/nodejs/node-eps/pull/18) qui vous permet de construire [la propagation de contexte asynchrone](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#).

L'API `PromiseHook` offre quatre hooks de cycle de vie : init, resolve, before et after. Le hook init est exécuté lorsqu'une nouvelle promesse est créée ; le hook resolve est exécuté lorsqu'une promesse est résolue ; les hooks pre & post sont exécutés juste avant et après un [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob). Pour plus d'informations, veuillez consulter [l'article de suivi](https://bugs.chromium.org/p/v8/issues/detail?id=4643) et le [document de conception](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit).
