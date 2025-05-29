---
title: &apos;Lanzamiento de V8 v5.4&apos;
author: &apos;el equipo de V8&apos;
date: 2016-09-09 13:33:37
tags:
  - lanzamiento
description: &apos;V8 v5.4 viene con mejoras de rendimiento y menor consumo de memoria.&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 5.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.4), que estará en beta hasta que se lance en coordinación con Chrome 54 Stable en varias semanas. V8 v5.4 está llena de recursos útiles para los desarrolladores, así que queremos darles un adelanto de algunos de los aspectos más destacados en anticipación al lanzamiento.

<!--truncate-->
## Mejoras de rendimiento

V8 v5.4 proporciona una serie de mejoras clave en el uso de memoria y la velocidad de inicio. Estas mejoras ayudan principalmente a acelerar la ejecución inicial de scripts y a reducir el tiempo de carga de páginas en Chrome.

### Memoria

Al medir el consumo de memoria de V8, dos métricas son muy importantes de monitorear y entender: _Consumo máximo de memoria_ y _consumo promedio de memoria_. Por lo general, reducir el consumo máximo es tan importante como reducir el promedio, ya que un script en ejecución que agota la memoria disponible, incluso por un breve momento, puede causar un error de _Falta de memoria_, aunque su consumo promedio no sea muy alto. Para propósitos de optimización, es útil dividir la memoria de V8 en dos categorías: _Memoria en el montón_ que contiene objetos reales de JavaScript y _memoria fuera del montón_ que contiene el resto, como estructuras de datos internas asignadas por el compilador, el analizador y el recolector de basura.

En la versión 5.4 ajustamos el recolector de basura de V8 para dispositivos de baja memoria con 512 MB de RAM o menos. Dependiendo del sitio web mostrado, esto reduce el _consumo máximo de memoria en el montón_ hasta un **40%**.

La gestión de memoria dentro del analizador de JavaScript de V8 se simplificó para evitar asignaciones innecesarias, reduciendo el _uso máximo de memoria fuera del montón_ hasta un **20%**. Estos ahorros de memoria son especialmente útiles para reducir el consumo de grandes archivos de script, incluidas las aplicaciones asm.js.

### Inicio y velocidad

Nuestro trabajo para simplificar el analizador de V8 no solo ayudó a reducir el consumo de memoria, sino que también mejoró el rendimiento del análisis en tiempo de ejecución. Esta simplificación, combinada con otras optimizaciones de las funciones integradas de JavaScript y cómo los accesos a las propiedades en objetos JavaScript usan [cachés en línea](https://en.wikipedia.org/wiki/Inline_caching), resultó en notables mejoras de rendimiento en el inicio.

Nuestra [suite interna de pruebas de inicio](https://www.youtube.com/watch?v=xCx4uC7mn6Y), que mide el rendimiento de JavaScript en el mundo real, mejoró en una mediana del 5%. El benchmark de [Speedometer](http://browserbench.org/Speedometer/) también se beneficia de estas optimizaciones, mejorando entre [~10 y 13% en comparación con la versión 5.2](https://chromeperf.appspot.com/report?sid=f5414b72e864ffaa4fd4291fa74bf3fd7708118ba534187d36113d8af5772c86&start_rev=393766&end_rev=416239).

![](/_img/v8-release-54/speedometer.png)

## API de V8

Por favor revisen nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 5.4 -t branch-heads/5.4` para experimentar con las nuevas características en V8 v5.4. Alternativamente, pueden [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto por sí mismos.
