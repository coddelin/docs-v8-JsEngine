---
title: 'La historia de un límite de rendimiento en V8 para React'
author: 'Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)) y Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'benedikt-meurer'
  - 'mathias-bynens'
date: 2019-08-28 16:45:00
tags:
  - internals
  - presentaciones
description: 'Este artículo describe cómo V8 elige representaciones optimizadas en memoria para varios valores de JavaScript, y cómo eso impacta en la maquinaria de formas. Todo esto ayuda a explicar un reciente límite de rendimiento en V8 en el núcleo de React.'
tweet: '1166723359696130049'
---
[Anteriormente](https://mathiasbynens.be/notes/shapes-ics), discutimos cómo los motores de JavaScript optimizan el acceso a objetos y arreglos mediante el uso de Shapes y Inline Caches, y exploramos [cómo los motores aceleran el acceso a las propiedades de prototipo](https://mathiasbynens.be/notes/prototypes) en particular. Este artículo describe cómo V8 elige representaciones en memoria óptimas para varios valores de JavaScript, y cómo eso impacta en la maquinaria de formas, todo lo cual ayuda a explicar [un reciente límite de rendimiento en V8 en el núcleo de React](https://github.com/facebook/react/issues/14365).

<!--truncate-->
:::note
**Nota:** Si prefieres ver una presentación en lugar de leer artículos, ¡disfruta el video a continuación! Si no, salta el video y continúa leyendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">“Fundamentos de motores JavaScript: lo bueno, lo malo y lo feo”</a> presentado por Mathias Bynens y Benedikt Meurer en AgentConf 2019.</figcaption>
</figure>

## Tipos de JavaScript

Cada valor de JavaScript tiene exactamente uno de (actualmente) ocho tipos diferentes: `Number`, `String`, `Symbol`, `BigInt`, `Boolean`, `Undefined`, `Null` y `Object`.

![](/_img/react-cliff/01-javascript-types.svg)

Con una excepción notable, estos tipos son observables en JavaScript a través del operador `typeof`:

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null` devuelve `'object'`, y no `'null'`, a pesar de que `Null` es un tipo propio. Para entender por qué, considera que el conjunto de todos los tipos de JavaScript se divide en dos grupos:

- _objetos_ (es decir, el tipo `Object`)
- _primitivos_ (es decir, cualquier valor no objeto)

Por lo tanto, `null` significa “sin valor de objeto”, mientras que `undefined` significa “sin valor”.

![](/_img/react-cliff/02-primitives-objects.svg)

Siguiendo esta línea de pensamiento, Brendan Eich diseñó JavaScript para que `typeof` devuelva `'object'` para todos los valores de la parte derecha, es decir, todos los objetos y valores `null`, siguiendo el espíritu de Java. Es por eso que `typeof null === 'object'` a pesar de que la especificación tiene un tipo `Null` separado.

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## Representación de valores

Los motores de JavaScript deben poder representar valores de JavaScript arbitrarios en memoria. Sin embargo, es importante señalar que el tipo de JavaScript de un valor es independiente de cómo los motores de JavaScript representan ese valor en memoria.

El valor `42`, por ejemplo, tiene el tipo `number` en JavaScript.

```js
typeof 42;
// → 'number'
```

Hay varias maneras de representar un número entero como `42` en memoria:

:::table-wrapper
| representación                      | bits                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| complemento a dos, 8 bits           | `0010 1010`                                                                       |
| complemento a dos, 32 bits          | `0000 0000 0000 0000 0000 0000 0010 1010`                                         |
| decimal codificado en binario (BCD) | `0100 0010`                                                                       |
| punto flotante IEEE-754 de 32 bits  | `0100 0010 0010 1000 0000 0000 0000 0000`                                         |
| punto flotante IEEE-754 de 64 bits  | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

ECMAScript estandariza los números como valores de punto flotante de 64 bits, también conocidos como _punto flotante de doble precisión_ o _Float64_. Sin embargo, eso no significa que los motores de JavaScript almacenen números en representación Float64 todo el tiempo: ¡hacerlo sería extremadamente ineficiente! Los motores pueden elegir otras representaciones internas, siempre que el comportamiento observable coincida exactamente con Float64.

La mayoría de los números en las aplicaciones JavaScript del mundo real resultan ser [índices válidos de arreglo de ECMAScript](https://tc39.es/ecma262/#array-index), es decir, valores enteros en el rango de 0 a 2³²−2.

```js
array[0]; // Índice más pequeño posible de un arreglo.
array[42];
array[2**32-2]; // Índice más grande posible de un arreglo.
```

Los motores de JavaScript pueden elegir una representación óptima en memoria para estos números con el fin de optimizar el código que accede a los elementos de un arreglo por índice. Para que el procesador realice la operación de acceso a la memoria, el índice del arreglo debe estar disponible en [complemento a dos](https://es.wikipedia.org/wiki/Complemento_a_dos). Representar índices de arreglo como Float64 sería ineficiente, ya que el motor tendría que convertir de ida y vuelta entre Float64 y complemento a dos cada vez que alguien accede a un elemento del arreglo.

La representación de complemento a dos de 32 bits no solo es útil para operaciones de arreglo. En general, **los procesadores ejecutan operaciones con enteros mucho más rápido que operaciones con números de punto flotante**. Por eso, en el siguiente ejemplo, el primer bucle es fácilmente el doble de rápido en comparación con el segundo bucle.

```js
for (let i = 0; i < 1000; ++i) {
  // rápido 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // lento 🐌
}
```

Lo mismo ocurre con las operaciones. El rendimiento del operador módulo en el siguiente código depende de si estás trabajando con enteros o no.

```js
const remainder = value % divisor;
// Rápido 🚀 si `value` y `divisor` están representados como enteros,
// lento 🐌 de lo contrario.
```

Si ambos operandos están representados como enteros, la CPU puede calcular el resultado de manera muy eficiente. V8 tiene rutas rápidas adicionales para los casos en los que el `divisor` es una potencia de dos. Para los valores representados como flotantes, el cálculo es mucho más complejo y toma mucho más tiempo.

Dado que las operaciones con enteros generalmente se ejecutan mucho más rápido que las operaciones de punto flotante, parecería que los motores siempre podrían usar complemento a dos para todos los enteros y todos los resultados de operaciones de enteros. Lamentablemente, ¡eso sería una violación de la especificación ECMAScript! ECMAScript se basa en Float64, y por lo tanto, **ciertas operaciones con enteros en realidad producen flotantes**. Es importante que los motores de JavaScript produzcan los resultados correctos en tales casos.

```js
// Float64 tiene un rango seguro para enteros de 53 bits. Más allá de ese rango,
// se pierde precisión.
2**53 === 2**53+1;
// → true

// Float64 admite ceros negativos, por lo que -1 * 0 debe ser -0, pero
// no hay forma de representar un cero negativo en complemento a dos.
-1*0 === -0;
// → true

// Float64 tiene infinitos que pueden producirse mediante división
// por cero.
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64 también tiene NaNs.
0/0 === NaN;
```

Aunque los valores del lado izquierdo son enteros, todos los valores del lado derecho son flotantes. Por esta razón, ninguna de las operaciones anteriores puede realizarse correctamente utilizando el complemento a dos de 32 bits. Los motores de JavaScript deben tener cuidado especial para asegurarse de que las operaciones con enteros retrocedan adecuadamente para producir los sofisticados resultados de Float64.

Para números enteros pequeños en el rango de enteros con signo de 31 bits, V8 utiliza una representación especial llamada `Smi`. Cualquier cosa que no sea un `Smi` se representa como un `HeapObject`, que es la dirección de alguna entidad en memoria. Para los números, usamos un tipo especial de `HeapObject`, el llamado `HeapNumber`, para representar números que no están dentro del rango `Smi`.

```js
 -Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

Como muestra el ejemplo anterior, algunos números en JavaScript se representan como `Smi`s y otros se representan como `HeapNumber`s. V8 está específicamente optimizado para los `Smi`s, porque los enteros pequeños son muy comunes en programas de JavaScript del mundo real. Los `Smi`s no necesitan ser asignados como entidades dedicadas en memoria, y en general permiten operaciones rápidas con enteros.

La conclusión importante aquí es que **incluso los valores con el mismo tipo de JavaScript pueden representarse de formas completamente diferentes** internamente, como optimización.

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

Así es como funciona bajo el capó. Supongamos que tienes el siguiente objeto:

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

El valor `42` para `x` puede codificarse como `Smi`, por lo que puede almacenarse dentro del propio objeto. El valor `4.2`, por otro lado, necesita una entidad separada para contener el valor, y el objeto apunta a esa entidad.

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

Ahora, supongamos que ejecutamos el siguiente fragmento de JavaScript:

```js
o.x += 10;
// → o.x ahora es 52
o.y += 1;
// → o.y ahora es 5.2
```

En este caso, el valor de `x` puede actualizarse internamente, ya que el nuevo valor `52` también entra dentro del rango `Smi`.

![](/_img/react-cliff/05-update-smi.svg)

Sin embargo, el nuevo valor de `y=5.2` no encaja en un `Smi` y también es diferente del valor anterior `4.2`, por lo que V8 debe asignar una nueva entidad `HeapNumber` para la asignación a `y`.

![](/_img/react-cliff/06-update-heapnumber.svg)

Los `HeapNumber`s no son mutables, lo que permite ciertas optimizaciones. Por ejemplo, si asignamos el valor de `y` a `x`:

```js
o.x = o.y;
// → o.x ahora es 5.2
```

…ahora podemos simplemente enlazar al mismo `HeapNumber` en lugar de asignar uno nuevo al mismo valor.

![](/_img/react-cliff/07-heapnumbers.svg)

Un inconveniente de que los `HeapNumber`s sean inmutables es que sería lento actualizar campos con valores fuera del rango de `Smi` con frecuencia, como en el siguiente ejemplo:

```js
// Crear una instancia de `HeapNumber`.
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // Crear una instancia adicional de `HeapNumber`.
  o.x += 1;
}
```

La primera línea crearía una instancia de `HeapNumber` con el valor inicial `0.1`. El cuerpo del bucle cambia este valor a `1.1`, `2.1`, `3.1`, `4.1` y finalmente `5.1`, creando un total de seis instancias de `HeapNumber` en el proceso, cinco de las cuales son basura una vez que se termina el bucle.

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

Para evitar este problema, V8 ofrece una forma de actualizar en el lugar los campos numéricos que no son `Smi`, como una optimización. Cuando un campo numérico contiene valores fuera del rango `Smi`, V8 marca ese campo como un campo `Double` en la forma y asigna un llamado `MutableHeapNumber` que contiene el valor real codificado como Float64.

![](/_img/react-cliff/09-mutableheapnumber.svg)

Cuando el valor del campo cambia, V8 ya no necesita asignar un nuevo `HeapNumber`, sino que simplemente puede actualizar el `MutableHeapNumber` en el lugar.

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

Sin embargo, esta estrategia también tiene una trampa. Dado que el valor de un `MutableHeapNumber` puede cambiar, es importante que estos no se pasen.

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

Por ejemplo, si asignas `o.x` a alguna otra variable `y`, no querrías que el valor de `y` cambie la próxima vez que cambie `o.x`: ¡eso sería una violación de la especificación de JavaScript! Entonces, cuando se accede a `o.x`, el número debe ser *reempacado* en un `HeapNumber` regular antes de asignarlo a `y`.

Para floats, V8 realiza toda la “magia de empaquetado” mencionada anteriormente detrás de escena. Pero para números enteros pequeños sería un desperdicio usar el enfoque de `MutableHeapNumber`, ya que `Smi` es una representación más eficiente.

```js
const object = { x: 1 };
// → sin “empaquetado” para `x` en object

object.x += 1;
// → actualizar el valor de `x` en object
```

Para evitar la ineficiencia, todo lo que tenemos que hacer para enteros pequeños es marcar el campo en la forma como una representación `Smi` y simplemente actualizar el valor numérico en el lugar mientras se ajuste al rango de enteros pequeños.

![](/_img/react-cliff/12-smi-no-boxing.svg)

## Deprecaciones y migraciones de formas

¿Qué sucede si un campo inicialmente contiene un `Smi`, pero luego contiene un número fuera del rango de enteros pequeños? Por ejemplo, con dos objetos que usan la misma forma donde `x` se representa inicialmente como `Smi`:

```js
const a = { x: 1 };
const b = { x: 2 };
// → los objetos tienen `x` como campo `Smi` ahora

b.x = 0.2;
// → `b.x` ahora se representa como un `Double`

y = a.x;
```

Esto comienza con dos objetos que apuntan a la misma forma, donde `x` está marcado como representación `Smi`:

![](/_img/react-cliff/13-shape.svg)

Cuando `b.x` cambia a representación `Double`, V8 asigna una nueva forma donde a `x` se le asigna representación `Double`, y que apunta de regreso a la forma vacía. V8 también asigna un `MutableHeapNumber` para contener el nuevo valor `0.2` para la propiedad `x`. Luego actualizamos el objeto `b` para que apunte a esta nueva forma y cambiamos el espacio en el objeto para que apunte al `MutableHeapNumber` previamente asignado en el desplazamiento 0. Y por último, marcamos la antigua forma como obsoleta y la desvinculamos del árbol de transición. Esto se logra creando una nueva transición para `'x'` desde la forma vacía hacia la forma recién creada.

![](/_img/react-cliff/14-shape-transition.svg)

No podemos eliminar completamente la forma anterior en este punto, ya que aún es usada por `a`, y sería demasiado costoso recorrer la memoria para encontrar todos los objetos que apuntan a la forma antigua y actualizarlos de forma inmediata. En su lugar, V8 hace esto de forma perezosa: cualquier acceso o asignación de propiedad a `a` lo migra primero a la nueva forma. La idea es hacer que la forma obsoleta eventualmente sea inalcanzable y que el recolector de basura la elimine.

![](/_img/react-cliff/15-shape-deprecation.svg)

Un caso más complicado ocurre si el campo que cambia de representación _no es_ el último en la cadena:

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

En ese caso, V8 necesita encontrar la llamada _forma dividida_, que es la última forma en la cadena antes de que se introduzca la propiedad relevante. Aquí estamos cambiando `y`, por lo que necesitamos encontrar la última forma que no tenga `y`, que en nuestro ejemplo es la forma que introdujo `x`.

![](/_img/react-cliff/16-split-shape.svg)

A partir de la forma dividida, creamos una nueva cadena de transición para `y`, que repite todas las transiciones anteriores, pero con `'y'` marcado como representación `Double`. Y usamos esta nueva cadena de transición para `y`, marcando el subárbol antiguo como desechado. En el último paso migramos la instancia `o` a la nueva forma, utilizando un `MutableHeapNumber` para mantener el valor de `y` ahora. De esta manera, los nuevos objetos no toman el camino antiguo, y una vez que desaparecen todas las referencias a la forma antigua, la parte desechada de la forma en el árbol desaparece.

## Transiciones de extensibilidad y nivel de integridad

`Object.preventExtensions()` evita que se agreguen nuevas propiedades a un objeto. Si lo intentas, lanza una excepción. (Si no estás en modo estricto, no lanza nada, pero no hace nada silenciosamente).

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: Cannot add property y;
//            object is not extensible
```

`Object.seal` hace lo mismo que `Object.preventExtensions`, pero también marca todas las propiedades como no configurables, lo que significa que no se pueden eliminar, ni cambiar su enumerabilidad, configurabilidad o capacidad de escritura.

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: Cannot add property y;
//            object is not extensible
delete object.x;
// TypeError: Cannot delete property x
```

`Object.freeze` hace lo mismo que `Object.seal`, pero también evita que los valores de las propiedades existentes se cambien marcándolos como no modificables.

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: Cannot add property y;
//            object is not extensible
delete object.x;
// TypeError: Cannot delete property x
object.x = 3;
// TypeError: Cannot assign to read-only property x
```

Consideremos este ejemplo concreto, con dos objetos que tienen una sola propiedad `x`, y donde luego evitamos cualquier extensión adicional al segundo objeto.

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

Comienza como ya sabemos, pasando de la forma vacía a una nueva forma que contiene la propiedad `'x'` (representada como `Smi`). Cuando evitamos extensiones a `b`, realizamos una transición especial hacia una nueva forma que está marcada como no extensible. Esta transición especial no introduce ninguna nueva propiedad, realmente es solo un marcador.

![](/_img/react-cliff/17-shape-nonextensible.svg)

Nota cómo no podemos simplemente actualizar la forma con `x` directamente, ya que la necesita el otro objeto `a`, que todavía es extensible.

## El problema de rendimiento de React

Unamos todo y usemos lo que aprendimos para entender [el reciente problema de React #14365](https://github.com/facebook/react/issues/14365). Cuando el equipo de React perfiló una aplicación del mundo real, detectaron un extraño problema de rendimiento con V8 que afectaba al núcleo de React. Este es un repro simplificado del error:

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

Tenemos un objeto con dos campos que tienen representación `Smi`. Evitamos cualquier extensión adicional al objeto y finalmente forzamos al segundo campo a representación `Double`.

Como aprendimos antes, esto crea aproximadamente el siguiente escenario:

![](/_img/react-cliff/18-repro-shape-setup.svg)

Ambas propiedades están marcadas como representación `Smi`, y la transición final es la transición de extensibilidad para marcar la forma como no extensible.

Ahora necesitamos cambiar `y` a representación `Double`, lo que significa que necesitamos empezar nuevamente encontrando la forma dividida. En este caso, es la forma que introdujo `x`. Pero ahora V8 se confundió, ya que la forma dividida era extensible mientras que la forma actual estaba marcada como no extensible. Y V8 realmente no sabía cómo reproducir las transiciones correctamente en este caso. Así que V8 esencialmente renunció a intentar dar sentido a esto y, en su lugar, creó una forma separada que no está conectada al árbol de formas existentes y no se comparte con otros objetos. Piensa en esto como una _forma huérfana_:

![](/_img/react-cliff/19-orphaned-shape.svg)

Puedes imaginar que esto es bastante malo si le sucede a muchos objetos, ya que hace que todo el sistema de formas sea inútil.

En el caso de React, esto es lo que sucedió: cada `FiberNode` tiene un par de campos que se supone deben contener marcas de tiempo cuando el perfil está activado.

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

Estos campos (como `actualStartTime`) se inicializan con `0` o `-1`, y por lo tanto comienzan con representación `Smi`. Pero luego, marcas de tiempo reales en punto flotante de [`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now) se almacenan en estos campos, causando que pasen a representación `Double`, ya que no caben en un `Smi`. Además de eso, React también evita extensiones a las instancias de `FiberNode`.

