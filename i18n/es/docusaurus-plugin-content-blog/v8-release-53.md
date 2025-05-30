---
title: "Lanzamiento de V8 v5.3"
author: "el equipo de V8"
date: "2016-07-18 13:33:37"
tags: 
  - lanzamiento
description: "V8 v5.3 incluye mejoras de rendimiento y un menor consumo de memoria."
---
Aproximadamente cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se toma de la rama principal de Git de V8 inmediatamente antes de que Chrome cree una rama para un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [la versión 5.3 de V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.3), que estará en beta hasta que se lance en coordinación con Chrome 53 Stable. V8 v5.3 está llena de todo tipo de novedades para desarrolladores, por lo que nos gustaría ofrecerte un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento en varias semanas.

<!--truncate-->
## Memoria

### Nuevo intérprete Ignition

Ignition, el nuevo intérprete de V8, está completo en cuanto a funciones y se habilitará en Chrome 53 para dispositivos Android con poca memoria. El intérprete ofrece ahorros inmediatos de memoria para el código JIT y permitirá que V8 haga futuras optimizaciones para un inicio más rápido durante la ejecución de código. Ignition trabaja en conjunto con los compiladores optimizadores existentes de V8 (TurboFan y Crankshaft) para garantizar que el código “caliente” todavía se optimice para un máximo rendimiento. Seguimos mejorando el rendimiento del intérprete y esperamos habilitar Ignition pronto en todas las plataformas, tanto móviles como de escritorio. Busca un próximo artículo en el blog con más información sobre el diseño, la arquitectura y las mejoras de rendimiento de Ignition. Las versiones integradas de V8 pueden activar el intérprete Ignition con la bandera `--ignition`.

### Reducción de interrupciones

V8 v5.3 incluye varios cambios para reducir interrupciones en la aplicación y los tiempos de recolección de basura. Estos cambios incluyen:

- Optimizar los manejadores globales débiles para reducir el tiempo dedicado al manejo de memoria externa
- Unificar el montículo para colecciones completas de basura para reducir interrupciones de evacuación
- Optimizar las [asignaciones negras](/blog/orinoco) de V8 en la fase de marcado de la recolección de basura

En conjunto, estas mejoras reducen los tiempos de pausa en la recolección completa de basura en aproximadamente un 25%, medido mientras se navegaba en un corpus de páginas web populares. Para más detalles sobre las optimizaciones recientes de recolección de basura para reducir interrupciones, consulta los artículos del blog “Jank Busters” [Parte 1](/blog/jank-busters) y [Parte 2](/blog/orinoco).

## Rendimiento

### Mejorando el tiempo de inicio de página

El equipo de V8 recientemente comenzó a rastrear mejoras de rendimiento en un corpus de 25 cargas de páginas web del mundo real (incluyendo sitios populares como Facebook, Reddit, Wikipedia e Instagram). Entre V8 v5.1 (medido en Chrome 51 de abril) y V8 v5.3 (medido en un reciente Chrome Canary 53), mejoramos el tiempo de inicio en conjunto a través de las páginas web medidas en aproximadamente un 7%. Estas mejoras en la carga de sitios web reales reflejaron ganancias similares en el benchmark Speedometer, que se ejecutó un 14% más rápido en V8 v5.3. Para más detalles sobre nuestro nuevo entorno de prueba, mejoras de tiempo de ejecución y análisis de desgloses sobre dónde V8 emplea tiempo durante las cargas de página, consulta nuestro próximo artículo en el blog sobre rendimiento de inicio.

### Rendimiento de `Promise` ES2015

El rendimiento de V8 en el conjunto de benchmarks [Bluebird `Promise` ES2015](https://github.com/petkaantonov/bluebird/tree/master/benchmark) mejoró entre un 20–40% en V8 v5.3, variando según la arquitectura y el benchmark.

![Rendimiento de Promise de V8 a lo largo del tiempo en un Nexus 5x](/_img/v8-release-53/promise.png)

## API de V8

Consulte nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con [un checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 5.3 -t branch-heads/5.3` para experimentar con las nuevas funciones de V8 5.3. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones por ti mismo pronto.
