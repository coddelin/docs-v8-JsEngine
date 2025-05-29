---
title: "Campos de clase públicos y privados"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: "Varias propuestas amplían la sintaxis existente de clases en JavaScript con nuevas funcionalidades. Este artículo explica la nueva sintaxis de campos de clase públicos en V8 v7.2 y Chrome 72, así como la próxima sintaxis de campos de clase privados."
tweet: "1121395767170740225"
---
Varias propuestas amplían la sintaxis existente de clases en JavaScript con nuevas funcionalidades. Este artículo explica la nueva sintaxis de campos de clase públicos en V8 v7.2 y Chrome 72, así como la próxima sintaxis de campos de clase privados.

Aquí hay un ejemplo de código que crea una instancia de una clase llamada `IncreasingCounter`:

```js
const counter = new IncreasingCounter();
counter.value;
// registros '¡Obteniendo el valor actual!'
// → 0
counter.increment();
counter.value;
// registros '¡Obteniendo el valor actual!'
// → 1
```

Nota que acceder a `value` ejecuta algún código (es decir, registra un mensaje) antes de devolver el resultado. Ahora pregúntate, ¿cómo implementarías esta clase en JavaScript? 🤔

## Sintaxis de clases de ES2015

Aquí se muestra cómo `IncreasingCounter` podría implementarse utilizando la sintaxis de clases de ES2015:

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log('¡Obteniendo el valor actual!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

La clase instala el getter `value` y un método `increment` en el prototipo. Más interesante aún, la clase tiene un constructor que crea una propiedad de instancia `_count` y establece su valor predeterminado en `0`. Actualmente, tendemos a usar el prefijo de guion bajo para denotar que `_count` no debería ser utilizado directamente por los consumidores de la clase, pero eso es solo una convención; no es realmente una propiedad "privada" con semántica especial aplicada por el lenguaje.

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// registros '¡Obteniendo el valor actual!'
// → 0

// Nada impide que las personas lean o interfieran con la
// propiedad de instancia `_count`. 😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// registros '¡Obteniendo el valor actual!'
// → 42
```

## Campos de clase públicos

La nueva sintaxis de campos de clase públicos nos permite simplificar la definición de la clase:

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log('¡Obteniendo el valor actual!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

La propiedad `_count` ahora está declarada de manera ordenada en la parte superior de la clase. Ya no necesitamos un constructor solo para definir algunos campos. ¡Genial!

Sin embargo, el campo `_count` sigue siendo una propiedad pública. En este ejemplo particular, queremos evitar que las personas accedan directamente a la propiedad.

## Campos de clase privados

Es aquí donde entran en juego los campos de clase privados. La nueva sintaxis de campos privados es similar a los campos públicos, excepto que [marcas el campo como privado usando `#`](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md). Puedes pensar en el `#` como parte del nombre del campo:

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('¡Obteniendo el valor actual!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Los campos privados no son accesibles fuera del cuerpo de la clase:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## Propiedades estáticas públicas y privadas

La sintaxis de campos de clase puede usarse para crear propiedades y métodos estáticos públicos y privados también:

```js
class FakeMath {
  // `PI` es una propiedad estática pública.
  static PI = 22 / 7; // Lo suficientemente cerca.

  // `#totallyRandomNumber` es una propiedad estática privada.
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber` es un método estático privado.
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random` es un método estático público (sintaxis ES2015)
  // que utiliza `#computeRandomNumber`.
  static random() {
    console.log('He oído que te gustan los números aleatorios…');
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// registros 'He oído que te gustan los números aleatorios…'
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## Subclasificación más sencilla

Los beneficios de la sintaxis de campos de clase se vuelven aún más claros al trabajar con subclases que introducen campos adicionales. Imagina la siguiente clase base `Animal`:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

Para crear una subclase `Cat` que introduzca una propiedad de instancia adicional, anteriormente tendrías que llamar a `super()` para ejecutar el constructor de la clase base `Animal` antes de crear la propiedad:

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('¡Miau!');
  }
}
```

Es mucha preparación solo para indicar que los gatos no disfrutan los baños. Afortunadamente, la sintaxis de campos de clase elimina la necesidad de todo el constructor, incluida la llamada incómoda a `super()`:

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('¡Miau!');
  }
}
```

## Soporte de características

### Soporte para campos de clase públicos

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="sí https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="sí https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="sí https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Soporte para campos de clase privados

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="sí"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="sí https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Soporte para métodos privados y accesorios

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="sí https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="sí https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
