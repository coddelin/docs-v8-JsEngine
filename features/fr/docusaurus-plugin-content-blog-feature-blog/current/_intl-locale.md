---
title: &apos;`Intl.Locale`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-05-20
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;La nouvelle API Intl.Locale offre un mécanisme unifié pour gérer les paramètres régionaux et est plus pratique que l&apos;utilisation de chaînes.&apos;
tweet: &apos;TODO&apos;
---
Lorsqu&apos;on traite des [API d&apos;internationalisation](/features/tags/intl), il est courant de passer des chaînes représentant des identifiants de paramètres régionaux aux différents constructeurs `Intl`, tels que `&apos;en&apos;` pour l&apos;anglais. [La nouvelle API `Intl.Locale`](https://github.com/tc39/proposal-intl-locale) offre un mécanisme plus puissant pour gérer ces paramètres régionaux.

<!--truncate-->
Elle permet d&apos;extraire facilement les préférences spécifiques aux paramètres régionaux, comme non seulement la langue, mais aussi le calendrier, le système de numérotation, le cycle horaire, la région, et ainsi de suite.

```js
const locale = new Intl.Locale(&apos;es-419-u-hc-h12&apos;, {
  calendar: &apos;gregory&apos;
});
locale.language;
// → &apos;es&apos;
locale.calendar;
// → &apos;gregory&apos;
locale.hourCycle;
// → &apos;h12&apos;
locale.region;
// → &apos;419&apos;
locale.toString();
// → &apos;es-419-u-ca-gregory-hc-h12&apos;
```

## Prise en charge de `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="non"
                 safari="non"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="non"></feature-support>
