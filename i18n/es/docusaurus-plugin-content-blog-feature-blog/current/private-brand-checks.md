---
title: "Verificaciones de marca privada, también conocido como `#foo in obj`"
author: "Marja Hölttä ([@marjakh](https://twitter.com/marjakh))"
avatars: 
  - "marja-holtta"
date: 2021-04-14
tags: 
  - ECMAScript
description: "Las verificaciones de marca privada permiten comprobar la existencia de un campo privado en un objeto."
tweet: "1382327454975590401"
---

El operador [`in`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) puede ser usado para comprobar si un objeto dado (o cualquier objeto en su cadena de prototipos) tiene la propiedad especificada:

```javascript
const o1 = {'foo': 0};
console.log('foo' in o1); // true
const o2 = {};
console.log('foo' in o2); // false
const o3 = Object.create(o1);
console.log('foo' in o3); // true
```

La característica de verificaciones de marca privada extiende el operador `in` para soportar [campos privados de clase](https://v8.dev/features/class-fields#private-class-fields):

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

A.test(new B()); // false; no es el mismo #foo
```

Dado que los nombres privados solo están disponibles dentro de la clase que los define, la prueba también debe ocurrir dentro de la clase, por ejemplo, en un método como `static test` arriba.

Las instancias de subclases reciben campos privados de la clase padre como propiedades propias:

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

Pero los objetos creados con `Object.create` (o que tienen el prototipo configurado más tarde mediante el setter `__proto__` o `Object.setPrototypeOf`) no reciben los campos privados como propiedades propias. Debido a que la búsqueda de campos privados solo funciona en propiedades propias, el operador `in` no encuentra estos campos heredados:

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, el campo privado es heredado y no propio
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, el campo privado es heredado y no propio
A.test(o2.__proto__); // true
```

Acceder a un campo privado inexistente genera un error, a diferencia de las propiedades normales, donde acceder a una propiedad inexistente devuelve `undefined` pero no genera excepciones. Antes de las verificaciones de marca privada, los desarrolladores se veían obligados a usar un bloque `try`-`catch` para implementar un comportamiento alternativo en casos donde un objeto no tuviera el campo privado necesario:

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // Alternativa para el caso en que obj no tuviera #foo
    }
  }
  #foo = 0;
}
```

Ahora la existencia del campo privado puede ser comprobada usando una verificación de marca privada:

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // Alternativa para el caso en que obj no tuviera #foo
    }
  }
  #foo = 0;
}
```

Pero ten cuidado: la existencia de un campo privado no garantiza que el objeto tenga todos los campos privados declarados en una clase. El siguiente ejemplo muestra un objeto parcialmente construido que tiene solo uno de los dos campos privados declarados en su clase:

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

## Soporte para verificación de marca privada

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
