---
title: "`Intl.RelativeTimeFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-10-22
tags: 
  - Intl
  - Node.js 12
  - io19
description: "Intl.RelativeTimeFormat를 사용하면 성능을 희생하지 않고 상대적인 시간을 로컬화된 형식으로 출력할 수 있습니다."
tweet: "1054387117571354624"
---
현대적인 웹 애플리케이션은 종종 &quot;어제&quot;, &quot;42초 전&quot;, &quot;3개월 후&quot;와 같은 구문을 사용하여 전체 날짜와 타임스탬프 대신 사용합니다. 이러한 _상대적인 시간 형식 값_은 매우 일반적으로 사용되어 여러 인기 있는 라이브러리에서 이러한 값을 로컬화된 형식으로 출력하는 유틸리티 함수를 구현하고 있습니다. (예로는 [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), 그리고 [date-fns](https://date-fns.org/docs/) 등이 있습니다.)

<!--truncate-->
로컬화된 상대 시간 포맷터를 구현하는 문제 중 하나는 지원하려는 각 언어에 대한 관례적인 단어 또는 구문(예: &quot;어제&quot; 또는 &quot;지난 분기&quot;) 목록이 필요하다는 것입니다. [Unicode CLDR](http://cldr.unicode.org/)은 이러한 데이터를 제공하지만 이를 JavaScript에서 사용하려면 JavaScript 코드와 함께 포함되어 제공되어야 합니다. 이는 불행히도 라이브러리를 위한 번들 크기를 증가시켜 로드 시간, 파싱/컴파일 비용, 메모리 소비에 부정적인 영향을 미칩니다.

새로운 `Intl.RelativeTimeFormat` API는 이러한 부담을 JavaScript 엔진으로 넘겨 로컬 데이터를 제공하고 이를 JavaScript 개발자가 직접 사용할 수 있도록 합니다. `Intl.RelativeTimeFormat`은 성능을 희생하지 않고 상대적인 시간을 로컬화된 형식으로 출력할 수 있도록 합니다.

## 사용 예

다음은 영어를 사용하여 상대 시간 포맷터를 생성하는 방법을 보여주는 예제입니다.

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

`Intl.RelativeTimeFormat` 생성자에 전달되는 인자는 [BCP 47 언어 태그](https://tools.ietf.org/html/rfc5646)를 담은 문자열이나 [그 언어 태그 배열](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)이 될 수 있습니다.

다음은 다른 언어(스페인어) 사용 예제입니다:

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

또한 `Intl.RelativeTimeFormat` 생성자는 선택적인 `options` 인자를 받아 출력에 대해 세부적인 제어를 제공합니다. 기본 설정에 기반한 일부 영어 출력의 유연성을 확인할 수 있습니다:

```js
// 영어를 사용하여 상대 시간 포맷터를 생성하고,
// 기본 설정을 사용합니다(이전처럼). 이 예제에서는 기본값을
// 명시적으로 전달합니다.
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // 다른 값: 'lookup'
  style: 'long', // 다른 값: 'short' 또는 'narrow'
  numeric: 'always', // 다른 값: 'auto'
});

// 이제 특수한 사례를 살펴봅시다!

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

위의 포맷터가 `'1 day ago'` 대신 `'yesterday'`를 출력하지 않았고, 약간 어색한 `'in 0 weeks'` 대신 `'this week'`를 출력하지 않는 것을 주목했을 것입니다. 이는 기본적으로 포맷터가 출력에 숫자 값을 사용하는 설정으로 동작하기 때문입니다.

이 동작을 변경하려면 `numeric` 옵션을 `'auto'`로 설정합니다(암묵적인 기본값인 `'always'` 대신):

```js
// 숫자 값을 항상 출력하지 않아도 되는 영어 상대 시간 포맷터를 생성합니다.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

다른 `Intl` 클래스와 유사하게 `Intl.RelativeTimeFormat`도 `format` 메서드 외에 `formatToParts` 메서드를 갖추고 있습니다. `format`은 일반적인 사용 사례를 다루지만, 생성된 출력의 개별 부분에 접근해야 할 경우 `formatToParts`가 유용할 수 있습니다:

```js
// 숫값을 항상 출력에 사용하지 않도록 설정한 영어 상대 시간 포매터를 생성합니다.
//
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: 'yesterday' }]

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: 'in ' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: ' weeks' }]
```

나머지 옵션과 해당 동작에 대한 자세한 정보는 [제안 저장소의 API 문서](https://github.com/tc39/proposal-intl-relative-time#api)를 참조하십시오.

## 결론

`Intl.RelativeTimeFormat`은 V8 v7.1 및 Chrome 71에서 기본적으로 사용 가능합니다. 이 API가 더 널리 사용됨에 따라 [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), [date-fns](https://date-fns.org/docs/) 등과 같은 라이브러리들이 하드코딩된 CLDR 데이터베이스에 의존하는 대신 네이티브 상대 시간 포맷팅 기능을 채택하여 로드 시간 성능, 파싱 및 컴파일 시간 성능, 실행 시간 성능, 메모리 사용량을 개선할 것입니다.

## `Intl.RelativeTimeFormat` 지원

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
