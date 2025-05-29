---
title: 'Lanzamiento de V8 versión 6.6'
author: 'el equipo de V8'
date: 2018-03-27 13:33:37
tags:
  - lanzamiento
description: '¡V8 v6.6 incluye enlace opcional en catch, recorte extendido de cadenas, varias mejoras de rendimiento en análisis/compilación/ejecución y mucho más!'
tweet: '978534399938584576'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se divide desde el maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 6.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.6), que está en beta hasta su lanzamiento en coordinación con Chrome 66 Stable en varias semanas. V8 v6.6 está repleto de muchas novedades para los desarrolladores. Este artículo ofrece una vista previa de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Funciones del lenguaje JavaScript

### Revisión de `Function.prototype.toString`  #function-tostring

[`Function.prototype.toString()`](/features/function-tostring) ahora devuelve fragmentos exactos del texto del código fuente, incluyendo espacios en blanco y comentarios. Aquí hay un ejemplo que compara el comportamiento antiguo con el nuevo:

```js
// Nota el comentario entre la palabra clave `function`
// y el nombre de la función, así como el espacio después
// del nombre de la función.
function /* un comentario */ foo () {}

// Antes:
foo.toString();
// → 'function foo() {}'
//             ^ sin comentario
//                ^ sin espacio

// Ahora:
foo.toString();
// → 'function /* comentario */ foo () {}'
```

### JSON ⊂ ECMAScript

Los símbolos separador de línea (U+2028) y separador de párrafo (U+2029) ahora están permitidos en literales de cadena, [coincidiendo con JSON](/features/subsume-json). Anteriormente, estos símbolos se trataban como terminadores de línea dentro de literales de cadena, lo que resultaba en una excepción `SyntaxError` al utilizarlos.

### Enlace opcional en `catch`

La cláusula `catch` de las declaraciones `try` ahora se puede [utilizar sin un parámetro](/features/optional-catch-binding). Esto es útil si no necesitas el objeto `exception` en el código que maneja la excepción.

```js
try {
  hacerAlgoQuePodriaLanzar();
} catch { // → ¡Mira mamá, sin enlace!
  manejarExcepcion();
}
```

### Recorte unilateral de cadenas

Además de `String.prototype.trim()`, V8 ahora implementa [`String.prototype.trimStart()` y `String.prototype.trimEnd()`](/features/string-trimming). Esta funcionalidad estaba disponible anteriormente a través de los métodos no estándar `trimLeft()` y `trimRight()`, que permanecen como alias de los nuevos métodos para garantizar la compatibilidad retroactiva.

```js
const string = '  hola mundo  ';
string.trimStart();
// → 'hola mundo  '
string.trimEnd();
// → '  hola mundo'
string.trim();
// → 'hola mundo'
```

### `Array.prototype.values`

