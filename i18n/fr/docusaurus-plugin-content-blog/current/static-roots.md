---
title: 'Racines Statiques : Objets avec des Adresses Constantes à la Compilation'
author: 'Olivier Flückiger'
avatars:
  - olivier-flueckiger
date: 2024-02-05
tags:
  - JavaScript
description: "Les Racines Statiques rendent les adresses de certains objets JS constantes à la compilation."
tweet: ''
---

Vous êtes-vous déjà demandé d’où viennent `undefined`, `true` et les autres objets fondamentaux de JavaScript ? Ces objets sont les atomes de tout objet défini par l'utilisateur et doivent exister en premier. V8 les appelle racines immuables immobiles et ils résident dans leur propre tas – le tas en lecture seule. Étant constamment utilisés, un accès rapide est crucial. Et quoi de plus rapide que de deviner correctement leur adresse mémoire au moment de la compilation ?

<!--truncate-->
Prenons un exemple : la fonction API extrêmement courante `IsUndefined` [fonction API](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-value.h?q=symbol:%5Cbv8::Value::IsUndefined%5Cb%20case:yes). Au lieu de devoir rechercher l'adresse de l'objet `undefined` pour référence, que se passerait-il si nous pouvions simplement vérifier si un pointeur d'objet se termine par, disons, `0x61` pour savoir s'il est `undefined`. C'est précisément ce que la fonctionnalité *racines statiques* de V8 permet d'accomplir. Cet article explore les défis que nous avons dû relever pour y parvenir. La fonctionnalité est arrivée avec Chrome 111 et a apporté des avantages de performance à toute la VM, en accélérant particulièrement le code C++ et les fonctions intégrées.

## Amorçage du Tas en Lecture Seule

La création des objets en lecture seule prend du temps, V8 les crée donc au moment de la compilation. Pour compiler V8, d'abord un binaire proto-V8 minimal appelé `mksnapshot` est compilé. Celui-ci crée tous les objets partagés en lecture seule ainsi que le code natif des fonctions intégrées et les écrit dans un instantané. Ensuite, le binaire V8 proprement dit est compilé et associé à l'instantané. Pour démarrer V8, l'instantané est chargé en mémoire et nous pouvons commencer immédiatement à utiliser son contenu. Le diagramme suivant montre le processus de compilation simplifié pour le binaire autonome `d8`.

![](/_img/static-roots/static-roots1.svg)

Une fois que `d8` est opérationnel, tous les objets en lecture seule ont leur emplacement fixe en mémoire et ne bougent jamais. Lorsque nous compilons du code JIT, nous pouvons, par exemple, référencer directement `undefined` par son adresse. Cependant, lors de la construction de l'instantané et lors de la compilation du C++ pour libv8, l'adresse n'est pas encore connue. Elle dépend de deux choses inconnues au moment de la compilation : la disposition binaire du tas en lecture seule et l'endroit où ce tas est situé dans l'espace mémoire.

## Comment Prédire les Adresses ?

V8 utilise [compression des pointeurs](https://v8.dev/blog/pointer-compression). Au lieu d'adresses complètes de 64 bits, nous faisons référence aux objets par un décalage de 32 bits dans une région de mémoire de 4 Go. Pour de nombreuses opérations telles que les chargements de propriétés ou les comparaisons, le décalage de 32 bits dans cette cage est suffisant pour identifier un objet de manière unique. Par conséquent, notre deuxième problème — ne pas savoir où dans l'espace mémoire le tas en lecture seule est placé — n'est en réalité pas un problème. Nous plaçons simplement le tas en lecture seule au début de chaque cage de compression de pointeurs, lui donnant ainsi un emplacement connu. Par exemple, parmi tous les objets dans le tas de V8, `undefined` a toujours la plus petite adresse compressée, démarrant à 0x61 octets. C'est ainsi que nous savons que si les 32 bits inférieurs de l'adresse complète de tout objet JS sont 0x61, alors il doit être `undefined`.

Cela est déjà utile, mais nous voulons également utiliser cette adresse dans l'instantané et dans libv8 – un problème apparemment circulaire. Cependant, si nous nous assurons que `mksnapshot` crée de manière déterministe un tas en lecture seule identique au bit près, alors nous pouvons réutiliser ces adresses entre les constructions. Pour les utiliser dans libv8 lui-même, nous construisons essentiellement V8 deux fois :

![](/_img/static-roots/static-roots2.svg)

La première fois que nous appelons `mksnapshot`, le seul artefact produit est un fichier qui contient les [adresses](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/roots/static-roots.h) relatives à la base de la cage de chaque objet dans le tas en lecture seule. Lors de la deuxième étape de la construction, nous compilons libv8 à nouveau et un indicateur garantit que chaque fois que nous faisons référence à `undefined`, nous utilisons littéralement `cage_base + StaticRoot::kUndefined`; le décalage statique de `undefined` étant évidemment défini dans le fichier static-roots.h. Dans de nombreux cas, cela permettra au compilateur C++ qui crée libv8 et au compilateur des fonctions intégrées dans `mksnapshot` de produire un code beaucoup plus efficace car l'alternative serait de charger l'adresse depuis un tableau global d'objets racines à chaque fois. Nous obtenons un binaire `d8` où l'adresse compressée de `undefined` est codée en dur à 0x61.

Tout cela est vrai techniquement, mais en pratique nous ne compilons V8 qu'une seule fois – personne n'a le temps pour ça. Le fichier static-roots.h généré est mis en cache dans le dépôt source et ne doit être recréé que si nous changeons la disposition du tas en lecture seule.

## Autres Applications

En parlant de questions pratiques, les racines statiques permettent encore plus d'optimisations. Par exemple, nous avons regroupé des objets communs, ce qui nous permet de mettre en œuvre certaines opérations comme des vérifications de plages sur leurs adresses. Par exemple, toutes les cartes des chaînes (c'est-à-dire les méta-objets de [hidden-class](https://v8.dev/docs/hidden-classes) décrivant la disposition des différents types de chaînes) sont à côté les unes des autres, donc un objet est une chaîne si sa carte a une adresse compressée entre `0xdd` et `0x49d`. Ou encore, les objets évalués comme vrais doivent avoir une adresse d'au moins `0xc1`.

Tout ne concerne pas uniquement les performances du code JITé dans V8. Comme l'a montré ce projet, un changement relativement mineur dans le code C++ peut également avoir un impact significatif. Par exemple, Speedometer 2, un benchmark qui exerce l'API de V8 et l'interaction entre V8 et son intégrateur, a vu son score augmenter d'environ 1% sur un processeur M1 grâce aux racines statiques.
