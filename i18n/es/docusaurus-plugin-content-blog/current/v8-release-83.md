---
title: "Lanzamiento de V8 v8.3"
author: "[Victor Gomes](https://twitter.com/VictorBFG), trabajando de forma segura desde casa"
avatars:
 - "victor-gomes"
date: 2020-05-04
tags:
 - lanzamiento
description: "V8 v8.3 presenta búferes de array más rápidos, memorias Wasm más grandes y API en desuso."
tweet: "1257333120115847171"
---

Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del maestro Git de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3), que estará en beta hasta su lanzamiento en coordinación con Chrome 83 Stable en varias semanas. V8 v8.3 está lleno de todo tipo de novedades orientadas a desarrolladores. Este artículo ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Rendimiento

### Seguimiento más rápido de `ArrayBuffer` en el recolector de basura

Los almacenes secundarios de `ArrayBuffer`s se asignan fuera del montón de V8 utilizando `ArrayBuffer::Allocator` proporcionado por el implementador. Estos almacenes secundarios deben liberarse cuando su objeto `ArrayBuffer` sea recuperado por el recolector de basura. V8 v8.3 tiene un nuevo mecanismo para rastrear `ArrayBuffer`s y sus almacenes secundarios que permite al recolector de basura iterar y liberar el almacén secundario de manera concurrente con la aplicación. Más detalles están disponibles en [este documento de diseño](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e). Este mecanismo redujo el tiempo total de pausa del recolector de basura en entornos de trabajo intensivos de `ArrayBuffer` en un 50%.

### Memorias Wasm más grandes

De acuerdo con una actualización de la [especificación de WebAssembly](https://webassembly.github.io/spec/js-api/index.html#limits), V8 v8.3 ahora permite a los módulos solicitar memorias de hasta 4GB de tamaño, permitiendo casos de uso más intensivos en memoria en plataformas impulsadas por V8. Por favor, tenga en cuenta que esta cantidad de memoria puede no estar siempre disponible en el sistema de un usuario; recomendamos crear memorias de menor tamaño, ampliarlas según sea necesario y manejar adecuadamente los fallos al intentar ampliarlas.

## Correcciones

### Almacenamientos en objetos con arrays tipados en la cadena de prototipos

Según la especificación de JavaScript, al almacenar un valor en la clave especificada, debemos recorrer la cadena de prototipos para ver si la clave ya existe en el prototipo. Más a menudo estas claves no existen en la cadena de prototipos, por lo que V8 instala manejadores de búsqueda rápida para evitar estas recorridas de la cadena de prototipos cuando es seguro hacerlo.

Sin embargo, recientemente identificamos un caso particular donde V8 instalaba incorrectamente este manejador de búsqueda rápida, lo que llevaba a un comportamiento incorrecto. Cuando los `TypedArray`s están en la cadena de prototipos, todos los almacenamientos en claves que están fuera de los límites del `TypedArray` deberían ser ignorados. Por ejemplo, en el caso siguiente `v[2]` no debería agregar una propiedad a `v` y las lecturas subsiguientes deberían devolver undefined.

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // Debería devolver undefined
```

Los manejadores de búsqueda rápida de V8 no manejaban este caso, y en su lugar devolveríamos `123` en el ejemplo anterior. V8 v8.3 corrige este problema evitando el uso de manejadores de búsqueda rápida cuando los `TypedArray`s están en la cadena de prototipos. Dado que este no es un caso común, no hemos visto ninguna regresión de rendimiento en nuestros benchmarks.

## API de V8

### API experimentales de WeakRefs y FinalizationRegistry en desuso

Las siguientes API experimentales relacionadas con WeakRefs están en desuso:

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry` (renombrado de `FinalizationGroup`) es parte de la [propuesta de referencias débiles de JavaScript](https://v8.dev/features/weak-references) y proporciona una manera para que los programadores de JavaScript registren finalizadores. Estas API son para que el implementador programe y ejecute tareas de limpieza de `FinalizationRegistry` donde se invoquen los finalizadores registrados; están en desuso porque ya no son necesarias. Las tareas de limpieza de `FinalizationRegistry` ahora se programan automáticamente por V8 utilizando el ejecutor de tareas en primer plano proporcionado por la `v8::Platform` del implementador y no requieren código adicional del implementador.

### Otros cambios en la API

Por favor, utilice `git log branch-heads/8.1..branch-heads/8.3 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un checkout activo de V8 pueden usar `git checkout -b 8.3 -t branch-heads/8.3` para experimentar con las nuevas funciones en V8 v8.3. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones usted mismo pronto.
