---
title: 'Lanzamiento de V8 v7.6'
author: 'Adam Klein'
avatars:
  - 'adam-klein'
date: 2019-06-19 16:45:00
tags:
  - lanzamiento
description: 'V8 v7.6 incluye Promise.allSettled, JSON.parse más rápido, BigInts localizados, arreglos congelados/asegurados más veloces ¡y mucho más!'
tweet: '1141356209179516930'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del Git master de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra última rama, [la versión 7.6 de V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6), que está en beta hasta su lanzamiento en coordinación con Chrome 76 Stable en varias semanas. V8 v7.6 está llena de todo tipo de características útiles para los desarrolladores. Esta publicación proporciona un avance de algunos de los puntos destacados en anticipación al lanzamiento.

<!--truncate-->
## Rendimiento (tamaño y velocidad)

### Mejoras en `JSON.parse`

En las aplicaciones modernas de JavaScript, JSON se utiliza comúnmente como un formato para comunicar datos estructurados. Al acelerar la interpretación de JSON, podemos reducir la latencia de esta comunicación. En V8 v7.6, hemos renovado nuestro analizador de JSON para que sea mucho más rápido en escanear e interpretar JSON. Esto da como resultado una interpretación hasta 2.7× más rápida de datos servidos por páginas web populares.

![Gráfico mostrando la mejora en el rendimiento de `JSON.parse` en una variedad de sitios web](/_img/v8-release-76/json-parsing.svg)

Hasta V8 v7.5, el analizador de JSON era un analizador recursivo que utilizaba espacio en la pila nativa según la profundidad de anidamiento de los datos JSON entrantes. Esto significaba que podíamos agotar la pila para datos JSON muy profundamente anidados. V8 v7.6 cambia a un analizador iterativo que administra su propia pila, que está limitada solo por la memoria disponible.

El nuevo analizador de JSON también es más eficiente en memoria. Al almacenar en búfer las propiedades antes de crear el objeto final, ahora podemos decidir cómo asignar el resultado de manera óptima. Para objetos con propiedades con nombre, asignamos objetos con la cantidad exacta de espacio necesario para las propiedades con nombre en los datos JSON entrantes (hasta 128 propiedades con nombre). En el caso de que los objetos JSON contengan nombres de propiedad indexados, asignamos un respaldo de elementos que utiliza la cantidad mínima de espacio; ya sea un arreglo plano o un diccionario. Los arreglos JSON ahora se interpretan en un arreglo que encaja exactamente con el número de elementos en los datos de entrada.

### Mejoras en arreglos congelados/asegurados

El rendimiento de llamadas en arreglos congelados o asegurados (y objetos similares a arreglos) recibió numerosas mejoras. V8 v7.6 mejora los siguientes patrones de codificación en JavaScript, donde `frozen` es un arreglo congelado o asegurado o un objeto similar a un arreglo:

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- llamadas con spread como `fn(...frozen)`
- llamadas con spread en un arreglo anidado como `fn(...[...frozen])`
- llamadas con apply y un spread de arreglo como `fn.apply(this, [...frozen])`

El gráfico a continuación muestra las mejoras.

![Gráfico mostrando el incremento en el rendimiento de una variedad de operaciones en arreglos](/_img/v8-release-76/frozen-sealed-elements.svg)

[Consulta el documento de diseño “elementos congelados y asegurados rápidos en V8”](https://bit.ly/fast-frozen-sealed-elements-in-v8) para más detalles.

### Manejo de cadenas Unicode

Una optimización al [convertir cadenas a Unicode](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea) dio como resultado una mejora significativa en la velocidad de llamadas como `String#localeCompare`, `String#normalize` y algunas de las APIs `Intl`. Por ejemplo, este cambio resultó en aproximadamente 2× más rendimiento bruto de `String#localeCompare` para cadenas de un byte.

## Características del lenguaje JavaScript

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled) proporciona una señal cuando todas las promesas de entrada están _liquidadas_, lo que significa que están _cumplidas_ o _rechazadas_. Esto es útil en casos donde no te importa el estado de la promesa, solo quieres saber cuándo se ha completado el trabajo, independientemente de si tuvo éxito o no. [Nuestro explicador sobre los combinadores de promesas](/features/promise-combinators) tiene más detalles e incluye un ejemplo.

