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
description: "A nova API Intl.Locale oferece um mecanismo unificado para lidar com locais, e é mais conveniente do que usar strings."
tweet: "TODO"
---
Ao lidar com [APIs de internacionalização](/features/tags/intl), é comum passar strings que representam IDs de localidade para os diversos construtores de `Intl`, como `'en'` para inglês. [A nova API `Intl.Locale`](https://github.com/tc39/proposal-intl-locale) oferece um mecanismo mais poderoso para lidar com essas localidades.

<!--truncate-->
Ela permite extrair facilmente preferências específicas de localidade, como não apenas o idioma, mas também o calendário, o sistema de numeração, o ciclo de hora, a região e assim por diante.

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

## Suporte para `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
