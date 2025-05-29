---
title: "Compilación en segundo plano"
author: "[Ross McIlroy](https://twitter.com/rossmcilroy), defensor del hilo principal"
avatars: 
  - "ross-mcilroy"
date: "2018-03-26 13:33:37"
tags: 
  - internals
description: "A partir de Chrome 66, V8 compila el código fuente de JavaScript en un hilo en segundo plano, reduciendo el tiempo dedicado a la compilación en el hilo principal entre un 5% y un 20% en sitios web típicos."
tweet: "978319362837958657"
---
TL;DR: A partir de Chrome 66, V8 compila el código fuente de JavaScript en un hilo en segundo plano, reduciendo el tiempo dedicado a la compilación en el hilo principal entre un 5% y un 20% en sitios web típicos.

## Contexto

Desde la versión 41, Chrome ha admitido [la análisis de archivos fuente de JavaScript en un hilo en segundo plano](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html) mediante la API [`StreamedSource`](https://cs.chromium.org/chromium/src/v8/include/v8.h?q=StreamedSource&sq=package:chromium&l=1389) de V8. Esto permite que V8 comience a analizar el código fuente de JavaScript tan pronto como Chrome haya descargado el primer fragmento del archivo de la red y continúe analizando en paralelo mientras Chrome transmite el archivo por la red. Esto puede proporcionar mejoras considerables en el tiempo de carga, ya que V8 puede estar casi terminado de analizar el JavaScript para cuando el archivo haya terminado de descargarse.

<!--truncate-->
Sin embargo, debido a las limitaciones del compilador básico original de V8, V8 aún necesitaba regresar al hilo principal para finalizar el análisis y compilar el script en código máquina JIT que ejecutaría el código del script. Con el cambio a nuestra nueva [pipeline de Ignition + TurboFan](/blog/launching-ignition-and-turbofan), ahora podemos mover la compilación de código de byte al hilo en segundo plano también, liberando así el hilo principal de Chrome para ofrecer una experiencia de navegación web más fluida y receptiva.

## Construyendo un compilador de bytecode en hilo en segundo plano

El compilador de bytecode de Ignition de V8 toma el [árbol de sintaxis abstracta (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) producido por el analizador como entrada y produce un flujo de bytecode (`BytecodeArray`) junto con metadatos asociados que permiten al intérprete de Ignition ejecutar el código fuente de JavaScript.

![](/_img/background-compilation/bytecode.svg)

El compilador de bytecode de Ignition fue creado con la idea de soporte para multihilo; sin embargo, se requirieron varios cambios a lo largo del pipeline de compilación para habilitar la compilación en segundo plano. Uno de los principales cambios fue evitar que el pipeline de compilación accediera a objetos en el heap de JavaScript de V8 mientras se ejecuta en el hilo en segundo plano. Los objetos en el heap de V8 no son seguros para los hilos, ya que JavaScript es de un solo hilo, y podrían ser modificados por el hilo principal o por el recolector de basura de V8 durante la compilación en segundo plano.

Había dos etapas principales del pipeline de compilación que accedían a los objetos en el heap de V8: la internalización del AST y la finalización del bytecode. La internalización del AST es un proceso mediante el cual los objetos literales (cadenas de caracteres, números, plantillas de objetos literales, etc.) identificados en el AST se asignan en el heap de V8, de modo que puedan ser utilizados directamente por el bytecode generado cuando se ejecuta el script. Este proceso tradicionalmente ocurría inmediatamente después de que el analizador creara el AST. Como tal, había varios pasos posteriores en el pipeline de compilación que dependían de que los objetos literales hubieran sido asignados. Para habilitar la compilación en segundo plano, movimos la internalización del AST más tarde en el pipeline de compilación, después de que el bytecode hubiera sido compilado. Esto requirió modificaciones a las etapas posteriores del pipeline para acceder a los valores _brutos_ literales incrustados en el AST en lugar de valores internalizados en el heap.

La finalización del bytecode implica construir el objeto final `BytecodeArray` utilizado para ejecutar la función junto con los metadatos asociados — por ejemplo, un `ConstantPoolArray` que almacena constantes a las que se refiere el bytecode, y una `SourcePositionTable` que asigna los números de línea y columna del código fuente de JavaScript a desplazamientos en el bytecode. Dado que JavaScript es un lenguaje dinámico, todos estos objetos necesitan vivir en el heap de JavaScript para permitir que sean recolectados por el recolector de basura si se recoge la función de JavaScript asociada al bytecode. Anteriormente, algunos de estos objetos de metadatos se asignaban y modificaban durante la compilación de bytecode, lo que implicaba acceder al heap de JavaScript. Para habilitar la compilación en segundo plano, el generador de bytecode de Ignition fue refactorizado para rastrear los detalles de estos metadatos y diferir su asignación en el heap de JavaScript hasta las etapas muy finales de la compilación.

Con estos cambios, casi toda la compilación del script puede moverse a un hilo en segundo plano, con solo las breves etapas de internalización del AST y finalización del bytecode ocurriendo en el hilo principal justo antes de la ejecución del script.

![](/_img/background-compilation/threads.svg)

Actualmente, solo el código de script de nivel superior y las expresiones de función invocadas inmediatamente (IIFEs) se compilan en un hilo de fondo: las funciones internas todavía se compilan de manera perezosa (cuando se ejecutan por primera vez) en el hilo principal. Esperamos extender la compilación en segundo plano a más situaciones en el futuro. Sin embargo, incluso con estas restricciones, la compilación en segundo plano deja el hilo principal libre por más tiempo, permitiéndole realizar otras tareas como reaccionar a la interacción del usuario, renderizar animaciones o, de otro modo, proporcionar una experiencia más fluida y receptiva.

## Resultados

Evaluamos el rendimiento de la compilación en segundo plano utilizando nuestro [marco de referencia del mundo real](/blog/real-world-performance) en un conjunto de páginas web populares.

![](/_img/background-compilation/desktop.svg)

![](/_img/background-compilation/mobile.svg)

La proporción de compilación que puede ocurrir en un hilo de fondo varía dependiendo de la proporción de bytecode compilado durante la compilación de scripts de transmisión de nivel superior versus ser compilado de manera perezosa cuando se invocan funciones internas (lo que aún debe ocurrir en el hilo principal). Como tal, la proporción de tiempo ahorrado en el hilo principal varía, con la mayoría de las páginas viendo entre un 5% y un 20% de reducción en el tiempo de compilación del hilo principal.

## Próximos pasos

¿Qué es mejor que compilar un script en un hilo de fondo? ¡No tener que compilar el script en absoluto! Junto con la compilación en segundo plano, también hemos estado trabajando en mejorar el [sistema de almacenamiento en caché de código](/blog/code-caching) de V8 para ampliar la cantidad de código almacenado en caché por V8, acelerando así la carga de páginas de sitios que visitas con frecuencia. Esperamos traerte actualizaciones en este frente pronto. ¡Mantente atento!
