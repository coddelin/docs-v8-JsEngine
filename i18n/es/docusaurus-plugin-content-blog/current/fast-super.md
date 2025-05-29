---
title: "Acceso súper rápido a propiedades `super`"
author: "[Marja Hölttä](https://twitter.com/marjakh), optimizadora super"
avatars:
  - marja-holtta
date: 2021-02-18
tags:
  - JavaScript
description: "Acceso más rápido a propiedades super en V8 v9.0"
tweet: "1362465295848333316"
---

La palabra clave [`super`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super) puede ser utilizada para acceder a propiedades y funciones en el objeto padre.

Anteriormente, acceder a una propiedad super (como `super.x`) se implementaba a través de una llamada en tiempo de ejecución. A partir de V8 v9.0, reutilizamos el [sistema de caché en línea (IC)](https://mathiasbynens.be/notes/shapes-ics) en código no optimizado y generamos el código optimizado adecuado para el acceso a propiedades super, sin necesidad de saltar al tiempo de ejecución.

<!--truncate-->
Como se puede ver en los gráficos debajo, el acceso a propiedades super solía ser un orden de magnitud más lento que el acceso a propiedades normales debido a la llamada en tiempo de ejecución. Ahora estamos mucho más cerca de estar a la par.

![Comparación entre acceso a propiedades super y acceso a propiedades normales, optimizado](/_img/fast-super/super-opt.svg)

![Comparación entre acceso a propiedades super y acceso a propiedades normales, no optimizado](/_img/fast-super/super-no-opt.svg)

El acceso a propiedades super es difícil de medir en un benchmark, ya que debe ocurrir dentro de una función. No podemos evaluar accesos individuales a propiedades, sino únicamente bloques de trabajo más grandes. Por lo tanto, la sobrecarga de la llamada a la función está incluida en la medición. Los gráficos anteriores subestiman algo la diferencia entre el acceso a propiedades super y el acceso a propiedades normales, pero son lo suficientemente precisos para demostrar la diferencia entre el acceso a propiedades super antiguo y el nuevo.

En el modo no optimizado (interpretado), el acceso a propiedades super siempre será más lento que el acceso a propiedades normales, ya que necesitamos hacer más lecturas (leyendo el objeto base desde el contexto y leyendo el `__proto__` desde el objeto base). En el código optimizado, ya incrustamos el objeto base como una constante siempre que sea posible. Esto podría mejorar aún más incrustando su `__proto__` como constante también.

### Herencia prototípica y `super`

Comencemos desde lo básico: ¿qué significa el acceso a propiedades super?

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

Ahora `A` es la clase padre de `B` y `b.m()` devuelve `100` como cabría esperar.

![Diagrama de herencia entre clases](/_img/fast-super/inheritance-1.svg)

La realidad de la [herencia prototípica en JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) es más complicada:

![Diagrama de herencia prototípica](/_img/fast-super/inheritance-2.svg)

Necesitamos distinguir cuidadosamente entre las propiedades `__proto__` y `prototype` - ¡no significan lo mismo! Para hacerlo más confuso, el objeto `b.__proto__` a menudo se refiere como "el prototipo de `b`".

`b.__proto__` es el objeto del cual `b` hereda propiedades. `B.prototype` es el objeto que será el `__proto__` de los objetos creados con `new B()`, es decir, `b.__proto__ === B.prototype`.

A su vez, `B.prototype` tiene su propia propiedad `__proto__` que es igual a `A.prototype`. Juntos, esto forma lo que se llama una cadena de prototipos:

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

A través de esta cadena, `b` puede acceder a todas las propiedades definidas en cualquiera de esos objetos. El método `m` es una propiedad de `B.prototype` — `B.prototype.m` — y es por esto que `b.m()` funciona.

Ahora podemos definir `super.x` dentro de `m` como una búsqueda de propiedad donde comenzamos buscando la propiedad `x` en el `__proto__` del *objeto base* y subimos por la cadena de prototipos hasta que la encontremos.

El objeto base es el objeto donde se define el método - en este caso el objeto base para `m` es `B.prototype`. Su `__proto__` es `A.prototype`, por lo que comenzamos buscando la propiedad `x` ahí. Llamaremos a `A.prototype` el *objeto inicial de la búsqueda*. En este caso encontramos la propiedad `x` inmediatamente en el objeto inicial de la búsqueda, pero en general también podría estar en algún lugar más arriba en la cadena de prototipos.

Si `B.prototype` tuviera una propiedad llamada `x`, la ignoraríamos, ya que comenzamos buscando por encima de ella en la cadena de prototipos. Además, en este caso la búsqueda de propiedades super no depende del *receptor* - el objeto que es el valor de `this` cuando se llama al método.

```javascript
B.prototype.m.call(some_other_object); // aún devuelve 100
```

Si la propiedad tiene un getter, sin embargo, el receptor será pasado al getter como el valor de `this`.

Para resumir: en un acceso a propiedad super, `super.x`, el objeto inicial de búsqueda es el `__proto__` del objeto base y el receptor es el receptor del método donde ocurre el acceso a propiedad super.

En un acceso a una propiedad normal, `o.x`, comenzamos buscando la propiedad `x` en `o` y subimos por la cadena de prototipos. También usaremos `o` como receptor si `x` resulta tener un getter: el objeto de inicio de búsqueda y el receptor son el mismo objeto (`o`).

*El acceso a propiedades `super` es como el acceso regular a propiedades, pero el objeto de inicio de búsqueda y el receptor son diferentes.*

### Implementar `super` más rápido

La realización anterior es también clave para implementar un acceso rápido a las propiedades `super`. V8 ya está diseñado para hacer rápido el acceso a propiedades; ahora lo hemos generalizado para el caso en el que el receptor y el objeto de inicio de búsqueda son diferentes.

El sistema de caché en línea basado en datos de V8 es la parte central para implementar un acceso rápido a propiedades. Puedes leer sobre él en [la introducción de alto nivel](https://mathiasbynens.be/notes/shapes-ics) enlazada más arriba, o en las descripciones más detalladas sobre [la representación de objetos en V8](https://v8.dev/blog/fast-properties) y [cómo está implementado el sistema de caché en línea basado en datos de V8](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing).

Para acelerar `super`, hemos agregado un nuevo bytecode de [Ignition](https://v8.dev/docs/ignition), `LdaNamedPropertyFromSuper`, que nos permite conectarnos al sistema IC en el modo interpretado y también generar código optimizado para el acceso a propiedades `super`.

Con el nuevo bytecode, podemos añadir un nuevo IC, `LoadSuperIC`, para acelerar las cargas de propiedades `super`. Similar a `LoadIC`, que maneja las cargas de propiedades normales, `LoadSuperIC` realiza un seguimiento de las formas de los objetos de inicio de búsqueda que ha encontrado y recuerda cómo cargar propiedades de los objetos que tienen una de esas formas.

`LoadSuperIC` reutiliza la maquinaria IC existente para cargas de propiedades, pero con un objeto de inicio de búsqueda diferente. Como la capa IC ya distinguía entre el objeto de inicio de búsqueda y el receptor, la implementación debería haber sido sencilla. Pero como el objeto de inicio de búsqueda y el receptor siempre eran iguales, había errores donde usábamos el objeto de inicio de búsqueda aunque queríamos usar el receptor, y viceversa. Esos errores han sido corregidos y ahora admitimos correctamente los casos en los que el objeto de inicio de búsqueda y el receptor son diferentes.

El código optimizado para el acceso a propiedades `super` es generado por la fase `JSNativeContextSpecialization` del compilador [TurboFan](https://v8.dev/docs/turbofan). La implementación generaliza la maquinaria de búsqueda de propiedades existente ([`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130)) para manejar el caso en el que el receptor y el objeto de inicio de búsqueda son diferentes.

El código optimizado se volvió aún más óptimo cuando movimos el objeto de origen fuera del `JSFunction` donde estaba almacenado. Ahora está almacenado en el contexto de la clase, lo que permite a TurboFan incrustarlo como una constante en el código optimizado siempre que sea posible.

## Otros usos de `super`

`super` dentro de métodos literales de objeto funciona igual que dentro de métodos de clase, y está optimizado de manera similar.

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // devuelve 100
```

Por supuesto, hay casos especiales que no hemos optimizado. Por ejemplo, escribir propiedades `super` (`super.x = ...`) no está optimizado. Además, usar mixins convierte el sitio de acceso en megamórfico, lo que conduce a un acceso más lento a las propiedades `super`:

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ este sitio de acceso es megamórfico
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

Aún queda trabajo por hacer para asegurarnos de que todos los patrones orientados a objetos sean tan rápidos como pueden ser: ¡permanece atento para más optimizaciones!
