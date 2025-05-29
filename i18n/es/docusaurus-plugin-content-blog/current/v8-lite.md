---
title: "Un V8 más ligero"
author: "Mythri Alle, Dan Elphick, y [Ross McIlroy](https://twitter.com/rossmcilroy), observadores del peso de V8"
avatars: 
  - "mythri-alle"
  - "dan-elphick"
  - "ross-mcilroy"
date: "2019-09-12 12:44:37"
tags: 
  - internals
  - memoria
  - presentaciones
description: "El proyecto V8 Lite redujo drásticamente el consumo de memoria de V8 en sitios web típicos, así es cómo lo hicimos."
tweet: "1172155403343298561"
---
A finales de 2018 iniciamos un proyecto llamado V8 Lite, con el objetivo de reducir drásticamente el uso de memoria de V8. Inicialmente, este proyecto fue concebido como un modo *Lite* separado de V8 específicamente orientado a dispositivos móviles con poca memoria o casos de uso en integradores que priorizan el ahorro de memoria sobre la velocidad de ejecución. Sin embargo, en el proceso de este trabajo, nos dimos cuenta de que muchas de las optimizaciones de memoria que habíamos hecho para este *modo Lite* podrían trasladarse al V8 regular, beneficiando a todos sus usuarios.

<!--truncate-->
En esta publicación destacamos algunas de las principales optimizaciones que desarrollamos y los ahorros de memoria que proporcionaron en cargas de trabajo del mundo real.

:::note
**Nota:** Si prefieres ver una presentación en lugar de leer artículos, disfruta del video a continuación. Si no, omite el video y continúa leyendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/56ogP8-eRqA" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=56ogP8-eRqA">“V8 Lite ⁠— reduciendo la memoria de JavaScript”</a> presentado por Ross McIlroy en BlinkOn 10.</figcaption>
</figure>

## Modo Lite

