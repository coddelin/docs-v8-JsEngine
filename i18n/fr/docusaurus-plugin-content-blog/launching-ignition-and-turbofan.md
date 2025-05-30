---
title: "Lancement d'Ignition et TurboFan"
author: "l'équipe V8"
date: "2017-05-15 13:33:37"
tags: 
  - internals
description: "V8 v5.9 introduit une toute nouvelle chaîne d'exécution JavaScript basée sur l'interpréteur Ignition et le compilateur d'optimisation TurboFan."
---
Aujourd'hui, nous sommes ravis d'annoncer le lancement d'une nouvelle chaîne d'exécution JavaScript pour V8 v5.9, qui sera disponible sur la version stable de Chrome v59. Avec cette nouvelle chaîne, nous réalisons d'importantes améliorations en termes de performances et des économies significatives de mémoire sur des applications JavaScript réelles. Nous discuterons des chiffres en détail à la fin de cet article, mais d'abord, examinons cette chaîne d'exécution.

<!--truncate-->
La nouvelle chaîne est basée sur [Ignition](/docs/ignition), l'interpréteur de V8, et [TurboFan](/docs/turbofan), le tout nouveau compilateur d'optimisation de V8. Ces technologies [devraient](/blog/turbofan-jit) [être](/blog/ignition-interpreter) [familiaires](/blog/test-the-future) pour ceux d'entre vous qui ont suivi le blog de V8 ces dernières années, mais le passage à cette nouvelle chaîne marque une étape importante pour les deux.

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo d'Ignition, le tout nouvel interpréteur de V8</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo de TurboFan, le tout nouveau compilateur d'optimisation de V8</figcaption>
</figure>

Pour la première fois, Ignition et TurboFan sont utilisés universellement et exclusivement pour l'exécution de JavaScript dans V8 v5.9. En outre, à partir de la version v5.9, Full-codegen et Crankshaft, technologies qui [ont bien servi V8 depuis 2010](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), ne sont plus utilisées dans V8 pour l'exécution de JavaScript, car elles ne peuvent plus suivre les nouvelles fonctionnalités du langage JavaScript et les optimisations requises par ces fonctionnalités. Nous prévoyons de les supprimer complètement très bientôt. Cela signifie que V8 disposera d'une architecture globalement beaucoup plus simple et plus facile à maintenir à l'avenir.

## Un long cheminement

La chaîne combinée Ignition et TurboFan est en développement depuis presque 3 ans et demi. Elle représente l'aboutissement des connaissances collectives acquises par l'équipe V8 en mesurant les performances de JavaScript dans le monde réel et en analysant attentivement les limitations de Full-codegen et Crankshaft. Elle constitue une base qui nous permettra de continuer à optimiser l'ensemble du langage JavaScript pour les années à venir.

Le projet TurboFan a été initialement lancé fin 2013 pour résoudre les limitations de Crankshaft. Crankshaft peut seulement optimiser un sous-ensemble du langage JavaScript. Par exemple, il n'a pas été conçu pour optimiser le code JavaScript utilisant une gestion structurée des exceptions, c'est-à-dire les blocs de code délimités par les mots-clés try, catch, et finally de JavaScript. Ajouter un support pour de nouvelles fonctionnalités linguistiques dans Crankshaft est difficile, car cela exige presque toujours d'écrire du code spécifique à l'architecture pour neuf plateformes prises en charge. En outre, l'architecture de Crankshaft est limitée dans sa capacité à générer un code machine optimal. Elle peut seulement tirer un certain niveau de performances du JavaScript, tout en exigeant que l'équipe V8 maintienne plus de dix mille lignes de code par architecture de puce.

TurboFan a été conçu dès le départ non seulement pour optimiser toutes les fonctionnalités linguistiques trouvées dans la norme JavaScript de l'époque, ES5, mais également toutes les fonctionnalités futures prévues pour ES2015 et au-delà. Il introduit une conception de compilateur en couches qui permet une séparation claire entre les optimisations de compilateur de haut niveau et de bas niveau, facilitant l'ajout de nouvelles fonctionnalités linguistiques sans modifier le code spécifique à l'architecture. TurboFan ajoute une phase explicite de compilation pour la sélection des instructions, ce qui rend possible d'écrire beaucoup moins de code spécifique à l'architecture pour chaque plateforme prise en charge dès le départ. Grâce à cette nouvelle phase, le code spécifique à l'architecture est écrit une seule fois et il nécessite rarement d'être modifié. Ces décisions et d'autres mènent à un compilateur d'optimisation plus facile à maintenir et à étendre pour toutes les architectures supportées par V8.

