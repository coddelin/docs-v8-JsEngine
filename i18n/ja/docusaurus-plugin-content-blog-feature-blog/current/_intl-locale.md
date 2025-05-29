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
description: "新しいIntl.Locale APIは、ロケールを扱うための統一された仕組みを提供し、文字列を使用するよりも便利です。"
tweet: "TODO"
---
国際化API[internationalization APIs](/features/tags/intl)を扱う際には、`'en'`（英語）などのロケールIDを表す文字列をさまざまな`Intl`コンストラクターに渡すのが一般的です。[新しい`Intl.Locale` API](https://github.com/tc39/proposal-intl-locale)は、これらのロケールを処理するためのより強力な仕組みを提供します。

<!--truncate-->
これにより、言語だけでなく、カレンダー、数字の体系、時間のサイクル、地域など、ロケール固有の設定を簡単に抽出できます。

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

## `Intl.Locale` のサポート

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
