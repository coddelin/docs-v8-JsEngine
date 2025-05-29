---
title: "Array.prototype.sort` estable"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-07-02
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Ahora se garantiza que Array.prototype.sort sea estable."
tweet: "1146067251302244353"
---
Supongamos que tienes un array de perros, donde cada perro tiene un nombre y una calificación. (Si esto suena a un ejemplo extraño, debes saber que hay una cuenta de Twitter que se especializa exactamente en esto… ¡No preguntes!)

```js
// Nota cómo el array está preordenado alfabéticamente por `name`.
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// Ordena los perros por `rating` en orden descendente.
// (Esto actualiza `doggos` directamente).
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
El array está preordenado alfabéticamente por nombre. Para ordenar por calificación en su lugar (así obtenemos los perros con la calificación más alta primero), usamos `Array#sort`, pasando una función de callback personalizada que compara las calificaciones. Este es el resultado que probablemente esperes:

```js
[
  { name: 'Choco',  rating: 14 },
  { name: 'Ghost',  rating: 14 },
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

Los perros están ordenados por calificación, pero dentro de cada calificación, todavía están ordenados alfabéticamente por nombre. Por ejemplo, Choco y Ghost tienen la misma calificación de 14, pero Choco aparece antes que Ghost en el resultado de la ordenación, porque ese es el orden que tenían en el array original también.

Sin embargo, para obtener este resultado, el motor de JavaScript no puede usar _cualquier_ algoritmo de ordenación: tiene que ser uno llamado “ordenación estable”. Durante mucho tiempo, la especificación de JavaScript no requería estabilidad en la ordenación para `Array#sort`, y en su lugar dejaba esto a la implementación. Y debido a que este comportamiento no estaba especificado, también podías obtener este resultado de ordenación, donde Ghost de repente aparece antes que Choco:

```js
[
  { name: 'Ghost',  rating: 14 }, // 😢
  { name: 'Choco',  rating: 14 }, // 😢
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

En otras palabras, los desarrolladores de JavaScript no podían confiar en la estabilidad de la ordenación. En la práctica, la situación era aún más frustrante, ya que algunos motores de JavaScript usaban una ordenación estable para arrays pequeños y una ordenación inestable para los más grandes. Esto era muy confuso, ya que los desarrolladores probaban su código, veían un resultado estable, pero luego obtenían de repente un resultado inestable en producción cuando el array era un poco más grande.

Pero hay buenas noticias. [Propusimos un cambio en la especificación](https://github.com/tc39/ecma262/pull/1340) que hace que `Array#sort` sea estable, y fue aceptado. Ahora todos los principales motores de JavaScript implementan una ordenación estable para `Array#sort`. Es solo una preocupación menos para los desarrolladores de JavaScript. ¡Genial!

(Ah, y [hicimos lo mismo para `TypedArray`s](https://github.com/tc39/ecma262/pull/1433): esa ordenación también es estable ahora).

:::note
**Nota:** Aunque ahora la estabilidad es requerida según la especificación, los motores de JavaScript todavía son libres de implementar el algoritmo de ordenación que prefieran. [V8 utiliza Timsort](/blog/array-sort#timsort), por ejemplo. La especificación no obliga a usar un algoritmo de ordenación en particular.
:::

## Soporte para la característica

### `Array.prototype.sort` estable

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="yes"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### `%TypedArray%.prototype.sort` estable

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
