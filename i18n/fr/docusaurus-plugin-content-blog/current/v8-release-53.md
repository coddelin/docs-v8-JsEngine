---
title: "Version V8 v5.3"
author: 'l'équipe V8'
date: 2016-07-18 13:33:37
tags:
  - sortie
description: "V8 v5.3 apporte des améliorations de performances et une réduction de la consommation de mémoire."
---
Environ toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](/docs/release-process). Chaque version est issue du dépôt Git master de V8 immédiatement avant que Chrome ne crée une branche pour une version bêta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 5.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.3), qui sera en version bêta jusqu'à sa sortie en coordination avec Chrome 53 Stable. V8 v5.3 regorge de nouveautés destinées aux développeurs, et nous voulons vous offrir un aperçu de certains des points forts en prévision de la sortie dans plusieurs semaines.

<!--truncate-->
## Mémoire

### Nouveau interpréteur Ignition

Ignition, le nouvel interpréteur de V8, est complet en termes de fonctionnalités et sera activé dans Chrome 53 pour les appareils Android à faible mémoire. L'interpréteur apporte des économies immédiates de mémoire pour le code JIT et permettra à V8 de procéder à des optimisations futures pour un démarrage plus rapide lors de l'exécution du code. Ignition fonctionne en tandem avec les compilateurs optimisateurs existants de V8 (TurboFan et Crankshaft) pour garantir que le code « chaud » est optimisé pour des performances maximales. Nous continuons d'améliorer les performances de l'interpréteur et espérons bientôt activer Ignition sur toutes les plateformes, mobiles et desktop. Consultez un billet de blog à venir pour plus d'informations sur la conception, l'architecture et les gains de performances d'Ignition. Les versions intégrées de V8 peuvent activer l'interpréteur Ignition avec le drapeau `--ignition`.

### Réduction des ralentissements

V8 v5.3 inclut diverses modifications pour réduire les ralentissements des applications et les temps de collecte des déchets. Ces modifications incluent :

- Optimisation des poignées globales faibles pour réduire le temps passé à gérer la mémoire externe
- Unification du tas pour les collectes de déchets complètes afin de réduire les ralentissements liés à l'évacuation
- Optimisation des [alocations noires](/blog/orinoco) de V8 ajoutées à la phase de marquage de la collecte des déchets

Ensemble, ces améliorations réduisent les durées de pause complètes de la collecte des déchets d'environ 25 %, mesurées lors de la navigation sur un corpus de pages web populaires. Pour plus de détails sur les récentes optimisations de la collecte des déchets visant à réduire les ralentissements, consultez les billets de blog « Jank Busters » [Partie 1](/blog/jank-busters) et [Partie 2](/blog/orinoco).

## Performances

### Amélioration du temps de démarrage des pages

L'équipe V8 a récemment commencé à suivre les améliorations de performances sur un corpus de 25 chargements de pages de sites web réels (y compris des sites populaires tels que Facebook, Reddit, Wikipedia et Instagram). Entre V8 v5.1 (mesuré dans Chrome 51 en avril) et V8 v5.3 (mesuré dans un récent Chrome Canary 53), nous avons amélioré le temps de démarrage global des sites mesurés d'environ 7 %. Ces améliorations dans le chargement des sites réels ont reflété des gains similaires sur le benchmark Speedometer, qui était 14 % plus rapide dans V8 v5.3. Pour plus de détails sur notre nouvel outil de test, les améliorations du runtime et l'analyse des éléments où V8 passe du temps lors des chargements de pages, consultez notre prochain billet de blog sur les performances de démarrage.

### Performances des `Promise` ES2015

La performance de V8 sur la suite de benchmarks [Bluebird ES2015 `Promise`](https://github.com/petkaantonov/bluebird/tree/master/benchmark) s'est améliorée de 20 à 40 % dans V8 v5.3, variant selon l'architecture et le benchmark.

![Performances des Promises de V8 au fil du temps sur un Nexus 5x](/_img/v8-release-53/promise.png)

## API V8

Veuillez consulter notre [résumé des modifications d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque sortie majeure.

Les développeurs ayant une [version active de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.3 -t branch-heads/5.3` pour expérimenter les nouvelles fonctionnalités de V8 5.3. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités par vous-même bientôt.
