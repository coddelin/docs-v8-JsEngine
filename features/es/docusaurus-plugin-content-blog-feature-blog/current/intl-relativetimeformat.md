---
title: &apos;`Intl.RelativeTimeFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.RelativeTimeFormat permite el formato localizado de tiempos relativos sin sacrificar rendimiento.&apos;
tweet: &apos;1054387117571354624&apos;
---
Las aplicaciones web modernas suelen usar frases como “ayer”, “hace 42 segundos” o “en 3 meses” en lugar de fechas completas y marcas de tiempo. Estos _valores formateados en tiempo relativo_ se han vuelto tan comunes que varias bibliotecas populares implementan funciones utilitarias que los formatean de manera localizada. (Ejemplos incluyen [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), y [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Un problema al implementar un formateador de tiempo relativo localizado es que se necesita una lista de palabras o frases habituales (como “ayer” o “el último trimestre”) para cada idioma que se quiera soportar. [El Unicode CLDR](http://cldr.unicode.org/) proporciona estos datos, pero para usarlos en JavaScript, deben estar incrustados y enviados junto con el otro código de la biblioteca. Esto desafortunadamente aumenta el tamaño del paquete de dichas bibliotecas, lo que afecta negativamente los tiempos de carga, los costos de parsing/compilación y el consumo de memoria.

La nueva API `Intl.RelativeTimeFormat` transfiere esa responsabilidad al motor de JavaScript, que puede enviar los datos de localización y hacerlos directamente disponibles para los desarrolladores de JavaScript. `Intl.RelativeTimeFormat` permite el formato localizado de tiempos relativos sin sacrificar rendimiento.

## Ejemplos de uso

El siguiente ejemplo muestra cómo crear un formateador de tiempo relativo usando el idioma inglés.

```js
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;in 3.14 seconds&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;15 minutes ago&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;in 8 hours&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;2 days ago&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;5 months ago&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;in 2 quarters&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;42 years ago&apos;
```

Nota que el argumento pasado al constructor de `Intl.RelativeTimeFormat` puede ser una cadena que contenga [una etiqueta de idioma BCP 47](https://tools.ietf.org/html/rfc5646) o [un arreglo de dichas etiquetas de idioma](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Aquí hay un ejemplo usando un idioma diferente (español):

```js
const rtf = new Intl.RelativeTimeFormat(&apos;es&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;dentro de 3,14 segundos&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;hace 15 minutos&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;dentro de 8 horas&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;hace 2 días&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;dentro de 3 semanas&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;hace 5 meses&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;dentro de 2 trimestres&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;hace 42 años&apos;
```

Además, el constructor `Intl.RelativeTimeFormat` acepta un argumento opcional `options`, que otorga control de nivel fino sobre el resultado. Para ilustrar la flexibilidad, veamos más ejemplos en inglés basados en la configuración predeterminada:

```js
// Crear un formateador de tiempo relativo para el idioma inglés, usando
// la configuración predeterminada (igual que antes). En este ejemplo, los
// valores predeterminados son explícitamente pasados.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos;, // otros valores: &apos;lookup&apos;
  style: &apos;long&apos;, // otros valores: &apos;short&apos; o &apos;narrow&apos;
  numeric: &apos;always&apos;, // otros valores: &apos;auto&apos;
});

// Ahora, probemos algunos casos especiales.

rtf.format(-1, &apos;day&apos;);
// → &apos;1 day ago&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;in 0 days&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;in 1 day&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;1 week ago&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;in 0 weeks&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;in 1 week&apos;
```

Es posible que hayas notado que el formateador anterior produjo la cadena `&apos;1 day ago&apos;` en lugar de `&apos;yesterday&apos;`, y el ligeramente incómodo `&apos;in 0 weeks&apos;` en lugar de `&apos;this week&apos;`. Esto ocurre porque por defecto, el formateador usa el valor numérico en el resultado.

Para cambiar este comportamiento, establece la opción `numeric` en `&apos;auto&apos;` (en lugar del valor implícito predeterminado de `&apos;always&apos;`):

```js
// Crear un formateador de tiempo relativo para el idioma inglés que
// no siempre tenga que usar un valor numérico en el resultado.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;today&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;tomorrow&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;last week&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;this week&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;next week&apos;
```

Análogo a otras clases `Intl`, `Intl.RelativeTimeFormat` tiene un método `formatToParts` además del método `format`. Aunque `format` cubre el caso de uso más común, `formatToParts` puede ser útil si necesitas acceso a las partes individuales de la salida generada:

```js
// Crea un formateador de tiempo relativo para el idioma inglés que
// no siempre tenga que usar valores numéricos en la salida.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;yesterday&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;in &apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;week&apos; },
//    { type: &apos;literal&apos;, value: &apos; weeks&apos; }]
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
