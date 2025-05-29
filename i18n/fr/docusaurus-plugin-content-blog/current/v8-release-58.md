---
title: "Publication de V8 v5.8"
author: 'l'équipe V8'
date: 2017-03-20 13:33:37
tags:
  - release
description: 'V8 v5.8 permet l'utilisation de tailles de tas arbitraires et améliore les performances de démarrage.'
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du master Git de V8 juste avant une étape Beta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8), qui sera en version bêta avant d'être publiée en coordination avec la version Chrome 58 Stable dans plusieurs semaines. V8 5.8 regorge de toutes sortes de nouveautés pour les développeurs. Nous aimerions vous donner un aperçu de certains des points forts en prévision de sa sortie.

<!--truncate-->
## Tailles de tas arbitraires

Historiquement, la limite du tas V8 était commodément définie pour s'adapter à la plage des entiers 32 bits signés avec une certaine marge. Au fil du temps, cette commodité a conduit à du code négligent dans V8 mélangeant des types de différentes largeurs de bits, ce qui a effectivement empêché d'augmenter la limite. Dans V8 v5.8, nous avons activé l'utilisation de tailles de tas arbitraires. Consultez le [message de blog dédié](/blog/heap-size-limit) pour plus d'informations.

## Performances de démarrage

Dans V8 v5.8, nous avons poursuivi les travaux pour réduire progressivement le temps passé dans V8 pendant le démarrage. Les réductions du temps passé à compiler et analyser le code, ainsi que les optimisations du système IC, ont permis d'améliorer d'environ 5 % nos [charges de travail réelles de démarrage](/blog/real-world-performance).

## API V8

Veuillez consulter notre [résumé des changements d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque version majeure.

Les développeurs avec un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.8 -t branch-heads/5.8` pour expérimenter les nouvelles fonctionnalités de V8 5.8. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
