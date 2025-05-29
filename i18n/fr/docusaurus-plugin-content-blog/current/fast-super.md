---
title: 'Accès ultra-rapide aux propriétés `super`'
author: '[Marja Hölttä](https://twitter.com/marjakh), optimiseur super'
avatars:
  - marja-holtta
date: 2021-02-18
tags:
  - JavaScript
description: 'Accès plus rapide aux propriétés super dans V8 v9.0'
tweet: '1362465295848333316'
---

Le [mot-clé `super`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super) peut être utilisé pour accéder aux propriétés et fonctions présentes sur l'objet parent.

Auparavant, l'accès à une propriété super (comme `super.x`) était implémenté via un appel au runtime. À partir de V8 v9.0, nous réutilisons le [système de cache en ligne (IC)](https://mathiasbynens.be/notes/shapes-ics) dans le code non optimisé et générons le code optimisé approprié pour l'accès aux propriétés super, sans avoir à appeler le runtime.

<!--truncate-->
Comme vous pouvez le voir sur les graphiques ci-dessous, l'accès aux propriétés super était d'un ordre de grandeur plus lent que l'accès normal aux propriétés en raison de l'appel au runtime. Nous sommes maintenant beaucoup plus proches de la parité.

![Comparer l'accès aux propriétés super à l'accès régulier aux propriétés, optimisé](/_img/fast-super/super-opt.svg)

![Comparer l'accès aux propriétés super à l'accès régulier aux propriétés, non optimisé](/_img/fast-super/super-no-opt.svg)

L'accès aux propriétés super est difficile à mesurer, car cela doit se produire à l'intérieur d'une fonction. Nous ne pouvons pas mesurer individuellement les accès aux propriétés, uniquement des blocs de travail plus importants. Par conséquent, le surcoût des appels de fonctions est inclus dans la mesure. Les graphiques ci-dessus sous-estiment quelque peu la différence entre l'accès aux propriétés super et l'accès normal aux propriétés, mais ils sont suffisamment précis pour démontrer la différence entre l'ancien et le nouvel accès aux propriétés super.

Dans le mode non optimisé (interprété), l'accès aux propriétés super sera toujours plus lent que l'accès normal aux propriétés, car nous devons effectuer plus de lectures (lire l'objet d'origine depuis le contexte et lire le `__proto__` depuis l'objet d'origine). Dans le code optimisé, nous intégrons déjà l'objet d'origine comme une constante dès que cela est possible. Cela pourrait être encore amélioré en intégrant également son `__proto__` comme constante.

### Héritage par prototypage et `super`

Commençons par les bases - que signifie l'accès aux propriétés super ?

```javascript
class A { }
A.prototype.x = 100;

class B extends A {
  m() {
    return super.x;
  }
}
const b = new B();
b.m();
```

Maintenant, `A` est la classe parente de `B` et `b.m()` retourne `100` comme prévu.

