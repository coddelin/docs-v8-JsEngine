---
title: 'Lanzamiento de V8 v9.5'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-09-21
tags:
 - lanzamiento
description: 'El lanzamiento de V8 v9.5 trae APIs de internacionalización actualizadas y soporte para manejo de excepciones WebAssembly.'
tweet: '1440296019623759872'
---
Cada cuatro semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 justo antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5), que está en beta hasta su lanzamiento, en coordinación con Chrome 95 Stable en varias semanas. V8 v9.5 está llena de todo tipo de mejoras orientadas a los desarrolladores. Esta publicación proporciona una vista previa de algunos aspectos destacados anticipándose al lanzamiento.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

En v8.1 lanzamos la API [`Intl.DisplayNames`](https://v8.dev/features/intl-displaynames) en Chrome 81, con los tipos admitidos “language”, “region”, “script” y “currency”. Con v9.5, ahora hemos agregado dos nuevos tipos admitidos: “calendar” y “dateTimeField”. Estos devuelven los nombres de los diferentes tipos de calendario y campos de fecha y hora respectivamente:

```js
const esCalendarNames = new Intl.DisplayNames(['es'], { type: 'calendar' });
const frDateTimeFieldNames = new Intl.DisplayNames(['fr'], { type: 'dateTimeField' });
esCalendarNames.of('roc');  // "calendario de la República de China"
frDateTimeFieldNames.of('month'); // "mois"
```

También mejoramos el soporte para el tipo “language” con una nueva opción languageDisplay, que puede ser “standard” o “dialect” (valor predeterminado si no se especifica):

```js
const jaDialectLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' });
const jaStandardLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' , languageDisplay: 'standard'});
jaDialectLanguageNames.of('en-US')  // "アメリカ英語"
jaDialectLanguageNames.of('en-AU')  // "オーストラリア英語"
jaDialectLanguageNames.of('en-GB')  // "イギリス英語"

jaStandardLanguageNames.of('en-US') // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of('en-AU') // "英語 (オーストラリア)"
jaStandardLanguageNames.of('en-GB') // "英語 (イギリス)"
```

### Opción extendida `timeZoneName`

`Intl.DateTimeFormat API` en v9.5 ahora admite cuatro nuevos valores para la opción `timeZoneName`:

- “shortGeneric” para mostrar el nombre de la zona horaria en un formato genérico corto sin ubicación, como “PT” o “ET”, sin indicar si está en horario de verano.
- “longGeneric” para mostrar el nombre de la zona horaria en un formato genérico largo sin ubicación, como “Pacific Time” o “Mountain Time”, sin indicar si está en horario de verano.
- “shortOffset” para mostrar el nombre de la zona horaria en el formato GMT corto localizado, como “GMT-8”.
- “longOffset” para mostrar el nombre de la zona horaria en el formato GMT largo localizado, como “GMT-0800”.

## WebAssembly

### Manejo de excepciones

V8 ahora admite la [propuesta de manejo de excepciones de WebAssembly (Wasm EH)](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md) para que los módulos compilados con una cadena de herramientas compatible (por ejemplo, [Emscripten](https://emscripten.org/docs/porting/exceptions.html)) puedan ejecutarse en V8. La propuesta está diseñada para mantener el sobrecosto bajo en comparación con las soluciones anteriores que usaban JavaScript.

Por ejemplo, compilamos el optimizador [Binaryen](https://github.com/WebAssembly/binaryen/) a WebAssembly con implementaciones antiguas y nuevas de manejo de excepciones.

Cuando el manejo de excepciones está habilitado, el aumento del tamaño del código [se reduce de aproximadamente un 43% con el manejo de excepciones basado en JavaScript a solo un 9% con la nueva función Wasm EH](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209).

Cuando ejecutamos `wasm-opt.wasm -O3` en algunos archivos de prueba grandes, la versión de Wasm EH no mostró pérdida de rendimiento en comparación con la línea base sin excepciones, mientras que la versión basada en JavaScript tardó alrededor de un 30% más.

Sin embargo, Binaryen utiliza comprobaciones de excepciones con moderación. En cargas de trabajo con muchas excepciones, se espera que la diferencia de rendimiento sea aún mayor.

## API de V8

El archivo principal de encabezado v8.h se ha dividido en varias partes que se pueden incluir por separado. Por ejemplo, `v8-isolate.h` ahora contiene la clase `v8::Isolate`. Muchos archivos de encabezado que declaran métodos que pasan `v8::Local<T>` ahora pueden importar `v8-forward.h` para obtener la definición de `v8::Local` y todos los tipos de objetos en el heap de v8.

Por favor, utiliza `git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h` para obtener una lista de los cambios de la API.
