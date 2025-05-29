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
description: &apos;Die neue API `Intl.Locale` bietet ein einheitliches Verfahren für den Umgang mit Sprachregionen und ist bequemer als die Verwendung von Zeichenfolgen.&apos;
tweet: &apos;TODO&apos;
---
Bei der Arbeit mit [Internationalisierungs-APIs](/features/tags/intl) ist es üblich, Zeichenfolgen, die Sprachregion-IDs darstellen, an die verschiedenen `Intl`-Konstruktoren zu übergeben, wie z. B. `&apos;en&apos;` für Englisch. [Der neue `Intl.Locale`-API](https://github.com/tc39/proposal-intl-locale) bietet ein leistungsfähigeres Verfahren für den Umgang mit solchen Sprachregionen.

<!--truncate-->
Es ermöglicht das einfache Extrahieren von sprachregionsspezifischen Präferenzen wie nicht nur der Sprache, sondern auch dem Kalender, dem Nummerierungssystem, dem Stundenzyklus, der Region und mehr.

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

## Unterstützung für `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
