---
title: 'Añadiendo seguridad temporal de memoria a C++'
author: 'Anton Bikineev, Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), Hannes Payer ([@PayerHannes](https://twitter.com/PayerHannes))'
avatars:
  - anton-bikineev
  - michael-lippautz
  - hannes-payer
date: 2022-06-14
tags:
  - internals
  - memoria
  - seguridad
description: 'Eliminando vulnerabilidades de uso después de liberación en Chrome con análisis de heap.'
---
:::note
**Nota:** Esta publicación fue publicada originalmente en el [Blog de Seguridad de Google](https://security.googleblog.com/2022/05/retrofitting-temporal-memory-safety-on-c.html).
:::

[La seguridad de memoria en Chrome](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) es un esfuerzo continuo para proteger a nuestros usuarios. Constantemente experimentamos con diferentes tecnologías para estar un paso adelante de los actores maliciosos. En este espíritu, esta publicación trata sobre nuestro camino usando tecnologías de análisis de heap para mejorar la seguridad de memoria de C++.

<!--truncate-->
Pero empecemos desde el principio. Durante la vida útil de una aplicación, su estado generalmente se representa en memoria. La seguridad temporal de memoria se refiere al problema de garantizar que la memoria siempre se acceda con la información más actualizada de su estructura, su tipo. Desafortunadamente, C++ no proporciona estas garantías. Aunque hay interés en lenguajes diferentes a C++ con garantías más fuertes de seguridad de memoria, grandes bases de código como Chromium continuarán utilizando C++ en el futuro previsible.

```cpp
auto* foo = new Foo();
delete foo;
// La ubicación de memoria apuntada por foo ya no representa
// un objeto Foo, ya que el objeto ha sido eliminado (liberado).
foo->Process();
```

En el ejemplo anterior, `foo` se usa después de que su memoria ha sido devuelta al sistema subyacente. El puntero desactualizado se llama un [puntero colgante](https://es.wikipedia.org/wiki/Puntero_colgante) y cualquier acceso a través de él resulta en un acceso de uso después de liberación (UAF). En el mejor de los casos, tales errores resultan en bloqueos bien definidos, en el peor de los casos causan fallos sutiles que pueden ser explotados por actores maliciosos.

Los UAF a menudo son difíciles de detectar en bases de código más grandes, donde la propiedad de los objetos se transfiere entre varios componentes. El problema general es tan generalizado que hasta la fecha la industria y el ámbito académico regularmente presentan estrategias de mitigación. Los ejemplos son interminables: se utilizan punteros inteligentes de C++ de todo tipo para definir y gestionar mejor la propiedad a nivel de aplicación; el análisis estático en compiladores se utiliza para evitar compilar código problemático desde el principio; donde el análisis estático falla, herramientas dinámicas como los [sanitizadores C++](https://github.com/google/sanitizers) pueden interceptar los accesos y detectar problemas en ejecuciones específicas.

El uso de C++ en Chrome, lamentablemente, no es diferente aquí y la mayoría de [los errores de seguridad de alta gravedad son problemas UAF](https://www.chromium.org/Home/chromium-security/memory-safety/). Para detectar problemas antes de que lleguen a producción, se utilizan todas las técnicas mencionadas anteriormente. Además de las pruebas regulares, los fuzzers aseguran que siempre haya nueva entrada con la que trabajar para herramientas dinámicas. Chrome incluso va más allá y emplea un recolector de basura de C++ llamado [Oilpan](https://v8.dev/blog/oilpan-library) que se desvía de las semánticas regulares de C++ pero proporciona seguridad temporal de memoria donde se usa. Donde tal desviación no es razonable, se introdujo recientemente un nuevo tipo de puntero inteligente llamado [MiraclePtr](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) para bloquear determinísticamente accesos a punteros colgantes cuando se usa. Oilpan, MiraclePtr y soluciones basadas en punteros inteligentes requieren adopciones significativas del código de la aplicación.

En la última década, otro enfoque ha tenido cierto éxito: la cuarentena de memoria. La idea básica es poner explícitamente la memoria liberada en cuarentena y solo hacerla disponible cuando se alcanza una cierta condición de seguridad. Microsoft ha lanzado versiones de esta mitigación en sus navegadores: [MemoryProtector](https://securityintelligence.com/understanding-ies-new-exploit-mitigations-the-memory-protector-and-the-isolated-heap/) en Internet Explorer en 2014 y su sucesor [MemGC](https://securityintelligence.com/memgc-use-after-free-exploit-mitigation-in-edge-and-ie-on-windows-10/) en (pre-Chromium) Edge en 2015. En el [kernel de Linux](https://a13xp0p0v.github.io/2020/11/30/slab-quarantine.html) se utilizó un enfoque probabilístico donde la memoria eventualmente solo se reciclaba. Y este enfoque ha recibido atención en el ámbito académico en los últimos años con el [documento MarkUs](https://www.cst.cam.ac.uk/blog/tmj32/addressing-temporal-memory-safety). El resto de este artículo resume nuestro viaje experimentando con cuarentenas y análisis de heap en Chrome.

(En este punto, uno podría preguntarse dónde encaja la etiquetación de memoria en este panorama; ¡sigue leyendo!)

## Cuarentena y escaneo de la pila, lo básico

La idea principal detrás de garantizar la seguridad temporal con la cuarentena y el escaneo de la pila es evitar reutilizar la memoria hasta que se haya demostrado que no hay más punteros (colgantes) que la estén referenciando. Para evitar cambiar el código del usuario de C++ o su semántica, se intercepta el asignador de memoria que proporciona `new` y `delete`.

![Figura 1: conceptos básicos de la cuarentena](/_img/retrofitting-temporal-memory-safety-on-c++/basics.svg)

Al invocar `delete`, la memoria se coloca en realidad en una cuarentena, donde no está disponible para ser reutilizada en llamadas posteriores a `new` realizadas por la aplicación. En algún momento, se activa un escaneo de la pila que escanea toda la pila, de manera similar a un recolector de basura, para encontrar referencias a bloques de memoria en cuarentena. Los bloques que no tienen referencias entrantes desde la memoria regular de la aplicación se transfieren de vuelta al asignador, donde pueden reutilizarse para asignaciones posteriores.

Existen varias opciones de robustecimiento que conllevan costos de rendimiento:

- Sobrescribir la memoria en cuarentena con valores especiales (por ejemplo, ceros);
- Detener todos los hilos de la aplicación mientras se realiza el escaneo o escanear la pila de manera concurrente;
- Interceptar escrituras en memoria (por ejemplo, mediante protección de páginas) para detectar actualizaciones de punteros;
- Escanear la memoria palabra por palabra en busca de posibles punteros (manejo conservador) o proporcionar descriptores para objetos (manejo preciso);
- Segregar la memoria de la aplicación en particiones seguras y no seguras para excluir ciertos objetos que son sensibles al rendimiento o que se pueden probar estáticamente como seguros para omitir;
- Escanear la pila de ejecución además de escanear únicamente la memoria de la pila;

A esta colección de diferentes versiones de estos algoritmos la llamamos *StarScan* [stɑː skæn], o simplemente *\*Scan*.

## Verificación de la realidad

Aplicamos \*Scan a las partes no gestionadas del proceso del renderer y utilizamos [Speedometer2](https://browserbench.org/Speedometer2.0/) para evaluar el impacto en el rendimiento.

Hemos experimentado con diferentes versiones de \*Scan. Sin embargo, para minimizar el impacto en el rendimiento tanto como sea posible, evaluamos una configuración que utiliza un hilo separado para escanear la pila y evita limpiar la memoria en cuarentena de manera inmediata al realizar `delete`, prefiriendo limpiar la memoria en cuarentena al ejecutar \*Scan. Optamos por incluir toda la memoria asignada con `new` y no discriminamos entre sitios de asignación y tipos, para simplificar en la primera implementación.

![Figura 2: Escaneo en un hilo separado](/_img/retrofitting-temporal-memory-safety-on-c++/separate-thread.svg)

Cabe señalar que la versión propuesta de \*Scan no está completa. Concretamente, un actor malintencionado podría explotar una condición de carrera con el hilo de escaneo al mover un puntero colgante de una región de memoria sin escanear a una región de memoria que ya ha sido escaneada. Solucionar esta condición de carrera requiere realizar un seguimiento de las escrituras en los bloques de memoria que ya han sido escaneados, utilizando, por ejemplo, mecanismos de protección de memoria para interceptar esos accesos, o deteniendo todos los hilos de la aplicación en puntos seguros para evitar que muten el grafo de objetos en su totalidad. En cualquier caso, resolver este problema conlleva un costo en rendimiento y exhibe una interesante relación entre rendimiento y seguridad. Cabe mencionar que este tipo de ataque no es genérico y no funciona para todos los casos de uso posterior (UAF). Problemas como los descritos en la introducción no serían susceptibles a tales ataques, ya que el puntero colgante no se copia.

Dado que los beneficios en seguridad realmente dependen de la granularidad de dichos puntos seguros y queremos experimentar con la versión más rápida posible, deshabilitamos los puntos seguros por completo.

Ejecutar nuestra versión básica en Speedometer2 reduce el puntaje total en un 8 %. ¡Qué decepción…!

¿De dónde proviene todo este sobrecoste? Como era de esperar, el escaneo de la pila está limitado por la memoria y es bastante costoso, ya que toda la memoria del usuario debe ser recorrida y examinada en busca de referencias por el hilo de escaneo.

Para reducir la regresión, implementamos diversas optimizaciones que mejoran la velocidad bruta de escaneo. Naturalmente, la forma más rápida de escanear la memoria es no escanearla en absoluto, por lo que particionamos la pila en dos clases: memoria que puede contener punteros y memoria que podemos probar estáticamente que no contiene punteros, como las cadenas. Evitamos escanear memoria que no puede contener punteros en absoluto. Cabe señalar que dicha memoria aún forma parte de la cuarentena, simplemente no se escanea.

Extendimos este mecanismo para cubrir también las asignaciones que sirven como memoria de respaldo para otros asignadores, por ejemplo, memoria de zonas que es gestionada por V8 para el compilador de JavaScript optimizado. Dichas zonas siempre se descartan por completo (ver manejo de memoria basado en regiones) y la seguridad temporal se establece por otros medios en V8.

Además, aplicamos varias microoptimizaciones para acelerar y eliminar cálculos: utilizamos tablas auxiliares para el filtrado de punteros; confiamos en SIMD para el bucle de escaneo limitado por la memoria; y minimizamos la cantidad de accesos y de instrucciones con prefijo de bloqueo.

También mejoramos el algoritmo inicial de planificación que solo comienza un escaneo de montón al alcanzar un cierto límite ajustando cuánto tiempo dedicamos al escaneo en comparación con la ejecución del código de la aplicación (cf. utilización del mutador en [literatura de recolección de basura](https://dl.acm.org/doi/10.1145/604131.604155)).

Al final, el algoritmo sigue dependiendo de la memoria y el escaneo sigue siendo un procedimiento notablemente costoso. Las optimizaciones ayudaron a reducir la regresión de Speedometer2 del 8% al 2%.

Aunque mejoramos el tiempo de escaneo bruto, el hecho de que la memoria esté en cuarentena aumenta el conjunto de trabajo general de un proceso. Para cuantificar aún más este sobrecoste, utilizamos un conjunto seleccionado de [benchmarks de navegación en el mundo real de Chrome](https://chromium.googlesource.com/catapult/) para medir el consumo de memoria. \*Scan en el proceso del renderizador aumenta el consumo de memoria en aproximadamente un 12%. Es este aumento del conjunto de trabajo lo que lleva a que se pagine más memoria, lo cual es notable en las rutas rápidas de aplicación.

## Etiquetado de memoria por hardware al rescate

MTE (Extensión de Etiquetado de Memoria) es una nueva extensión en la arquitectura ARM v8.5A que ayuda a detectar errores en el uso de memoria de software. Estos errores pueden ser errores espaciales (por ejemplo, accesos fuera de los límites) o errores temporales (uso después de liberar). La extensión funciona de la siguiente manera. Cada 16 bytes de memoria se asignan a una etiqueta de 4 bits. Los punteros también se asignan a una etiqueta de 4 bits. El asignador es responsable de devolver un puntero con la misma etiqueta que la memoria asignada. Las instrucciones de carga y almacenamiento verifican que las etiquetas de los punteros y la memoria coincidan. En caso de que las etiquetas de la ubicación de memoria y el puntero no coincidan, se lanza una excepción de hardware.

MTE no ofrece una protección determinista contra el uso después de liberar. Dado que el número de bits de etiqueta es finito, existe la posibilidad de que la etiqueta de la memoria y el puntero coincidan debido a un desbordamiento. Con 4 bits, solo se necesitan 16 reasignaciones para que las etiquetas coincidan. Un actor malicioso podría explotar el desbordamiento de bits de etiqueta para obtener un uso después de liberar simplemente esperando hasta que la etiqueta de un puntero colgante coincida (otra vez) con la memoria a la que apunta.

\*Scan se puede usar para solucionar este caso problemático. En cada llamada a `delete`, la etiqueta del bloque de memoria subyacente se incrementa mediante el mecanismo de MTE. La mayoría de las veces el bloque estará disponible para reasignación ya que la etiqueta se puede incrementar dentro del rango de 4 bits. Los punteros obsoletos se referirían a la etiqueta antigua y, por lo tanto, causarían un fallo confiable al momento de la desreferencia. Al desbordar la etiqueta, el objeto se coloca en cuarentena y se procesa mediante \*Scan. Una vez que el escaneo verifica que no hay más punteros colgantes a este bloque de memoria, se devuelve al asignador. Esto reduce el número de escaneos y su costo asociado en aproximadamente 16 veces.

La siguiente imagen describe este mecanismo. El puntero a `foo` inicialmente tiene una etiqueta de `0x0E`, lo que permite que se incremente una vez más para asignar `bar`. Al invocar `delete` para `bar`, la etiqueta se desborda y la memoria se coloca de hecho en cuarentena de \*Scan.

![Figura 3: MTE](/_img/retrofitting-temporal-memory-safety-on-c++/mte.svg)

Obtuvimos acceso a hardware real que soporta MTE y repetimos los experimentos en el proceso de renderizado. Los resultados son prometedores, ya que la regresión en Speedometer estuvo dentro del ruido y solo tuvimos una regresión del consumo de memoria de alrededor del 1% en las historias reales de navegación de Chrome.

¿Esto es algún [almuerzo gratis real](https://en.wikipedia.org/wiki/No_free_lunch_theorem)? Resulta que MTE tiene un costo que ya ha sido pagado. Específicamente, PartitionAlloc, que es el asignador subyacente de Chrome, ya realiza las operaciones de gestión de etiquetas para todos los dispositivos habilitados con MTE de forma predeterminada. Además, por razones de seguridad, la memoria realmente debería ser cero con entusiasmo. Para cuantificar estos costos, realizamos experimentos en un prototipo de hardware temprano que soporta MTE en varias configuraciones:

 A. MTE desactivado y sin memoria puesta a cero;
 B. MTE desactivado pero con memoria puesta a cero;
 C. MTE activado sin \*Scan;
 D. MTE activado con \*Scan;

(También somos conscientes de que hay MTE sincrónico y asincrónico, lo cual también afecta al determinismo y rendimiento. Para el propósito de este experimento seguimos usando el modo asincrónico).

![Figura 4: Regresión MTE](/_img/retrofitting-temporal-memory-safety-on-c++/mte-regression.svg)

Los resultados muestran que MTE y la puesta a cero de la memoria tienen un coste que es de alrededor del 2% en Speedometer2. Cabe destacar que ni PartitionAlloc ni el hardware han sido optimizados para estos escenarios aún. El experimento también muestra que añadir \*Scan sobre MTE no tiene un costo medible.

## Conclusiones
