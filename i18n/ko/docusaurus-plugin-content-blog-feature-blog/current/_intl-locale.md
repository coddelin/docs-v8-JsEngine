---
title: "Intl.Locale"
author: "매티아스 바이넨스 ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-05-20
tags:
  - Intl
  - Node.js 12
  - io19
description: "새로운 Intl.Locale API는 로케일을 처리하기 위한 통합 메커니즘을 제공하며, 문자열을 사용하는 것보다 더 편리합니다."
tweet: "TODO"
---
[국제화 API](/features/tags/intl)를 다룰 때 영어의 경우 'en'과 같은 로케일 ID를 나타내는 문자열을 다양한 `Intl` 생성자에 전달하는 것이 일반적입니다. [새로운 `Intl.Locale` API](https://github.com/tc39/proposal-intl-locale)는 이러한 로케일을 처리하는 더 강력한 메커니즘을 제공합니다.

<!--truncate-->
이는 언어뿐만 아니라 달력, 숫자 체계, 시간 주기, 지역 등 로케일별 선호도를 쉽게 추출할 수 있게 합니다.

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

## `Intl.Locale` 지원

<feature-support chrome="74 /blog/v8-release-74#intl.locale"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
