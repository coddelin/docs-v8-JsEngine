---
title: &apos;Lanzamiento de V8 v6.8&apos;
author: &apos;el equipo de V8&apos;
date: 2018-06-21 13:33:37
tags:
  - lanzamiento
description: &apos;V8 v6.8 presenta un menor consumo de memoria y varias mejoras de rendimiento.&apos;
tweet: &apos;1009753739060826112&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el Git master de V8 inmediatamente antes de un hito beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8), que está en beta hasta su lanzamiento en coordinación con Chrome 68 Stable dentro de varias semanas. V8 v6.8 está llena de todo tipo de novedades orientadas a desarrolladores. Esta publicación ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Memoria

Las funciones de JavaScript mantenían innecesariamente vivas las funciones externas y sus metadatos (conocidos como `SharedFunctionInfo` o `SFI`). Especialmente en código que usa funciones en gran medida y que depende de IIFEs de corta duración, esto podría llevar a fugas de memoria espurias. Antes de este cambio, un `Context` activo (es decir, una representación en el heap de una activación de función) mantenía vivo el `SFI` de la función que creó el contexto:

![](/_img/v8-release-68/context-jsfunction-before.svg)

Al hacer que el `Context` apunte a un objeto `ScopeInfo` que contiene la información simplificada necesaria para la depuración, podemos romper la dependencia del `SFI`.

![](/_img/v8-release-68/context-jsfunction-after.svg)

Ya hemos observado mejoras del 3% en la memoria de V8 en dispositivos móviles en un conjunto de las 10 páginas principales.

Paralelamente hemos reducido el consumo de memoria de los `SFI` mismos, eliminando campos innecesarios o comprimiéndolos donde sea posible y disminuyendo su tamaño en aproximadamente un 25%, con más reducciones en futuras versiones. Hemos observado que los `SFI` ocupan entre el 2 y el 6% de la memoria de V8 en sitios web típicos incluso después de desconectarlos del contexto, por lo que deberías notar mejoras de memoria en código con una gran cantidad de funciones.

## Rendimiento

### Mejoras en la desestructuración de arrays

El compilador de optimización no generaba código ideal para la desestructuración de arrays. Por ejemplo, intercambiar variables usando `[a, b] = [b, a]` solía ser dos veces más lento que `const tmp = a; a = b; b = tmp`. Una vez desbloqueamos el análisis de escape para eliminar toda asignación temporal, la desestructuración de arrays con un array temporal es tan rápida como una secuencia de asignaciones.

### Mejoras en `Object.assign`

Hasta ahora, `Object.assign` tenía un camino rápido escrito en C++. Esto significaba que se debía cruzar el límite de JavaScript a C++ para cada llamada de `Object.assign`. Una forma obvia de mejorar el rendimiento integrado era implementar un camino rápido del lado de JavaScript. Teníamos dos opciones: implementarlo como un builtin JS nativo (que en este caso vendría con algo de sobrecarga innecesaria) o implementarlo [usando la tecnología CodeStubAssembler](/blog/csa) (que proporciona más flexibilidad). Optamos por la última solución. La nueva implementación de `Object.assign` mejora el puntaje de [Speedometer2/React-Redux en aproximadamente un 15%, mejorando el puntaje total de Speedometer 2 en un 1.5%](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590).

### Mejoras en `TypedArray.prototype.sort`

`TypedArray.prototype.sort` tiene dos caminos: un camino rápido, utilizado cuando el usuario no provee una función de comparación, y un camino lento para todo lo demás. Hasta ahora, el camino lento reutilizaba la implementación de `Array.prototype.sort`, que hace mucho más de lo necesario para ordenar `TypedArray`s. V8 v6.8 reemplaza el camino lento con una implementación en [CodeStubAssembler](/blog/csa). (No directamente CodeStubAssembler sino un lenguaje específico de dominio que se basa en CodeStubAssembler).

El rendimiento al ordenar `TypedArray`s sin una función de comparación permanece igual, mientras que hay una aceleración de hasta 2.5× al ordenar utilizando una función de comparación.

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

En V8 v6.8 puedes comenzar a utilizar [verificación de límites basada en trampas](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit) en plataformas Linux x64. Esta optimización de gestión de memoria mejora considerablemente la velocidad de ejecución de WebAssembly. Ya se utiliza en Chrome 68, y en el futuro se admitirán más plataformas de forma incremental.

## API de V8

Por favor utiliza `git log branch-heads/6.7..branch-heads/6.8 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.8 -t branch-heads/6.8` para experimentar con las nuevas características de V8 v6.8. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones pronto.
