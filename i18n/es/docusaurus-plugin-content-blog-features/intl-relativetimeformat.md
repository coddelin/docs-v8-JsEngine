---
title: "`Intl.RelativeTimeFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-10-22
tags: 
  - Intl
  - Node.js 12
  - io19
description: "Intl.RelativeTimeFormat permite el formato localizado de tiempos relativos sin sacrificar rendimiento."
tweet: "1054387117571354624"
---
Las aplicaciones web modernas suelen usar frases como “ayer”, “hace 42 segundos” o “en 3 meses” en lugar de fechas completas y marcas de tiempo. Estos _valores formateados en tiempo relativo_ se han vuelto tan comunes que varias bibliotecas populares implementan funciones utilitarias que los formatean de manera localizada. (Ejemplos incluyen [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), y [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Un problema al implementar un formateador de tiempo relativo localizado es que se necesita una lista de palabras o frases habituales (como “ayer” o “el último trimestre”) para cada idioma que se quiera soportar. [El Unicode CLDR](http://cldr.unicode.org/) proporciona estos datos, pero para usarlos en JavaScript, deben estar incrustados y enviados junto con el otro código de la biblioteca. Esto desafortunadamente aumenta el tamaño del paquete de dichas bibliotecas, lo que afecta negativamente los tiempos de carga, los costos de parsing/compilación y el consumo de memoria.

La nueva API `Intl.RelativeTimeFormat` transfiere esa responsabilidad al motor de JavaScript, que puede enviar los datos de localización y hacerlos directamente disponibles para los desarrolladores de JavaScript. `Intl.RelativeTimeFormat` permite el formato localizado de tiempos relativos sin sacrificar rendimiento.

## Ejemplos de uso

El siguiente ejemplo muestra cómo crear un formateador de tiempo relativo usando el idioma inglés.

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

Nota que el argumento pasado al constructor de `Intl.RelativeTimeFormat` puede ser una cadena que contenga [una etiqueta de idioma BCP 47](https://tools.ietf.org/html/rfc5646) o [un arreglo de dichas etiquetas de idioma](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Aquí hay un ejemplo usando un idioma diferente (español):

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

Además, el constructor `Intl.RelativeTimeFormat` acepta un argumento opcional `options`, que otorga control de nivel fino sobre el resultado. Para ilustrar la flexibilidad, veamos más ejemplos en inglés basados en la configuración predeterminada:

```js
// Crear un formateador de tiempo relativo para el idioma inglés, usando
// la configuración predeterminada (igual que antes). En este ejemplo, los
// valores predeterminados son explícitamente pasados.
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // otros valores: 'lookup'
  style: 'long', // otros valores: 'short' o 'narrow'
  numeric: 'always', // otros valores: 'auto'
});

// Ahora, probemos algunos casos especiales.

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

Es posible que hayas notado que el formateador anterior produjo la cadena `'1 day ago'` en lugar de `'yesterday'`, y el ligeramente incómodo `'in 0 weeks'` en lugar de `'this week'`. Esto ocurre porque por defecto, el formateador usa el valor numérico en el resultado.

Para cambiar este comportamiento, establece la opción `numeric` en `'auto'` (en lugar del valor implícito predeterminado de `'always'`):

```js
// Crear un formateador de tiempo relativo para el idioma inglés que
// no siempre tenga que usar un valor numérico en el resultado.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

Análogo a otras clases `Intl`, `Intl.RelativeTimeFormat` tiene un método `formatToParts` además del método `format`. Aunque `format` cubre el caso de uso más común, `formatToParts` puede ser útil si necesitas acceso a las partes individuales de la salida generada:

```js
// Crea un formateador de tiempo relativo para el idioma inglés que
// no siempre tenga que usar valores numéricos en la salida.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: 'yesterday' }]

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: 'in ' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: ' weeks' }]
```

Para más información sobre las demás opciones y su comportamiento, consulta [la documentación de la API en el repositorio de la propuesta](https://github.com/tc39/proposal-intl-relative-time#api).

## Conclusión

`Intl.RelativeTimeFormat` está disponible por defecto en V8 v7.1 y Chrome 71. A medida que esta API esté más ampliamente disponible, encontrarás librerías como [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) y [date-fns](https://date-fns.org/docs/) eliminando su dependencia de bases de datos CLDR codificadas a favor de la funcionalidad nativa de formato de tiempo relativo, mejorando así el rendimiento en el tiempo de carga, el tiempo de análisis y compilación, el tiempo de ejecución y el uso de memoria.

## Compatibilidad de `Intl.RelativeTimeFormat`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
