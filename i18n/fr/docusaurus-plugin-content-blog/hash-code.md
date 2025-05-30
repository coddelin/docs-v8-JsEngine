---
title: "Optimisation des tables de hachage : cacher le code de hachage"
author: "[Sathya Gunasekaran](https://twitter.com/_gsathya), gardien des codes de hachage"
avatars: 
  - "sathya-gunasekaran"
date: "2018-01-29 13:33:37"
tags: 
  - internals
tweet: "958046113390411776"
description: "Plusieurs structures de données JavaScript comme Map, Set, WeakSet et WeakMap utilisent des tables de hachage sous-jacentes. Cet article explique comment V8 v6.3 améliore les performances des tables de hachage."
---
ECMAScript 2015 a introduit plusieurs nouvelles structures de données comme Map, Set, WeakSet et WeakMap, qui utilisent toutes des tables de hachage en interne. Cet article détaille les [améliorations récentes](https://bugs.chromium.org/p/v8/issues/detail?id=6404) dans la façon dont [V8 v6.3+](/blog/v8-release-63) stocke les clés dans les tables de hachage.

<!--truncate-->
## Code de hachage

Une [_fonction de hachage_](https://fr.wikipedia.org/wiki/Fonction_de_hachage) est utilisée pour mapper une clé donnée à un emplacement dans la table de hachage. Un _code de hachage_ est le résultat de l'exécution de cette fonction de hachage sur une clé donnée.

Dans V8, le code de hachage est juste un nombre aléatoire, indépendant de la valeur de l'objet. Par conséquent, nous ne pouvons pas le recalculer, ce qui signifie qu'il doit être stocké.

Pour les objets JavaScript utilisés comme clés, auparavant, le code de hachage était stocké comme un symbole privé sur l'objet. Un symbole privé dans V8 est similaire à un [`Symbol`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Symbol), sauf qu'il n'est pas énumérable et ne s'exporte pas dans le JavaScript utilisateur.

```js
function GetObjectHash(key) {
  let hash = key[hashCodeSymbol];
  if (IS_UNDEFINED(hash)) {
    hash = (MathRandom() * 0x40000000) | 0;
    if (hash === 0) hash = 1;
    key[hashCodeSymbol] = hash;
  }
  return hash;
}
```

Cela fonctionnait bien car nous n'avions pas à réserver de mémoire pour un champ de code de hachage jusqu'à ce que l'objet soit ajouté à une table de hachage, moment auquel un nouveau symbole privé était stocké sur l'objet.

V8 pouvait également optimiser la recherche de symbole de code de hachage comme toute autre recherche de propriété en utilisant le système IC, offrant des recherches très rapides pour le code de hachage. Cela fonctionne bien pour les [recherches IC monomorphiques](https://fr.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching), lorsque les clés ont la même [classe cachée](/). Cependant, la plupart des codes du monde réel ne suivent pas ce modèle, et souvent les clés ont des classes cachées différentes, ce qui entraîne des [recherches IC mégamorphiques](https://fr.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching) lentes pour le code de hachage.

Un autre problème avec l'approche des symboles privés était qu'elle déclenchait une [transition de classe cachée](/#fast-property-access) dans la clé lors du stockage du code de hachage. Cela entraînait un code polymorphique médiocre non seulement pour la recherche du code de hachage, mais aussi pour d'autres recherches de propriétés sur la clé et une [désoptimisation](https://floitsch.blogspot.com/2012/03/optimizing-for-v8-inlining.html) à partir du code optimisé.

## Stockages de support des objets JavaScript

Un objet JavaScript (`JSObject`) dans V8 utilise deux mots (en dehors de son en-tête) : un mot pour stocker un pointeur vers le stockage de support des éléments, et un autre mot pour stocker un pointeur vers le stockage de support des propriétés.

Le stockage de support des éléments est utilisé pour stocker des propriétés qui ressemblent à des [indices de tableau](https://tc39.es/ecma262/#sec-array-index), tandis que le stockage de support des propriétés est utilisé pour stocker des propriétés dont les clés sont des chaînes ou des symboles. Voir ce [article du blog V8](/blog/fast-properties) de Camillo Bruni pour plus d'informations sur ces stockages de support.

```js
const x = {};
x[1] = 'bar';      // ← stocké dans éléments
x['foo'] = 'bar';  // ← stocké dans propriétés
```

## Cacher le code de hachage

La solution la plus simple pour stocker le code de hachage serait d'étendre la taille d'un objet JavaScript d'un mot et de stocker le code de hachage directement sur l'objet. Cependant, cela gaspillerait de la mémoire pour les objets qui ne sont pas ajoutés à une table de hachage. À la place, nous pourrions essayer de stocker le code de hachage dans le stockage des éléments ou des propriétés.

Le stockage de support des éléments est un tableau contenant sa longueur et tous les éléments. Il n'y a pas grand-chose à faire ici, car stocker le code de hachage dans un emplacement réservé (comme l'indice 0) entraînerait tout de même un gaspillage de mémoire lorsque nous n'utilisons pas l'objet comme clé dans une table de hachage.

Regardons le stockage de support des propriétés. Il existe deux types de structures de données utilisées comme stockage de support des propriétés : les tableaux et les dictionnaires.

Contrairement au tableau utilisé dans le stockage de support des éléments, qui n'a pas de limite supérieure, le tableau utilisé dans le stockage de support des propriétés a une limite supérieure de 1022 valeurs. V8 passe à l'utilisation d'un dictionnaire lorsqu'il dépasse cette limite pour des raisons de performances. (Je simplifie légèrement cela — V8 peut également utiliser un dictionnaire dans d'autres cas, mais il existe une limite supérieure fixe au nombre de valeurs pouvant être stockées dans le tableau.)

Ainsi, il existe trois états possibles pour le stockage de support des propriétés :

1. vide (aucune propriété)
2. tableau (peut stocker jusqu'à 1022 valeurs)
3. Dictionnaire

Discutons de chacun de ces points.

### Le magasin de stockage des propriétés est vide

Dans le cas vide, nous pouvons directement stocker le code de hachage dans ce décalage sur le `JSObject`.

![](/_img/hash-code/properties-backing-store-empty.png)

### Le magasin de stockage des propriétés est un tableau

V8 représente les entiers inférieurs à 2<sup>31</sup> (sur les systèmes 32 bits) non encadrés, comme des [Smi](https://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations). Dans un Smi, le bit de poids faible est une étiquette utilisée pour le distinguer des pointeurs, tandis que les 31 bits restants contiennent la valeur entière réelle.

Normalement, les tableaux stockent leur longueur sous forme de Smi. Étant donné que nous savons que la capacité maximale de ce tableau est seulement de 1022, nous n'avons besoin que de 10 bits pour stocker la longueur. Nous pouvons utiliser les 21 bits restants pour stocker le code de hachage !

![](/_img/hash-code/properties-backing-store-array.png)

### Le magasin de stockage des propriétés est un dictionnaire

Pour le cas du dictionnaire, nous augmentons la taille du dictionnaire de 1 mot pour stocker le code de hachage dans un emplacement dédié au début du dictionnaire. Nous pouvons nous permettre de potentiellement gaspiller un mot de mémoire dans ce cas, car l'augmentation proportionnelle de taille n'est pas aussi importante que dans le cas du tableau.

![](/_img/hash-code/properties-backing-store-dictionary.png)

Avec ces changements, la recherche du code de hachage n'a plus à passer par le mécanisme complexe de recherche de propriété JavaScript.

## Améliorations des performances

Le benchmark [SixSpeed](https://github.com/kpdecker/six-speed) suit les performances de Map et Set, et ces changements ont entraîné une amélioration d'environ 500 %.

![](/_img/hash-code/sixspeed.png)

Ce changement a également causé une amélioration de 5 % sur le benchmark Basic dans [ARES6](https://webkit.org/blog/7536/jsc-loves-es6/).

![](/_img/hash-code/ares-6.png)

Cela a également entraîné une amélioration de 18 % dans l'un des benchmarks de la suite de benchmarks [Emberperf](http://emberperf.eviltrout.com/) qui teste Ember.js.

![](/_img/hash-code/emberperf.jpg)
