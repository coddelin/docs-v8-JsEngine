---
title: 'À propos de cette vulnérabilité de hash flooding dans Node.js…'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed))'
avatars:
  - 'yang-guo'
date: 2017-08-11 13:33:37
tags:
  - sécurité
description: 'Node.js a subi une vulnérabilité liée au hash flooding. Ce post fournit un contexte et explique la solution dans V8.'
---
Début juillet de cette année, Node.js a publié une [mise à jour de sécurité](https://nodejs.org/en/blog/vulnerability/july-2017-security-releases/) pour toutes les branches actuellement maintenues afin de résoudre une vulnérabilité liée au hash flooding. Ce correctif intermédiaire se fait au prix d'une régression significative des performances au démarrage. Entre-temps, V8 a mis en œuvre une solution qui évite cette pénalisation des performances.

<!--truncate-->
Dans cet article, nous souhaitons fournir des informations contextuelles et historiques sur la vulnérabilité ainsi que sur la solution finale.

## Attaque par hash flooding

Les tables de hachage sont parmi les structures de données les plus importantes en informatique. Elles sont largement utilisées dans V8, par exemple pour stocker les propriétés d'un objet. En moyenne, l'insertion d'une nouvelle entrée est très efficace à [𝒪(1)](https://en.wikipedia.org/wiki/Big_O_notation). Cependant, les collisions de hachage peuvent entraîner un pire scénario de 𝒪(n). Cela signifie qu'insérer n entrées peut prendre jusqu'à 𝒪(n²).

Dans Node.js, les [en-têtes HTTP](https://nodejs.org/api/http.html#http_response_getheaders) sont représentés comme des objets JavaScript. Les paires nom-valeur des en-têtes sont stockées en tant que propriétés des objets. Avec des requêtes HTTP habilement préparées, un attaquant pourrait mener une attaque par déni de service. Un processus Node.js deviendrait non réactif, étant occupé avec des insertions de table de hachage dans le pire cas.

Cette attaque a été révélée dès [décembre 2011](https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html) et a montré qu'elle affecte un large éventail de langages de programmation. Comment se fait-il qu'il ait fallu autant de temps à V8 et Node.js pour traiter finalement ce problème ?

En réalité, très peu de temps après la révélation, les ingénieurs V8 ont travaillé avec la communauté Node.js sur une [atténuation](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40). Depuis Node.js v0.11.8, ce problème a été traité. Cette correction a introduit une valeur de _graine de hachage_. La graine de hachage est choisie aléatoirement au démarrage et sert à initialiser chaque valeur de hachage dans une instance particulière de V8. Sans la connaissance de la graine de hachage, un attaquant a beaucoup de mal à atteindre le pire scénario, sans parler de concevoir une attaque visant toutes les instances de Node.js.

Voici une partie du message de [commit](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40) lié à la correction :

> Cette version résout uniquement le problème pour ceux qui compilent eux-mêmes V8 ou qui n'utilisent pas de snapshots. Un V8 précompilé basé sur un snapshot aura toujours des codes de hachage de chaîne prévisibles.

Cette version résout uniquement le problème pour ceux qui compilent eux-mêmes V8 ou qui n'utilisent pas de snapshots. Un V8 précompilé basé sur un snapshot aura toujours des codes de hachage de chaîne prévisibles.

## Snapshot au démarrage

Les snapshots au démarrage sont un mécanisme dans V8 permettant d'accélérer considérablement le démarrage du moteur et la création de nouveaux contextes (par exemple via le [module vm](https://nodejs.org/api/vm.html) dans Node.js). Au lieu de configurer les objets initiaux et les structures de données internes à partir de zéro, V8 les désérialise à partir d'un snapshot existant. Une version à jour de V8 avec snapshot démarre en moins de 3 ms, et nécessite une fraction de milliseconde pour créer un nouveau contexte. Sans le snapshot, le démarrage prend plus de 200 ms, et un nouveau contexte plus de 10 ms. Il s'agit d'une différence de deux ordres de grandeur.

Nous avons expliqué comment tout intégrateur de V8 peut tirer parti des snapshots de démarrage dans [un article précédent](/blog/custom-startup-snapshots).

Un snapshot préconstruit contient des tables de hachage et d'autres structures de données basées sur des valeurs de hachage. Une fois initialisés à partir d'un snapshot, la graine de hachage ne peut plus être modifiée sans corrompre ces structures de données. Une version de Node.js qui intègre le snapshot a une graine de hachage fixe, rendant l'atténuation inefficace.

C'est ce que l'avertissement explicite dans le message de commit soulignait.

## Presque corrigé, mais pas tout à fait

Avançons jusqu'en 2015, un [problème](https://github.com/nodejs/node/issues/1631) dans Node.js signale que la création d'un nouveau contexte a régressé en termes de performance. Sans surprise, cela est dû au fait que le snapshot de démarrage a été désactivé dans le cadre de l'atténuation. Mais à cette époque, tous les participants à la discussion n'étaient pas conscients de la [raison](https://github.com/nodejs/node/issues/528#issuecomment-71009086).

Comme expliqué dans cet [article](/blog/math-random), V8 utilise un générateur de nombres pseudo-aléatoires pour générer les résultats de Math.random. Chaque contexte V8 a sa propre copie de l'état du générateur de nombres aléatoires. Cela permet d'éviter que les résultats de Math.random soient prévisibles entre les contextes.

L'état du générateur de nombres aléatoires est initialisé à partir d'une source externe dès que le contexte est créé. Peu importe si le contexte est créé de toutes pièces ou désérialisé à partir d'un instantané.

D'une manière ou d'une autre, l'état du générateur de nombres aléatoires a été [confus](https://github.com/nodejs/node/issues/1631#issuecomment-100044148) avec la graine du hachage. En conséquence, un instantané préconstruit a commencé à faire partie de la version officielle à partir de [io.js v2.0.2](https://github.com/nodejs/node/pull/1679).

## Deuxième tentative

Ce n'est qu'en mai 2017, lors de discussions internes entre V8, le [Project Zero de Google](https://googleprojectzero.blogspot.com/) et la plateforme Cloud de Google, que nous avons réalisé que Node.js était toujours vulnérable aux attaques par inondation de hachage.

La réponse initiale est venue de nos collègues [Ali](https://twitter.com/ofrobots) et [Myles](https://twitter.com/MylesBorins) de l'équipe derrière les [offres Node.js de Google Cloud Platform](https://cloud.google.com/nodejs/). Ils ont travaillé avec la communauté Node.js pour [désactiver l'instantané de démarrage](https://github.com/nodejs/node/commit/eff636d8eb7b009c40fb053802c169ba1417293d) par défaut, à nouveau. Cette fois-ci, ils ont également ajouté un [cas de test](https://github.com/nodejs/node/commit/9fedc1f09648ff7cebed65883966f5647686a38a).

Mais nous ne voulions pas en rester là. Désactiver l'instantané de démarrage a des impacts [significatifs](https://github.com/nodejs/node/issues/14229) sur les performances. Au fil des années, nous avons ajouté de nombreuses [fonctionnalités](/blog/high-performance-es2015) [linguistiques](/blog/webassembly-browser-preview) et [optimisations](/blog/launching-ignition-and-turbofan) [sophistiquées](/blog/speeding-up-regular-expressions) à V8. Certaines de ces ajouts ont rendu le démarrage à partir de zéro encore plus coûteux. Immédiatement après la publication de sécurité, nous avons commencé à travailler sur une solution à long terme. L'objectif est de pouvoir [réactiver l'instantané de démarrage](https://github.com/nodejs/node/issues/14171) sans devenir vulnérable aux attaques par inondation de hachage.

Parmi les [solutions proposées](https://docs.google.com/document/d/1br7T3jk5JAJSYaT8eZdQlqrPTDRClheGpRU1-BpY1ss/edit), nous avons choisi et mis en œuvre la solution la plus pragmatique. Après la désérialisation à partir d'un instantané, nous choisissons une nouvelle graine de hachage. Les structures de données affectées sont ensuite réencodées pour garantir la cohérence.

Il s'avère que dans un instantané de démarrage ordinaire, peu de structures de données sont réellement affectées. Et à notre grande satisfaction, [réencoder des tables de hachage](https://github.com/v8/v8/commit/0e8e0030775518b69eb8522823ea3754e6bddc69) a été rendu facile dans V8 entre-temps. La surcharge ainsi ajoutée est insignifiante.

Le correctif pour réactiver l'instantané de démarrage a été [fusionné](https://github.com/nodejs/node/commit/2ae2874ae7dfec2c55b5d390d25b6eed9932f78d) [dans](https://github.com/nodejs/node/commit/14e4254f68f71a6afaf3ebe16794172b08e68d7b) Node.js. Il fait partie de la récente version de Node.js v8.3.0 [publiée](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367).
