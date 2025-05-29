---
title: &apos;Tipos de elementos en V8&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-09-12 13:33:37
tags:
  - internals
  - presentations
description: &apos;Esta profunda explicación técnica detalla cómo V8 optimiza las operaciones con arrays en segundo plano, y qué significa eso para los desarrolladores de JavaScript.&apos;
tweet: &apos;907608362191376384&apos;
---
:::note
**Nota:** Si prefieres ver una presentación en lugar de leer artículos, ¡disfruta del video a continuación!
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Los objetos en JavaScript pueden tener propiedades arbitrarias asociadas a ellos. Los nombres de las propiedades de los objetos pueden contener cualquier carácter. Uno de los casos interesantes que un motor de JavaScript puede elegir optimizar son las propiedades cuyos nombres son puramente numéricos, más específicamente [índices de arrays](https://tc39.es/ecma262/#array-index).

<!--truncate-->
En V8, las propiedades con nombres enteros — la forma más común de las cuales son los objetos generados por el constructor `Array` — se tratan de manera especial. Aunque en muchas circunstancias estas propiedades indexadas numéricamente se comportan igual que otras propiedades, V8 elige almacenarlas por separado de las propiedades no numéricas por razones de optimización. Internamente, V8 incluso da a estas propiedades un nombre especial: _elementos_. Los objetos tienen [propiedades](/blog/fast-properties) que se asignan a valores, mientras que los arrays tienen índices que se asignan a elementos.

Aunque estos detalles internos nunca se exponen directamente a los desarrolladores de JavaScript, explican por qué ciertos patrones de código son más rápidos que otros.

## Tipos comunes de elementos

Mientras ejecuta el código JavaScript, V8 realiza un seguimiento del tipo de elementos que contiene cada array. Esta información permite a V8 optimizar cualquier operación en el array específicamente para este tipo de elemento. Por ejemplo, cuando llamas a `reduce`, `map` o `forEach` en un array, V8 puede optimizar esas operaciones según el tipo de elementos que contiene el array.

Toma este array, por ejemplo:

```js
const array = [1, 2, 3];
```

¿Qué tipos de elementos contiene? Si preguntas al operador `typeof`, te diría que el array contiene `number`s. A nivel de lenguaje, eso es todo lo que obtienes: JavaScript no distingue entre enteros, floats y dobles — todos son solo números. Sin embargo, a nivel de motor, podemos hacer distinciones más precisas. El tipo de elementos para este array es `PACKED_SMI_ELEMENTS`. En V8, el término Smi se refiere al formato particular usado para almacenar enteros pequeños. (Hablaremos de la parte `PACKED` en un momento).

Más tarde, agregar un número de punto flotante al mismo array lo convierte en un tipo de elementos más genérico:

```js
const array = [1, 2, 3];
// tipo de elementos: PACKED_SMI_ELEMENTS
array.push(4.56);
// tipo de elementos: PACKED_DOUBLE_ELEMENTS
```

Agregar una cadena literal al array cambia su tipo de elementos una vez más.

```js
const array = [1, 2, 3];
// tipo de elementos: PACKED_SMI_ELEMENTS
array.push(4.56);
// tipo de elementos: PACKED_DOUBLE_ELEMENTS
array.push(&apos;x&apos;);
// tipo de elementos: PACKED_ELEMENTS
```

Hemos visto tres tipos distintos de elementos hasta ahora, con los siguientes tipos básicos:

- <b>Sm</b>all <b>i</b>ntegers, también conocidos como Smi.
- Doubles, para números de punto flotante y enteros que no pueden representarse como un Smi.
- Elementos regulares, para valores que no pueden representarse como Smi o doubles.

Ten en cuenta que los doubles forman una variante más general de Smi, y los elementos regulares son otra generalización sobre los doubles. El conjunto de números que pueden representarse como un Smi es un subconjunto de los números que pueden representarse como un double.

Lo importante aquí es que las transiciones del tipo de elementos solo van en una dirección: de específicos (por ejemplo, `PACKED_SMI_ELEMENTS`) a más generales (por ejemplo, `PACKED_ELEMENTS`). Una vez que un array se marca como `PACKED_ELEMENTS`, no puede regresar a `PACKED_DOUBLE_ELEMENTS`, por ejemplo.

Hasta ahora, hemos aprendido lo siguiente:

- V8 asigna un tipo de elementos a cada array.
- El tipo de elementos de un array no está grabado en piedra — puede cambiar en tiempo de ejecución. En el ejemplo anterior, pasamos de `PACKED_SMI_ELEMENTS` a `PACKED_ELEMENTS`.
- Las transiciones del tipo de elementos solo pueden ir de tipos específicos a tipos más generales.

## Tipos `PACKED` vs. `HOLEY`

Hasta ahora, solo hemos tratado con arrays densos o compactos. Crear agujeros en el array (es decir, hacer que el array sea disperso) degrada el tipo de elementos a su variante “holey”:

```js
const array = [1, 2, 3, 4.56, &apos;x&apos;];
// tipo de elementos: PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5] hasta array[8] ahora son agujeros
// tipo de elementos: HOLEY_ELEMENTS
```

V8 realiza esta distinción porque las operaciones en arreglos compactos pueden ser optimizadas de manera más agresiva que las operaciones en arreglos dispersos. Para los arreglos compactos, la mayoría de las operaciones pueden realizarse de manera eficiente. En comparación, las operaciones en arreglos dispersos requieren verificaciones adicionales y búsquedas costosas en la cadena de prototipos.

Cada uno de los tipos de elementos básicos que hemos visto hasta ahora (es decir, Smis, dobles y elementos regulares) viene en dos versiones: la versión compacta y la versión dispersa. No solo podemos hacer la transición de, por ejemplo, `PACKED_SMI_ELEMENTS` a `PACKED_DOUBLE_ELEMENTS`, sino que también podemos hacer la transición de cualquier tipo `PACKED` a su contraparte `HOLEY`.

Para resumir:

- Los tipos de elementos más comunes vienen en versiones `PACKED` y `HOLEY`.
- Las operaciones en arreglos compactos son más eficientes que las operaciones en arreglos dispersos.
- Los tipos de elementos pueden hacer la transición de sabores `PACKED` a `HOLEY`.

## La estructura de tipos de elementos

V8 implementa este sistema de transición de etiquetas como una [estructura de retícula](https://es.wikipedia.org/wiki/Ret%C3%ADcula_(orden)). Aquí hay una visualización simplificada que presenta solo los tipos de elementos más comunes:

![](/_img/elements-kinds/lattice.svg)

Solo es posible hacer la transición hacia abajo en la retícula. Una vez que se agrega un solo número de punto flotante a un arreglo de Smis, se marca como DOUBLE, incluso si más tarde sobrescribes el flotante con un Smi. De manera similar, una vez que se crea un hueco en un arreglo, se marca como disperso para siempre, incluso cuando lo llenas más tarde.

:::note
**Actualización @ 2025-02-28:** Ahora hay una excepción [específicamente para `Array.prototype.fill`](https://chromium-review.googlesource.com/c/v8/v8/+/6285929).
:::

Actualmente V8 distingue [21 tipos de elementos diferentes](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d), cada uno de los cuales viene con su propio conjunto de optimizaciones posibles.

En general, los tipos de elementos más específicos permiten optimizaciones más detalladas. Cuanto más bajo está el tipo de elementos en la retícula, más lentas podrían ser las manipulaciones de ese objeto. Para obtener un rendimiento óptimo, evita innecesarias transiciones a tipos menos específicos: utiliza el más específico que sea aplicable a tu situación.

## Consejos de rendimiento

En la mayoría de los casos, el seguimiento de tipos de elementos funciona de manera invisible bajo el capó y no necesitas preocuparte por ello. Pero aquí hay algunas cosas que puedes hacer para obtener el mayor beneficio posible del sistema.

### Evita leer más allá de la longitud del arreglo

De forma algo inesperada (dado el título de esta publicación), nuestro consejo de rendimiento número 1 no está directamente relacionado con el seguimiento de tipos de elementos (aunque lo que sucede tras bambalinas es algo similar). Leer más allá de la longitud de un arreglo puede tener un impacto sorprendente en el rendimiento, por ejemplo, leer `array[42]` cuando `array.length === 5`. En este caso, el índice del arreglo `42` está fuera de límites, la propiedad no está presente en el propio arreglo, y por lo tanto el motor de JavaScript tiene que realizar búsquedas costosas en la cadena de prototipos. Una vez que una carga se enfrenta a esta situación, V8 recuerda que “esta carga necesita lidiar con casos especiales” y nunca será tan rápida como antes de leer fuera de límites.

No escribas tus bucles de esta manera:

```js
// ¡No hagas esto!
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

Este código lee todos los elementos en el arreglo, y luego uno más. Solo termina una vez que encuentra un elemento `undefined` o `null`. (jQuery usa este patrón en algunos lugares).

En su lugar, escribe tus bucles a la antigua usanza y sigue iterando hasta que llegues al último elemento.

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

Cuando la colección sobre la que estás iterando es iterable (como es el caso de los arreglos y `NodeList`s), eso es aún mejor: simplemente usa `for-of`.

```js
for (const item of items) {
  doSomething(item);
}
```

Para los arreglos específicamente, podrías usar el método incorporado `forEach`:

```js
items.forEach((item) => {
  doSomething(item);
});
```

Hoy en día, el rendimiento de `for-of` y `forEach` está a la par con el bucle `for` a la antigua usanza.

¡Evita leer más allá de la longitud del arreglo! En este caso, la verificación de límites de V8 falla, la verificación para ver si la propiedad está presente falla, y luego V8 necesita buscar en la cadena de prototipos. El impacto es aún peor cuando accidentalmente usas el valor en cálculos, por ejemplo:

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // ¡COMPARACIÓN INCORRECTA!
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

Aquí, la última iteración lee más allá de la longitud del arreglo, lo que devuelve `undefined`, lo que contamina no solo la carga, sino también la comparación: en lugar de comparar solo números, ahora tiene que lidiar con casos especiales. Corregir la condición de terminación al `i < array.length` adecuado brinda una **mejora del rendimiento de 6×** para este ejemplo (medido en arreglos con 10,000 elementos, por lo que el número de iteraciones solo disminuye en un 0.01%).

### Evita las transiciones de tipo de elementos

En general, si necesitas realizar muchas operaciones en un array, intenta mantener un tipo de elementos lo más específico posible, para que V8 pueda optimizar esas operaciones tanto como sea posible.

Esto es más difícil de lo que parece. Por ejemplo, simplemente agregar `-0` a un array de enteros pequeños es suficiente para convertirlo a `PACKED_DOUBLE_ELEMENTS`.

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

Como resultado, cualquier operación futura en este array se optimiza de una manera completamente diferente a como lo haría para Smis.

Evita `-0`, a menos que necesites explícitamente diferenciar entre `-0` y `+0` en tu código. (Probablemente no lo necesites).

Lo mismo ocurre con `NaN` y `Infinity`. Estos se representan como doubles, por lo que agregar un solo `NaN` o `Infinity` a un array de `SMI_ELEMENTS` lo convierte en `DOUBLE_ELEMENTS`.

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

Si planeas realizar muchas operaciones en un array de enteros, considera normalizar `-0` y bloquear `NaN` e `Infinity` al inicializar los valores. De esta manera, el array se mantiene con el tipo `PACKED_SMI_ELEMENTS`. Este costo de normalización inicial puede compensarse con las optimizaciones posteriores.

De hecho, si estás realizando operaciones matemáticas en un array de números, considera usar un TypedArray. También tenemos tipos especializados de elementos para ellos.

### Prefiere arrays sobre objetos similares a arrays

Algunos objetos en JavaScript — especialmente en el DOM — parecen arrays aunque no son arrays propiamente dichos. Es posible crear objetos similares a arrays tú mismo:

```js
const arrayLike = {};
arrayLike[0] = &apos;a&apos;;
arrayLike[1] = &apos;b&apos;;
arrayLike[2] = &apos;c&apos;;
arrayLike.length = 3;
```

Este objeto tiene una propiedad `length` y admite el acceso a elementos a través de índices (¡igual que un array!), pero carece de métodos de array como `forEach` en su prototipo. Aún es posible llamar métodos genéricos de array sobre él:

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Esto imprime &apos;0: a&apos;, luego &apos;1: b&apos;, y finalmente &apos;2: c&apos;.
```

Este código llama el método integrado `Array.prototype.forEach` sobre el objeto similar a array, y funciona como se espera. Sin embargo, esto es más lento que llamar a `forEach` en un array propiamente dicho, que está altamente optimizado en V8. Si tienes planeado usar métodos integrados de arrays sobre este objeto más de una vez, considera convertirlo en un array real antes:

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Esto imprime &apos;0: a&apos;, luego &apos;1: b&apos;, y finalmente &apos;2: c&apos;.
```

El costo único de conversión puede valer la pena por las optimizaciones posteriores, especialmente si planeas realizar muchas operaciones sobre el array.

Por ejemplo, el objeto `arguments` es un objeto similar a un array. Es posible llamar métodos integrados de array sobre él, pero tales operaciones no estarán completamente optimizadas como podrían estarlo para un array propiamente dicho.

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs(&apos;a&apos;, &apos;b&apos;, &apos;c&apos;);
// Esto imprime &apos;0: a&apos;, luego &apos;1: b&apos;, y finalmente &apos;2: c&apos;.
```

Los parámetros rest de ES2015 pueden ayudar aquí. Estos producen arrays propiamente dichos que pueden usarse en lugar de los objetos similares a array `arguments` de manera elegante.

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs(&apos;a&apos;, &apos;b&apos;, &apos;c&apos;);
// Esto imprime &apos;0: a&apos;, luego &apos;1: b&apos;, y finalmente &apos;2: c&apos;.
```

Hoy en día, no hay una buena razón para usar directamente el objeto `arguments`.

En general, evita objetos similares a arrays siempre que sea posible y usa arrays propiamente dichos en su lugar.

### Evita el polimorfismo

Si tienes código que maneja arrays de muchos tipos de elementos diferentes, puede dar lugar a operaciones polimórficas que son más lentas que una versión del código que solo opera sobre un único tipo de elementos.

Considera el siguiente ejemplo, donde se llama a una función de librería con varios tipos de elementos. (Nota que este no es el método nativo `Array.prototype.forEach`, que tiene su propio conjunto de optimizaciones además de las optimizaciones específicas discutidas en este artículo).

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each([&apos;a&apos;, &apos;b&apos;, &apos;c&apos;], doSomething);
// `each` se llama con `PACKED_ELEMENTS`. V8 utiliza un caché en línea
// (o “IC”) para recordar que `each` se llama con este tipo particular
// de elementos. V8 es optimista y asume que los accesos a
// `array.length` y `array[index]` dentro de la función `each` son
// monomórficos (es decir, que solo reciben un único tipo de elementos)
// hasta que se demuestre lo contrario. Por cada llamada futura a
// `each`, V8 verifica si el tipo de elementos es `PACKED_ELEMENTS`. Si
// es así, V8 puede reusar el código previamente generado. Si no, se
// necesita más trabajo.

each([1.1, 2.2, 3.3], doSomething);
// `each` se llama con `PACKED_DOUBLE_ELEMENTS`. Debido a que V8 ahora ha visto diferentes tipos de elementos pasados a `each` en su IC, los accesos a
// `array.length` y `array[index]` dentro de la función `each` se marcan como polimórficos. Ahora V8 necesita una comprobación adicional cada vez que se llama a `each`: una para `PACKED_ELEMENTS`
// (como antes), una nueva para `PACKED_DOUBLE_ELEMENTS`, y otra para cualquier otro tipo de elementos (como antes). Esto genera un impacto en el
// rendimiento.

each([1, 2, 3], doSomething);
// `each` se llama con `PACKED_SMI_ELEMENTS`. Esto dispara otro
// grado de polimorfismo. Ahora hay tres tipos diferentes de elementos
// en el IC para `each`. Para cada llamada a `each` de aquí en adelante, se necesita otra comprobación del tipo de elementos para reutilizar el código generado
// para `PACKED_SMI_ELEMENTS`. Esto conlleva un costo de rendimiento.
```

Los métodos integrados (como `Array.prototype.forEach`) pueden manejar este tipo de polimorfismo de manera mucho más eficiente, por lo que considera usarlos en lugar de las funciones de bibliotecas de usuario en situaciones sensibles al rendimiento.

Otro ejemplo de monomorfismo vs. polimorfismo en V8 involucra formas de objetos, también conocidas como la clase oculta de un objeto. Para aprender sobre ese caso, consulta [el artículo de Vyacheslav](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html).

### Evita crear huecos

Para patrones de codificación del mundo real, la diferencia de rendimiento entre acceder a matrices dispersas o compactas generalmente es demasiado pequeña para importar o incluso ser medible. Si (y este es un gran “si”!) tus mediciones de rendimiento indican que ahorrar cada última instrucción de máquina en el código optimizado vale la pena, entonces puedes intentar mantener tus matrices en modo de elementos compactos. Supongamos que estamos tratando de crear una matriz, por ejemplo:

```js
const array = new Array(3);
// La matriz es dispersa en este punto, por lo que se marca como
// `HOLEY_SMI_ELEMENTS`, es decir, la posibilidad más específica dada
// la información actual.
array[0] = &apos;a&apos;;
// Espera, eso es una cadena en lugar de un entero pequeño... Así que el tipo
// pasa a `HOLEY_ELEMENTS`.
array[1] = &apos;b&apos;;
array[2] = &apos;c&apos;;
// En este punto, las tres posiciones de la matriz están llenas, por lo que
// la matriz está compactada (es decir, ya no es dispersa). Sin embargo, no podemos
// cambiar a un tipo más específico como `PACKED_ELEMENTS`. El
// tipo de elementos permanece como `HOLEY_ELEMENTS`.
```

Una vez que la matriz se marca como dispersa, permanece dispersa para siempre, ¡incluso si todos sus elementos están presentes más tarde!

Una mejor forma de crear una matriz es usar un literal en su lugar:

```js
const array = [&apos;a&apos;, &apos;b&apos;, &apos;c&apos;];
// Tipo de elementos: PACKED_ELEMENTS
```

Si no conoces todos los valores de antemano, crea una matriz vacía y luego empuja (`push`) los valores a esta.

```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```

Este enfoque asegura que la matriz nunca cambie a un tipo de elementos dispersos. Como resultado, V8 puede generar potencialmente un código optimizado ligeramente más rápido para algunas operaciones sobre esta matriz.

## Depuración de tipos de elementos

Para averiguar el “tipo de elementos” de un objeto determinado, obtén una construcción de depuración de `d8` (ya sea [construyendo desde código fuente](/docs/build) en modo de depuración o obteniendo un binario precompilado usando [`jsvu`](https://github.com/GoogleChromeLabs/jsvu)) y ejecuta:

```bash
out/x64.debug/d8 --allow-natives-syntax
```

Esto abre un REPL de `d8` en el que [funciones especiales](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime.h?l=20&rcl=05720af2b09a18be5c41bbf224a58f3f0618f6be) como `%DebugPrint(object)` están disponibles. El campo “elements” en su salida revela el “tipo de elementos” de cualquier objeto que le pases.

```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```

Ten en cuenta que “COW” representa [copy-on-write](https://en.wikipedia.org/wiki/Copy-on-write), que es otra optimización interna. No te preocupes por eso ahora, ¡ese es un tema para otro artículo del blog!

Otro indicador útil que está disponible en las construcciones de depuración es `--trace-elements-transitions`. Actívalo para que V8 te informe cada vez que se produzca una transición de tipo de elementos.

```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
elements transition [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] in ~+34 at x.js:2 for 0x1df87228c911 <JSArray[3]> from 0x1df87228c889 <FixedArray[3]> to 0x1df87228c941 <FixedDoubleArray[22]>
```
