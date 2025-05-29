---
title: 'Blocs d'initialisation statiques des classes'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2021-03-30
tags:
  - ECMAScript
description: 'Les classes JavaScript bénéficient d'une syntaxe dédiée pour l'initialisation statique.'
tweet: '1376925666780798989'
---
La nouvelle syntaxe des blocs d'initialisation statiques des classes permet aux développeurs de regrouper le code qui doit s'exécuter une fois pour une définition de classe donnée dans un seul endroit. Considérons l'exemple suivant où un générateur de nombres pseudo-aléatoires utilise un bloc statique pour initialiser un pool d'entropie une fois, lorsque la définition de `class MyPRNG` est évaluée.

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error('Pool d'entropie épuisé');
      }
      seed = MyPRNG.entropyPool.pop();
    }
    this.seed = seed;
  }

  getRandom() { … }

  static entropyPool = [];
  static {
    for (let i = 0; i < 512; i++) {
      this.entropyPool.push(probeEntropySource());
    }
  }
}
```

## Portée

Chaque bloc d'initialisation statique dispose de sa propre portée `var` et `let`/`const`. Comme dans les initialisateurs de champ statique, la valeur de `this` dans les blocs statiques est le constructeur de la classe elle-même. De même, `super.property` à l'intérieur d'un bloc statique fait référence à la propriété statique de la classe parente.

```js
var y = 'y extérieur';
class A {
  static fieldA = 'A.fieldA';
}
class B extends A {
  static fieldB = 'B.fieldB';
  static {
    let x = super.fieldA;
    // → 'A.fieldA'
    var y = this.fieldB;
    // → 'B.fieldB'
  }
}
// Comme les blocs statiques ont leur propre portée `var`, les `var` ne se surélèvent pas !
y;
// → 'y extérieur'
```

## Blocs multiples

Une classe peut avoir plus d'un bloc d'initialisation statique. Ces blocs sont évalués dans l'ordre textuel. De plus, s'il existe des champs statiques, tous les éléments statiques sont évalués dans l'ordre textuel.

```js
class C {
  static field1 = console.log('champ 1');
  static {
    console.log('bloc statique 1');
  }
  static field2 = console.log('champ 2');
  static {
    console.log('bloc statique 2');
  }
}
// → champ 1
//   bloc statique 1
//   champ 2
//   bloc statique 2
```

## Accès aux champs privés

Étant donné qu'un bloc d'initialisation statique de classe est toujours imbriqué à l'intérieur d'une classe, il a accès aux champs privés de cette classe.

```js
let getDPrivateField;
class D {
  #privateField;
  constructor(v) {
    this.#privateField = v;
  }
  static {
    getDPrivateField = (d) => d.#privateField;
  }
}
getDPrivateField(new D('privé'));
// → privé
```

C'est à peu près tout. Bonne orientation objet !

## Support des blocs d'initialisation statique des classes

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="non"
                 safari="non"
                 nodejs="non"
                 babel="oui https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
