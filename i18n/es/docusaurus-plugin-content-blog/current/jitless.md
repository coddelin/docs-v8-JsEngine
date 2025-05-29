---
title: 'V8 sin JIT'
author: 'Jakob Gruber ([@schuay](https://twitter.com/schuay))'
avatars:
  - 'jakob-gruber'
date: 2019-03-13 13:03:19
tags:
  - internals
description: 'V8 v7.4 admite la ejecución de JavaScript sin asignar memoria ejecutable en tiempo de ejecución.'
tweet: '1105777150051999744'
---
V8 v7.4 ahora admite la ejecución de JavaScript sin asignar memoria ejecutable en tiempo de ejecución.

En su configuración predeterminada, V8 depende en gran medida de la capacidad de asignar y modificar memoria ejecutable en tiempo de ejecución. Por ejemplo, el [compilador optimizador TurboFan](/blog/turbofan-jit) crea código nativo para funciones de JavaScript (JS) calientes justo a tiempo, y la mayoría de las expresiones regulares de JS se compilan a código nativo por el [motor irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html). Crear memoria ejecutable en tiempo de ejecución es parte de lo que hace que V8 sea rápido.

<!--truncate-->
Pero en algunas situaciones puede ser deseable ejecutar V8 sin asignar memoria ejecutable:

1. Algunas plataformas (por ejemplo, iOS, televisores inteligentes, consolas de videojuegos) prohíben el acceso de escritura a memoria ejecutable para aplicaciones no privilegiadas, y ha sido imposible usar V8 allí hasta ahora; y
1. prohibir escrituras en memoria ejecutable reduce la superficie de ataque de la aplicación para los exploits.

El nuevo modo sin JIT de V8 está diseñado para abordar estos puntos. Cuando V8 se inicia con el flag `--jitless`, V8 opera sin ninguna asignación de memoria ejecutable en tiempo de ejecución.

¿Cómo funciona? Esencialmente, V8 cambia a un modo solo intérprete basado en nuestra tecnología existente: todo el código de usuario JS se ejecuta a través del [intérprete Ignition](/blog/ignition-interpreter), y la coincidencia de patrones de expresiones regulares también se interpreta. WebAssembly actualmente no es compatible, pero la interpretación también está dentro del ámbito de posibilidad. Los componentes integrados de V8 siguen estando compilados en código nativo, pero ya no forman parte del heap administrado de JS, gracias a nuestros esfuerzos recientes para [incluirlos dentro del binario V8](/blog/embedded-builtins).

En última instancia, estos cambios nos permitieron crear el heap de V8 sin requerir permisos ejecutables para ninguna de sus regiones de memoria.

## Resultados

Dado que el modo sin JIT desactiva el compilador optimizador, viene con una penalización en el rendimiento. Observamos una variedad de benchmarks para comprender mejor cómo cambian las características de rendimiento de V8. [Speedometer 2.0](/blog/speedometer-2) está diseñado para representar una aplicación web típica; el [Web Tooling Benchmark](/blog/web-tooling-benchmark) incluye un conjunto de herramientas comunes para desarrolladores de JS; y también incluimos un benchmark que simula un [flujo de navegación en la aplicación YouTube para sala de estar](https://chromeperf.appspot.com/report?sid=518c637ffa0961f965afe51d06979375467b12b87e72061598763e5a36876306). Todas las mediciones se realizaron localmente en un escritorio Linux x64 durante 5 ejecuciones.

![Sin JIT vs V8 predeterminado. Las puntuaciones están normalizadas a 100 para la configuración predeterminada de V8.](/_img/jitless/benchmarks.svg)

Speedometer 2.0 es aproximadamente un 40% más lento en el modo sin JIT. Aproximadamente la mitad del retroceso se puede atribuir al compilador optimizador desactivado. La otra mitad es causada por el intérprete de expresiones regulares, que originalmente fue diseñado como una ayuda para depuración y verá mejoras de rendimiento en el futuro.

El Web Tooling Benchmark tiende a pasar más tiempo en código optimizado por TurboFan y, por lo tanto, muestra una regresión mayor del 80% cuando el modo sin JIT está habilitado.

Finalmente, medimos una sesión de navegación simulada en la aplicación YouTube para sala de estar que incluye reproducción de video y navegación por menús. Aquí, el modo sin JIT está aproximadamente a la par y solo muestra una ralentización del 6% en la ejecución de JS en comparación con una configuración estándar de V8. Este benchmark demuestra cómo el rendimiento máximo del código optimizado no siempre está correlacionado con el [rendimiento en el mundo real](/blog/real-world-performance), y en muchas situaciones los integradores pueden mantener un rendimiento razonable incluso en modo sin JIT.

El consumo de memoria solo cambió ligeramente, con una mediana del 1.7% de disminución del tamaño del heap de V8 al cargar un conjunto representativo de sitios web.

Animamos a los integradores en plataformas restringidas o con requisitos especiales de seguridad a considerar el nuevo modo sin JIT de V8, disponible ahora en V8 v7.4. Como siempre, las preguntas y comentarios son bienvenidos en el grupo de discusión [v8-users](https://groups.google.com/forum/#!forum/v8-users).

## Preguntas Frecuentes

*¿Cuál es la diferencia entre `--jitless` y `--no-opt`?*

`--no-opt` desactiva el compilador optimizador TurboFan. `--jitless` desactiva toda la asignación de memoria ejecutable en tiempo de ejecución.
