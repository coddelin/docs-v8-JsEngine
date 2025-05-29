---
title: 'Private-Markenüberprüfungen, alias `#foo in obj`'
author: 'Marja Hölttä ([@marjakh](https://twitter.com/marjakh))'
avatars:
  - 'marja-holtta'
date: 2021-04-14
tags:
  - ECMAScript
description: 'Private-Markenüberprüfungen ermöglichen es, das Vorhandensein eines privaten Feldes in einem Objekt zu testen.'
tweet: '1382327454975590401'
---

Der [`in`-Operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) kann verwendet werden, um zu testen, ob das angegebene Objekt (oder ein beliebiges Objekt in seiner Prototypenkette) die angegebene Eigenschaft besitzt:

```javascript
const o1 = {'foo': 0};
console.log('foo' in o1); // true
const o2 = {};
console.log('foo' in o2); // false
const o3 = Object.create(o1);
console.log('foo' in o3); // true
```

Das Feature für Private-Markenüberprüfungen erweitert den `in`-Operator, um [private Klassenfelder](https://v8.dev/features/class-fields#private-class-fields) zu unterstützen:

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

A.test(new B()); // false; es ist nicht dasselbe #foo
```

Da private Namen nur innerhalb der Klasse verfügbar sind, die sie definiert, muss der Test auch innerhalb der Klasse erfolgen, beispielsweise in einer Methode wie `static test` oben.

Unterklasseninstanzen erhalten private Felder von der Elternklasse als Eigen-Eigenschaften:

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

Aber Objekte, die mit `Object.create` erstellt werden (oder deren Prototyp später über den `__proto__`-Setter oder `Object.setPrototypeOf` gesetzt wird), erhalten die privaten Felder nicht als Eigen-Eigenschaften. Da der Zugriff auf private Felder nur auf Eigen-Eigenschaften funktioniert, findet der `in`-Operator diese geerbten Felder nicht:

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, privates Feld wird geerbt und nicht besessen
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, privates Feld wird geerbt und nicht besessen
A.test(o2.__proto__); // true
```

Der Zugriff auf ein nicht vorhandenes privates Feld wirft einen Fehler - im Gegensatz zu normalen Eigenschaften, bei denen der Zugriff auf eine nicht vorhandene Eigenschaft `undefined` zurückgibt, aber keinen Fehler wirft. Vor den Private-Markenüberprüfungen waren Entwickler gezwungen, `try`-`catch` zu verwenden, um ein Fallback-Verhalten für Fälle zu implementieren, in denen ein Objekt das benötigte private Feld nicht hat:

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // Fallback für den Fall, dass obj nicht #foo hatte
    }
  }
  #foo = 0;
}
```

Jetzt kann das Vorhandensein des privaten Feldes mit einer Private-Markenüberprüfung getestet werden:

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // Fallback für den Fall, dass obj nicht #foo hatte
    }
  }
  #foo = 0;
}
```

Aber Vorsicht - das Vorhandensein eines privaten Feldes garantiert nicht, dass das Objekt alle privaten Felder hat, die in einer Klasse deklariert sind! Das folgende Beispiel zeigt ein halb-konstruiertes Objekt, das nur eines der zwei privaten Felder hat, die in seiner Klasse deklariert sind:

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
    throw 'error';
  })();
}

try {
  new F();
} catch {}

halfConstructed.m();
```

## Unterstützung für Private-Markenüberprüfungen

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
