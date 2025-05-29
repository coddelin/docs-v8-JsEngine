---
title: "Bibliothèque Oilpan"
author: "Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), et Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), déménageurs de fichiers efficaces et performants"
avatars:
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags:
  - internes
  - mémoire
  - cppgc
description: "V8 est livré avec Oilpan, une bibliothèque de collecte des ordures pour héberger la mémoire gérée en C++."
tweet: "1458406645181165574"
---

Bien que le titre de cet article puisse laisser entendre une plongée approfondie dans une collection de livres sur les bacs à huile – ce qui, étant donné les normes de construction des bacs, est un sujet étonnamment riche en littérature – nous examinons plutôt de plus près Oilpan, un ramasse-miettes C++ qui est hébergé via V8 en tant que bibliothèque depuis V8 v9.4.

<!--truncate-->
Oilpan est un [ramasse-miettes basé sur le traçage](https://fr.wikipedia.org/wiki/Ramasse-miettes#Collecteurs_%C3%A0_trac%C3%A9), ce qui signifie qu'il détermine les objets vivants en traversant un graphe d'objets lors d'une phase de marquage. Les objets morts sont ensuite récupérés lors d'une phase de balayage, ce que nous avons [abordé dans un blog précédemment](https://v8.dev/blog/high-performance-cpp-gc). Les deux phases peuvent s'exécuter en alternance ou en parallèle avec du code d'application C++ réel. La gestion des références pour les objets du tas est précise, et conservatrice pour la pile native. Cela signifie qu'Oilpan sait où se trouvent les références dans le tas, mais doit analyser la mémoire en supposant que des séquences aléatoires de bits représentent des pointeurs pour la pile. Oilpan prend également en charge la compression (défragmentation du tas) pour certains objets lorsque la collecte des ordures s'exécute sans pile native.

Alors, quel est l'intérêt de fournir Oilpan comme une bibliothèque via V8 ?

Blink, étant un fork de WebKit, utilisait initialement le comptage de références, un [paradigme bien connu pour le code C++](https://en.cppreference.com/w/cpp/memory/shared_ptr), pour gérer sa mémoire sur le tas. Le comptage de références est censé résoudre les problèmes de gestion de la mémoire, mais il est connu pour être sujet aux fuites de mémoire en raison des cycles. En plus de ce problème inhérent, Blink souffrait également de problèmes [d'utilisation après libération](https://fr.wikipedia.org/wiki/Pointeur_danglant), car parfois le comptage de références était omis pour des raisons de performance. Oilpan a été initialement développé spécifiquement pour Blink afin de simplifier le modèle de programmation et d'éliminer les fuites de mémoire et les problèmes d'utilisation après libération. Nous pensons qu'Oilpan a réussi à simplifier le modèle et à rendre le code plus sûr.

Une autre raison, peut-être moins prononcée, d'introduire Oilpan dans Blink était de faciliter l'intégration avec d'autres systèmes de gestion de mémoire tels que V8, ce qui s'est finalement matérialisé par la mise en œuvre du [tas unifié pour JavaScript et C++](https://v8.dev/blog/tracing-js-dom) où Oilpan s'occupe du traitement des objets C++[^1]. Avec de plus en plus de hiérarchies d'objets gérées et une meilleure intégration avec V8, Oilpan est devenu de plus en plus complexe au fil du temps, et l'équipe a réalisé qu'elle réinventait les mêmes concepts que ceux du ramasse-miettes de V8 et résolvait les mêmes problèmes. L'intégration dans Blink nécessitait de construire environ 30 000 cibles pour exécuter un simple test de collecte d'ordures avec le tas unifié.

Début 2020, nous avons entrepris un processus visant à extraire Oilpan de Blink et à l'encapsuler dans une bibliothèque. Nous avons décidé d'héberger le code dans V8, de réutiliser les abstractions lorsque cela était possible, et de faire un peu de ménage de printemps dans l'interface de collecte des ordures. En plus de résoudre tous les problèmes susmentionnés, [une bibliothèque](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/) permettrait également à d'autres projets d'utiliser le C++ à gestion automatique de la mémoire. Nous avons lancé la bibliothèque dans V8 v9.4 et l'avons activée dans Blink à partir de Chromium M94.

## Que contient la boîte ?

À l'instar du reste de V8, Oilpan fournit désormais une [API stable](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/) et les intégrateurs peuvent s'appuyer sur les [conventions régulières de V8](https://v8.dev/docs/api). Par exemple, cela signifie que les API sont correctement documentées (voir [GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17)) et seront accompagnées d'une période de dépréciation en cas de suppression ou de modification.

Le cœur d'Oilpan est disponible en tant que collecteur de déchets autonome pour C++ dans l'espace de noms `cppgc`. La configuration permet également de réutiliser une plate-forme V8 existante pour créer un tas d'objets C++ gérés. Les collectes de déchets peuvent être configurées pour s'exécuter automatiquement, s'intégrant dans l'infrastructure de tâches, ou être déclenchées explicitement en tenant compte de la pile native. L'idée est de permettre aux intégrateurs souhaitant uniquement des objets C++ gérés d'éviter de devoir s'occuper de V8 dans son ensemble ; consultez ce [programme de démonstration](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc) comme exemple. Une intégration de cette configuration est PDFium, qui utilise la version autonome d'Oilpan pour [sécuriser le format XFA](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer), offrant ainsi un contenu PDF plus dynamique.

De manière pratique, les tests pour le cœur d'Oilpan utilisent cette configuration, ce qui signifie qu'il suffit de quelques secondes pour construire et exécuter un test spécifique de collecte de déchets. À ce jour, [>400 de ces tests unitaires](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/) pour le cœur d'Oilpan existent. La configuration sert également de terrain d'expérimentation pour essayer de nouvelles choses et peut être utilisée pour valider des hypothèses sur les performances brutes.

La bibliothèque Oilpan se charge également de traiter les objets C++ lorsqu'elle fonctionne avec le tas unifié via V8, ce qui permet un enchevêtrement complet des graphes d'objets C++ et JavaScript. Cette configuration est utilisée dans Blink pour gérer la mémoire C++ du DOM et plus encore. Oilpan expose également un système de traits qui permet d'étendre le cœur du collecteur de déchets avec des types ayant des besoins très spécifiques pour déterminer la viabilité. Cela permet à Blink de fournir ses bibliothèques de collecte personnalisées qui permettent même de construire des cartes éphémères de style JavaScript ([`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)) en C++. Nous ne recommandons pas cela à tout le monde, mais cela montre ce que ce système peut faire en cas de besoin de personnalisation.

## Où allons-nous ?

La bibliothèque Oilpan nous fournit une base solide que nous pouvons maintenant exploiter pour améliorer les performances. Là où nous devions auparavant spécifier des fonctionnalités spécifiques de collecte de déchets sur l'API publique de V8 pour interagir avec Oilpan, nous pouvons désormais directement implémenter ce dont nous avons besoin. Cela permet des itérations rapides, ainsi que des raccourcis et améliorations de performances lorsque cela est possible.

Nous voyons également un potentiel dans la fourniture de certains conteneurs de base directement via Oilpan afin d'éviter de réinventer la roue. Cela permettrait à d'autres intégrateurs de bénéficier de structures de données auparavant créées spécifiquement pour Blink.

En voyant un avenir prometteur pour Oilpan, nous aimerions mentionner que les API existantes de [`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75) ne seront pas davantage améliorées et pourraient être abandonnées à un moment donné. En supposant que les intégrateurs utilisant de telles API aient déjà implémenté leur propre système de traçage, migrer vers Oilpan devrait être aussi simple que d'allouer des objets C++ sur un [tas Oilpan nouvellement créé](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91) qui est ensuite attaché à un Isolate de V8. L'infrastructure existante pour modéliser les références telles que [`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334) (pour les références dans V8) et les [champs internes](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502) (pour les références sortant de V8) sont prises en charge par Oilpan.

Restez informé pour plus d'améliorations sur la collecte de déchets à venir !

Rencontrez-vous des problèmes ou avez-vous des suggestions ? Faites-le nous savoir :

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail : [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: Trouvez plus d'informations sur la collecte de déchets entre les composants dans l'[article de recherche](https://research.google/pubs/pub48052/).
