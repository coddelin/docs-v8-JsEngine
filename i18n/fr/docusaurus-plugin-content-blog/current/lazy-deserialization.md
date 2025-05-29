---
title: 'Désérialisation paresseuse'
author: 'Jakob Gruber ([@schuay](https://twitter.com/schuay))'
avatars:
  - 'jakob-gruber'
date: 2018-02-12 13:33:37
tags:
  - internes
description: 'La désérialisation paresseuse, disponible dans V8 v6.4, réduit en moyenne la consommation de mémoire de V8 de plus de 500 KB par onglet de navigateur.'
tweet: '962989179914383360'
---
TL;DR : La désérialisation paresseuse a récemment été activée par défaut dans [V8 v6.4](/blog/v8-release-64), réduisant en moyenne la consommation de mémoire de V8 de plus de 500 KB par onglet de navigateur. Lisez la suite pour en savoir plus !

## Introduction aux instantanés V8

Mais d'abord, revenons un peu en arrière et voyons comment V8 utilise les instantanés de tas pour accélérer la création de nouveaux isolats (qui correspondent approximativement à un onglet de navigateur dans Chrome). Mon collègue Yang Guo a donné une bonne introduction à ce sujet dans son article sur les [instantanés de démarrage personnalisés](/blog/custom-startup-snapshots) :

