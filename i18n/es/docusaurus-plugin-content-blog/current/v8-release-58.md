---
title: &apos;Lanzamiento de V8 versión v5.8&apos;
author: &apos;el equipo de V8&apos;
date: 2017-03-20 13:33:37
tags:
  - lanzamiento
description: &apos;V8 v5.8 permite el uso de tamaños de montón arbitrarios y mejora el rendimiento de inicio.&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8), que estará en beta hasta que se lance en coordinación con Chrome 58 Estable dentro de varias semanas. V8 5.8 está lleno de muchas mejoras orientadas a los desarrolladores. Nos gustaría darte un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Tamaños de montón arbitrarios

Históricamente, el límite del montón de V8 se estableció convenientemente para ajustarse al rango de enteros con signo de 32 bits con cierto margen. Con el tiempo, esta conveniencia llevó a un código descuidado en V8 que mezclaba tipos de diferentes anchos de bits, rompiendo efectivamente la capacidad de aumentar el límite. En V8 v5.8 habilitamos el uso de tamaños de montón arbitrarios. Consulta la [publicación dedicada en el blog](/blog/heap-size-limit) para más información.

## Rendimiento de inicio

En V8 v5.8 continuamos trabajando para reducir incrementalmente el tiempo dedicado en V8 durante el inicio. Las reducciones en el tiempo dedicado a compilar y analizar código, así como las optimizaciones en el sistema IC, resultaron en mejoras del ~5% en nuestras [cargas de trabajo de inicio del mundo real](/blog/real-world-performance).

## API de V8

Consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 5.8 -t branch-heads/5.8` para experimentar con las nuevas características de V8 5.8. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características por ti mismo pronto.
