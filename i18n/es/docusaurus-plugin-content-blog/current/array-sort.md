---
title: 'Ordenando las cosas en V8'
author: 'Simon Zünd ([@nimODota](https://twitter.com/nimODota)), comparador consistente'
avatars:
  - simon-zuend
date: 2018-09-28 11:20:37
tags:
  - ECMAScript
  - internals
description: 'A partir de V8 v7.0 / Chrome 70, Array.prototype.sort es estable.'
tweet: '1045656758700650502'
---
`Array.prototype.sort` fue una de las últimas funciones integradas implementadas en JavaScript autohospedado en V8. Trasladarlo nos dio la oportunidad de experimentar con diferentes algoritmos y estrategias de implementación y finalmente [hacerlo estable](https://mathiasbynens.be/demo/sort-stability) en V8 v7.0 / Chrome 70.

<!--truncate-->
## Antecedentes

Ordenar en JavaScript es difícil. Esta publicación en el blog examina algunas de las peculiaridades en la interacción entre un algoritmo de ordenación y el lenguaje JavaScript, y describe nuestro viaje para mover V8 a un algoritmo estable y hacer que el rendimiento sea más predecible.

Al comparar diferentes algoritmos de ordenación, observamos su peor y promedio desempeño dado como un límite en el crecimiento asintótico (es decir, notación “Big O”) de las operaciones de memoria o el número de comparaciones. Ten en cuenta que en lenguajes dinámicos, como JavaScript, una operación de comparación generalmente es mucho más costosa que un acceso a la memoria. Esto se debe al hecho de que, al ordenar, comparar dos valores generalmente implica llamadas a código del usuario.

Echemos un vistazo a un ejemplo simple de ordenar algunos números en orden ascendente basado en una función de comparación proporcionada por el usuario. Una función de comparación _consistente_ devuelve `-1` (o cualquier otro valor negativo), `0`, o `1` (o cualquier otro valor positivo) cuando los dos valores proporcionados son respectivamente menores, iguales o mayores. Una función de comparación que no sigue este patrón es _inconsistente_ y puede tener efectos secundarios arbitrarios, como modificar el array que se pretende ordenar.

```js
const array = [4, 2, 5, 3, 1];

function compare(a, b) {
  // Aquí puede ir código arbitrario, por ejemplo `array.push(1);`.
  return a - b;
}

// Una llamada de ordenación “típica”.
array.sort(compare);
```

Incluso en el siguiente ejemplo, pueden ocurrir llamadas al código de usuario. La función de comparación “predeterminada” llama a `toString` en ambos valores y realiza una comparación lexicográfica en las representaciones de cadenas.

```js
const array = [4, 2, 5, 3, 1];

array.push({
  toString() {
    // Aquí puede ir código arbitrario, por ejemplo `array.push(1);`.
    return '42';
  }
});

// Ordenar sin una función de comparación.
array.sort();
```

### Más diversión con accesorios e interacciones con la cadena de prototipos

Esta es la parte donde dejamos atrás la especificación y nos aventuramos en el territorio del comportamiento “definido por la implementación”. La especificación tiene toda una lista de condiciones que, cuando se cumplen, permiten al motor ordenar el objeto/array como le parezca — o no hacerlo en absoluto. Los motores aún deben seguir algunas reglas básicas, pero todo lo demás está prácticamente en el aire. Por un lado, esto brinda a los desarrolladores de motores la libertad de experimentar con diferentes implementaciones. Por otro lado, los usuarios esperan un comportamiento razonable, aunque la especificación no lo requiera. Esto se complica aún más por el hecho de que “comportamiento razonable” no siempre es fácil de determinar.

Esta sección muestra que todavía hay algunos aspectos de `Array#sort` donde el comportamiento del motor varía considerablemente. Estos son casos extremos complicados, y como se mencionó anteriormente, no siempre está claro cuál es “la decisión correcta”. _Altamente_ recomendamos no escribir código como este; los motores no lo optimizarán.

El primer ejemplo muestra un array con algunos accesorios (es decir, getters y setters) y un “registro de llamadas” en diferentes motores de JavaScript. Los accesorios son el primer caso donde el orden de ordenación resultante está definido por la implementación:

```js
const array = [0, 1, 2];

Object.defineProperty(array, '0', {
  get() { console.log('get 0'); return 0; },
  set(v) { console.log('set 0'); }
});

Object.defineProperty(array, '1', {
  get() { console.log('get 1'); return 1; },
  set(v) { console.log('set 1'); }
});

array.sort();
```

Aquí está el resultado de ese fragmento en varios motores. Observa que no hay respuestas “correctas” o “incorrectas” aquí: ¡la especificación deja esto a la implementación!

```
// Chakra
get 0
get 1
set 0
set 1

// JavaScriptCore
get 0
get 1
get 0
get 0
get 1
get 1
set 0
set 1

// V8
get 0
get 0
get 1
get 1
get 1
get 0

#### SpiderMonkey
get 0
get 1
set 0
set 1
```

El próximo ejemplo muestra interacciones con la cadena de prototipos. Por motivos de brevedad no mostramos el registro de llamadas.

```js
const object = {
 1: 'd1',
 2: 'c1',
 3: 'b1',
 4: undefined,
 __proto__: {
   length: 10000,
   1: 'e2',
   10: 'a2',
   100: 'b2',
   1000: 'c2',
   2000: undefined,
   8000: 'd2',
   12000: 'XX',
   __proto__: {
     0: 'e3',
     1: 'd3',
     2: 'c3',
     3: 'b3',
     4: 'f3',
     5: 'a3',
     6: undefined,
   },
 },
};
Array.prototype.sort.call(object);
```

La salida muestra el `object` después de haber sido ordenado. Nuevamente, no hay una respuesta correcta aquí. Este ejemplo solo muestra cuán extraña puede ser la interacción entre las propiedades indexadas y la cadena de prototipos:

```js
// Chakra
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// JavaScriptCore
['a2', 'a2', 'a3', 'b1', 'b2', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined]

// V8
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// SpiderMonkey
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]
```

### Lo que hace V8 antes y después de ordenar

:::note
**Nota:** Esta sección fue actualizada en junio de 2019 para reflejar los cambios en el preprocesamiento y posprocesamiento de `Array#sort` en V8 v7.7.
:::

V8 tiene un paso de preprocesamiento antes de realmente ordenar algo y también un paso de posprocesamiento. La idea básica es recopilar todos los valores que no son `undefined` en una lista temporal, ordenar esta lista temporal y luego escribir los valores ordenados nuevamente en el array u objeto original. Esto libera a V8 de preocuparse por interactuar con los accesores o la cadena de prototipos durante la propia ordenación.

El estándar espera que `Array#sort` produzca un orden de clasificación que conceptualmente pueda dividirse en tres segmentos:

  1. Todos los valores que no son `undefined` ordenados con respecto a la función de comparación.
  1. Todos los valores `undefined`.
  1. Todos los espacios vacíos, es decir, propiedades inexistentes.

El algoritmo de ordenamiento real solo necesita aplicarse al primer segmento. Para lograr esto, V8 realiza un paso de preprocesamiento aproximadamente de la siguiente manera:

  1. Asignar `length` como el valor de la propiedad `"length"` del array u objeto a ordenar.
  1. Asignar `numberOfUndefineds` como 0.
  1. Para cada `value` en el rango `[0, length)`:
    a. Si `value` es un espacio vacío: no hacer nada.
    b. Si `value` es `undefined`: incrementar `numberOfUndefineds` en 1.
    c. De lo contrario agregar `value` a una lista temporal `elements`.

Después de ejecutar estos pasos, todos los valores que no son `undefined` están contenidos en la lista temporal `elements`. Los valores `undefined` simplemente se cuentan en lugar de agregarse a `elements`. Como se mencionó anteriormente, el estándar requiere que los `undefined` sean ordenados al final. Sin embargo, los valores `undefined` no se pasan realmente a la función de comparación proporcionada por el usuario, por lo que podemos limitarnos a contar la cantidad de `undefined` que aparecen.

El siguiente paso es ordenar realmente `elements`. Consulta [la sección sobre TimSort](/blog/array-sort#timsort) para una descripción detallada.

Una vez que se completa la ordenación, los valores ordenados deben escribirse nuevamente en el array u objeto original. El paso de posprocesamiento consta de tres fases que manejan los segmentos conceptuales:

  1. Escribir todos los valores desde `elements` en el objeto original en el rango `[0, elements.length)`.
  1. Establecer todos los valores desde `[elements.length, elements.length + numberOfUndefineds)` como `undefined`.
  1. Eliminar todos los valores en el rango `[elements.length + numberOfUndefineds, length)`.

El paso 3 es necesario en caso de que el objeto original contuviera espacios vacíos en el rango de ordenación. Los valores en el rango `[elements.length + numberOfUndefineds, length)` ya se han movido al inicio y no realizar el paso 3 resultaría en valores duplicados.

## Historia

`Array.prototype.sort` y `TypedArray.prototype.sort` dependían de la misma implementación de Quicksort escrita en JavaScript. El propio algoritmo de ordenamiento es bastante sencillo: La base es un Quicksort con un respaldo de Insertion Sort para arrays más cortos (longitud < 10). El respaldo de Insertion Sort también se usaba cuando la recursión de Quicksort alcanzaba una longitud de sub-array de 10. Insertion Sort es más eficiente para arrays más pequeños. Esto se debe a que Quicksort se llama recursivamente dos veces después de la partición. Cada llamada recursiva tenía la sobrecarga de crear (y descartar) un marco de pila.

Elegir un elemento pivote adecuado tiene un gran impacto en Quicksort. V8 empleaba dos estrategias:

- El pivote se elegía como la mediana del primer, último y un tercer elemento del sub-array que se estaba ordenando. Para arrays más pequeños, ese tercer elemento simplemente era el elemento medio.
- Para arrays más grandes se tomaba una muestra, luego se ordenaba y la mediana de la muestra ordenada servía como el tercer elemento en el cálculo anterior.

Una de las ventajas de Quicksort es que ordena en el lugar. La sobrecarga de memoria proviene de asignar un pequeño array para la muestra al ordenar arrays grandes, y el espacio de pila log(n). El inconveniente es que no es un algoritmo estable y existe la posibilidad de que el algoritmo alcance el peor escenario, donde Quicksort se degrada a 𝒪(n²).

### Introducción de V8 Torque

Como lector ávido del blog de V8, es posible que hayas oído hablar de [`CodeStubAssembler`](/blog/csa) o CSA, por sus siglas en inglés. CSA es un componente de V8 que nos permite escribir TurboFan IR de bajo nivel directamente en C++, que luego se traduce a código máquina para la arquitectura correspondiente usando el backend de TurboFan.

CSA se utiliza ampliamente para escribir los llamados 'caminos rápidos' para las funcionalidades integradas de JavaScript. Una versión de camino rápido de una funcionalidad integrada generalmente verifica si se cumplen ciertos invariantes (por ejemplo, sin elementos en la cadena prototipo, sin accesores, etc.) y luego utiliza operaciones más rápidas y específicas para implementar la funcionalidad integrada. Esto puede resultar en tiempos de ejecución que son una orden de magnitud más rápidos que una versión más genérica.

La desventaja de CSA es que realmente puede considerarse un lenguaje ensamblador. El flujo de control se modela usando `labels` y `gotos` explícitos, lo que hace que implementar algoritmos más complejos en CSA sea difícil de leer y propenso a errores.

Entra [V8 Torque](/docs/torque). Torque es un lenguaje específico de dominio con una sintaxis similar a TypeScript que actualmente usa CSA como su único objetivo de compilación. Torque permite casi el mismo nivel de control que CSA, mientras ofrece al mismo tiempo constructos de nivel superior como bucles `while` y `for`. Además, es fuertemente tipado y en el futuro incluirá controles de seguridad como verificaciones automáticas fuera de límites, proporcionando a los ingenieros de V8 garantías más sólidas.

Las primeras funcionalidades principales que se reescribieron en V8 Torque fueron [`TypedArray#sort`](/blog/v8-release-68) y las [operaciones de `Dataview`](/blog/dataview). Ambas sirvieron el propósito adicional de proporcionar retroalimentación a los desarrolladores de Torque sobre qué características del lenguaje son necesarias y qué patrones deberían usarse para escribir funcionalidades integradas eficientemente. En el momento de la redacción, varias funcionalidades integradas de `JSArray` trasladaron sus implementaciones de respaldo autoalojadas en JavaScript a Torque (por ejemplo, `Array#unshift`), mientras que otras fueron completamente reescritas (por ejemplo, `Array#splice` y `Array#reverse`).

### Trasladando `Array#sort` a Torque

La versión inicial de Torque de `Array#sort` fue más o menos una traducción directa de la implementación en JavaScript. La única diferencia era que, en lugar de usar un enfoque de muestreo para matrices más grandes, el tercer elemento para el cálculo del pivote se elegía al azar.

Esto funcionó razonablemente bien, pero como aún utilizaba Quicksort, `Array#sort` seguía siendo inestable. [La solicitud de un `Array#sort` estable](https://bugs.chromium.org/p/v8/issues/detail?id=90) está entre los tickets más antiguos en el rastreador de bugs de V8. Experimentar con Timsort como un siguiente paso nos ofreció múltiples cosas. Primero, nos gusta que sea estable y ofrezca algunas garantías algorítmicas agradables (ver siguiente sección). Segundo, Torque aún estaba en desarrollo y la implementación de una funcionalidad integrada más compleja como `Array#sort` con Timsort resultó en mucha retroalimentación utilizable que influenció a Torque como lenguaje.

## Timsort

Timsort, inicialmente desarrollado por Tim Peters para Python en 2002, podría describirse mejor como una variante adaptativa y estable de Mergesort. Aunque los detalles son bastante complejos y se describen mejor por [el propio autor](https://github.com/python/cpython/blob/master/Objects/listsort.txt) o en la [página de Wikipedia](https://en.wikipedia.org/wiki/Timsort), los conceptos básicos son fáciles de entender. Mientras que Mergesort usualmente funciona de manera recursiva, Timsort opera de forma iterativa. Procesa un arreglo de izquierda a derecha y busca las llamadas _runs_. Un run es simplemente una secuencia que ya está ordenada. Esto incluye secuencias que están ordenadas “de forma incorrecta”, ya que estas secuencias simplemente pueden invertirse para formar un run. Al inicio del proceso de ordenamiento se determina una longitud mínima de run que depende de la longitud de la entrada. Si Timsort no puede encontrar runs naturales de esta longitud mínima, un run se 'mejora artificialmente' utilizando Insertion Sort.

Los runs encontrados de esta manera se rastrean utilizando una pila que recuerda un índice de inicio y una longitud de cada run. De vez en cuando, los runs en la pila se combinan hasta que solo queda un run ordenado. Timsort trata de mantener un balance al decidir qué runs combinar. Por un lado, se intenta combinar temprano ya que los datos de esos runs tienen una alta probabilidad de estar ya en la caché; por otro lado, se intenta combinar lo más tarde posible para aprovechar los patrones en los datos que puedan surgir. Para lograr esto, Timsort mantiene dos invariantes. Suponiendo que `A`, `B` y `C` son los tres runs superiores:

- `|C| > |B| + |A|`
- `|B| > |A|`

![Pila de runs antes y después de combinar `A` con `B`](/_img/array-sort/runs-stack.svg)

La imagen muestra el caso en que `|A| > |B|`, por lo que `B` se combina con el más pequeño de los dos runs.

Tenga en cuenta que Timsort solo combina runs consecutivos, esto es necesario para mantener la estabilidad; de lo contrario, los elementos iguales se transferirían entre runs. Además, la primera invariante asegura que las longitudes de los runs crezcan al menos tan rápido como los números de Fibonacci, proporcionando un límite superior del tamaño de la pila de runs cuando sabemos la longitud máxima del arreglo.

Ahora se puede ver que las secuencias ya ordenadas se ordenan en 𝒪(n), ya que tal arreglo resultaría en un único run que no necesita combinarse. El peor caso es 𝒪(n log n). Estas propiedades algorítmicas, junto con la naturaleza estable de Timsort, fueron algunas de las razones por las que al final elegimos Timsort sobre Quicksort.

### Implementando Timsort en Torque

Los Builtins usualmente tienen diferentes rutas de código que se eligen durante el tiempo de ejecución dependiendo de varias variables. La versión más genérica puede manejar cualquier tipo de objeto, ya sea un `JSProxy`, tenga interceptores o necesite realizar búsquedas en la cadena de prototipos al recuperar o establecer propiedades.
La ruta genérica es bastante lenta en la mayoría de los casos, ya que debe considerar todas las eventualidades. Pero si sabemos de antemano que el objeto a ordenar es un simple `JSArray` que contiene solo Smis, todas estas costosas operaciones de `[[Get]]` y `[[Set]]` pueden ser reemplazadas por simples operaciones de carga y almacenamiento en un `FixedArray`. El principal diferenciador es [`ElementsKind`](/blog/elements-kinds).

El problema ahora reside en cómo implementar una ruta rápida. El algoritmo central permanece igual para todos, pero la forma en que accedemos a los elementos cambia dependiendo del `ElementsKind`. Una forma en que podríamos lograr esto es despachando al “accesor” correcto en cada sitio de llamada. Imagina un switch para cada operación de “carga”/“almacenamiento” donde elegimos una rama diferente basada en la ruta rápida elegida.

Otra solución (y este fue el primer enfoque intentado) es simplemente copiar todo el builtin una vez por cada ruta rápida e insertar el método de carga/almacenamiento correcto. Este enfoque resultó ser inviable para Timsort ya que es un builtin grande y hacer una copia para cada ruta rápida resultó requerir 106 KB en total, lo cual es demasiado para un solo builtin.

La solución final es ligeramente diferente. Cada operación de carga/almacenamiento para cada ruta rápida se coloca en su propio “mini-builtin”. Ver el ejemplo de código que muestra la operación de “carga” para `FixedDoubleArray`s.

```torque
Load<FastDoubleElements>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  try {
    const elems: FixedDoubleArray = UnsafeCast<FixedDoubleArray>(elements);
    const value: float64 =
        LoadDoubleWithHoleCheck(elems, index) otherwise Bailout;
    return AllocateHeapNumberWithValue(value);
  }
  label Bailout {
    // El paso de preprocesamiento eliminó todos los huecos compactando todos los elementos
    // al principio del array. Encontrar un hueco significa que la función cmp o
    // ToString cambia el array.
    return Failure(sortState);
  }
}
```

Por comparación, la operación de “carga” más genérica es simplemente una llamada a `GetProperty`. Pero mientras que la versión anterior genera código máquina eficiente y rápido para cargar y convertir un `Number`, `GetProperty` es una llamada a otro builtin que podría potencialmente involucrar una búsqueda en la cadena de prototipos o invocar una función accesoria.

```js
builtin Load<ElementsAccessor : type>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  return GetProperty(context, elements, index);
}
```

Una ruta rápida entonces simplemente se convierte en un conjunto de punteros de función. Esto significa que solo necesitamos una copia del algoritmo central mientras configuramos todos los punteros de función relevantes una vez al inicio. Aunque esto reduce enormemente el espacio necesario para el código (hasta 20k), viene con el costo de una rama indirecta en cada sitio de acceso. Esto se ve aún más agravado por el cambio reciente para usar [builtins integrados](/blog/embedded-builtins).

### Estado de ordenación

![](/_img/array-sort/sort-state.svg)

La imagen de arriba muestra el “estado de ordenación”. Es un `FixedArray` que realiza un seguimiento de todas las cosas necesarias durante la ordenación. Cada vez que se llama a `Array#sort`, se asigna dicho estado de ordenación. Las entradas 4 a 7 son el conjunto de punteros de función discutidos arriba que comprenden una ruta rápida.

El builtin “check” se utiliza cada vez que regresamos del código JavaScript del usuario, para verificar si podemos continuar en la ruta rápida actual. Utiliza el “mapa del receptor inicial” y la “longitud del receptor inicial” para esto. Si el código del usuario ha modificado el objeto actual, simplemente abandonamos la ejecución de la ordenación, restablecemos todos los punteros a su versión más genérica y reiniciamos el proceso de ordenación. El “estado de salida” en la ranura 8 se utiliza para señalar este reinicio.

La entrada “compare” puede apuntar a dos builtins diferentes. Uno llama a una función de comparación proporcionada por el usuario, mientras que el otro implementa la comparación predeterminada que llama a `toString` en ambos argumentos y luego realiza una comparación lexicográfica.

El resto de los campos (con la excepción del ID de la ruta rápida) son específicos de Timsort. La pila de ejecuciones (descrita anteriormente) se inicializa con un tamaño de 85, lo cual es suficiente para ordenar arrays de longitud 2<sup>64</sup>. El array temporal se utiliza para fusionar ejecuciones. Aumenta de tamaño según sea necesario pero nunca excede `n/2` donde `n` es la longitud de entrada.

### Compensaciones de rendimiento

Mover el ordenamiento de JavaScript autoalojado a Torque conlleva compromisos de rendimiento. Dado que `Array#sort` está escrito en Torque, ahora es un código compilado estáticamente, lo que significa que todavía podemos construir rutas rápidas para ciertos [`ElementsKind`s](/blog/elements-kinds), pero nunca será tan rápido como una versión altamente optimizada de TurboFan que pueda aprovechar la retroalimentación de tipos. Por otro lado, en casos donde el código no se calienta lo suficiente como para justificar la compilación JIT o el sitio de llamada es megamórfico, estamos atascados con el intérprete o una versión lenta/genérica. El análisis, la compilación y la posible optimización de la versión de JavaScript autoalojada también son una sobrecarga que no se necesita con la implementación de Torque.

Si bien el enfoque Torque no da como resultado el mismo rendimiento máximo para el ordenamiento, evita caídas de rendimiento. El resultado es un rendimiento de ordenamiento mucho más predecible de lo que era anteriormente. Tenga en cuenta que Torque está en constante evolución y, además de apuntar a CSA, podría apuntar a TurboFan en el futuro, permitiendo la compilación JIT del código escrito en Torque.

### Microbenchmarks

Antes de comenzar con `Array#sort`, agregamos muchos micro-benchmarks diferentes para entender mejor el impacto que tendría la reimplementación. El primer gráfico muestra el caso de uso “normal” de ordenar varios `ElementsKinds` con una función de comparación proporcionada por el usuario.

Tenga en cuenta que en estos casos el compilador JIT puede hacer mucho trabajo, ya que el ordenamiento es casi todo lo que hacemos. Esto también permite al compilador de optimización incluir la función de comparación en la versión de JavaScript, mientras que en el caso de Torque tenemos la sobrecarga de llamada del builtin a JavaScript. Aún así, obtenemos un mejor rendimiento en casi todos los casos.

![](/_img/array-sort/micro-bench-basic.svg)

El siguiente gráfico muestra el impacto de Timsort al procesar arreglos que ya están completamente ordenados, o tienen subsecuencias que ya están ordenadas de una u otra manera. El gráfico usa Quicksort como línea de base y muestra la aceleración de Timsort (hasta 17× en el caso de “DownDown”, donde el arreglo consiste en dos secuencias ordenadas inversamente). Como se puede ver, excepto en el caso de datos aleatorios, Timsort funciona mejor en todos los demás casos, incluso cuando estamos ordenando `PACKED_SMI_ELEMENTS`, donde Quicksort superó a Timsort en el microbenchmark anterior.

![](/_img/array-sort/micro-bench-presorted.svg)

### Benchmark de herramientas web

El [Benchmark de herramientas web](https://github.com/v8/web-tooling-benchmark) es una colección de cargas de trabajo de herramientas comúnmente utilizadas por desarrolladores web como Babel y TypeScript. El gráfico usa Quicksort en JavaScript como línea de base y compara la aceleración de Timsort en su contra. En casi todos los benchmarks mantenemos el mismo rendimiento con la excepción de chai.

![](/_img/array-sort/web-tooling-benchmark.svg)

El benchmark chai pasa *un tercio* de su tiempo dentro de una sola función de comparación (un cálculo de distancia de cadenas). El benchmark es la suite de pruebas del propio chai. Debido a los datos, Timsort necesita algunas comparaciones más en este caso, lo que tiene un mayor impacto en el tiempo total de ejecución, ya que una porción tan grande del tiempo se gasta en esa función de comparación en particular.

### Impacto en la memoria

El análisis de las instantáneas de heap de V8 mientras se navega por unos 50 sitios (tanto en dispositivos móviles como en escritorio) no mostró variaciones en el consumo de memoria, ni aumentos ni mejoras. Por un lado, esto es sorprendente: el cambio de Quicksort a Timsort introdujo la necesidad de un arreglo temporal para la fusión de ejecuciones, que puede crecer mucho más que los arreglos temporales utilizados para el muestreo. Por otro lado, estos arreglos temporales son de vida muy corta (solo durante la duración de la llamada a `sort`) y pueden ser asignados y descartados rápidamente en el espacio nuevo de V8.

## Conclusión

En resumen, nos sentimos mucho mejor sobre las propiedades algorítmicas y el comportamiento de rendimiento predecible de un Timsort implementado en Torque. Timsort está disponible a partir de V8 v7.0 y Chrome 70. ¡Feliz ordenamiento!
