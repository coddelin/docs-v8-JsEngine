---
title: "Lanzamiento de V8 v6.5"
author: "el equipo de V8"
date: 2018-02-01 13:33:37
tags:
  - lanzamiento
description: "V8 v6.5 agrega soporte para la compilación en streaming de WebAssembly e incluye un nuevo “modo de código no confiable”."
tweet: "959174292406640640"
---
Cada seis semanas creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5), que está en beta hasta su lanzamiento en coordinación con Chrome 65 Stable en varias semanas. V8 v6.5 está lleno de todo tipo de beneficios para los desarrolladores. Esta publicación ofrece un avance de algunos de los aspectos destacados en anticipación del lanzamiento.

<!--truncate-->
## Modo de código no confiable

En respuesta al último ataque especulativo de canal lateral llamado Spectre, V8 introdujo un [modo de código no confiable](/docs/untrusted-code-mitigations). Si estás integrando V8, considera aprovechar este modo en caso de que tu aplicación procese código generado por el usuario y no confiable. Ten en cuenta que el modo está habilitado por defecto, incluso en Chrome.

## Compilación en streaming para el código WebAssembly

La API de WebAssembly proporciona una función especial para soportar la [compilación en streaming](https://developers.google.com/web/updates/2018/04/loading-wasm) en combinación con la API `fetch()`:

```js
const module = await WebAssembly.compileStreaming(fetch('foo.wasm'));
```

Esta API ha estado disponible desde V8 v6.1 y Chrome 61, aunque la implementación inicial realmente no utilizaba la compilación en streaming. Sin embargo, con V8 v6.5 y Chrome 65 aprovechamos esta API y compilamos los módulos de WebAssembly mientras todavía estamos descargando los bytes del módulo. Tan pronto como descargamos todos los bytes de una sola función, pasamos la función a un hilo de fondo para compilarla.

Nuestras mediciones muestran que con esta API, la compilación de WebAssembly en Chrome 65 puede alcanzar hasta 50 Mbit/s de velocidad de descarga en máquinas de gama alta. Esto significa que si descargas código WebAssembly a 50 Mbit/s, la compilación de ese código finaliza tan pronto como termina la descarga.

En el gráfico a continuación medimos el tiempo que lleva descargar y compilar un módulo WebAssembly de 67 MB y aproximadamente 190,000 funciones. Realizamos las mediciones con velocidades de descarga de 25 Mbit/s, 50 Mbit/s y 100 Mbit/s.

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

Cuando el tiempo de descarga es más largo que el tiempo de compilación del módulo WebAssembly, por ejemplo en el gráfico anterior con 25 Mbit/s y 50 Mbit/s, entonces `WebAssembly.compileStreaming()` termina la compilación casi inmediatamente después de que se descargan los últimos bytes.

Cuando el tiempo de descarga es más corto que el tiempo de compilación, entonces `WebAssembly.compileStreaming()` tarda aproximadamente lo mismo que llevaría compilar el módulo WebAssembly sin descargar primero el módulo.

## Velocidad

Continuamos trabajando en ampliar la vía rápida de las funciones integradas de JavaScript en general, agregando un mecanismo para detectar y prevenir una situación ruinosa llamada “bucle de desoptimización”. Esto ocurre cuando tu código optimizado se desoptimiza, y no hay _forma de aprender qué salió mal_. En tales escenarios, TurboFan sigue intentando optimizar, finalmente rindiéndose después de unos 30 intentos. Esto sucedería si hicieras algo para alterar la forma del array en la función de callback de cualquiera de nuestras funciones integradas de arrays de segundo orden. Por ejemplo, cambiar la `length` del array: en V8 v6.5, anotamos cuando eso ocurre y dejamos de incorporar la función integrada del array llamada en ese sitio en intentos futuros de optimización.

También ampliamos la vía rápida integrando muchas funciones que anteriormente estaban excluidas debido a un efecto secundario entre la carga de la función a llamar y la llamada en sí, por ejemplo, una llamada a función. Y `String.prototype.indexOf` obtuvo una [mejora de rendimiento de 10× en llamadas a funciones](https://bugs.chromium.org/p/v8/issues/detail?id=6270).

En V8 v6.4, habíamos integrado soporte para `Array.prototype.forEach`, `Array.prototype.map` y `Array.prototype.filter`. En V8 v6.5 hemos añadido soporte para:

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

Además, hemos ampliado la vía rápida en todas estas funciones integradas. Al principio, desistíamos al ver arrays con números de punto flotante o (incluso más desistencias) [si los arrays tenían “huecos” en ellos](/blog/elements-kinds), por ejemplo, `[3, 4.5, , 6]`. Ahora, manejamos arrays flotantes con huecos en todas partes excepto en `find` y `findIndex`, donde el requisito de la especificación de convertir los huecos en `undefined` complica nuestros esfuerzos (_¡por ahora…!_).

La siguiente imagen muestra el delta de mejora en comparación con V8 v6.4 en nuestros builtins inlineados, desglosado en matrices de enteros, matrices de dobles y matrices de dobles con agujeros. El tiempo está en milisegundos.

![Mejoras de rendimiento desde V8 v6.4](/_img/v8-release-65/performance-improvements.svg)

## API de V8

Por favor, utilice `git log branch-heads/6.4..branch-heads/6.5 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.5 -t branch-heads/6.5` para experimentar con las nuevas características en V8 v6.5. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características por sí mismo pronto.