Para optimizar el uso de memoria de V8, primero necesitábamos entender cómo se utiliza la memoria en V8 y qué tipos de objetos contribuyen en gran medida al tamaño del montón de V8. Usamos las herramientas de [visualización de memoria](/blog/optimizing-v8-memory#memory-visualization) de V8 para rastrear la composición del montón en varias páginas web típicas.

<figure>
  <img src="/_img/v8-lite/memory-categorization.svg" width="950" height="440" alt="" loading="lazy"/>
  <figcaption>Porcentaje del montón de V8 utilizado por diferentes tipos de objetos al cargar Times of India.</figcaption>
</figure>

Al hacerlo, determinamos que una parte significativa del montón de V8 estaba dedicada a objetos que no son esenciales para la ejecución de JavaScript, pero que se utilizan para optimizar la ejecución de JavaScript y manejar situaciones excepcionales. Ejemplos incluyen: código optimizado; retroalimentación sobre tipos utilizada para determinar cómo optimizar el código; metadatos redundantes para vinculaciones entre objetos de C++ y JavaScript; metadatos sólo requeridos en circunstancias excepcionales como la simbolización de rastros de pila; y bytecode para funciones que sólo se ejecutan unas pocas veces durante la carga de la página.

Como resultado de esto, comenzamos a trabajar en un *modo Lite* de V8 que intercambia la velocidad de ejecución de JavaScript por ahorros de memoria al reducir drásticamente la asignación de estos objetos opcionales.

![](/_img/v8-lite/v8-lite.png)

Varios de los cambios del *modo Lite* podrían realizarse configurando ajustes existentes de V8, por ejemplo, deshabilitando el compilador optimizador TurboFan de V8. Sin embargo, otros requirieron cambios más profundos en V8.

En particular, decidimos que dado que el *modo Lite* no optimiza el código, podríamos evitar la recopilación de retroalimentación sobre tipos requerida por el compilador optimizador. Al ejecutar código en el intérprete Ignition, V8 recopila retroalimentación sobre los tipos de operandos que se pasan a varias operaciones (por ejemplo, `+` o `o.foo`), para adaptar posteriormente la optimización a esos tipos. Esta información se almacena en *vectores de retroalimentación* que contribuyen de manera significativa al uso de memoria del montón de V8. El *modo Lite* podría evitar la asignación de estos vectores, sin embargo, el intérprete y partes de la infraestructura de caché inline de V8 esperaban que los vectores de retroalimentación estuvieran disponibles, lo que requirió una considerable reestructuración para poder soportar esta ejecución sin retroalimentación.

El *modo Lite* se lanzó en V8 v7.3 y proporciona una reducción del 22% en el tamaño típico del montón de páginas web en comparación con V8 v7.1, deshabilitando la optimización del código, no asignando vectores de retroalimentación y realizando envejecimiento de bytecode que rara vez se ejecuta (descrito a continuación). Este es un buen resultado para aquellas aplicaciones que explícitamente desean intercambiar rendimiento por un mejor uso de memoria. Sin embargo, en el proceso de realizar este trabajo, nos dimos cuenta de que podríamos lograr la mayoría de los ahorros de memoria del *modo Lite* sin afectar el rendimiento haciendo que V8 fuera más perezoso.

## Asignación perezosa de retroalimentación

Desactivar completamente la asignación del vector de retroalimentación no solo impide la optimización del código por parte del compilador TurboFan de V8, sino que también evita que V8 realice [caché in-line](https://mathiasbynens.be/notes/shapes-ics#ics) de operaciones comunes, como la carga de propiedades de objetos en el intérprete Ignition. Por lo tanto, hacerlo causó una regresión significativa en el tiempo de ejecución de V8, aumentando el tiempo de carga de página en un 12% y el tiempo de CPU utilizado por V8 en un 120% en escenarios típicos de páginas web interactivas.

Para llevar la mayoría de estos ahorros a la versión regular de V8 sin estas regresiones, en su lugar adoptamos un enfoque en el que asignamos perezosamente los vectores de retroalimentación después de que la función haya ejecutado una cierta cantidad de código de bytes (actualmente 1KB). Dado que la mayoría de las funciones no se ejecutan con mucha frecuencia, evitamos la asignación de vectores de retroalimentación en la mayoría de los casos, pero los asignamos rápidamente donde sea necesario para evitar regresiones de rendimiento y permitir que el código sea optimizado.

Una complicación adicional con este enfoque está relacionada con el hecho de que los vectores de retroalimentación forman un árbol, con los vectores de retroalimentación de las funciones internas siendo almacenados como entradas en el vector de retroalimentación de su función externa. Esto es necesario para que los cierres de función recién creados reciban el mismo array de vectores de retroalimentación que todos los otros cierres creados para la misma función. Con la asignación perezosa de vectores de retroalimentación no podemos formar este árbol usando vectores de retroalimentación, ya que no hay garantía de que una función externa haya asignado su vector de retroalimentación en el momento en que lo haga una función interna. Para abordar esto, creamos un nuevo `ClosureFeedbackCellArray` para mantener este árbol, y luego intercambiamos el `ClosureFeedbackCellArray` de una función con un `FeedbackVector` completo cuando se vuelva caliente.

![Árboles de vectores de retroalimentación antes y después de la asignación perezosa de retroalimentación.](/_img/v8-lite/lazy-feedback.svg)

Nuestros experimentos de laboratorio y la telemetría en el campo no mostraron regresiones de rendimiento para la retroalimentación perezosa en computadoras de escritorio, y en las plataformas móviles vimos una mejora en el rendimiento en dispositivos de gama baja debido a una reducción en la recolección de basura. Por lo tanto, hemos habilitado la asignación perezosa de retroalimentación en todas las compilaciones de V8, incluido el *modo Lite*, donde la ligera regresión en la memoria en comparación con nuestro enfoque original de no asignar retroalimentación se compensa más que suficientemente con la mejora en el rendimiento del mundo real.

## Posiciones de origen perezosas

Al compilar el bytecode desde JavaScript, se generan tablas de posiciones de origen que vinculan secuencias de bytecode con posiciones de caracteres dentro del código fuente de JavaScript. Sin embargo, esta información solo es necesaria al simbolizar excepciones o al realizar tareas de desarrollo como depuración, y por lo tanto se utiliza rara vez.

Para evitar este desperdicio, ahora compilamos el bytecode sin recopilar posiciones de origen (suponiendo que no haya ningún depurador o perfilador adjunto). Las posiciones de origen solo se recopilan cuando se genera realmente un seguimiento de pila, por ejemplo, al llamar a `Error.stack` o imprimir el seguimiento de la pila de una excepción en la consola. Esto tiene algún costo, ya que generar posiciones de origen requiere que la función sea reanalizada y compilada, pero la mayoría de los sitios web no simbolizan seguimientos de pila en producción y, por lo tanto, no ven ningún impacto de rendimiento observable.

Un problema que tuvimos que abordar con este trabajo fue requerir la generación repetible de bytecode, lo cual no se había garantizado previamente. Si V8 genera un bytecode diferente al recopilar posiciones de origen en comparación con el código original, las posiciones de origen no coinciden y los seguimientos de pila podrían apuntar a la posición incorrecta en el código fuente.

En ciertas circunstancias, V8 podría generar un bytecode diferente dependiendo de si una función fue [compilada ansiosa o perezosamente](/blog/preparser#skipping-inner-functions), debido a que se perdió información del analizador entre el análisis inicial ansioso de una función y la compilación perezosa posterior. Estas discrepancias eran en su mayoría benignas, por ejemplo, perder de vista que una variable es inmutable y, por lo tanto, no poder optimizarla como tal. Sin embargo, algunas de las discrepancias descubiertas por este trabajo tenían el potencial de causar una ejecución incorrecta del código en ciertas circunstancias. Como resultado, corregimos estas discrepancias y agregamos verificaciones y un modo de estrés para garantizar que la compilación ansiosa y perezosa de una función siempre produzca resultados consistentes, lo que nos brinda mayor confianza en la corrección y consistencia del analizador y preanalizador de V8.

## Depuración del bytecode

El bytecode compilado a partir del código fuente de JavaScript ocupa una parte significativa del espacio de montículo de V8, típicamente alrededor del 15%, incluyendo metadatos relacionados. Hay muchas funciones que solo se ejecutan durante la inicialización o que se usan raramente después de haber sido compiladas.

Como resultado, agregamos soporte para vaciar el bytecode compilado de funciones durante la recolección de basura si no se han ejecutado recientemente. Para hacer esto, hacemos un seguimiento de la *edad* del bytecode de una función, incrementando la *edad* en cada recolección de basura [mayor (marca-compacta)](/blog/trash-talk#major-gc), y reiniciándola a cero cuando se ejecuta la función. Cualquier bytecode que cruce un umbral de envejecimiento es elegible para ser recolectado en la próxima recolección de basura. Si es recolectado y posteriormente se vuelve a ejecutar, se recompila.

Hubo desafíos técnicos para garantizar que el código de bytes solo se vacíe cuando ya no sea necesario. Por ejemplo, si la función `A` llama a otra función de larga duración `B`, la función `A` podría envejecerse mientras todavía está en la pila. No queremos vaciar el código de bytes de la función `A`, incluso si alcanza su límite de envejecimiento, porque necesitamos volver a ella cuando la función de larga duración `B` vuelva. Por lo tanto, tratamos el código de bytes como débilmente retenido por una función cuando alcanza su umbral de envejecimiento, pero fuertemente retenido por cualquier referencia en la pila o en otro lugar. Solo vaciamos el código cuando no quedan enlaces fuertes.

Además de vaciar el código de bytes, también vaciamos los vectores de retroalimentación asociados con estas funciones vaciadas. Sin embargo, no podemos vaciar los vectores de retroalimentación durante el mismo ciclo de GC que el código de bytes porque no son retenidos por el mismo objeto: el código de bytes está retenido por un `SharedFunctionInfo` independiente del contexto nativo, mientras que el vector de retroalimentación está retenido por el `JSFunction` dependiente del contexto nativo. Como resultado, vaciamos los vectores de retroalimentación en el ciclo de GC subsiguiente.

![El diseño del objeto para una función envejecida después de dos ciclos de GC.](/_img/v8-lite/bytecode-flushing.svg)

## Optimizaciones adicionales

Además de estos proyectos más grandes, también descubrimos y abordamos un par de ineficiencias.

La primera fue reducir el tamaño de los objetos `FunctionTemplateInfo`. Estos objetos almacenan metadatos internos sobre [`FunctionTemplate`s](/docs/embed#templates), que se utilizan para permitir que los integradores, como Chrome, proporcionen implementaciones de funciones de devolución de llamada en C++ que pueden ser llamadas por código JavaScript. Chrome introduce muchas FunctionTemplates para implementar las APIs Web de DOM, y por lo tanto, los objetos `FunctionTemplateInfo` contribuían al tamaño del montón de V8. Después de analizar el uso típico de FunctionTemplates, encontramos que de los once campos en un objeto `FunctionTemplateInfo`, solo tres normalmente se establecían en un valor diferente al predeterminado. Por lo tanto, dividimos el objeto `FunctionTemplateInfo` de manera que los campos raros se almacenen en una tabla auxiliar que solo se asigna bajo demanda si es necesario.

La segunda optimización está relacionada con cómo desoptimizamos el código optimizado de TurboFan. Dado que TurboFan realiza optimizaciones especulativas, podría necesitar volver al intérprete (desoptimizar) si ciertas condiciones ya no se cumplen. Cada punto de desoptimización tiene un ID que permite al entorno determinar dónde en el código de bytes se debe devolver la ejecución al intérprete. Anteriormente, este ID se calculaba haciendo que el código optimizado saltara a un desplazamiento particular dentro de una gran tabla de saltos, lo que cargaba el ID correcto en un registro y luego saltaba al entorno para realizar la desoptimización. Esto tenía la ventaja de requerir solo una instrucción de salto única en el código optimizado para cada punto de desoptimización. Sin embargo, la tabla de saltos de desoptimización estaba preasignada y tenía que ser lo suficientemente grande como para soportar todo el rango de IDs de desoptimización. En su lugar, modificamos TurboFan de manera que los puntos de desoptimización en el código optimizado carguen directamente el ID de desoptimización antes de llamar al entorno. Esto nos permitió eliminar completamente esta gran tabla de saltos, a costa de un ligero aumento en el tamaño del código optimizado.

## Resultados

Hemos lanzado las optimizaciones descritas anteriormente durante las últimas siete versiones de V8. Típicamente aterrizaron primero en *modo Lite*, y luego se llevaron a la configuración predeterminada de V8.

![Tamaño promedio del montón de V8 para un conjunto de páginas web típicas en un dispositivo AndroidGo.](/_img/v8-lite/savings-by-release.svg)

![Desglose por página de los ahorros de memoria de V8 v7.8 (Chrome 78) en comparación con v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-page.svg)

Durante este tiempo, hemos reducido el tamaño del montón de V8 en un promedio del 18% en una gama de sitios web típicos, lo que corresponde a una disminución promedio de 1.5 MB para dispositivos móviles AndroidGo de gama baja. Esto ha sido posible sin ningún impacto significativo en el rendimiento de JavaScript, ni en los benchmarks ni medido en interacciones reales de páginas web.

El *modo Lite* puede proporcionar mayores ahorros de memoria, a costa de la velocidad de ejecución de JavaScript, al desactivar la optimización de funciones. En promedio, el *modo Lite* proporciona un ahorro de memoria del 22%, con algunas páginas viendo hasta una reducción del 32%. Esto corresponde a una reducción de 1.8 MB en el tamaño del montón de V8 en un dispositivo AndroidGo.

![Desglose de los ahorros de memoria de V8 v7.8 (Chrome 78) en comparación con v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-optimization.svg)

Cuando se divide por el impacto de cada optimización individual, está claro que diferentes páginas derivan una proporción diferente de su beneficio de cada una de estas optimizaciones. En el futuro, continuaremos identificando posibles optimizaciones que puedan reducir aún más el uso de memoria de V8 mientras se mantiene una ejecución de JavaScript increíblemente rápida.
