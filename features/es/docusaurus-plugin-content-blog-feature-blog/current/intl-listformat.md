---
title: &apos;`Intl.ListFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)) y Frank Yung-Fong Tang&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;frank-tang&apos;
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;La API Intl.ListFormat permite la formateo localizado de listas sin sacrificar rendimiento.&apos;
tweet: &apos;1074966915557351424&apos;
---
Las aplicaciones web modernas suelen usar listas que consisten en datos dinámicos. Por ejemplo, una aplicación de visualización de fotos podría mostrar algo como:

> Esta foto incluye **Ada, Edith, _y_ Grace**.

Un juego basado en texto podría tener un tipo diferente de lista:

> Elige tu superpoder: **invisibilidad, psicokinesis, _o_ empatía**.

Como cada idioma tiene diferentes convenciones y palabras para el formato de listas, implementar un formateador de listas localizado no es trivial. Esto no solo requiere una lista de todas las palabras (como “y” u “o” en los ejemplos anteriores) para cada idioma que se quiera soportar, sino que también es necesario codificar las convenciones de formato exactas para todos esos idiomas. [El CLDR de Unicode](http://cldr.unicode.org/translation/lists) proporciona estos datos, pero para usarlos en JavaScript, deben estar integrados y enviados junto con el código de otras bibliotecas. Esto desafortunadamente aumenta el tamaño del paquete de dichas bibliotecas, lo que impacta negativamente los tiempos de carga, los costos de parseo/compilación y el consumo de memoria.

<!--truncate-->
La nueva API `Intl.ListFormat` transfiere esa carga al motor de JavaScript, que puede enviar los datos de los idiomas y ponerlos directamente a disposición de los desarrolladores de JavaScript. `Intl.ListFormat` permite el formateo localizado de listas sin sacrificar rendimiento.

## Ejemplos de uso

El siguiente ejemplo muestra cómo crear un formateador de listas para conjunciones utilizando el idioma inglés:

```js
const lf = new Intl.ListFormat(&apos;en&apos;);
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank and Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, and Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, and Harrison&apos;
```

También se admiten disyunciones (“o” en inglés) a través del parámetro opcional `options`:

```js
const lf = new Intl.ListFormat(&apos;en&apos;, { type: &apos;disjunction&apos; });
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank or Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, or Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, or Harrison&apos;
```

Aquí hay un ejemplo de uso de un idioma diferente (chino, con código de idioma `zh`):

```js
const lf = new Intl.ListFormat(&apos;zh&apos;);
lf.format([&apos;永鋒&apos;]);
// → &apos;永鋒&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;]);
// → &apos;永鋒和新宇&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;]);
// → &apos;永鋒、新宇和芳遠&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;, &apos;澤遠&apos;]);
// → &apos;永鋒、新宇、芳遠和澤遠&apos;
```

El parámetro `options` permite un uso más avanzado. Aquí hay un resumen de las diversas opciones y sus combinaciones, y cómo corresponden a los patrones de lista definidos por [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns):


| Tipo                  | Opciones                                   | Descripción                                                                                     | Ejemplos                         |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| estándar (o sin tipo) | `{}` (predeterminado)                      | Una lista típica de “y” para marcadores de posición arbitrarios                                 | `&apos;January, February, and March&apos;` |
| o                     | `{ type: &apos;disjunction&apos; }`                 | Una lista típica de “o” para marcadores de posición arbitrarios                                 | `&apos;January, February, or March&apos;`  |
| unidad                | `{ type: &apos;unit&apos; }`                        | Una lista adecuada para unidades grandes                                                       | `&apos;3 feet, 7 inches&apos;`             |
| unidad-corta          | `{ type: &apos;unit&apos;, style: &apos;short&apos; }`        | Una lista adecuada para unidades cortas                                                        | `&apos;3 ft, 7 in&apos;`                   |
| unidad-estrecha       | `{ type: &apos;unit&apos;, style: &apos;narrow&apos; }`       | Una lista adecuada para unidades estrechas, donde el espacio en la pantalla es muy limitado     | `&apos;3′ 7″&apos;`                        |


Tenga en cuenta que en muchos idiomas (como el inglés) puede no haber diferencia entre muchas de estas listas. En otros, el espacio, la longitud o presencia de una conjunción, y los separadores pueden cambiar.

## Conclusión

A medida que la API `Intl.ListFormat` se vuelve más ampliamente disponible, encontrarás que las bibliotecas dejarán de depender de bases de datos CLDR codificadas para usar la funcionalidad nativa de formato de lista, mejorando así el rendimiento en el tiempo de carga, el tiempo de análisis y compilación, el tiempo de ejecución y el uso de memoria.

## Soporte para `Intl.ListFormat`

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
