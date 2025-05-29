---
title: "Anunciando el Benchmark de Herramientas Web"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), Malabarista de Rendimiento de JavaScript"
avatars:
  - "benedikt-meurer"
date: 2017-11-06 13:33:37
tags:
  - benchmarks
  - Node.js
description: "El nuevo Benchmark de Herramientas Web ayuda a identificar y corregir cuellos de botella de rendimiento en Babel, TypeScript y otros proyectos del mundo real."
tweet: "927572065598824448"
---
El rendimiento de JavaScript siempre ha sido importante para el equipo de V8, y en esta publicación nos gustaría hablar sobre un nuevo [Benchmark de Herramientas Web](https://v8.github.io/web-tooling-benchmark) de JavaScript que hemos estado utilizando recientemente para identificar y corregir algunos cuellos de botella de rendimiento en V8. Probablemente ya estés al tanto del [fuerte compromiso de V8 con Node.js](/blog/v8-nodejs), y este benchmark amplía ese compromiso al ejecutar específicamente pruebas de rendimiento basadas en herramientas comunes para desarrolladores construidas sobre Node.js. Las herramientas en el Benchmark de Herramientas Web son las mismas que los desarrolladores y diseñadores utilizan hoy en día para crear sitios web modernos y aplicaciones basadas en la nube. Continuando con nuestros esfuerzos en curso para centrarnos en el [rendimiento en el mundo real](/blog/real-world-performance/) en lugar de benchmarks artificiales, creamos el benchmark usando código real que los desarrolladores ejecutan a diario.

<!--truncate-->
La suite de Benchmark de Herramientas Web fue diseñada desde el principio para cubrir casos de uso importantes de [herramientas para desarrolladores](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling) para Node.js. Debido a que el equipo de V8 se centra en el rendimiento del núcleo de JavaScript, construimos el benchmark de manera que se enfoque en las cargas de trabajo de JavaScript y excluya la medición de la I/O específica de Node.js o interacciones externas. Esto hace posible ejecutar el benchmark en Node.js, en todos los navegadores y en todos los shells principales de motores de JavaScript, incluyendo `ch` (ChakraCore), `d8` (V8), `jsc` (JavaScriptCore) y `jsshell` (SpiderMonkey). Aunque el benchmark no está limitado a Node.js, nos entusiasma que el [grupo de trabajo de benchmarking de Node.js](https://github.com/nodejs/benchmarking) esté considerando usar el benchmark de herramientas como un estándar para el rendimiento de Node ([nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138)).

Las pruebas individuales en el benchmark de herramientas cubren una variedad de herramientas que los desarrolladores usan comúnmente para construir aplicaciones basadas en JavaScript, por ejemplo:

- El transpiler [Babel](https://github.com/babel/babel) usando el preset `es2015`.
- El analizador utilizado por Babel, llamado [Babylon](https://github.com/babel/babylon), ejecutándose en varias entradas populares (incluyendo los bundles de [lodash](https://lodash.com/) y [Preact](https://github.com/developit/preact)).
- El analizador [acorn](https://github.com/ternjs/acorn) utilizado por [webpack](http://webpack.js.org/).
- El compilador [TypeScript](http://www.typescriptlang.org/) ejecutándose en el proyecto de ejemplo [typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular) del proyecto [TodoMVC](https://github.com/tastejs/todomvc).

Consulta el [análisis detallado](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md) para obtener detalles sobre todas las pruebas incluidas.

Basándonos en experiencias pasadas con otros benchmarks como [Speedometer](http://browserbench.org/Speedometer), donde las pruebas rápidamente se quedan desactualizadas a medida que nuevas versiones de los frameworks están disponibles, nos aseguramos de que sea sencillo actualizar cada una de las herramientas en los benchmarks a versiones más recientes a medida que se lanzan. Al basar la suite de benchmarks en la infraestructura de npm, podemos actualizarla fácilmente para garantizar que siempre esté probando lo último en herramientas de desarrollo de JavaScript. Actualizar un caso de prueba es simplemente cuestión de cambiar la versión en el manifiesto `package.json`.

Creamos un [bug de seguimiento](http://crbug.com/v8/6936) y una [hoja de cálculo](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw) para contener toda la información relevante que hemos recopilado sobre el rendimiento de V8 en el nuevo benchmark hasta este momento. Nuestras investigaciones ya han producido algunos resultados interesantes. Por ejemplo, descubrimos que V8 a menudo utilizaba la ruta lenta para `instanceof` ([v8:6971](http://crbug.com/v8/6971)), lo que ocasionaba una desaceleración de 3–4×. También encontramos y solucionamos cuellos de botella de rendimiento en ciertos casos de asignaciones de propiedades de la forma `obj[name] = val` donde `obj` fue creado vía `Object.create(null)`. En estos casos, V8 salía de la ruta rápida a pesar de poder aprovechar el hecho de que `obj` tiene un prototipo `null` ([v8:6985](http://crbug.com/v8/6985)). Estos y otros descubrimientos realizados con la ayuda de este benchmark mejoran V8, no solo en Node.js, sino también en Chrome.

No solo investigamos cómo hacer que V8 sea más rápido, sino que también solucionamos y trasladamos errores de rendimiento en las herramientas y bibliotecas del benchmark siempre que los encontramos. Por ejemplo, descubrimos una serie de errores de rendimiento en [Babel](https://github.com/babel/babel) donde patrones de código como

```js
value = items[items.length - 1];
```

llevan a accesos a la propiedad `"-1"`, porque el código no verificaba si `items` estaba vacío de antemano. Este patrón de código causa que V8 use un camino más lento debido a la búsqueda de `"-1"`, aunque una versión ligeramente modificada y equivalente en JavaScript es mucho más rápida. Ayudamos a solucionar estos problemas en Babel ([babel/babel#6582](https://github.com/babel/babel/pull/6582), [babel/babel#6581](https://github.com/babel/babel/pull/6581) y [babel/babel#6580](https://github.com/babel/babel/pull/6580)). También descubrimos y corregimos un error donde Babel accedía más allá de la longitud de una cadena ([babel/babel#6589](https://github.com/babel/babel/pull/6589)), lo que activaba otro camino más lento en V8. Además, [optimizamos las lecturas fuera de los límites de arreglos y cadenas](https://twitter.com/bmeurer/status/926357262318305280) en V8. Nos entusiasma seguir [trabajando con la comunidad](https://twitter.com/rauchg/status/924349334346276864) para mejorar el rendimiento de este importante caso de uso, no solo cuando se ejecuta sobre V8, sino también en otros motores de JavaScript como ChakraCore.

Nuestro enfoque fuerte en el rendimiento del mundo real y especialmente en mejorar las cargas de trabajo populares de Node.js se muestra en las constantes mejoras en la puntuación de V8 en el benchmark en los últimos lanzamientos:

![](/_img/web-tooling-benchmark/chart.svg)

Desde V8 v5.8, que es la última versión de V8 antes de [pasar a la arquitectura Ignition+TurboFan](/blog/launching-ignition-and-turbofan), la puntuación de V8 en el benchmark de herramientas ha mejorado alrededor de un **60%**.

En los últimos años, el equipo de V8 ha llegado a reconocer que ningún benchmark de JavaScript — incluso uno bien intencionado y cuidadosamente elaborado — debería utilizarse como proxy único para el rendimiento general de un motor de JavaScript. Sin embargo, creemos que el nuevo **Web Tooling Benchmark** destaca áreas del rendimiento de JavaScript que merece la pena abordar. A pesar del nombre y la motivación inicial, hemos encontrado que el conjunto de pruebas de Web Tooling Benchmark no solo es representativo de las cargas de trabajo de herramientas, sino también de un amplio rango de aplicaciones más sofisticadas de JavaScript que no se prueban bien con benchmarks centrados en el frontend como Speedometer. No es en absoluto un reemplazo para Speedometer, sino más bien un conjunto complementario de pruebas.

La mejor noticia de todas es que dado cómo el Web Tooling Benchmark está construido alrededor de cargas de trabajo reales, esperamos que nuestras recientes mejoras en las puntuaciones del benchmark se traduzcan directamente en una mayor productividad para los desarrolladores mediante [menos tiempo esperando que las cosas se construyan](https://xkcd.com/303/). Muchas de estas mejoras ya están disponibles en Node.js: al momento de escribir esto, Node 8 LTS está en V8 v6.1 y Node 9 está en V8 v6.2.

La última versión del benchmark está alojada en [https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/).
