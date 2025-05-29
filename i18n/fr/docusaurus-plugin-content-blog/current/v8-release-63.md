---
title: &apos;Sortie de V8 v6.3&apos;
author: &apos;l&apos;équipe V8&apos;
date: 2017-10-25 13:33:37
tags:
  - sortie
description: &apos;V8 v6.3 inclut des améliorations de performances, une réduction de la consommation mémoire et une prise en charge des nouvelles fonctionnalités du langage JavaScript.&apos;
tweet: &apos;923168001108643840&apos;
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](/docs/release-process). Chaque version est dérivée du maître Git de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes ravis d’annoncer notre nouvelle branche, [V8 version 6.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3), qui est en beta jusqu’à sa sortie en coordination avec Chrome 63 Stable dans les semaines à venir. V8 v6.3 est remplie de toutes sortes de nouveautés pour les développeurs. Cet article fournit un aperçu de certains points forts en prévision de la sortie.

<!--truncate-->
## Rapidité

[Jank Busters](/blog/jank-busters) III est arrivé dans le cadre du projet [Orinoco](/blog/orinoco). Le marquage concurrent ([70-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984) des opérations de marquage est effectué sur un thread non-bloquant) est activé.

Le parseur n’a désormais plus [besoin de prérédiger une fonction une seconde fois](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11). Cela représente une [amélioration médiane de 14% du temps de parsing](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml) sur notre benchmark interne Top25 de démarrage.

`string.js` a été entièrement porté sur CodeStubAssembler. Un grand merci à [@peterwmwong](https://twitter.com/peterwmwong) pour [ses contributions remarquables](https://chromium-review.googlesource.com/q/peter.wm.wong)! En tant que développeur, cela signifie que les fonctions natives des chaînes de caractères comme `String#trim` sont bien plus rapides depuis V8 v6.3.

Les performances de `Object.is()` sont désormais à peu près au niveau des alternatives. En général, V8 v6.3 poursuit l’objectif d’améliorer les performances de l’ES2015+. Parmi d’autres, nous avons amélioré [la vitesse d’accès polymorphique aux symboles](https://bugs.chromium.org/p/v8/issues/detail?id=6367), [l’inlining polymorphique des appels de constructeurs](https://bugs.chromium.org/p/v8/issues/detail?id=6885) et [les littéraux modèles (taggés)](https://pasteboard.co/GLYc4gt.png).

![Les performances de V8 au cours des six dernières sorties](/_img/v8-release-63/ares6.svg)

La liste des fonctions optimisées faibles a été supprimée. Plus d’informations sont disponibles dans [l’article de blog dédié](/blog/lazy-unlinking).

Les éléments mentionnés ne sont qu’une liste non exhaustive d’améliorations de performances. Beaucoup d’autres travaux liés aux performances ont été effectués.

## Consommation mémoire

[Les barrières d’écriture sont passées à l’utilisation de CodeStubAssembler](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8). Cela économise environ 100 Ko de mémoire par instance.

## Fonctionnalités du langage JavaScript

V8 prend désormais en charge les fonctionnalités de l’étape 3 suivantes : [importation dynamique de modules via `import()`](/features/dynamic-import), [`Promise.prototype.finally()`](/features/promise-finally) et [les itérateurs/générateurs asynchrones](https://github.com/tc39/proposal-async-iteration).

Avec [l’importation dynamique de modules](/features/dynamic-import), l’importation de modules en fonction des conditions d’exécution est très simple. Cela est utile lorsqu'une application doit charger certains modules de code de manière paresseuse.

[`Promise.prototype.finally`](/features/promise-finally) introduit un moyen facile de nettoyer après la résolution d'une promesse.

L’itération avec des fonctions asynchrones est devenue plus ergonomique avec l’introduction des [itérateurs/générateurs asynchrones](https://github.com/tc39/proposal-async-iteration).

Côté `Intl`, [`Intl.PluralRules`](/features/intl-pluralrules) est désormais pris en charge. Cette API permet des pluralisations internationalisées performantes.

## Inspecteur/Débogage

Dans Chrome 63, [la couverture des blocs](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44) est également prise en charge dans l’interface utilisateur DevTools. Veuillez noter que le protocole de l’inspecteur prend déjà en charge la couverture des blocs depuis V8 v6.2.

## API V8

Veuillez consulter notre [résumé des modifications de l’API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque sortie majeure.

Les développeurs disposant d’un [checkout actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.3 -t branch-heads/6.3` pour expérimenter les nouvelles fonctionnalités de V8 v6.3. Sinon, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
