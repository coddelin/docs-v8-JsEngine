---
title: "Lanzamiento de V8 v5.9"
author: "el equipo de V8"
date: 2017-04-27 13:33:37
tags:
  - lanzamiento
description: "V8 v5.9 incluye el nuevo pipeline Ignition + TurboFan, y agrega soporte para WebAssembly TrapIf en todas las plataformas."
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 justo antes de alcanzar un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9), que estará en beta hasta que se lance en coordinación con Chrome 59 Stable en unas semanas. V8 5.9 está lleno de todo tipo de novedades para los desarrolladores. Nos gustaría ofrecerles un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Lanzamiento de Ignition+TurboFan

V8 v5.9 será la primera versión con Ignition+TurboFan habilitado por defecto. En general, este cambio debería conducir a un menor consumo de memoria y un inicio más rápido para las aplicaciones web en todas las áreas, y no esperamos problemas de estabilidad o rendimiento porque el nuevo pipeline ya ha pasado por pruebas significativas. Sin embargo, [contáctanos](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline) en caso de que tu código de repente experimente un deterioro significativo en el rendimiento.

Para obtener más información, consulta [nuestro blog dedicado](/blog/launching-ignition-and-turbofan).

## Soporte para WebAssembly `TrapIf` en todas las plataformas

El [soporte para WebAssembly `TrapIf`](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe) redujo significativamente el tiempo dedicado a compilar código (~30%).

![](/_img/v8-release-59/angrybots.png)

## API de V8

Por favor, consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 5.9 -t branch-heads/5.9` para experimentar con las nuevas características de V8 5.9. Alternativamente, pueden [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
