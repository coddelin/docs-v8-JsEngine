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
description: &apos;A nova API Intl.Locale oferece um mecanismo unificado para lidar com locais, e é mais conveniente do que usar strings.&apos;
tweet: &apos;TODO&apos;
---
Ao lidar com [APIs de internacionalização](/features/tags/intl), é comum passar strings que representam IDs de localidade para os diversos construtores de `Intl`, como `&apos;en&apos;` para inglês. [A nova API `Intl.Locale`](https://github.com/tc39/proposal-intl-locale) oferece um mecanismo mais poderoso para lidar com essas localidades.

<!--truncate-->
Ela permite extrair facilmente preferências específicas de localidade, como não apenas o idioma, mas também o calendário, o sistema de numeração, o ciclo de hora, a região e assim por diante.

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

## Suporte para `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
