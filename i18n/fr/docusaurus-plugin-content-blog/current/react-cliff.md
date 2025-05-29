---
title: "L'histoire d'une chute de performance V8 dans React"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)) et Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "benedikt-meurer"
  - "mathias-bynens"
date: "2019-08-28 16:45:00"
tags: 
  - internals
  - presentations
description: "Cet article décrit comment V8 choisit les représentations en mémoire optimales pour diverses valeurs JavaScript, et comment cela impacte les mécanismes de formes — tout cela aide à expliquer une récente chute de performance V8 dans le cœur de React."
tweet: "1166723359696130049"
---
[Précédemment](https://mathiasbynens.be/notes/shapes-ics), nous avons discuté de la manière dont les moteurs JavaScript optimisent l'accès aux objets et aux tableaux grâce à l'utilisation de Shapes et d'Inline Caches, et nous avons exploré [comment les moteurs accélèrent l'accès aux propriétés de prototype](https://mathiasbynens.be/notes/prototypes) en particulier. Cet article décrit comment V8 choisit les représentations en mémoire optimales pour diverses valeurs JavaScript, et comment cela impacte les mécanismes de formes — tout cela aide à expliquer [une récente chute de performance V8 dans le cœur de React](https://github.com/facebook/react/issues/14365).

<!--truncate-->
:::note
**Note :** Si vous préférez regarder une présentation plutôt que lire des articles, profitez de la vidéo ci-dessous ! Sinon, ignorez la vidéo et continuez à lire.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">“Fondamentaux des moteurs JavaScript : le bon, le mauvais et le laid”</a> présenté par Mathias Bynens et Benedikt Meurer à l'AgentConf 2019.</figcaption>
</figure>

## Types de JavaScript

Chaque valeur JavaScript possède exactement un des huit types différents (actuellement) : `Number`, `String`, `Symbol`, `BigInt`, `Boolean`, `Undefined`, `Null` et `Object`.

![](/_img/react-cliff/01-javascript-types.svg)

Avec une exception notable, ces types sont observables en JavaScript grâce à l'opérateur `typeof` :

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null` renvoie `'object'`, et non `'null'`, malgré que `Null` soit un type en soi. Pour comprendre pourquoi, considérez que l'ensemble de tous les types JavaScript est divisé en deux groupes :

- _objets_ (c.-à-d. le type `Object`)
- _primitifs_ (c.-à-d. toute valeur qui n'est pas un objet)

Ainsi, `null` signifie « pas de valeur d'objet », tandis que `undefined` signifie « pas de valeur ».

![](/_img/react-cliff/02-primitives-objects.svg)

En suivant cette logique, Brendan Eich a conçu JavaScript pour que `typeof` renvoie `'object'` pour toutes les valeurs à droite, c'est-à-dire tous les objets et les valeurs nulles, dans l'esprit de Java. C'est pourquoi `typeof null === 'object'` malgré que la spécification ait un type `Null` séparé.

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## Représentation des valeurs

Les moteurs JavaScript doivent pouvoir représenter des valeurs JavaScript arbitraires en mémoire. Cependant, il est important de noter que le type JavaScript d'une valeur est distinct de la manière dont les moteurs JavaScript représentent cette valeur en mémoire.

La valeur `42`, par exemple, a pour type `number` en JavaScript.

```js
typeof 42;
// → 'number'
```

Il existe plusieurs façons de représenter un nombre entier comme `42` en mémoire :

:::table-wrapper
| représentation                     | bits                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| complément à deux sur 8 bits       | `0010 1010`                                                                       |
| complément à deux sur 32 bits      | `0000 0000 0000 0000 0000 0000 0010 1010`                                         |
| décimal codé binaire économique (BCD) | `0100 0010`                                                                       |
| flottant IEEE-754 sur 32 bits      | `0100 0010 0010 1000 0000 0000 0000 0000`                                         |
| flottant IEEE-754 sur 64 bits      | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

La norme ECMAScript standardise les nombres comme des valeurs en virgule flottante de 64 bits, également connues sous le nom de _flottant en double précision_ ou _Float64_. Cependant, cela ne signifie pas que les moteurs JavaScript stockent les nombres en représentation Float64 tout le temps — ce serait terriblement inefficace ! Les moteurs peuvent choisir d'autres représentations internes, tant que le comportement observable correspond exactement à celui de Float64.

La plupart des nombres dans les applications JavaScript du monde réel se trouvent être des [indices de tableau ECMAScript valides](https://tc39.es/ecma262/#array-index), c'est-à-dire des valeurs entières comprises dans la plage de 0 à 2³²−2.

```js
array[0]; // Indice de tableau le plus petit possible.
array[42];
array[2**32-2]; // Indice de tableau le plus grand possible.
```

Les moteurs JavaScript peuvent choisir une représentation en mémoire optimale pour ces nombres afin d'optimiser le code qui accède aux éléments du tableau par leur indice. Pour que le processeur effectue l'opération d'accès mémoire, l'indice de tableau doit être disponible en [complément à deux](https://en.wikipedia.org/wiki/Two%27s_complement). Représenter les indices de tableau en tant que Float64 serait une perte, car le moteur devrait alors effectuer des conversions aller-retour entre Float64 et le complément à deux à chaque accès à un élément de tableau.

La représentation en complément à deux sur 32 bits ne se limite pas uniquement aux opérations de tableau. En général, **les processeurs exécutent les opérations sur les entiers beaucoup plus rapidement que les opérations en virgule flottante**. C'est pourquoi dans l'exemple suivant, la première boucle est facilement deux fois plus rapide que la seconde boucle.

```js
for (let i = 0; i < 1000; ++i) {
  // rapide 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // lent 🐌
}
```

Cela vaut également pour les opérations. Les performances de l'opérateur modulo dans le morceau de code suivant dépendent du fait que vous travaillez avec des entiers ou non.

```js
const remainder = value % divisor;
// Rapide 🚀 si `value` et `divisor` sont représentés comme des entiers,
// lent 🐌 sinon.
```

Si les deux opérandes sont représentés comme des entiers, le CPU peut calculer le résultat très efficacement. V8 possède des chemins rapides supplémentaires dans les cas où le `divisor` est une puissance de deux. Pour les valeurs représentées comme des flottants, le calcul est beaucoup plus complexe et prend beaucoup plus de temps.

Étant donné que les opérations sur les entiers s'exécutent généralement beaucoup plus rapidement que celles en virgule flottante, il semblerait que les moteurs puissent simplement utiliser toujours le complément à deux pour tous les entiers et tous les résultats des opérations sur les entiers. Malheureusement, cela serait une violation de la spécification ECMAScript ! ECMAScript se standardise sur Float64, et donc **certaines opérations sur les entiers produisent en réalité des flottants**. Il est important que les moteurs JavaScript produisent les résultats corrects dans ces cas.

```js
// Float64 a une plage d'entiers sûrs de 53 bits. Au-delà de cette plage,
// vous devez perdre la précision.
2**53 === 2**53+1;
// → true

// Float64 prend en charge les zéros négatifs, donc -1 * 0 doit être -0, mais
// il n'y a aucune façon de représenter le zéro négatif dans le complément à deux.
-1*0 === -0;
// → true

// Float64 a des infinis qui peuvent être produits par une division
// par zéro.
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64 contient également des NaN.
0/0 === NaN;
```

Même si les valeurs du côté gauche sont des entiers, toutes les valeurs du côté droit sont des flottants. C'est pourquoi aucune des opérations ci-dessus ne peut être réalisée correctement en utilisant le complément à deux sur 32 bits. Les moteurs JavaScript doivent prendre des précautions particulières pour s'assurer que les opérations sur les entiers basculent correctement pour produire les résultats sophistiqués Float64.

Pour les petits entiers dans la plage des entiers signés sur 31 bits, V8 utilise une représentation spéciale appelée `Smi`. Tout ce qui n'est pas un `Smi` est représenté en tant que `HeapObject`, qui est l'adresse d'une entité en mémoire. Pour les nombres, nous utilisons un type spécial de `HeapObject`, le soi-disant `HeapNumber`, pour représenter les nombres qui ne sont pas dans la plage de `Smi`.

```js
 -Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

Comme le montre l'exemple ci-dessus, certains nombres JavaScript sont représentés sous forme de `Smi`, et d'autres sous forme de `HeapNumber`. V8 est spécifiquement optimisé pour les `Smi`, car les petits entiers sont si courants dans les programmes JavaScript du monde réel. Les `Smi` n'ont pas besoin d'être alloués en tant qu'entités dédiées en mémoire et permettent des opérations rapides sur les entiers en général.

Le point important à retenir ici est que **même les valeurs ayant le même type JavaScript peuvent être représentées de manière complètement différente** en coulisses, en tant qu'optimisation.

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

Voici comment cela fonctionne sous le capot. Supposons que vous avez l'objet suivant :

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

La valeur `42` pour `x` peut être encodée en tant que `Smi`, de sorte qu'elle peut être stockée à l'intérieur de l'objet lui-même. La valeur `4.2`, en revanche, nécessite une entité distincte pour contenir la valeur, et l'objet pointe vers cette entité.

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

Maintenant, supposons que nous exécutons le morceau de code JavaScript suivant :

```js
o.x += 10;
// → o.x est maintenant 52
o.y += 1;
// → o.y est maintenant 5.2
```

Dans ce cas, la valeur de `x` peut être mise à jour directement, puisque la nouvelle valeur `52` entre également dans la plage `Smi`.

![](/_img/react-cliff/05-update-smi.svg)

Cependant, la nouvelle valeur de `y=5.2` ne correspond pas à un `Smi` et est également différente de la valeur précédente `4.2`, donc V8 doit allouer une nouvelle entité `HeapNumber` pour l'affectation à `y`.

![](/_img/react-cliff/06-update-heapnumber.svg)

Les `HeapNumber`s ne sont pas modifiables, ce qui permet certaines optimisations. Par exemple, si nous affectons la valeur de `y` à `x` :

```js
o.x = o.y;
// → o.x est maintenant 5.2
```

…nous pouvons maintenant simplement lier au même `HeapNumber` au lieu d'en allouer un nouveau pour la même valeur.

![](/_img/react-cliff/07-heapnumbers.svg)

Un inconvénient des `HeapNumber`s immuables est que la mise à jour des champs avec des valeurs en dehors de la plage `Smi` serait lente, comme dans l'exemple suivant :

```js
// Créez une instance de `HeapNumber`.
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // Créez une instance supplémentaire de `HeapNumber`.
  o.x += 1;
}
```

La première ligne créerait une instance de `HeapNumber` avec la valeur initiale `0.1`. Le corps de la boucle change cette valeur en `1.1`, `2.1`, `3.1`, `4.1`, et finalement `5.1`, créant un total de six instances de `HeapNumber` au passage, dont cinq deviennent des déchets une fois que la boucle est terminée.

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

Pour éviter ce problème, V8 offre un moyen de mettre à jour sur place les champs de nombres non `Smi`, également en tant qu'optimisation. Lorsque un champ numérique contient des valeurs en dehors de la plage `Smi`, V8 marque ce champ comme un champ `Double` sur la forme et alloue un `MutableHeapNumber` qui contient la valeur réelle codée en Float64.

![](/_img/react-cliff/09-mutableheapnumber.svg)

Lorsque la valeur d'un champ change, V8 n'a plus besoin d'allouer un nouveau `HeapNumber`, mais peut simplement mettre à jour le `MutableHeapNumber` sur place.

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

Cependant, cette approche présente également un inconvénient. Étant donné que la valeur d'un `MutableHeapNumber` peut changer, il est important que ces valeurs ne soient pas diffusées.

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

Par exemple, si vous affectez `o.x` à une autre variable `y`, vous ne voudriez pas que la valeur de `y` change la prochaine fois que `o.x` change — cela constituerait une violation de la spécification JavaScript ! Ainsi, lorsque `o.x` est accédé, le nombre doit être *re-boxé* dans un `HeapNumber` ordinaire avant de l’affecter à `y`.

Pour les flottants, V8 effectue toutes les magies de *“boxing”* ci-dessus en arrière-plan. Mais pour les petits entiers, il serait inefficace d'utiliser l'approche `MutableHeapNumber`, car `Smi` est une représentation plus efficace.

```js
const object = { x: 1 };
// → pas de “boxing” pour `x` dans l'objet

object.x += 1;
// → mise à jour directe de la valeur de `x` dans l'objet
```

Pour éviter l'inefficacité, tout ce que nous avons à faire pour de petits entiers est de marquer le champ sur la forme comme une représentation `Smi`, et simplement mettre à jour la valeur numérique sur place tant qu'elle reste dans la plage des petits entiers.

![](/_img/react-cliff/12-smi-no-boxing.svg)

## Dépréciations et migrations de formes

Alors, que se passe-t-il si un champ contient initialement un `Smi`, mais contient ensuite un nombre en dehors de la plage des petits entiers ? Comme dans ce cas, avec deux objets partageant la même forme où `x` est initialement représenté comme un `Smi` :

```js
const a = { x: 1 };
const b = { x: 2 };
// → les objets ont maintenant `x` en tant que champ `Smi`

b.x = 0.2;
// → `b.x` est maintenant représenté comme un `Double`

y = a.x;
```

Cela commence par deux objets pointant vers la même forme, où `x` est marqué comme une représentation `Smi` :

![](/_img/react-cliff/13-shape.svg)

Lorsque `b.x` passe à une représentation `Double`, V8 alloue une nouvelle forme où `x` est attribué à la représentation `Double`, et qui pointe vers la forme vide. V8 alloue également un `MutableHeapNumber` pour conserver la nouvelle valeur `0.2` pour la propriété `x`. Ensuite, nous mettons à jour l'objet `b` pour qu'il pointe vers cette nouvelle forme et changeons l'emplacement dans l'objet pour pointer vers le `MutableHeapNumber` précédemment alloué à l'offset 0. Enfin, nous marquons l'ancienne forme comme dépréciée et la désolidarisons de l'arbre de transition. Cela s'effectue en créant une nouvelle transition pour `'x'` de la forme vide vers la forme nouvellement créée.

![](/_img/react-cliff/14-shape-transition.svg)

Nous ne pouvons pas complètement supprimer l'ancienne forme à ce stade, car elle est encore utilisée par `a`, et il serait beaucoup trop coûteux de parcourir la mémoire pour trouver tous les objets pointant vers l'ancienne forme et les mettre à jour immédiatement. À la place, V8 fait cela paresseusement : tout accès ou assignation de propriété à `a` le migre d'abord vers la nouvelle forme. L'idée est de rendre progressivement la forme obsolète inaccessible et de laisser le collecteur de déchets l'éliminer.

![](/_img/react-cliff/15-shape-deprecation.svg)

Un cas plus délicat se produit si le champ qui change de représentation n'est _pas_ le dernier de la chaîne :

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

Dans ce cas, V8 doit trouver la forme dite _fractionnée_, qui est la dernière forme dans la chaîne avant que la propriété concernée ne soit introduite. Ici, nous modifions `y`, donc nous devons trouver la dernière forme qui n'a pas `y`, ce qui, dans notre exemple, est la forme qui a introduit `x`.

![](/_img/react-cliff/16-split-shape.svg)

À partir de la forme divisée, nous créons une nouvelle chaîne de transition pour `y` qui rejoue toutes les transitions précédentes, mais avec `'y'` marqué comme représentation `Double`. Et nous utilisons cette nouvelle chaîne de transition pour `y`, marquant l'ancien sous-arbre comme obsolète. Dans la dernière étape, nous migrons l'instance `o` vers la nouvelle forme, en utilisant un `MutableHeapNumber` pour contenir la valeur de `y` maintenant. De cette manière, les nouveaux objets ne suivent pas l'ancien chemin, et une fois que toutes les références à l'ancienne forme ont disparu, la partie obsolète de la forme de l'arbre disparaît.

## Transitions d'extensibilité et de niveau d'intégrité

`Object.preventExtensions()` empêche de nouveaux attributs d'être ajoutés à un objet. Si vous essayez, cela génère une exception. (Si vous n'êtes pas en mode strict, cela ne génère pas une erreur mais ne fait silencieusement rien.)

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: Impossible d'ajouter la propriété y;
//            l'objet n'est pas extensible
```

`Object.seal` fait la même chose que `Object.preventExtensions`, mais il marque également tous les attributs comme non configurables, ce qui signifie que vous ne pouvez pas les supprimer, ni changer leur énumérabilité, leur configurabilité ou leur capacité à être modifiés.

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: Impossible d'ajouter la propriété y;
//            l'objet n'est pas extensible
delete object.x;
// TypeError: Impossible de supprimer la propriété x
```

