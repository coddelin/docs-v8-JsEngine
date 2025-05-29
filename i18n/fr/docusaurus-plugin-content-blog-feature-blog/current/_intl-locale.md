---
title: "`Intl.Locale`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-05-20
tags:
  - Intl
  - Node.js 12
  - io19
description: 'La nouvelle API Intl.Locale offre un mécanisme unifié pour gérer les paramètres régionaux et est plus pratique que l'utilisation de chaînes.'
tweet: "TODO"
---
Lorsqu'on traite des [API d'internationalisation](/features/tags/intl), il est courant de passer des chaînes représentant des identifiants de paramètres régionaux aux différents constructeurs `Intl`, tels que `'en'` pour l'anglais. [La nouvelle API `Intl.Locale`](https://github.com/tc39/proposal-intl-locale) offre un mécanisme plus puissant pour gérer ces paramètres régionaux.

<!--truncate-->
Elle permet d'extraire facilement les préférences spécifiques aux paramètres régionaux, comme non seulement la langue, mais aussi le calendrier, le système de numérotation, le cycle horaire, la région, et ainsi de suite.

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → 'es-419-u-ca-gregory-hc-h12'
```

## Prise en charge de `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="non"
                 safari="non"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="non"></feature-support>
