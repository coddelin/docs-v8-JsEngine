---
title: "`Intl.DisplayNames`"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu)) y Frank Yung-Fong Tang"
avatars:
  - "shu-yu-guo"
  - "frank-tang"
date: 2020-02-13
tags:
  - Intl
  - Node.js 14
description: "La API Intl.DisplayNames permite nombres localizados de idiomas, regiones, escrituras y monedas."
tweet: "1232333889005334529"
---
Las aplicaciones web que alcanzan una audiencia global necesitan mostrar los nombres de visualización de idiomas, regiones, escrituras y monedas en muchos idiomas diferentes. Las traducciones de esos nombres requieren datos, que están disponibles en el [Unicode CLDR](http://cldr.unicode.org/translation/). Incluir los datos como parte de la aplicación implica un costo de tiempo de desarrollo. Es probable que los usuarios prefieran traducciones consistentes de los nombres de idiomas y regiones, y mantener esos datos actualizados con los acontecimientos geopolíticos del mundo requiere mantenimiento constante.

<!--truncate-->
Afortunadamente, la mayoría de los entornos de ejecución de JavaScript ya incluyen y mantienen actualizados esos mismos datos de traducción. La nueva API `Intl.DisplayNames` proporciona a los desarrolladores de JavaScript acceso directo a esas traducciones, permitiendo que las aplicaciones muestren nombres localizados de manera más sencilla.

## Ejemplos de uso

El siguiente ejemplo muestra cómo crear un objeto `Intl.DisplayNames` para obtener nombres de regiones en inglés utilizando [códigos de países de 2 letras según ISO-3166](https://www.iso.org/iso-3166-country-codes.html).

```js
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
regionNames.of('US');
// → 'United States'
regionNames.of('BA');
// → 'Bosnia & Herzegovina'
regionNames.of('MM');
// → 'Myanmar (Burma)'
```

El siguiente ejemplo obtiene nombres de idiomas en chino tradicional utilizando [gramática del identificador de idioma Unicode](http://unicode.org/reports/tr35/#Unicode_language_identifier).

```js
const languageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
languageNames.of('fr');
// → '法文'
languageNames.of('zh');
// → '中文'
languageNames.of('de');
// → '德文'
```

El siguiente ejemplo obtiene nombres de monedas en chino simplificado utilizando [códigos de moneda de 3 letras según ISO-4217](https://www.iso.org/iso-4217-currency-codes.html). En idiomas que tienen formas singulares y plurales distintas, los nombres de las monedas son singulares. Para las formas plurales, se puede usar [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat).

```js
const currencyNames = new Intl.DisplayNames(['zh-Hans'], {type: 'currency'});
currencyNames.of('USD');
// → '美元'
currencyNames.of('EUR');
// → '欧元'
currencyNames.of('JPY');
// → '日元'
currencyNames.of('CNY');
// → '人民币'
```

El siguiente ejemplo muestra el tipo final que se admite, escrituras, en inglés, utilizando [códigos de escrituras de 4 letras según ISO-15924](http://unicode.org/iso15924/iso15924-codes.html).

```js
const scriptNames = new Intl.DisplayNames(['en'], { type: 'script' });
scriptNames.of('Latn');
// → 'Latin'
scriptNames.of('Arab');
// → 'Arabic'
scriptNames.of('Kana');
// → 'Katakana'
```

Para un uso más avanzado, el segundo parámetro `options` también admite la propiedad `style`. La propiedad `style` corresponde a la dimensión del nombre de visualización y puede ser `"long"`, `"short"`, o `"narrow"`. Los valores para los diferentes estilos no siempre difieren. El valor predeterminado es `"long"`.

```js
const longLanguageNames = new Intl.DisplayNames(['en'], { type: 'language' });
longLanguageNames.of('en-US');
// → 'American English'
const shortLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'short' });
shortLanguageNames.of('en-US');
// → 'US English'
const narrowLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'narrow' });
narrowLanguageNames.of('en-US');
// → 'US English'
```

## API completa

La API completa de `Intl.DisplayNames` es la siguiente.

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

El constructor es coherente con otras APIs de `Intl`. Su primer argumento es una [lista de locales](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation), y su segundo parámetro es un parámetro `options` que acepta las propiedades `localeMatcher`, `type` y `style`.

La propiedad `"localeMatcher"` se trata igual que en [otras APIs de `Intl`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation). La propiedad `type` puede ser `"region"`, `"language"`, `"currency"`, o `"script"`. La propiedad `style` puede ser `"long"`, `"short"`, o `"narrow"`, siendo `"long"` el valor predeterminado.

`Intl.DisplayNames.prototype.of( code )` espera los siguientes formatos dependiendo del `type` de cómo se construya la instancia.

- Cuando `type` es `"region"`, `code` debe ser un [código de país de 2 letras según ISO-3166](https://www.iso.org/iso-3166-country-codes.html) o un [código de región de 3 dígitos según UN M49](https://unstats.un.org/unsd/methodology/m49/).
- Cuando `type` es `"language"`, `code` debe cumplir con la [gramática del identificador de idioma de Unicode](https://unicode.org/reports/tr35/#Unicode_language_identifier).
- Cuando `type` es `"currency"`, `code` debe ser un [código de moneda de 3 letras ISO-4217](https://www.iso.org/iso-4217-currency-codes.html).
- Cuando `type` es `"script"`, `code` debe ser un [código de script de 4 letras ISO-15924](https://unicode.org/iso15924/iso15924-codes.html).

## Conclusión

Como otras APIs de `Intl`, a medida que `Intl.DisplayNames` esté más ampliamente disponible, las bibliotecas y aplicaciones optarán por dejar de empaquetar y enviar sus propios datos de traducción en favor de usar la funcionalidad nativa.

## Soporte de `Intl.DisplayNames`

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