[El método `Array.prototype.values()`](https://tc39.es/ecma262/#sec-array.prototype.values) proporciona a los arrays la misma interfaz de iteración que las colecciones `Map` y `Set` de ES2015: ahora todos pueden iterarse mediante `keys`, `values` o `entries` llamando al método del mismo nombre. Este cambio tiene el potencial de ser incompatible con el código JavaScript existente. Si encuentras un comportamiento extraño o un sitio web roto, intenta desactivar esta función a través de `chrome://flags/#enable-array-prototype-values` y [reporta el error](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user).

## Caché de código después de la ejecución

Los términos _carga fría_ y _carga cálida_ podrían ser bien conocidos por personas preocupadas por el rendimiento de carga. En V8, también existe el concepto de una _carga caliente_. Vamos a explicar los diferentes niveles con Chrome integrando V8 como ejemplo:

- **Carga fría:** Chrome ve la página web visitada por primera vez y no tiene ningún dato en caché.
- **Carga cálida**: Chrome recuerda que la página web ya fue visitada y puede recuperar ciertos activos (por ejemplo, imágenes y archivos de código fuente de scripts) desde la caché. V8 reconoce que la página ya envió el mismo archivo de script antes y, por lo tanto, almacena el código compilado junto con el archivo de script en la caché del disco.
- **Carga caliente**: La tercera vez que Chrome visita la página web, cuando se suministra el archivo de script desde la caché del disco, también proporciona a V8 el código almacenado en caché durante la carga anterior. V8 puede usar este código almacenado en caché para evitar tener que analizar y compilar el script desde cero.

Antes de V8 v6.6, almacenábamos en caché el código generado inmediatamente después de la compilación de nivel superior. V8 solo compila las funciones que se sabe que se ejecutarán inmediatamente durante la compilación de nivel superior y marca otras funciones para compilación diferida. Esto significaba que el código en caché solo incluía el código de nivel superior, mientras que todas las demás funciones tenían que ser compiladas desde cero en cada carga de página. A partir de la versión 6.6, V8 almacena en caché el código generado después de la ejecución de nivel superior del script. A medida que ejecutamos el script, más funciones se compilan de manera diferida y pueden incluirse en la memoria caché. Como resultado, estas funciones no necesitan ser compiladas en futuras cargas de página, reduciendo el tiempo de compilación y análisis en escenarios de carga intensiva entre un 20% y un 60%. El cambio visible para el usuario es un hilo principal menos congestionado, brindando una experiencia de carga más fluida y rápida.

Pronto publicaremos un artículo detallado sobre este tema.

## Compilación en segundo plano

Durante algún tiempo, V8 ha podido [analizar el código JavaScript en un hilo secundario](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html). Con el nuevo [intérprete de bytecode Ignition de V8, lanzado el año pasado](/blog/launching-ignition-and-turbofan), pudimos extender este soporte para habilitar también la compilación del código fuente de JavaScript a bytecode en un hilo secundario. Esto permite a los integradores realizar más trabajo fuera del hilo principal, liberándolo para ejecutar más JavaScript y reducir interrupciones. Habilitamos esta función en Chrome 66, donde observamos una reducción del 5% al 20% en el tiempo de compilación del hilo principal en sitios web típicos. Para más detalles, consulte [la reciente publicación del blog sobre esta función](/blog/background-compilation).

## Eliminación de numeración de AST

Hemos continuado obteniendo beneficios por simplificar nuestra cadena de compilación tras el [lanzamiento de Ignition y TurboFan el año pasado](/blog/launching-ignition-and-turbofan). Nuestra cadena anterior requería una etapa de post-procesamiento llamada "Numeración de AST", donde se numeraban los nodos en el árbol de sintaxis abstracta generado para que los diversos compiladores que lo utilizan tuvieran un punto de referencia común.

Con el tiempo, este paso de post-procesamiento se había ampliado para incluir otras funcionalidades: numerar puntos de suspensión para generadores y funciones async, recopilar funciones internas para compilación anticipada, inicializar literales o detectar patrones de código no optimizables.

Con la nueva cadena, el bytecode de Ignition se convirtió en el punto de referencia común y la numeración en sí ya no era necesaria, pero aún se necesitaban las funcionalidades restantes, por lo que el paso de numeración de AST permaneció.

En V8 v6.6, finalmente logramos [mover o descontinuar estas funcionalidades restantes](https://bugs.chromium.org/p/v8/issues/detail?id=7178) a otros pasos, permitiéndonos eliminar este recorrido del árbol. Esto resultó en una mejora del 3-5% en el tiempo de compilación en escenarios reales.

## Mejoras de rendimiento asincrónico

Logramos obtener algunas mejoras significativas de rendimiento para promesas y funciones async, y especialmente logramos cerrar la brecha entre funciones async y cadenas de promesas desazucaradas.

![Mejoras de rendimiento de promesas](/_img/v8-release-66/promise.svg)

Además, el rendimiento de generadores async e iteración async mejoró significativamente, haciéndolos una opción viable para el próximo Node 10 LTS, que está programado para incluir V8 v6.6. Como ejemplo, considere la siguiente implementación de la secuencia Fibonacci:

```js
async function* fibonacciSequence() {
  for (let a = 0, b = 1;;) {
    yield a;
    const c = a + b;
    a = b;
    b = c;
  }
}

async function fibonacci(id, n) {
  for await (const value of fibonacciSequence()) {
    if (n-- === 0) return value;
  }
}
```

Hemos medido las siguientes mejoras para este patrón, antes y después de la transpilación con Babel:

![Mejoras de rendimiento del generador async](/_img/v8-release-66/async-generator.svg)

Finalmente, [mejoras de bytecode](https://chromium-review.googlesource.com/c/v8/v8/+/866734) para "funciones suspendibles" como generadores, funciones async y módulos, han mejorado el rendimiento de estas funciones mientras se ejecutan en el intérprete, y reducido su tamaño compilado. Planeamos mejorar aún más el rendimiento de funciones async y generadores async en versiones futuras, así que estén atentos.

## Mejoras de rendimiento de Array

El rendimiento de `Array#reduce` se incrementó más de 10× para arrays doble con huecos ([consulte nuestra publicación en el blog para una explicación sobre qué son los arrays con huecos y paquetes](/blog/elements-kinds)). Esto amplía la ruta rápida para casos donde se aplica `Array#reduce` a arrays dobles con huecos y paquetes.

![Mejoras de rendimiento en `Array.prototype.reduce`](/_img/v8-release-66/array-reduce.svg)

## Mitigaciones de código no confiable

En V8 v6.6 hemos implementado [más mitigaciones para vulnerabilidades de canal lateral](/docs/untrusted-code-mitigations) para prevenir fugas de información a código JavaScript y WebAssembly no confiable.

## GYP ha desaparecido

Esta es la primera versión de V8 que se lanza oficialmente sin archivos GYP. Si su producto necesita los archivos GYP eliminados, debe copiarlos en su propio repositorio de código fuente.

## Perfilado de memoria

Las DevTools de Chrome ahora pueden rastrear y capturar objetos DOM en C++ y mostrar todos los objetos DOM alcanzables desde JavaScript con sus referencias. Esta función es uno de los beneficios del nuevo mecanismo de rastreo en C++ del recolector de basura de V8. Para más información, por favor consulte [el blog dedicado a esta funcionalidad](/blog/tracing-js-dom).

## API de V8

Por favor use `git log branch-heads/6.5..branch-heads/6.6 include/v8.h` para obtener una lista de los cambios en la API.
