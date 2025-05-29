---
title: 'Lanzamiento de V8 versión v9.3'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-08-09
tags:
 - lanzamiento
description: 'El lanzamiento de V8 versión v9.3 incluye soporte para Object.hasOwn y causas de Error, mejora el rendimiento de compilación y deshabilita mitigaciones de generación de código no confiable en Android.'
tweet: ''
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamientos](https://v8.dev/docs/release-process). Cada versión se bifurca desde la rama principal de Git de V8 inmediatamente antes de un hito beta de Chrome. Hoy nos complace anunciar nuestra más reciente rama, [V8 versión 9.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3), que está en beta hasta su lanzamiento en coordinación con Chrome 93 Stable en unas semanas. V8 v9.3 está llena de todo tipo de mejoras orientadas a desarrolladores. Esta publicación proporciona un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### Compilación por lotes en Sparkplug

Lanzamos nuestro nuevo compilador JIT de nivel medio súper rápido [Sparkplug](https://v8.dev/blog/sparkplug) en v9.1. Por razones de seguridad, V8 [protege contra escritura](https://en.wikipedia.org/wiki/W%5EX) la memoria de código que genera, requiriendo que cambie los permisos entre escritura (durante la compilación) y ejecución. Esto se implementa actualmente usando llamadas a `mprotect`. Sin embargo, dado que Sparkplug genera código tan rápidamente, el costo de llamar a `mprotect` para cada función compilada individualmente se convirtió en un cuello de botella importante en el tiempo de compilación. En V8 v9.3 estamos introduciendo la compilación por lotes para Sparkplug: en lugar de compilar cada función individualmente, compilamos varias funciones en un solo lote. Esto amortigua el costo de cambiar los permisos de las páginas de memoria al hacerlo solo una vez por lote.

La compilación por lotes reduce el tiempo total de compilación (Ignition + Sparkplug) hasta en un 44% sin empeorar la ejecución de JavaScript. Si solo observamos el costo de compilar código Sparkplug, el impacto es obviamente mayor, por ejemplo, una reducción del 82% en el benchmark `docs_scrolling` (ver abajo) en Win 10. Sorprendentemente, la compilación por lotes mejoró el rendimiento de la compilación incluso más allá del costo asociado a W^X, ya que agrupar operaciones similares generalmente es mejor para la CPU. En el gráfico a continuación, puedes ver el impacto de W^X en el tiempo de compilación (Ignition + Sparkplug) y cómo la compilación por lotes mitigó ese sobrecoste.

![Benchmarks](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn` es un alias más accesible de `Object.prototype.hasOwnProperty.call`.

Por ejemplo:

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

Hay detalles ligeramente más (¡pero no mucho más!) en nuestra [explicación de las características](https://v8.dev/features/object-has-own).

### Causa del Error

A partir de v9.3, los diferentes constructores integrados de `Error` se extienden para aceptar un objeto de opciones con una propiedad `cause` como segundo parámetro. Si se pasa dicho objeto, el valor de la propiedad `cause` se instala como una propiedad propia en la instancia de `Error`. Esto proporciona una forma estandarizada de encadenar errores.

Por ejemplo:

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

Como de costumbre, consulta nuestra [explicación en profundidad de la característica](https://v8.dev/features/error-cause).

## Mitigaciones de código no confiable deshabilitadas en Android

Hace tres años, introdujimos un conjunto de [mitigaciones de generación de código](https://v8.dev/blog/spectre) para defendernos contra los ataques Spectre. Siempre supimos que esta era una solución temporal que solo proporcionaba protección parcial contra ataques [Spectre](https://spectreattack.com/spectre.pdf). La única protección efectiva es aislar sitios web mediante [Site Isolation](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html). Site Isolation ha estado habilitado en Chrome para dispositivos de escritorio desde hace algún tiempo, pero habilitar el aislamiento de sitios completo en Android ha sido un desafío debido a las limitaciones de recursos. Sin embargo, a partir de Chrome 92, [Site Isolation en Android](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html) se ha habilitado en muchos más sitios que contienen datos sensibles.

Por lo tanto, hemos decidido deshabilitar las mitigaciones de generación de código de V8 para Spectre en Android. Estas mitigaciones son menos efectivas que Site Isolation y tienen un costo de rendimiento. Deshabilitarlas pone a Android a la par con las plataformas de escritorio, donde se desactivaron desde V8 v7.0. Al deshabilitar estas mitigaciones, hemos visto mejoras significativas en el rendimiento de los benchmarks en Android.

![Mejoras de rendimiento](/_img/v8-release-93/code-mitigations.svg)

## API de V8

Usa `git log branch-heads/9.2..branch-heads/9.3 include/v8.h` para obtener una lista de los cambios en la API.
