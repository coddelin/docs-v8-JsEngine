---
title: "Deserialización perezosa"
author: "Jakob Gruber ([@schuay](https://twitter.com/schuay))"
avatars:
  - "jakob-gruber"
date: 2018-02-12 13:33:37
tags:
  - internals
description: "La deserialización perezosa, disponible en V8 v6.4, reduce el consumo de memoria de V8 en más de 500 KB por pestaña del navegador en promedio."
tweet: "962989179914383360"
---
TL;DR: La deserialización perezosa se habilitó recientemente de manera predeterminada en [V8 v6.4](/blog/v8-release-64), reduciendo el consumo de memoria de V8 en más de 500 KB por pestaña del navegador en promedio. ¡Sigue leyendo para saber más!

## Introducción a los snapshots de V8

Pero primero, demos un paso atrás y echemos un vistazo a cómo V8 utiliza snapshots de heap para acelerar la creación de nuevos Isolates (que corresponden aproximadamente a una pestaña de navegador en Chrome). Mi colega Yang Guo dio una buena introducción sobre este tema en su artículo sobre [snapshots personalizados de inicio](/blog/custom-startup-snapshots):

<!--truncate-->
> La especificación de JavaScript incluye una gran cantidad de funcionalidad incorporada, desde funciones matemáticas hasta un motor de expresiones regulares totalmente equipado. Cada contexto recién creado de V8 tiene estas funciones disponibles desde el principio. Para que esto funcione, el objeto global (por ejemplo, el objeto `window` en un navegador) y toda la funcionalidad incorporada deben configurarse e inicializarse en el heap de V8 en el momento en que se crea el contexto. Esto lleva bastante tiempo si se hace desde cero.
>
> Afortunadamente, V8 utiliza un atajo para acelerar las cosas: al igual que descongelar una pizza congelada para una cena rápida, deserializamos un snapshot previamente preparado directamente en el heap para obtener un contexto inicializado. En una computadora de escritorio regular, esto puede reducir el tiempo para crear un contexto de 40 ms a menos de 2 ms. En un teléfono móvil promedio, esto podría significar una diferencia entre 270 ms y 10 ms.

Para recapitular: los snapshots son críticos para el rendimiento de inicio y se deserializan para crear el estado inicial del heap de V8 para cada Isolate. El tamaño del snapshot, por lo tanto, determina el tamaño mínimo del heap de V8, y los snapshots más grandes se traducen directamente en mayor consumo de memoria para cada Isolate.

Un snapshot contiene todo lo necesario para inicializar completamente un nuevo Isolate, incluyendo constantes del lenguaje (por ejemplo, el valor `undefined`), manejadores internos de bytecode utilizados por el intérprete, objetos incorporados (por ejemplo, `String`) y las funciones instaladas en los objetos incorporados (por ejemplo, `String.prototype.replace`) junto con sus objetos ejecutables de `Code`.

![Tamaño de snapshot de inicio en bytes desde 2016-01 hasta 2017-09. El eje x muestra los números de revisión de V8.](/_img/lazy-deserialization/startup-snapshot-size.png)

En los últimos dos años, el snapshot casi se ha triplicado en tamaño, pasando de aproximadamente 600 KB a principios de 2016 a más de 1500 KB en la actualidad. La gran mayoría de este aumento proviene de objetos `Code` serializados, que han aumentado tanto en cantidad (por ejemplo, a través de adiciones recientes al lenguaje JavaScript a medida que la especificación del lenguaje evoluciona y crece) como en tamaño (los objetos incorporados generados por la nueva [pipeline CodeStubAssembler](/blog/csa) se envían como código nativo frente a los formatos más compactos de bytecode o JS minimizado).

Esto es una mala noticia, ya que nos gustaría mantener el consumo de memoria lo más bajo posible.

## Deserialización perezosa

Uno de los principales puntos problemáticos era que solíamos copiar todo el contenido del snapshot en cada Isolate. Hacer esto era especialmente desperdicioso para las funciones incorporadas, que se cargaban incondicionalmente pero que nunca podrían haberse usado.

Aquí es donde entra la deserialización perezosa. El concepto es bastante simple: ¿y si solo deserializáramos las funciones incorporadas justo antes de que se llamen?

Una rápida investigación de algunos de los sitios web más populares mostró que este enfoque era bastante atractivo: en promedio, solo se utilizaba el 30% de todas las funciones incorporadas, con algunos sitios utilizando solo el 16%. Esto parecía notablemente prometedor, dado que la mayoría de estos sitios son usuarios intensivos de JS y estos números pueden considerarse como un límite inferior (borroso) de los posibles ahorros de memoria para la web en general.

