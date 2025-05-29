---
title: "Lanzamiento de V8 v9.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-11-05
tags: 
 - lanzamiento
description: "El lanzamiento de V8 v9.7 trae nuevos métodos de JavaScript para buscar hacia atrás en arrays."
tweet: ""
---
Cada cuatro semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del Git principal de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7), que está en beta hasta su lanzamiento en coordinación con Chrome 97 estable en varias semanas. V8 v9.7 está lleno de todo tipo de novedades para desarrolladores. Este artículo brinda un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### Métodos de array `findLast` y `findLastIndex`

Los métodos `findLast` y `findLastIndex` en `Array`s y `TypedArray`s encuentran elementos que coinciden con un predicado desde el final de un array.

Por ejemplo:

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4 (último elemento par)
```

Estos métodos están disponibles sin necesidad de una bandera a partir de la versión v9.7.

Para más detalles, consulta nuestro [explicador de características](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end).

## API de V8

Utiliza `git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un checkout activo de V8 pueden usar `git checkout -b 9.7 -t branch-heads/9.7` para experimentar con las nuevas características en V8 v9.7. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
