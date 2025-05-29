---
title: "Versión de lanzamiento de V8 v7.5"
author: "Dan Elphick, azote de lo obsoleto"
avatars:
  - "dan-elphick"
date: 2019-05-16 15:00:00
tags:
  - lanzamiento
description: "¡V8 v7.5 incluye caché implícita de artefactos de compilación WebAssembly, operaciones de memoria masiva, separadores numéricos en JavaScript y mucho más!"
tweet: "1129073370623086593"
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del git master de V8 inmediatamente antes de un hito Beta de Chrome. Hoy estamos encantados de anunciar nuestra nueva rama, [versión de V8 7.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.5), que está en beta hasta su lanzamiento en coordinación con Chrome 75 Stable dentro de varias semanas. V8 v7.5 está lleno de toda clase de novedades para desarrolladores. Este post ofrece un adelanto de algunos de los puntos destacados en anticipación al lanzamiento.

<!--truncate-->
## WebAssembly

### Caché implícita

Estamos planeando implementar la caché implícita de artefactos de compilación de WebAssembly en Chrome 75. Esto significa que los usuarios que visiten la misma página por segunda vez no necesitarán compilar los módulos WebAssembly ya vistos. En su lugar, se cargan desde la caché. Esto funciona de manera similar a [la caché de código JavaScript de Chromium](/blog/code-caching-for-devs).

Si deseas usar una característica similar en tu integración de V8, toma inspiración de la implementación de Chromium.

### Operaciones de memoria masiva

[La propuesta de memoria masiva](https://github.com/webassembly/bulk-memory-operations) añade nuevas instrucciones a WebAssembly para actualizar grandes regiones de memoria o tablas.

`memory.copy` copia datos de una región a otra, incluso si las regiones se superponen (como `memmove` en C). `memory.fill` llena una región con un byte dado (como `memset` en C). Similar a `memory.copy`, `table.copy` copia de una región de una tabla a otra, incluso si las regiones se superponen.

```wasm
;; Copiar 500 bytes desde la fuente 1000 al destino 0.
(memory.copy (i32.const 0) (i32.const 1000) (i32.const 500))

;; Rellenar 1000 bytes comenzando en 100 con el valor `123`.
(memory.fill (i32.const 100) (i32.const 123) (i32.const 1000))

;; Copiar 10 elementos de tabla desde la fuente 5 al destino 15.
(table.copy (i32.const 15) (i32.const 5) (i32.const 10))
```

La propuesta también proporciona una forma de copiar una región constante en memoria lineal o una tabla. Para hacerlo, primero necesitamos definir un segmento “pasivo”. A diferencia de los segmentos “activos”, estos segmentos no se inicializan durante la instanciación del módulo. En su lugar, se pueden copiar en una región de memoria o tabla utilizando las instrucciones `memory.init` y `table.init`.

```wasm
;; Definir un segmento de datos pasivo.
(data $hello passive "Hello WebAssembly")

;; Copiar "Hello" en la memoria en la dirección 10.
(memory.init (i32.const 10) (i32.const 0) (i32.const 5))

;; Copiar "WebAssembly" en la memoria en la dirección 1000.
(memory.init (i32.const 1000) (i32.const 6) (i32.const 11))
```

## Separadores numéricos en JavaScript

Los literales numéricos grandes son difíciles de interpretar rápidamente para el ojo humano, especialmente cuando hay muchos dígitos repetidos:

```js
1000000000000
   1019436871.42
```

Para mejorar la legibilidad, [una nueva característica del lenguaje JavaScript](/features/numeric-separators) permite utilizar guiones bajos como separadores en literales numéricos. Así, los anteriores se pueden reescribir agrupando los dígitos por mil, por ejemplo:

```js
1_000_000_000_000
    1_019_436_871.42
```

Ahora es más fácil distinguir que el primer número es un billón, y el segundo número está en el orden de mil millones.

Para más ejemplos e información adicional sobre los separadores numéricos, consulta [nuestra explicación](/features/numeric-separators).

## Rendimiento

### Transmisión de scripts directamente desde la red

A partir de Chrome 75, V8 puede transmitir scripts directamente desde la red al analizador en streaming, sin esperar al hilo principal de Chrome.

Mientras que las versiones anteriores de Chrome tenían análisis y compilación en streaming, los datos de origen de los scripts provenientes de la red siempre tenían que pasar primero por el hilo principal de Chrome antes de ser enviados al streamer, por razones históricas. Esto significaba que a menudo, el analizador en streaming estaba esperando datos que ya habían llegado desde la red, pero que no se habían enviado aún a la tarea de transmisión porque estaban bloqueados por otras actividades en el hilo principal (como el análisis de HTML, el diseño, u otra ejecución de JavaScript).

![Tareas de análisis en segundo plano detenidas en Chrome 74 y versiones anteriores](/_img/v8-release-75/before.jpg)

En Chrome 75, conectamos el “tubo de datos” de la red directamente a V8, lo que nos permite leer datos de la red directamente durante el análisis en streaming, omitiendo la dependencia del hilo principal.

![En Chrome 75+, las tareas de análisis en segundo plano ya no están bloqueadas por la actividad en el hilo principal.](/_img/v8-release-75/after.jpg)

Esto nos permite terminar la compilación en streaming más temprano, mejorando el tiempo de carga de las páginas que usan compilación en streaming, así como reduciendo el número de tareas de análisis en streaming concurrentes (pero detenidas), lo que disminuye el consumo de memoria.

## API de V8

Por favor, utilice `git log branch-heads/7.4..branch-heads/7.5 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.5 -t branch-heads/7.5` para experimentar con las nuevas características de V8 v7.5. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones usted mismo pronto.
