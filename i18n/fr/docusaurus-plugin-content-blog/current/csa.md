---
title: 'Dompter la complexité de l'architecture dans V8 — le CodeStubAssembler'
author: '[Daniel Clifford](https://twitter.com/expatdanno), assembleur CodeStubAssembler'
date: 2017-11-16 13:33:37
tags:
  - internes
description: 'V8 possède sa propre abstraction au-dessus du code assembleur : le CodeStubAssembler. Le CSA permet à V8 d'optimiser rapidement et de manière fiable les fonctionnalités JS à un niveau bas, tout en prenant en charge plusieurs plateformes.'
tweet: '931184976481177600'
---
Dans cet article, nous souhaitons présenter le CodeStubAssembler (CSA), un composant de V8 qui s'est avéré être un outil très utile pour atteindre certains [grands](/blog/optimizing-proxies) [gains](https://twitter.com/v8js/status/918119002437750784) [de performance](https://twitter.com/_gsathya/status/900188695721984000) au cours des dernières versions de V8. Le CSA a également considérablement amélioré la capacité de l'équipe V8 à optimiser rapidement les fonctionnalités JavaScript à un niveau bas avec un haut degré de fiabilité, ce qui a amélioré la vitesse de développement de l'équipe.

<!--truncate-->
## Une brève histoire des fonctions intégrées et de l'assembleur écrit à la main dans V8

Pour comprendre le rôle du CSA dans V8, il est important de comprendre un peu le contexte et l'histoire qui ont conduit à son développement.

V8 tire parti des performances de JavaScript en utilisant une combinaison de techniques. Pour le code JavaScript qui s'exécute longtemps, le compilateur optimisé de V8, [TurboFan](/docs/turbofan), fait un excellent travail pour accélérer tout le spectre des fonctionnalités ES2015+ pour des performances optimales. Cependant, V8 doit également exécuter efficacement le code JavaScript à exécution courte pour obtenir une bonne performance de base. Ceci est particulièrement important pour les **fonctions intégrées** des objets prédéfinis disponibles pour tous les programmes JavaScript, comme défini par la [spécification ECMAScript](https://tc39.es/ecma262/).

