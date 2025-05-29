---
title: '`Intl.Locale`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-05-20
tags:
  - Intl
  - Node.js 12
  - io19
description: 'Новый API Intl.Locale предлагает унифицированный механизм работы с локалями, который является более удобным, чем использование строк.'
tweet: 'TODO'
---
При работе с [API интернационализации](/features/tags/intl) обычно передаются строки, представляющие идентификаторы локалей, в различные конструкторы `Intl`, такие как `'en'` для английского языка. [Новый API `Intl.Locale`](https://github.com/tc39/proposal-intl-locale) предлагает более мощный механизм работы с такими локалями.

<!--truncate-->
Он позволяет легко извлекать настройки, специфичные для конкретной локали, такие как не только язык, но и календарь, система исчисления, часовой цикл, регион и т.д.

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

## Поддержка `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
