---
title: "Lanzamiento de V8 v6.1"
author: "El equipo de V8"
date: 2017-08-03 13:33:37
tags:
  - lanzamiento
description: "V8 v6.1 viene con un tamaño binario reducido e incluye mejoras de rendimiento. Además, asm.js ahora se valida y se compila a WebAssembly."
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 justo antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1), que está en beta hasta su lanzamiento en coordinación con Chrome 61 Stable en varias semanas. V8 v6.1 está llena de todo tipo de mejoras para desarrolladores. Nos gustaría darte un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Mejoras de rendimiento

Visitar todos los elementos de Maps y Sets — ya sea mediante [iteración](http://exploringjs.com/es6/ch_iteration.html) o los métodos [`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) — se volvió significativamente más rápido, con una mejora de rendimiento bruto de hasta 11× desde la versión 6.0 de V8. Consulta la [entrada de blog dedicada](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/) para obtener información adicional.

![](/_img/v8-release-61/iterating-collections.svg)

Además de eso, continuamos trabajando en el rendimiento de otras características del lenguaje. Por ejemplo, el método [`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf), que es importante para el código sin constructor que utiliza principalmente literales de objeto y `Object.create` en lugar de clases y funciones constructoras, ahora es siempre tan rápido y, a menudo, más rápido que usar [el operador `instanceof`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof).

![](/_img/v8-release-61/checking-prototype.svg)

Las llamadas a funciones y las invocaciones de constructores con número variable de argumentos también se volvieron significativamente más rápidas. Las llamadas realizadas con [`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) y [`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct) recibieron un aumento de rendimiento de hasta 17× en la última versión.

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach` ahora se optimiza dentro de TurboFan y se optimiza para todos los tipos de elementos principales no huecos [elements kinds](/blog/elements-kinds).

## Reducción del tamaño binario

El equipo de V8 ha eliminado completamente el compilador Crankshaft desactualizado, proporcionando una reducción significativa en el tamaño binario. Junto con la eliminación del generador de funciones incorporadas, esto reduce el tamaño binario desplegado de V8 en más de 700 KB, dependiendo de la plataforma exacta.

## asm.js ahora se valida y se compila a WebAssembly

Si V8 encuentra código asm.js ahora intenta validarlo. El código asm.js válido se transpila a WebAssembly. Según las evaluaciones de rendimiento de V8, esto generalmente aumenta el rendimiento del procesamiento. Debido al paso de validación adicional, pueden ocurrir regresiones aisladas en el rendimiento de inicio.

Ten en cuenta que esta característica solo se activó por defecto en el lado de Chromium. Si eres un integrador y deseas aprovechar el validador asm.js, habilita la opción `--validate-asm`.

## WebAssembly

Al depurar WebAssembly, ahora es posible mostrar variables locales en DevTools cuando se alcanza un punto de ruptura en el código WebAssembly.

## API de V8

Por favor, consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada versión importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.1 -t branch-heads/6.1` para experimentar con las nuevas características en V8 v6.1. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