<!--truncate-->
> La spécification JavaScript comprend de nombreuses fonctionnalités intégrées, des fonctions mathématiques à un moteur d'expression régulière complet. Chaque contexte V8 nouvellement créé dispose de ces fonctions dès le départ. Pour que cela fonctionne, l'objet global (par exemple, l'objet `window` dans un navigateur) et toutes les fonctionnalités intégrées doivent être configurés et initialisés dans le tas de V8 au moment de la création du contexte. Cela prend pas mal de temps de faire cela à partir de zéro.
>
> Heureusement, V8 utilise une solution pour accélérer les choses : tout comme décongeler une pizza surgelée pour un dîner rapide, nous désérialisons directement un instantané préalablement préparé dans le tas pour obtenir un contexte initialisé. Sur un ordinateur de bureau classique, cela peut réduire le temps de création d'un contexte de 40 ms à moins de 2 ms. Sur un téléphone mobile moyen, cela pourrait signifier une différence entre 270 ms et 10 ms.

Pour résumer : les instantanés sont essentiels pour les performances de démarrage, et ils sont désérialisés pour créer l'état initial du tas de V8 pour chaque isolat. La taille de l'instantané détermine donc la taille minimale du tas de V8, et des instantanés plus grands se traduisent directement par une consommation de mémoire plus élevée pour chaque isolat.

Un instantané contient tout ce qui est nécessaire pour initialiser complètement un nouvel isolat, y compris les constantes du langage (par exemple, la valeur `undefined`), les gestionnaires de bytecode internes utilisés par l'interpréteur, les objets intégrés (par exemple, `String`) et les fonctions installées sur les objets intégrés (par exemple, `String.prototype.replace`) ainsi que leurs objets exécutables `Code`.

![Taille des instantanés de démarrage en octets de 2016-01 à 2017-09. L'axe des x montre les numéros de révision de V8.](/_img/lazy-deserialization/startup-snapshot-size.png)

Au cours des deux dernières années, la taille de l'instantané a presque triplé, passant d'environ 600 KB au début de 2016 à plus de 1500 KB aujourd'hui. La grande majorité de cette augmentation provient des objets `Code` sérialisés, dont le nombre a augmenté (par exemple, en raison d'ajouts récents à la langue JavaScript à mesure que la spécification évolue et s'étend) ; et en taille (les éléments intégrés générés par le nouveau pipeline [CodeStubAssembler](/blog/csa) sont livrés sous forme de code natif par rapport à des formats bytecode plus compacts ou JS minimisés).

Ce sont de mauvaises nouvelles, car nous aimerions que la consommation de mémoire soit la plus basse possible.

## Désérialisation paresseuse

L’un des principaux points problématiques était que nous avions l'habitude de copier tout le contenu de l'instantané dans chaque isolat. Cela était particulièrement gaspilleur pour les fonctions intégrées, toutes chargées de manière inconditionnelle mais qui pouvaient ne jamais être utilisées.

C'est là que la désérialisation paresseuse intervient. Le concept est assez simple : que se passerait-il si nous ne désérialisions les fonctions intégrées qu'au moment où elles sont appelées ?

Une enquête rapide sur certains des sites Web les plus populaires a montré que cette approche était assez attractive : en moyenne, seulement 30 % de toutes les fonctions intégrées étaient utilisées, certains sites n'en utilisant que 16 %. Cela semblait remarquablement prometteur, étant donné que la plupart de ces sites sont de gros utilisateurs de JS et que ces chiffres peuvent donc être considérés comme une limite inférieure (floue) des économies de mémoire potentielles pour le web en général.

Alors que nous commencions à travailler sur cette direction, il s'est avéré que la désérialisation paresseuse s'intégrait très bien à l'architecture de V8 et ne nécessitait que quelques changements de conception principalement non invasifs pour être opérationnelle :

1. **Positions bien connues dans l'instantané.** Avant la désérialisation paresseuse, l'ordre des objets dans l'instantané sérialisé était sans importance car nous désérialisions toujours tout le tas d'un coup. La désérialisation paresseuse doit pouvoir désérialiser n'importe quelle fonction intégrée donnée par elle-même, et doit donc savoir où elle se trouve dans l'instantané.
2. **Désérialisation d'objets uniques.** Les snapshots de V8 ont été initialement conçus pour la désérialisation complète du tas, et ajouter une prise en charge pour la désérialisation d'un objet unique nécessitait de gérer quelques particularités, telles que la disposition non contiguë du snapshot (les données sérialisées pour un objet pouvaient être entremêlées avec des données pour d'autres objets) et les soi-disant références inverses (qui peuvent référencer directement des objets déjà désérialisés dans l'exécution en cours).
3. **Le mécanisme de désérialisation à la demande lui-même.** À l'exécution, le gestionnaire de désérialisation à la demande doit être capable a) de déterminer quel objet de code désérialiser, b) de réaliser la désérialisation proprement dite, et c) d'attacher l'objet de code sérialisé à toutes les fonctions pertinentes.

Notre solution aux deux premiers points a été d'ajouter une nouvelle [zone dédiée aux fonctions intégrées](https://cs.chromium.org/chromium/src/v8/src/snapshot/snapshot.h?l=55&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) dans le snapshot, qui peut uniquement contenir des objets de code sérialisés. La sérialisation s'effectue dans un ordre bien défini et le décalage de départ de chaque objet `Code` est conservé dans une section dédiée au sein de la zone de snapshot des fonctions intégrées. Les références inverses et les données d'objets entremêlées sont interdites.

[La désérialisation paresseuse des fonctions intégrées](https://goo.gl/dxkYDZ) est gérée par la fonction intégrée opportunément nommée [`DeserializeLazy`](https://cs.chromium.org/chromium/src/v8/src/builtins/x64/builtins-x64.cc?l=1355&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d), qui est installée sur toutes les fonctions intégrées paresseuses au moment de la désérialisation. Lorsqu'elle est appelée à l'exécution, elle désérialise l'objet `Code` pertinent et l'installe enfin à la fois sur l'`JSFunction` (représentant l'objet fonction) et sur l'`SharedFunctionInfo` (partagé entre les fonctions créées à partir du même littéral de fonction). Chaque fonction intégrée est désérialisée au maximum une fois.

En plus des fonctions intégrées, nous avons également implémenté [la désérialisation paresseuse pour les gestionnaires de bytecodes](https://goo.gl/QxZBL2). Les gestionnaires de bytecodes sont des objets de code contenant la logique pour exécuter chaque bytecode dans l'interpréteur [Ignition](/blog/ignition-interpreter) de V8. Contrairement aux fonctions intégrées, ils n'ont ni `JSFunction` attachée ni `SharedFunctionInfo`. Au lieu de cela, leurs objets de code sont stockés directement dans la [table de répartition](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter.h?l=94&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) dans laquelle l'interpréteur recherche lorsqu'il passe au gestionnaire de bytecode suivant. La désérialisation paresseuse est similaire à celle des fonctions intégrées : le gestionnaire [`DeserializeLazy`](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter-generator.cc?l=3247&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) détermine quel gestionnaire désérialiser en inspectant le tableau de bytecodes, désérialise l'objet de code et stocke enfin le gestionnaire désérialisé dans la table de répartition. Là encore, chaque gestionnaire est désérialisé au maximum une fois.

## Résultats

Nous avons évalué les économies de mémoire en chargeant les 1000 sites Web les plus populaires en utilisant Chrome 65 sur un appareil Android, avec et sans désérialisation paresseuse.

![](/_img/lazy-deserialization/memory-savings.png)

En moyenne, la taille du tas de V8 a diminué de 540 Ko, avec 25 % des sites testés économisant plus de 620 Ko, 50 % économisant plus de 540 Ko et 75 % économisant plus de 420 Ko.

Les performances d'exécution (mesurées sur des benchmarks JS standards tels que Speedometer, ainsi qu'une large sélection de sites Web populaires) n'ont pas été affectées par la désérialisation paresseuse.

## Prochaines étapes

La désérialisation paresseuse garantit que chaque Isolate ne charge que les objets de code intégrés qui sont réellement utilisés. C'est déjà une grande victoire, mais nous pensons qu'il est possible d'aller encore plus loin et de réduire le coût (lié aux fonctions intégrées) de chaque Isolate à pratiquement zéro.

Nous espérons vous apporter des mises à jour sur ce sujet plus tard cette année. Restez à l'écoute!
