---
title: '¡Chrome da la bienvenida a Speedometer 2.0!'
author: 'los equipos de Blink y V8'
date: 2018-01-24 13:33:37
tags:
  - benchmarks
description: 'Un resumen de las mejoras de rendimiento que hemos realizado hasta ahora en Blink y V8 basándonos en Speedometer 2.0.'
tweet: '956232641736421377'
---
Desde el lanzamiento inicial de Speedometer 1.0 en 2014, los equipos de Blink y V8 han utilizado este benchmark como un proxy para el uso real de frameworks populares de JavaScript y hemos logrado aceleraciones considerablemente en este benchmark. Verificamos de manera independiente que estas mejoras se traducen en beneficios reales para los usuarios al medir contra sitios web reales y observar que las mejoras en los tiempos de carga de páginas de sitios web populares también mejoraron la puntuación de Speedometer.

<!--truncate-->
Mientras tanto, JavaScript ha evolucionado rápidamente, añadiendo muchas características nuevas con los estándares ES2015 y posteriores. Lo mismo ocurre con los frameworks en sí, y como tal, Speedometer 1.0 se ha vuelto obsoleto con el tiempo. Por lo tanto, usar Speedometer 1.0 como un indicador de optimización aumenta el riesgo de no medir patrones de código más nuevos que se están utilizando activamente.

Los equipos de Blink y V8 dan la bienvenida a [el reciente lanzamiento del benchmark actualizado Speedometer 2.0](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/). Aplicar el concepto original a una lista de frameworks contemporáneos, transpiladores y características de ES2015 hace que el benchmark sea de nuevo un excelente candidato para las optimizaciones. Speedometer 2.0 es una gran adición a [nuestra herramienta de benchmarking de rendimiento del mundo real](/blog/real-world-performance).

## El recorrido de Chrome hasta ahora

Los equipos de Blink y V8 ya han completado una primera ronda de mejoras, subrayando la importancia de este benchmark para nosotros y continuando nuestro viaje enfocado en el rendimiento en el mundo real. Comparando Chrome 60 de julio de 2017 con el último Chrome 64, hemos logrado aproximadamente un 21% de mejora en la puntuación total (ejecuciones por minuto) en un MacBook Pro de mediados de 2016 (4 núcleos, 16GB de RAM).

![Comparación de las puntuaciones de Speedometer 2 entre Chrome 60 y 64](/_img/speedometer-2/scores.png)

Vamos a analizar las líneas individuales de Speedometer 2.0. Duplicamos el rendimiento del runtime de React mejorando [`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18). Vanilla-ES2015, AngularJS, Preact y VueJS mejoraron entre un 19% y un 42% debido a [la aceleración del análisis de JSON](https://chromium-review.googlesource.com/c/v8/v8/+/700494) y otras correcciones de rendimiento. El tiempo de ejecución de la aplicación jQuery-TodoMVC se redujo mediante mejoras en la implementación DOM de Blink, incluyendo [controles de formulario más ligeros](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd) y [ajustes en nuestro analizador HTML](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef). Ajustes adicionales en las cachés en línea de V8 junto con el compilador optimizador generaron mejoras generales.

![Mejoras en las puntuaciones de cada subprueba de Speedometer 2 de Chrome 60 a 64](/_img/speedometer-2/improvements.png)

Un cambio significativo con respecto a Speedometer 1.0 es el cálculo de la puntuación final. Anteriormente, el promedio de todas las puntuaciones favorecía trabajar solo en las líneas más lentas. Cuando observamos los tiempos absolutos dedicados a cada línea, vemos por ejemplo que la versión EmberJS-Debug toma aproximadamente 35 veces más tiempo que el benchmark más rápido. Por lo tanto, para mejorar la puntuación general, centrarse en EmberJS-Debug tiene el mayor potencial.

![](/_img/speedometer-2/time.png)

Speedometer 2.0 utiliza la media geométrica para la puntuación final, favoreciendo inversiones iguales en cada framework. Consideremos nuestra reciente mejora del 16.5% de Preact mencionada antes. Sería bastante injusto renunciar a la mejora del 16.5% solo por su menor contribución al tiempo total.

Esperamos seguir trayendo mejoras de rendimiento a Speedometer 2.0 y, a través de ello, a toda la web. Manténganse atentos para más éxitos de rendimiento.
