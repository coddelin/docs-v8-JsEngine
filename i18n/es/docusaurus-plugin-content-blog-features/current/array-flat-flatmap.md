---
title: "`Array.prototype.flat` y `Array.prototype.flatMap`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-06-11
tags: 
  - ECMAScript
  - ES2019
  - io19
description: "Array.prototype.flat aplana un arreglo hasta la profundidad especificada. Array.prototype.flatMap es equivalente a realizar un map seguido de un flat por separado."
tweet: "1138457106380709891"
---
## `Array.prototype.flat`

El arreglo en este ejemplo tiene varios niveles de profundidad: contiene un arreglo que a su vez contiene otro arreglo.

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ arreglo exterior
//                ^^^^^^^^  arreglo interior
//                    ^^^   arreglo más interior
```

`Array#flat` devuelve una versión aplanda de un arreglo dado.

```js
array.flat();
// → [1, 2, [3]]

// …es equivalente a:
array.flat(1);
// → [1, 2, [3]]
```

La profundidad predeterminada es `1`, pero puedes pasar cualquier número para aplanar recursivamente hasta esa profundidad. Para seguir aplanando recursivamente hasta que el resultado no contenga más arreglos anidados, pasamos `Infinity`.

```js
// Aplanar recursivamente hasta que el arreglo no contenga más arreglos anidados:
array.flat(Infinity);
// → [1, 2, 3]
```

¿Por qué este método se llama `Array.prototype.flat` y no `Array.prototype.flatten`? [¡Lee nuestro artículo #SmooshGate para descubrirlo!](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

Aquí hay otro ejemplo. Tenemos una función `duplicate` que toma un valor y devuelve un arreglo que contiene ese valor dos veces. Si aplicamos `duplicate` a cada valor en un arreglo, terminamos con un arreglo anidado.

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

Entonces puedes llamar a `flat` sobre el resultado para aplanar el arreglo:

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

Dado que este patrón es tan común en la programación funcional, ahora hay un método dedicado llamado `flatMap` para ello.

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` es un poco más eficiente en comparación con realizar un `map` seguido de un `flat` por separado.

¿Interesado en casos de uso de `flatMap`? Consulta [la explicación de Axel Rauschmayer](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values).

## Compatibilidad con `Array#{flat,flatMap}`

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="sí https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
