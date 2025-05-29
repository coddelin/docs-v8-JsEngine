---
title: &apos;V8 ❤️ Node.js&apos;
author: &apos;Franziska Hinkelmann, Node Monkey Patcher&apos;
date: 2016-12-15 13:33:37
tags:
  - Node.js
description: &apos;Esta publicación de blog resalta algunos de los esfuerzos recientes para mejorar el soporte de Node.js en V8 y Chrome DevTools.&apos;
---
La popularidad de Node.js ha estado creciendo constantemente en los últimos años, y hemos estado trabajando para hacer que Node.js sea mejor. Esta publicación de blog resalta algunos de los esfuerzos recientes en V8 y DevTools.

## Depura Node.js en DevTools

Ahora puedes [depurar aplicaciones Node usando las herramientas para desarrolladores de Chrome](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t). El equipo de Chrome DevTools trasladó el código fuente que implementa el protocolo de depuración de Chromium a V8, lo que facilita que Node Core se mantenga actualizado con las fuentes y dependencias del depurador. Otros proveedores de navegadores e IDEs también usan el protocolo de depuración de Chrome, mejorando colectivamente la experiencia del desarrollador al trabajar con Node.

<!--truncate-->
## Mejoras de velocidad en ES2015

Estamos trabajando arduamente para hacer que V8 sea más rápido que nunca. [Gran parte de nuestro trabajo reciente en rendimiento se centra en las características de ES6](/blog/v8-release-56), incluidas promesas, generadores, destructores y operadores rest/spread. Debido a que las versiones de V8 en Node 6.2 y posteriores son totalmente compatibles con ES6, los desarrolladores de Node pueden usar nuevas características del lenguaje "nativamente", sin polyfills. Esto significa que los desarrolladores de Node son a menudo los primeros en beneficiarse de las mejoras de rendimiento de ES6. Del mismo modo, a menudo son los primeros en reconocer regresiones de rendimiento. Gracias a una comunidad de Node atenta, descubrimos y solucionamos una serie de regresiones, incluidas cuestiones de rendimiento con [`instanceof`](https://github.com/nodejs/node/issues/9634), [`buffer.length`](https://github.com/nodejs/node/issues/9006), [listas largas de argumentos](https://github.com/nodejs/node/pull/9643) y [`let`/`const`](https://github.com/nodejs/node/issues/9729).

## Próximas correcciones para el módulo `vm` y el REPL de Node.js

El [`módulo vm`](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html) ha tenido [algunas limitaciones de larga duración](https://github.com/nodejs/node/issues/6283). Para abordar estos problemas adecuadamente, hemos ampliado la API de V8 para implementar un comportamiento más intuitivo. Estamos emocionados de anunciar que las mejoras del módulo vm son uno de los proyectos que estamos apoyando como mentores en [Outreachy para la Fundación Node](https://nodejs.org/en/foundation/outreachy/). Esperamos ver más avances en este proyecto y otros en un futuro cercano.

## `async`/`await`

Con las funciones async, puedes simplificar drásticamente el código asincrónico reescribiendo el flujo del programa al esperar promesas secuencialmente. `async`/`await` llegará a Node [con la próxima actualización de V8](https://github.com/nodejs/node/pull/9618). Nuestro trabajo reciente en mejorar el rendimiento de promesas y generadores ha ayudado a hacer que las funciones async sean rápidas. En una nota relacionada, también estamos trabajando en proporcionar [ganchos de promesas](https://bugs.chromium.org/p/v8/issues/detail?id=4643), un conjunto de APIs de introspección necesarias para la [API Node Async Hook](https://github.com/nodejs/node-eps/pull/18).

## ¿Quieres probar Node.js de vanguardia?

Si te entusiasma probar las características más nuevas de V8 en Node y no te importa usar software de vanguardia e inestable, puedes probar nuestra rama de integración [aquí](https://github.com/v8/node/tree/vee-eight-lkgr). [V8 se integra continuamente en Node](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration) antes de que V8 llegue a Node.js, así podemos detectar problemas tempranamente. Sin embargo, ten en cuenta que esto es más experimental que la punta del árbol de Node.js.
