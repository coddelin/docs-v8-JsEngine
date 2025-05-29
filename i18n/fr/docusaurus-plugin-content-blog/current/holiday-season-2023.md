---
title: "V8 est plus rapide et plus sûr que jamais !"
author: '[Victor Gomes](https://twitter.com/VictorBFG), l'expert du Glühwein'
avatars:
  - victor-gomes
date: 2023-12-14
tags:
  - JavaScript
  - WebAssembly
  - sécurité
  - benchmarks
description: "Les réalisations impressionnantes de V8 en 2023"
tweet: ""
---

Bienvenue dans le monde passionnant de V8, où la vitesse n'est pas seulement une caractéristique mais un mode de vie. Alors que nous disons adieu à 2023, il est temps de célébrer les réalisations impressionnantes que V8 a accomplies cette année.

Grâce à des optimisations innovantes en termes de performances, V8 continue de repousser les limites de ce qui est possible dans le paysage toujours en évolution du Web. Nous avons introduit un nouveau compilateur de niveau intermédiaire et mis en œuvre plusieurs améliorations dans l'infrastructure du compilateur de haut niveau, le runtime et le ramasse-miettes, ce qui a entraîné des gains de vitesse significatifs dans tous les domaines.

<!--truncate-->
En plus des améliorations de performances, nous avons introduit des fonctionnalités passionnantes pour à la fois JavaScript et WebAssembly. Nous avons également lancé une nouvelle approche pour apporter efficacement les langages de programmation à ramasse-miettes au Web avec [WebAssembly Garbage Collection (WasmGC)](https://v8.dev/blog/wasm-gc-porting).

Mais notre engagement envers l'excellence ne s'arrête pas là – nous avons également donné la priorité à la sécurité. Nous avons amélioré notre infrastructure de sandboxing et introduit [Control-flow Integrity (CFI)](https://en.wikipedia.org/wiki/Control-flow_integrity) dans V8, offrant un environnement plus sûr pour les utilisateurs.

Ci-dessous, nous avons exposé certains des principaux points forts de l'année.

# Maglev : nouveau compilateur de niveau intermédiaire optimisé

Nous avons introduit un nouveau compilateur optimisé nommé [Maglev](https://v8.dev/blog/maglev), stratégiquement positionné entre nos compilateurs existants [Sparkplug](https://v8.dev/blog/sparkplug) et [TurboFan](https://v8.dev/docs/turbofan). Il fonctionne entre les deux en tant que compilateur optimisé à haute vitesse, générant du code optimisé à un rythme impressionnant. Il génère du code environ 20 fois plus lentement que notre compilateur de base non optimisé Sparkplug, mais de 10 à 100 fois plus rapidement que le compilateur de haut niveau TurboFan. Nous avons observé des améliorations significatives des performances avec Maglev, avec [JetStream](https://browserbench.org/JetStream2.1/) en hausse de 8,2 % et [Speedometer](https://browserbench.org/Speedometer2.1/) de 6 %. La vitesse de compilation accrue de Maglev et une dépendance réduite envers TurboFan ont entraîné une économie d'énergie de 10 % dans la consommation globale de V8 lors des exécutions de Speedometer. [Bien que pas encore complètement terminé](https://en.m.wikipedia.org/wiki/Full-employment_theorem), l'état actuel de Maglev justifie son lancement dans Chrome 117. Plus de détails dans notre [article de blog](https://v8.dev/blog/maglev).

# Turboshaft : nouvelle architecture pour le compilateur de haut niveau optimisé

Maglev n'était pas notre seul investissement dans une technologie de compilateur améliorée. Nous avons également introduit Turboshaft, une nouvelle architecture interne pour notre compilateur de haut niveau optimisé Turbofan, le rendant à la fois plus facile à étendre avec de nouvelles optimisations et plus rapide pour la compilation. Depuis Chrome 120, les phases backend indépendantes du CPU utilisent toutes Turboshaft plutôt que Turbofan, et compilent environ deux fois plus rapidement qu'avant. Cela permet d'économiser de l'énergie et ouvre la voie à des gains de performances encore plus passionnants l'année prochaine et au-delà. Restez attentifs aux mises à jour !

# Parseur HTML plus rapide

Nous avons observé qu'une portion importante de notre temps de benchmark était consommée par l'analyse HTML. Bien que ce ne soit pas une amélioration directe de V8, nous avons pris l'initiative et utilisé notre expertise en optimisation des performances pour ajouter un parseur HTML plus rapide à Blink. Ces changements ont entraîné une augmentation notable de 3,4 % des scores de Speedometer. L'impact sur Chrome a été si positif que le projet WebKit a rapidement intégré ces changements dans [leur dépôt](https://github.com/WebKit/WebKit/pull/9926). Nous sommes fiers de contribuer à l'objectif collectif d'un Web plus rapide !

# Allocations DOM plus rapides

Nous avons également investi activement côté DOM. Des optimisations significatives ont été appliquées aux stratégies d'allocation de mémoire dans [Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md) - l'allocateur pour les objets DOM. Il dispose désormais d'un pool de pages, ce qui a considérablement réduit le coût des allers-retours au noyau. Oilpan prend maintenant en charge à la fois des pointeurs compressés et non compressés, et nous avons évité de compresser les champs à forte trafic dans Blink. Étant donné la fréquence des décompressions effectuées, cela a eu un impact généralisé sur les performances. De plus, sachant à quel point l'allocateur est rapide, nous avons « oilpanisé » des classes fréquemment allouées, ce qui a rendu les workloads d'allocation trois fois plus rapides et montré des améliorations significatives sur les benchmarks lourds de DOM tels que Speedometer.

# Nouvelles fonctionnalités de JavaScript

JavaScript continue d'évoluer avec de nouvelles fonctionnalités standardisées, et cette année ne fait pas exception. Nous avons mis en œuvre [les ArrayBuffers redimensionnables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers) et [le transfert d'ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer), les chaînes [`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) et [`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed), le [drapeau `v` de RegExp](https://v8.dev/features/regexp-v-flag) (également connu sous le nom de notation des ensembles Unicode), [`JSON.parse` avec source](https://github.com/tc39/proposal-json-parse-with-source), le [groupement de tableaux](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy), [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers), et [`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync). Malheureusement, nous avons dû désactiver temporairement [les helpers d'itérateur](https://github.com/tc39/proposal-iterator-helpers) après avoir découvert une incompatibilité avec le Web, mais nous avons travaillé avec TC39 pour résoudre le problème et les réactiver bientôt. Enfin, nous avons également accéléré le code JS ES6+ en [éliminant certaines vérifications redondantes de la zone morte temporelle](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing) pour les liaisons `let` et `const`.

# Mises à jour WebAssembly

Cette année, de nombreuses nouvelles fonctionnalités et améliorations de performances ont été apportées à Wasm. Nous avons activé la prise en charge de [multi-memory](https://github.com/WebAssembly/multi-memory), [les appels de queue](https://github.com/WebAssembly/tail-call) (voir notre [article de blog](https://v8.dev/blog/wasm-tail-call) pour plus de détails) et [SIMD relaxé](https://github.com/WebAssembly/relaxed-simd) pour libérer des performances de haut niveau. Nous avons terminé l’implémentation de [memory64](https://github.com/WebAssembly/memory64) pour vos applications gourmandes en mémoire et attendons simplement que la proposition [atteigne la phase 4](https://github.com/WebAssembly/memory64/issues/43) pour pouvoir la livrer ! Nous nous sommes assurés d'incorporer les dernières mises à jour de la [proposition de gestion des exceptions](https://github.com/WebAssembly/exception-handling) tout en continuant à prendre en charge le format précédent. Et nous avons poursuivi nos investissements dans le [JSPI](https://v8.dev/blog/jspi) pour [permettre une autre grande classe d’applications sur le Web](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m). Restez à l’écoute pour l’année prochaine !

# Collection de déchets WebAssembly

En parlant d’apporter de nouvelles classes d’applications au Web, nous avons également enfin livré la collecte des déchets WebAssembly (WasmGC) après plusieurs années de travail sur la [proposition](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md)'s de normalisation et [d’implémentation](https://bugs.chromium.org/p/v8/issues/detail?id=7748). Wasm dispose désormais d'un moyen intégré d'allouer des objets et des tableaux qui sont gérés par le collecteur de déchets existant de V8. Cela permet de compiler des applications écrites en Java, Kotlin, Dart et des langages similaires à collecte de déchets vers Wasm – où elles fonctionnent généralement deux fois plus rapidement que lorsqu'elles sont compilées en JavaScript. Voir [notre article de blog](https://v8.dev/blog/wasm-gc-porting) pour beaucoup plus de détails.

# Sécurité

En matière de sécurité, nos trois principaux sujets de l'année étaient le sandboxing, le fuzzing et le CFI. Du côté du [sandboxing](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing), nous nous sommes concentrés sur la création de l'infrastructure manquante comme la table de code et des pointeurs de confiance. Du côté du fuzzing nous avons investi dans tout, de l'infrastructure de fuzzing aux fuzzers spécifiques et une meilleure couverture linguistique. Une partie de notre travail a été couverte dans [cette présentation](https://www.youtube.com/watch?v=Yd9m7e9-pG0). Enfin, du côté du CFI nous avons posé les bases de notre [architecture CFI](https://v8.dev/blog/control-flow-integrity) afin de pouvoir la réaliser sur autant de plateformes que possible. En dehors de ces domaines principaux, il convient de noter des efforts plus modestes tels que le travail sur [la mitigation d'une technique d'exploitation populaire](https://crbug.com/1445008) autour de `the_hole` et le lancement d'un nouveau programme de prime pour les exploits sous la forme du [V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md).

# Conclusion

Tout au long de l'année, nous avons investi dans de nombreuses améliorations de performances incrémentales. L'impact combiné de ces petits projets, ainsi que de ceux détaillés dans l'article de blog, est substantiel ! Ci-dessous figurent les scores de référence illustrant les améliorations de performances de V8 obtenues en 2023, avec une croissance globale de `14%` pour JetStream et une augmentation impressionnante de `34%` pour Speedometer.

![Benchs de performances Web mesurés sur un MacBook Pro 13” M1.](/_img/holiday-season-2023/scores.svg)

Ces résultats montrent que V8 est plus rapide et plus sûr que jamais. Accrochez-vous, chers développeurs, car avec V8, le voyage dans un Web rapide et fulgurant commence à peine ! Nous nous engageons à maintenir V8 comme le meilleur moteur JavaScript et WebAssembly sur la planète !

De la part de toute l'équipe V8, nous vous souhaitons une saison des fêtes joyeuse, remplie d'expériences rapides, sûres et fabuleuses en naviguant sur le Web !
