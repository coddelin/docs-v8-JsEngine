---
title: 'Optimisation de la consommation de mémoire de V8'
author: 'Les Ingénieurs Sanitation de Mémoire de V8 Ulan Degenbaev, Michael Lippautz, Hannes Payer, et Toon Verwaest'
avatars:
  - 'ulan-degenbaev'
  - 'michael-lippautz'
  - 'hannes-payer'
date: 2016-10-07 13:33:37
tags:
  - mémoire
  - benchmarks
description: 'L'équipe V8 a analysé et réduit significativement l'empreinte mémoire de plusieurs sites web identifiés comme représentatifs des modèles de développement web modernes.'
---
La consommation de mémoire est une dimension importante dans l'espace d'arbitrage de performance des machines virtuelles JavaScript. Au cours des derniers mois, l'équipe V8 a analysé et réduit significativement l'empreinte mémoire de plusieurs sites web identifiés comme représentatifs des modèles de développement web modernes. Dans ce billet de blog, nous présentons les charges de travail et les outils que nous avons utilisés dans notre analyse, décrivons les optimisations de mémoire dans le collecteur de déchets, et montrons comment nous avons réduit la mémoire consommée par le parseur et les compilateurs de V8.

<!--truncate-->
## Benchmarks

Afin de profiler V8 et de découvrir des optimisations ayant un impact pour le plus grand nombre d'utilisateurs, il est crucial de définir des charges de travail reproductibles, significatives, et simulant des scénarios d'utilisation courants de JavaScript dans le monde réel. Un excellent outil pour cette tâche est [Telemetry](https://catapult.gsrc.io/telemetry), un framework de test de performance qui exécute des interactions scriptées de sites web dans Chrome et enregistre toutes les réponses des serveurs afin de permettre une reproduction prévisible de ces interactions dans notre environnement de test. Nous avons sélectionné un ensemble de sites d'actualités, sociaux, et médiatiques populaires et défini les interactions utilisateur courantes suivantes pour eux :

Une charge de travail pour naviguer sur des sites d'actualités et sociaux :

1. Ouvrir un site d'actualités ou social populaire, par exemple Hacker News.
1. Cliquer sur le premier lien.
1. Attendre que le nouveau site soit chargé.
1. Faire défiler vers le bas sur quelques pages.
1. Cliquer sur le bouton retour.
1. Cliquer sur le lien suivant sur le site d'origine et répéter les étapes 3-6 plusieurs fois.

Une charge de travail pour naviguer sur un site médiatique :

1. Ouvrir un élément sur un site médiatique populaire, par exemple une vidéo sur YouTube.
1. Consommer cet élément en attendant quelques secondes.
1. Cliquer sur l'élément suivant et répéter les étapes 2–3 plusieurs fois.

Une fois un workflow capturé, il peut être rejoué aussi souvent que nécessaire contre une version de développement de Chrome, par exemple chaque fois qu'il y a une nouvelle version de V8. Pendant la lecture, l'utilisation de la mémoire de V8 est échantillonnée à intervalles fixes afin d'obtenir une moyenne significative. Les benchmarks peuvent être trouvés [ici](https://cs.chromium.org/chromium/src/tools/perf/page_sets/system_health/browsing_stories.py?q=browsing+news&sq=package:chromium&dr=CS&l=11).

## Visualisation de la mémoire

Un des principaux défis lors de l'optimisation des performances en général est d'obtenir une image claire de l'état interne de la machine virtuelle afin de suivre les progrès ou d'évaluer les compromis potentiels. Pour optimiser la consommation de mémoire, cela signifie garder une trace précise de l'utilisation de la mémoire de V8 pendant l'exécution. Il y a deux catégories de mémoire qui doivent être suivies : la mémoire allouée au tas géré de V8 et la mémoire allouée sur le tas C++. La fonctionnalité **V8 Heap Statistics** est un mécanisme utilisé par les développeurs travaillant sur les internes de V8 pour obtenir une vision approfondie des deux. Lorsque le drapeau `--trace-gc-object-stats` est spécifié lors de l'exécution de Chrome (54 ou plus récent) ou de l'interface en ligne de commande `d8`, V8 affiche dans la console des statistiques liées à la mémoire. Nous avons construit un outil personnalisé, [le visualiseur de tas V8](https://mlippautz.github.io/v8-heap-stats/), pour visualiser cette sortie. L'outil montre une vue chronologique à la fois pour les tas gérés et C++. L'outil fournit également une décomposition détaillée de l'utilisation de la mémoire de certains types de données internes et des histogrammes par taille pour chacun de ces types.

Un workflow courant dans nos efforts d'optimisation consiste à sélectionner un type d'instance occupant une grande partie du tas dans la vue chronologique, comme illustré dans la Figure 1. Une fois un type d'instance sélectionné, l'outil montre alors une distribution des utilisations de ce type. Dans cet exemple, nous avons sélectionné la structure de données interne FixedArray de V8, qui est un conteneur de type vecteur non typé utilisé de manière ubiquitaire dans toutes sortes d'endroits de la machine virtuelle. La Figure 2 montre une distribution typique de FixedArray, où nous pouvons voir que la majorité de la mémoire peut être attribuée à un scénario d'utilisation spécifique de FixedArray. Dans ce cas, les FixedArray sont utilisés comme stockage arrière pour des tableaux JavaScript clairsemés (ce que nous appelons DICTIONARY\_ELEMENTS). Avec ces informations, il est possible de revenir au code réel et soit de vérifier si cette distribution est vraiment le comportement attendu, soit de déterminer s'il existe une opportunité d'optimisation. Nous avons utilisé l'outil pour identifier des inefficacités avec un certain nombre de types internes.

![Figure 1 : Vue chronologique du tas géré et de la mémoire hors tas](/_img/optimizing-v8-memory/timeline-view.png)

![Figure 2: Répartition des types d'instances](/_img/optimizing-v8-memory/distribution.png)

La figure 3 montre la consommation de mémoire du tas C++, qui se compose principalement de mémoire de zone (régions de mémoire temporaires utilisées par V8 pendant une courte période ; elles sont décrites plus en détail ci-dessous). Étant donné que la mémoire de zone est principalement utilisée par l'analyseur et les compilateurs V8, les pics correspondent à des événements d'analyse et de compilation. Une exécution bien comportée ne comprend que des pics, indiquant que la mémoire est libérée dès qu'elle n'est plus nécessaire. En revanche, des plateaux (c'est-à-dire des périodes prolongées de consommation de mémoire élevée) indiquent qu'il y a un potentiel d'optimisation.

![Figure 3: Mémoire de zone](/_img/optimizing-v8-memory/zone-memory.png)

Les premiers utilisateurs peuvent également tester l'intégration dans [l'infrastructure de traçage de Chrome](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool). Pour ce faire, vous devez exécuter la dernière version de Chrome Canary avec `--track-gc-object-stats` et [capturer une trace](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/recording-tracing-runs#TOC-Capture-a-trace-on-Chrome-desktop) incluant la catégorie `v8.gc_stats`. Les données apparaîtront ensuite sous l'événement `V8.GC_Object_Stats`.

## Réduction de la taille du tas JavaScript

Il existe un compromis inhérent entre le débit de la collecte des ordures, la latence et la consommation de mémoire. Par exemple, la latence de la collecte des ordures (qui cause des ralentissements visibles par l'utilisateur) peut être réduite en utilisant plus de mémoire pour éviter des appels fréquents à la collecte des ordures. Pour les appareils mobiles à faible mémoire, c'est-à-dire les appareils avec moins de 512 Mo de RAM, prioriser la latence et le débit par rapport à la consommation de mémoire peut entraîner des plantages par manque de mémoire et des onglets suspendus sous Android.

Pour mieux équilibrer les bons compromis pour ces appareils mobiles à faible mémoire, nous avons introduit un mode spécial de réduction de mémoire qui ajuste plusieurs heuristiques de collecte des ordures pour réduire l'utilisation de mémoire du tas géré par la collecte des ordures JavaScript.

1. À la fin d'une collecte complète des ordures, la stratégie de croissance du tas de V8 détermine quand la prochaine collecte des ordures aura lieu en fonction de la quantité d'objets vivants avec une certaine marge supplémentaire. En mode de réduction de mémoire, V8 utilise moins de marge, ce qui réduit l'utilisation de mémoire grâce à des collectes des ordures plus fréquentes.
1. De plus, cette estimation est traitée comme une limite stricte, forçant le finalisation du marquage incrémentiel non terminé pendant la pause principale de la collecte des ordures. Normalement, lorsque le mode de réduction de mémoire n'est pas activé, le travail de marquage incrémentiel non terminé peut dépasser arbitrairement cette limite pour déclencher la pause principale de la collecte des ordures uniquement lorsque le marquage est terminé.
1. La fragmentation de la mémoire est également réduite en effectuant un compactage de mémoire plus agressif.

La figure 4 illustre certaines des améliorations sur les appareils à faible mémoire depuis Chrome 53. Le plus remarquable est que la consommation moyenne de mémoire du tas V8 pour le benchmark mobile du New York Times a été réduite d'environ 66 %. Dans l'ensemble, nous avons observé une réduction de 50 % de la taille moyenne du tas V8 sur cet ensemble de benchmarks.

![Figure 4: Réduction de la mémoire du tas V8 depuis Chrome 53 sur les appareils à faible mémoire](/_img/optimizing-v8-memory/heap-memory-reduction.png)

Une autre optimisation introduite récemment ne réduit pas seulement la mémoire sur les appareils à faible mémoire, mais aussi sur les appareils mobiles et ordinateurs de bureau plus performants. Réduire la taille des pages du tas V8 de 1 Mo à 512 kB entraîne une empreinte mémoire plus petite lorsqu'il n'y a pas beaucoup d'objets vivants et réduit globalement la fragmentation de la mémoire jusqu'à 2×. Cela permet également à V8 d'effectuer plus de travaux de compactage, car des morceaux de travail plus petits permettent d'effectuer plus de travaux en parallèle par les threads de compactage de mémoire.

## Réduction de la mémoire des zones

En plus du tas JavaScript, V8 utilise une mémoire hors tas pour les opérations internes de la VM. La plus grande partie de la mémoire est allouée via des zones de mémoire appelées _zones_. Les zones sont un type de gestionnaire de mémoire basé sur des régions qui permettent une allocation rapide et une désallocation massive où toute la mémoire allouée à la zone est libérée en une fois lorsque la zone est détruite. Les zones sont utilisées par l'analyseur et les compilateurs de V8.

L'une des principales améliorations de Chrome 55 provient de la réduction de la consommation de mémoire pendant l'analyse en arrière-plan. L'analyse en arrière-plan permet à V8 d'analyser des scripts pendant qu'une page est en cours de chargement. L'outil de visualisation de la mémoire nous a aidés à découvrir que l'analyseur en arrière-plan conservait une zone entière bien après la compilation du code. En libérant immédiatement la zone après la compilation, nous avons réduit la durée de vie des zones de manière significative, ce qui a entraîné une réduction de l'utilisation moyenne et maximale de la mémoire.

Une autre amélioration résulte d'un meilleur empaquetage des champs dans les nœuds _arbre syntaxique abstrait_ générés par l'analyseur. Auparavant, nous comptions sur le compilateur C++ pour regrouper les champs ensemble lorsque cela était possible. Par exemple, deux booléens nécessitent seulement deux bits et devraient être placés dans un mot ou dans la fraction inutilisée du mot précédent. Le compilateur C++ ne trouve pas toujours l'empaquetage le plus compressé, nous empaquetons donc manuellement les bits. Cela entraîne non seulement une réduction de l'utilisation maximale de la mémoire, mais également une amélioration des performances de l'analyseur et du compilateur.

La figure 5 montre les améliorations de la mémoire de zone maximale depuis Chrome 54, réduites d'environ 40% en moyenne sur les sites web mesurés.

![Figure 5 : Réduction de la mémoire de zone maximale de V8 depuis Chrome 54 sur ordinateur de bureau](/_img/optimizing-v8-memory/peak-zone-memory-reduction.png)

Au cours des prochains mois, nous continuerons à travailler sur la réduction de l'empreinte mémoire de V8. Nous avons prévu davantage d'optimisations de la mémoire de zone pour l'analyseur et nous envisageons de nous concentrer sur des appareils avec une mémoire allant de 512 Mo à 1 Go.

**Mise à jour :** Toutes les améliorations discutées ci-dessus réduisent la consommation globale de mémoire de Chrome 55 jusqu'à 35% sur les _appareils à faible mémoire_ par rapport à Chrome 53. Les autres segments d'appareils ne bénéficient que des améliorations de la mémoire de zone.
