---
title: &apos;Amélioration de la mise en cache du code&apos;
author: &apos;Mythri Alle, Responsable en chef de la mise en cache du code&apos;
date: 2018-04-24 13:33:37
avatars:
  - &apos;mythri-alle&apos;
tags:
  - internes
tweet: &apos;988728000677142528&apos;
description: &apos;À partir de Chrome 66, V8 met en cache davantage de code (byte) en générant le cache après l&apos;exécution au niveau supérieur.&apos;
---
V8 utilise [la mise en cache du code](/blog/code-caching) pour mettre en cache le code généré pour les scripts fréquemment utilisés. À partir de Chrome 66, nous mettons en cache plus de code en générant le cache après l'exécution au niveau supérieur. Cela conduit à une réduction de 20 à 40 % du temps d'analyse et de compilation lors du premier chargement.

<!--truncate-->
## Contexte

V8 utilise deux types de mise en cache pour réutiliser le code généré. Le premier est le cache en mémoire disponible dans chaque instance de V8. Le code généré après la compilation initiale est stocké dans ce cache, indexé par la chaîne source. Ce cache peut être réutilisé dans la même instance de V8. Le deuxième type de mise en cache sérialise le code généré et le stocke sur le disque pour un usage futur. Ce cache n'est pas spécifique à une instance particulière de V8 et peut être utilisé dans différentes instances de V8. Cet article se concentre sur ce deuxième type de mise en cache tel qu'utilisé dans Chrome. (D'autres intégrateurs utilisent également ce type de mise en cache ; il n'est pas limité à Chrome. Toutefois, cet article se concentre uniquement sur l'utilisation dans Chrome.)

Chrome stocke le code généré sérialisé dans le cache disque et l'indexe avec l'URL de la ressource script. Lors du chargement d'un script, Chrome vérifie le cache disque. Si le script est déjà mis en cache, Chrome transmet les données sérialisées à V8 dans le cadre de la demande de compilation. V8 désérialise ensuite ces données au lieu d'analyser et de compiler le script. Il y a aussi des vérifications supplémentaires pour s'assurer que le code est toujours utilisable (par exemple : une incompatibilité de version rend les données mises en cache inutilisables).

Les données réelles montrent que les taux de succès du cache de code (pour les scripts pouvant être mis en cache) sont élevés (~86 %). Bien que les taux de succès soient élevés pour ces scripts, la quantité de code que nous mettons en cache par script n'est pas très élevée. Notre analyse a montré qu'augmenter la quantité de code mis en cache permettrait de réduire le temps d'analyse et de compilation du code JavaScript d'environ 40 %.

## Augmenter la quantité de code mise en cache

Dans l'approche précédente, la mise en cache du code était couplée avec les demandes de compilation du script.

Les intégrateurs pouvaient demander à V8 de sérialiser le code qu'il a généré lors de la compilation au niveau supérieur d'un nouveau fichier source JavaScript. V8 retournait le code sérialisé après avoir compilé le script. Lorsque Chrome demande à nouveau le même script, V8 récupère le code sérialisé à partir du cache et le désérialise. V8 évite complètement de recompiler les fonctions déjà présentes dans le cache. Ces scénarios sont illustrés dans la figure suivante :

![](/_img/improved-code-caching/warm-hot-run-1.png)

V8 ne compile que les fonctions qui sont censées être immédiatement exécutées (IIFEs) lors de la compilation au niveau supérieur et marque les autres fonctions pour une compilation différée. Cela aide à améliorer les temps de chargement des pages en évitant la compilation des fonctions non nécessaires, mais cela signifie que les données sérialisées ne contiennent que le code des fonctions qui sont compilées immédiatement.

Avant Chrome 59, nous devions générer le cache de code avant le début de toute exécution. L'ancien compilateur de base de V8 (Full-codegen) générait du code spécialisé pour le contexte d'exécution. Full-codegen utilisait le remplacement de code pour optimiser les opérations pour un contexte d'exécution spécifique. Un tel code ne pouvait pas être facilement sérialisé en retirant les données spécifiques au contexte pour une utilisation dans d'autres contextes.

Avec [le lancement d'Ignition](/blog/launching-ignition-and-turbofan) dans Chrome 59, cette restriction n'est plus nécessaire. Ignition utilise [des caches en ligne basés sur les données](https://www.youtube.com/watch?v=u7zRSm8jzvA) pour optimiser les opérations dans le contexte d'exécution actuel. Les données spécifiques au contexte sont stockées dans des vecteurs de rétroaction et sont séparées du code généré. Cela a ouvert la possibilité de générer des caches de code même après l'exécution du script. Au fur et à mesure que nous exécutons le script, davantage de fonctions (qui étaient marquées pour une compilation différée) sont compilées, ce qui nous permet de mettre en cache plus de code.

V8 expose une nouvelle API, `ScriptCompiler::CreateCodeCache`, pour demander des caches de code indépendamment des demandes de compilation. La demande de caches de code en même temps que les demandes de compilation est obsolète et ne fonctionnera pas dans V8 v6.6 et versions ultérieures. Depuis la version 66, Chrome utilise cette API pour demander le cache de code après l'exécution au niveau supérieur. La figure suivante montre le nouveau scénario de demande du cache de code. Le cache de code est demandé après l'exécution au niveau supérieur et contient donc le code des fonctions qui ont été compilées plus tard pendant l'exécution du script. Lors des exécutions ultérieures (montrées comme des exécutions "hot" dans la figure suivante), cela évite la compilation des fonctions pendant l'exécution au niveau supérieur.

![](/_img/improved-code-caching/warm-hot-run-2.png)

## Résultats

Les performances de cette fonctionnalité ont été mesurées en utilisant nos [benchmarks réels internes](https://cs.chromium.org/chromium/src/tools/perf/page_sets/v8_top_25.py?q=v8.top&sq=package:chromium&l=1). Le graphique suivant montre la réduction du temps d'analyse et de compilation par rapport au schéma de mise en cache précédent. Il y a une réduction d'environ 20–40% à la fois du temps d'analyse et de compilation sur la plupart des pages.

![](/_img/improved-code-caching/parse.png)

![](/_img/improved-code-caching/compile.png)

Les données obtenues sur le terrain montrent des résultats similaires avec une réduction de 20–40% du temps passé à compiler le code JavaScript, à la fois sur ordinateur de bureau et sur mobile. Sur Android, cette optimisation se traduit également par une réduction de 1–2% des métriques de chargement de page au niveau supérieur, comme le temps nécessaire pour qu'une page Web devienne interactive. Nous avons également surveillé l'utilisation de la mémoire et du disque par Chrome et n'avons constaté aucune régression notable.
