---
title: "Le Bac à Sable de V8"
description: "V8 propose un bac à sable léger et intégré pour limiter l'impact des bugs de corruption de mémoire"
author: "Samuel Groß"
avatars: 
  - samuel-gross
date: 2024-04-04
tags: 
 - sécurité
---

Après presque trois ans depuis le [document de conception initial](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) et [des centaines de CL](https://github.com/search?q=repo%3Av8%2Fv8+%5Bsandbox%5D&type=commits&s=committer-date&o=desc) entretemps, le bac à sable V8 — un bac à sable léger et intégré pour V8 — a atteint un point où il n'est plus considéré comme une fonctionnalité de sécurité expérimentale. Dès aujourd'hui, le [bac à sable de V8 est inclus dans le Programme de Récompenses pour les Vulnérabilités de Chrome](https://g.co/chrome/vrp/#v8-sandbox-bypass-rewards) (VRP). Bien qu'il reste un certain nombre de problèmes à résoudre avant qu'il ne devienne une limite de sécurité robuste, son inclusion dans le VRP constitue une étape importante dans cette direction. Chrome 123 pourrait donc être considéré comme une sorte de version "beta" pour le bac à sable. Cet article de blog est une opportunité de discuter des motivations derrière le bac à sable, de montrer comment il empêche la corruption de mémoire dans V8 de se propager dans le processus hôte, et finalement de démontrer pourquoi il est une étape nécessaire vers la sécurité mémoire.

<!--truncate-->

# Motivation

La sécurité de la mémoire reste un problème pertinent : toutes les exploits de Chrome [désactivés dans la nature au cours des trois dernières années](https://docs.google.com/spreadsheets/d/1lkNJ0uQwbeC1ZTRrxdtuPLCIl7mlUreoKfSIgajnSyY/edit?usp=sharing) (2021 – 2023) ont commencé par une vulnérabilité de corruption de mémoire dans un processus de rendu Chrome qui a été exploitée pour l'exécution de code à distance (RCE). Parmi celles-ci, 60 % étaient des vulnérabilités dans V8. Cependant, il y a une subtilité : les vulnérabilités de V8 ne sont rarement des bugs de corruption de mémoire "classiques" (utilisation après libération, accès hors limites, etc.), mais plutôt des problèmes logiques subtils qui peuvent à leur tour être exploités pour corrompre la mémoire. Ainsi, les solutions existantes de sécurité mémoire ne sont, pour la plupart, pas applicables à V8. En particulier, ni le [passage à un langage mémoire sécurisé](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps), tel que Rust, ni l'utilisation de caractéristiques matérielles de sécurité mémoire, actuelles ou futures, telles que le [tagage de mémoire](https://newsroom.arm.com/memory-safety-arm-memory-tagging-extension), ne peuvent aider aux défis de sécurité auxquels V8 est confronté aujourd'hui.

Pour comprendre pourquoi, considérons une vulnérabilité hypothétique et très simplifiée d'un moteur JavaScript : l'implémentation de `JSArray::fizzbuzz()`, qui remplace les valeurs dans le tableau divisibles par 3 par "fizz", divisibles par 5 par "buzz", et divisibles à la fois par 3 et 5 par "fizzbuzz". Voici une implémentation de cette fonction en C++. `JSArray::buffer_` peut être considéré comme un `JSValue*`, c'est-à-dire un pointeur vers un tableau de valeurs JavaScript, et `JSArray::length_` contient la taille actuelle de ce buffer.

```cpp
 1. for (int index = 0; index < length_; index++) {
 2.     JSValue js_value = buffer_[index];
 3.     int value = ToNumber(js_value).int_value();
 4.     if (value % 15 == 0)
 5.         buffer_[index] = JSString("fizzbuzz");
 6.     else if (value % 5 == 0)
 7.         buffer_[index] = JSString("buzz");
 8.     else if (value % 3 == 0)
 9.         buffer_[index] = JSString("fizz");
10. }
```

Semble suffisamment simple ? Cependant, il y a un bug quelque peu subtil ici : la conversion `ToNumber` à la ligne 3 peut avoir des effets secondaires car elle peut invoquer des callbacks JavaScript définies par l'utilisateur. Un tel callback pourrait alors réduire le tableau, causant ainsi une écriture hors limites par la suite. Le code JavaScript suivant provoquerait probablement une corruption de mémoire :

```js
let array = new Array(100);
let evil = { [Symbol.toPrimitive]() { array.length = 1; return 15; } };
array.push(evil);
// À l'indice 100, le callback @@toPrimitive de |evil| est invoqué dans
// la ligne 3 ci-dessus, réduisant le tableau à une longueur de 1 et réallouant son
// buffer adjacent. L'écriture suivante (ligne 5) est hors limites.
array.fizzbuzz();
```

Notez que cette vulnérabilité pourrait survenir à la fois dans le code runtime écrit manuellement (comme dans l'exemple ci-dessus) ou dans le code machine généré à la volée par un compilateur JIT optimisant (si la fonction était implémentée en JavaScript à la place). Dans le premier cas, le programmeur conclurait qu'une vérification explicite des limites pour les opérations de stockage n'est pas nécessaire puisque cet indice vient juste d'être accédé. Dans le dernier cas, ce serait le compilateur qui tirerait la même conclusion incorrecte lors de l'une de ses passes d'optimisation (par exemple [élimination de la redondance](https://en.wikipedia.org/wiki/Partial-redundancy_elimination) ou [élimination des vérifications de limites)](https://en.wikipedia.org/wiki/Bounds-checking_elimination) parce qu'il ne modélise pas correctement les effets secondaires de `ToNumber()`.

Bien qu'il s'agisse d'un bug artificiellement simple (ce modèle spécifique de bug est devenu presque inexistant aujourd'hui grâce à des améliorations dans les outils de fuzzing, une sensibilisation accrue des développeurs et une attention soutenue des chercheurs), il est néanmoins utile de comprendre pourquoi les vulnérabilités dans les moteurs JavaScript modernes sont difficiles à atténuer de manière générique. Considérez l'approche consistant à utiliser un langage sûr pour la mémoire tel que Rust, où il revient au compilateur de garantir la sécurité de la mémoire. Dans l'exemple ci-dessus, un langage sûr pour la mémoire empêcherait probablement ce bug dans le code de runtime écrit à la main utilisé par l'interpréteur. Toutefois, il *n'empêcherait pas* le bug dans tout compilateur à exécution juste-à-temps (JIT), car le bug serait alors une problématique de logique et non une vulnérabilité classique de corruption de mémoire. Seul le code généré par le compilateur provoquerait réellement une corruption de mémoire. Fondamentalement, le problème est que *la sécurité de la mémoire ne peut pas être garantie par le compilateur si le compilateur fait directement partie de la surface d'attaque*.

De même, désactiver les compilateurs JIT ne serait également qu'une solution partielle : historiquement, environ la moitié des bugs découverts et exploités dans V8 concernaient l'un de ses compilateurs tandis que le reste affectait d'autres composants tels que les fonctions de runtime, l'interpréteur, le ramasse-miettes ou l'analyseur syntaxique. Utiliser un langage sûr pour la mémoire pour ces composants et supprimer les compilateurs JIT pourrait fonctionner, mais réduirait considérablement les performances du moteur (allant, selon le type de charge de travail, de 1,5 à 10× ou plus pour les tâches intensives en calcul).

Considérons maintenant à la place les mécanismes de sécurité matériel populaires, notamment [le marquage mémoire](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-1.html). Il y a plusieurs raisons pour lesquelles le marquage mémoire ne serait pas une solution efficace. Par exemple, les canaux latéraux CPU, qui peuvent [être facilement exploités depuis JavaScript](https://security.googleblog.com/2021/03/a-spectre-proof-of-concept-for-spectre.html), pourraient être utilisés pour divulguer les valeurs des tags, permettant ainsi à un attaquant de contourner l'atténuation. De plus, en raison de la [compression des pointeurs](https://v8.dev/blog/pointer-compression), il n'y a actuellement pas de place pour les bits de tag dans les pointeurs de V8. Ainsi, toute la région de tas devrait être marquée avec le même tag, rendant impossible la détection de la corruption inter-objet. Par conséquent, bien que le marquage mémoire [puisse être très efficace sur certaines surfaces d'attaque](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-2-mitigation.html), il est peu probable qu'il représente un obstacle sérieux pour les attaquants dans le cas des moteurs JavaScript.

En résumé, les moteurs JavaScript modernes ont tendance à contenir des bugs complexes de logique de 2ème ordre qui fournissent des primitives d'exploitation puissantes. Ceux-ci ne peuvent pas être efficacement protégés par les mêmes techniques utilisées pour les vulnérabilités classiques de corruption de mémoire. Cependant, presque toutes les vulnérabilités trouvées et exploitées aujourd'hui dans V8 ont un point commun : la corruption de mémoire finale se produit nécessairement à l'intérieur du tas de V8 parce que le compilateur et le runtime fonctionnent exclusivement (ou presque) sur les instances de `HeapObject` de V8. C'est là qu'intervient le sandbox.


# Le sandbox du tas de V8

L'idée de base derrière le sandbox est d'isoler la mémoire (le tas) de V8 de sorte que toute corruption de mémoire ne puisse pas "se propager" à d'autres parties de la mémoire du processus.

Comme exemple motivant pour le design du sandbox, considérez la [séparation de l'espace utilisateur et de l'espace noyau](https://fr.wikipedia.org/wiki/Espace_utilisateur_et_espace_noyau) dans les systèmes d'exploitation modernes. Historiquement, toutes les applications et le noyau du système d'exploitation partageaient le même espace d'adressage mémoire (physique). Par conséquent, toute erreur de mémoire dans une application utilisateur pouvait mettre à terre tout le système, par exemple en corrompant la mémoire du noyau. En revanche, dans un système d'exploitation moderne, chaque application en espace utilisateur dispose de son propre espace d'adressage mémoire dédié (virtuel). Ainsi, toute erreur de mémoire est limitée à l'application elle-même, et le reste du système est protégé. En d'autres termes, une application défectueuse peut se planter elle-même mais pas affecter le reste du système. De manière similaire, le sandbox de V8 vise à isoler le code non fiable JavaScript/WebAssembly exécuté par V8, de sorte qu'un bug dans V8 n'affecte pas le reste du processus hôte.

En principe, [le sandbox pourrait être implémenté avec un support matériel](https://docs.google.com/document/d/12MsaG6BYRB-jQWNkZiuM3bY8X2B2cAsCMLLdgErvK4c/edit?usp=sharing) : similaire à la séparation utilisateur-noyau, V8 exécuterait une instruction de changement de mode lorsqu'il entre ou sort du code sandboxé, ce qui empêcherait le CPU d'accéder à la mémoire située en dehors du sandbox. En pratique, aucune fonctionnalité matérielle appropriée n'est disponible aujourd'hui, et le sandbox actuel est donc entièrement implémenté en logiciel.

L'idée de base derrière le [sandbox basé sur logiciel](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) est de remplacer tous les types de données pouvant accéder à la mémoire hors sandbox par des alternatives "compatibles sandbox". En particulier, tous les pointeurs (qu'ils pointent vers des objets dans le tas de V8 ou ailleurs dans la mémoire) et les tailles 64 bits doivent être supprimés, car un attaquant pourrait les corrompre pour accéder à d'autres parties de la mémoire du processus. Cela implique que des régions de mémoire telles que la pile ne peuvent pas être à l'intérieur du sandbox car elles doivent contenir des pointeurs (par exemple des adresses de retour) en raison de contraintes liées au matériel et au système d’exploitation. Ainsi, avec le sandbox basé sur logiciel, seul le tas de V8 est à l'intérieur du sandbox, et la construction globale est donc similaire au [modèle de sandbox utilisé par WebAssembly](https://webassembly.org/docs/security/).

Pour comprendre comment cela fonctionne en pratique, il est utile d'examiner les étapes qu'un exploit doit effectuer après avoir corrompu la mémoire. L'objectif d'un exploit RCE serait généralement de réaliser une attaque d'élévation de privilèges, par exemple en exécutant un shellcode ou en effectuant une attaque de type programmation orientée retour (ROP). Pour ces deux cas, l'exploit voudra d'abord pouvoir lire et écrire une mémoire arbitraire dans le processus, par exemple pour corrompre un pointeur de fonction ou placer une charge utile ROP quelque part dans la mémoire et s'y enrouler. Étant donné un bug qui corrompt la mémoire sur le tas V8, un attaquant rechercherait donc un objet tel que le suivant :

```cpp
class JSArrayBuffer: public JSObject {
  private:
    byte* buffer_;
    size_t size_;
};
```

Étant donné cela, l'attaquant corromprait alors soit le pointeur de tampon soit la valeur de taille pour construire une primitive de lecture/écriture arbitraire. C'est l'étape que le bac à sable vise à empêcher. En particulier, avec le bac à sable activé, et en supposant que le tampon référencé est situé à l'intérieur du bac à sable, l'objet ci-dessus deviendrait désormais :

```cpp
class JSArrayBuffer: public JSObject {
  private:
    sandbox_ptr_t buffer_;
    sandbox_size_t size_;
};
```

Où `sandbox_ptr_t` est un offset de 40 bits (dans le cas d'un bac à sable de 1 To) à partir de la base du bac à sable. De même, `sandbox_size_t` est une taille "compatible avec le bac à sable", [actuellement limitée à 32 Go](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-internal.h;l=231;drc=5bdda7d5edcac16b698026b78c0eec6d179d3573).
Dans le cas contraire, si le tampon référencé était situé hors du bac à sable, l'objet deviendrait :

```cpp
class JSArrayBuffer: public JSObject {
  private:
    external_ptr_t buffer_;
};
```

Ici, un `external_ptr_t` fait référence au tampon (et à sa taille) via une table de pointeurs en indirect (semblable à [table de descripteur de fichier d'un noyau Unix](https://en.wikipedia.org/wiki/File_descriptor) ou [WebAssembly.Table](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Table)) qui offre des garanties de sécurité de la mémoire.

Dans les deux cas, un attaquant se trouverait incapable de "dépasser" le bac à sable dans d'autres parties de l'espace d'adressage. Au lieu de cela, ils auraient besoin d'une vulnérabilité supplémentaire : une violation du bac à sable de V8. L'image suivante résume la conception de haut niveau, et le lecteur intéressé peut trouver plus de détails techniques sur le bac à sable dans les documents de conception liés depuis [`src/sandbox/README.md`](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/sandbox/README.md).

![Un diagramme général de la conception du bac à sable](/_img/sandbox/sandbox.svg)

Convertir uniquement les pointeurs et les tailles dans une représentation différente n'est pas tout à fait suffisant dans une application aussi complexe que V8 et il y a [un certain nombre d'autres problèmes](https://issues.chromium.org/hotlists/4802478) qui doivent être corrigés. Par exemple, avec l'introduction du bac à sable, un code tel que le suivant devient soudainement problématique :

```cpp
std::vector<std::string> JSObject::GetPropertyNames() {
    int num_properties = TotalNumberOfProperties();
    std::vector<std::string> properties(num_properties);

    for (int i = 0; i < NumberOfInObjectProperties(); i++) {
        properties[i] = GetNameOfInObjectProperty(i);
    }

    // Traiter les autres types de propriétés
    // ...
```

Ce code fait l'hypothèse (raisonnable) que le nombre de propriétés stockées directement dans un JSObject doit être inférieur au nombre total de propriétés de cet objet. Toutefois, en supposant que ces chiffres sont simplement stockés en tant qu'entiers quelque part dans le JSObject, un attaquant pourrait en corrompre un pour briser cet invariant. Par conséquent, l'accès dans le `std::vector` (hors du bac à sable) dépasserait les limites. Ajouter une vérification explicite des limites, par exemple avec un [`SBXCHECK`](https://chromium.googlesource.com/v8/v8.git/+/0deeaf5f593b98d6a6a2bb64e3f71d39314c727c), corrigerait cela.

De manière encourageante, presque toutes les "violations du bac à sable" découvertes jusqu'à présent sont comme celle-ci : des bugs de corruption de mémoire triviales (de premier ordre) tels que des utilisations après libération ou des accès hors limites dus à l'absence de vérification des limites. Contrairement aux vulnérabilités de second ordre généralement trouvées dans V8, ces bugs de bac à sable pourraient en fait être prévenus ou atténués par les approches discutées précédemment. En fait, le bug particulier ci-dessus serait déjà atténué aujourd'hui grâce au [renforcement de libc++ de Chrome](http://issues.chromium.org/issues/40228527). En tant que tel, on espère qu'à long terme, le bac à sable devienne une **barrière de sécurité plus défendable** que V8 lui-même. Bien que le jeu de données actuellement disponible des bugs de bac à sable soit très limité, l'intégration VRP lancée aujourd'hui devrait espérer produire une image plus claire du type de vulnérabilités rencontrées sur la surface d'attaque du bac à sable.

## Performance

L'un des principaux avantages de cette approche est qu'elle est fondamentalement économique : la surcharge causée par le bac à sable provient principalement de l'indirection de la table de pointeurs pour les objets externes (coûtant environ un chargement mémoire supplémentaire) et dans une moindre mesure de l'utilisation de décalages au lieu de pointeurs bruts (coûtant principalement une opération de décalage+ajout, qui est très peu coûteuse). La surcharge actuelle du bac à sable est donc seulement d'environ 1 % ou moins sur des charges de travail typiques (mesurée à l'aide des suites de benchmarks [Speedometer](https://browserbench.org/Speedometer3.0/) et [JetStream](https://browserbench.org/JetStream/)). Cela permet au bac à sable V8 d'être activé par défaut sur les plateformes compatibles.

## Tests

Une fonctionnalité souhaitable pour toute frontière de sécurité est la testabilité : la capacité de tester manuellement et automatiquement que les garanties de sécurité promises sont réellement respectées dans la pratique. Cela nécessite un modèle d'attaquant clair, un moyen de "simuler" un attaquant, et idéalement un moyen de déterminer automatiquement quand la frontière de sécurité a échoué. Le V8 Sandbox répond à toutes ces exigences :

1. **Un modèle d'attaquant clair :** il est supposé qu'un attaquant peut lire et écrire arbitrairement à l'intérieur du V8 Sandbox. L'objectif est de prévenir la corruption de mémoire en dehors du sandbox.
2. **Un moyen de simuler un attaquant :** V8 fournit une "API de corruption de mémoire" lorsque construit avec le drapeau `v8_enable_memory_corruption_api = true`. Cela simule les primitives obtenues à partir des vulnérabilités typiques de V8 et en particulier offre un accès complet en lecture et écriture à l'intérieur du sandbox.
3. **Un moyen de détecter les "violations du sandbox" :** V8 propose un mode de "test du sandbox" (activé via `--sandbox-testing` ou `--sandbox-fuzzing`) qui installe un [gestionnaire de signal](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/sandbox/testing.cc;l=425;drc=97b7d0066254778f766214d247b65d01f8a81ebb) qui détermine si un signal tel que `SIGSEGV` représente une violation des garanties de sécurité du sandbox.

En fin de compte, cela permet au sandbox d'être intégré dans le programme VRP de Chrome et d'être soumis à des tests approfondis par des fuzzers spécialisés.

## Utilisation

Le V8 Sandbox doit être activé/désactivé lors de la compilation à l'aide du drapeau de construction `v8_enable_sandbox`. Il n'est (pour des raisons techniques) pas possible d'activer/désactiver le sandbox à l'exécution. Le V8 Sandbox nécessite un système 64 bits car il doit réserver une grande quantité d'espace d'adressage virtuel, actuellement un térabyte.

Le V8 Sandbox a déjà été activé par défaut sur les versions 64 bits (plus précisément x64 et arm64) de Chrome sur Android, ChromeOS, Linux, macOS, et Windows depuis environ deux ans. Bien que le sandbox n'était pas (et ne soit toujours pas) complètement fonctionnel, cela a été principalement fait pour s'assurer qu'il ne cause pas de problèmes de stabilité et pour collecter des statistiques de performance en conditions réelles. Par conséquent, les exploits récents de V8 devaient déjà contourner le sandbox, fournissant des retours précoces utiles sur ses propriétés de sécurité.


# Conclusion

Le V8 Sandbox est un nouveau mécanisme de sécurité conçu pour empêcher que la corruption de mémoire dans V8 n'affecte d'autres mémoires dans le processus. Le sandbox est motivé par le fait que les technologies actuelles de sécurité de la mémoire sont largement inapplicables aux moteurs JavaScript optimisés. Bien que ces technologies ne parviennent pas à empêcher la corruption de mémoire dans V8 lui-même, elles peuvent en réalité protéger la surface d'attaque du V8 Sandbox. Le sandbox est donc une étape nécessaire vers la sécurité de la mémoire.