Inicialmente el ejemplo simplificado se veía así:

![](/_img/react-cliff/20-fibernode-shape.svg)

Hay dos instancias compartiendo un árbol de formas, todo funciona según lo previsto. Pero luego, cuando almacenas la marca de tiempo real, V8 se confunde al encontrar la forma dividida:

![](/_img/react-cliff/21-orphan-islands.svg)

V8 asigna una nueva forma huérfana a `node1`, y lo mismo ocurre con `node2` un tiempo después, resultando en dos _islas huérfanas_, cada una con sus propias formas independientes. Muchas aplicaciones reales de React no solo tienen dos, sino decenas de miles de estos `FiberNode`s. Como puedes imaginar, esta situación no era particularmente buena para el rendimiento de V8.

Por suerte, [hemos solucionado este problema de rendimiento](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/) en [V8 v7.4](/blog/v8-release-74), y estamos [explorando maneras de hacer que los cambios de representación de los campos sean más económicos](https://bit.ly/v8-in-place-field-representation-changes) para eliminar cualquier otro problema de rendimiento restante. Con la solución, V8 ahora hace lo correcto:

![](/_img/react-cliff/22-fix.svg)

Las dos instancias `FiberNode` apuntan a la forma no extensible donde `'actualStartTime'` es un campo `Smi`. Cuando ocurre la primera asignación a `node1.actualStartTime`, se crea una nueva cadena de transición y la cadena anterior se marca como obsoleta:

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

Observa cómo la transición de extensibilidad ahora se reproduce correctamente en la nueva cadena.

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

Después de la asignación a `node2.actualStartTime`, ambos nodos hacen referencia a la nueva forma, y la parte obsoleta del árbol de transición puede ser limpiada por el recolector de basura.

:::note
**Nota:** Podrías pensar que toda esta deprecación/migración de formas es compleja, y estarías en lo correcto. De hecho, tenemos la sospecha de que en sitios web reales esto causa más problemas (en términos de rendimiento, uso de memoria y complejidad) de los que ayuda, especialmente dado que con la [compresión de punteros](https://bugs.chromium.org/p/v8/issues/detail?id=7703) ya no podremos usarla para almacenar campos de valor doble en línea dentro del objeto. Por lo tanto, esperamos [eliminar por completo el mecanismo de deprecación de formas de V8](https://bugs.chromium.org/p/v8/issues/detail?id=9606). Podrías decir que está _\*se pone las gafas de sol\*_ siendo obsoleto. _YEEEAAAHHH…_
:::

El equipo de React [mitigó el problema desde su lado](https://github.com/facebook/react/pull/14383) asegurándose de que todos los campos de tiempo y duración en los `FiberNode`s comiencen con representación `Double`:

```js
class FiberNode {
  constructor() {
    // Forzar representación `Double` desde el inicio.
    this.actualStartTime = Number.NaN;
    // Posteriormente, aún puedes inicializarlo con el valor deseado:
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

En lugar de `Number.NaN`, cualquier valor de punto flotante que no encaje en el rango de `Smi` podría ser utilizado. Ejemplos incluyen `0.000001`, `Number.MIN_VALUE`, `-0`, e `Infinity`.

Vale la pena señalar que el error concreto de React era específico de V8 y que en general, los desarrolladores no deberían optimizar para una versión específica de un motor de JavaScript. Aun así, es útil tener un control cuando las cosas no funcionan.

Ten en cuenta que el motor de JavaScript realiza algo de magia detrás de escena, y puedes ayudarlo evitando mezclar tipos siempre que sea posible. Por ejemplo, no inicialices tus campos numéricos con `null`, ya que eso desactiva todos los beneficios del seguimiento de la representación de los campos, y hace que tu código sea más legible:

```js
// ¡No hagas esto!
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

En otras palabras, **escribe código legible, ¡y el rendimiento seguirá!**

## Conclusiones

Hemos cubierto lo siguiente en esta inmersión profunda:

- JavaScript distingue entre "primitivos" y "objetos", y `typeof` miente.
- Incluso valores con el mismo tipo en JavaScript pueden tener diferentes representaciones detrás de escena.
- V8 intenta encontrar la representación óptima para cada propiedad en tus programas de JavaScript.
- Hemos discutido cómo V8 maneja deprecaciones y migraciones de formas, incluidas transiciones de extensibilidad.

Con base en este conocimiento, identificamos algunos consejos prácticos de codificación en JavaScript que pueden ayudar a mejorar el rendimiento:

- Siempre inicializa tus objetos de la misma manera, para que las formas puedan ser efectivas.
- Elige valores iniciales sensatos para tus campos para ayudar a los motores de JavaScript con la selección de representación.
