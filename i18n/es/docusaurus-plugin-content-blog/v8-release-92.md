---
title: "Lanzamiento de V8 v9.2"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-07-16
tags: 
 - lanzamiento
description: "El lanzamiento de V8 v9.2 trae un método `at` para indexación relativa y mejoras en la compresión de punteros."
tweet: ""
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamientos](https://v8.dev/docs/release-process). Cada versión se ramifica del maestro de Git de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 9.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.2), que está en beta hasta su lanzamiento en coordinación con Chrome 92 Stable en varias semanas. V8 v9.2 está llena de todo tipo de novedades para desarrolladores. Esta publicación proporciona un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### Método `at`

El nuevo método `at` ahora está disponible en Arrays, TypedArrays y Strings. Cuando se pasa un valor negativo, realiza una indexación relativa desde el final del índice. Cuando se pasa un valor positivo, se comporta de manera idéntica al acceso a propiedades. Por ejemplo, `[1,2,3].at(-1)` es `3`. Consulte más información en [nuestro explicador](https://v8.dev/features/at-method).

## Jaula de Compresión Compartida de Punteros

V8 admite [compresión de punteros](https://v8.dev/blog/pointer-compression) en plataformas de 64 bits, incluidas x64 y arm64. Esto se logra dividiendo un puntero de 64 bits en dos mitades. Los 32 bits superiores pueden considerarse como una base, mientras que los 32 bits inferiores pueden considerarse como un índice en esa base.

```
            |----- 32 bits -----|----- 32 bits -----|
Puntero:    |________base_______|_______índice_______|
```

Actualmente, un Isolate realiza todas las asignaciones en el montón de GC dentro de una "jaula" de memoria virtual de 4GB, lo que garantiza que todos los punteros tengan la misma dirección base de 32 bits superior. Con la dirección base fija, los punteros de 64 bits pueden ser transmitidos usando solo el índice de 32 bits, ya que el puntero completo puede ser reconstruido.

Con v9.2, el valor predeterminado se cambia para que todos los Isolates dentro de un proceso compartan la misma jaula de memoria virtual de 4GB. Esto se hizo en anticipación a la creación de prototipos de características experimentales de memoria compartida en JS. Con cada hilo de trabajo teniendo su propio Isolate y, por lo tanto, su propia jaula de memoria virtual de 4GB, los punteros no podían ser transmitidos entre Isolates con una jaula por Isolate ya que no compartían la misma dirección base. Este cambio tiene el beneficio adicional de reducir la presión sobre la memoria virtual al iniciar hilos de trabajo.

El compromiso del cambio es que el tamaño total del montón de V8 en todos los hilos de un proceso está limitado a un máximo de 4GB. Esta limitación puede ser indeseable para cargas de trabajo en servidores que generan muchos hilos por proceso, ya que hacerlo agotará la memoria virtual más rápido que antes. Los integradores pueden desactivar el uso compartido de la jaula de compresión de punteros con el argumento GN `v8_enable_pointer_compression_shared_cage = false`.

## API de V8

Por favor use `git log branch-heads/9.1..branch-heads/9.2 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con una copia activa de V8 pueden usar `git checkout -b 9.2 -t branch-heads/9.2` para experimentar con las nuevas características en V8 v9.2. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características usted mismo pronto.
