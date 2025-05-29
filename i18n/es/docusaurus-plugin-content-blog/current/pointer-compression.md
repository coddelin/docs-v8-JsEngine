---
title: "Compresión de punteros en V8"
author: "Igor Sheludko y Santiago Aboy Solanes, *los* compresores de punteros"
avatars: 
  - "igor-sheludko"
  - "santiago-aboy-solanes"
date: 2020-03-30
tags: 
  - internals
  - memory
description: "¡V8 redujo el tamaño de su montón hasta en un 43%! Aprende cómo en “Compresión de punteros en V8”!"
tweet: "1244653541379182596"
---
Hay una batalla constante entre la memoria y el rendimiento. Como usuarios, nos gustaría que las cosas fueran rápidas y que consumieran la menor cantidad de memoria posible. Desafortunadamente, generalmente mejorar el rendimiento tiene un costo en el consumo de memoria (y viceversa).

<!--truncate-->
En 2014 Chrome pasó de ser un proceso de 32 bits a un proceso de 64 bits. Esto le dio a Chrome mejor [seguridad, estabilidad y rendimiento](https://blog.chromium.org/2014/08/64-bits-of-awesome-64-bit-windows_26.html), pero tuvo un costo de memoria, ya que cada puntero ahora ocupa ocho bytes en lugar de cuatro. Aceptamos el desafío de reducir este sobrecoste en V8 para intentar recuperar tantos bytes desperdiciados como sea posible.

Antes de profundizar en la implementación, necesitamos saber dónde estamos parados para evaluar correctamente la situación. Para medir nuestra memoria y rendimiento utilizamos un conjunto de [páginas web](https://v8.dev/blog/optimizing-v8-memory) que reflejan sitios web populares del mundo real. Los datos mostraron que V8 contribuye hasta un 60% del consumo de memoria del [proceso de renderizador](https://www.chromium.org/developers/design-documents/multi-process-architecture) de Chrome en el escritorio, con un promedio del 40%.

![Porcentaje de consumo de memoria de V8 en la memoria del renderizador de Chrome](/_img/pointer-compression/memory-chrome.svg)

La compresión de punteros es uno de varios esfuerzos en curso en V8 para reducir el consumo de memoria. La idea es muy simple: en lugar de almacenar punteros de 64 bits, podemos almacenar desplazamientos de 32 bits desde una dirección “base”. Con una idea tan simple, ¿cuánto podemos ganar con dicha compresión en V8?

El montón de V8 contiene una gran variedad de elementos, como valores de coma flotante, caracteres de cadena, código de bytes del intérprete y valores etiquetados (ver la próxima sección para más detalles). Al inspeccionar el montón, descubrimos que en sitios web del mundo real estos valores etiquetados ocupan alrededor del 70% del montón de V8.

Echemos un vistazo más de cerca a lo que son los valores etiquetados.

## Etiquetado de valores en V8

Los valores de JavaScript en V8 se representan como objetos y se asignan en el montón de V8, sin importar si son objetos, arrays, números o cadenas. Esto nos permite representar cualquier valor como un puntero a un objeto.

Muchos programas de JavaScript realizan cálculos con valores enteros, como incrementar un índice en un bucle. Para evitar tener que asignar un nuevo objeto numérico cada vez que se incrementa un entero, V8 utiliza la técnica bien conocida de [etiquetado de punteros](https://en.wikipedia.org/wiki/Tagged_pointer) para almacenar datos adicionales o alternativos en los punteros del montón de V8.

Los bits de etiqueta tienen un doble propósito: indican punteros fuertes/débiles a objetos ubicados en el montón de V8 o un pequeño entero. Por lo tanto, el valor de un entero se puede almacenar directamente en el valor etiquetado sin tener que asignar almacenamiento adicional para ello.

V8 siempre asigna objetos en el montón en direcciones alineadas por palabras, lo que le permite usar los 2 (o 3, dependiendo del tamaño de la palabra de la máquina) bits menos significativos para etiquetar. En arquitecturas de 32 bits, V8 usa el bit menos significativo para distinguir Smis de punteros de objetos de montón. Para los punteros de montón, utiliza el segundo bit menos significativo para distinguir referencias fuertes de débiles:

<pre>
                        |----- 32 bits -----|
Pointer:                |_____address_____<b>w1</b>|
Smi:                    |___int31_value____<b>0</b>|
</pre>

donde *w* es un bit usado para distinguir punteros fuertes de los débiles.

Tenga en cuenta que un valor Smi solo puede llevar una carga útil de 31 bits, incluyendo el bit de signo. En el caso de los punteros, tenemos 30 bits que pueden ser utilizados como carga útil de dirección de objetos del montón. Debido a la alineación por palabras, la granularidad de asignación es de 4 bytes, lo que nos da 4 GB de espacio direccionable.

En arquitecturas de 64 bits los valores de V8 se ven así:

<pre>
            |----- 32 bits -----|----- 32 bits -----|
Pointer:    |________________address______________<b>w1</b>|
Smi:        |____int32_value____|000000000000000000<b>0</b>|
</pre>

Puede notar que, a diferencia de las arquitecturas de 32 bits, en las arquitecturas de 64 bits V8 puede usar 32 bits para la carga útil del valor Smi. Las implicaciones de los Smis de 32 bits en la compresión de punteros se discuten en las siguientes secciones.

## Valores etiquetados comprimidos y nueva disposición del montón

Con la compresión de punteros, nuestro objetivo es de alguna manera ajustar ambos tipos de valores etiquetados en 32 bits en arquitecturas de 64 bits. Podemos ajustar los punteros en 32 bits haciendo:

- asegurándonos de que todos los objetos de V8 se asignen dentro de un rango de memoria de 4 GB
- representando los punteros como desplazamientos dentro de este rango

Tener un límite tan estricto es desafortunado, pero V8 en Chrome ya tiene un límite de 2 GB o 4 GB en el tamaño del heap de V8 (dependiendo de lo potente que sea el dispositivo subyacente), incluso en arquitecturas de 64 bits. Otros integradores de V8, como Node.js, pueden requerir heaps más grandes. Si imponemos un máximo de 4 GB, significaría que estos integradores no pueden usar Compresión de Punteros.

La pregunta ahora es cómo actualizar el diseño del heap para garantizar que los punteros de 32 bits identifiquen de manera única los objetos de V8.

### Diseño trivial del heap

El esquema trivial de compresión sería asignar objetos en los primeros 4 GB del espacio de direcciones.

![Diseño trivial del heap](/_img/pointer-compression/heap-layout-0.svg)

Desafortunadamente, esta no es una opción para V8 ya que el proceso del renderizador de Chrome puede necesitar crear múltiples instancias de V8 en el mismo proceso del renderizador, por ejemplo, para Web/Service Workers. De lo contrario, con este esquema, todas estas instancias de V8 competirían por el mismo espacio de direcciones de 4 GB y, por lo tanto, habría un límite de 4 GB de memoria impuesto a todas las instancias de V8 juntas.

### Diseño del heap, v1

Si organizamos el heap de V8 en una región contigua de 4 GB del espacio de direcciones en otro lugar, entonces un **offset** sin signo de 32 bits desde la base identifica de manera única el puntero.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Diseño del heap, base alineada al inicio</figcaption>
</figure>

Si también aseguramos que la base esté alineada a 4 GB, entonces los bits superiores de 32 son los mismos para todos los punteros:

```
            |----- 32 bits -----|----- 32 bits -----|
Puntero:     |________base_______|______offset_______|
```

También podemos hacer que los Smis sean comprimibles limitando la carga útil de Smi a 31 bits y colocándola en los 32 bits inferiores. Básicamente, haciéndolos similares a los Smis en arquitecturas de 32 bits.

```
         |----- 32 bits -----|----- 32 bits -----|
Smi:     |sssssssssssssssssss|____int31_value___0|
```

donde *s* es el valor de signo de la carga útil de Smi. Si tenemos una representación con extensión de signo, podemos comprimir y descomprimir los Smis con solo un desplazamiento aritmético de un bit de la palabra de 64 bits.

Ahora podemos ver que la mitad superior de ambas palabras, punteros y Smis, está completamente definida por la mitad inferior. Entonces, solo podemos almacenar esta última en memoria, reduciendo a la mitad la memoria requerida para almacenar valores etiquetados:

```
                    |----- 32 bits -----|----- 32 bits -----|
Puntero comprimido:                      |______offset_______|
Smi comprimido:                          |____int31_value___0|
```

Dado que la base está alineada a 4 GB, la compresión es solo una truncación:

```cpp
uint64_t uncompressed_tagged;
uint32_t compressed_tagged = uint32_t(uncompressed_tagged);
```

El código de descompresión, sin embargo, es un poco más complicado. Necesitamos distinguir entre extender el signo para el Smi y extender con ceros el puntero, así como si se debe agregar la base o no.

```cpp
uint32_t compressed_tagged;

uint64_t uncompressed_tagged;
if (compressed_tagged & 1) {
  // caso de puntero
  uncompressed_tagged = base + uint64_t(compressed_tagged);
} else {
  // caso de Smi
  uncompressed_tagged = int64_t(compressed_tagged);
}
```

Tratemos de cambiar el esquema de compresión para simplificar el código de descompresión.

### Diseño del heap, v2

Si en lugar de tener la base al comienzo de los 4 GB, colocamos la base en el _medio_, podemos tratar el valor comprimido como un **offset** con signo de 32 bits desde la base. Nótese que toda la reserva ya no está alineada a 4 GB, pero la base sí lo está.

![Diseño del heap, base alineada al medio](/_img/pointer-compression/heap-layout-2.svg)

En este nuevo diseño, el código de compresión permanece igual.

El código de descompresión, sin embargo, se vuelve más elegante. La extensión de signo es ahora común para ambos casos, Smi y puntero, y la única rama es si se debe agregar la base en el caso del puntero.

```cpp
int32_t compressed_tagged;

// Código común para ambos casos, puntero y Smi
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // caso de puntero
  uncompressed_tagged += base;
}
```

El rendimiento de las ramas en el código depende de la unidad de predicción de ramas en la CPU. Pensamos que si implementábamos la descompresión de una manera sin ramas, podríamos obtener un mejor rendimiento. Con una pequeña cantidad de magia con bits, podemos escribir una versión sin ramas del código anterior:

```cpp
int32_t compressed_tagged;

// Mismo código para ambos casos, puntero y Smi
int64_t sign_extended_tagged = int64_t(compressed_tagged);
int64_t selector_mask = -(sign_extended_tagged & 1);
// Máscara es 0 en caso de Smi o todos 1s en caso de puntero
int64_t uncompressed_tagged =
    sign_extended_tagged + (base & selector_mask);
```

Entonces, decidimos comenzar con la implementación sin ramas.

## Evolución del rendimiento

### Rendimiento inicial

Medimos el rendimiento en [Octane](https://v8.dev/blog/retiring-octane#the-genesis-of-octane), un conjunto de pruebas de rendimiento máximo que hemos utilizado en el pasado. Aunque ya no nos enfocamos en mejorar el rendimiento máximo en nuestro trabajo diario, tampoco queremos retroceder en el rendimiento máximo, particularmente para algo tan sensible al rendimiento como _todos los punteros_. Octane sigue siendo un buen conjunto de pruebas para esta tarea.

Este gráfico muestra el puntaje de Octane en la arquitectura x64 mientras optimizábamos y perfeccionábamos la implementación de la Compresión de Punteros. En el gráfico, mayor es mejor. La línea roja es la compilación x64 existente con punteros de tamaño completo, mientras que la línea verde es la versión con punteros comprimidos.

![Primera ronda de mejoras en Octane](/_img/pointer-compression/perf-octane-1.svg)

Con la primera implementación funcional, teníamos una brecha de regresión de aproximadamente ~35%.

#### Incremento (1), +7%

Primero validamos nuestra hipótesis de que “sin ramas es más rápido,” comparando la descompresión sin ramas con la que tiene ramas. Resultó que nuestra hipótesis estaba equivocada, y la versión con ramas era un 7% más rápida en x64. ¡Fue una diferencia bastante significativa!

Echemos un vistazo al ensamblaje x64.

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Descompresión | Sin ramas               | Con ramas                    |
|---------------|-------------------------|------------------------------|
| Código        | ```asm                  | ```asm                       \
|               | movsxlq r11,[…]         | movsxlq r11,[…]              \
|               | movl r10,r11            | testb r11,0x1                \
|               | andl r10,0x1            | jz done                      \
|               | negq r10                | addq r11,r13                 \
|               | andq r10,r13            | done:                        \
|               | addq r11,r10            |                              | \
|               | ```                     | ```                          |
| Resumen       | 20 bytes                | 13 bytes                     |
| ^^            | 6 instrucciones ejecutadas | 3 o 4 instrucciones ejecutadas |
| ^^            | sin ramas               | 1 rama                       |
| ^^            | 1 registro adicional    |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

**r13** aquí es un registro dedicado utilizado para el valor base. Observa cómo el código sin ramas es tanto más grande como requiere más registros.

En Arm64, observamos lo mismo: la versión con ramas era claramente más rápida en CPUs potentes (aunque el tamaño del código era el mismo para ambos casos).

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Descompresión | Sin ramas               | Con ramas                    |
|---------------|-------------------------|------------------------------|
| Código        | ```asm                  | ```asm                       \
|               | ldur w6, […]            | ldur w6, […]                 \
|               | sbfx x16, x6, #0, #1    | sxtw x6, w6                  \
|               | and x16, x16, x26       | tbz w6, #0, #done            \
|               | add x6, x16, w6, sxtw   | add x6, x26, x6              \
|               |                         | done:                        \
|               | ```                     | ```                          |
| Resumen       | 16 bytes                | 16 bytes                     |
| ^^            | 4 instrucciones ejecutadas | 3 o 4 instrucciones ejecutadas |
| ^^            | sin ramas               | 1 rama                       |
| ^^            | 1 registro adicional    |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

En dispositivos Arm64 de gama baja, observamos casi ninguna diferencia de rendimiento en ninguna dirección.

Nuestro aprendizaje es: los predictores de ramas en las CPUs modernas son muy buenos, y el tamaño del código (particularmente la longitud del camino de ejecución) afecta más al rendimiento.

#### Incremento (2), +2%

[TurboFan](https://v8.dev/docs/turbofan) es el compilador optimizador de V8, basado en un concepto llamado “Mar de Nodos”. En resumen, cada operación está representada como un nodo en un gráfico (ver una versión más detallada [en este post del blog](https://v8.dev/blog/turbofan-jit)). Estos nodos tienen varias dependencias, incluyendo flujo de datos y flujo de control.

Hay dos operaciones que son cruciales para la Compresión de Punteros: Cargas y Almacenamientos, ya que conectan el heap de V8 con el resto de la cadena. Si descomprimiéramos cada vez que cargamos un valor comprimido del heap, y lo comprimiéramos antes de almacenarlo, entonces la cadena podría seguir funcionando como lo hacía en modo de puntero completo. Por lo tanto, añadimos nuevas operaciones explícitas en el gráfico de nodos - Descomprimir y Comprimir.

Hay casos en los que la descompresión no es realmente necesaria. Por ejemplo, si un valor comprimido se carga de un lugar solo para almacenarse luego en una nueva ubicación.

Para optimizar operaciones innecesarias, implementamos una nueva fase de “Eliminación de Descompresiones” en TurboFan. Su tarea es eliminar las descompresiones seguidas directamente por compresiones. Dado que estos nodos podrían no estar directamente uno junto al otro, también intenta propagar descompresiones a través del gráfico, con la esperanza de encontrar una compresión más adelante y eliminarlas ambas. Esto nos dio una mejora del 2% en el puntaje de Octane.

#### Incremento (3), +2%

Mientras observábamos el código generado, notamos que la descompresión de un valor que acababa de cargarse producía un código un poco demasiado extenso:

```asm
movl rax, <mem>   // cargar
movlsxlq rax, rax // extensión de signo
```

Una vez que arreglamos eso para extender el signo del valor cargado desde la memoria directamente:

```asm
movlsxlq rax, <mem>
```

obteniendo así otra mejora del 2%.

#### Incremento (4), +11%

Las fases de optimización de TurboFan funcionan mediante el uso de coincidencias de patrones en el gráfico: una vez que un sub-gráfico coincide con un determinado patrón, se reemplaza por un sub-gráfico o instrucción semánticamente equivalente (pero mejor).

Los intentos fallidos por encontrar una coincidencia no son un fallo explícito. La presencia de operaciones explícitas de Descompresión/Compresión en el gráfico hizo que intentos previos exitosos de coincidencia de patrones ya no tuvieran éxito, resultando en fallos silenciosos de optimización.

Un ejemplo de una optimización “rota” fue [preternurado de asignación](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf). Una vez que actualizamos la coincidencia de patrones para ser conscientes de los nuevos nodos de compresión/descompresión, logramos otra mejora del 11%.

### Mejoras adicionales

![Segunda ronda de mejoras de Octane](/_img/pointer-compression/perf-octane-2.svg)

#### Incremento (5), +0.5%

Mientras implementábamos la Eliminación de Descompresiones en TurboFan aprendimos mucho. El enfoque explícito de nodos de Descompresión/Compresión tenía las siguientes propiedades:

Pros:

- La explicitud de tales operaciones nos permitió optimizar descompresiones innecesarias realizando coincidencia de patrones canónica de sub-gráficos.

Pero, a medida que continuamos con la implementación, descubrimos contras:

- Una explosión combinatoria de posibles operaciones de conversión debido a las nuevas representaciones internas de valores se volvió inmanejable. Ahora podíamos tener punteros comprimidos, Smi comprimidos y cualquier cosa comprimida (valores comprimidos que podían ser puntero o Smi), además del conjunto existente de representaciones (Smi etiquetado, puntero etiquetado, cualquier cosa etiquetada, word8, word16, word32, word64, float32, float64, simd128).
- Algunas optimizaciones existentes basadas en coincidencias de patrones de gráficas no se disparaban silenciosamente, lo que causó regresiones aquí y allá. Aunque encontramos y solucionamos algunas de ellas, la complejidad de TurboFan continuaba aumentando.
- El asignador de registros estaba cada vez más insatisfecho debido a la cantidad de nodos en el gráfico, y con frecuencia generaba código deficiente.
- Los gráficos de nodos más grandes ralentizaban las fases de optimización de TurboFan e incrementaban el consumo de memoria durante la compilación.

Decidimos dar un paso atrás y pensar en una manera más simple de soportar la Compresión de Punteros en TurboFan. El nuevo enfoque consiste en eliminar las representaciones de Puntero Comprimido / Smi / Cualquier y hacer que todos los nodos explícitos de Compresión / Descompresión sean implícitos dentro de Almacenes y Cargas bajo la suposición de que siempre descomprimimos antes de cargar y comprimimos antes de almacenar.

También añadimos una nueva fase en TurboFan que reemplazaría a la fase de “Eliminación de Descompresión”. Esta nueva fase reconocería cuándo en realidad no necesitamos comprimir o descomprimir y actualizaría los Almacenes y Cargas en consecuencia. Tal enfoque redujo significativamente la complejidad del soporte de Compresión de Punteros en TurboFan y mejoró la calidad del código generado.

La nueva implementación fue tan efectiva como la versión inicial y dio otra mejora del 0.5%.

#### Incremento (6), +2.5%

Nos acercábamos a paridad de rendimiento, pero aún había una brecha. Tuvimos que idear ideas más frescas. Una de ellas fue: ¿qué pasaría si nos aseguramos de que cualquier código que maneja valores Smi nunca “mira” los 32 bits superiores?

Recordemos la implementación de descompresión:

```cpp
// Implementación antigua de descompresión
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // caso de puntero
  uncompressed_tagged += base;
}
```

Si se ignoran los 32 bits superiores de un Smi, podemos asumir que están indefinidos. Entonces, podemos evitar el caso especial entre los casos de puntero y Smi y sumar incondicionalmente la base al descomprimir, ¡incluso para los Smi! Llamamos a este enfoque “Corrupción de Smi”.

```cpp
// Nueva implementación de descompresión
int64_t uncompressed_tagged = base + int64_t(compressed_tagged);
```

Además, dado que ya no nos importa extender el signo del Smi, este cambio nos permite volver al diseño de memoria v1. Este es el que tiene la base apuntando al inicio de la reserva de 4GB.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Disposición de memoria, base alineada al inicio</figcaption>
</figure>

En términos del código de descompresión, cambia una operación de extensión de signo a una de extensión de cero, lo cual es igual de barato. Sin embargo, esto simplifica las cosas en el lado del tiempo de ejecución (C++). Por ejemplo, el código de reserva de región de espacio de direcciones (ver la sección [Algunos detalles de implementación](#some-implementation-details)).

Aquí está el código de ensamblado para comparación:

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Descompresión | Con ramas                    | Corruptor de Smi             |
|---------------|------------------------------|------------------------------|
| Código        | ```asm                       | ```asm                       \
|               | movsxlq r11,[…]              | movl r11,[rax+0x13]          \
|               | testb r11,0x1                | addq r11,r13                 \
|               | jz done                      |                              | \
|               | addq r11,r13                 |                              | \
|               | done:                        |                              | \
|               | ```                          | ```                          |
| Resumen       | 13 bytes                     | 7 bytes                      |
| ^^            | 3 o 4 instrucciones ejecutadas | 2 instrucciones ejecutadas  |
| ^^            | 1 rama                       | sin ramas                    |
<!-- markdownlint-enable no-space-in-code -->
:::

Así que adaptamos todas las partes del código que usan Smi en V8 al nuevo esquema de compresión, lo que nos dio otra mejora del 2.5%.

### Brecha restante

La brecha de rendimiento restante se explica por dos optimizaciones para compilaciones de 64 bits que tuvimos que desactivar debido a una incompatibilidad fundamental con la Compresión de Punteros.

![Ronda final de mejoras de Octane](/_img/pointer-compression/perf-octane-3.svg)

#### Optimización Smi de 32 bits (7), -1%

Recordemos cómo se ven los Smis en modo de puntero completo en arquitecturas de 64 bits.

```
        |----- 32 bits -----|----- 32 bits -----|
Smi:    |____int32_value____|0000000000000000000|
```

El Smi de 32 bits tiene los siguientes beneficios:

- puede representar un rango más amplio de números enteros sin necesidad de convertirlos en objetos numéricos; y
- dicha forma proporciona acceso directo al valor de 32 bits al leer/escribir.

Esta optimización no se puede realizar con Compresión de Punteros, ya que no hay espacio en el puntero comprimido de 32 bits debido a la inclusión del bit que distingue punteros de Smis. Si desactivamos los Smis de 32 bits en la versión completa de punteros de 64 bits, vemos una regresión del 1% en el puntaje de Octane.

#### Desempaquetado de campos de doble precisión (8), -3%

Esta optimización intenta almacenar valores de punto flotante directamente en los campos del objeto bajo ciertas suposiciones. Esto tiene como objetivo reducir la cantidad de asignaciones de objetos numéricos incluso más de lo que lo hacen los Smis por sí solos.

Imagina el siguiente código JavaScript:

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = new Point(3.1, 5.3);
```

En términos generales, si miramos cómo se ve el objeto p en la memoria, veremos algo como esto:

![Objeto `p` en memoria](/_img/pointer-compression/heap-point-1.svg)

Puedes leer más sobre clases ocultas y propiedades y elementos de respaldo en [este artículo](https://v8.dev/blog/fast-properties).

En arquitecturas de 64 bits, los valores de doble precisión tienen el mismo tamaño que los punteros. Por lo que, si asumimos que los campos de Point siempre contienen valores numéricos, podemos almacenarlos directamente en los campos del objeto.

![](/_img/pointer-compression/heap-point-2.svg)

Si la suposición se rompe para algún campo, por ejemplo después de ejecutar esta línea:

```js
const q = new Point(2, 'ab');
```

entonces los valores numéricos para la propiedad y deben almacenarse en formato empaquetado. Adicionalmente, si hay código optimizado de manera especulativa en algún lugar que depende de esta suposición, ya no debe ser utilizado y debe ser descartado (desoptimizado). La razón de esta generalización de “tipo de campo” es minimizar el número de formas de objetos creados a partir de la misma función constructora, lo cual, a su vez, es necesario para un rendimiento más estable.

![Objetos `p` y `q` en memoria](/_img/pointer-compression/heap-point-3.svg)

Si se aplica, el desempaquetado de campos de doble precisión proporciona los siguientes beneficios:

- proporciona acceso directo a los datos de punto flotante a través del puntero del objeto, evitando la referencia adicional mediante el objeto numérico; y
- nos permite generar código optimizado más pequeño y rápido para bucles cerrados que realicen muchas accesos a campos de doble precisión (por ejemplo, en aplicaciones de procesamiento numérico).

Con la Compresión de Punteros habilitada, los valores de doble precisión simplemente no caben más en los campos comprimidos. Sin embargo, en el futuro podríamos adaptar esta optimización para la Compresión de Punteros.

Cabe señalar que el código de procesamiento numérico que requiere un alto rendimiento podría reescribirse de una manera optimizable incluso sin esta optimización de desempaquetado de campos de doble precisión (de una manera compatible con Compresión de Punteros), almacenando datos en TypedArrays Float64, o incluso utilizando [Wasm](https://webassembly.github.io/spec/core/).

#### Más mejoras (9), 1%

Finalmente, un poco de ajuste fino de la optimización de eliminación de descompresión en TurboFan dio otra mejora del 1% en el rendimiento.

## Algunos detalles de implementación

Para simplificar la integración de la compresión de punteros en el código existente, decidimos descomprimir los valores en cada carga y comprimirlos en cada almacenamiento. De esta manera, solo se cambia el formato de almacenamiento de los valores etiquetados mientras se mantiene sin cambios el formato de ejecución.

### Lado del código nativo

Para poder generar código eficiente cuando se requiere descompresión, el valor base siempre debe estar disponible. Afortunadamente, V8 ya tenía un registro dedicado que siempre apuntaba a una "tabla de raíces" que contiene referencias a objetos internos de JavaScript y V8 que siempre deben estar disponibles (por ejemplo, undefined, null, true, false y muchos más). Este registro se llama "registro raíz" y se utiliza para generar un código [más pequeño y reutilizable de builtins](https://v8.dev/blog/embedded-builtins).

Entonces, colocamos la tabla de raíces en el área de reserva del heap de V8 y, por lo tanto, el registro raíz se volvió útil para ambos propósitos: como un puntero raíz y como un valor base para la descompresión.

### Lado de C++

El tiempo de ejecución de V8 accede a los objetos en el heap de V8 a través de clases C++ que proporcionan una vista conveniente de los datos almacenados en el heap. Cabe señalar que los objetos de V8 son más bien estructuras [POD](https://es.wikipedia.org/wiki/Plain_Old_Data) que objetos de C++. Las clases de "vista" auxiliares contienen solo un campo uintptr_t con un valor etiquetado respectivo. Dado que las clases de vista tienen tamaño de palabra, podemos pasarlas por valor sin costo adicional (muchas gracias a los compiladores modernos de C++).

Aquí hay un ejemplo pseudo de una clase auxiliar:

```cpp
// Clase oculta
class Map {
 public:
  …
  inline DescriptorArray instance_descriptors() const;
  …
  // El valor actual del puntero etiquetado almacenado en el objeto de vista Map.
  const uintptr_t ptr_;
};

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uintptr_t da = *reinterpret_cast<uintptr_t*>(field_address);
  return DescriptorArray(da);
}
```

Para minimizar la cantidad de cambios necesarios para una primera ejecución de la versión comprimida de punteros, integramos el cálculo del valor base requerido para la descompresión en los getters.

```cpp
inline uintptr_t GetBaseForPointerCompression(uintptr_t address) {
  // Redondea la dirección hacia abajo a 4 GB
  const uintptr_t kBaseAlignment = 1 << 32;
  return address & -kBaseAlignment;
}

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  uintptr_t base = GetBaseForPointerCompression(ptr_);
  uintptr_t da = base + compressed_da;
  return DescriptorArray(da);
}
```

Las mediciones de rendimiento confirmaron que el cálculo del valor base en cada carga afecta el rendimiento. La razón es que los compiladores C++ no saben que el resultado de la llamada a GetBaseForPointerCompression() es el mismo para cualquier dirección del heap de V8 y, por lo tanto, el compilador no puede fusionar los cálculos de los valores base. Dado que el código consta de varias instrucciones y una constante de 64 bits, esto resulta en una proliferación significativa del código.

Para abordar este problema, reutilizamos el puntero de instancia de V8 como base para la descompresión (recuerde los datos de instancia de V8 en la disposición del heap). Este puntero suele estar disponible en las funciones de tiempo de ejecución, por lo que simplificamos el código de los getters requiriendo un puntero de instancia de V8 y esto recuperó las regresiones:

```cpp
DescriptorArray Map::instance_descriptors(const Isolate* isolate) const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  // No se necesita redondeo ya que el puntero Isolate ya es la base.
  uintptr_t base = reinterpret_cast<uintptr_t>(isolate);
  uintptr_t da = DecompressTagged(base, compressed_value);
  return DescriptorArray(da);
}
```

## Resultados

¡Veamos los números finales de la compresión de punteros! Para estos resultados, usamos las mismas pruebas de navegación que presentamos al principio de esta publicación del blog. Como recordatorio, son historias de usuarios de navegación que encontramos representativas del uso de sitios web del mundo real.

En ellas, observamos que la compresión de punteros reduce **el tamaño del heap de V8 hasta un 43%**. A su vez, reduce **la memoria del proceso de renderizador de Chrome hasta un 20%** en escritorio.

![Ahorro de memoria al navegar en Windows 10](/_img/pointer-compression/v8-heap-memory.svg)

Otra cosa importante a notar es que no todos los sitios web mejoran en la misma medida. Por ejemplo, la memoria del heap de V8 solía ser mayor en Facebook que en el New York Times, pero con la compresión de punteros es en realidad al revés. Esta diferencia puede explicarse por el hecho de que algunos sitios web tienen más valores etiquetados que otros.

Además de estas mejoras de memoria, también hemos visto mejoras de rendimiento en el mundo real. ¡En sitios web reales utilizamos menos CPU y tiempo del recolector de basura!

![Mejoras en el tiempo de CPU y de recolección de basura](/_img/pointer-compression/performance-improvements.svg)

## Conclusión

El camino para llegar aquí no fue un lecho de rosas, pero valió la pena. [300+ commits](https://github.com/v8/v8/search?o=desc&q=repo%3Av8%2Fv8+%22%5Bptr-compr%5D%22&s=committer-date&type=Commits) después, V8 con Compresión de Punteros utiliza tanta memoria como si ejecutáramos una aplicación de 32 bits, pero con el rendimiento de una de 64 bits.

Siempre estamos buscando mejorar las cosas y tenemos las siguientes tareas relacionadas en nuestro pipeline:

- Mejorar la calidad del código ensamblador generado. Sabemos que en algunos casos podemos generar menos código, lo cual debería mejorar el rendimiento.
- Abordar regresiones de rendimiento relacionadas, incluyendo un mecanismo que permita desempaquetar campos dobles nuevamente de una manera compatible con la compresión de punteros.
- Explorar la idea de soportar heaps más grandes, en el rango de 8 a 16 GB.
