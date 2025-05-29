---
title: 'Lanzamiento de V8 v7.9'
author: 'Santiago Aboy Solanes, extraordinario compresor de punteros'
avatars:
  - 'santiago-aboy-solanes'
date: 2019-11-20
tags:
  - lanzamiento
description: 'V8 v7.9 elimina la depreciación de transiciones Double ⇒ Tagged, manejo de getters de API en funciones integradas, almacenamiento en caché de OSR y soporte Wasm para múltiples espacios de código.'
tweet: '1197187184304050176'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy estamos complacidos de anunciar nuestra rama más reciente, [V8 versión 7.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.9), que está en beta hasta su lanzamiento en coordinación con Chrome 79 Stable en varias semanas. V8 v7.9 está lleno de novedades de cara al desarrollador. Esta publicación proporciona un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Rendimiento (tamaño y velocidad)

### Eliminación de la depreciación para transiciones Double ⇒ Tagged

Recordarás de publicaciones anteriores en el blog que V8 rastrea cómo se representan los campos en las estructuras de los objetos. Cuando cambia la representación de un campo, la estructura del objeto actual tiene que ser "depreciada", y se crea una nueva estructura con la nueva representación del campo.

Una excepción a esto es cuando se garantiza que los valores antiguos del campo son compatibles con la nueva representación. En esos casos, simplemente podemos intercambiar la nueva representación en su lugar en la estructura del objeto, y aún funcionará para los valores de los campos de los objetos antiguos. En V8 v7.6 habilitamos estos cambios en la representación en su lugar para las transiciones Smi ⇒ Tagged y HeapObject ⇒ Tagged, pero no pudimos evitar Double ⇒ Tagged debido a nuestra optimización MutableHeapNumber.

En V8 v7.9, eliminamos MutableHeapNumber y, en cambio, usamos HeapNumbers que son implícitamente mutables cuando pertenecen a un campo de representación Double. Esto significa que tenemos que ser un poco más cuidadosos al tratar con HeapNumbers (que ahora son mutables si están en un campo double e inmutables de lo contrario), pero los HeapNumbers son compatibles con la representación Tagged, y por lo tanto podemos evitar la depreciación en el caso Double ⇒ Tagged también.

Este cambio relativamente simple mejoró la puntuación de Speedometer AngularJS en un 4%.

![Mejoras en la puntuación de Speedometer AngularJS](/_img/v8-release-79/speedometer-angularjs.svg)

### Manejo de getters de API en funciones integradas

Anteriormente, V8 siempre fallaba al runtime de C++ al manejar getters definidos por la API de incrustación (como Blink). Esto incluía getters definidos en la especificación HTML como `Node.nodeType`, `Node.nodeName`, etc.

V8 realizaba todo el recorrido del prototipo en la función integrada para cargar el getter y luego salía al runtime una vez que se daba cuenta de que el getter estaba definido por la API. En el runtime de C++, recorría nuevamente la cadena de prototipos para obtener el getter antes de ejecutarlo, duplicando mucho trabajo.

En general, [el mecanismo de almacenamiento en caché en línea (IC)](https://mathiasbynens.be/notes/shapes-ics) puede ayudar a mitigar esto ya que V8 instala un controlador IC después del primer fallo al runtime de C++. Pero con la nueva [asignación de retroalimentación perezosa](https://v8.dev/blog/v8-release-77#lazy-feedback-allocation), V8 no instala controladores IC hasta que la función se haya ejecutado durante algún tiempo.

Ahora, en V8 v7.9, estos getters son manejados en las funciones integradas sin tener que fallar al runtime de C++, incluso cuando no tienen controladores IC instalados, aprovechando subrutinas especiales de la API que pueden llamar directamente al getter de la API. Esto resulta en una disminución del 12% en el tiempo empleado en el runtime IC en el benchmark de Speedometer Backbone y jQuery.

![Mejoras en Speedometer Backbone y jQuery](/_img/v8-release-79/speedometer.svg)

### Almacenamiento en caché de OSR

Cuando V8 identifica que ciertas funciones están "calientes", las marca para optimización en la siguiente llamada. Cuando la función se ejecuta de nuevo, V8 compila la función usando el compilador optimizador y comienza a usar el código optimizado desde la llamada subsiguiente. Sin embargo, para funciones con bucles de larga duración, esto no es suficiente. V8 usa una técnica llamada reemplazo en la pila (OSR) para instalar código optimizado para la función que se está ejecutando actualmente. Esto nos permite comenzar a usar el código optimizado durante la primera ejecución de la función, mientras está atrapada en un bucle caliente.

Si la función se ejecuta por segunda vez, es muy probable que sea OSRed nuevamente. Antes de V8 v7.9 necesitábamos re-optimizar la función nuevamente para realizar un OSR. Sin embargo, desde v7.9 agregamos almacenamiento en caché de OSR para retener código optimizado para reemplazos de OSR, indexado por el encabezado del bucle que se usó como punto de entrada en la función OSRed. Esto ha mejorado el rendimiento de algunos benchmarks de rendimiento máximo en un 5–18%.

![Mejoras en el almacenamiento en caché de OSR](/_img/v8-release-79/osr-caching.svg)

## WebAssembly

### Soporte para múltiples espacios de código

Hasta ahora, cada módulo de WebAssembly consistía en exactamente un espacio de código en arquitecturas de 64 bits, el cual se reservaba al crear el módulo. Esto nos permitía usar llamadas cercanas dentro de un módulo, pero nos limitaba a 128 MB de espacio de código en arm64, y requería reservar 1 GB por adelantado en x64.

En la versión 7.9, V8 obtuvo soporte para múltiples espacios de código en arquitecturas de 64 bits. Esto nos permite reservar solo el espacio de código necesario estimado y agregar más espacios de código más adelante si es necesario. Se utiliza un salto largo para llamadas entre espacios de código que están demasiado separados para saltos cercanos. En lugar de ~1000 módulos de WebAssembly por proceso, V8 ahora admite varios millones, limitado únicamente por la cantidad de memoria realmente disponible.

## API de V8

Por favor, use `git log branch-heads/7.8..branch-heads/7.9 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.9 -t branch-heads/7.9` para experimentar con las nuevas características en V8 v7.9. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto usted mismo.
