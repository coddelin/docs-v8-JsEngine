---
title: &apos;Lanzamiento de V8 v7.4&apos;
author: &apos;Georg Neis&apos;
date: 2019-03-22 16:30:42
tags:
  - lanzamiento
description: &apos;V8 v7.4 incluye hilos/atómicos de WebAssembly, campos privados de clase, mejoras de rendimiento y memoria, ¡y mucho más!&apos;
tweet: &apos;1109094755936489472&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4), que está en beta hasta su lanzamiento en coordinación con Chrome 74 Stable en varias semanas. V8 v7.4 está repleto de todo tipo de beneficios para desarrolladores. Esta publicación ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## V8 sin JIT

V8 ahora admite la ejecución de *JavaScript* sin asignar memoria ejecutable en tiempo de ejecución. Se puede encontrar información detallada sobre esta característica en la [publicación dedicada del blog](/blog/jitless).

## Hilos/Atómicos de WebAssembly lanzados

Los hilos/atómicos de WebAssembly ahora están habilitados en sistemas operativos que no sean Android. Esto concluye la [prueba de origen/vista previa que habilitamos en V8 v7.0](/blog/v8-release-70#a-preview-of-webassembly-threads). Un artículo de Fundamentos de la Web explica [cómo usar Atómicos de WebAssembly con Emscripten](https://developers.google.com/web/updates/2018/10/wasm-threads).

Esto desbloquea el uso de múltiples núcleos en la máquina de un usuario a través de WebAssembly, permitiendo nuevos casos de uso intensivos en computación en la web.

## Rendimiento

### Llamadas más rápidas con desajuste de argumentos

En JavaScript es perfectamente válido llamar a funciones con muy pocos o demasiados parámetros (es decir, pasar menos o más parámetros de los declarados formalmente). Lo primero se llama _subaplicación_, y lo segundo se llama _sobreaplicación_. En caso de subaplicación, los parámetros formales restantes se asignan como `undefined`, mientras que en caso de sobreaplicación, los parámetros superfluos se ignoran.

Sin embargo, las funciones de JavaScript aún pueden acceder a los parámetros reales mediante el [objeto`arguments`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments), usando [parámetros rest](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters), o incluso utilizando la propiedad no estándar [`Function.prototype.arguments`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments) en funciones en [modo descuidado](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode). Como resultado, los motores de JavaScript deben proporcionar un medio para acceder a los parámetros reales. En V8, esto se realiza mediante una técnica llamada _adaptación de argumentos_, que proporciona los parámetros reales en caso de subaplicación o sobreaplicación. Desafortunadamente, la adaptación de argumentos tiene un costo de rendimiento y es comúnmente necesaria en frameworks modernos de front-end y middleware (es decir, muchas APIs con parámetros opcionales o listas de argumentos variables).

Hay escenarios donde el motor sabe que la adaptación de argumentos no es necesaria ya que los parámetros reales no pueden ser observados, a saber, cuando el callee es una función en modo estricto y no utiliza `arguments` ni parámetros rest. En estos casos, V8 ahora omite completamente la adaptación de argumentos, reduciendo la sobrecarga de llamada en hasta **60%**.

![Impacto en el rendimiento de omitir la adaptación de argumentos, medido a través [de un micro-benchmark](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js).](/_img/v8-release-74/argument-mismatch-performance.svg)

El gráfico muestra que ya no hay sobrecarga, incluso en caso de desajuste de argumentos (asumiendo que el callee no puede observar los argumentos reales). Para más detalles, consulta el [documento de diseño](https://bit.ly/v8-faster-calls-with-arguments-mismatch).

### Rendimiento mejorado de los accesores nativos

El equipo de Angular [descubrió](https://mhevery.github.io/perf-tests/DOM-megamorphic.html) que llamar a accesores nativos directamente mediante sus funciones `get` respectivas era significativamente más lento en Chrome que el acceso a propiedades [monomórfico](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching) o incluso [megamórfico](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching). Esto se debía a tomar la vía lenta en V8 para llamar a accesores de DOM mediante [`Function#call()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call), en vez de la vía rápida que ya existía para accesos a propiedades.

![](/_img/v8-release-74/native-accessor-performance.svg)

Logramos mejorar el rendimiento de las llamadas a los accesores nativos, haciéndolas significativamente más rápidas que el acceso a propiedades megamórficas. Para más información, consulta [V8 issue #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820).

### Rendimiento del analizador

En Chrome, los scripts lo suficientemente grandes se analizan en "transmisión" en hilos de trabajo mientras se descargan. En esta versión identificamos y solucionamos un problema de rendimiento con la decodificación personalizada de UTF-8 utilizada por el flujo fuente, lo que llevó a un análisis en transmisión un 8% más rápido en promedio.

Encontramos un problema adicional en el preanalizador de V8, que generalmente funciona en un hilo de trabajo: los nombres de propiedades se deduplicaban innecesariamente. Eliminar esta deduplicación mejoró el analizador en transmisión en otro 10.5%. Esto también mejora el tiempo de análisis en el hilo principal de scripts que no se transmiten, como scripts pequeños y scripts en línea.

![Cada caída en el gráfico anterior representa una de las mejoras de rendimiento en el analizador en transmisión.](/_img/v8-release-74/parser-performance.jpg)

## Memoria

### Eliminación de bytecode

El bytecode compilado a partir de código fuente de JavaScript ocupa una parte significativa del espacio del heap de V8, típicamente alrededor del 15%, incluyendo metadatos relacionados. Hay muchas funciones que solo se ejecutan durante la inicialización o que se usan raramente después de haberse compilado.

Para reducir la sobrecarga de memoria de V8, hemos implementado soporte para eliminar bytecode compilado de funciones durante la recolección de basura si no se han ejecutado recientemente. Para habilitar esto, llevamos un registro de la antigüedad del bytecode de una función, incrementando la antigüedad durante las recolecciones de basura y reiniciándola a cero cuando la función se ejecuta. Cualquier bytecode que cruce un umbral de envejecimiento es elegible para ser recolectado por la próxima recolección de basura, y la función se reinicia para recompilar su bytecode de manera perezosa si se ejecuta nuevamente en el futuro.

Nuestros experimentos con la eliminación de bytecode muestran que proporciona ahorros significativos de memoria para los usuarios de Chrome, reduciendo la cantidad de memoria en el heap de V8 entre un 5–15% sin afectar el rendimiento ni aumentar significativamente el tiempo de CPU dedicado a compilar código JavaScript.

![](/_img/v8-release-74/bytecode-flushing.svg)

### Eliminación de bloques básicos de bytecode muertos

El compilador de bytecode Ignition intenta evitar generar código que sabe que está muerto, como el código después de una declaración `return` o `break`:

```js
return;
deadCall(); // omitido
```

Sin embargo, anteriormente esto se hacía de manera oportunista para declaraciones de terminación en una lista de declaraciones, por lo que no se tenían en cuenta otras optimizaciones, como atajos en condiciones que se sabe que son verdaderas:

```js
if (2.2) return;
deadCall(); // no omitido
```

Intentamos resolver esto en V8 v7.3, pero todavía a nivel de declaración, lo que no funcionaría cuando el flujo de control se volviera más complejo, por ejemplo:

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // no omitido
```

El `deadCall()` anterior estaría al comienzo de un nuevo bloque básico, que a nivel de declaración es alcanzable como objetivo para declaraciones `break` en el bucle.

En V8 v7.4, permitimos que bloques básicos completos se conviertan en muertos, si ningún bytecode `Jump` (la primitiva principal de flujo de control de Ignition) se refiere a ellos. En el ejemplo anterior, el `break` no se emite, lo que significa que el bucle no tiene declaraciones `break`. Entonces, el bloque básico que comienza con `deadCall()` no tiene saltos referentes, y por lo tanto también se considera muerto. Aunque no esperábamos que esto tuviera un gran impacto en el código de usuario, es particularmente útil para simplificar varios desazúcares, como generadores, `for-of` y `try-catch`, y en particular elimina una clase de errores donde los bloques básicos podrían "resucitar" declaraciones complejas a mitad de su implementación.

## Características del lenguaje JavaScript

### Campos privados de clases

V8 v7.2 agregó soporte para la sintaxis de campos públicos en clases. Los campos de clase simplifican la sintaxis de clases al evitar la necesidad de funciones constructoras solo para definir propiedades de instancia. A partir de V8 v7.4, puedes marcar un campo como privado anteponiéndole un prefijo `#`.

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log(&apos;¡Obteniendo el valor actual!&apos;);
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

A diferencia de los campos públicos, los campos privados no son accesibles fuera del cuerpo de la clase:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

Para más información, lee nuestro [explicador sobre campos públicos y privados en clases](/features/class-fields).

### `Intl.Locale`

Las aplicaciones de JavaScript generalmente utilizan cadenas como `&apos;en-US&apos;` o `&apos;de-CH&apos;` para identificar configuraciones regionales. `Intl.Locale` ofrece un mecanismo más potente para manejar configuraciones regionales, y permite extraer fácilmente preferencias específicas de la región como el idioma, el calendario, el sistema de numeración, el ciclo horario, y más.

```js
const locale = new Intl.Locale(&apos;es-419-u-hc-h12&apos;, {
  calendar: &apos;gregory&apos;
});
locale.language;
// → &apos;es&apos;
locale.calendar;
// → &apos;gregory&apos;
locale.hourCycle;
// → &apos;h12&apos;
locale.region;
// → &apos;419&apos;
locale.toString();
// → &apos;es-419-u-ca-gregory-hc-h12&apos;
```

### Gramática de Hashbang

Los programas de JavaScript ahora pueden comenzar con `#!`, un llamado [hashbang](https://github.com/tc39/proposal-hashbang). El resto de la línea que sigue al hashbang se trata como un comentario de una sola línea. Esto coincide con el uso de facto en anfitriones de línea de comandos de JavaScript, como Node.js. Ahora el siguiente es un programa de JavaScript sintácticamente válido:

```js
#!/usr/bin/env node
console.log(42);
```

## API de V8

Por favor, use `git log branch-heads/7.3..branch-heads/7.4 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.4 -t branch-heads/7.4` para experimentar con las nuevas funciones en V8 v7.4. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones pronto.
