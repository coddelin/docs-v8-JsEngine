---
title: 'Lanzamiento de V8 v7.2'
author: 'Andreas Haas, manejador de trampas'
avatars:
  - andreas-haas
date: 2018-12-18 11:48:21
tags:
  - lanzamiento
description: 'V8 v7.2 cuenta con análisis de JavaScript a alta velocidad, `async-await` más rápido, reducción del consumo de memoria en ia32, campos públicos de clase y mucho más!'
tweet: '1074978755934863361'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva de la rama principal de Git de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2), que está en beta hasta su lanzamiento en coordinación con Chrome 72 Estable en varias semanas. V8 v7.2 está lleno de todo tipo de herramientas orientadas a desarrolladores. Esta publicación proporciona un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Memoria

[Builtins embebidos](/blog/embedded-builtins) ahora son compatibles y están habilitados por defecto en la arquitectura ia32.

## Rendimiento

### Análisis de JavaScript

En promedio, las páginas web destinan un 9.5% del tiempo de V8 en el inicio para analizar JavaScript. Por eso nos hemos enfocado en brindar el analizador de JavaScript más rápido de V8 hasta ahora con la versión v7.2. Hemos mejorado drásticamente la velocidad de análisis en general. Desde v7.0 la velocidad de análisis mejoró aproximadamente un 30% en computadoras de escritorio. El siguiente gráfico documenta las impresionantes mejoras en nuestro punto de referencia de carga de Facebook en los últimos meses.

![Tiempo de análisis de V8 en facebook.com (más bajo es mejor)](/_img/v8-release-72/facebook-parse-time.png)

Nos hemos enfocado en el analizador en diferentes ocasiones. Los siguientes gráficos muestran las mejoras relativas a la última versión v7.2 en varios sitios web populares.

![Tiempos de análisis de V8 relativos a V8 v7.2 (más bajo es mejor)](/_img/v8-release-72/relative-parse-times.svg)

En general, las mejoras recientes han reducido el porcentaje promedio de análisis del 9.5% al 7.5%, resultando en tiempos de carga más rápidos y páginas más responsivas.

### `async`/`await`

V8 v7.2 viene con [una implementación más rápida de `async`/`await`](/blog/fast-async#await-under-the-hood), habilitada por defecto. Hemos realizado [una propuesta de especificación](https://github.com/tc39/ecma262/pull/1250) y actualmente estamos recopilando datos de compatibilidad web para que el cambio se integre oficialmente en la especificación ECMAScript.

### Elementos de propagación

V8 v7.2 mejora considerablemente el rendimiento de los elementos de propagación cuando aparecen al inicio de literales de array, por ejemplo `[...x]` o `[...x, 1, 2]`. La mejora aplica a la propagación de arrays, cadenas primitivas, conjuntos, claves de mapas, valores de mapas y — por extensión — a `Array.from(x)`. Para obtener más detalles, consulta [nuestro artículo detallado sobre cómo acelerar los elementos de propagación](/blog/spread-elements).

### WebAssembly

Analizamos una serie de benchmarks de WebAssembly y los utilizamos para guiar la generación de código mejorada en el nivel de ejecución superior. En particular, V8 v7.2 habilita la división de nodos en el programador del compilador optimizador y la rotación de bucles en el backend. También mejoramos el caché de envoltorios e introdujimos envoltorios personalizados que reducen la sobrecarga al llamar funciones matemáticas JavaScript importadas. Además, diseñamos cambios en el asignador de registros que mejoran el rendimiento para muchos patrones de código que llegarán en una versión posterior.

### Manejadores de trampas

Los manejadores de trampas están mejorando el rendimiento general del código de WebAssembly. Se implementan y están disponibles en Windows, macOS y Linux en V8 v7.2. En Chromium están habilitados en Linux. Windows y macOS seguirán cuando haya confirmación sobre estabilidad. Actualmente estamos trabajando en hacerlos disponibles también para Android.

## Trazas de pila asíncronas

Como [mencionamos anteriormente](/blog/fast-async#improved-developer-experience), hemos añadido una nueva función llamada [trazas de pila asíncronas sin costo](https://bit.ly/v8-zero-cost-async-stack-traces), que enriquece la propiedad `error.stack` con marcos de llamadas asíncronas. Actualmente está disponible detrás del flag de línea de comandos `--async-stack-traces`.

## Características del lenguaje JavaScript

### Campos públicos de clase

V8 v7.2 añade soporte para [campos públicos de clase](/features/class-fields). En lugar de:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

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

…ahora puedes escribir:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('¡Miau!');
  }
}
```

El soporte para [campos privados de clase](/features/class-fields#private-class-fields) está planeado para una futura versión de V8.

### `Intl.ListFormat`

V8 v7.2 añade soporte para [la propuesta `Intl.ListFormat`](/features/intl-listformat), permitiendo el formato localizado de listas.

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank y Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine y Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora y Harrison'
```

Para más información y ejemplos de uso, consulta [nuestra explicación de `Intl.ListFormat`](/features/intl-listformat).

### `JSON.stringify` bien formado

Ahora `JSON.stringify` genera secuencias de escape para sustitutos solitarios, haciendo que su salida sea Unicode válido (y representable en UTF-8):

```js
// Comportamiento antiguo:
JSON.stringify('\uD800');
// → '"�"'

// Comportamiento nuevo:
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Para más información, consulta [nuestra explicación sobre `JSON.stringify` bien formado](/features/well-formed-json-stringify).

### Exportaciones de namespaces de módulos

En [módulos de JavaScript](/features/modules), ya era posible usar la siguiente sintaxis:

```js
import * as utils from './utils.mjs';
```

Sin embargo, hasta ahora no existía una sintaxis `export` simétrica… [hasta ahora](/features/module-namespace-exports):

```js
export * as utils from './utils.mjs';
```

Esto es equivalente a lo siguiente:

```js
import * as utils from './utils.mjs';
export { utils };
```

## API de V8

Por favor, utiliza `git log branch-heads/7.1..branch-heads/7.2 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.2 -t branch-heads/7.2` para experimentar con las nuevas características en V8 v7.2. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características tú mismo pronto.
