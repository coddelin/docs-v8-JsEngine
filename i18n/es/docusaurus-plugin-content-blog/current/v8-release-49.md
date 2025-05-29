---
title: &apos;Lanzamiento de V8 v4.9&apos;
author: &apos;el equipo de V8&apos;
date: 2016-01-26 13:33:37
tags:
  - lanzamiento
description: &apos;V8 v4.9 incluye una implementación mejorada de `Math.random` y añade soporte para varias características nuevas del lenguaje ES2015.&apos;
---
Aproximadamente cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro Git de V8 inmediatamente antes de que Chrome genere una rama para un hito en Chrome Beta. Hoy estamos encantados de anunciar nuestra rama más reciente, [V8 versión 4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9), que estará en beta hasta que sea lanzada en coordinación con la versión estable de Chrome 49. V8 4.9 está llena de todo tipo de mejoras dirigidas a desarrolladores, por lo que nos gustaría ofrecerte un adelanto de algunos de los aspectos destacados en anticipación a su lanzamiento dentro de varias semanas.

<!--truncate-->
## 91% de soporte para ECMAScript 2015 (ES6)

En el lanzamiento de V8 4.9, incluimos más características de JavaScript ES2015 que en cualquier versión anterior, alcanzando un 91% de finalización según la [tabla de compatibilidad de Kangax](https://kangax.github.io/compat-table/es6/) (hasta el 26 de enero). V8 ahora soporta desestructuración, parámetros por defecto, objetos Proxy y la API Reflect. La versión 4.9 también hace que las construcciones de nivel de bloque como `class` y `let` estén disponibles fuera del modo estricto y añade soporte para la bandera sticky en expresiones regulares y para la personalización de la salida de `Object.prototype.toString`.

### Desestructuración

Las declaraciones de variables, parámetros y asignaciones ahora soportan la [desestructuración](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) de objetos y arreglos mediante patrones. Por ejemplo:

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

Los patrones de arreglo pueden contener patrones de resto que se asignan al resto del arreglo:

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

Además, los elementos de los patrones pueden tener valores por defecto, que se usan en caso de que la propiedad respectiva no tenga coincidencia:

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// o…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

La desestructuración puede usarse para hacer el acceso a datos de objetos y arreglos más compacto.

### Proxies y Reflect

Después de años de desarrollo, V8 ahora incluye una implementación completa de [proxies](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Proxy), actualizada con la especificación ES2015. Los proxies son un mecanismo poderoso para virtualizar objetos y funciones mediante un conjunto de ganchos proporcionados por el desarrollador para personalizar accesos a propiedades. Además de la virtualización de objetos, los proxies se pueden usar para implementar interceptación, añadir validación al establecimiento de propiedades, simplificar la depuración y el análisis de rendimiento, y desbloquear abstracciones avanzadas como [membranas](http://tvcutsem.github.io/js-membranes/).

Para hacer proxy a un objeto, debes crear un objeto de manejador que defina varias trampas y aplicarlo al objeto objetivo que el proxy virtualiza:

```js
const target = {};
const handler = {
  get(target, name=&apos;mundo&apos;) {
    return `Hola, ${name}!`;
  }
};

const foo = new Proxy(target, handler);
foo.bar;
// → &apos;Hola, bar!&apos;
```

El objeto Proxy va acompañado del módulo Reflect, que define valores predeterminados adecuados para todas las trampas de proxy:

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`Depuración: llamada a get para el campo: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`Depuración: llamada a set para el campo: ${name}, y valor: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = &apos;John Doe&apos;;
// Depuración: llamada a set para el campo: name, y valor: John Doe
const title = `Sr. ${debugMe.name}`; // → &apos;Sr. John Doe&apos;
// Depuración: llamada a get para el campo: name
```

Para más información sobre el uso de Proxies y la API Reflect, consulta la sección de ejemplos de la [página de Proxy en MDN](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Examples).

### Parámetros por defecto

En ES5 y versiones anteriores, los parámetros opcionales en las definiciones de funciones requerían programación repetitiva para verificar si los parámetros eran indefinidos:

```js
function sublist(list, start, end) {
  if (typeof start === &apos;undefined&apos;) start = 0;
  if (typeof end === &apos;undefined&apos;) end = list.length;
  ...
}
```

ES2015 ahora permite que los parámetros de las funciones tengan [valores por defecto](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Functions/Default_parameters), permitiendo definiciones de funciones más claras y concisas:

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

Los parámetros por defecto y la destructuración se pueden combinar, por supuesto:

```js
function vector([x, y, z] = []) { … }
```

### Clases y declaraciones léxicas en modo descuidado

V8 ha soportado declaraciones léxicas (`let`, `const`, `function` local de bloque) y clases desde las versiones 4.1 y 4.2 respectivamente, pero hasta ahora se ha requerido el modo estricto para usarlas. A partir de la versión 4.9 de V8, todas estas características ahora están habilitadas fuera del modo estricto también, según la especificación ES2015. Esto hace que sea mucho más fácil prototipar en la Consola de DevTools, aunque alentamos a los desarrolladores en general a actualizarse al modo estricto para nuevo código.

### Expresiones regulares

V8 ahora admite la nueva [bandera sticky](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky) en expresiones regulares. La bandera sticky alterna si las búsquedas en cadenas comienzan desde el inicio de la cadena (normal) o desde la propiedad `lastIndex` (sticky). Este comportamiento es útil para analizar eficientemente cadenas de entrada arbitrariamente largas con muchas expresiones regulares diferentes. Para habilitar la búsqueda sticky, agrega la bandera `y` a una expresión regular: (por ejemplo, `const regex = /foo/y;`).

### Resultados personalizables de `Object.prototype.toString`

Usando `Symbol.toStringTag`, los tipos definidos por el usuario ahora pueden devolver resultados personalizados cuando se pasan a `Object.prototype.toString` (ya sea directamente o como resultado de la coerción de cadena):

```js
class Custom {
  get [Symbol.toStringTag]() {
    return &apos;Custom&apos;;
  }
}
Object.prototype.toString.call(new Custom);
// → &apos;[object Custom]&apos;
String(new Custom);
// → &apos;[object Custom]&apos;
```

## Mejora de `Math.random()`

V8 v4.9 incluye una mejora en la implementación de `Math.random()`. [Como se anunció el mes pasado](/blog/math-random), cambiamos el algoritmo PRNG de V8 a [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) para proporcionar una pseudoaleatoriedad de mayor calidad.

## API de V8

Por favor revisa nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 4.9 -t branch-heads/4.9` para experimentar con las nuevas características en V8 v4.9. Alternativamente, puedes suscribirte al [canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
