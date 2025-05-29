---
title: &apos;`Intl.PluralRules`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-10-04
tags:
  - Intl
description: &apos;Manejar plurales es uno de los muchos problemas que podrían parecer simples, hasta que te das cuenta de que cada idioma tiene sus propias reglas de pluralización. ¡La API Intl.PluralRules puede ayudar!&apos;
tweet: &apos;915542989493202944&apos;
---
La Iñtërnâtiônàlizætiøn es difícil. Manejar plurales es uno de los muchos problemas que podrían parecer simples, hasta que te das cuenta de que cada idioma tiene sus propias reglas de pluralización.

Para la pluralización en inglés, solo hay dos posibles resultados. Usemos la palabra “gato” como ejemplo:

- 1 gato, es decir, la forma `&apos;one&apos;`, conocida como el singular en inglés
- 2 gatos, pero también 42 gatos, 0.5 gatos, etc., es decir, la forma `&apos;other&apos;` (la única otra), conocida como el plural en inglés.

La nueva [API `Intl.PluralRules`](https://github.com/tc39/proposal-intl-plural-rules) te indica qué forma se aplica en un idioma que elijas, basado en un número dado.

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;);
pr.select(0);   // &apos;other&apos; (e.g. &apos;0 cats&apos;)
pr.select(0.5); // &apos;other&apos; (e.g. &apos;0.5 cats&apos;)
pr.select(1);   // &apos;one&apos;   (e.g. &apos;1 cat&apos;)
pr.select(1.5); // &apos;other&apos; (e.g. &apos;0.5 cats&apos;)
pr.select(2);   // &apos;other&apos; (e.g. &apos;0.5 cats&apos;)
```

<!--truncate-->
A diferencia de otras APIs de internacionalización, `Intl.PluralRules` es una API de bajo nivel que no realiza ningún formato por sí misma. En cambio, puedes construir tu propio formateador sobre ella:

```js
const suffixes = new Map([
  // Nota: en escenarios del mundo real, no codificarías de forma rígida los plurales
  // como este; formarían parte de tus archivos de traducción.
  [&apos;one&apos;,   &apos;cat&apos;],
  [&apos;other&apos;, &apos;cats&apos;],
]);
const pr = new Intl.PluralRules(&apos;en-US&apos;);
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // &apos;1 cat&apos;
formatCats(0);   // &apos;0 cats&apos;
formatCats(0.5); // &apos;0.5 cats&apos;
formatCats(1.5); // &apos;1.5 cats&apos;
formatCats(2);   // &apos;2 cats&apos;
```

Para las relativamente simples reglas de pluralización en inglés, esto podría parecer excesivo; sin embargo, no todos los idiomas siguen las mismas reglas. Algunos idiomas tienen solo una forma de pluralización, y otros idiomas tienen múltiples formas. [El galés](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), por ejemplo, ¡tiene seis formas de pluralización diferentes!

```js
const suffixes = new Map([
  [&apos;zero&apos;,  &apos;cathod&apos;],
  [&apos;one&apos;,   &apos;gath&apos;],
  // Nota: la forma `two` resulta ser la misma que la forma `&apos;one&apos;`
  // para esta palabra específicamente, pero eso no es cierto para
  // todas las palabras en galés.
  [&apos;two&apos;,   &apos;gath&apos;],
  [&apos;few&apos;,   &apos;cath&apos;],
  [&apos;many&apos;,  &apos;chath&apos;],
  [&apos;other&apos;, &apos;cath&apos;],
]);
const pr = new Intl.PluralRules(&apos;cy&apos;);
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // &apos;0 cathod&apos;
formatWelshCats(1);   // &apos;1 gath&apos;
formatWelshCats(1.5); // &apos;1.5 cath&apos;
formatWelshCats(2);   // &apos;2 gath&apos;
formatWelshCats(3);   // &apos;3 cath&apos;
formatWelshCats(6);   // &apos;6 chath&apos;
formatWelshCats(42);  // &apos;42 cath&apos;
```

Para implementar una pluralización correcta y al mismo tiempo admitir varios idiomas, se necesita una base de datos de idiomas y sus reglas de pluralización. [El Unicode CLDR](http://cldr.unicode.org/) incluye estos datos, pero para usarlos en JavaScript, deben ser integrados y enviados junto con tu otro código JavaScript, aumentando los tiempos de carga, análisis y uso de memoria. La API `Intl.PluralRules` transfiere esa carga al motor de JavaScript, permitiendo pluralizaciones internacionalizadas más eficientes.

:::note
**Nota:** Aunque los datos de CLDR incluyen el mapeo de formas por idioma, no incluyen una lista de formas singulares/plurales para palabras individuales. Aún debes traducir y proporcionar esos datos por tu cuenta, al igual que antes.
:::

## Números ordinales

La API `Intl.PluralRules` es compatible con varias reglas de selección a través de la propiedad `type` en el argumento opcional `options`. Su valor por defecto implícito (como se usa en los ejemplos anteriores) es `&apos;cardinal&apos;`. Para determinar el indicador ordinal para un número dado en su lugar (por ejemplo, `1` → `1st`, `2` → `2nd`, etc.), usa `{ type: &apos;ordinal&apos; }`:

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;, {
  type: &apos;ordinal&apos;
});
const suffixes = new Map([
  [&apos;one&apos;,   &apos;st&apos;],
  [&apos;two&apos;,   &apos;nd&apos;],
  [&apos;few&apos;,   &apos;rd&apos;],
  [&apos;other&apos;, &apos;th&apos;],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // &apos;0th&apos;
formatOrdinals(1);   // &apos;1st&apos;
formatOrdinals(2);   // &apos;2nd&apos;
formatOrdinals(3);   // &apos;3rd&apos;
formatOrdinals(4);   // &apos;4th&apos;
formatOrdinals(11);  // &apos;11th&apos;
formatOrdinals(21);  // &apos;21st&apos;
formatOrdinals(42);  // &apos;42nd&apos;
formatOrdinals(103); // &apos;103rd&apos;
```

`Intl.PluralRules` es una API de bajo nivel, especialmente en comparación con otras características de internacionalización. Por lo tanto, aunque no la estés utilizando directamente, podrías estar utilizando una biblioteca o marco que dependa de ella.

A medida que esta API se vuelva más ampliamente disponible, encontrarás bibliotecas como [Globalize](https://github.com/globalizejs/globalize#plural-module) dejando su dependencia en bases de datos CLDR predefinidas a favor de la funcionalidad nativa, mejorando así el rendimiento en el tiempo de carga, el tiempo de análisis, el tiempo de ejecución y el uso de memoria.

## Soporte para `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
