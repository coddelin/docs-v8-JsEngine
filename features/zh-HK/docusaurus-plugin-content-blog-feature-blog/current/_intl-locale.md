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
description: &apos;全新的 Intl.Locale API 提供了一種統一的機制來處理語言環境，比使用字串更方便。&apos;
tweet: &apos;TODO&apos;
---
在處理 [國際化 API](/features/tags/intl) 時，通常會將代表語言環境 ID 的字串傳遞給各種 `Intl` 建構函數，例如英語的 `&apos;en&apos;`。[全新的 `Intl.Locale` API](https://github.com/tc39/proposal-intl-locale) 提供了一種更強大的機制來處理這些語言環境。

<!--truncate-->
它可以輕鬆地提取語言環境相關的偏好設定，不僅包括語言，還包括日曆、數字系統、小時循環、地區等。

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

## `Intl.Locale` 支援

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
