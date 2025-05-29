---
title: "《Intl.Locale》"
author: "Mathias Bynens （[@mathias](https://twitter.com/mathias)）"
avatars:
  - "mathias-bynens"
date: 2019-05-20
tags:
  - Intl
  - Node.js 12
  - io19
description: "新的 Intl.Locale API 提供了一种统一的机制来处理语言环境，比直接使用字符串更方便。"
tweet: "待办"
---
处理 [国际化 API](/features/tags/intl) 时，通常通过向各种 `Intl` 构造函数传递表示语言环境 ID 的字符串，例如英语的 `‘en’`。[新的 `Intl.Locale` API](https://github.com/tc39/proposal-intl-locale) 提供了一个更强大的机制来处理这些语言环境。

<!--truncate-->
它可以轻松提取语言环境特定的偏好，例如不仅是语言，还包括日历、数字系统、小时制、地区等。

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

## `Intl.Locale` 支持

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="不支持"
                 safari="不支持"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="不支持"></feature-support>
