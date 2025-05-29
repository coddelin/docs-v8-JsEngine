---
title: 'Cómo mide V8 el rendimiento en el mundo real'
author: 'el equipo de V8'
date: 2016-12-21 13:33:37
tags:
  - benchmarks
description: 'El equipo de V8 ha desarrollado una nueva metodología para medir y entender el rendimiento del JavaScript en el mundo real.'
---
Durante el último año, el equipo de V8 ha desarrollado una nueva metodología para medir y entender el rendimiento del JavaScript en el mundo real. Hemos utilizado los conocimientos obtenidos de esto para cambiar la forma en que el equipo de V8 hace más rápido el JavaScript. Nuestro nuevo enfoque en el mundo real representa un cambio significativo con respecto a nuestro enfoque tradicional en el rendimiento. Estamos seguros de que, a medida que sigamos aplicando esta metodología en 2017, mejorará significativamente la capacidad de usuarios y desarrolladores para confiar en un rendimiento predecible de V8 para JavaScript en el mundo real, tanto en Chrome como en Node.js.

<!--truncate-->
El viejo dicho “lo que se mide, mejora” es particularmente cierto en el mundo del desarrollo de máquinas virtuales (VM) de JavaScript. Elegir las métricas correctas para guiar la optimización de rendimiento es una de las cosas más importantes que un equipo de VM puede hacer a lo largo del tiempo. La siguiente línea de tiempo ilustra aproximadamente cómo ha evolucionado la evaluación comparativa de JavaScript desde el lanzamiento inicial de V8:

![Evolución de los benchmarks de JavaScript](/_img/real-world-performance/evolution.png)