A medida que comenzamos a trabajar en esta dirección, resultó que la deserialización perezosa se integraba muy bien con la arquitectura de V8 y solo fueron necesarios unos pocos cambios de diseño, en su mayoría no invasivos, para comenzar:

1. **Posiciones bien conocidas dentro del snapshot.** Antes de la deserialización perezosa, el orden de los objetos dentro del snapshot serializado era irrelevante ya que solo deserializábamos todo el heap a la vez. La deserialización perezosa debe poder deserializar cualquier función incorporada por su cuenta y, por lo tanto, debe saber dónde se encuentra dentro del snapshot.
2. **Deserialización de objetos individuales.** Las instantáneas de V8 se diseñaron inicialmente para la deserialización de todo el heap, y agregar soporte para la deserialización de objetos individuales requirió lidiar con algunas peculiaridades, como el diseño no contiguo de las instantáneas (los datos serializados de un objeto podían estar entremezclados con datos de otros objetos) y las llamadas referencias posteriores (que pueden referenciar directamente objetos deserializados previamente en la misma ejecución).
3. **El propio mecanismo de deserialización perezosa.** En tiempo de ejecución, el controlador de deserialización perezosa debe ser capaz de a) determinar cuál objeto de código deserializar, b) realizar la deserialización real, y c) adjuntar el objeto de código serializado a todas las funciones relevantes.

Nuestra solución para los dos primeros puntos fue agregar una nueva [área dedicada a funciones integradas](https://cs.chromium.org/chromium/src/v8/src/snapshot/snapshot.h?l=55&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) en la instantánea, que puede contener solo objetos de código serializados. La serialización ocurre en un orden bien definido y el desplazamiento inicial de cada objeto `Code` se mantiene en una sección dedicada dentro del área de instantáneas de funciones integradas. No se permiten referencias posteriores ni datos de objetos entremezclados.

[La deserialización perezosa de funciones integradas](https://goo.gl/dxkYDZ) se maneja mediante la apropiadamente llamada función integrada [`DeserializeLazy`](https://cs.chromium.org/chromium/src/v8/src/builtins/x64/builtins-x64.cc?l=1355&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d), que se instala en todas las funciones integradas perezosas en el momento de la deserialización. Cuando se llama en tiempo de ejecución, deserializa el objeto `Code` relevante y finalmente lo instala tanto en el `JSFunction` (que representa el objeto de función) como en el `SharedFunctionInfo` (compartido entre funciones creadas a partir del mismo literal de función). Cada función integrada se deserializa como máximo una vez.

Además de las funciones integradas, también hemos implementado [la deserialización perezosa para los controladores de bytecode](https://goo.gl/QxZBL2). Los controladores de bytecode son objetos de código que contienen la lógica para ejecutar cada bytecode dentro del intérprete [Ignition](/blog/ignition-interpreter) de V8. A diferencia de las funciones integradas, no tienen adjunto un `JSFunction` ni un `SharedFunctionInfo`. En su lugar, sus objetos de código se almacenan directamente en la [tabla de despacho](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter.h?l=94&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d), en la cual el intérprete indexa al despachar al siguiente controlador de bytecode. La deserialización perezosa es similar a la de las funciones integradas: el controlador [`DeserializeLazy`](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter-generator.cc?l=3247&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) determina qué controlador deserializar inspeccionando la matriz de bytecode, deserializa el objeto de código y, finalmente, almacena el controlador deserializado en la tabla de despacho. Nuevamente, cada controlador se deserializa como máximo una vez.

## Resultados

Evaluamos el ahorro de memoria cargando los 1000 sitios web más populares utilizando Chrome 65 en un dispositivo Android, con y sin deserialización perezosa.

![](/_img/lazy-deserialization/memory-savings.png)

En promedio, el tamaño del heap de V8 disminuyó en 540 KB, con el 25% de los sitios probados ahorrando más de 620 KB, el 50% ahorrando más de 540 KB y el 75% ahorrando más de 420 KB.

El rendimiento en tiempo de ejecución (medido en benchmarks estándar de JS como Speedometer, así como en una amplia selección de sitios web populares) no se vio afectado por la deserialización perezosa.

## Próximos pasos

La deserialización perezosa asegura que cada Isolate solo cargue los objetos de código integrados que realmente son utilizados. Eso ya es un gran avance, pero creemos que es posible dar un paso más y reducir el costo (relacionado a funciones integradas) de cada Isolate prácticamente a cero.

Esperamos traerte actualizaciones sobre este frente más adelante este año. ¡Mantente atento!
