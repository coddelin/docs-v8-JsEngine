---
title: &apos;Snapshots personnalisés au démarrage&apos;
author: &apos;Yang Guo ([@hashseed](https://twitter.com/hashseed)), ingénieur logiciel et fournisseur de préchauffeurs pour moteurs&apos;
avatars:
  - &apos;yang-guo&apos;
date: 2015-09-25 13:33:37
tags:
  - internals
description: &apos;Les intégrateurs de V8 peuvent utiliser des snapshots pour éviter le temps de démarrage associé à l&apos;initialisation des programmes JavaScript.&apos;
---
La spécification JavaScript inclut de nombreuses fonctionnalités intégrées, allant des [fonctions mathématiques](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math) à un [moteur d&apos;expressions régulières complet](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions). Chaque contexte V8 nouvellement créé dispose de ces fonctions disponibles dès le départ. Pour que cela fonctionne, l&apos;objet global (par exemple, l&apos;objet window dans un navigateur) et toutes les fonctionnalités intégrées doivent être configurés et initialisés dans le tas de V8 au moment où le contexte est créé. Cela prend un certain temps si l&apos;on part de zéro.

<!--truncate-->
Heureusement, V8 utilise un raccourci pour accélérer les choses : tout comme décongeler une pizza surgelée pour un dîner rapide, nous désérialisons un snapshot préparé préalablement directement dans le tas pour obtenir un contexte initialisé. Sur un ordinateur de bureau classique, cela peut réduire le temps de création d&apos;un contexte de 40 ms à moins de 2 ms. Sur un téléphone mobile moyen, cela peut signifier une différence entre 270 ms et 10 ms.

Les applications autres que Chrome qui intègrent V8 peuvent nécessiter plus que JavaScript pur. Beaucoup chargent des scripts de bibliothèque supplémentaires au démarrage, avant que l&apos;application “réelle” ne s&apos;exécute. Par exemple, une machine virtuelle TypeScript simple basée sur V8 devrait charger le compilateur TypeScript au démarrage afin de traduire le code source TypeScript en JavaScript en temps réel.

Depuis la sortie de V8 v4.3 il y a deux mois, les intégrateurs peuvent utiliser les snapshots pour éviter le temps de démarrage associé à une telle initialisation. Le [cas de test](https://chromium.googlesource.com/v8/v8.git/+/4.5.103.9/test/cctest/test-serialize.cc#661) pour cette fonctionnalité montre comment fonctionne cette API.

Pour créer un snapshot, nous pouvons appeler `v8::V8::CreateSnapshotDataBlob` avec le script à intégrer en tant que chaîne de caractères C terminée par un caractère nul. Après la création d&apos;un nouveau contexte, ce script est compilé et exécuté. Dans notre exemple, nous créons deux snapshots personnalisés au démarrage, chacun définissant des fonctions en plus de celles déjà intégrées à JavaScript.

Nous pouvons ensuite utiliser `v8::Isolate::CreateParams` pour configurer un isolat nouvellement créé de manière à ce qu&apos;il initialise les contextes à partir d&apos;un snapshot personnalisé au démarrage. Les contextes créés dans cet isolat sont des copies exactes de celui à partir duquel nous avons pris un snapshot. Les fonctions définies dans le snapshot sont disponibles sans avoir besoin de les redéfinir.

Il y a une limitation importante à cela : le snapshot ne peut capturer que le tas de V8. Toute interaction de V8 avec l&apos;extérieur est interdite lors de la création du snapshot. De telles interactions incluent :

- définir et appeler des callbacks d&apos;API (c&apos;est-à-dire des fonctions créées via `v8::FunctionTemplate`)
- créer des tableaux typés, car la réserve de mémoire peut être allouée en dehors de V8

Et bien sûr, les valeurs dérivées de sources telles que `Math.random` ou `Date.now` sont figées une fois le snapshot capturé. Elles ne sont plus vraiment aléatoires ni ne reflètent le temps actuel.

Malgré ses limitations, les snapshots au démarrage restent un excellent moyen de gagner du temps lors de l&apos;initialisation. Nous pouvons économiser 100 ms sur le temps de démarrage consacré au chargement du compilateur TypeScript dans notre exemple ci-dessus (sur un ordinateur de bureau classique). Nous attendons avec impatience de voir comment vous pourriez utiliser les snapshots personnalisés !
