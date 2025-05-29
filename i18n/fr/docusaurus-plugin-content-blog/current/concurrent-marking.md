---
title: "Marquage concurrent dans V8"
author: "Ulan Degenbaev, Michael Lippautz, et Hannes Payer — libérateurs du thread principal"
avatars: 
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: "2018-06-11 13:33:37"
tags: 
  - internes
  - mémoire
description: "Cet article décrit la technique de collecte des déchets appelée marquage concurrent."
tweet: "1006187194808233985"
---
Cet article décrit la technique de collecte des déchets appelée _marquage concurrent_. Cette optimisation permet à une application JavaScript de continuer son exécution pendant que le collecteur d’ordures balaie le tas pour trouver et marquer les objets vivants. Nos benchmarks montrent que le marquage concurrent réduit le temps passé à marquer sur le thread principal de 60 % à 70 %. Le marquage concurrent est la dernière pièce du puzzle du [projet Orinoco](/blog/orinoco) — le projet qui remplace progressivement l'ancien collecteur d'ordures par le nouveau collecteur d'ordures principalement concurrent et parallèle. Le marquage concurrent est activé par défaut dans Chrome 64 et Node.js v10.

<!--truncate-->
## Contexte

Le marquage est une phase du collecteur d’ordures [Mark-Compact](https://en.wikipedia.org/wiki/Tracing_garbage_collection) de V8. Pendant cette phase, le collecteur découvre et marque tous les objets vivants. Le marquage commence à partir de l'ensemble des objets vivants connus tels que l'objet global et les fonctions actuellement actives — les racines, ainsi appelées. Le collecteur marque les racines comme vivantes et suit les pointeurs qu'elles contiennent pour découvrir d'autres objets vivants. Le collecteur continue de marquer les objets nouvellement découverts et de suivre les pointeurs jusqu'à ce qu'il n'y ait plus d'objets à marquer. À la fin du marquage, tous les objets non marqués sur le tas sont inaccessibles depuis l'application et peuvent être récupérés en toute sécurité.

Nous pouvons considérer le marquage comme un [parcours de graphe](https://en.wikipedia.org/wiki/Graph_traversal). Les objets du tas sont des nœuds du graphe. Les pointeurs d’un objet à un autre sont des arêtes du graphe. Étant donné un nœud dans le graphe, nous pouvons trouver toutes les arêtes sortantes de ce nœud à l’aide de la [classe cachée](/blog/fast-properties) de l’objet.

![Figure 1. Graphe d'objets](/_img/concurrent-marking/00.svg)

V8 implémente le marquage à l’aide de deux bits de marquage par objet et d’une liste de travail de marquage. Les deux bits de marquage codent trois couleurs : blanc (`00`), gris (`10`), et noir (`11`). Initialement, tous les objets sont blancs, ce qui signifie que le collecteur ne les a pas encore découverts. Un objet blanc devient gris lorsque le collecteur le découvre et le pousse sur la liste de travail de marquage. Un objet gris devient noir lorsque le collecteur le retire de la liste de travail de marquage et visite tous ses champs. Ce schéma est appelé marquage tri-couleur. Le marquage se termine lorsqu'il n'y a plus d'objets gris. Tous les objets restants blancs sont inaccessibles et peuvent être récupérés en toute sécurité.

![Figure 2. Le marquage commence à partir des racines](/_img/concurrent-marking/01.svg)

![Figure 3. Le collecteur transforme un objet gris en noir en traitant ses pointeurs](/_img/concurrent-marking/02.svg)

![Figure 4. État final après la fin du marquage](/_img/concurrent-marking/03.svg)

Notez que l'algorithme de marquage décrit ci-dessus fonctionne uniquement si l'application est mise en pause pendant que le marquage est en cours. Si nous permettons à l'application de fonctionner pendant le marquage, alors l'application peut modifier le graphe et, à terme, tromper le collecteur en libérant des objets vivants.

## Réduire la pause associée au marquage

Un marquage effectué d'un seul coup peut prendre plusieurs centaines de millisecondes pour de grands tas.

![](/_img/concurrent-marking/04.svg)

De telles pauses prolongées peuvent rendre les applications non réactives et conduire à une mauvaise expérience utilisateur. En 2011, V8 est passé du marquage en mode stop-the-world au marquage incrémental. Pendant le marquage incrémental, le collecteur d'ordures divise le travail de marquage en petites parties et permet à l'application de fonctionner entre ces parties :

![](/_img/concurrent-marking/05.svg)

Le collecteur d’ordures choisit la quantité de travail de marquage incrémental à réaliser dans chaque partie pour correspondre au rythme des allocations effectuées par l’application. Dans les cas communs, cela améliore considérablement la réactivité de l’application. Pour de grands tas sous pression mémoire, il peut encore y avoir de longues pauses tandis que le collecteur tente de suivre les allocations.

Le marquage incrémental n'est pas gratuit. L'application doit notifier le collecteur d'ordures de toutes les opérations qui modifient le graphe d'objets. V8 implémente cette notification à l'aide d'une barrière d'écriture de style Dijkstra. Après chaque opération d’écriture de la forme `object.field = value` en JavaScript, V8 insère le code de la barrière d’écriture :

```cpp
// Appelé après `object.field = value`.
write_barrier(object, field_offset, value) {
  if (color(object) == black && color(value) == white) {
    set_color(value, grey);
    marking_worklist.push(value);
  }
}
```

La barrière d'écriture impose l'invariant selon lequel aucun objet noir ne pointe vers un objet blanc. Cela est aussi connu sous le nom d'invariant fort tri-chromatique et garantit que l'application ne peut pas cacher un objet vivant au collecteur de déchets, de sorte que tous les objets blancs à la fin du marquage sont réellement inaccessibles pour l'application et peuvent être libérés en toute sécurité.

Le marquage incrémentiel s'intègre parfaitement à la planification de la collecte des déchets pendant les périodes d'inactivité, comme décrit dans un [article de blog précédent](/blog/free-garbage-collection). Le planificateur de tâches Blink de Chrome peut programmer de petites étapes de marquage incrémentiel pendant les périodes d'inactivité sur le thread principal sans causer de lenteurs. Cette optimisation fonctionne particulièrement bien si du temps d'inactivité est disponible.

En raison du coût de la barrière d'écriture, le marquage incrémentiel peut réduire le débit de l'application. Il est possible d'améliorer à la fois le débit et les temps de pause en utilisant des threads de travail supplémentaires. Il existe deux façons de réaliser le marquage sur les threads de travail : le marquage parallèle et le marquage concurrent.

Le marquage **parallèle** a lieu sur le thread principal et les threads de travail. L'application est mise en pause pendant toute la phase de marquage parallèle. Il s'agit de la version multi-threadée du marquage de type stop-the-world.

![](/_img/concurrent-marking/06.svg)

Le marquage **concurrent** a lieu principalement sur les threads de travail. L'application peut continuer à s'exécuter pendant que le marquage concurrent est en cours.

![](/_img/concurrent-marking/07.svg)

Les deux sections suivantes décrivent comment nous avons ajouté la prise en charge du marquage parallèle et concurrent dans V8.

## Marquage parallèle

Lors du marquage parallèle, nous pouvons supposer que l'application ne s'exécute pas de manière concurrente. Cela simplifie considérablement l'implémentation, car nous pouvons supposer que le graphe d'objets est statique et ne change pas. Pour effectuer le marquage du graphe d'objets en parallèle, nous devons rendre les structures de données du collecteur de déchets compatibles avec les threads et trouver un moyen de partager efficacement le travail de marquage entre les threads. Le diagramme suivant montre les structures de données impliquées dans le marquage parallèle. Les flèches indiquent la direction du flux de données. Pour des raisons de simplicité, le diagramme omet les structures de données nécessaires à la défragmentation de l'espace mémoire.

![Figure 5. Structures de données pour le marquage parallèle](/_img/concurrent-marking/08.svg)

Notez que les threads ne font que lire à partir du graphe d'objets et ne le modifient jamais. Les bits de marquage des objets et la liste de tâches de marquage doivent prendre en charge les accès en lecture et en écriture.

## Liste de tâches de marquage et vol de tâches

L'implémentation de la liste de tâches de marquage est essentielle pour les performances et équilibre les performances locales rapides des threads avec la quantité de travail pouvant être répartie entre d'autres threads s'ils n'ont plus de tâches à effectuer.

Les extrêmes de cet espace de compromis sont : (a) l'utilisation d'une structure de données complètement concurrente pour un partage optimal puisque tous les objets peuvent potentiellement être partagés et (b) l'utilisation d'une structure de données complètement locale à un thread où aucun objet ne peut être partagé, en optimisant pour le débit local des threads. La figure 6 montre comment V8 équilibre ces besoins en utilisant une liste de tâches de marquage basée sur des segments pour les insertions et suppressions locales aux threads. Une fois qu'un segment est plein, il est publié dans un pool global partagé où il est disponible pour le vol de tâches. De cette manière, V8 permet aux threads de marquage de fonctionner localement sans aucune synchronisation aussi longtemps que possible, tout en gérant les cas où un thread atteint un nouveau sous-graphe d'objets tandis qu'un autre thread est à court de tâches après avoir épuisé entièrement ses segments locaux.

![Figure 6. Liste de tâches de marquage](/_img/concurrent-marking/09.svg)

## Marquage concurrent

Le marquage concurrent permet à JavaScript de s'exécuter sur le thread principal tandis que les threads de travail visitent des objets dans l'espace mémoire. Cela ouvre la porte à de nombreuses courses de données potentielles. Par exemple, JavaScript peut être en train d'écrire dans un champ d'un objet au même moment où un thread de travail lit ce champ. Ces courses de données peuvent induire le collecteur de déchets en erreur pour qu'il libère un objet vivant ou qu'il confonde des valeurs primitives avec des pointeurs.

Chaque opération sur le thread principal qui modifie le graphe d'objets est une source potentielle de courses de données. Étant donné que V8 est un moteur à hautes performances avec de nombreuses optimisations de disposition d'objets, la liste des sources potentielles de courses de données est plutôt longue. Voici un aperçu à haut niveau :

- Allocation d'objets.
- Écriture dans un champ d'un objet.
- Modifications de la disposition des objets.
- Désérialisation depuis l'instantané.
- Matérialisation lors de la désoptimisation d'une fonction.
- Évacuation lors de la collecte des déchets de la jeune génération.
- Modification du code.

Le thread principal doit se synchroniser avec les threads de travail sur ces opérations. Le coût et la complexité de la synchronisation dépendent de l'opération. La plupart des opérations permettent une synchronisation légère avec des accès mémoire atomiques, mais quelques opérations nécessitent un accès exclusif à l'objet. Dans les sous-sections suivantes, nous mettons en lumière certains cas intéressants.

### Barrière d'écriture

La course de données causée par une écriture dans un champ d'un objet est résolue en transformant l'opération d'écriture en une [écriture atomique relâchée](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering) et en ajustant la barrière d'écriture :

```cpp
// Appelé après atomic_relaxed_write(&object.field, value);
write_barrier(object, field_offset, value) {
  si (couleur(valeur) == blanc et transition_couleur_atomique(valeur, blanc, gris)) {
    marking_worklist.push(valeur);
  }
}
```

Comparez-le avec la barrière d'écriture utilisée précédemment :

```cpp
// Appelé après `objet.champ = valeur`.
barrière_d'écriture(objet, offset_champ, valeur) {
  si (couleur(objet) == noir et couleur(valeur) == blanc) {
    set_couleur(valeur, gris);
    marking_worklist.push(valeur);
  }
}
```

Il y a deux changements :

1. La vérification de la couleur de l'objet source (`couleur(objet) == noir`) a disparu.
2. La transition de couleur de la `valeur` de blanc à gris se fait de manière atomique.

Sans la vérification de la couleur de l'objet source, la barrière d'écriture devient plus conservatrice, c'est-à-dire qu'elle peut marquer des objets comme vivants même si ces objets ne sont pas réellement accessibles. Nous avons supprimé la vérification pour éviter une barrière mémoire coûteuse qui serait nécessaire entre l'opération d'écriture et la barrière d'écriture :

```cpp
écriture_relaxée_atomique(&objet.champ, valeur);
barrière_mémoire();
barrière_d'écriture(objet, offset_champ, valeur);
```

Sans la barrière mémoire, l'opération de chargement de la couleur de l'objet peut être réordonnée avant l'opération d'écriture. Si nous ne prévenons pas ce réordonnancement, alors la barrière d'écriture peut observer une couleur gris pour l'objet et se désister, tandis qu'un thread de travail marque l'objet sans voir la nouvelle valeur. La barrière d'écriture originale proposée par Dijkstra et al. ne vérifie également pas la couleur de l'objet. Ils l'ont fait par souci de simplicité, mais nous en avons besoin pour la correction.

### Liste de travail de désistement

Certaines opérations, par exemple le patching de code, nécessitent un accès exclusif à l'objet. Très tôt, nous avons décidé d'éviter les verrouillages par objet car ils peuvent entraîner un problème d'inversion de priorité, où le thread principal doit attendre un thread de travail qui est déplanifié tout en détenant un verrou d'objet. Au lieu de verrouiller un objet, nous permettons au thread de travail de se désister de la visite de l'objet. Le thread de travail fait cela en poussant l'objet dans la liste de travail de désistement, qui est traitée uniquement par le thread principal :

![Figure 7. La liste de travail de désistement](/_img/concurrent-marking/10.svg)

Les threads de travail se désistent sur les objets de code optimisé, les classes cachées et les collections faibles car leur visite nécessiterait un verrouillage ou un protocole de synchronisation coûteux.

En rétrospective, la liste de travail de désistement s'est avérée excellente pour le développement incrémental. Nous avons commencé l'implémentation avec les threads de travail se désistant sur tous les types d'objets et ajouté la concurrence un par un.

### Changements de disposition des objets

Un champ d'un objet peut contenir trois types de valeurs : un pointeur étiqueté, un petit entier étiqueté (également connu sous le nom de Smi) ou une valeur non étiquetée comme un nombre à virgule flottante déboxé. [Les pointeurs étiquetés](https://en.wikipedia.org/wiki/Tagged_pointer) sont une technique bien connue qui permet une représentation efficace des entiers non étiquetés. Dans V8, le bit le moins significatif d'une valeur étiquetée indique s'il s'agit d'un pointeur ou d'un entier. Cela repose sur le fait que les pointeurs sont alignés sur les mots. Les informations sur le fait qu'un champ soit étiqueté ou non sont stockées dans la classe cachée de l'objet.

Certaines opérations de V8 changent un champ d'objet de étiqueté à non étiqueté (ou vice versa) en faisant passer l'objet à une autre classe cachée. Un tel changement de disposition d'objet est dangereux pour le marquage concurrent. Si le changement se produit alors qu'un thread de travail visite l'objet de manière concurrente en utilisant l'ancienne classe cachée, alors deux types de bugs sont possibles. Premièrement, le travailleur peut manquer un pointeur en pensant qu'il s'agit d'une valeur non étiquetée. La barrière d'écriture protège contre ce type de bug. Deuxièmement, le travailleur peut traiter une valeur non étiquetée comme un pointeur et y accéder, ce qui entraînerait un accès mémoire invalide suivi généralement d'un crash du programme. Pour gérer ce cas, nous utilisons un protocole de capture instantanée qui se synchronise sur le bit de marquage de l'objet. Le protocole implique deux parties : le thread principal modifiant un champ d'objet de étiqueté à non étiqueté et le thread de travail visitant l'objet. Avant de modifier le champ, le thread principal s'assure que l'objet est marqué comme noir et le pousse dans la liste de travail de désistement pour le visiter ultérieurement :

```cpp
transition_couleur_atomique(objet, blanc, gris);
si (transition_couleur_atomique(objet, gris, noir)) {
  // L'objet sera revisité sur le thread principal lors de la vidange
  // de la liste de travail de désistement.
  bailout_worklist.push(objet);
}
modification_disposition_objet_dangereuse(objet);
```

Comme montré dans l'extrait de code ci-dessous, le thread de travail charge d'abord la classe cachée de l'objet et capture instantanément tous les champs pointeurs de l'objet spécifiés par la classe cachée en utilisant [les opérations de chargement atomique relaxées](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering). Ensuite, il essaie de marquer l'objet noir en utilisant une opération de comparaison et d'échange atomique. Si le marquage réussit alors cela signifie que la capture instantanée doit être cohérente avec la classe cachée car le thread principal marque l'objet noir avant de changer sa disposition.

```cpp
capture = [];
hidden_class = atomic_relaxed_load(&object.hidden_class);
pour (field_offset dans pointer_field_offsets(hidden_class)) {
  pointeur = atomic_relaxed_load(object + field_offset);
  snapshot.ajouter(field_offset, pointeur);
}
si (atomic_color_transition(object, grey, black)) {
  visiter_les_pointeurs(snapshot);
}
```

Notez qu'un objet blanc subissant un changement de disposition non sécurisé doit être marqué sur le thread principal. Les changements de disposition non sécurisés sont relativement rares, donc cela n'a pas un grand impact sur les performances des applications réelles.

## Tout rassembler

Nous avons intégré le marquage concurrent dans l'infrastructure de marquage incrémentiel existante. Le thread principal initie le marquage en scannant les racines et en remplissant la liste de travail de marquage. Après cela, il publie des tâches de marquage concurrent sur les threads de travail. Les threads de travail assistent le thread principal pour faire progresser le marquage plus rapidement en vidant de manière coopérative la liste de travail de marquage. De temps en temps, le thread principal participe au marquage en traitant la liste de défaillance et la liste de travail de marquage. Une fois les listes de travail de marquage vides, le thread principal finalise la collecte des déchets. Pendant la finalisation, le thread principal re-scanne les racines et peut découvrir d'autres objets blancs. Ces objets sont marqués en parallèle à l'aide des threads de travail.

![](/_img/concurrent-marking/11.svg)

## Résultats

Notre [cadre de benchmarking en conditions réelles](/blog/real-world-performance) montre une réduction d'environ 65% et 70% du temps de marquage sur le thread principal par cycle de collecte des déchets sur mobile et sur ordinateur de bureau respectivement.

![Temps passé en marquage sur le thread principal (moins c'est mieux)](/_img/concurrent-marking/12.svg)

Le marquage concurrent réduit également les saccades de la collecte des déchets dans Node.js. Cela est particulièrement important car Node.js n'a jamais implémenté une planification de collecte des déchets en temps d'inactivité et n'a donc jamais pu cacher le temps de marquage dans des phases non critiques en termes de saccades. Le marquage concurrent a été introduit dans Node.js v10.
