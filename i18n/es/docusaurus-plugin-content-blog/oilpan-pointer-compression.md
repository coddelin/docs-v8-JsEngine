---
title: "Compresión de punteros en Oilpan"
author: "Anton Bikineev y Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), desensambladores caminantes"
avatars: 
  - anton-bikineev
  - michael-lippautz
date: 2022-11-28
tags: 
  - internalidades
  - memoria
  - cppgc
description: "La compresión de punteros en Oilpan permite comprimir los punteros de C++ y reducir el tamaño del heap hasta en un 33%."
tweet: "1597274125780893697"
---

> Es absolutamente idiota tener punteros de 64 bits cuando compilo un programa que usa menos de 4 gigabytes de RAM. Cuando tales valores de puntero aparecen dentro de una estructura, no solo desperdician la mitad de la memoria, sino que también efectivamente descartan la mitad de la caché.
>
> – [Donald Knuth (2008)](https://cs.stanford.edu/~knuth/news08.html)

<!--truncate-->

Raras veces se han dicho palabras más ciertas. También vemos que los fabricantes de CPU no están enviando realmente [CPUs de 64 bits](https://en.wikipedia.org/wiki/64-bit_computing#Limits_of_processors) y los OEMs de Android [optan por un espacio de direcciones de solo 39 bits](https://www.kernel.org/doc/Documentation/arm64/memory.txt) para acelerar los recorridos de la tabla de páginas en el núcleo. V8 ejecutándose en Chrome también [aísla sitios en procesos separados](https://www.chromium.org/Home/chromium-security/site-isolation/), lo que limita aún más los requisitos del espacio de direcciones real necesario para una sola pestaña. Sin embargo, nada de esto es completamente nuevo, por lo que lanzamos [compresión de punteros para V8 en 2020](https://v8.dev/blog/pointer-compression) y vimos grandes mejoras en la memoria en toda la web. Con la [biblioteca Oilpan](https://v8.dev/blog/oilpan-library) tenemos otro componente de la web bajo control. [Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/README.md) es un recolector de basura basado en rastreo para C++ que, entre otras cosas, se utiliza para alojar el Modelo de Objeto del Documento en Blink y, por lo tanto, es un objetivo interesante para optimizar la memoria.

## Antecedentes

La compresión de punteros es un mecanismo para reducir el tamaño de los punteros en plataformas de 64 bits. Los punteros en Oilpan están encapsulados en un puntero inteligente llamado [`Member`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/member.h). En un diseño de heap no comprimido, las referencias de `Member` apuntan directamente a objetos en el heap, es decir, se usan 8 bytes de memoria por referencia. En tal escenario, el heap puede estar distribuido por todo el espacio de direcciones, ya que cada puntero contiene toda la información relevante para referirse a un objeto.

![Diseño de heap no comprimido](/_img/oilpan-pointer-compression/uncompressed-layout.svg)

Con un diseño de heap comprimido, las referencias de `Member` son solo desplazamientos dentro de una jaula de heap, que es una región contigua de memoria. La combinación de un puntero base (base) que apunta al comienzo de la jaula del heap y un `Member` forma un puntero completo, muy similar a cómo funciona la [dirección segmentada](https://en.wikipedia.org/wiki/Memory_segmentation#Segmentation_without_paging). El tamaño de una jaula de heap está limitado por los bits disponibles para el desplazamiento. Por ejemplo, una jaula de heap de 4GB requiere desplazamientos de 32 bits.

![Diseño de heap comprimido](/_img/oilpan-pointer-compression/compressed-layout.svg)

Convenientemente, los heaps de Oilpan ya están contenidos dentro de una jaula de heap de 4GB en plataformas de 64 bits, para permitir referirse a los metadatos de recolección de basura simplemente alineando cualquier puntero de heap válido al límite de 4GB más cercano.

Oilpan también admite múltiples heaps en el mismo proceso para, por ejemplo, admitir trabajadores web con sus propios heaps de C++ en Blink. El problema que surge de esta configuración es cómo mapear heaps a posiblemente muchas jaulas de heap. Dado que los heaps están vinculados a hilos nativos en Blink, la solución aquí es referirse a las jaulas de heap a través de un puntero base local de hilo. Dependiendo de cómo se compilen V8 y sus incrustadores, el modelo de almacenamiento local de hilo (TLS) puede restringirse para acelerar cómo se carga la base desde la memoria. Sin embargo, se requiere el modo TLS más genérico para admitir Android, ya que en esta plataforma el renderizador (y, por lo tanto, V8) se cargan a través de `dlopen`. Estas restricciones hacen que el uso de TLS sea inviable desde una perspectiva de rendimiento[^1]. Para ofrecer el mejor rendimiento, Oilpan, similar a V8, asigna todos los heaps en una sola jaula de heap cuando se utiliza la compresión de punteros. Aunque esto restringe la memoria general disponible, creemos que esto es aceptable actualmente dado que la compresión de punteros ya apunta a reducir la memoria. Si una sola jaula de heap de 4GB resulta ser demasiado restrictiva, el esquema de compresión actual permite aumentar el tamaño de la jaula de heap a 16GB sin sacrificar el rendimiento.

## Implementación en Oilpan

### Requisitos

Hasta ahora, hemos hablado de un esquema de codificación trivial donde el puntero completo se forma añadiendo una base a un desplazamiento que se almacena en un puntero Member. Sin embargo, el esquema implementado en realidad no es tan simple, ya que Oilpan requiere que Member pueda asignarse uno de los siguientes:

1. Un puntero de heap válido a un objeto;
2. El `nullptr` de C++ (o similar);
3. Un valor centinela que debe conocerse en tiempo de compilación. El valor centinela puede, por ejemplo, usarse para señalar valores eliminados en tablas hash que también admiten `nullptr` como entradas.

La parte problemática alrededor de `nullptr` y un centinela es la falta de tipos explícitos para captarlos en el lado del llamador:

```cpp
void* ptr = member.get();
if (ptr == nullptr) { /* ... * }
```

Como no hay un tipo explícito para almacenar un valor `nullptr` posiblemente comprimido, se requiere una descompresión real para comparar con la constante.

Teniendo este uso en mente, buscábamos un esquema que manejara transparentemente los casos 1.-3. Dado que la secuencia de compresión y descompresión se integrará en línea dondequiera que se use Member, las siguientes propiedades también son deseables:

- Secuencia de instrucciones rápida y compacta para minimizar fallas en la memoria caché de instrucciones (icache).
- Secuencia de instrucciones sin bifurcaciones para evitar el uso de predictores de bifurcaciones.

Dado que se espera que las lecturas superen significativamente a las escrituras, permitimos un esquema asimétrico donde se prefiera una descompresión rápida.

### Compresión y descompresión

Por brevedad, esta descripción solo cubre el esquema de compresión final utilizado. Consulta nuestro [documento de diseño](https://docs.google.com/document/d/1neGN8Jq-1JLrWK3cvwRIfrSjLgE0Srjv-uq7Ze38Iao) para obtener más información sobre cómo llegamos allí y las alternativas consideradas.

La idea principal para el esquema implementado hasta hoy es separar punteros de heap regulares de `nullptr` y centinelas, basándose en la alineación de la caja de heap. Básicamente, la caja de heap se asigna con una alineación tal que el bit menos significativo de la mitad superior siempre está configurado. Denotamos la mitad superior e inferior (32 bits cada una) como U<sub>31</sub>...U<sub>0</sub> y L<sub>31</sub>...L<sub>0</sub>, respectivamente.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | mitad superior                          | mitad inferior                                |
| ------------ | --------------------------------------: | --------------------------------------------: |
| puntero heap | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt>  |
| `nullptr`    | <tt>0...0</tt>                          | <tt>0...000</tt>                             |
| centinela    | <tt>0...0</tt>                          | <tt>0...010</tt>                             |
<!-- markdownlint-enable no-inline-html -->
:::

La compresión genera un valor comprimido simplemente desplazándolo a la derecha por uno y truncando la mitad superior del valor. De este modo, el bit de alineación (que ahora se convierte en el bit más significativo del valor comprimido) indica un puntero de heap válido.

:::table-wrapper
| C++                                             | Ensamblador x64 |
| :---------------------------------------------- | :-------------- |
| ```cpp                                          | ```asm         \
| uint32_t Compress(void* ptr) \{                 | mov rax, rdi   \
|   return ((uintptr_t)ptr) >> 1;                | shr rax        \
| \}                                              | ```            \
| ```                                             |                |
:::

La codificación para valores comprimidos es la siguiente:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | valor comprimido                          |
| ------------ | ----------------------------------------: |
| puntero heap | <tt>1L<sub>31</sub>...L<sub>2</sub>00</tt>|
| `nullptr`    | <tt>0...00</tt>                           |
| centinela    | <tt>0...01</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

Cabe notar que esto permite determinar si un valor comprimido representa un puntero de heap, `nullptr` o el valor centinela, lo cual es importante para evitar descompresiones inútiles en el código del usuario (ver abajo).

La idea para la descompresión es luego confiar en un puntero base específicamente diseñado, en el cual los 32 bits menos significativos están configurados en 1.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | mitad superior                          | mitad inferior |
| ------------ | --------------------------------------: | -------------: |
| base         | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt>| <tt>1...1</tt> |
<!-- markdownlint-enable no-inline-html -->
:::


La operación de descompresión primero extiende el signo del valor comprimido y luego desplaza a la izquierda para deshacer la operación de compresión del bit de signo. El valor intermedio resultante se codifica de la siguiente manera

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | mitad superior     | mitad inferior                                |
| ------------ | -----------------: | --------------------------------------------: |
| puntero heap | <tt>1...1</tt>     | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt>   |
| `nullptr`    | <tt>0...0</tt> | <tt>0...000</tt>                           |
| centinela    | <tt>0...0</tt> | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

Finalmente, el puntero descomprimido es simplemente el resultado de un AND bit a bit entre este valor intermedio y el puntero base.

:::table-wrapper
| C++                                                    | ensamblaje x64       |
| :----------------------------------------------------- | :------------------- |
| ```cpp                                                 | ```asm              \
| void* Descomprimir(uint32_t comprimido) \{              | movsxd rax, edi     \
|   uintptr_t intermedio =                               | add rax, rax        \
|      (uintptr_t)((int32_t)comprimido)  &lt;&lt;1;             | and rax, qword ptr \
|   return (void*)(intermedio & base);                   |     [rip + base]    \
| \}                                                     | ```                 \
| ```                                                    |                     |
:::

El esquema resultante maneja los casos 1.-3. de forma transparente mediante un esquema asimétrico sin bifurcaciones. La compresión usa 3 bytes, sin contar el movimiento inicial del registro ya que la llamada se inlinaría de todas formas. La descompresión usa 13 bytes, contando el movimiento inicial del registro que extiende el signo.

## Detalles seleccionados

La sección anterior explicó el esquema de compresión utilizado. Un esquema de compresión compacto es necesario para lograr un alto rendimiento. El esquema de compresión anterior aún daba lugar a regresiones observables en Speedometer. Los párrafos siguientes explican algunos detalles adicionales necesarios para mejorar el rendimiento de Oilpan a un nivel aceptable.

### Optimización de la carga base de la jaula

Técnicamente, en términos de C++, el puntero base global no puede ser una constante, porque se inicializa en tiempo de ejecución después de `main()`, cada vez que el integrador inicializa Oilpan. Tener esta variable global mutable inhibiría la importante optimización de propagación de constantes; por ejemplo, el compilador no puede probar que una llamada aleatoria no modifica la base y tendría que cargarla dos veces:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
| C++                        | ensamblaje x64                 |
| :------------------------- | :----------------------------- |
| ```cpp                     | ```asm                         \
| void foo(GCed*);           | baz(Member&lt;GCed>):           \
| void bar(GCed*);           |   movsxd rbx, edi              \
|                            |   add rbx, rbx                 \
| void baz(Member&lt;GCed> m) \{ |   mov rdi, qword ptr          \
|   foo(m.get());            |       [rip + base]             \
|   bar(m.get());            |   and rdi, rbx                 \
| }                          |   call foo(GCed*)              \
| ```                        |   and rbx, qword ptr           \
|                            |       [rip + base] # carga extra \
|                            |   mov rdi, rbx                 \
|                            |   jmp bar(GCed*)               \
|                            | ```                            |
<!-- markdownlint-enable no-inline-html -->
:::

Con algunos atributos adicionales le enseñamos a clang a tratar la base global como constante y, de hecho, realizar solo una única carga dentro de un contexto.

### Evitar la descompresión por completo

¡La secuencia de instrucciones más rápida es un nop! Con esto en mente, para muchas operaciones de puntero, las compresiones y descompresiones redundantes se pueden evitar fácilmente. Obviamente, no necesitamos descomprimir un Member para verificar si es nullptr. No necesitamos descomprimir y comprimir al construir o asignar un Member desde otro Member. La comparación de punteros se conserva mediante la compresión, por lo que también podemos evitar transformaciones para ellos. La abstracción Member nos sirve muy bien como un cuello de botella aquí.

La generación de hash puede acelerarse con punteros comprimidos. La descompresión para el cálculo del hash es redundante, porque la base fija no aumenta la entropía del hash. En cambio, se puede usar una función de hash más sencilla para enteros de 32 bits. Blink tiene muchas tablas hash que usan Member como clave; ¡la generación de hash de 32 bits resultó en colecciones más rápidas!

### Ayudando a clang en lugares donde falla al optimizar

Al observar el código generado, encontramos otro lugar interesante donde el compilador no realizó suficientes optimizaciones:

:::table-wrapper
| C++                               | ensamblaje x64           |
| :-------------------------------- | :----------------------- |
| ```cpp                            | ```asm                   \
| extern const uint64_t base;       | Asignar(unsigned int):   \
| extern std::atomic_bool enabled;  |   mov dword ptr [rdi], esi \
|                                   |   mov rdi, qword ptr     \
| void Asignar(uint32_t ptr) \{      |       [rip + base]       \
|   ptr_ = ptr                      |   mov al, byte ptr         \
|   WriteBarrier(Decompress(ptr));  |       [rip + enabled]      \
| }                                 |   test al, 1               \
|                                   |   jne .LBB4_2 # muy raro   \
| void WriteBarrier(void* ptr) \{    |   ret                      \
|   if (LIKELY(                     | .LBB4_2:                   \
|       !enabled.load(relaxed)))    |   movsxd rax, esi          \
|     return;                       |   add rax, rax             \
|   SlowPath(ptr);                  |   and rdi, rax             \
| }                                 |   jmp SlowPath(void*)      \
| ```                               | ```                        |
:::

El código generado realiza la carga base en el bloque básico caliente, aunque la variable no se utiliza en él y podría ser fácilmente hundida en el bloque básico inferior, donde se realiza la llamada a `SlowPath()` y el puntero descomprimido se utiliza realmente. El compilador decidió conservadoramente no reordenar la carga no atómica con la carga atómica-relajada, aunque sería perfectamente legal según las reglas del lenguaje. Movimos manualmente la descompresión debajo de la lectura atómica para hacer la asignación con la barrera de escritura lo más eficiente posible.


### Mejorando el empaquetado de estructuras en Blink

Es difícil estimar el efecto de reducir a la mitad el tamaño de los punteros de Oilpan. En esencia, debería mejorar la utilización de memoria para estructuras de datos "empaquetadas", como contenedores de dichos punteros. Las mediciones locales mostraron una mejora de aproximadamente 16% de la memoria de Oilpan. Sin embargo, la investigación mostró que para algunos tipos no hemos reducido su tamaño real, sino que solo hemos aumentado el relleno interno entre campos.

Para minimizar dicho relleno, escribimos un plugin para clang que identificó automáticamente clases recolectadas como basura donde la reorganización de los campos reduciría el tamaño general de la clase. Dado que hubo muchos de estos casos en el código base de Blink, aplicamos la reorganización a los más utilizados, vea el [documento de diseño](https://docs.google.com/document/d/1bE5gZOCg7ipDUOCylsz4_shz1YMYG5-Ycm0911kBKFA).

### Intento fallido: limitar el tamaño de la jaula del heap

Sin embargo, no todas las optimizaciones resultaron bien. En un intento por optimizar aún más la compresión, limitamos la jaula del heap a 2GB. Nos aseguramos de que el bit más significativo de la mitad inferior de la palabra de base de la jaula sea 1, lo que nos permitió evitar el desplazamiento por completo. La compresión se convertiría en una simple truncación y la descompresión en una simple carga y una operación 'and' a nivel de bits.

Dado que la memoria de Oilpan en el renderizador de Blink consume en promedio menos de 10MB, asumimos que sería seguro proceder con el esquema más rápido y restringir el tamaño de la jaula. Desafortunadamente, después de implementar la optimización, comenzamos a recibir errores de falta de memoria en algunas cargas de trabajo raras. Decidimos revertir esta optimización.

## Resultados y futuro

La compresión de punteros en Oilpan se habilitó de manera predeterminada en **Chrome 106**. Hemos visto grandes mejoras de memoria en general:


<!-- markdownlint-disable no-inline-html -->
| Memoria de Blink | P50                                                 | P99                                               |
| -----------: | :-------------------------------------------------: | :-----------------------------------------------: |
| Windows      | **<span style={{color:'green'}}>-21% (-1,37MB)</span>** | **<span style={{color:'green'}}>-33% (-59MB)</span>** |
| Android      | **<span style={{color:'green'}}>-6% (-0,1MB)</span>**   | **<span style={{color:'green'}}>-8% (-3,9MB)</span>** |
<!-- markdownlint-enable no-inline-html -->


Los números reportados representan el percentil 50 y el 99 para la memoria de Blink asignada con Oilpan en toda la flota[^2]. Los datos reportados muestran la diferencia entre las versiones estables de Chrome 105 y 106. Los números absolutos en MB dan una indicación del límite inferior que los usuarios pueden esperar. Las mejoras reales son generalmente un poco mayores debido a efectos indirectos en el consumo total de memoria de Chrome. La mejora relativa más grande sugiere que el empaquetado de datos es mejor en dichos casos, lo cual es un indicador de que se utiliza más memoria en colecciones (por ejemplo, vectores) que tienen buen empaquetado. El mejoramiento en el relleno de estructuras se implementó en Chrome 108 y mostró otra mejora del 4% en la memoria de Blink en promedio.

Como Oilpan es omnipresente en Blink, el costo de rendimiento puede estimarse en [Speedometer2](https://browserbench.org/Speedometer2.1/). El [prototipo inicial](https://chromium-review.googlesource.com/c/v8/v8/+/2739979) basado en una versión local por hilo mostró una regresión del 15%. Con todas las optimizaciones mencionadas anteriormente, no observamos una regresión notable.

### Escaneo conservador de pila

En Oilpan, la pila se escanea de manera conservadora para encontrar punteros al montón. Con punteros comprimidos, esto significa que tenemos que tratar cada medio palabra como un posible puntero. Además, durante la compresión, el compilador puede decidir volcar un valor intermedio en la pila, lo que significa que el escáner debe considerar todos los posibles valores intermedios (en nuestro esquema de compresión, el único valor intermedio posible es un valor truncado, pero aún no desplazado). Escanear valores intermedios aumentó el número de falsos positivos (es decir, medios palabras que parecen ser punteros comprimidos), lo que redujo la mejora de memoria aproximadamente en un 3% (de lo contrario, la mejora estimada de memoria sería del 24%).

### Otra compresión

En el pasado, hemos visto grandes mejoras al aplicar compresión a V8 JavaScript y Oilpan. Creemos que el paradigma se puede aplicar a otros punteros inteligentes en Chrome (por ejemplo, `base::scoped_refptr`) que ya apuntan a otras zonas del montón. Experimentos iniciales [mostraron](https://docs.google.com/document/d/1Rlr7FT3kulR8O-YadgiZkdmAgiSq0OaB8dOFNqf4cD8/edit) resultados prometedores.

Las investigaciones también mostraron que una gran parte de la memoria en realidad se mantiene a través de las tablas virtuales. En el mismo espíritu, hemos [habilitado](https://docs.google.com/document/d/1rt6IOEBevCkiVjiARUy8Ib1c5EAxDtW0wdFoTiijy1U/edit?usp=sharing) el ABI de tablas virtuales relativas en Android64, que compacta las tablas virtuales, permitiéndonos ahorrar más memoria y mejorar el inicio al mismo tiempo.

[^1]: Los lectores interesados pueden referirse a [`ThreadStorage::Current()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/heap/thread_state_storage.cc;drc=603337a74bf04efd536b251a7f2b4eb44fe153a9;l=19) de Blink para ver el resultado de compilar el acceso de TLS bajo diferentes modos.
[^2]: Las cifras se recopilan a través del marco de análisis de métricas de usuario de Chrome.
