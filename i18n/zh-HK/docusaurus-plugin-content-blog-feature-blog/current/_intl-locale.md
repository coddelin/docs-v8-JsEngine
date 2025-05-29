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
description: "全新的 Intl.Locale API 提供了一種統一的機制來處理語言環境，比使用字串更方便。"
tweet: "TODO"
---
在處理 [國際化 API](/features/tags/intl) 時，通常會將代表語言環境 ID 的字串傳遞給各種 `Intl` 建構函數，例如英語的 `'en'`。[全新的 `Intl.Locale` API](https://github.com/tc39/proposal-intl-locale) 提供了一種更強大的機制來處理這些語言環境。

<!--truncate-->
它可以輕鬆地提取語言環境相關的偏好設定，不僅包括語言，還包括日曆、數字系統、小時循環、地區等。

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

## `Intl.Locale` 支援

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
