---
title: &apos;Statische Initialisierungsblöcke von Klassen&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-03-30
tags:
  - ECMAScript
description: &apos;JavaScript-Klassen erhalten eigens entwickelte Syntax für statische Initialisierung.&apos;
tweet: &apos;1376925666780798989&apos;
---
Die neue Syntax der statischen Initialisierungsblöcke ermöglicht es Entwicklern, Code zu bündeln, der einmal für eine bestimmte Klassendefinition ausgeführt werden soll, und ihn an einem einzigen Ort zu platzieren. Betrachten Sie das folgende Beispiel, bei dem ein Pseudo-Zufallszahlengenerator einen statischen Block verwendet, um einmalig einen Entropie-Pool zu initialisieren, wenn die `class MyPRNG`-Definition ausgewertet wird.

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error(&apos;Entropie-Pool erschöpft&apos;);
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

## Scope

Jeder statische Initialisierungsblock hat seinen eigenen `var`- und `let`/`const`-Scope. Wie bei statischen Feldinitialisierungen bezieht sich der `this`-Wert in statischen Blöcken auf die Klassenkonstruktorfunktion selbst. Ebenso bezieht sich `super.property` innerhalb eines statischen Blocks auf die statische Eigenschaft der Superklasse.

```js
var y = &apos;äußeres y&apos;;
class A {
  static fieldA = &apos;A.fieldA&apos;;
}
class B extends A {
  static fieldB = &apos;B.fieldB&apos;;
  static {
    let x = super.fieldA;
    // → &apos;A.fieldA&apos;
    var y = this.fieldB;
    // → &apos;B.fieldB&apos;
  }
}
// Da statische Blöcke ihren eigenen `var`-Scope haben, werden `var`s nicht gehoben!
y;
// → &apos;äußeres y&apos;
```

## Mehrere Blöcke

Eine Klasse kann mehr als einen statischen Initialisierungsblock haben. Diese Blöcke werden in der Reihenfolge ihres Auftretens ausgewertet. Wenn es statische Felder gibt, werden zudem alle statischen Elemente in der Reihenfolge ihres Auftretens ausgewertet.

```js
class C {
  static field1 = console.log(&apos;Feld 1&apos;);
  static {
    console.log(&apos;statischer Block 1&apos;);
  }
  static field2 = console.log(&apos;Feld 2&apos;);
  static {
    console.log(&apos;statischer Block 2&apos;);
  }
}
// → Feld 1
//   statischer Block 1
//   Feld 2
//   statischer Block 2
```

## Zugriff auf private Felder

Da ein statischer Initialisierungsblock einer Klasse immer innerhalb einer Klasse verschachtelt ist, hat er Zugriff auf die privaten Felder dieser Klasse.

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
getDPrivateField(new D(&apos;privat&apos;));
// → privat
```

Das war's. Viel Spaß beim Arbeiten mit objektorientierter Programmierung!

## Unterstützung für statische Initialisierungsblöcke in Klassen

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
