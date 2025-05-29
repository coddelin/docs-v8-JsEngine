---
title: 'Lanzamiento de Ignition y TurboFan'
author: 'el equipo de V8'
date: 2017-05-15 13:33:37
tags:
  - internos
description: 'V8 v5.9 viene con una nueva tubería de ejecución de JavaScript, basada en el intérprete Ignition y el compilador optimizador TurboFan.'
---
Hoy estamos emocionados de anunciar el lanzamiento de una nueva tubería de ejecución de JavaScript para V8 v5.9 que llegará a Chrome Stable en la versión 59. Con la nueva tubería, logramos grandes mejoras de rendimiento y significativos ahorros de memoria en aplicaciones de JavaScript del mundo real. Discutiremos los números en detalle al final de este artículo, pero primero echemos un vistazo a la propia tubería.

<!--truncate-->
La nueva tubería está construida sobre [Ignition](/docs/ignition), el intérprete de V8, y [TurboFan](/docs/turbofan), el más reciente compilador optimizador de V8. Estas tecnologías [deberían](/blog/turbofan-jit) [ser](/blog/ignition-interpreter) [familiares](/blog/test-the-future) para aquellos de ustedes que han seguido el blog de V8 en los últimos años, pero el cambio a la nueva tubería marca un gran hito para ambos.

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logotipo de Ignition, el nuevo intérprete de V8</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logotipo de TurboFan, el nuevo compilador optimizador de V8</figcaption>
</figure>

Por primera vez, Ignition y TurboFan se utilizan universal y exclusivamente para la ejecución de JavaScript en V8 v5.9. Además, a partir de la versión v5.9, Full-codegen y Crankshaft, las tecnologías que [sirvieron bien a V8 desde 2010](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), ya no se utilizan en V8 para la ejecución de JavaScript, ya que no pueden mantener el ritmo con las nuevas características del lenguaje JavaScript y las optimizaciones que esas características requieren. Planeamos eliminarlas por completo muy pronto. Eso significa que V8 tendrá una arquitectura mucho más sencilla y fácil de mantener en el futuro.

## Un largo viaje

La tubería combinada de Ignition y TurboFan ha estado en desarrollo durante casi 3½ años. Representa la culminación del conocimiento colectivo que el equipo de V8 ha obtenido al medir el rendimiento de JavaScript en el mundo real y considerar cuidadosamente las deficiencias de Full-codegen y Crankshaft. Es una base con la que podremos continuar optimizando la totalidad del lenguaje JavaScript en los años venideros.

El proyecto TurboFan se inició originalmente a finales de 2013 para abordar las deficiencias de Crankshaft. Crankshaft solo puede optimizar un subconjunto del lenguaje JavaScript. Por ejemplo, no fue diseñado para optimizar código JavaScript que utilice manejo de excepciones estructurado, es decir, bloques de código delimitados por las palabras clave try, catch y finally de JavaScript. Es difícil agregar soporte para nuevas características del lenguaje en Crankshaft, ya que estas casi siempre requieren escribir código específico para nueve plataformas compatibles. Además, la arquitectura de Crankshaft está limitada a la hora de generar código máquina óptimo. Solo puede exprimir cierto nivel de rendimiento de JavaScript, a pesar de requerir que el equipo de V8 mantenga más de diez mil líneas de código por arquitectura de chip.

TurboFan fue diseñado desde el principio no solo para optimizar todas las características del lenguaje encontradas en el estándar de JavaScript en ese momento, ES5, sino también todas las características futuras planeadas para ES2015 y más allá. Introduce un diseño de compilador en capas que permite una separación clara entre las optimizaciones de compilador de alto nivel y bajo nivel, haciendo más fácil agregar nuevas características del lenguaje sin modificar el código específico de la arquitectura. TurboFan agrega una fase explícita de selección de instrucciones en la compilación que hace posible escribir mucho menos código específico de arquitectura para cada plataforma compatible desde el principio. Con esta nueva fase, el código específico de arquitectura se escribe una vez y rara vez necesita cambiarse. Estas y otras decisiones conducen a un compilador optimizador más mantenible y extensible para todas las arquitecturas que V8 admite.

