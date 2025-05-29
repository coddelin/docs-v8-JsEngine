---
title: 'Lanzamiento de V8 v9.1'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), probando mi marca privada'
avatars:
 - 'ingvar-stepanyan'
date: 2021-05-04
tags:
 - lanzamiento
description: 'El lanzamiento de V8 v9.1 trae soporte para verificaciones de marcas privadas, la habilitación por defecto de await de nivel superior y mejoras en el rendimiento.'
tweet: '1389613320953532417'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1), que estará en beta hasta su lanzamiento en coordinación con Chrome 91 Stable dentro de varias semanas. V8 v9.1 está repleto de todo tipo de novedades para desarrolladores. Esta publicación proporciona un adelanto de algunos de los aspectos destacados en previsión al lanzamiento.

<!--truncate-->
## JavaScript

### Mejoras en `FastTemplateCache`

La API de v8 expone una interfaz de `Template` para los integradores desde la cual se pueden crear nuevas instancias.

Crear y configurar nuevas instancias de objetos requiere varios pasos, por lo que a menudo es más rápido clonar objetos existentes. V8 utiliza una estrategia de caché de dos niveles (un caché rápido de arreglos pequeños y un caché lento de diccionario grande) para buscar objetos creados recientemente basándose en las plantillas y clonarlos directamente.

Anteriormente, el índice de caché para las plantillas se asignaba cuando las plantillas se creaban, en lugar de cuando se insertaban en la caché. Esto resultaba en que el caché rápido de arreglos se reservara para las plantillas que a menudo nunca eran instanciadas. Solucionar esto resultó en una mejora del 4.5% en la evaluación Speedometer2-FlightJS.

### `await` de nivel superior

[`await` de nivel superior](https://v8.dev/features/top-level-await) está habilitado por defecto en V8 a partir de la versión 9.1 y está disponible sin `--harmony-top-level-await`.

Tenga en cuenta que para el [motor de renderizado Blink](https://www.chromium.org/blink), el `await` de nivel superior ya estaba [habilitado por defecto](https://v8.dev/blog/v8-release-89#top-level-await) en la versión 89.

Los integradores deben tener en cuenta que con esta habilitación, `v8::Module::Evaluate` siempre devuelve un objeto `v8::Promise` en lugar del valor de completitud. El `Promise` se resuelve con el valor de completitud si la evaluación del módulo tiene éxito y se rechaza con el error si la evaluación falla. Si el módulo evaluado no es asincrónico (es decir, no contiene `await` de nivel superior) y no tiene dependencias asincrónicas, el `Promise` devuelto será cumplido o rechazado. En caso contrario, el `Promise` devuelto estará pendiente.

Consulte [nuestra explicación](https://v8.dev/features/top-level-await) para obtener más detalles.

### Verificaciones de marcas privadas también conocidas como `#foo in obj`

La sintaxis de comprobación de marcas privadas está habilitada de forma predeterminada en la versión 9.1 sin necesidad de `--harmony-private-brand-checks`. Esta característica extiende el operador [`in`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) para que también funcione con los nombres `#` de campos privados, como en el siguiente ejemplo.

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

Para un análisis más profundo, asegúrese de consultar [nuestra explicación](https://v8.dev/features/private-brand-checks).

### Llamadas cortas a funciones integradas

En esta versión hemos deshabilitado temporalmente las funciones integradas incrustadas (deshaciendo las [funciones integradas incrustadas](https://v8.dev/blog/embedded-builtins)) en máquinas de escritorio de 64 bits. El beneficio de rendimiento de no incrustar funciones integradas en esas máquinas supera el costo de memoria. Esto se debe a detalles arquitectónicos y microarquitectónicos.

Publicaremos una entrada de blog aparte con más detalles pronto.

## API de V8

Utilice `git log branch-heads/9.0..branch-heads/9.1 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un checkout activo de V8 pueden usar `git checkout -b 9.1 -t branch-heads/9.1` para experimentar con las nuevas características de V8 v9.1. Alternativamente, puede [suscribirse al canal beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