La motivation initiale derrière l'interpréteur Ignition de V8 était de réduire la consommation de mémoire sur les appareils mobiles. Avant Ignition, le code généré par le compilateur de base Full-codegen de V8 occupait typiquement presque un tiers de l'espace global du tas JavaScript dans Chrome. Cela laissait moins d'espace pour les données réelles d'une application web. Lorsque Ignition a été activé pour Chrome M53 sur les appareils Android avec une RAM limitée, l'empreinte mémoire requise pour le code JavaScript de base non optimisé a diminué d'un facteur de neuf sur les appareils mobiles basés sur ARM64.

Plus tard, l'équipe V8 a tiré parti du fait que le bytecode d'Ignition peut être utilisé pour générer directement du code machine optimisé avec TurboFan, au lieu de devoir recompiler à partir du code source comme le faisait Crankshaft. Le bytecode d'Ignition fournit un modèle d'exécution de base plus propre et moins sujet aux erreurs dans V8, simplifiant le mécanisme de désoptimisation, qui est une fonctionnalité clé de l'[optimisation adaptative](https://en.wikipedia.org/wiki/Adaptive_optimization) de V8. Enfin, comme la génération de bytecode est plus rapide que la génération du code de base compilé de Full-codegen, l'activation d'Ignition améliore généralement les temps de démarrage des scripts et, par conséquent, le chargement des pages Web.

En couplant étroitement la conception d'Ignition et de TurboFan, l'architecture globale bénéficie de nombreux autres avantages. Par exemple, au lieu d'écrire les gestionnaires de bytecode haute performance d'Ignition en assembleur codé manuellement, l'équipe V8 utilise la [représentation intermédiaire](https://en.wikipedia.org/wiki/Intermediate_representation) de TurboFan pour exprimer la fonctionnalité des gestionnaires et laisse TurboFan effectuer l'optimisation et la génération finale du code pour les nombreuses plateformes prises en charge par V8. Cela garantit qu'Ignition fonctionne bien sur toutes les architectures de puces prises en charge par V8 tout en éliminant simultanément la charge de maintenir neuf ports de plateforme distincts.

## Analyser les chiffres

L'histoire mise à part, examinons maintenant les performances réelles et la consommation mémoire du nouveau pipeline.

L'équipe V8 surveille en permanence les performances des cas d'utilisation réels à l'aide du framework [Telemetry - Catapult](https://catapult.gsrc.io/telemetry). [Précédemment](/blog/real-world-performance) dans ce blog, nous avons discuté de l’importance d’utiliser les données des tests réels pour orienter notre travail d’optimisation des performances et de la manière dont nous utilisons [WebPageReplay](https://github.com/chromium/web-page-replay) avec Telemetry pour ce faire. La transition vers Ignition et TurboFan montre des améliorations de performances dans ces cas de test réels. Plus précisément, le nouveau pipeline entraîne des accélérations importantes lors des tests d'interaction utilisateur pour des sites Web connus :

![Réduction du temps passé dans V8 pour les benchmarks d'interaction utilisateur](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

Bien que Speedometer soit un benchmark synthétique, nous avons précédemment découvert qu'il reproduit mieux les charges de travail réelles du JavaScript moderne que d'autres benchmarks synthétiques. La transition vers Ignition et TurboFan améliore le score Speedometer de V8 de 5 % à 10 %, selon la plateforme et l'appareil.

Le nouveau pipeline accélère également le JavaScript côté serveur. [AcmeAir](https://github.com/acmeair/acmeair-nodejs), un benchmark pour Node.js qui simule la mise en œuvre back-end d'une compagnie aérienne fictive, fonctionne plus de 10 % plus rapidement avec V8 v5.9.

![Améliorations sur les benchmarks Web et Node.js](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

Ignition et TurboFan réduisent également l'empreinte mémoire globale de V8. Dans Chrome M59, le nouveau pipeline réduisait l'empreinte mémoire de V8 de 5 % à 10 % sur les appareils de bureau et les appareils mobiles haut de gamme. Cette réduction est le résultat de l'apport des économies de mémoire d'Ignition, qui ont été [précédemment discutées](/blog/ignition-interpreter) dans ce blog, à tous les appareils et plateformes pris en charge par V8.

Ces améliorations ne sont qu'un début. Le nouveau pipeline Ignition et TurboFan ouvre la voie à d'autres optimisations qui amélioreront les performances de JavaScript et réduiront l'empreinte de V8 dans Chrome et Node.js pour les années à venir. Nous sommes impatients de partager ces améliorations avec vous au fur et à mesure que nous les déployons aux développeurs et aux utilisateurs. Restez à l'écoute.
