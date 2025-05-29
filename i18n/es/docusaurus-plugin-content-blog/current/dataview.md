---
title: &apos;Mejorando el rendimiento de `DataView` en V8&apos;
author: &apos;Théotime Grohens, <i lang="fr">le savant de Data-Vue</i>, y Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), profesional en rendimiento&apos;
avatars:
  - &apos;benedikt-meurer&apos;
date: 2018-09-18 11:20:37
tags:
  - ECMAScript
  - benchmarks
description: &apos;V8 v6.9 reduce la brecha de rendimiento entre DataView y el código equivalente de TypedArray, haciendo que DataView sea utilizable para aplicaciones reales críticas en términos de rendimiento.&apos;
tweet: &apos;1041981091727466496&apos;
---
[`DataView`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) son una de las dos maneras posibles de realizar accesos a memoria de bajo nivel en JavaScript, siendo la otra los [`TypedArray`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray). Hasta ahora, los `DataView` estaban mucho menos optimizados que los `TypedArray` en V8, lo que resultaba en un menor rendimiento en tareas como cargas de trabajo intensivas gráficamente o al decodificar/codificar datos binarios. Las razones de esto han sido principalmente elecciones históricas, como el hecho de que [asm.js](http://asmjs.org/) eligió `TypedArray` en lugar de `DataView`, incentivando a los motores a centrarse en el rendimiento de los `TypedArray`.

<!--truncate-->
Debido a la penalización en el rendimiento, desarrolladores de JavaScript como el equipo de Google Maps decidieron evitar los `DataView` y depender de los `TypedArray`, a costa de una mayor complejidad en el código. Este artículo explica cómo logramos que el rendimiento de `DataView` igualara — e incluso superara — el código equivalente de `TypedArray` en [V8 v6.9](/blog/v8-release-69), haciendo que `DataView` sea utilizable para aplicaciones reales críticas en términos de rendimiento.

## Antecedentes

Desde la introducción de ES2015, JavaScript ha soportado la lectura y escritura de datos en búferes binarios crudos llamados [`ArrayBuffer`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer). Los `ArrayBuffer` no pueden ser accedidos directamente; en cambio, los programas deben usar un objeto *vista del búfer de matriz* que puede ser un `DataView` o un `TypedArray`.

Los `TypedArray` permiten a los programas acceder al búfer como una matriz de valores de tipo uniforme, como un `Int16Array` o un `Float32Array`.

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

Por otro lado, los `DataView` permiten un acceso a datos más detallado. Permiten al programador elegir el tipo de valores leídos y escritos en el búfer proporcionando métodos especializados para cada tipo de número, lo que los hace útiles para la serialización de estructuras de datos.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // Resultado esperado: 42
console.log(view.getFloat64(1)); // Resultado esperado: 1.76
```

Además, los `DataView` también permiten elegir la endianness del almacenamiento de datos, lo cual puede ser útil al recibir datos de fuentes externas como una red, un archivo o una GPU.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // Escritura en little-endian.
console.log(view.getInt32(0, false)); // Lectura en big-endian.
// Resultado esperado: 0x0DF0AD8B (233876875)
```

La implementación eficiente de `DataView` ha sido una solicitud desde hace mucho tiempo (ver [este informe de error](https://bugs.chromium.org/p/chromium/issues/detail?id=225811) de hace más de 5 años), y nos complace anunciar que el rendimiento de `DataView` ahora está a la par.

## Implementación heredada en el runtime

Hasta hace poco, los métodos de `DataView` solían implementarse como funciones integradas de C++ en el runtime de V8. Esto es muy costoso, ya que cada llamada requería una transición costosa de JavaScript a C++ (y de vuelta).

Para investigar el costo real en términos de rendimiento derivado de esta implementación, configuramos un benchmark de rendimiento que compara la implementación nativa del getter de `DataView` con un envoltorio en JavaScript que simula el comportamiento de `DataView`. Este envoltorio utiliza un `Uint8Array` para leer datos byte a byte desde el búfer subyacente, y luego calcula el valor de retorno a partir de esos bytes. Aquí está, por ejemplo, la función para leer valores enteros sin signo de 32 bits en little-endian:

```js
function LittleEndian(buffer) { // Simula lecturas en little-endian de DataView.
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

Los `TypedArray`s ya están altamente optimizados en V8, por lo que representan el objetivo de rendimiento que queríamos igualar.

![Rendimiento original de `DataView`](/_img/dataview/dataview-original.svg)

Nuestro benchmark muestra que el rendimiento de los getters nativos de `DataView` era hasta **4 veces** más lento que el wrapper basado en `Uint8Array`, tanto para lecturas en big-endian como en little-endian.

## Mejorando el rendimiento base

Nuestro primer paso para mejorar el rendimiento de los objetos `DataView` fue mover la implementación del runtime en C++ a [`CodeStubAssembler` (también conocido como CSA)](/blog/csa). CSA es un lenguaje ensamblador portátil que nos permite escribir código directamente en la representación intermedia a nivel de máquina (IR) de TurboFan, y lo usamos para implementar partes optimizadas de la biblioteca estándar de JavaScript de V8. Reescribir código en CSA elude por completo la llamada a C++ y también genera un código máquina eficiente aprovechando el backend de TurboFan.

Sin embargo, escribir código CSA manualmente es laborioso. El flujo de control en CSA se expresa de manera similar a ensamblador, utilizando etiquetas explícitas y `goto`s, lo que hace que el código sea más difícil de leer y entender rápidamente.

Para facilitar a los desarrolladores contribuir a la biblioteca estándar optimizada de JavaScript en V8, y para mejorar la legibilidad y mantenibilidad, comenzamos a diseñar un nuevo lenguaje llamado V8 *Torque*, que se compila en CSA. El objetivo de *Torque* es abstraer los detalles de bajo nivel que hacen que el código CSA sea más difícil de escribir y mantener, mientras se mantiene el mismo perfil de rendimiento.

Reescribir el código de `DataView` fue una excelente oportunidad para comenzar a usar Torque para un nuevo código, y ayudó a proporcionar a los desarrolladores de Torque muchos comentarios sobre el lenguaje. Esto es lo que parece el método `getUint32()` de `DataView`, escrito en Torque:

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

Mover los métodos `DataView` a Torque ya mostró una **mejora del 3×** en rendimiento, pero aún no alcanzaba el rendimiento del wrapper basado en `Uint8Array`.

![Rendimiento `DataView` con Torque](/_img/dataview/dataview-torque.svg)

## Optimización para TurboFan

Cuando el código JavaScript se calienta, lo compilamos utilizando nuestro compilador optimizador TurboFan, para generar código máquina altamente optimizado que se ejecuta de manera más eficiente que el bytecode interpretado.

TurboFan funciona traduciendo el código JavaScript entrante en una representación gráfica interna (más precisamente, [un “mar de nodos”](https://darksi.de/d.sea-of-nodes/)). Comienza con nodos de alto nivel que coinciden con las operaciones y semánticas de JavaScript, y gradualmente los refina en nodos de nivel más bajo, hasta que finalmente genera código máquina.

En particular, una llamada a función, como llamar a uno de los métodos de `DataView`, se representa internamente como un nodo `JSCall`, que finalmente se traduce en una llamada a función real en el código máquina generado.

Sin embargo, TurboFan nos permite verificar si el nodo `JSCall` es realmente una llamada a una función conocida, por ejemplo una de las funciones integradas, e insertar este nodo en la IR. Esto significa que el complejo `JSCall` se reemplaza en tiempo de compilación por un subgrafo que representa la función. Esto permite que TurboFan optimice el interior de la función en pases posteriores como parte de un contexto más amplio, en lugar de por sí sola, y lo más importante, eliminar la costosa llamada a función.

![Rendimiento inicial de `DataView` con TurboFan](/_img/dataview/dataview-turbofan-initial.svg)

Implementar la inserción de TurboFan finalmente nos permitió igualar, e incluso superar, el rendimiento de nuestro wrapper de `Uint8Array`, y ser **8 veces** más rápido que la implementación anterior en C++.

## Más optimizaciones de TurboFan

Mirando el código máquina generado por TurboFan después de insertar los métodos `DataView`, todavía había espacio para algunas mejoras. La primera implementación de esos métodos intentó seguir el estándar bastante de cerca, y lanzaba errores cuando la especificación indicaba hacerlo (por ejemplo, al intentar leer o escribir fuera de los límites del `ArrayBuffer` subyacente).

Sin embargo, el código que escribimos en TurboFan está diseñado para ser optimizado y tan rápido como sea posible para los casos comunes y críticos: no necesita admitir todos los casos límite posibles. Al eliminar todo el manejo intrincado de esos errores y simplemente desoptimizar de nuevo a la implementación básica de Torque cuando necesitamos lanzar una excepción, pudimos reducir el tamaño del código generado en alrededor del 35%, generando una aceleración bastante notable, además de un código TurboFan considerablemente más simple.

Siguiendo esta idea de ser lo más especializado posible en TurboFan, también eliminamos el soporte para índices o desplazamientos que son demasiado grandes (fuera del rango de Smi) dentro del código optimizado por TurboFan. Esto nos permitió eliminar el manejo de la aritmética de float64 que se necesita para desplazamientos que no encajan en un valor de 32 bits y evitar almacenar enteros grandes en el heap.

En comparación con la implementación inicial de TurboFan, esto más que duplicó la puntuación del benchmark de `DataView`. ¡Los `DataView`s ahora son hasta 3 veces más rápidos que el wrapper de `Uint8Array`, y aproximadamente **16 veces más rápidos** que nuestra implementación original de `DataView`!

![Rendimiento final de TurboFan `DataView`](/_img/dataview/dataview-turbofan-final.svg)

## Impacto

Hemos evaluado el impacto en el rendimiento de la nueva implementación con algunos ejemplos del mundo real, además de nuestro propio benchmark.

Los `DataView`s se utilizan a menudo cuando se decodifican datos codificados en formatos binarios desde JavaScript. Uno de esos formatos binarios es [FBX](https://es.wikipedia.org/wiki/FBX), un formato que se utiliza para intercambiar animaciones 3D. Hemos instrumentado el cargador FBX de la popular biblioteca de JavaScript 3D [three.js](https://threejs.org/) y medimos una reducción del 10% (alrededor de 80 ms) en su tiempo de ejecución.

Comparamos el rendimiento general de los `DataView`s con los `TypedArray`s. Encontramos que nuestra nueva implementación de `DataView` ofrece casi el mismo rendimiento que los `TypedArray`s al acceder a datos alineados en la endianness nativa (little-endian en procesadores Intel), cerrando gran parte de la brecha de rendimiento y haciendo de los `DataView`s una opción práctica en V8.

![Rendimiento máximo de `DataView` vs. `TypedArray`](/_img/dataview/dataview-vs-typedarray.svg)

Esperamos que ahora puedas comenzar a usar `DataView`s donde tenga sentido, en lugar de depender de los shims de `TypedArray`. ¡Envíanos tus comentarios sobre tus usos de `DataView`! Puedes contactarnos [a través de nuestro rastreador de errores](https://crbug.com/v8/new), por correo en v8-users@googlegroups.com, o a través de [@v8js en Twitter](https://twitter.com/v8js).
