---
title: "Obtenir la collecte des déchets gratuitement"
author: "Hannes Payer et Ross McIlroy, Collecteurs de déchets en idle"
avatars: 
  - "hannes-payer"
  - "ross-mcilroy"
date: "2015-08-07 13:33:37"
tags: 
  - internes
  - mémoire
description: "Chrome 41 cache les opérations coûteuses de gestion de la mémoire dans de petits morceaux de temps inactif autrement inutilisés, réduisant les saccades."
---
Les performances de JavaScript continuent d'être l'un des aspects clés des valeurs de Chrome, notamment lorsqu'il s'agit d'offrir une expérience fluide. À partir de Chrome 41, V8 utilise une nouvelle technique pour augmenter la réactivité des applications web en cachant les opérations coûteuses de gestion de la mémoire dans de petits morceaux de temps inactif autrement inutilisés. En conséquence, les développeurs web devraient s'attendre à un défilement plus fluide et à des animations légères avec des saccades considérablement réduites dues à la collecte des déchets.

<!--truncate-->
De nombreux moteurs de langage modernes, tels que le moteur JavaScript V8 de Chrome, gèrent dynamiquement la mémoire pour les applications en cours d'exécution afin que les développeurs n'aient pas à s'en soucier eux-mêmes. Le moteur passe périodiquement en revue la mémoire allouée à l'application, détermine quelles données ne sont plus nécessaires et les efface pour libérer de l'espace. Ce processus est appelé [collecte des déchets](https://fr.wikipedia.org/wiki/Gestion_des_d%C3%A9chets_(informatique)).

Dans Chrome, nous nous efforçons de fournir une expérience visuelle fluide à 60 images par seconde (FPS). Bien que V8 tente déjà d'effectuer la collecte des déchets par petits morceaux, des opérations de collecte des déchets plus importantes peuvent survenir de manière imprévisible — parfois au milieu d'une animation — mettant en pause l'exécution et empêchant Chrome d'atteindre cet objectif de 60 FPS.

