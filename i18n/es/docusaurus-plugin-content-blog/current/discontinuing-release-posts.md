---
title: 'Interrumpir publicaciones de blog de lanzamientos'
author: 'Shu-yu Guo ([@shu_](https://twitter.com/_shu))'
avatars:
 - 'shu-yu-guo'
date: 2022-06-17
tags:
 - lanzamiento
description: 'V8 dejará de publicar blogs de lanzamientos a favor del calendario de lanzamientos de Chrome y publicaciones de blogs sobre características.'
tweet: '1537857497825824768'
---

Históricamente, hubo una publicación de blog para cada nueva rama de lanzamiento de V8. Quizás hayas notado que no ha habido una publicación de blog de lanzamiento desde la versión 9.9. A partir de la versión 10.0, dejaremos de publicar blogs de lanzamientos para cada nueva rama. Pero no te preocupes, ¡toda la información que solías obtener a través de las publicaciones de blogs de lanzamientos sigue estando disponible! Sigue leyendo para saber dónde encontrar esa información en el futuro.

<!--truncate-->
## Calendario de lanzamientos y versión actual

¿Solías leer las publicaciones de blogs de lanzamientos para determinar cuál era la versión más actualizada de V8?

V8 sigue el calendario de lanzamientos de Chrome. Para la versión más estable y reciente de V8, consulta el [mapa de lanzamientos de Chrome](https://chromestatus.com/roadmap).

Cada cuatro semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se rama desde la rama principal de Git de V8 inmediatamente antes de un hito beta de Chrome. Estas ramas están en beta y se convierten en lanzamientos en coordinación con el [mapa de lanzamientos de Chrome](https://chromestatus.com/roadmap).

Para encontrar una rama específica de V8 para una versión de Chrome:

1. Toma la versión de Chrome y divide entre 10 para obtener la versión de V8. Por ejemplo, Chrome 102 es V8 10.2.
1. Para un número de versión X.Y, su rama se puede encontrar en una URL con el siguiente formato:

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

Por ejemplo, la rama 10.2 se puede encontrar en https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2.

Para más información sobre números de versión y ramas, por favor consulta [nuestro artículo detallado](https://v8.dev/docs/version-numbers).

Para una versión de V8 X.Y, los desarrolladores con un checkout activo de V8 pueden usar `git checkout -b X.Y -t branch-heads/X.Y` para experimentar con las nuevas características de esa versión.

## Nuevas características de JavaScript o WebAssembly

¿Solías leer las publicaciones de los blogs de lanzamiento para descubrir qué nuevas características de JavaScript o WebAssembly se implementaron detrás de una bandera o se activaron por defecto?

Consulta el [mapa de lanzamientos de Chrome](https://chromestatus.com/roadmap), que enumera las nuevas características y sus hitos para cada lanzamiento.

Ten en cuenta que [los artículos de características independientes y detallados](/features) pueden publicarse antes o después de que la característica se haya implementado en V8.

## Mejoras notables de rendimiento

¿Leías las publicaciones de los blogs de lanzamiento para conocer mejoras notables de rendimiento?

En el futuro, escribiremos publicaciones de blog independientes sobre mejoras de rendimiento que deseamos destacar, como lo hemos hecho en el pasado con mejoras como [Sparkplug](https://v8.dev/blog/sparkplug).

## Cambios en la API

¿Leías las publicaciones de los blogs de lanzamiento para conocer los cambios en la API?

Para ver la lista de commits que modificaron la API de V8 entre una versión anterior A.B y una versión posterior X.Y, usa `git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h` en un checkout activo de V8.
