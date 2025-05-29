---
title: "더 빠르고 기능이 풍부한 국제화 API"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: 2019-04-25 16:45:37
avatars:
  - "sathya-gunasekaran"
tags:
  - ECMAScript
  - Intl
description: "JavaScript 국제화 API 성능이 향상되고 있으며 V8 구현도 더 빨라지고 있습니다!"
tweet: "1121424877142122500"
---
[ECMAScript 국제화 API 명세](https://tc39.es/ecma402/) (ECMA-402, 또는 `Intl`)는 날짜 형식 지정, 숫자 형식 지정, 복수형 선택 및 정렬과 같은 주요 지역별 기능을 제공합니다. Chrome V8과 Google 국제화 팀은 V8의 ECMA-402 구현에 기능을 추가하고 기술적 부채를 정리하며 성능과 다른 브라우저와의 상호 운용성을 개선하기 위해 협력하고 있습니다.

<!--truncate-->
## 기본적인 아키텍처 개선

초기 ECMA-402 명세는 주로 V8 확장을 사용하는 JavaScript로 구현되었으며 V8 코드베이스 외부에 존재했습니다. 외부 확장 API를 사용하면 V8 내부적으로 사용되는 API(예: 타입 검사, 외부 C++ 객체의 생명 주기 관리, 내부 비공개 데이터 저장소)를 사용할 수 없었습니다. 시작 성능을 개선하기 위해 이러한 내장 기능의 [스냅샷 생성](/blog/custom-startup-snapshots)을 가능하게 하기 위해 이 구현을 V8 코드베이스로 후에 이동시켰습니다.

V8은 ECMAScript에서 지정된 내장 JavaScript 객체(예: `Promise`, `Map`, `Set` 등)를 설명하기 위해 사용자 정의 [형태(숨겨진 클래스)](https://mathiasbynens.be/notes/shapes-ics)를 갖춘 특수 `JSObject`를 사용합니다. 이 접근 방식으로 V8은 필요한 내부 슬롯 수를 미리 할당하고 빠른 접근을 생성할 수 있으며, 속성을 하나씩 추가하여 성능 저하와 메모리 사용률 악화를 초래하는 것보다 더 효율적으로 작동합니다.

`Intl` 구현은 역사적인 분리에 따라 이러한 아키텍처를 따르지 않았습니다. 대신 국제화 명세에 지정된 내장 JavaScript 객체(`NumberFormat`, `DateTimeFormat` 등)가 여러 속성 추가를 통해 내부 슬롯에 대해 전환해야 하는 일반적인 `JSObject`였습니다.

특수 `JSObject`가 없기 때문에 타입 검사가 더 복잡했습니다. 타입 정보는 비공개 심볼 아래에 저장되어 JS 및 C++ 측에서 속성 접근 비용이 큰 방식으로 검사되었으며, 형태를 조회하는 것보다 더 느렸습니다.

### 코드베이스 현대화

V8에서 자체 호스팅된 내장 기능을 작성하지 않는 방향으로 이동하고 있는 가운데, 이 기회를 활용하여 ECMA402 구현을 현대화하는 것이 합리적이었습니다.

### 자체 호스팅 JS에서 벗어나기

자체 호스팅은 간결하고 읽기 쉬운 코드를 제공하지만 ICU API를 접근하기 위해 느린 런타임 호출을 자주 호출하는 것이 성능 문제를 일으켰습니다. 결과적으로 여러 ICU 기능이 JavaScript로 중복되어 이러한 런타임 호출 횟수를 줄였습니다.

내장 기능을 C++로 다시 작성함으로써 런타임 호출 오버헤드가 없어져서 이제 ICU API를 더 빠르게 접근할 수 있습니다.

### ICU 개선

ICU는 유니코드 및 세계화 지원을 제공하기 위해 모든 주요 JavaScript 엔진을 포함한 많은 애플리케이션에서 사용되는 C/C++ 라이브러리 세트입니다. V8의 구현에서 `Intl`을 ICU로 전환하는 과정에서 우리는 [몇 가지](https://unicode-org.atlassian.net/browse/ICU-20140) [ICU 버그를](https://unicode-org.atlassian.net/browse/ICU-9562) [발견](https://unicode-org.atlassian.net/browse/ICU-20098)하고 해결했습니다.

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat), [`Intl.ListFormat`](/features/intl-listformat) 및 `Intl.Locale`과 같은 새로운 제안 사항을 구현하는 과정에서 우리는 이러한 새로운 ECMAScript 제안을 지원하기 위해 [ICU에](https://unicode-org.atlassian.net/browse/ICU-13256) [여러](https://unicode-org.atlassian.net/browse/ICU-20121) [새로운](https://unicode-org.atlassian.net/browse/ICU-20342) API를 추가했습니다.

이 모든 추가 사항은 다른 JavaScript 엔진이 이러한 제안을 더 빨리 구현할 수 있게 돕고 웹을 발전시키는 데 기여합니다! 예를 들어, 우리 ICU 작업을 기반으로 새로운 여러 `Intl` API를 구현하기 위해 Firefox에서 개발이 진행되고 있습니다.

## 성능

이 작업의 결과로서 우리는 빠른 경로를 최적화하고 다양한 `Intl` 객체와 `Number.prototype`, `Date.prototype`, 및 `String.prototype`의 `toLocaleString` 메서드를 초기화하는 캐싱을 통해 국제화 API의 성능을 향상시켰습니다.

예를 들어, 새로운 `Intl.NumberFormat` 객체를 생성하는 속도가 약 24배 빨라졌습니다.

![[`Intl` 객체를 생성하는 성능을 테스트하기 위한](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js) 마이크로 벤치마크](/_img/intl/performance.svg)

더 나은 성능을 위해, `Intl.NumberFormat`, `Intl.DateTimeFormat` 또는 `Intl.Collator` 객체를 명시적으로 생성하고 *재사용*하는 것이 `toLocaleString` 또는 `localeCompare`와 같은 메서드를 호출하는 것보다 권장됩니다.

## 새로운 `Intl` 기능

이 모든 작업은 새로운 기능을 개발하는 훌륭한 기반을 제공했으며, 우리는 현재 Stage 3에 있는 모든 새로운 국제화 제안을 계속하여 제공하고 있습니다.

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat)는 Chrome 71에서 출시되었고, [`Intl.ListFormat`](/features/intl-listformat)는 Chrome 72에서, [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale)은 Chrome 74에서 출시되었습니다. 또한 [`dateStyle` 및 `timeStyle` 옵션이 있는 `Intl.DateTimeFormat`](https://github.com/tc39/proposal-intl-datetime-style)과 [`Intl.DateTimeFormat`의 BigInt 지원](https://github.com/tc39/ecma402/pull/236)은 Chrome 76에 출시되고 있습니다. [`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange), [`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/), 및 [`Intl.NumberFormat`의 추가 옵션들](https://github.com/tc39/proposal-unified-intl-numberformat/)은 현재 V8에서 개발 중이며, 곧 출시될 예정입니다!

이 새로운 API 중 많은 부분 및 이후의 기능들은 국제화를 돕기 위한 새로운 기능을 표준화하려는 작업의 결과입니다. [`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames)는 언어, 지역 또는 스크립트 표시 이름을 지역화할 수 있게 해주는 Stage 1 제안입니다. [`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange)는 날짜 범위를 간결하고 지역화된 방식으로 포맷하는 방법을 지정한 Stage 3 제안입니다. [통합된 `Intl.NumberFormat` API 제안](https://github.com/tc39/proposal-unified-intl-numberformat)은 측정 단위, 통화 및 사인 디스플레이 정책, 그리고 과학 및 축약 표기법을 지원함으로써 `Intl.NumberFormat`을 개선한 Stage 3 제안입니다. 여러분도 [GitHub 저장소](https://github.com/tc39/ecma402)에 기여하여 ECMA-402의 미래에 참여할 수 있습니다.

## 결론

`Intl`은 웹 응용 프로그램의 국제화 작업에서 필요한 여러 작업에 대해 기능이 풍부한 API를 제공하며, 데이터를 전송하거나 코드를 전송하는 부담 없이 이러한 작업을 브라우저에 맡깁니다. 이러한 API의 적절한 활용을 고민하면 다양한 지역에서 더 잘 작동하는 사용자 인터페이스를 만들 수 있습니다. Google V8 및 i18n 팀이 TC39 및 그 ECMA-402 하위 그룹과 협력하여 수행한 작업 덕분에 더 나은 성능을 제공하는 더 많은 기능에 접근할 수 있으며, 시간이 지남에 따라 추가적인 개선을 기대할 수 있습니다.
