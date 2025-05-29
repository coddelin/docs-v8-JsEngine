---
title: "Version v6.8 de V8"
author: "l'équipe V8"
date: "2018-06-21 13:33:37"
tags: 
  - publication
description: "La version v6.8 de V8 propose une réduction de la consommation de mémoire et plusieurs améliorations de performance."
tweet: "1009753739060826112"
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est créée à partir de la branche principale de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes heureux d’annoncer notre dernière branche, [V8 version 6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8), qui est en phase Beta jusqu'à sa sortie en coordination avec Chrome 68 Stable dans plusieurs semaines. V8 v6.8 regorge de nombreuses fonctionnalités intéressantes pour les développeurs. Ce billet offre un aperçu de certains des points saillants à l’approche de la publication.

<!--truncate-->
## Mémoire

Les fonctions JavaScript conservaient inutilement des fonctions externes et leurs métadonnées (connues sous le nom de `SharedFunctionInfo` ou `SFI`). Surtout dans les codes riches en fonctions qui reposent sur des IIFE (immediately invoked function expressions) de courte durée, cela pouvait entraîner des fuites de mémoire sporadiques. Avant ce changement, un `Context` actif (c’est-à-dire une représentation en mémoire vive d’une activation de fonction) conservait le `SFI` de la fonction qui avait créé le contexte :

![](/_img/v8-release-68/context-jsfunction-before.svg)

En permettant au `Context` de pointer vers un objet `ScopeInfo` contenant les informations allégées nécessaires au débogage, nous pouvons rompre la dépendance au `SFI`.

![](/_img/v8-release-68/context-jsfunction-after.svg)

Nous avons déjà constaté une amélioration de 3 % de la mémoire V8 sur les appareils mobiles sur un ensemble de 10 principales pages.

En parallèle, nous avons réduit la consommation de mémoire des `SFI` eux-mêmes, en supprimant des champs inutiles ou en les compressant lorsque cela est possible, ce qui a réduit leur taille d’environ 25 %, avec d’autres réductions prévues dans de futures versions. Nous avons observé que les `SFI` occupaient 2 à 6 % de la mémoire V8 sur les sites Web typiques même après les avoir détachés du contexte, de sorte que vous devriez constater des améliorations de mémoire pour les codes comportant un grand nombre de fonctions.

## Performance

### Améliorations du destructuring des tableaux

Le compilateur optimisant ne générait pas de code idéal pour le destructuring des tableaux. Par exemple, l’échange de variables en utilisant `[a, b] = [b, a]` était deux fois plus lent que `const tmp = a; a = b; b = tmp`. Une fois que nous avons débloqué l’analyse des échappements pour éliminer toute allocation temporaire, le destructuring des tableaux avec un tableau temporaire est aussi rapide qu’une séquence d’affectations.

### Améliorations de `Object.assign`

Jusqu’à présent, `Object.assign` avait un chemin rapide écrit en C++. Cela signifiait qu’il fallait passer de JavaScript à C++ pour chaque appel de `Object.assign`. Une façon évidente d’améliorer les performances des fonctionnalités intégrées était de mettre en œuvre un chemin rapide côté JavaScript. Nous avions deux options : soit l’implémenter comme une fonctionnalité intégrée native JS (qui entraînerait un certain surcoût inutile dans ce cas), soit l’implémenter [en utilisant la technologie CodeStubAssembler](/blog/csa) (qui offre plus de flexibilité). Nous avons opté pour cette dernière solution. La nouvelle implémentation de `Object.assign` améliore le score de [Speedometer2/React-Redux d’environ 15 %, ce qui améliore le score total de Speedometer 2 de 1,5 %](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590).

### Améliorations de `TypedArray.prototype.sort`

`TypedArray.prototype.sort` dispose de deux chemins : un chemin rapide, utilisé lorsque l’utilisateur ne fournit pas de fonction de comparaison, et un chemin lent pour tout le reste. Jusqu’à présent, le chemin lent réutilisait l’implémentation de `Array.prototype.sort`, qui fait beaucoup plus que ce qui est nécessaire pour le tri des `TypedArray`. V8 v6.8 remplace le chemin lent par une implémentation dans le [CodeStubAssembler](/blog/csa). (Non pas directement CodeStubAssembler mais un langage spécifique au domaine basé sur CodeStubAssembler).

Les performances pour le tri des `TypedArray` sans fonction de comparaison restent les mêmes tandis qu’on observe une accélération allant jusqu’à 2,5× lors du tri avec une fonction de comparaison.

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

Dans V8 v6.8, vous pouvez commencer à utiliser [le contrôle des limites basé sur les traps](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit) sur les plateformes Linux x64. Cette optimisation de gestion de la mémoire améliore considérablement la vitesse d’exécution de WebAssembly. Elle est déjà utilisée dans Chrome 68, et à l’avenir, d’autres plateformes seront progressivement prises en charge.

## API V8

Veuillez utiliser `git log branch-heads/6.7..branch-heads/6.8 include/v8.h` pour obtenir une liste des modifications de l’API.

Les développeurs disposant d’un [dépôt actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.8 -t branch-heads/6.8` pour expérimenter les nouvelles fonctionnalités de V8 v6.8. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