La motivación original detrás del intérprete Ignition de V8 fue reducir el consumo de memoria en dispositivos móviles. Antes de Ignition, el código generado por el compilador base Full-codegen de V8 típicamente ocupaba casi un tercio del montón total de JavaScript en Chrome. Eso dejaba menos espacio para los datos reales de una aplicación web. Cuando Ignition se habilitó en Chrome M53 en dispositivos Android con RAM limitada, la huella de memoria requerida para el código JavaScript base, no optimizado, se redujo en un factor de nueve en dispositivos móviles basados en ARM64.

Más tarde, el equipo de V8 aprovechó el hecho de que el bytecode de Ignition se puede usar para generar código máquina optimizado directamente con TurboFan, en lugar de tener que volver a compilar desde el código fuente como lo hacía Crankshaft. El bytecode de Ignition proporciona un modelo de ejecución base más limpio y menos propenso a errores en V8, simplificando el mecanismo de desoptimización, que es una característica clave de la [optimización adaptativa](https://es.wikipedia.org/wiki/Optimización_adaptativa) de V8. Finalmente, dado que generar bytecode es más rápido que generar código base compilado con Full-codegen, activar Ignition generalmente mejora los tiempos de inicio de los scripts y, a su vez, la carga de páginas web.

Al acoplar estrechamente el diseño de Ignition y TurboFan, hay aún más beneficios para la arquitectura general. Por ejemplo, en lugar de escribir los manejadores de bytecode de alto rendimiento de Ignition en ensamblador codificado a mano, el equipo de V8 utiliza la [representación intermedia](https://es.wikipedia.org/wiki/Representación_intermedia) de TurboFan para expresar la funcionalidad de los manejadores y permite que TurboFan haga la optimización y generación de código final para las numerosas plataformas que soporta V8. Esto asegura que Ignition funcione bien en todas las arquitecturas de chip compatibles con V8 mientras simultáneamente elimina la carga de mantener nueve puertos de plataforma separados.

## Analizando los números

Dejando de lado la historia, ahora echemos un vistazo al rendimiento en el mundo real y al consumo de memoria del nuevo flujo de procesamiento.

El equipo de V8 monitorea continuamente el rendimiento de casos de uso del mundo real utilizando el marco [Telemetry - Catapult](https://catapult.gsrc.io/telemetry). [Anteriormente](/blog/real-world-performance) en este blog hemos discutido por qué es tan importante usar datos de pruebas del mundo real para guiar nuestro trabajo de optimización del rendimiento y cómo usamos [WebPageReplay](https://github.com/chromium/web-page-replay) junto con Telemetry para hacerlo. El cambio a Ignition y TurboFan muestra mejoras de rendimiento en esos casos de prueba del mundo real. Específicamente, el nuevo flujo de procesamiento resulta en aceleraciones significativas en las pruebas de interacción del usuario para sitios web bien conocidos:

![Reducción del tiempo empleado en V8 para benchmarks de interacción del usuario](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

Aunque Speedometer es un benchmark sintético, anteriormente hemos descubierto que hace un mejor trabajo aproximando las cargas de trabajo del mundo real de JavaScript moderno que otros benchmarks sintéticos. El cambio a Ignition y TurboFan mejora la puntuación de Speedometer de V8 en un 5%-10%, dependiendo de la plataforma y el dispositivo.

El nuevo flujo de procesamiento también acelera JavaScript del lado del servidor. [AcmeAir](https://github.com/acmeair/acmeair-nodejs), un benchmark para Node.js que simula la implementación de backend de servidor de una aerolínea ficticia, se ejecuta más de un 10% más rápido usando V8 v5.9.

![Mejoras en benchmarks de Web y Node.js](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

Ignition y TurboFan también reducen el uso general de memoria de V8. En Chrome M59, el nuevo flujo de procesamiento reduce el consumo de memoria de V8 en dispositivos de escritorio y móviles de alta gama en un 5%-10%. Esta reducción es el resultado de llevar los ahorros de memoria de Ignition que se han [cubierto anteriormente](/blog/ignition-interpreter) en este blog a todos los dispositivos y plataformas compatibles con V8.

Estas mejoras son solo el comienzo. El nuevo flujo de procesamiento de Ignition y TurboFan allana el camino para futuras optimizaciones que mejorarán el rendimiento de JavaScript y reducirán el espacio de memoria de V8 tanto en Chrome como en Node.js durante los próximos años. Esperamos compartir esas mejoras contigo a medida que las implementamos para desarrolladores y usuarios. Mantente atento.
