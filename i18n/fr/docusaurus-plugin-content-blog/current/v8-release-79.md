---
titre: 'Sortie de V8 v7.9'
auteur: 'Santiago Aboy Solanes, extraordinaire compresseur de pointeurs'
avatars:
  - 'santiago-aboy-solanes'
date: 2019-11-20
tags:
  - sortie
description: 'V8 v7.9 supprime la dépréciation pour les transitions Double ⇒ Tagged, gère les getters API dans les fonctions intrinsics, met en cache OSR et prend en charge Wasm pour plusieurs espaces de code.'
tweet: '1197187184304050176'
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du master Git de V8 juste avant une étape de Chrome Beta. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 7.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.9), qui est en version bêta avant sa sortie en coordination avec Chrome 79 Stable dans plusieurs semaines. V8 v7.9 regorge de toutes sortes de fonctionnalités destinées aux développeurs. Ce post fournit un aperçu de certains faits saillants en vue de la sortie.

<!--truncate-->
## Performances (taille et vitesse)

### Suppression de la dépréciation pour les transitions Double ⇒ Tagged

Vous vous souvenez peut-être des publications précédentes de ce blog que V8 suit la manière dont les champs sont représentés dans les structures des objets. Lorsque la représentation d'un champ change, la structure actuelle de l'objet doit être « dépréciée » et une nouvelle structure est créée avec la nouvelle représentation du champ.

Une exception survient lorsque les anciennes valeurs de champ sont garanties comme compatibles avec la nouvelle représentation. Dans ces cas, nous pouvons simplement remplacer la nouvelle représentation sur place dans la structure de l'objet, et cela fonctionnera toujours pour les anciennes valeurs des champs. Dans V8 v7.6, nous avons activé ces changements de représentation sur place pour les transitions Smi ⇒ Tagged et HeapObject ⇒ Tagged, mais nous ne pouvions pas éviter Double ⇒ Tagged en raison de notre optimisation MutableHeapNumber.

Dans V8 v7.9, nous avons éliminé MutableHeapNumber et utilisons à la place HeapNumbers qui sont implicitement mutables lorsqu'ils appartiennent à un champ de représentation Double. Cela signifie que nous devons être un peu plus prudents en manipulant les HeapNumbers (qui sont désormais mutables s'ils sont sur un champ double et immuables sinon), mais les HeapNumbers sont compatibles avec la représentation Tagged, et nous pouvons donc éviter la dépréciation également dans le cas Double ⇒ Tagged.

Ce changement relativement simple a amélioré le score de Speedometer AngularJS de 4 %.

![Améliorations du score Speedometer AngularJS](/_img/v8-release-79/speedometer-angularjs.svg)

### Gérer les getters API dans les fonctions intrinsics

Auparavant, V8 passait toujours par le runtime C++ lorsqu'il gérait des getters définis par l'API d'intégration (comme Blink). Cela incluait des getters définis dans la spécification HTML tels que `Node.nodeType`, `Node.nodeName`, etc.

V8 effectuait tout le parcours du prototype dans la fonction intrinsic pour charger le getter, puis l'abandonnait sur le runtime une fois qu'il réalisait que le getter était défini par l'API. Dans le runtime C++, il parcourait la chaîne des prototypes pour obtenir à nouveau le getter avant de l'exécuter, ce qui dupliquait beaucoup de travail.

En général, [le mécanisme de mise en cache en ligne (IC)](https://mathiasbynens.be/notes/shapes-ics) peut aider à atténuer cela, car V8 installerait un gestionnaire IC après la première absence sur le runtime C++. Mais avec la nouvelle [allocation de feedback paresseuse](https://v8.dev/blog/v8-release-77#lazy-feedback-allocation), V8 n'installe pas de gestionnaires IC tant que la fonction n'a pas été exécutée pendant un certain temps.

Désormais dans V8 v7.9, ces getters sont gérés dans les fonctions intrinsics sans avoir besoin de passer par le runtime C++, même lorsqu'ils n'ont pas de gestionnaires IC installés, en tirant parti des stubs API spéciaux qui peuvent appeler directement le getter API. Cela se traduit par une diminution de 12 % du temps consacré au runtime IC dans le benchmark Backbone et jQuery de Speedometer.

![Améliorations de Speedometer Backbone et jQuery](/_img/v8-release-79/speedometer.svg)

### Mise en cache OSR

Lorsque V8 identifie que certaines fonctions sont chaudes, il les marque pour optimisation lors du prochain appel. Lorsque la fonction s'exécute à nouveau, V8 compile la fonction à l'aide du compilateur optimisant et commence à utiliser le code optimisé à partir de l'appel suivant. Cependant, pour les fonctions avec des boucles longues, cela n'est pas suffisant. V8 utilise une technique appelée remplacement de pile (OSR) pour installer du code optimisé pour la fonction en cours d'exécution. Cela nous permet de commencer à utiliser le code optimisé pendant la première exécution de la fonction, lorsqu'elle est bloquée dans une boucle chaude.

Si la fonction est exécutée une deuxième fois, il est très probable qu'elle soit à nouveau OSRée. Avant V8 v7.9, nous devions ré-optimiser à nouveau la fonction pour réaliser un OSR. Cependant, à partir de v7.9, nous avons ajouté la mise en cache OSR pour conserver le code optimisé pour les remplacements OSR, basé sur la tête de boucle qui a été utilisée comme point d'entrée dans la fonction OSRée. Cela a amélioré les performances de certains benchmarks de performances maximales de 5 à 18 %.

![Améliorations de la mise en cache OSR](/_img/v8-release-79/osr-caching.svg)

## WebAssembly

### Prise en charge de plusieurs espaces de code

Jusqu'à présent, chaque module WebAssembly consistait en un seul espace de code sur des architectures 64 bits, qui était réservé lors de la création du module. Cela nous permettait d'utiliser des appels proches à l'intérieur d'un module, mais nous étions limités à 128 Mo d'espace de code sur arm64 et devions réserver 1 Go à l'avance sur x64.

Dans la version 7.9, V8 a introduit la prise en charge de plusieurs espaces de code sur des architectures 64 bits. Cela nous permet de ne réserver que l'espace de code estimé nécessaire et d'ajouter d'autres espaces de code ultérieurement, si besoin. Un saut lointain est utilisé pour les appels entre des espaces de code trop éloignés pour des sauts proches. Au lieu de ~1000 modules WebAssembly par processus, V8 prend désormais en charge plusieurs millions, uniquement limités par la quantité réelle de mémoire disponible.

## API V8

Veuillez utiliser `git log branch-heads/7.8..branch-heads/7.9 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs ayant un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.9 -t branch-heads/7.9` pour expérimenter les nouvelles fonctionnalités de V8 v7.9. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
