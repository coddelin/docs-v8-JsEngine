---
title: &apos;Publication V8 v5.4&apos;
author: &apos;l&apos;équipe V8&apos;
date: 2016-09-09 13:33:37
tags:
  - publication
description: &apos;V8 v5.4 offre des améliorations de performance et une consommation de mémoire réduite.&apos;
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du maître Git de V8 juste avant une étape Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre toute dernière branche, [V8 version 5.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.4), qui restera en beta jusqu'à sa sortie en coordination avec Chrome 54 Stable dans quelques semaines. V8 v5.4 regorge de fonctionnalités destinées aux développeurs, nous aimerions donc vous donner un aperçu de certains points forts en anticipation de la sortie.

<!--truncate-->
## Améliorations des performances

V8 v5.4 apporte plusieurs améliorations clés en empreinte mémoire et en vitesse de démarrage. Ces améliorations accélèrent principalement l'exécution initiale des scripts et réduisent le temps de chargement des pages dans Chrome.

### Mémoire

Lors de la mesure de la consommation mémoire de V8, deux métriques sont très importantes à surveiller et comprendre : la consommation de _mémoire maximale_ et la consommation de _mémoire moyenne_. Réduire la consommation maximale est souvent tout aussi important que réduire la consommation moyenne, car un script en cours d'exécution qui épuise la mémoire disponible même pour un bref instant peut provoquer un crash _Hors Mémoire_, même si sa consommation de mémoire moyenne n'est pas très élevée. À des fins d'optimisation, il est utile de diviser la mémoire de V8 en deux catégories : la _mémoire sur tas_, qui contient les objets JavaScript réels, et la _mémoire hors tas_, qui contient le reste, comme les structures de données internes allouées par le compilateur, l'analyseur et le ramasse-miettes.

Dans la version 5.4, nous avons optimisé le ramasse-miettes de V8 pour les appareils à faible mémoire avec 512 Mo de RAM ou moins. Selon le site Web affiché, cela réduit la consommation de _mémoire maximale_ sur tas jusqu'à **40 %**.

La gestion de la mémoire à l'intérieur de l'analyseur JavaScript de V8 a été simplifiée pour éviter les allocations inutiles, réduisant l'utilisation _hors tas_ de la mémoire maximale jusqu'à **20 %**. Ces économies de mémoire sont particulièrement utiles pour réduire l'utilisation mémoire des grands fichiers de script, y compris les applications asm.js.

### Démarrage et vitesse

Nos travaux pour simplifier l'analyseur de V8 ont non seulement aidé à réduire la consommation de mémoire, mais ils ont également amélioré les performances d'exécution de l'analyseur. Cette simplification, combinée à d'autres optimisations des fonctions intégrées de JavaScript et à l'utilisation d'[antémémoires en ligne](https://fr.wikipedia.org/wiki/Ant%C3%A9m%C3%A9moire_en_ligne) globales pour les accès aux propriétés des objets JavaScript, a entraîné des gains notables en matière de performances de démarrage.

Notre [suite de tests de démarrage interne](https://www.youtube.com/watch?v=xCx4uC7mn6Y) mesurant les performances JavaScript réelles du monde a connu une amélioration médiane de 5 %. Le benchmark [Speedometer](http://browserbench.org/Speedometer/) en bénéficie également, améliorant les performances de [~10 à 13% par rapport à v5.2](https://chromeperf.appspot.com/report?sid=f5414b72e864ffaa4fd4291fa74bf3fd7708118ba534187d36113d8af5772c86&start_rev=393766&end_rev=416239).

![](/_img/v8-release-54/speedometer.png)

## API de V8

Veuillez consulter notre [résumé des changements d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque publication majeure.

Les développeurs ayant un [code source actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.4 -t branch-heads/5.4` pour expérimenter les nouvelles fonctionnalités de V8 v5.4. Alternativement, vous pouvez [vous inscrire au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités prochainement.
