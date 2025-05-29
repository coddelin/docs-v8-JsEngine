---
title: "`Intl.PluralRules`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-10-04
tags:
  - Intl
description: "Manejar plurales es uno de los muchos problemas que podrían parecer simples, hasta que te das cuenta de que cada idioma tiene sus propias reglas de pluralización. ¡La API Intl.PluralRules puede ayudar!"
tweet: "915542989493202944"
---
La Iñtërnâtiônàlizætiøn es difícil. Manejar plurales es uno de los muchos problemas que podrían parecer simples, hasta que te das cuenta de que cada idioma tiene sus propias reglas de pluralización.

Para la pluralización en inglés, solo hay dos posibles resultados. Usemos la palabra “gato” como ejemplo:

- 1 gato, es decir, la forma `'one'`, conocida como el singular en inglés
- 2 gatos, pero también 42 gatos, 0.5 gatos, etc., es decir, la forma `'other'` (la única otra), conocida como el plural en inglés.

La nueva [API `Intl.PluralRules`](https://github.com/tc39/proposal-intl-plural-rules) te indica qué forma se aplica en un idioma que elijas, basado en un número dado.

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (e.g. '0 cats')
pr.select(0.5); // 'other' (e.g. '0.5 cats')
pr.select(1);   // 'one'   (e.g. '1 cat')
pr.select(1.5); // 'other' (e.g. '0.5 cats')
pr.select(2);   // 'other' (e.g. '0.5 cats')
```

<!--truncate-->
A diferencia de otras APIs de internacionalización, `Intl.PluralRules` es una API de bajo nivel que no realiza ningún formato por sí misma. En cambio, puedes construir tu propio formateador sobre ella:

```js
const suffixes = new Map([
  // Nota: en escenarios del mundo real, no codificarías de forma rígida los plurales
  // como este; formarían parte de tus archivos de traducción.
  ['one',   'cat'],
  ['other', 'cats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 cat'
formatCats(0);   // '0 cats'
formatCats(0.5); // '0.5 cats'
formatCats(1.5); // '1.5 cats'
formatCats(2);   // '2 cats'
```

Para las relativamente simples reglas de pluralización en inglés, esto podría parecer excesivo; sin embargo, no todos los idiomas siguen las mismas reglas. Algunos idiomas tienen solo una forma de pluralización, y otros idiomas tienen múltiples formas. [El galés](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), por ejemplo, ¡tiene seis formas de pluralización diferentes!

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // Nota: la forma `two` resulta ser la misma que la forma `'one'`
  // para esta palabra específicamente, pero eso no es cierto para
  // todas las palabras en galés.
  ['two',   'gath'],
  ['few',   'cath'],
  ['many',  'chath'],
  ['other', 'cath'],
]);
const pr = new Intl.PluralRules('cy');
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // '0 cathod'
formatWelshCats(1);   // '1 gath'
formatWelshCats(1.5); // '1.5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

Para implementar una pluralización correcta y al mismo tiempo admitir varios idiomas, se necesita una base de datos de idiomas y sus reglas de pluralización. [El Unicode CLDR](http://cldr.unicode.org/) incluye estos datos, pero para usarlos en JavaScript, deben ser integrados y enviados junto con tu otro código JavaScript, aumentando los tiempos de carga, análisis y uso de memoria. La API `Intl.PluralRules` transfiere esa carga al motor de JavaScript, permitiendo pluralizaciones internacionalizadas más eficientes.

:::note
**Nota:** Aunque los datos de CLDR incluyen el mapeo de formas por idioma, no incluyen una lista de formas singulares/plurales para palabras individuales. Aún debes traducir y proporcionar esos datos por tu cuenta, al igual que antes.
:::

## Números ordinales

La API `Intl.PluralRules` es compatible con varias reglas de selección a través de la propiedad `type` en el argumento opcional `options`. Su valor por defecto implícito (como se usa en los ejemplos anteriores) es `'cardinal'`. Para determinar el indicador ordinal para un número dado en su lugar (por ejemplo, `1` → `1st`, `2` → `2nd`, etc.), usa `{ type: 'ordinal' }`:

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0th'
formatOrdinals(1);   // '1st'
formatOrdinals(2);   // '2nd'
formatOrdinals(3);   // '3rd'
formatOrdinals(4);   // '4th'
formatOrdinals(11);  // '11th'
formatOrdinals(21);  // '21st'
formatOrdinals(42);  // '42nd'
formatOrdinals(103); // '103rd'
```

`Intl.PluralRules` es una API de bajo nivel, especialmente en comparación con otras características de internacionalización. Por lo tanto, aunque no la estés utilizando directamente, podrías estar utilizando una biblioteca o marco que dependa de ella.

A medida que esta API se vuelva más ampliamente disponible, encontrarás bibliotecas como [Globalize](https://github.com/globalizejs/globalize#plural-module) dejando su dependencia en bases de datos CLDR predefinidas a favor de la funcionalidad nativa, mejorando así el rendimiento en el tiempo de carga, el tiempo de análisis, el tiempo de ejecución y el uso de memoria.

## Soporte para `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