![Diagramme d'héritage de classes](/_img/fast-super/inheritance-1.svg)

La réalité de [l'héritage par prototypage en JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) est plus complexe :

![Diagramme d'héritage par prototypage](/_img/fast-super/inheritance-2.svg)

Nous devons distinguer soigneusement les propriétés `__proto__` et `prototype` - elles ne signifient pas la même chose ! Pour rendre cela encore plus confus, l'objet `b.__proto__` est souvent appelé « prototype de `b` ».

`b.__proto__` est l'objet depuis lequel `b` hérite des propriétés. `B.prototype` est l'objet qui sera le `__proto__` des objets créés avec `new B()`, c'est-à-dire `b.__proto__ === B.prototype`.

À son tour, `B.prototype` a sa propre propriété `__proto__` qui est égale à `A.prototype`. Ensemble, cela forme ce que l'on appelle une chaîne de prototypes :

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

À travers cette chaîne, `b` peut accéder à toutes les propriétés définies dans l'un de ces objets. La méthode `m` est une propriété de `B.prototype` — `B.prototype.m` — et c'est pourquoi `b.m()` fonctionne.

Nous pouvons maintenant définir `super.x` à l'intérieur de `m` comme une recherche de propriété où nous commençons à chercher la propriété `x` dans le `__proto__` de l'*objet d'origine* et remontons la chaîne de prototypes jusqu'à ce que nous la trouvions.

L'objet d'origine est l'objet où la méthode est définie - dans ce cas, l'objet d'origine pour `m` est `B.prototype`. Son `__proto__` est `A.prototype`, donc c'est là que nous commençons à chercher la propriété `x`. Nous appelons `A.prototype` l'*objet de début de recherche*. Dans ce cas, nous trouvons la propriété `x` immédiatement dans l'objet de début de recherche, mais en général elle pourrait aussi se trouver quelque part plus haut dans la chaîne de prototypes.

Si `B.prototype` avait une propriété appelée `x`, nous l'ignorerions, car nous commençons à chercher au-dessus dans la chaîne de prototypes. De plus, dans ce cas, la recherche de propriété super ne dépend pas du *récepteur* - l'objet qui est la valeur `this` lors de l'appel de la méthode.

```javascript
B.prototype.m.call(some_other_object); // retourne toujours 100
```

Toutefois, si la propriété possède un getter, le récepteur sera passé au getter comme valeur de `this`.

Pour résumer : dans un accès aux propriétés super, `super.x`, l'objet de début de recherche est le `__proto__` de l'objet d'origine et le récepteur est le récepteur de la méthode où l'accès aux propriétés super se produit.

Dans un accès normal à une propriété, `o.x`, nous commençons par chercher la propriété `x` dans `o` et parcourons la chaîne de prototypes. Nous utiliserons également `o` comme récepteur si `x` a un accesseur - l'objet de départ de la recherche et le récepteur sont le même objet (`o`).

*L'accès à une propriété `super` est similaire à un accès normal où l'objet de départ de la recherche et le récepteur sont différents.*

### Implémentation d'un `super` plus rapide

La réalisation ci-dessus est également la clé pour implémenter un accès rapide aux propriétés `super`. V8 est déjà conçu pour rendre l'accès aux propriétés rapide - nous l'avons maintenant généralisé pour le cas où le récepteur et l'objet de départ de la recherche diffèrent.

Le système de cache en ligne basé sur les données de V8 est la partie centrale de l'implémentation d'un accès rapide aux propriétés. Vous pouvez en lire davantage dans [l'introduction générale](https://mathiasbynens.be/notes/shapes-ics) liée ci-dessus, ou dans les descriptions plus détaillées de [la représentation des objets dans V8](https://v8.dev/blog/fast-properties) et [l'implémentation du système de cache en ligne basé sur les données de V8](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing).

Pour accélérer `super`, nous avons ajouté un nouveau bytecode pour [Ignition](https://v8.dev/docs/ignition), `LdaNamedPropertyFromSuper`, qui nous permet de nous brancher sur le système de cache en mode interprété et de générer un code optimisé pour l'accès aux propriétés `super`.

Avec ce nouveau bytecode, nous pouvons ajouter un nouvel IC, `LoadSuperIC`, pour accélérer les chargements des propriétés `super`. Similaire à `LoadIC` qui gère les chargements de propriétés normales, `LoadSuperIC` garde une trace des formes des objets de départ de la recherche qu'il a vus et mémorise comment charger les propriétés à partir des objets ayant l'une de ces formes.

`LoadSuperIC` réutilise la machinerie IC existante pour les chargements de propriétés, mais avec un objet de départ différent. Comme la couche IC distinguait déjà l'objet de départ de la recherche et le récepteur, l'implémentation aurait dû être simple. Mais comme l'objet de départ et le récepteur étaient toujours les mêmes, il y avait des bugs où nous utilisions l'objet de départ même si nous voulions dire le récepteur, et vice versa. Ces bugs ont été corrigés et nous prenons désormais correctement en charge les cas où l'objet de départ de la recherche et le récepteur diffèrent.

Le code optimisé pour l'accès aux propriétés `super` est généré par la phase `JSNativeContextSpecialization` du compilateur [TurboFan](https://v8.dev/docs/turbofan). L'implémentation généralise la machinerie existante de recherche de propriétés ([`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130)) pour gérer le cas où le récepteur et l'objet de départ de la recherche diffèrent.

Le code optimisé est devenu encore plus performant lorsque nous avons déplacé l'objet parent hors de la `JSFunction` où il était stocké. Il est désormais stocké dans le contexte de la classe, ce qui permet à TurboFan de l'intégrer dans le code optimisé comme une constante lorsque cela est possible.

## Autres usages de `super`

`super` à l'intérieur des méthodes des objets littéraux fonctionne de la même manière qu'à l'intérieur des méthodes des classes, et est optimisé de manière similaire.

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // renvoie 100
```

Il existe bien sûr des cas limites pour lesquels nous n'avons pas optimisé. Par exemple, l'écriture de propriétés `super` (`super.x = ...`) n'est pas optimisée. De plus, l'utilisation de mixins rend le site d'accès mégamorphique, ce qui conduit à un accès plus lent aux propriétés `super` :

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ ce site d'accès est mégamorphique
  }
  return Mixin;
}

class Base {
  m() { return 0; }
}

const myClass = createMixin(
  createMixin(
    createMixin(
      createMixin(
        createMixin(Base)
      )
    )
  )
);
(new myClass()).m();
```

Il reste encore du travail à faire pour s'assurer que tous les modèles orientés objet soient aussi rapides que possible - restez à l'écoute pour de futures optimisations !
