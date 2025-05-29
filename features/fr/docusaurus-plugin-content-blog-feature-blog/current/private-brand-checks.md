---
title: &apos;Vérifications des marques privées alias `#foo in obj`&apos;
author: &apos;Marja Hölttä ([@marjakh](https://twitter.com/marjakh))&apos;
avatars:
  - &apos;marja-holtta&apos;
date: 2021-04-14
tags:
  - ECMAScript
description: &apos;Les vérifications des marques privées permettent de tester l&apos;existence d&apos;un champ privé dans un objet.&apos;
tweet: &apos;1382327454975590401&apos;
---

L&apos;[opérateur `in`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) peut être utilisé pour tester si l&apos;objet donné (ou tout objet dans sa chaîne de prototypes) possède la propriété donnée :

```javascript
const o1 = {&apos;foo&apos;: 0};
console.log(&apos;foo&apos; in o1); // true
const o2 = {};
console.log(&apos;foo&apos; in o2); // false
const o3 = Object.create(o1);
console.log(&apos;foo&apos; in o3); // true
```

La fonctionnalité des vérifications des marques privées étend l&apos;opérateur `in` pour prendre en charge les [champs privés des classes](https://v8.dev/features/class-fields#private-class-fields):

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }
  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false

class B {
  #foo = 0;
}

A.test(new B()); // false; ce n&apos;est pas le même #foo
```

Puisque les noms privés ne sont disponibles qu&apos;à l&apos;intérieur de la classe qui les définit, le test doit également avoir lieu à l&apos;intérieur de la classe, par exemple dans une méthode comme `static test` ci-dessus.

Les instances de sous-classe reçoivent les champs privés de la classe parente en tant que propriétés propres :

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

Mais les objets créés avec `Object.create` (ou dont le prototype est défini ultérieurement via le modificateur `__proto__` ou `Object.setPrototypeOf`) ne reçoivent pas les champs privés en tant que propriétés propres. Comme la recherche de champs privés ne fonctionne que sur les propriétés propres, l&apos;opérateur `in` ne trouve pas ces champs hérités :

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, le champ privé est hérité et non possédé
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, le champ privé est hérité et non possédé
A.test(o2.__proto__); // true
```

Accéder à un champ privé inexistant génère une erreur - contrairement aux propriétés normales, où l&apos;accès à une propriété inexistante retourne `undefined` mais ne génère pas d&apos;erreur. Avant les vérifications des marques privées, les développeurs étaient obligés d&apos;utiliser un `try`-`catch` pour implémenter un comportement de repli dans les cas où un objet n&apos;a pas le champ privé requis :

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // Comportement de repli pour le cas où obj n&apos;avait pas #foo
    }
  }
  #foo = 0;
}
```

Maintenant, l&apos;existence du champ privé peut être testée en utilisant une vérification de marque privée :

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // Comportement de repli pour le cas où obj n&apos;avait pas #foo
    }
  }
  #foo = 0;
}
```

Mais attention - l&apos;existence d&apos;un champ privé ne garantit pas que l&apos;objet possède tous les champs privés déclarés dans une classe ! L&apos;exemple suivant montre un objet à moitié construit qui ne possède qu&apos;un des deux champs privés déclarés dans sa classe :

```javascript
let halfConstructed;
class F {
  m() {
    console.log(#x in this); // true
    console.log(#y in this); // false
  }
  #x = 0;
  #y = (() => {
    halfConstructed = this;
    throw &apos;error&apos;;
  })();
}

try {
  new F();
} catch {}

halfConstructed.m();
```

## Prise en charge des vérifications des marques privées

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