Históricamente, V8 y otros motores de JavaScript han medido el rendimiento utilizando pruebas sintéticas. Inicialmente, los desarrolladores de VM usaron microbenchmarks como [SunSpider](https://webkit.org/perf/sunspider/sunspider.html) y [Kraken](http://krakenbenchmark.mozilla.org/). A medida que el mercado de navegadores maduró, comenzó una segunda era de evaluación comparativa, durante la cual se utilizaron conjuntos de pruebas más grandes pero, no obstante, sintéticos, como [Octane](http://chromium.github.io/octane/) y [JetStream](http://browserbench.org/JetStream/).

Los microbenchmarks y los conjuntos de pruebas estáticos tienen algunos beneficios: son fáciles de iniciar, simples de entender y capaces de ejecutarse en cualquier navegador, lo que facilita el análisis comparativo. Pero esta conveniencia viene con una serie de desventajas. Debido a que incluyen un número limitado de casos de prueba, es difícil diseñar benchmarks que reflejen con precisión las características de la web en general. Además, los benchmarks generalmente se actualizan con poca frecuencia; por lo tanto, tienden a tener dificultades para seguir el ritmo de las nuevas tendencias y patrones de desarrollo de JavaScript en la práctica. Por último, con el tiempo, los autores de VM exploraron todos los rincones de los benchmarks tradicionales y, en el proceso, descubrieron y aprovecharon oportunidades para mejorar las puntuaciones de los benchmarks reorganizando o incluso omitiendo trabajo externamente no observable durante la ejecución del benchmark. Este tipo de mejora impulsada por las puntuaciones de benchmarks y la sobreoptimización para benchmarks no siempre proporciona mucho beneficio tangible para los usuarios o desarrolladores, y la historia ha demostrado que, a largo plazo, es muy difícil crear un benchmark sintético que no pueda ser “manipulado”.

## Medición de sitios web reales: WebPageReplay y Runtime Call Stats

Con la intuición de que solo estábamos viendo una parte de la historia del rendimiento con los benchmarks estáticos tradicionales, el equipo de V8 se propuso medir el rendimiento en el mundo real evaluando la carga de sitios web reales. Queríamos medir casos de uso que reflejaran cómo los usuarios finales realmente navegaban por la web, así que decidimos derivar métricas de rendimiento de sitios web como Twitter, Facebook y Google Maps. Usando una parte de la infraestructura de Chrome llamada [WebPageReplay](https://github.com/chromium/web-page-replay), pudimos grabar y reproducir cargas de páginas de manera determinista.

Paralelamente, desarrollamos una herramienta llamada Runtime Call Stats que nos permitió perfilar cómo diferentes códigos JavaScript estresaban diferentes componentes de V8. Por primera vez, tuvimos la capacidad no solo de probar fácilmente los cambios en V8 contra sitios web reales, sino de comprender completamente cómo y por qué V8 se comportaba de manera diferente bajo distintas cargas de trabajo.

Ahora monitoreamos cambios contra un conjunto de aproximadamente 25 sitios web para guiar la optimización de V8. Además de los sitios mencionados y otros del Top 100 de Alexa, seleccionamos sitios implementados con frameworks comunes (React, Polymer, Angular, Ember, y más), sitios de una variedad de ubicaciones geográficas, y sitios o bibliotecas cuyos equipos de desarrollo han colaborado con nosotros, como Wikipedia, Reddit, Twitter y Webpack. Creemos que estos 25 sitios son representativos de la web en general y que las mejoras de rendimiento en estos sitios se reflejarán directamente en mejoras similares para los sitios que los desarrolladores de JavaScript están escribiendo hoy.

Para una presentación en profundidad sobre el desarrollo de nuestro conjunto de pruebas de sitios web y Runtime Call Stats, vea la [presentación BlinkOn 6 sobre el rendimiento en el mundo real](https://www.youtube.com/watch?v=xCx4uC7mn6Y). Incluso puede [ejecutar usted mismo la herramienta Runtime Call Stats](/docs/rcs).

## Haciendo una diferencia real

Analizar estos nuevos méritos de rendimiento en el mundo real y compararlos con los estándares tradicionales utilizando las estadísticas de llamadas en tiempo de ejecución nos ha dado más información sobre cómo diferentes cargas de trabajo afectan a V8 de diversas maneras.

A partir de estas mediciones, descubrimos que el rendimiento de Octane era en realidad un pobre indicador para el rendimiento de la mayoría de los 25 sitios web que probamos. Puedes verlo en la gráfica a continuación: la distribución de la barra de colores de Octane es muy diferente a cualquier otra carga de trabajo, especialmente aquellas de los sitios web del mundo real. Al ejecutar Octane, el cuello de botella de V8 suele ser la ejecución del código JavaScript. Sin embargo, la mayoría de los sitios web del mundo real, en cambio, ponen a prueba el analizador y el compilador de V8. Nos dimos cuenta de que las optimizaciones realizadas para Octane a menudo carecían de impacto en las páginas web reales, y en algunos casos estas [optimizaciones hacían que los sitios web del mundo real fueran más lentos](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#a-closer-look-at-octane).

![Distribución del tiempo de ejecución de todo Octane, ejecutando los elementos de lista de Speedometer y cargando sitios web de nuestro conjunto de pruebas en Chrome 57](/_img/real-world-performance/startup-distribution.png)

También descubrimos que otro estándar en realidad era un mejor indicador para los sitios web reales. [Speedometer](http://browserbench.org/Speedometer/), un estándar de WebKit que incluye aplicaciones escritas en React, Angular, Ember y otros marcos, mostró un perfil de tiempo de ejecución muy similar al de los 25 sitios probados. Aunque ningún estándar iguala la fidelidad de las páginas web reales, creemos que Speedometer hace un mejor trabajo aproximando las cargas de trabajo del mundo real del JavaScript moderno en la web que Octane.

## En resumen: un V8 más rápido para todos

A lo largo del año pasado, el conjunto de pruebas de sitios web del mundo real y nuestra herramienta de estadísticas de llamadas en tiempo de ejecución nos han permitido entregar optimizaciones de rendimiento de V8 que aceleran la carga de páginas en promedio entre un 10 y un 20%. Dado el histórico enfoque en la optimización de la carga de páginas en Chrome, una mejora de dos dígitos en esta métrica en 2016 es un logro significativo. Las mismas optimizaciones también mejoraron nuestra puntuación en Speedometer entre un 20 y un 30%.

Estas mejoras de rendimiento deberían reflejarse en otros sitios creados por desarrolladores web utilizando marcos modernos y patrones similares de JavaScript. Nuestras mejoras en funciones integradas como `Object.create` y [`Function.prototype.bind`](https://benediktmeurer.de/2015/12/25/a-new-approach-to-function-prototype-bind/), optimizaciones alrededor del patrón de fábrica de objetos, trabajo en las [cachés en línea](https://en.wikipedia.org/wiki/Inline_caching) de V8, y mejoras continuas en el analizador están destinadas a ser mejoras aplicables en general a áreas subestimadas de JavaScript utilizadas por todos los desarrolladores, no solo los sitios representativos que monitoreamos.

Planeamos expandir nuestro uso de sitios web reales para guiar el trabajo de rendimiento de V8. Mantente atento para más información sobre estándares y rendimiento de scripts.
