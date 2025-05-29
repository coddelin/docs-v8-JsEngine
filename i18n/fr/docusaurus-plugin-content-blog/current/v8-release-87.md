---
title: 'Sortie de V8 version v8.7'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), un porte-drapeau de V8'
avatars:
 - 'ingvar-stepanyan'
date: 2020-10-23
tags:
 - release
description: 'La version V8 v8.7 introduit une nouvelle API pour les appels natifs, Atomics.waitAsync, des corrections de bugs et des améliorations de performances.'
tweet: '1319654229863182338'
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est basée sur la branche maître du dépôt Git de V8 juste avant une étape de Chrome Beta. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7), qui est en phase bêta jusqu'à sa sortie en coordination avec Chrome 87 Stable dans quelques semaines. V8 v8.7 est rempli de toutes sortes de nouveautés pour les développeurs. Cet article offre un aperçu de certains points forts en prévision de la sortie.

<!--truncate-->
## JavaScript

### Appels JS rapides dangereux

V8 v8.7 est livré avec une API améliorée pour effectuer des appels natifs à partir de JavaScript.

Cette fonctionnalité est encore expérimentale et peut être activée via l'option `--turbo-fast-api-calls` dans V8 ou l'option correspondante `--enable-unsafe-fast-js-calls` dans Chrome. Elle est conçue pour améliorer les performances de certaines API graphiques natives dans Chrome, mais peut également être utilisée par d'autres intégrateurs. Elle offre de nouveaux moyens aux développeurs de créer des instances de `v8::FunctionTemplate`, comme documenté dans ce [fichier d'en-tête](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h). Les fonctions créées en utilisant l'ancienne API resteront inchangées.

Pour plus d'informations et une liste des fonctionnalités disponibles, veuillez consulter [cet exposé](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing).

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) est désormais disponible dans V8 v8.7.

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) et [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) sont des primitives de synchronisation de bas niveau utiles pour implémenter des mutex et d'autres moyens de synchronisation. Toutefois, puisque `Atomics.wait` est bloquant, il est impossible de l'appeler sur le thread principal (essayer de le faire entraînera une TypeError). La version non bloquante, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), est également utilisable sur le thread principal.

Découvrez [notre exposé sur les API `Atomics`](https://v8.dev/features/atomics) pour plus de détails.

## API V8

Veuillez utiliser `git log branch-heads/8.6..branch-heads/8.7 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs disposant d'un dépôt actif de V8 peuvent utiliser `git checkout -b 8.7 -t branch-heads/8.7` pour expérimenter les nouvelles fonctionnalités de V8 v8.7. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
