---
title: 'V8 versión v9.9'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), en su 99%'
avatars:
 - 'ingvar-stepanyan'
date: 2022-01-31
tags:
 - lanzamiento
description: 'El lanzamiento de V8 v9.9 trae nuevas APIs de internacionalización.'
tweet: '1488190967727411210'
---
Cada cuatro semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se origina desde el Git principal de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9), que está en beta hasta su lanzamiento en coordinación con Chrome 99 Stable en varias semanas. V8 v9.9 está llena de novedades dirigidas a los desarrolladores. Esta publicación ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### Extensiones de Intl.Locale

En v7.4 lanzamos la [`API Intl.Locale`](https://v8.dev/blog/v8-release-74#intl.locale). Con v9.9, hemos añadido siete nuevas propiedades al objeto `Intl.Locale`: `calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones`, `textInfo` y `weekInfo`.

Las propiedades `calendars`, `collations`, `hourCycles`, `numberingSystems` y `timeZones` de `Intl.Locale` devuelven una matriz de identificadores preferidos de uso común, diseñados para usarse con otras APIs de `Intl`:

```js
const arabicEgyptLocale = new Intl.Locale('ar-EG')
// ar-EG
arabicEgyptLocale.calendars
// ['gregory', 'coptic', 'islamic', 'islamic-civil', 'islamic-tbla']
arabicEgyptLocale.collations
// ['compat', 'emoji', 'eor']
arabicEgyptLocale.hourCycles
// ['h12']
arabicEgyptLocale.numberingSystems
// ['arab']
arabicEgyptLocale.timeZones
// ['Africa/Cairo']
```

La propiedad `textInfo` de `Intl.Locale` devuelve un objeto que especifica la información relacionada con el texto. Actualmente solo tiene una propiedad, `direction`, para indicar la direccionalidad predeterminada del texto en la configuración regional. Está diseñada para usarse con el [atributo HTML `dir`](https://developer.mozilla.org/es/docs/Web/HTML/Global_attributes/dir) y con la [propiedad CSS `direction`](https://developer.mozilla.org/es/docs/Web/CSS/direction). Indica el orden de caracteres - `ltr` (izquierda a derecha) o `rtl` (derecha a izquierda):

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

La propiedad `weekInfo` de `Intl.Locale` devuelve un objeto que especifica la información relacionada con la semana. La propiedad `firstDay` en el objeto devuelto es un número, que va del 1 al 7, indicando qué día de la semana se considera el primer día, para propósitos del calendario. 1 especifica lunes, 2 - martes, 3 - miércoles, 4 - jueves, 5 - viernes, 6 - sábado, y 7 - domingo. La propiedad `minimalDays` en el objeto devuelto son los días mínimos requeridos en la primera semana de un mes o año, para propósitos del calendario. La propiedad `weekend` en el objeto devuelto es una matriz de enteros, usualmente con dos elementos, codificados igual que `firstDay`. Indica qué días de la semana se consideran parte del 'fin de semana', para propósitos del calendario. Ten en cuenta que el número de días en el fin de semana varía en cada configuración regional y puede no ser contiguo.

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// El primer día de la semana es sábado. El fin de semana es viernes y sábado.
// La primera semana de un mes o año es una semana que tiene al menos 1
// día en ese mes o año.
```

### Enumeración de Intl

En v9.9, hemos añadido una nueva función [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf) que devuelve la matriz de identificadores admitidos en v8 para las APIs de Intl. Los valores de `code` admitidos son `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone` y `unit`. La información de este nuevo método está diseñada para permitir que los desarrolladores web descubran fácilmente qué valor es compatible con la implementación.

```js
Intl.supportedValuesOf('calendar')
// ['buddhist', 'chinese', 'coptic', 'dangi', ...]

Intl.supportedValuesOf('collation')
// ['big5han', 'compat', 'dict', 'emoji', ...]

Intl.supportedValuesOf('currency')
// ['ADP', 'AED', 'AFA', 'AFN', 'ALK', 'ALL', 'AMD', ...]

Intl.supportedValuesOf('numberingSystem')
// ['adlm', 'ahom', 'arab', 'arabext', 'bali', ...]

Intl.supportedValuesOf('timeZone')
// ['Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', ...]

Intl.supportedValuesOf('unit')
// ['acre', 'bit', 'byte', 'celsius', 'centimeter', ...]
```

## API de V8

Por favor usa `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h` para obtener una lista de los cambios en la API.
