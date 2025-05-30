---
title: "V8 version v5.9"
author: "L'équipe V8"
date: "2017-04-27 13:33:37"
tags: 
  - version
description: "V8 v5.9 inclut le nouveau pipeline Ignition + TurboFan et ajoute la prise en charge de WebAssembly TrapIf sur toutes les plateformes."
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du maître Git de V8 immédiatement avant une étape de bêta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [V8 version 5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9), qui sera en bêta jusqu'à sa publication en coordination avec Chrome 59 Stable dans quelques semaines. V8 5.9 est rempli de toutes sortes de nouveautés pour les développeurs. Nous souhaitons vous donner un aperçu de certains moments forts en prévision de la sortie.

<!--truncate-->
## Ignition+TurboFan lancé

V8 v5.9 sera la première version avec Ignition+TurboFan activé par défaut. En général, ce changement devrait entraîner une consommation de mémoire réduite et un démarrage plus rapide des applications web sur toute la ligne, et nous ne nous attendons pas à des problèmes de stabilité ou de performance puisque le nouveau pipeline a déjà été soumis à de nombreux tests. Cependant, [contactez-nous](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline) si votre code commence soudainement à présenter des régressions importantes de performance.

Pour plus d'informations, consultez [notre article dédié](/blog/launching-ignition-and-turbofan).

## Prise en charge WebAssembly `TrapIf` sur toutes les plateformes

[La prise en charge de WebAssembly `TrapIf`](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe) réduit significativement le temps consacré à la compilation du code (~30 %).

![](/_img/v8-release-59/angrybots.png)

## API V8

Veuillez consulter notre [résumé des modifications API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est mis à jour régulièrement quelques semaines après chaque sortie majeure.

Les développeurs ayant un [checkout V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.9 -t branch-heads/5.9` pour expérimenter les nouvelles fonctionnalités de V8 5.9. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités vous-même bientôt.
