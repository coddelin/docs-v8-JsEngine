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
description: &apos;Новый API Intl.Locale предлагает унифицированный механизм работы с локалями, который является более удобным, чем использование строк.&apos;
tweet: &apos;TODO&apos;
---
При работе с [API интернационализации](/features/tags/intl) обычно передаются строки, представляющие идентификаторы локалей, в различные конструкторы `Intl`, такие как `&apos;en&apos;` для английского языка. [Новый API `Intl.Locale`](https://github.com/tc39/proposal-intl-locale) предлагает более мощный механизм работы с такими локалями.

<!--truncate-->
Он позволяет легко извлекать настройки, специфичные для конкретной локали, такие как не только язык, но и календарь, система исчисления, часовой цикл, регион и т.д.

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

## Поддержка `Intl.Locale`

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
