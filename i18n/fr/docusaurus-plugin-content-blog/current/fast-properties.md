---
title: "Propriétés rapides dans V8"
author: "Camillo Bruni ([@camillobruni](https://twitter.com/camillobruni)), également auteur de [“Fast `for`-`in”](/blog/fast-for-in)"
avatars: 
  - "camillo-bruni"
date: "2017-08-30 13:33:37"
tags: 
  - internals
description: "Cette exploration technique approfondie explique comment V8 gère les propriétés JavaScript en coulisses."
---
Dans cet article, nous souhaitons expliquer comment V8 gère les propriétés JavaScript en interne. Du point de vue de JavaScript, seules quelques distinctions sont nécessaires pour les propriétés. Les objets JavaScript se comportent principalement comme des dictionnaires, avec des clés de type chaîne de caractères et des objets arbitraires comme valeurs. Cependant, la spécification traite différemment les propriétés indexées par des entiers et les autres propriétés [durant l'itération](https://tc39.es/ecma262/#sec-ordinaryownpropertykeys). En dehors de cela, les différentes propriétés se comportent principalement de la même manière, indépendamment du fait qu'elles soient indexées par des entiers ou non.

<!--truncate-->
Cependant, en coulisses, V8 s'appuie sur plusieurs représentations différentes des propriétés pour des raisons de performance et de mémoire. Dans cet article, nous allons expliquer comment V8 peut fournir un accès rapide aux propriétés tout en gérant les propriétés ajoutées dynamiquement. Comprendre le fonctionnement des propriétés est essentiel pour expliquer comment des optimisations telles que les [caches en ligne](http://mrale.ph/blog/2012/06/03/explaining-js-vms-in-js-inline-caches.html) fonctionnent dans V8.

Cet article explique la différence dans la gestion des propriétés nommées et indexées par des entiers. Ensuite, nous montrons comment V8 maintient les HiddenClasses lors de l'ajout de propriétés nommées afin de fournir un moyen rapide d'identifier la structure d'un objet. Nous continuerons en donnant des informations sur la façon dont les propriétés nommées sont optimisées pour des accès rapides ou des modifications rapides selon l'utilisation. Dans la section finale, nous fournissons des détails sur la façon dont V8 gère les propriétés indexées par des entiers ou les indices de tableau.

## Propriétés nommées vs. éléments

Commençons par analyser un objet très simple tel que `{a: "foo", b: "bar"}`. Cet objet a deux propriétés nommées, `"a"` et `"b"`. Il n'a aucun indice entier pour les noms de propriétés. Les propriétés indexées par tableau, plus communément appelées éléments, sont les plus présentes dans les tableaux. Par exemple, le tableau `["foo", "bar"]` possède deux propriétés indexées par tableau : 0, avec la valeur "foo", et 1, avec la valeur "bar". C'est la première distinction majeure sur la façon dont V8 gère les propriétés en général.

Le diagramme suivant montre à quoi ressemble un objet JavaScript de base en mémoire.

![](/_img/fast-properties/jsobject.png)

Les éléments et les propriétés sont stockés dans deux structures de données séparées, ce qui rend l'ajout et l'accès aux propriétés ou aux éléments plus efficaces pour différents modèles d'utilisation.

Les éléments sont principalement utilisés pour les diverses [méthodes de `Array.prototype`](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object) telles que `pop` ou `slice`. Étant donné que ces fonctions accèdent aux propriétés dans des plages consécutives, V8 les représente également comme de simples tableaux en interne — la plupart du temps. Plus loin dans cet article, nous expliquerons comment nous passons parfois à une représentation basée sur des dictionnaires clairsemés pour économiser de la mémoire.

Les propriétés nommées sont stockées de manière similaire dans un tableau séparé. Cependant, contrairement aux éléments, nous ne pouvons pas simplement utiliser la clé pour déduire leur position dans le tableau des propriétés ; nous avons besoin de métadonnées supplémentaires. Dans V8, chaque objet JavaScript a un HiddenClass associé. Le HiddenClass stocke des informations sur la structure d'un objet, et entre autres, une correspondance entre les noms de propriétés et les indices dans les propriétés. Pour compliquer les choses, nous utilisons parfois un dictionnaire pour les propriétés au lieu d'un simple tableau. Nous expliquerons cela plus en détail dans une section dédiée.

**À retenir de cette section :**

- Les propriétés indexées par tableau sont stockées dans un magasin d'éléments séparé.
- Les propriétés nommées sont stockées dans le magasin de propriétés.
- Les éléments et les propriétés peuvent être des tableaux ou des dictionnaires.
- Chaque objet JavaScript a un HiddenClass associé qui conserve des informations sur la structure de l'objet.

## HiddenClasses et DescriptorArrays

Après avoir expliqué la distinction générale entre les éléments et les propriétés nommées, nous devons examiner le fonctionnement des HiddenClasses dans V8. Cette HiddenClass stocke des informations méta sur un objet, y compris le nombre de propriétés de l'objet et une référence au prototype de l'objet. Les HiddenClasses sont conceptuellement similaires aux classes dans des langages de programmation orientés objet classiques. Cependant, dans un langage basé sur les prototypes comme JavaScript, il n'est généralement pas possible de connaître les classes à l'avance. Ainsi, dans ce cas de V8, les HiddenClasses sont créées à la volée et mises à jour dynamiquement au fur et à mesure que les objets changent. Les HiddenClasses servent d'identifiant pour la structure d'un objet et, en tant que tels, constituent un ingrédient très important pour le compilateur optimisant de V8 et les caches inline. Le compilateur optimisant, par exemple, peut directement intégrer l'accès aux propriétés s'il peut garantir une structure d'objets compatible grâce aux HiddenClasses.

Jetons un coup d'œil aux parties importantes d'une HiddenClass.

![](/_img/fast-properties/hidden-class.png)

Dans V8, le premier champ d'un objet JavaScript pointe vers une HiddenClass. (En réalité, cela est vrai pour tout objet situé dans le tas de V8 et géré par le collecteur de déchets.) En termes de propriétés, l'information la plus importante est le troisième champ de bits, qui stocke le nombre de propriétés, et un pointeur vers le tableau de descripteurs. Le tableau de descripteurs contient des informations sur les propriétés nommées telles que le nom lui-même et la position où la valeur est stockée. Notez que nous ne suivons pas ici les propriétés indexées par des entiers, c'est pourquoi il n'y a pas d'entrée dans le tableau de descripteurs.

L'hypothèse de base concernant les HiddenClasses est que les objets avec la même structure — par exemple, les mêmes propriétés nommées dans le même ordre — partagent la même HiddenClass. Pour atteindre cela, nous utilisons une HiddenClass différente lorsqu'une propriété est ajoutée à un objet. Dans l'exemple suivant, nous commençons par un objet vide et ajoutons trois propriétés nommées.

![](/_img/fast-properties/adding-properties.png)

Chaque fois qu'une nouvelle propriété est ajoutée, la HiddenClass de l'objet est modifiée. En arrière-plan, V8 crée un arbre de transition qui relie les HiddenClasses entre elles. V8 sait quelle HiddenClass utiliser lorsque, par exemple, vous ajoutez la propriété "a" à un objet vide. Cet arbre de transition garantit que vous obtenez la même HiddenClass finale si vous ajoutez les mêmes propriétés dans le même ordre. L'exemple suivant montre que nous suivrions le même arbre de transition même si nous ajoutons entre-temps des propriétés indexées simples.

![](/_img/fast-properties/transitions.png)

Cependant, si nous créons un nouvel objet auquel une propriété différente est ajoutée, dans ce cas la propriété `"d"`, V8 crée une branche séparée pour les nouvelles HiddenClasses.

![](/_img/fast-properties/transition-trees.png)

**Conclusion de cette section :**

- Les objets avec la même structure (mêmes propriétés dans le même ordre) ont la même HiddenClass.
- Par défaut, chaque nouvelle propriété nommée ajoutée entraîne la création d'une nouvelle HiddenClass.
- Ajouter des propriétés indexées par tableau ne crée pas de nouvelles HiddenClasses.

## Les trois types différents de propriétés nommées

Après avoir donné un aperçu sur la façon dont V8 utilise les HiddenClasses pour suivre la structure des objets, examinons maintenant comment ces propriétés sont réellement stockées. Comme expliqué dans l'introduction ci-dessus, il existe deux types fondamentaux de propriétés : nommées et indexées. La section suivante couvre les propriétés nommées.

Un objet simple tel que `{a: 1, b: 2}` peut avoir diverses représentations internes dans V8. Bien que les objets JavaScript se comportent plus ou moins comme des dictionnaires simples vu de l'extérieur, V8 essaie d'éviter les dictionnaires car ils entravent certaines optimisations comme les [caches inline](https://en.wikipedia.org/wiki/Inline_caching) que nous expliquerons dans un article séparé.

**Propriétés dans l'objet vs. propriétés normales:** V8 prend en charge les propriétés dites dans l'objet, qui sont directement stockées sur les objets eux-mêmes. Ce sont les propriétés les plus rapides disponibles dans V8, car elles sont accessibles sans aucune indirection. Le nombre de propriétés dans l'objet est prédéterminé par la taille initiale de l'objet. Si davantage de propriétés sont ajoutées que l'espace disponible dans l'objet, elles sont stockées dans l'espace de stockage des propriétés. L'espace de stockage des propriétés ajoute un niveau d'indirection mais peut croître de manière indépendante.

![](/_img/fast-properties/in-object-properties.png)

**Propriétés rapides vs. lentes :** La distinction suivante importante concerne les propriétés rapides et lentes. En général, nous définissons les propriétés stockées dans l'espace de stockage des propriétés linéaire comme "rapides". Les propriétés rapides sont simplement accessibles par index dans l'espace de stockage des propriétés. Pour passer du nom de la propriété à la position réelle dans l'espace de stockage des propriétés, nous devons consulter le tableau de descripteurs sur la HiddenClass, comme nous l'avons décrit précédemment.

![](/_img/fast-properties/fast-vs-slow-properties.png)

Cependant, si de nombreuses propriétés sont ajoutées et supprimées d'un objet, cela peut générer beaucoup de surcharge en temps et en mémoire pour maintenir le tableau de descripteurs et les HiddenClasses. Par conséquent, V8 prend également en charge des propriétés dites lentes. Un objet avec des propriétés lentes dispose d'un dictionnaire autonome comme espace de stockage des propriétés. Toutes les informations méta sur les propriétés ne sont plus stockées dans le tableau de descripteurs sur la HiddenClass mais directement dans le dictionnaire des propriétés. Ainsi, les propriétés peuvent être ajoutées et supprimées sans mettre à jour la HiddenClass. Étant donné que les caches inline ne fonctionnent pas avec les propriétés de type dictionnaire, ces dernières sont généralement plus lentes que les propriétés rapides.

**Conclusion de cette section :**

- Il existe trois types différents de propriétés nommées : dans l'objet, rapides et lentes/dictionnaire.
    1. Les propriétés dans l'objet sont directement stockées sur l'objet lui-même et offrent un accès le plus rapide.
    1. Les propriétés rapides résident dans la mémoire des propriétés, toutes les méta-informations sont stockées dans le tableau descripteur sur le HiddenClass.
    1. Les propriétés lentes résident dans un dictionnaire de propriétés autonome, les méta-informations ne sont plus partagées via le HiddenClass.
- Les propriétés lentes permettent une suppression et une ajout efficace des propriétés, mais elles sont plus lentes à accéder que les deux autres types.

## Éléments ou propriétés indexées par tableau

Jusqu'à présent, nous avons examiné les propriétés nommées et ignoré les propriétés indexées par des entiers couramment utilisées avec les tableaux. La gestion des propriétés indexées par des entiers n'est pas moins complexe que celle des propriétés nommées. Même si toutes les propriétés indexées sont toujours conservées séparément dans la mémoire des éléments, il existe [20](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?q=elements-kind.h&sq=package:chromium&dr&l=14) types différents d'éléments !

**Éléments contigus ou avec des trous :** La première distinction majeure faite par V8 est de savoir si la mémoire sous-jacente des éléments est contiguë ou contient des trous. Vous obtenez des trous dans une mémoire sous-jacente si vous supprimez un élément indexé, ou par exemple, si vous ne le définissez pas. Un exemple simple est `[1,,3]` où la deuxième entrée est un trou. L'exemple suivant illustre ce problème :

```js
const o = ['a', 'b', 'c'];
console.log(o[1]);          // Affiche 'b'.

delete o[1];                // Introduit un trou dans la mémoire des éléments.
console.log(o[1]);          // Affiche 'undefined' ; la propriété 1 n'existe pas.
o.__proto__ = {1: 'B'};     // Définit la propriété 1 sur le prototype.

console.log(o[0]);          // Affiche 'a'.
console.log(o[1]);          // Affiche 'B'.
console.log(o[2]);          // Affiche 'c'.
console.log(o[3]);          // Affiche undefined.
```

![](/_img/fast-properties/hole.png)

En résumé, si une propriété n'est pas présente sur le récepteur, nous devons continuer à chercher dans la chaîne de prototypes. Étant donné que les éléments sont autonomes, par exemple nous ne stockons pas d'informations sur les propriétés indexées existantes sur le HiddenClass, nous avons besoin d'une valeur spéciale, appelée the\_hole, pour marquer les propriétés qui ne sont pas présentes. Cela est crucial pour la performance des fonctions Array. Si nous savons qu'il n'y a pas de trous, c'est-à-dire que la mémoire des éléments est contiguë, nous pouvons exécuter des opérations locales sans avoir à effectuer de recherches coûteuses dans la chaîne de prototypes.

**Éléments rapides ou en mode dictionnaire :** La seconde distinction majeure faite sur les éléments est de savoir s'ils sont rapides ou en mode dictionnaire. Les éléments rapides sont des tableaux simples internes à la machine virtuelle où l'index de la propriété correspond à l'index dans la mémoire des éléments. Cependant, cette représentation simple est plutôt inefficace pour des tableaux très grands et clairsemés ou contenant des trous, où seuls quelques éléments sont occupés. Dans ce cas, nous utilisons une représentation basée sur un dictionnaire pour économiser de la mémoire au prix d'un accès légèrement plus lent :

```js
const sparseArray = [];
sparseArray[9999] = 'foo'; // Crée un tableau avec des éléments en mode dictionnaire.
```

Dans cet exemple, allouer un tableau complet avec 10 000 entrées serait plutôt inefficace. Ce qui se passe à la place, c'est que V8 crée un dictionnaire où nous stockons des triplets clé-valeur-descripteur. La clé serait dans ce cas `"9999"`, la valeur `"foo"` et le descripteur par défaut est utilisé. Étant donné que nous n'avons pas de moyen de stocker les détails des descripteurs sur le HiddenClass, V8 utilise des éléments lents chaque fois que vous définissez une propriété indexée avec un descripteur personnalisé :

```js
const array = [];
Object.defineProperty(array, 0, {value: 'fixed', configurable: false});
console.log(array[0]);      // Affiche 'fixed'.
array[0] = 'other value';   // Impossible d'écraser l'index 0.
console.log(array[0]);      // Affiche encore 'fixed'.
```

Dans cet exemple, nous avons ajouté une propriété non configurable au tableau. Cette information est stockée dans la partie descripteur d'un triplet du dictionnaire des éléments lents. Il est important de noter que les fonctions Array sont considérablement plus lentes sur les objets avec des éléments lents.

**Éléments Smi et Double :** Pour les éléments rapides, une autre distinction importante est faite dans V8. Par exemple, si vous stockez uniquement des entiers dans un tableau, un cas d'utilisation courant, le ramasse-miettes n'a pas à examiner le tableau, car les entiers sont directement codés comme de petits entiers (Smis) en place. Un autre cas particulier concerne les tableaux qui ne contiennent que des doubles. Contrairement aux Smis, les nombres en virgule flottante sont généralement représentés comme des objets complets occupant plusieurs mots. Cependant, V8 stocke les doubles bruts pour les tableaux purement en doubles afin d'éviter un surcoût en mémoire et en performance. L'exemple suivant répertorie 4 exemples d'éléments Smi et double :

```js
const a1 = [1,   2, 3];  // Smi contigu
const a2 = [1,    , 3];  // Smi avec trous, a2[1] lit à partir du prototype
const b1 = [1.1, 2, 3];  // Double contigu
const b2 = [1.1,  , 3];  // Double avec trous, b2[1] lit à partir du prototype
```

**Éléments spéciaux :** Avec les informations jusqu'à présent, nous avons couvert 7 des 20 types différents d'éléments. Pour simplifier, nous avons exclu 9 types d'éléments pour les TypedArrays, deux autres pour les enveloppes de chaîne, et enfin, deux types d'éléments spéciaux pour les objets arguments.

**Les ElementsAccessor :** Comme vous pouvez l'imaginer, nous ne sommes pas exactement enclins à écrire 20 fois les fonctions de tableau en C++, une fois pour chaque [type d'éléments](/blog/elements-kinds). C'est là qu'intervient un peu de magie C++. Au lieu d'implémenter encore et encore les fonctions de tableau, nous avons créé le `ElementsAccessor` où nous devons surtout implémenter uniquement des fonctions simples qui accèdent aux éléments du stockage sous-jacent. Le `ElementsAccessor` s'appuie sur le [CRTP](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern) pour créer des versions spécialisées de chaque fonction Array. Donc, si vous appelez quelque chose comme `slice` sur un tableau, V8 appelle en interne une fonction intégrée écrite en C++ et passe par le `ElementsAccessor` à la version spécialisée de la fonction :

![](/_img/fast-properties/elements-accessor.png)

**À retenir de cette section :**

- Il existe des propriétés et des éléments indexés en mode rapide et en mode dictionnaire.
- Les propriétés rapides peuvent être compactées ou contenir des trous, ce qui indique qu'une propriété indexée a été supprimée.
- Les éléments sont spécialisés en fonction de leur contenu pour accélérer les fonctions Array et réduire les frais généraux du ramasse-miettes (GC).

Comprendre comment fonctionnent les propriétés est crucial pour de nombreuses optimisations dans V8. Pour les développeurs JavaScript, nombre de ces décisions internes ne sont pas visibles directement, mais elles expliquent pourquoi certains modèles de code sont plus rapides que d'autres. Changer le type de propriété ou d'élément entraîne généralement la création par V8 d'une HiddenClass différente, ce qui peut conduire à une pollution des types qui [empêche V8 de générer du code optimal](http://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html). Restez à l'écoute pour d'autres billets expliquant le fonctionnement des internals de la VM de V8.
