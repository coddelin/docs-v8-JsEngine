---
title: 'Vista previa del navegador WebAssembly'
author: 'el equipo de V8'
date: 2016-10-31 13:33:37
tags:
  - WebAssembly
description: 'WebAssembly o Wasm es un nuevo tiempo de ejecución y destino de compilación para la web, ¡ahora disponible detrás de una bandera en Chrome Canary!'
---
Hoy nos complace anunciar, junto con [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview) y [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/), una vista previa para navegador de WebAssembly. [WebAssembly](http://webassembly.org/) o Wasm es un nuevo tiempo de ejecución y destino de compilación para la web, diseñado por colaboradores de Google, Mozilla, Microsoft, Apple y el [Grupo Comunitario de WebAssembly del W3C](https://www.w3.org/community/webassembly/).

<!--truncate-->
## ¿Qué marca este hito?

Este hito es significativo porque marca:

- una versión candidata para nuestro diseño [MVP](http://webassembly.org/docs/mvp/) (producto mínimo viable) (incluyendo [semántica](http://webassembly.org/docs/semantics/), [formato binario](http://webassembly.org/docs/binary-encoding/) y [API de JS](http://webassembly.org/docs/js/))
- implementaciones compatibles y estables de WebAssembly detrás de una bandera en el trunk en V8 y SpiderMonkey, en builds de desarrollo de Chakra y en progreso en JavaScriptCore
- una [cadena de herramientas funcional](http://webassembly.org/getting-started/developers-guide/) para que los desarrolladores compilen módulos de WebAssembly a partir de archivos de origen en C/C++
- una [hoja de ruta](http://webassembly.org/roadmap/) para lanzar WebAssembly activado por defecto, a menos que haya cambios basados en los comentarios de la comunidad

Puedes leer más sobre WebAssembly en el [sitio del proyecto](http://webassembly.org/) y seguir nuestra [guía para desarrolladores](http://webassembly.org/getting-started/developers-guide/) para probar la compilación de WebAssembly desde C y C++ usando Emscripten. Los documentos de [formato binario](http://webassembly.org/docs/binary-encoding/) y [API de JS](http://webassembly.org/docs/js/) describen la codificación binaria de WebAssembly y el mecanismo para instanciar módulos de WebAssembly en el navegador, respectivamente. Aquí tienes un ejemplo rápido para mostrar cómo se ve Wasm:

![Una implementación de la función Máximo Común Divisor en WebAssembly, mostrando los bytes en bruto, el formato de texto (WAST) y el código fuente en C.](/_img/webassembly-browser-preview/gcd.svg)

Dado que WebAssembly todavía está detrás de una bandera en Chrome ([chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)), aún no se recomienda para uso en producción. Sin embargo, el período de Vista Previa del Navegador marca un momento durante el cual estamos recogiendo activamente [comentarios](http://webassembly.org/community/feedback/) sobre el diseño e implementación de la especificación. Se anima a los desarrolladores a probar la compilación, portado y ejecución de aplicaciones en el navegador.

V8 sigue optimizando la implementación de WebAssembly en el [compilador TurboFan](/blog/turbofan-jit). Desde marzo pasado, cuando anunciamos por primera vez el soporte experimental, hemos añadido soporte para la compilación paralela. Además, estamos a punto de completar una línea de asm.js alternativa que convierte asm.js a WebAssembly [bajo el capó](https://www.chromestatus.com/feature/5053365658583040), para que los sitios existentes en asm.js puedan beneficiarse de la compilación anticipada de WebAssembly.

## ¿Qué sigue?

Salvo cambios importantes en el diseño derivados de los comentarios de la comunidad, el Grupo Comunitario de WebAssembly planea producir una especificación oficial en el primer trimestre de 2017, momento en el cual se alentará a los navegadores a activar WebAssembly por defecto. A partir de ese punto, el formato binario se restablecerá a la versión 1 y WebAssembly será sin versión, probado por características y compatible con versiones anteriores. Se puede encontrar una [hoja de ruta](http://webassembly.org/roadmap/) más detallada en el sitio del proyecto WebAssembly.
