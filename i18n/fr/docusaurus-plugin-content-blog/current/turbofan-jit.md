---
title: "Plongée dans le TurboFan JIT"
author: "Ben L. Titzer, Ingénieur logiciel et mécanicien TurboFan"
avatars:
  - "ben-titzer"
date: 2015-07-13 13:33:37
tags:
  - internals
description: "Un plongeon approfondi dans la conception du nouveau compilateur TurboFan de V8."
---
[La semaine dernière, nous avons annoncé](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html) que nous avons activé TurboFan pour certains types de JavaScript. Dans cet article, nous souhaitons examiner plus en détail la conception de TurboFan.

<!--truncate-->
La performance a toujours été au cœur de la stratégie de V8. TurboFan combine une représentation intermédiaire de pointe avec un pipeline de traduction et d'optimisation multicouches pour générer un code machine de meilleure qualité que ce qui était possible auparavant avec le CrankShaft JIT. Les optimisations dans TurboFan sont plus nombreuses, plus sophistiquées et appliquées de manière plus approfondie que dans CrankShaft, permettant ainsi des mouvements fluides de code, des optimisations du flux de contrôle et une analyse précise des plages numériques, toutes précédemment inaccessibles.

## Une architecture en couches

Les compilateurs ont tendance à devenir complexes au fil du temps, à mesure que de nouvelles fonctionnalités de langage sont supportées, que de nouvelles optimisations sont ajoutées et que de nouvelles architectures d'ordinateur sont ciblées. Avec TurboFan, nous avons tiré des leçons de nombreux compilateurs et développé une architecture en couches pour permettre au compilateur de faire face à ces exigences au fil du temps. Une séparation plus claire entre le langage de haut niveau (JavaScript), les capacités de la VM (V8) et les subtilités de l'architecture (d'x86 à ARM en passant par MIPS) permet un code plus propre et plus robuste. La structuration en couches permet à ceux qui travaillent sur le compilateur de raisonner localement lors de la mise en œuvre d'optimisations et de fonctionnalités, ainsi que d'écrire des tests unitaires plus efficaces. Cela permet également de réduire le code. Chacune des 7 architectures cibles supportées par TurboFan nécessite moins de 3 000 lignes de code spécifique à la plateforme, contre 13 000 à 16 000 avec CrankShaft. Cela a permis aux ingénieurs de ARM, Intel, MIPS et IBM de contribuer à TurboFan de manière beaucoup plus efficace. TurboFan est également capable de supporter plus facilement toutes les futures fonctionnalités de ES6 grâce à sa conception flexible qui sépare le frontend JavaScript des backends dépendants de l'architecture.

## Des optimisations plus sophistiquées

Le JIT TurboFan implémente des optimisations plus agressives que CrankShaft au moyen de nombreuses techniques avancées. JavaScript entre dans le pipeline du compilateur sous une forme principalement non optimisée et est traduit et optimisé en formes de plus en plus proches du code machine final. Le cœur de la conception est une représentation interne (IR) sous forme de graphe plus souple, appelée 'sea-of-nodes', qui permet un réordonnement et des optimisations plus efficaces.

![Exemple de graphe TurboFan](/_img/turbofan-jit/example-graph.png)

L'analyse des plages numériques aide TurboFan à mieux comprendre le code de calcul numérique. La représentation IR basée sur un graphe permet d'exprimer la plupart des optimisations sous forme de réductions locales simples, plus faciles à écrire et à tester individuellement. Un moteur d'optimisation applique ces règles locales de manière systématique et approfondie. La sortie de la représentation graphique implique un algorithme d'ordonnancement innovant qui utilise la liberté de réordonnancement pour déplacer le code hors des boucles et dans des chemins moins fréquemment exécutés. Enfin, des optimisations spécifiques à l'architecture, telles que la sélection d'instructions complexes, exploitent les caractéristiques de chaque plateforme cible pour générer le code de la meilleure qualité.

## Offrir un nouveau niveau de performance

Nous [voyons déjà de grandes améliorations de vitesse](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html) avec TurboFan, mais il reste encore beaucoup de travail à faire. Restez à l'écoute alors que nous activons davantage d'optimisations et activons TurboFan pour plus de types de code !
