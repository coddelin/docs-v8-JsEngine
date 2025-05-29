---
title: 'Profundizando en el JIT TurboFan'
author: 'Ben L. Titzer, Ingeniero de Software y Mecánico de TurboFan'
avatars:
  - 'ben-titzer'
date: 2015-07-13 13:33:37
tags:
  - internos
description: 'Un análisis detallado del diseño del nuevo compilador optimizador TurboFan de V8.'
---
[La semana pasada anunciamos](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html) que hemos activado TurboFan para ciertos tipos de JavaScript. En esta publicación queríamos profundizar en el diseño de TurboFan.

<!--truncate-->
El rendimiento siempre ha sido el núcleo de la estrategia de V8. TurboFan combina una representación intermedia de vanguardia con una canalización de traducción y optimización en múltiples capas para generar un código de máquina de mejor calidad que el que era posible anteriormente con el JIT CrankShaft. Las optimizaciones en TurboFan son más numerosas, más sofisticadas y se aplican más exhaustivamente que en CrankShaft, permitiendo un movimiento de código fluido, optimizaciones del flujo de control y un análisis preciso de rangos numéricos, todo lo cual antes era inalcanzable.

## Una arquitectura en capas

Con el tiempo, los compiladores tienden a volverse complejos a medida que se admiten nuevas características del lenguaje, se agregan nuevas optimizaciones y se direccionan nuevas arquitecturas de computadora. Con TurboFan, hemos tomado lecciones de muchos compiladores y desarrollado una arquitectura en capas para permitir que el compilador haga frente a estas demandas a lo largo del tiempo. Una separación más clara entre el lenguaje a nivel de origen (JavaScript), las capacidades de la VM (V8) y las complejidades de la arquitectura (desde x86 hasta ARM o MIPS) permite un código más limpio y robusto. La segmentación en capas permite a quienes trabajan en el compilador razonar localmente al implementar optimizaciones y características, así como escribir pruebas unitarias más eficaces. También ahorra código. Cada una de las 7 arquitecturas objetivo admitidas por TurboFan requiere menos de 3,000 líneas de código específico de la plataforma, frente a los 13,000-16,000 en CrankShaft. Esto permitió que ingenieros de ARM, Intel, MIPS e IBM contribuyeran a TurboFan de una manera mucho más efectiva. TurboFan puede admitir más fácilmente todas las características venideras de ES6 porque su diseño flexible separa el frontend de JavaScript de los backends dependientes de la arquitectura.

## Optimizaciones más sofisticadas

El JIT TurboFan implementa optimizaciones más agresivas que CrankShaft mediante una serie de técnicas avanzadas. JavaScript ingresa a la canalización del compilador en una forma mayormente no optimizada y se traduce y optimiza a formas progresivamente más bajas hasta que se genera el código de máquina. La pieza central del diseño es una representación interna (IR) más relajada en forma de un ‘mar de nodos’, que permite un reordenamiento y una optimización más efectivos.

![Gráfico de ejemplo de TurboFan](/_img/turbofan-jit/example-graph.png)

El análisis de rango numérico ayuda a TurboFan a comprender mucho mejor el código de cálculo numérico. La IR basada en gráficos permite que la mayoría de las optimizaciones se expresen como reducciones locales simples que son más fáciles de escribir y probar de manera independiente. Un motor de optimización aplica estas reglas locales de manera sistemática y exhaustiva. La transición fuera de la representación gráfica implica un algoritmo de programación innovador que utiliza la libertad de reordenamiento para mover el código fuera de los bucles y hacia rutas ejecutadas con menor frecuencia. Finalmente, optimizaciones específicas de la arquitectura, como la selección de instrucciones complejas, explotan las características de cada plataforma objetivo para obtener el código de mejor calidad.

## Entregando un nuevo nivel de rendimiento

Ya estamos [observando algunas mejoras de velocidad increíbles](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html) con TurboFan, pero todavía hay mucho trabajo por hacer. ¡Mantente atento mientras activamos más optimizaciones y habilitamos TurboFan para más tipos de código!
