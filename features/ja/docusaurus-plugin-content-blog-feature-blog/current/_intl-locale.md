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
description: &apos;新しいIntl.Locale APIは、ロケールを扱うための統一された仕組みを提供し、文字列を使用するよりも便利です。&apos;
tweet: &apos;TODO&apos;
---
国際化API[internationalization APIs](/features/tags/intl)を扱う際には、`&apos;en&apos;`（英語）などのロケールIDを表す文字列をさまざまな`Intl`コンストラクターに渡すのが一般的です。[新しい`Intl.Locale` API](https://github.com/tc39/proposal-intl-locale)は、これらのロケールを処理するためのより強力な仕組みを提供します。

<!--truncate-->
これにより、言語だけでなく、カレンダー、数字の体系、時間のサイクル、地域など、ロケール固有の設定を簡単に抽出できます。

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

## `Intl.Locale` のサポート

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
