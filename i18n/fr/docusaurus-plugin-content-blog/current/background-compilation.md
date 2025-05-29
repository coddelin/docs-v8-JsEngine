---
title: "Compilation en arrière-plan"
author: "[Ross McIlroy](https://twitter.com/rossmcilroy), défenseur du thread principal"
avatars:
  - "ross-mcilroy"
date: 2018-03-26 13:33:37
tags:
  - internals
description: "À partir de Chrome 66, V8 compile le code source JavaScript sur un thread en arrière-plan, réduisant de 5% à 20% le temps passé à compiler sur le thread principal sur les sites web typiques."
tweet: "978319362837958657"
---
TL;DR: À partir de Chrome 66, V8 compile le code source JavaScript sur un thread en arrière-plan, réduisant de 5% à 20% le temps passé à compiler sur le thread principal sur les sites web typiques.

## Contexte

Depuis la version 41, Chrome prend en charge [l'analyse des fichiers source JavaScript sur un thread en arrière-plan](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html) via l'API [`StreamedSource`](https://cs.chromium.org/chromium/src/v8/include/v8.h?q=StreamedSource&sq=package:chromium&l=1389) de V8. Cela permet à V8 de commencer à analyser le code source JavaScript dès que Chrome a téléchargé le premier fragment du fichier depuis le réseau, et de continuer l'analyse en parallèle pendant que Chrome diffuse le fichier sur le réseau. Cela peut apporter des améliorations considérables au temps de chargement, car V8 peut presque avoir terminé l'analyse du JavaScript au moment où le fichier est complètement téléchargé.

<!--truncate-->
Cependant, en raison de limitations du compilateur initial de V8, celui-ci devait encore revenir au thread principal pour finaliser l'analyse et compiler le script en code machine JIT qui exécuterait le code du script. Avec le passage à notre nouveau [pipeline Ignition + TurboFan](/blog/launching-ignition-and-turbofan), nous sommes maintenant en mesure de déplacer la compilation du bytecode sur le thread en arrière-plan également, libérant ainsi le thread principal de Chrome pour une expérience de navigation web plus fluide et plus réactive.

## Construction d'un compilateur de bytecode en thread d'arrière-plan

Le compilateur de bytecode Ignition de V8 prend l'[arbre syntaxique abstrait (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) produit par l'analyseur comme entrée et produit un flux de bytecode (`BytecodeArray`) accompagné de métadonnées associées qui permettent à l'interpréteur Ignition d'exécuter le code source JavaScript.

![](/_img/background-compilation/bytecode.svg)

Le compilateur de bytecode d'Ignition a été conçu avec le multithreading à l'esprit, cependant plusieurs modifications étaient nécessaires dans tout le pipeline de compilation pour permettre la compilation en arrière-plan. L'un des principaux changements consistait à empêcher le pipeline de compilation d'accéder aux objets dans le tas JavaScript de V8 pendant l'exécution sur le thread en arrière-plan. Les objets dans le tas de V8 ne sont pas thread-safe, car JavaScript est monothread et pourraient être modifiés par le thread principal ou le garbage collector de V8 pendant la compilation en arrière-plan.

Il y avait deux étapes principales du pipeline de compilation qui accédaient aux objets dans le tas de V8 : l'internalisation de l'AST et la finalisation du bytecode. L'internalisation de l'AST est un processus par lequel les objets littéraux (chaînes, nombres, modèles d'objets littéraux, etc.) identifiés dans l'AST sont alloués dans le tas de V8, de sorte qu'ils puissent être utilisés directement par le bytecode généré lorsqu'il s'agit d'exécuter le script. Ce processus se déroulait traditionnellement immédiatement après que le parser ait construit l'AST. En conséquence, plusieurs étapes ultérieures du pipeline de compilation dépendaient du fait que les objets littéraux avaient été alloués. Pour permettre la compilation en arrière-plan, nous avons déplacé l'internalisation de l'AST plus tard dans le pipeline de compilation, après que le bytecode ait été compilé. Cela a nécessité des modifications dans les étapes ultérieures du pipeline pour accéder aux valeurs littérales _brutes_ intégrées dans l'AST au lieu des valeurs qui avaient été internalisées dans le tas.

La finalisation du bytecode consiste à construire l'objet final `BytecodeArray`, utilisé pour exécuter la fonction, avec les métadonnées associées — par exemple, un `ConstantPoolArray` qui stocke les constantes référencées par le bytecode, et une `SourcePositionTable` qui mappe les numéros de ligne et de colonne de la source JavaScript à des décalages de bytecode. Comme JavaScript est un langage dynamique, ces objets doivent tous résider dans le tas JavaScript pour qu'ils puissent être collectés par le garbage collector si la fonction JavaScript associée au bytecode est collectée. Auparavant, certains de ces objets de métadonnées étaient alloués et modifiés pendant la compilation du bytecode, ce qui impliquait un accès au tas JavaScript. Afin de permettre la compilation en arrière-plan, le générateur de bytecode d'Ignition a été refactorisé pour suivre les détails de ces métadonnées et différer leur allocation sur le tas JavaScript jusqu'aux étapes finales de la compilation.

Avec ces changements, presque toute la compilation du script peut être déplacée sur un thread en arrière-plan, avec seulement les étapes courtes d'internalisation de l'AST et de finalisation du bytecode se produisant sur le thread principal juste avant l'exécution du script.

![](/_img/background-compilation/threads.svg)

Actuellement, seul le code du script principal et les expressions de fonction immédiatement invoquées (IIFE) sont compilés sur un thread en arrière-plan — les fonctions internes sont encore compilées de manière paresseuse (lorsqu'elles sont exécutées pour la première fois) sur le thread principal. Nous espérons étendre la compilation en arrière-plan à d'autres situations à l'avenir. Cependant, même avec ces restrictions, la compilation en arrière-plan laisse le thread principal libre plus longtemps, lui permettant d'effectuer d'autres tâches comme réagir aux interactions des utilisateurs, rendre des animations ou produire, de manière générale, une expérience plus fluide et réactive.

## Résultats

Nous avons évalué les performances de la compilation en arrière-plan à l'aide de notre [cadre d'évaluation des performances en conditions réelles](/blog/real-world-performance) sur un ensemble de pages web populaires.

![](/_img/background-compilation/desktop.svg)

![](/_img/background-compilation/mobile.svg)

La proportion de compilation pouvant avoir lieu sur un thread en arrière-plan varie selon la proportion de bytecode compilé pendant la compilation de script principal en streaming par rapport à la compilation paresseuse lorsque des fonctions internes sont invoquées (ce qui doit toujours se produire sur le thread principal). Ainsi, la proportion de temps économisée sur le thread principal varie, la plupart des pages observant une réduction de 5% à 20% du temps de compilation sur le thread principal.

## Prochaines étapes

Quoi de mieux que de compiler un script sur un thread en arrière-plan ? Ne pas avoir à compiler le script du tout ! En parallèle de la compilation en arrière-plan, nous travaillons également à l'amélioration du [système de mise en cache du code](/blog/code-caching) de V8 afin d'augmenter la quantité de code mise en cache par V8, accélérant ainsi le chargement des pages des sites que vous visitez fréquemment. Nous espérons vous apporter des mises à jour à ce sujet bientôt. Restez à l'écoute !