### Mejor soporte para `BigInt`

[`BigInt`](/features/bigint) ahora cuenta con un mejor soporte de API en el lenguaje. Ahora puedes formatear un `BigInt` de manera localizable usando el método `toLocaleString`. Esto funciona igual que para números normales:

```js
12345678901234567890n.toLocaleString('es'); // 🐌
// → '12.345.678.901.234.567.890'
12345678901234567890n.toLocaleString('de'); // 🐌
// → '12.345.678.901.234.567.890'
```

Si planeas formatear múltiples números o `BigInt`s usando la misma configuración regional, es más eficiente usar la API `Intl.NumberFormat`, que ahora es compatible con `BigInt`s en sus métodos `format` y `formatToParts`. De esta manera, puedes crear una única instancia de formateador reutilizable.

```js
const nf = new Intl.NumberFormat('fr');
nf.format(12345678901234567890n); // 🚀
// → '12 345 678 901 234 567 890'
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: 'integer', value: '123' },
// →   { type: 'group', value: ' ' },
// →   { type: 'integer', value: '456' }
// → ]
```

### Mejoras en `Intl.DateTimeFormat`

Las aplicaciones suelen mostrar intervalos de fechas o rangos de fechas para indicar la duración de un evento, como una reserva de hotel, el período de facturación de un servicio o un festival de música. La API `Intl.DateTimeFormat` ahora admite los métodos `formatRange` y `formatRangeToParts` para formatear rangos de fechas de manera específica para cada localidad.

```js
const start = new Date('2019-05-07T09:20:00');
// → '7 de mayo de 2019'
const end = new Date('2019-05-09T16:00:00');
// → '9 de mayo de 2019'
const fmt = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const output = fmt.formatRange(start, end);
// → '7 – 9 de mayo de 2019'
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { 'type': 'month',   'value': 'mayo',  'source': 'shared' },
// →   { 'type': 'literal', 'value': ' ',    'source': 'shared' },
// →   { 'type': 'day',     'value': '7',    'source': 'startRange' },
// →   { 'type': 'literal', 'value': ' – ',  'source': 'shared' },
// →   { 'type': 'day',     'value': '9',    'source': 'endRange' },
// →   { 'type': 'literal', 'value': ', ',   'source': 'shared' },
// →   { 'type': 'year',    'value': '2019', 'source': 'shared' },
// → ]
```

Además, los métodos `format`, `formatToParts` y `formatRangeToParts` ahora admiten las nuevas opciones `timeStyle` y `dateStyle`:

```js
const dtf = new Intl.DateTimeFormat('de', {
  timeStyle: 'medium',
  dateStyle: 'short'
});
dtf.format(Date.now());
// → '19.06.19, 13:33:37'
```

## Recorrido nativo de pila

Aunque V8 puede recorrer su propia pila de llamadas (por ejemplo, al depurar o realizar perfiles en DevTools), el sistema operativo Windows no podía recorrer una pila de llamadas que contenga código generado por TurboFan al ejecutarse en la arquitectura x64. Esto podría causar _pilas rotas_ al usar depuradores nativos o muestreo ETW para analizar procesos que usan V8. Un cambio reciente permite que V8 [registre los metadatos necesarios](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0) para que Windows pueda recorrer estas pilas en x64, y en la versión 7.6 esto está habilitado por defecto.

## API de V8

Utilice `git log branch-heads/7.5..branch-heads/7.6 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.6 -t branch-heads/7.6` para experimentar con las nuevas funcionalidades en V8 v7.6. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funcionalidades pronto.