`Object.freeze` fait la même chose que `Object.seal`, mais il empêche également la modification des valeurs des attributs existants en les marquant comme non modifiables.

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: Impossible d'ajouter la propriété y;
//            l'objet n'est pas extensible
delete object.x;
// TypeError: Impossible de supprimer la propriété x
object.x = 3;
// TypeError: Impossible d'assigner à une propriété en lecture seule x
```

Prenons cet exemple concret, avec deux objets qui ont chacun un seul attribut `x`, et où nous empêchons ensuite toute extension du deuxième objet.

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

Cela commence comme nous le savons déjà, avec une transition de la forme vide vers une nouvelle forme contenant l'attribut `'x'` (représenté comme `Smi`). Lorsque nous empêchons les extensions à `b`, nous effectuons une transition spéciale vers une nouvelle forme marquée comme non extensible. Cette transition spéciale n'introduit aucun nouvel attribut — c'est vraiment juste un marqueur.

![](/_img/react-cliff/17-shape-nonextensible.svg)

Notez que nous ne pouvons pas simplement mettre à jour la forme avec `x` sur place, car elle est nécessaire pour l'autre objet `a`, qui est toujours extensible.

## Le problème de performance dans React

Rassemblons tout et utilisons ce que nous avons appris pour comprendre [le problème récent dans React #14365](https://github.com/facebook/react/issues/14365). Lorsque l'équipe React a analysé une application réelle, elle a remarqué une chute de performance étrange dans V8 qui affectait le cœur de React. Voici une version simplifiée du bug :

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

Nous avons un objet avec deux champs ayant la représentation `Smi`. Nous empêchons toute extension de l'objet et finalement forçons le deuxième champ à adopter la représentation `Double`.

Comme nous l'avons appris auparavant, cela crée approximativement cette configuration :

![](/_img/react-cliff/18-repro-shape-setup.svg)

Les deux attributs sont marqués comme ayant une représentation `Smi`, et la transition finale est la transition d'extensibilité pour marquer la forme comme non extensible.

Nous devons maintenant changer `y` pour une représentation `Double`, ce qui signifie que nous devons de nouveau commencer par trouver la forme divisée. Dans ce cas, c'est la forme qui a introduit `x`. Mais V8 s'est alors emmêlé, car la forme divisée était extensible alors que la forme actuelle était marquée comme non extensible. Et V8 ne savait pas vraiment comment rejouer correctement les transitions dans ce cas. V8 a donc essentiellement abandonné les efforts pour rendre cela compréhensible et a créé une forme séparée qui n'est pas connectée à l'arbre des formes existantes et qui n'est pas partagée avec d'autres objets. Pensez à cela comme une _forme orpheline_:

![](/_img/react-cliff/19-orphaned-shape.svg)

Vous pouvez imaginer que c'est assez mauvais si cela arrive à beaucoup d'objets, car cela rend tout le système de formes inutilisable.

Dans le cas de React, voici ce qui s'est passé : chaque `FiberNode` a quelques champs qui sont censés contenir des horodatages lorsque le profilage est activé.

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

Ces champs (comme `actualStartTime`) sont initialisés à `0` ou `-1` et ont donc au départ la représentation `Smi`. Mais plus tard, les horodatages en virgule flottante réels de [`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now) sont stockés dans ces champs, les poussant à adopter la représentation `Double`, car ils ne rentrent pas dans un `Smi`. En plus de cela, React empêche également les extensions aux instances de `FiberNode`.