Historiquement, nombre de ces fonctions intégrées étaient [auto-hébergées](https://en.wikipedia.org/wiki/Self-hosting), c'est-à-dire qu'elles étaient développées par un développeur V8 en JavaScript — bien qu'il s'agisse d'un dialecte interne spécial de V8. Pour atteindre de bonnes performances, ces fonctions intégrées auto-hébergées reposent sur les mêmes mécanismes que V8 utilise pour optimiser le JavaScript fourni par l'utilisateur. Comme avec le code fourni par l'utilisateur, les fonctions intégrées auto-hébergées nécessitent une phase de préchauffage où les retours de type sont collectés et elles doivent être compilées par le compilateur optimisé.

Bien que cette technique offre de bonnes performances intégrées dans certaines situations, il est possible de faire mieux. Les sémantiques exactes des fonctions prédéfinies sur le `Array.prototype` sont [spécifiées en détail exquis](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object) dans la spécification. Pour les cas importants et courants, les implémenteurs de V8 savent à l'avance exactement comment ces fonctions intégrées doivent fonctionner en comprenant la spécification, et ils utilisent ces connaissances pour concevoir avec soin des versions personnalisées et optimisées dès le départ. Ces _fonctions intégrées optimisées_ traitent les cas courants sans préchauffage ni besoin de faire appel au compilateur optimisé, car la construction garantit déjà des performances de base optimales lors de la première invocation.

Pour tirer le meilleur parti des performances des fonctions JavaScript intégrées écrites à la main (et d'autres chemins rapides du code V8 qui sont aussi appelés fonctions intégrées), les développeurs de V8 écrivaient traditionnellement des fonctions intégrées optimisées en langage assembleur. En utilisant l'assembleur, les fonctions intégrées écrites à la main étaient particulièrement rapides en évitant, entre autres, les appels coûteux au code C++ de V8 via des trampolines et en exploitant l'[ABI](https://en.wikipedia.org/wiki/Application_binary_interface) basé sur des registres personnalisée de V8 qu'il utilise en interne pour appeler des fonctions JavaScript.

En raison des avantages du langage assembleur écrit à la main, V8 a accumulé littéralement des dizaines de milliers de lignes de code assembleur écrit à la main pour les fonctions intégrées au fil des ans… _par plateforme_. Toutes ces fonctions intégrées en langage assembleur ont été excellentes pour améliorer les performances, mais de nouvelles fonctionnalités linguistiques sont toujours en cours de standardisation, et maintenir et étendre cet assembleur écrit à la main était laborieux et sujet aux erreurs.

## L'arrivée du CodeStubAssembler

Les développeurs de V8 se sont longtemps débattus avec un dilemme : est-il possible de créer des fonctions intégrées qui ont les avantages du langage assembleur écrit à la main sans être fragiles et difficiles à maintenir ?

Avec l'avènement de TurboFan, la réponse à cette question est enfin « oui ». Le backend de TurboFan utilise une [représentation intermédiaire](https://en.wikipedia.org/wiki/Intermediate_representation) (IR) multiplateforme pour les opérations de machine bas-niveau. Cette IR machine de bas-niveau est l'entrée d'un sélecteur d'instructions, d'un allocateur de registres, d'un ordonnanceur d'instructions et d'un générateur de code qui produisent un code de très bonne qualité sur toutes les plateformes. Le backend connaît également de nombreux astuces utilisées dans les fonctions intégrées en assemblage manuel de V8, comme la façon d'utiliser et d'appeler une ABI basée sur des registres, la manière de gérer les appels de queue au niveau machine et la manière d'éliminer la construction de cadres de pile dans les fonctions en feuilles. Ces connaissances rendent le backend TurboFan particulièrement bien adapté à la génération d'un code rapide qui s'intègre parfaitement au reste de V8.

Cette combinaison de fonctionnalités a rendu pour la première fois envisageable une alternative robuste et maintenable aux fonctions intégrées en assembleur manuel. L'équipe a créé un nouveau composant de V8, appelé CodeStubAssembler ou CSA, qui définit un langage d'assemblage portable basé sur le backend de TurboFan. Le CSA ajoute une API pour générer directement l'IR machine de bas niveau TurboFan, sans avoir à écrire ou analyser du JavaScript ou à appliquer les optimisations spécifiques au JavaScript de TurboFan. Bien que cette voie rapide de génération de code ne puisse être utilisée que par les développeurs de V8 pour accélérer le moteur V8 en interne, cette méthode efficace de génération de code assemblé optimisé de manière multiplateforme bénéficie directement au code JavaScript de tous les développeurs via les fonctions intégrées construites avec le CSA, y compris les gestionnaires de bytecode critiques pour les performances de l'interpréteur de V8, [Ignition](/docs/ignition).

![Les pipelines de compilation CSA et JavaScript](/_img/csa/csa.svg)

L'interface CSA inclut des opérations qui sont très bas-niveau et familières à quiconque a déjà écrit du code assembleur. Par exemple, elle inclut des fonctionnalités comme « chargez ce pointeur d'objet à partir d'une adresse donnée » et « multipliez ces deux nombres 32 bits ». Le CSA a une vérification de type au niveau IR pour détecter de nombreux bugs avant la compilation plutôt qu'au moment de l'exécution. Par exemple, il peut garantir qu'un développeur V8 ne utilise pas accidentellement un pointeur d'objet chargé depuis la mémoire comme entrée pour une multiplication 32 bits. Ce genre de vérification de type est simplement impossible avec des fonctions intégrées en assembleur écrit à la main.

## Un essai pratique du CSA

Pour mieux comprendre ce que le CSA offre, passons par un exemple rapide. Nous ajouterons une nouvelle fonction intégrée interne à V8 qui retourne la longueur de la chaîne d'un objet s'il s'agit d'une chaîne. Si l'objet d'entrée n'est pas une chaîne, la fonction intégrée retournera `undefined`.

Tout d'abord, nous ajoutons une ligne au macro `BUILTIN_LIST_BASE` dans le fichier [`builtin-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h) de V8 qui déclare la nouvelle fonction intégrée appelée `GetStringLength` et spécifie qu'elle a un seul paramètre d'entrée identifié par la constante `kInputObject` :

```cpp
TFS(GetStringLength, kInputObject)
```

Le macro `TFS` déclare la fonction intégrée comme une fonction intégrée TurboFan utilisant une liaison standard CodeStub, ce qui signifie simplement qu'elle utilise le CSA pour générer son code et s'attend à ce que les paramètres soient passés via des registres.

Nous pouvons ensuite définir le contenu de la fonction intégrée dans [`builtins-string-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-string-gen.cc) :

```cpp
TF_BUILTIN(GetStringLength, CodeStubAssembler) {
  Label not_string(this);

  // Récupérer l'objet entrant en utilisant la constante que nous avons définie
  // pour le premier paramètre.
  Node* const maybe_string = Parameter(Descriptor::kInputObject);

  // Vérifiez si l'entrée est un Smi (une représentation spéciale
  // de petits nombres). Cela doit être fait avant la vérification IsString
  // ci-dessous, car IsString suppose que son argument est un
  // pointeur d'objet et non un Smi. Si l'argument est effectivement un
  // Smi, sautez à l'étiquette |not_string|.
  GotoIf(TaggedIsSmi(maybe_string), &not_string);

  // Vérifiez si l'objet d'entrée est une chaîne. Sinon, sautez à
  // l'étiquette |not_string|.
  GotoIfNot(IsString(maybe_string), &not_string);

  // Chargez la longueur de la chaîne (ayant abouti dans ce chemin de code
  // car nous avons vérifié qu'il s'agissait bien d'une chaîne ci-dessus) et retournez-la
  // en utilisant une "macro" CSA LoadStringLength.
  Return(LoadStringLength(maybe_string));

  // Définissez l'emplacement de l'étiquette cible de la vérification IsString échouée ci-dessus.
  BIND(&not_string);

  // L'objet d'entrée n'est pas une chaîne. Retournez la constante JavaScript undefined.
  Return(UndefinedConstant());
}
```

Remarquez que dans l'exemple ci-dessus, deux types d'instructions sont utilisés. Il y a des instructions primitives CSA qui se traduisent directement par une ou deux instructions d'assemblage comme `GotoIf` et `Return`. Il existe un ensemble fixe d'instructions primitives CSA prédéfinies correspondant approximativement aux instructions d'assemblage les plus couramment utilisées que l'on trouverait sur l'une des architectures de puces prises en charge par V8. D'autres instructions dans l'exemple sont des instructions _macro_, comme `LoadStringLength`, `TaggedIsSmi`, et `IsString`, qui sont des fonctions pratiques pour générer une ou plusieurs instructions primitives ou macro en ligne. Les instructions macro sont utilisées pour encapsuler des idiomes de mise en œuvre V8 couramment utilisés pour une réutilisation facile. Elles peuvent être arbitrairement longues et de nouvelles instructions macro peuvent être facilement définies par les développeurs de V8 chaque fois que nécessaire.

Après avoir compilé V8 avec les modifications ci-dessus, nous pouvons exécuter `mksnapshot`, l'outil qui compile les builtins pour les préparer à l'instantané de V8, avec l'option de ligne de commande `--print-code`. Cette option affiche le code d'assemblage généré pour chaque builtin. Si nous effectuons une recherche avec `grep` pour `GetStringLength` dans la sortie, nous obtenons le résultat suivant sur x64 (le code de sortie est légèrement nettoyé pour le rendre plus lisible) :

```asm
  test al,0x1
  jz not_string
  movq rbx,[rax-0x1]
  cmpb [rbx+0xb],0x80
  jnc not_string
  movq rax,[rax+0xf]
  retl
not_string:
  movq rax,[r13-0x60]
  retl
```

Sur les plateformes ARM 32 bits, le code suivant est généré par `mksnapshot` :

```asm
  tst r0, #1
  beq +28 -> not_string
  ldr r1, [r0, #-1]
  ldrb r1, [r1, #+7]
  cmp r1, #128
  bge +12 -> not_string
  ldr r0, [r0, #+7]
  bx lr
not_string:
  ldr r0, [r10, #+16]
  bx lr
```

Bien que notre nouveau builtin utilise une convention d'appel non standard (du moins pas standard en C++), il est possible d'écrire des cas de test pour celui-ci. Le code suivant peut être ajouté à [`test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) pour tester le builtin sur toutes les plateformes :

```cpp
TEST(GetStringLength) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  // Tester le cas où l'entrée est une chaîne
  StubTester tester(isolate, zone, Builtins::kGetStringLength);
  Handle<String> input_string(
      isolate->factory()->
        NewStringFromAsciiChecked("Oktoberfest"));
  Handle<Object> result1 = tester.Call(input_string);
  CHECK_EQ(11, Handle<Smi>::cast(result1)->value());

  // Tester le cas où l'entrée n'est pas une chaîne (par exemple undefined)
  Handle<Object> result2 =
      tester.Call(factory->undefined_value());
  CHECK(result2->IsUndefined(isolate));
}
```

Pour plus de détails sur l'utilisation du CSA pour différents types de builtins et pour d'autres exemples, voir [cette page wiki](/docs/csa-builtins).

## Un multiplicateur de vitesse pour les développeurs V8

Le CSA est bien plus qu'un simple langage d'assemblage universel ciblant plusieurs plateformes. Il permet des cycles de développement beaucoup plus rapides lors de l'implémentation de nouvelles fonctionnalités comparé à l'écriture manuelle du code pour chaque architecture comme nous le faisions auparavant. Il le fait en offrant tous les avantages de l'assemblage écrit à la main tout en protégeant les développeurs contre ses pièges les plus perfides :

- Avec le CSA, les développeurs peuvent écrire du code builtin avec un ensemble multiplateforme de primitives de bas niveau qui se traduisent directement en instructions d'assemblage. Le sélecteur d'instructions du CSA garantit que ce code est optimal sur toutes les plateformes ciblées par V8 sans exiger que les développeurs de V8 soient experts dans les langages d'assemblage de chaque plateforme.
- L'interface du CSA propose des types optionnels pour garantir que les valeurs manipulées par le code d'assemblage généré au bas niveau sont du type attendu par l'auteur du code.
- L'allocation des registres entre les instructions d'assemblage est effectuée automatiquement par le CSA plutôt que manuellement, y compris la construction des frames de pile et le stockage des valeurs sur la pile si un builtin utilise plus de registres que disponibles ou effectue des appels. Cela élimine une catégorie entière de bugs subtils et difficiles à trouver qui affectaient les builtins écrits manuellement en assembleur. En rendant le code généré moins fragile, le CSA réduit considérablement le temps nécessaire pour écrire des builtins corrects de bas niveau.
- Le CSA comprend les conventions d'appel ABI—standard C++ et celles basées sur les registres internes de V8—rendant possible l'interopérabilité facile entre le code généré par le CSA et d'autres parties de V8.
- Comme le code CSA est écrit en C++, il est simple d'encapsuler des modèles de génération de code communs dans des macros qui peuvent être facilement réutilisées dans de nombreux builtins.
- Puisque V8 utilise le CSA pour générer les gestionnaires de bytecode pour Ignition, il est très facile d'intégrer directement les fonctionnalités des builtins basés sur le CSA dans les gestionnaires pour améliorer les performances de l'interpréteur.
- Le cadre de test de V8 permet de tester les fonctionnalités du CSA et les builtins générés par le CSA à partir de C++ sans avoir à écrire des adaptateurs d'assemblage.

En somme, le CSA a révolutionné le développement de V8. Il a considérablement amélioré la capacité de l'équipe à optimiser V8. Cela signifie que nous sommes capables d'optimiser une plus grande partie du langage JavaScript plus rapidement pour les intégrateurs de V8.
