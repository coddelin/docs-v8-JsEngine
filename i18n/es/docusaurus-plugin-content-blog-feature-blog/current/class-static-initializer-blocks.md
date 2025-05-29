---
title: &apos;Bloques de inicialización estática de clases&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-03-30
tags:
  - ECMAScript
description: &apos;Las clases de JavaScript obtienen una sintaxis dedicada para la inicialización estática.&apos;
tweet: &apos;1376925666780798989&apos;
---
La nueva sintaxis del bloque de inicialización estática de clases permite a los desarrolladores reunir el código que debe ejecutarse una vez para una definición de clase dada y colocarlo en un solo lugar. Considere el siguiente ejemplo, donde un generador de números pseudoaleatorios utiliza un bloque estático para inicializar un grupo de entropía una vez, cuando se evalúa la definición de `class MyPRNG`.

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error(&apos;Grupo de entropía agotado&apos;);
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

## Alcance

Cada bloque de inicialización estática es su propio alcance de `var` y `let`/`const`. Al igual que en los inicializadores de campos estáticos, el valor de `this` en los bloques estáticos es el propio constructor de la clase. De manera similar, `super.property` dentro de un bloque estático se refiere a la propiedad estática de la clase superior.

```js
var y = &apos;y exterior&apos;;
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
// Dado que los bloques estáticos son su propio alcance de `var`, ¡los `var` no realizan hoisting!
y;
// → &apos;y exterior&apos;
```

## Múltiples bloques

Una clase puede tener más de un bloque de inicialización estática. Estos bloques se evalúan en orden textual. Además, si hay campos estáticos, todos los elementos estáticos se evalúan en orden textual.

```js
class C {
  static field1 = console.log(&apos;campo 1&apos;);
  static {
    console.log(&apos;bloque estático 1&apos;);
  }
  static field2 = console.log(&apos;campo 2&apos;);
  static {
    console.log(&apos;bloque estático 2&apos;);
  }
}
// → campo 1
//   bloque estático 1
//   campo 2
//   bloque estático 2
```

## Acceso a campos privados

Dado que un bloque de inicialización estática de clase siempre está anidado dentro de una clase, tiene acceso a los campos privados de esa clase.

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
getDPrivateField(new D(&apos;privado&apos;));
// → privado
```

Eso es todo. ¡Feliz orientación a objetos!

## Soporte para bloque de inicialización estática de clases

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
