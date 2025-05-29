---
title: &apos;Optimizando tablas hash: ocultando el código hash&apos;
author: &apos;[Sathya Gunasekaran](https://twitter.com/_gsathya), guardián de los códigos hash&apos;
avatars:
  - &apos;sathya-gunasekaran&apos;
date: 2018-01-29 13:33:37
tags:
  - internos
tweet: &apos;958046113390411776&apos;
description: &apos;Varias estructuras de datos de JavaScript como Map, Set, WeakSet y WeakMap usan tablas hash internamente. Este artículo explica cómo V8 v6.3 mejora el rendimiento de las tablas hash.&apos;
---
ECMAScript 2015 introdujo varias nuevas estructuras de datos como Map, Set, WeakSet y WeakMap, todas las cuales usan tablas hash internamente. Esta publicación detalla las [mejoras recientes](https://bugs.chromium.org/p/v8/issues/detail?id=6404) en cómo [V8 v6.3+](/blog/v8-release-63) almacena las claves en tablas hash.

<!--truncate-->
## Código hash

Una [_función hash_](https://en.wikipedia.org/wiki/Hash_function) es utilizada para asignar una clave dada a una ubicación en la tabla hash. Un _código hash_ es el resultado de ejecutar esta función hash sobre una clave dada.

En V8, el código hash es solo un número aleatorio, independiente del valor del objeto. Por lo tanto, no podemos volver a calcularlo, lo que significa que debemos almacenarlo.

Para objetos de JavaScript utilizados como claves, anteriormente, el código hash se almacenaba como un símbolo privado en el objeto. Un símbolo privado en V8 es similar a un [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol), excepto que no es enumerable y no se filtra al espacio de usuario de JavaScript.

```js
function GetObjectHash(key) {
  let hash = key[hashCodeSymbol];
  if (IS_UNDEFINED(hash)) {
    hash = (MathRandom() * 0x40000000) | 0;
    if (hash === 0) hash = 1;
    key[hashCodeSymbol] = hash;
  }
  return hash;
}
```

Esto funcionaba bien porque no teníamos que reservar memoria para un campo de código hash hasta que el objeto se agregara a una tabla hash, momento en el cual se almacenaba un nuevo símbolo privado en el objeto.

V8 también podía optimizar la búsqueda del símbolo del código hash tal como cualquier otra búsqueda de propiedad utilizando el sistema IC, proporcionando búsquedas muy rápidas para el código hash. Esto funciona bien para [búsquedas IC monomórficas](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching), cuando las claves tienen la misma [clase oculta](/). Sin embargo, la mayoría del código del mundo real no sigue este patrón, y con frecuencia las claves tienen diferentes clases ocultas, lo que lleva a búsquedas IC megamórficas más lentas ([megamorphic IC lookups](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching)).

Otro problema con el enfoque de símbolos privados era que desencadenaba una [transición de clase oculta](/#fast-property-access) en la clave al almacenar el código hash. Esto resultaba en un código pobremente polimórfico no solo para la búsqueda del código hash, sino también para otras búsquedas de propiedades en la clave y [desoptimización](https://floitsch.blogspot.com/2012/03/optimizing-for-v8-inlining.html) del código optimizado.

## Almacenes de respaldo de objetos JavaScript

Un objeto de JavaScript (`JSObject`) en V8 usa dos palabras (aparte de su encabezado): una palabra para almacenar un puntero al almacén de respaldo de los elementos, y otra palabra para almacenar un puntero al almacén de respaldo de las propiedades.

El almacén de respaldo de los elementos se utiliza para almacenar propiedades que parecen [índices de arreglo](https://tc39.es/ecma262/#sec-array-index), mientras que el almacén de respaldo de las propiedades se utiliza para almacenar propiedades cuyas claves son cadenas o símbolos. Consulta esta [publicación en el blog de V8](/blog/fast-properties) de Camillo Bruni para más información sobre estos almacenes de respaldo.

```js
const x = {};
x[1] = &apos;bar&apos;;      // ← almacenado en elementos
x[&apos;foo&apos;] = &apos;bar&apos;;  // ← almacenado en propiedades
```

## Ocultando el código hash

La solución más sencilla para almacenar el código hash sería extender el tamaño de un objeto JavaScript por una palabra y almacenar el código hash directamente en el objeto. Sin embargo, esto desperdiciaría memoria para los objetos que no se agreguen a una tabla hash. En su lugar, podríamos intentar almacenar el código hash en el almacén de elementos o en el almacén de propiedades.

El almacén de respaldo de elementos es un arreglo que contiene su longitud y todos los elementos. No hay mucho que hacer aquí, ya que almacenar el código hash en un espacio reservado (como el índice 0) todavía desperdiciaría memoria cuando no usamos el objeto como una clave en una tabla hash.

Veamos el almacén de respaldo de propiedades. Hay dos tipos de estructuras de datos utilizadas como almacén de respaldo de propiedades: arreglos y diccionarios.

A diferencia del arreglo utilizado en el almacén de respaldo de elementos que no tiene un límite superior, el arreglo utilizado en el almacén de respaldo de propiedades tiene un límite superior de 1022 valores. V8 transiciona al uso de un diccionario cuando se excede este límite por razones de rendimiento. (Estoy simplificando un poco esto — V8 también puede usar un diccionario en otros casos, pero existe un límite superior fijo en el número de valores que se pueden almacenar en el arreglo.)

Entonces, hay tres posibles estados para el almacén de respaldo de propiedades:

1. vacío (sin propiedades)
2. arreglo (puede almacenar hasta 1022 valores)
3. diccionario

Hablemos de cada uno de estos.

### El almacenamiento de propiedades está vacío

En el caso vacío, podemos almacenar directamente el código hash en este desplazamiento del `JSObject`.

![](/_img/hash-code/properties-backing-store-empty.png)

### El almacenamiento de propiedades es un arreglo

V8 representa enteros menores a 2<sup>31</sup> (en sistemas de 32 bits) sin embolsar, como [Smi](https://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations)s. En un Smi, el bit menos significativo es una etiqueta utilizada para distinguirlo de los punteros, mientras que los 31 bits restantes contienen el valor entero real.

Normalmente, los arreglos almacenan su longitud como un Smi. Dado que sabemos que la capacidad máxima de este arreglo es solo 1022, solo necesitamos 10 bits para almacenar la longitud. ¡Podemos usar los 21 bits restantes para almacenar el código hash!

![](/_img/hash-code/properties-backing-store-array.png)

### El almacenamiento de propiedades es un diccionario

En el caso del diccionario, aumentamos el tamaño del diccionario en 1 palabra para almacenar el código hash en una ranura dedicada al principio del diccionario. Nos permitimos un posible desperdicio de una palabra de memoria en este caso, porque el aumento proporcional en el tamaño no es tan grande como en el caso del arreglo.

![](/_img/hash-code/properties-backing-store-dictionary.png)

Con estos cambios, la búsqueda del código hash ya no tiene que pasar por la compleja maquinaria de búsqueda de propiedades de JavaScript.

## Mejoras en el rendimiento

El benchmark [SixSpeed](https://github.com/kpdecker/six-speed) mide el rendimiento de Map y Set, y estos cambios resultaron en una mejora de ~500%.

![](/_img/hash-code/sixspeed.png)

Este cambio también causó una mejora del 5% en el benchmark Basic de [ARES6](https://webkit.org/blog/7536/jsc-loves-es6/).

![](/_img/hash-code/ares-6.png)

Esto también resultó en una mejora del 18% en uno de los benchmarks del conjunto de pruebas [Emberperf](http://emberperf.eviltrout.com/) que evalúa Ember.js.

![](/_img/hash-code/emberperf.jpg)