Initialement, l'exemple simplifié ci-dessus ressemblait à ceci :

![](/_img/react-cliff/20-fibernode-shape.svg)

Il existe deux instances partageant un arbre de formes, fonctionnant toutes comme prévu. Mais ensuite, lorsque vous stockez le véritable horodatage, V8 est confus pour trouver la forme divisée :

![](/_img/react-cliff/21-orphan-islands.svg)

V8 attribue une nouvelle forme orpheline à `node1`, et la même chose se produit pour `node2` peu de temps après, ce qui entraîne deux _îlots orphelins_, chacun avec leurs propres formes disjointes. De nombreuses applications React réelles n'ont pas seulement deux, mais plutôt des dizaines de milliers de ces `FiberNode`. Comme vous pouvez l'imaginer, cette situation n'était pas particulièrement idéale pour les performances de V8.

Heureusement, [nous avons corrigé cette chute de performance](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/) dans [V8 v7.4](/blog/v8-release-74), et nous [cherchons à rendre les modifications de représentation des champs moins coûteuses](https://bit.ly/v8-in-place-field-representation-changes) pour supprimer toutes les chutes de performance restantes. Avec la correction, V8 fait désormais les choses correctement:

![](/_img/react-cliff/22-fix.svg)

Les deux instances de `FiberNode` pointent vers la forme non extensible où `'actualStartTime'` est un champ `Smi`. Lorsque la première affectation à `node1.actualStartTime` a lieu, une nouvelle chaîne de transition est créée et l'ancienne chaîne est marquée comme dépréciée:

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

Notez comment la transition d'extensibilité est désormais correctement rejouée dans la nouvelle chaîne.

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

Après l'affectation à `node2.actualStartTime`, les deux nœuds se réfèrent à la nouvelle forme, et la partie dépréciée de l'arbre de transition peut être nettoyée par le ramasse-miettes.

::note
**Remarque :** Vous pourriez penser que toute cette dépréciation/migration de formes est complexe, et vous auriez raison. En fait, nous avons une suspicion que sur des sites Web réels, cela cause plus de problèmes (en termes de performances, d'utilisation de mémoire et de complexité) que cela n'en résout, particulièrement car avec [la compression des pointeurs](https://bugs.chromium.org/p/v8/issues/detail?id=7703), nous ne pourrons plus l'utiliser pour stocker les champs de type double en ligne dans l'objet. Par conséquent, nous espérons [supprimer complètement le mécanisme de dépréciation des formes de V8](https://bugs.chromium.org/p/v8/issues/detail?id=9606). Vous pourriez dire que c'est _\*met ses lunettes de soleil\*_ en cours de dépréciation. _YEEEAAAHHH…_
::

L'équipe React [a atténué le problème de son côté](https://github.com/facebook/react/pull/14383) en s'assurant que tous les champs de temps et de durée sur les `FiberNode` commencent avec une représentation `Double` :

```js
class FiberNode {
  constructor() {
    // Forcer la représentation `Double` dès le départ.
    this.actualStartTime = Number.NaN;
    // Plus tard, vous pouvez toujours initialiser à la valeur souhaitée :
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

Au lieu de `Number.NaN`, toute valeur en virgule flottante qui ne correspond pas à la plage `Smi` pourrait être utilisée. Voici quelques exemples : `0.000001`, `Number.MIN_VALUE`, `-0`, et `Infinity`.

Il convient de noter que le bogue React concret était spécifique à V8 et qu'en général, les développeurs ne devraient pas optimiser pour une version spécifique d'un moteur JavaScript. Cependant, il est utile d'avoir une solution lorsque les choses ne fonctionnent pas.

Gardez à l'esprit que le moteur JavaScript fait de la magie sous le capot, et vous pouvez l'aider en évitant de mélanger les types si possible. Par exemple, n'initialisez pas vos champs numériques avec `null`, car cela désactive tous les avantages du suivi de représentation des champs et cela rend votre code plus lisible :

```js
// Ne faites pas cela !
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

En d'autres termes, **écrivez un code lisible, et les performances suivront !**

## Points à retenir

Nous avons abordé les points suivants dans cette analyse en profondeur :

- JavaScript distingue les “primitives” des “objets”, et `typeof` est un menteur.
- Même les valeurs ayant le même type JavaScript peuvent avoir des représentations différentes en coulisses.
- V8 tente de trouver la représentation optimale pour chaque propriété dans vos programmes JavaScript.
- Nous avons discuté de la manière dont V8 gère les dépréciations et les migrations des formes, y compris les transitions d'extensibilité.

Sur la base de ces connaissances, nous avons identifié quelques conseils pratiques de codage en JavaScript qui peuvent aider à améliorer les performances :

- Initialisez toujours vos objets de la même manière, afin que les formes puissent être efficaces.
- Choisissez des valeurs initiales sensées pour vos champs afin d'aider les moteurs JavaScript dans la sélection des représentations.