Chrome 41 inclut un [planificateur de tâches pour le moteur de rendu Blink](https://blog.chromium.org/2015/04/scheduling-tasks-intelligently-for_30.html), qui permet de prioriser les tâches sensibles à la latence pour garantir que Chrome reste réactif et rapide. En plus de pouvoir prioriser le travail, ce planificateur de tâches possède une connaissance centralisée de l'activité du système, des tâches à effectuer et de l'urgence de chacune d'entre elles. En tant que tel, il peut estimer quand Chrome risque d'être inactif et combien de temps il prévoit de rester inactif.

Un exemple de cela se produit lorsque Chrome affiche une animation sur une page web. L'animation mettra à jour l'écran à 60 FPS, donnant à Chrome environ 16,6 ms pour effectuer la mise à jour. Ainsi, Chrome commencera à travailler sur le cadre actuel dès que le cadre précédent aura été affiché, effectuant des tâches d'entrée, d'animation et de rendu de cadre pour ce nouveau cadre. Si Chrome termine tout ce travail en moins de 16,6 ms, il n'a rien d'autre à faire pour le temps restant jusqu'à ce qu'il doive commencer à rendre le cadre suivant. Le planificateur de Chrome permet à V8 de tirer parti de cette _période de temps inactif_ en planifiant des _tâches d'idle_ spéciales lorsque Chrome serait autrement inactif.

![Figure 1: Rendu de cadre avec tâches d'idle](/_img/free-garbage-collection/frame-rendering.png)

Les tâches d'idle sont des tâches spéciales de faible priorité qui sont exécutées lorsque le planificateur détermine qu'il est dans une période de temps inactif. Les tâches d'idle se voient attribuer une échéance, qui est l'estimation du planificateur sur la durée pendant laquelle il prévoit de rester inactif. Dans l'exemple de l'animation à la Figure 1, ce serait le moment où le cadre suivant devrait commencer à être dessiné. Dans d'autres situations (par exemple, lorsque aucune activité à l'écran n'a lieu), cela pourrait être le moment où la prochaine tâche en attente est prévue pour être exécutée, avec une limite supérieure de 50 ms pour garantir que Chrome reste réactif aux entrées utilisateur inattendues. L'échéance est utilisée par la tâche d'idle pour estimer la quantité de travail qu'elle peut effectuer sans provoquer de saccades ni de retards dans la réponse aux entrées.

La collecte des déchets effectuée dans les tâches d'idle est cachée aux opérations critiques et sensibles à la latence. Cela signifie que ces tâches de collecte des déchets sont effectuées &quot;gratuitement&quot;. Afin de comprendre comment V8 y parvient, il convient de revoir la stratégie actuelle de collecte des déchets de V8.

## Exploration approfondie du moteur de collecte des déchets de V8

V8 utilise un [collecteur de déchets générationnel](http://www.memorymanagement.org/glossary/g.html#term-generational-garbage-collection) avec le tas JavaScript divisé en une petite jeune génération pour les objets nouvellement alloués et une large vieille génération pour les objets à longue durée de vie. [Puisque la plupart des objets meurent jeunes](http://www.memorymanagement.org/glossary/g.html#term-generational-hypothesis), cette stratégie générationnelle permet au collecteur de déchets d'effectuer des collectes régulières et courtes dans la jeune génération plus petite (connue sous le nom de &quot;scavenge&quot;), sans avoir à tracer les objets dans la vieille génération.

La jeune génération utilise une stratégie d'allocation [semi-espace](http://www.memorymanagement.org/glossary/s.html#semi.space), où les nouveaux objets sont initialement alloués dans le semi-espace actif de la jeune génération. Une fois que ce semi-espace est plein, une opération de récupération déplace les objets vivants vers l'autre semi-espace. Les objets qui ont déjà été déplacés une fois sont promus dans la vieille génération et considérés comme durables. Une fois les objets vivants déplacés, le nouveau semi-espace devient actif et les objets morts restants dans l'ancien semi-espace sont éliminés.

La durée d'une récupération de la jeune génération dépend donc de la taille des objets vivants dans la jeune génération. Une récupération sera rapide (&lt;1 ms) lorsque la plupart des objets deviennent inaccessibles dans la jeune génération. Cependant, si la plupart des objets survivent à une récupération, la durée de celle-ci peut être significativement plus longue.

Une collection majeure de tout le tas est effectuée lorsque la taille des objets vivants dans la vieille génération dépasse une limite dérivée de manière heuristique. La vieille génération utilise un [collecteur de marquage et balaye](http://www.memorymanagement.org/glossary/m.html#term-mark-sweep) avec plusieurs optimisations pour améliorer la latence et la consommation de mémoire. La latence de marquage dépend du nombre d'objets vivants à marquer, le marquage de tout le tas pouvant potentiellement prendre plus de 100 ms pour de grandes applications web. Afin d'éviter de suspendre le thread principal pendant de si longues périodes, V8 a depuis longtemps la capacité de [marquer de manière incrémentale les objets vivants en de nombreuses petites étapes](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), dans le but de maintenir chaque étape de marquage en dessous de 5 ms.

Après le marquage, la mémoire libre est à nouveau rendue disponible pour l'application en balayant toute la mémoire de la vieille génération. Cette tâche est effectuée de manière concurrente par des threads de balayage dédiés. Enfin, une défragmentation de la mémoire est effectuée pour réduire la fragmentation de la mémoire dans la vieille génération. Cette tâche peut être très chronophage et n'est effectuée que si la fragmentation de la mémoire pose problème.

En résumé, il existe quatre principales tâches de collecte des déchets :

1. Récupérations de la jeune génération, qui sont généralement rapides
2. Étapes de marquage effectuées par le marqueur incrémental, qui peuvent être arbitrairement longues selon la taille des étapes
3. Collections complètes des déchets, qui peuvent prendre beaucoup de temps
4. Collections complètes avec une défragmentation agressive de la mémoire, qui peuvent prendre beaucoup de temps, mais nettoient la mémoire fragmentée

Pour effectuer ces opérations pendant les périodes d'inactivité, V8 publie des tâches de collecte des déchets en période d'inactivité dans le planificateur. Lorsque ces tâches sont exécutées, elles reçoivent une échéance à respecter. Le gestionnaire de temps d'inactivité de la collecte des déchets de V8 évalue quelles tâches de collecte doivent être effectuées afin de réduire la consommation de mémoire, tout en respectant le délai pour éviter toute gêne future dans le rendu des images ou la latence des entrées.

Le collecteur de déchets effectuera une récupération de la jeune génération pendant une tâche d'inactivité si le taux d'allocation mesuré de l'application montre que la jeune génération pourrait être remplie avant la prochaine période d'inactivité prévue. De plus, il calcule le temps moyen pris par les tâches récentes de récupération afin de prédire la durée des récupérations futures et s'assurer qu'elles ne violent pas les délais des tâches d'inactivité.

Lorsque la taille des objets vivants dans la vieille génération est proche de la limite du tas, le marquage incrémental commence. Les étapes de marquage incrémental peuvent être linéairement redimensionnées en fonction du nombre d'octets à marquer. Basé sur la vitesse moyenne de marquage mesurée, le gestionnaire de temps d'inactivité de la collecte des déchets tente d'intégrer autant de travail de marquage que possible dans une tâche d'inactivité donnée.

Une collecte complète est programmée pendant une tâche d'inactivité si la vieille génération est presque pleine et si le délai fourni à la tâche est estimé suffisamment long pour terminer la collecte. Le temps de pause de la collecte est prédit en fonction de la vitesse de marquage multipliée par le nombre d'objets alloués. Les collections complètes avec défragmentation supplémentaire ne sont effectuées que si la page web est inactive depuis un temps significatif.

## Évaluation des performances

Afin d'évaluer l'impact de l'exécution de la collecte des déchets pendant les périodes d'inactivité, nous avons utilisé le [cadre d'évaluation de performance Telemetry de Chrome](https://www.chromium.org/developers/telemetry) pour évaluer la fluidité du défilement des sites Web populaires pendant leur chargement. Nous avons testé les [25 sites les plus populaires](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=15) sur une station de travail Linux ainsi que des [sites mobiles typiques](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=104) sur un smartphone Android Nexus 6, qui ouvrent tous deux des pages web populaires (y compris des applications web complexes telles que Gmail, Google Docs et YouTube) et défilent leur contenu pendant quelques secondes. Chrome vise à maintenir un défilement à 60 FPS pour une expérience utilisateur fluide.

La Figure 2 montre le pourcentage de collecte des déchets planifiée pendant le temps d'inactivité. Le matériel plus rapide de la station de travail entraîne plus de temps d'inactivité global par rapport au Nexus 6, permettant ainsi une plus grande proportion de collecte des déchets pendant ce temps d'inactivité (43% par rapport à 31% sur le Nexus 6), entraînant une amélioration de 7% sur notre [métrique de fluidité](https://www.chromium.org/developers/design-documents/rendering-benchmarks).

![Figure 2: Pourcentage de collecte des déchets se produisant pendant les périodes d'inactivité](/_img/free-garbage-collection/idle-time-gc.png)

En plus d'améliorer la fluidité du rendu des pages, ces périodes d'inactivité offrent également une opportunité de réaliser une collecte des déchets plus agressive lorsque la page devient complètement inactive. Les améliorations récentes dans Chrome 45 exploitent cette opportunité pour réduire drastiquement la quantité de mémoire consommée par les onglets en premier plan inactifs. La figure 3 montre un aperçu de la façon dont l'utilisation de mémoire dans le tas JavaScript de Gmail peut être réduite d'environ 45 % lorsqu'il devient inactif, comparée à la même page dans Chrome 43.

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ij-AFUfqFdI" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Figure 3 : Utilisation de la mémoire pour Gmail sur la dernière version de Chrome 45 (à gauche) vs Chrome 43</figcaption>
</figure>

Ces améliorations démontrent qu'il est possible de masquer les pauses de collecte des déchets en étant plus intelligent quant au moment où les opérations coûteuses de collecte des déchets sont effectuées. Les développeurs Web n'ont plus besoin de craindre les pauses de collecte des déchets, même lorsqu'ils visent des animations fluides à 60 FPS. Restez à l'écoute pour davantage d'améliorations alors que nous repoussons les limites de la planification de la collecte des déchets.
