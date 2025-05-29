---
title: "`Intl.ListFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)) y Frank Yung-Fong Tang"
avatars:
  - "mathias-bynens"
  - "frank-tang"
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: "La API Intl.ListFormat permite la formateo localizado de listas sin sacrificar rendimiento."
tweet: "1074966915557351424"
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
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank and Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, and Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, and Harrison'
```

También se admiten disyunciones (“o” en inglés) a través del parámetro opcional `options`:

```js
const lf = new Intl.ListFormat('en', { type: 'disjunction' });
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank or Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, or Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, or Harrison'
```

Aquí hay un ejemplo de uso de un idioma diferente (chino, con código de idioma `zh`):

```js
const lf = new Intl.ListFormat('zh');
lf.format(['永鋒']);
// → '永鋒'
lf.format(['永鋒', '新宇']);
// → '永鋒和新宇'
lf.format(['永鋒', '新宇', '芳遠']);
// → '永鋒、新宇和芳遠'
lf.format(['永鋒', '新宇', '芳遠', '澤遠']);
// → '永鋒、新宇、芳遠和澤遠'
```

El parámetro `options` permite un uso más avanzado. Aquí hay un resumen de las diversas opciones y sus combinaciones, y cómo corresponden a los patrones de lista definidos por [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns):


| Tipo                  | Opciones                                   | Descripción                                                                                     | Ejemplos                         |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| estándar (o sin tipo) | `{}` (predeterminado)                      | Una lista típica de “y” para marcadores de posición arbitrarios                                 | `'January, February, and March'` |
| o                     | `{ type: 'disjunction' }`                 | Una lista típica de “o” para marcadores de posición arbitrarios                                 | `'January, February, or March'`  |
| unidad                | `{ type: 'unit' }`                        | Una lista adecuada para unidades grandes                                                       | `'3 feet, 7 inches'`             |
| unidad-corta          | `{ type: 'unit', style: 'short' }`        | Una lista adecuada para unidades cortas                                                        | `'3 ft, 7 in'`                   |
| unidad-estrecha       | `{ type: 'unit', style: 'narrow' }`       | Una lista adecuada para unidades estrechas, donde el espacio en la pantalla es muy limitado     | `'3′ 7″'`                        |


Tenga en cuenta que en muchos idiomas (como el inglés) puede no haber diferencia entre muchas de estas listas. En otros, el espacio, la longitud o presencia de una conjunción, y los separadores pueden cambiar.

## Conclusión

A medida que la API `Intl.ListFormat` se vuelve más ampliamente disponible, encontrarás que las bibliotecas dejarán de depender de bases de datos CLDR codificadas para usar la funcionalidad nativa de formato de lista, mejorando así el rendimiento en el tiempo de carga, el tiempo de análisis y compilación, el tiempo de ejecución y el uso de memoria.

## Soporte para `Intl.ListFormat`

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
