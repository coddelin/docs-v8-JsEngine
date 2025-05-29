---
title: 'La integración JSPI de WebAssembly entra en prueba de origen'
description: 'Explicamos el inicio de la prueba de origen para JSPI'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-03-06
tags:
  - WebAssembly
---
La API de Integración de Promesas JavaScript (JSPI) de WebAssembly está entrando en una prueba de origen con la versión M123 de Chrome. Lo que significa esto es que puedes probar si tú y tus usuarios pueden beneficiarse de esta nueva API.

JSPI es una API que permite que el llamado código secuencial —que ha sido compilado a WebAssembly— acceda a APIs web que son _asíncronas_. Muchas APIs web están diseñadas en términos de `Promise`s de JavaScript: en lugar de realizar de inmediato la operación solicitada, devuelven un `Promise` para hacerlo. Cuando la acción finalmente se ejecuta, el administrador de tareas del navegador invoca cualquier callback con el Promise. JSPI se integra en esta arquitectura para permitir que una aplicación WebAssembly se suspenda cuando se devuelve el `Promise` y se reanude cuando el `Promise` se resuelve.

<!--truncate-->
Puedes obtener más información sobre JSPI y cómo usarlo [aquí](https://v8.dev/blog/jspi) y la especificación en sí está [aquí](https://github.com/WebAssembly/js-promise-integration).

## Requisitos

Además de registrarte para una prueba de origen, también necesitarás generar el WebAssembly y el JavaScript adecuados. Si estás usando Emscripten, esto es sencillo. Debes asegurarte de estar usando al menos la versión 3.1.47.

## Registrarse para la prueba de origen

JSPI todavía está en pre-lanzamiento; está pasando por un proceso de estandarización y no será totalmente lanzado hasta que lleguemos a la fase 4 de ese proceso. Para usarlo hoy, puedes establecer un flag en el navegador Chrome; o, puedes solicitar un token de prueba de origen que permitirá a tus usuarios acceder sin tener que configurar el flag ellos mismos.

Para registrarte, puedes ir [aquí](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889), asegurándote de seguir el proceso de registro. Para obtener más información sobre las pruebas de origen en general, [esto](https://developer.chrome.com/docs/web-platform/origin-trials) es un buen punto de partida.

## Algunas posibles advertencias

Ha habido algunas [discusiones](https://github.com/WebAssembly/js-promise-integration/issues) en la comunidad de WebAssembly sobre algunos aspectos de la API JSPI. Como resultado, hay algunos cambios indicados, los cuales tardarán en implementarse completamente. Anticipamos que estos cambios se lanzarán *gradualmente*: compartiremos los cambios a medida que estén disponibles, sin embargo, la API existente se mantendrá al menos hasta el final de la prueba de origen.

Además, hay algunos problemas conocidos que probablemente no se solucionarán por completo durante el periodo de prueba de origen:

Para aplicaciones que crean cálculos intensivos delegados, el rendimiento de una secuencia envuelta (es decir, usando JSPI para acceder a una API asíncrona) puede verse afectado. Esto se debe a que los recursos utilizados al crear la llamada envuelta no se almacenan en caché entre llamadas; dependemos de la recolección de basura para limpiar las pilas que se crean.
Actualmente asignamos una pila de tamaño fijo para cada llamada envuelta. Esta pila es necesariamente grande para acomodar aplicaciones complejas. Sin embargo, también significa que una aplicación que tiene un gran número de llamadas envueltas simples _en proceso_ puede experimentar presión de memoria.

Ninguno de estos problemas es probable que impida la experimentación con JSPI; esperamos que se solucionen antes de que JSPI sea lanzado oficialmente.

## Retroalimentación

Dado que JSPI es un esfuerzo de seguimiento de estándares, preferimos que cualquier problema y retroalimentación se compartan [aquí](https://github.com/WebAssembly/js-promise-integration/issues). Sin embargo, los informes de errores pueden ser enviados en el sitio estándar de informes de errores de Chrome [aquí](https://issues.chromium.org/new). Si sospechas de un problema con la generación de código, utiliza [esto](https://github.com/emscripten-core/emscripten/issues) para reportar un problema.

Finalmente, nos gustaría conocer cualquier beneficio que hayas descubierto. Utiliza el [rastreador de problemas](https://github.com/WebAssembly/js-promise-integration/issues) para compartir tu experiencia.
