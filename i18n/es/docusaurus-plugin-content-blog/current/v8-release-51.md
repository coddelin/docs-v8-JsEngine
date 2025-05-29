---
title: "Lanzamiento de V8 v5.1"
author: "el equipo de V8"
date: 2016-04-23 13:33:37
tags:
  - lanzamiento
description: "V8 v5.1 incluye mejoras en el rendimiento, reducción de interrupciones y consumo de memoria, y aumenta el soporte para funcionalidades del lenguaje ECMAScript."
---
El primer paso en el [proceso de lanzamiento](/docs/release-process) de V8 es crear una nueva rama desde el maestro de Git inmediatamente antes de que Chromium haga una rama para una versión beta de Chrome (aproximadamente cada seis semanas). Nuestra más reciente rama de lanzamiento es [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1), que permanecerá en beta hasta que publiquemos una versión estable en conjunto con Chrome 51 Stable. Aquí hay un resumen de las nuevas características orientadas a desarrolladores en esta versión de V8.

<!--truncate-->
## Mejor soporte de ECMAScript

V8 v5.1 contiene varios cambios para cumplir con el borrador de la especificación ES2017.

### `Symbol.species`

Métodos de Array como `Array.prototype.map` construyen instancias de la subclase como su salida, con la opción de personalizar esto cambiando [`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species). Cambios análogos se realizan en otras clases integradas.

### Personalización de `instanceof`

Los constructores pueden implementar su propio método [`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols), que reemplaza el comportamiento predeterminado.

### Cerrando Iteradores

Los iteradores creados como parte de un ciclo [`for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) (u otra iteración integrada, como el operador [spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)) ahora verifican si tienen un método de cierre que se llama si el ciclo termina antes de tiempo. Esto se puede usar para tareas de limpieza después de terminar la iteración.

### Subclases de RegExp y método `exec`

Las subclases de RegExp pueden sobrescribir el método `exec` para cambiar solo el algoritmo de coincidencia central, con la garantía de que esto será llamado por funciones de alto nivel como `String.prototype.replace`.

### Inferencia de nombre de función

Los nombres de funciones inferidos por expresiones de función ahora generalmente están disponibles en la propiedad [`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name) de las funciones, siguiendo la formalización de estas reglas en ES2015. Esto puede cambiar trazas de pila existentes y proporcionar nombres diferentes a los de versiones anteriores de V8. También asigna nombres útiles a propiedades y métodos con nombres de propiedad calculados:

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

De forma análoga a otros tipos de colecciones, el método [`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values) en `Array` devuelve un iterador sobre los contenidos del array.

## Mejoras en el rendimiento

V8 v5.1 también trae algunas notables mejoras de rendimiento en las siguientes características de JavaScript:

- Ejecución de ciclos como `for`-`in`
- `Object.assign`
- Creación de instancias de Promise y RegExp
- Llamando a `Object.prototype.hasOwnProperty`
- `Math.floor`, `Math.round`, y `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` y `Array.prototype.toString`
- Aplanamiento de cadenas repetidas, por ejemplo, `'.'.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1 tiene soporte preliminar para [WebAssembly](/blog/webassembly-experimental). Puedes habilitarlo mediante el flag `--expose_wasm` en `d8`. Alternativamente, puedes probar las [demos de Wasm](https://webassembly.github.io/demo/) con Chrome 51 (Canal Beta).

## Memoria

V8 implementó más partes de [Orinoco](/blog/orinoco):

- Evacuación paralela de generación joven
- Conjuntos recordados escalables
- Asignación negra

El impacto es reducir interrupciones y consumo de memoria en tiempos de necesidad.

## API de V8

Por favor revisa nuestro [resumen de cambios en la API](https://bit.ly/v8-api-changes). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 5.1 -t branch-heads/5.1` para experimentar con las nuevas características de V8 v5.1. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funcionalidades por ti mismo pronto.
