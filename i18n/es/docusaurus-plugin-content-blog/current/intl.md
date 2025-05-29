---
title: &apos;APIs de internacionalización más rápidas y con más características&apos;
author: &apos;[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)&apos;
date: 2019-04-25 16:45:37
avatars:
  - &apos;sathya-gunasekaran&apos;
tags:
  - ECMAScript
  - Intl
description: &apos;¡La API de Internacionalización de JavaScript está creciendo, y su implementación en V8 está volviéndose más rápida!&apos;
tweet: &apos;1121424877142122500&apos;
---
[La especificación de la API de Internacionalización de ECMAScript](https://tc39.es/ecma402/) (ECMA-402, o `Intl`) proporciona funcionalidades clave específicas de locales como formato de fechas, formato de números, selección de formas plurales y ordenación. Los equipos de Chrome V8 y Google Internationalization han estado colaborando para añadir características a la implementación ECMA-402 de V8, mientras eliminan deuda técnica y mejoran el rendimiento y la interoperabilidad con otros navegadores.

<!--truncate-->
## Mejoras arquitectónicas subyacentes

Inicialmente, la especificación ECMA-402 se implementó mayormente en JavaScript usando extensiones de V8 y se encontraba fuera del código base de V8. Usar la API de Extensión externa significaba que varias de las APIs que V8 usaba internamente para la verificación de tipos, la gestión del ciclo de vida de objetos externos en C++ y el almacenamiento de datos internos privados no podían ser usadas. Como parte de la mejora en el rendimiento de inicio, esta implementación se trasladó más tarde al código base de V8 para habilitar la [toma de snapshots](/blog/custom-startup-snapshots) de estas funciones integradas.

V8 utiliza `JSObject`s especializados con [formas (clases ocultas)](https://mathiasbynens.be/notes/shapes-ics) personalizadas para describir objetos integrados de JavaScript especificados por ECMAScript (como `Promise`, `Map`, `Set`, etc.). Con este enfoque, V8 puede preasignar el número requerido de espacios internos y generar accesos rápidos a estos, en lugar de ir creciendo el objeto propiedad por propiedad, lo que da como resultado un rendimiento más lento y un peor uso de la memoria.

La implementación de `Intl` no se modeló siguiendo dicha arquitectura, como consecuencia de la separación histórica. En cambio, todos los objetos integrados de JavaScript especificados por la especificación de Internacionalización (como `NumberFormat`, `DateTimeFormat`) eran objetos `JSObject` genéricos que tenían que pasar por varias transiciones de propiedades para sus espacios internos.

Otro inconveniente de no tener `JSObject`s especializados era que la verificación de tipos se volvía más compleja. La información de tipos se almacenaba bajo un símbolo privado y se verificaba en ambos lados, JS y C++, usando un acceso costoso a las propiedades en lugar de simplemente consultar su forma.

### Modernizando el código base

Con el actual alejamiento de escribir integrados autohospedados en V8, tenía sentido aprovechar esta oportunidad para modernizar la implementación de ECMA402.

### Alejándose de JS autohospedado

A pesar de que el autohospedaje se presta para un código conciso y legible, el uso frecuente de llamadas de tiempo de ejecución lentas para acceder a las APIs de ICU generaba problemas de rendimiento. Como resultado, gran parte de la funcionalidad de ICU fue duplicada en JavaScript para reducir el número de tales llamadas de tiempo de ejecución.

Reescribiendo las funciones integradas en C++, se hizo mucho más rápido acceder a las APIs de ICU ya que ahora no hay sobrecarga de llamadas en tiempo de ejecución.

### Mejorando ICU

ICU es un conjunto de bibliotecas C/C++ usado por un gran número de aplicaciones, incluyendo todos los principales motores de JavaScript, para proporcionar soporte para Unicode y globalización. Como parte de la transición de `Intl` a ICU en la implementación de V8, [encontramos](https://unicode-org.atlassian.net/browse/ICU-20140) [y](https://unicode-org.atlassian.net/browse/ICU-9562) [corregimos](https://unicode-org.atlassian.net/browse/ICU-20098) varios errores en ICU.

Como parte de la implementación de nuevas propuestas como [`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat), [`Intl.ListFormat`](/features/intl-listformat) y `Intl.Locale`, hemos ampliado ICU añadiendo [varias](https://unicode-org.atlassian.net/browse/ICU-13256) [nuevas](https://unicode-org.atlassian.net/browse/ICU-20121) [APIs](https://unicode-org.atlassian.net/browse/ICU-20342) para respaldar estas nuevas propuestas de ECMAScript.

¡Todas estas adiciones ayudan a otros motores de JavaScript a implementar estas propuestas más rápido, impulsando la web hacia adelante! Por ejemplo, está en progreso el desarrollo en Firefox para implementar varias nuevas APIs de `Intl` basadas en nuestro trabajo en ICU.

## Rendimiento

Como resultado de este trabajo, mejoramos el rendimiento de la API de Internacionalización optimizando varios caminos rápidos y almacenando en caché la inicialización de los diversos objetos `Intl` y los métodos `toLocaleString` en `Number.prototype`, `Date.prototype`, y `String.prototype`.

Por ejemplo, la creación de un nuevo objeto `Intl.NumberFormat` se volvió aproximadamente 24 veces más rápida.

![[Microbenchmarks](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js) probando el rendimiento de la creación de varios objetos `Intl`](/_img/intl/performance.svg)

Tenga en cuenta que para un mejor rendimiento, se recomienda crear explícitamente *y reutilizar* un objeto `Intl.NumberFormat`, `Intl.DateTimeFormat` o `Intl.Collator`, en lugar de llamar a métodos como `toLocaleString` o `localeCompare`.

## Nuevas características de `Intl`

Todo este trabajo ha proporcionado una gran base para construir nuevas características y continuamos implementando todas las nuevas propuestas de internacionalización que están en la Etapa 3.

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) se lanzó en Chrome 71, [`Intl.ListFormat`](/features/intl-listformat) se lanzó en Chrome 72, [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale) se lanzó en Chrome 74, y las opciones [`dateStyle` y `timeStyle` para `Intl.DateTimeFormat`](https://github.com/tc39/proposal-intl-datetime-style) y el [soporte de BigInt para `Intl.DateTimeFormat`](https://github.com/tc39/ecma402/pull/236) se están implementando en Chrome 76. [`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange), [`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/), y [opciones adicionales para `Intl.NumberFormat`](https://github.com/tc39/proposal-unified-intl-numberformat/) están actualmente en desarrollo en V8, ¡y esperamos implementarlas pronto!

Muchas de estas nuevas API, y otras que están más adelante en el pipeline, se deben a nuestro trabajo en estandarizar nuevas características para ayudar a los desarrolladores con la internacionalización. [`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames) es una propuesta de Etapa 1 que permite a los usuarios localizar los nombres de exhibición de idiomas, regiones o escrituras. [`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange) es una propuesta de Etapa 3 que especifica una manera de formatear rangos de fechas de forma concisa y consciente de la localización. [La propuesta de la API unificada de `Intl.NumberFormat`](https://github.com/tc39/proposal-unified-intl-numberformat) es una propuesta de Etapa 3 que mejora `Intl.NumberFormat` al agregar soporte para unidades de medida, moneda y políticas de visualización de símbolos, así como notación científica y compacta. También puedes participar en el futuro de ECMA-402 contribuyendo en [su repositorio de GitHub](https://github.com/tc39/ecma402).

## Conclusión

`Intl` proporciona una API rica en funciones para varias operaciones necesarias en la internacionalización de tu aplicación web, dejando el trabajo pesado al navegador, sin enviar tantos datos o código a través de la red. Pensar en el uso adecuado de estas API puede llevar a que tu interfaz de usuario funcione mejor en diferentes locales. Gracias al trabajo de los equipos de Google V8 y i18n en colaboración con TC39 y su subgrupo ECMA-402, ahora puedes acceder a más funcionalidad con mejor rendimiento, y esperar mejoras adicionales con el tiempo.
