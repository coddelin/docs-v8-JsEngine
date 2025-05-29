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
description: &apos;La nueva API Intl.Locale ofrece un mecanismo unificado para manejar locales y es más conveniente que usar cadenas.&apos;
tweet: &apos;TODO&apos;
---
Al trabajar con [APIs de internacionalización](/features/tags/intl), es común pasar cadenas que representan identificadores de locales a los diversos constructores de `Intl`, como `&apos;en&apos;` para inglés. [La nueva API `Intl.Locale`](https://github.com/tc39/proposal-intl-locale) ofrece un mecanismo más poderoso para manejar dichos locales.

<!--truncate-->
Permite extraer fácilmente preferencias específicas del locale, como no solo el idioma, sino también el calendario, el sistema de numeración, el ciclo horario, la región, y más.

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

## Compatibilidad de `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
