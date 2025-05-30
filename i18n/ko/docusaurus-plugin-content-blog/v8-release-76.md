---
title: "V8 릴리즈 v7.6"
author: "Adam Klein"
avatars: 
  - "adam-klein"
date: "2019-06-19 16:45:00"
tags: 
  - release
description: "V8 v7.6은 Promise.allSettled, 더 빠른 JSON.parse, 지역화된 BigInt, 더 빠른 frozen/sealed 배열 등 다양한 기능을 제공합니다!"
tweet: "1141356209179516930"
---
매 6주마다 [릴리즈 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 7.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6)을 발표하게 되어 기쁩니다. 이는 몇 주 후 Chrome 76 Stable과의 협업 릴리즈까지 베타 단계에 있습니다. V8 v7.6은 다양한 개발자 중심의 기능을 제공합니다. 출시를 기대하며 몇 가지 주요 사항을 미리 살펴봅니다.

<!--truncate-->
## 성능 (크기 & 속도)

### `JSON.parse` 개선

현대적인 JavaScript 애플리케이션에서는 JSON이 구조화된 데이터를 전달하기 위한 형식으로 자주 사용됩니다. JSON 파싱 속도를 높이면 이와 같은 통신 대기 시간을 줄일 수 있습니다. V8 v7.6에서는 JSON 파서를 대대적으로 개편하여 JSON을 스캔하고 파싱하는 속도를 크게 향상시켰습니다. 이를 통해 인기 웹 페이지에서 제공되는 데이터의 파싱 속도가 최대 2.7배 빨라집니다.

![다양한 웹사이트에서 `JSON.parse`의 성능 향상을 보여주는 차트](/_img/v8-release-76/json-parsing.svg)

V8 v7.5까지 JSON 파서는 들어오는 JSON 데이터의 중첩 깊이에 비례하여 네이티브 스택 공간을 사용하는 재귀 파서였습니다. 이는 매우 깊게 중첩된 JSON 데이터를 처리하는 경우 스택 초과를 초래할 수 있었습니다. V8 v7.6은 자체 스택을 관리하는 반복 파서를 사용하여 메모리가 허용하는 한 제한을 받지 않습니다.

새로운 JSON 파서는 또한 메모리 효율적입니다. 속성을 버퍼링한 후 최종 객체를 생성하기 전에 결과를 어떻게 최적화할지 결정할 수 있습니다. 이름이 지정된 속성을 가진 객체의 경우 들어오는 JSON 데이터에 필요한 공간만큼 객체를 정확히 할당합니다(128개의 이름이 지정된 속성까지). JSON 객체가 인덱스 속성 이름을 포함하는 경우 최소한의 공간을 사용하는 요소 백업 저장소(flat 배열이나 딕셔너리)를 할당합니다. JSON 배열은 입력 데이터의 요소 수에 정확히 맞는 배열로 파싱됩니다.

### Frozen/sealed 배열 개선

고정(frozen) 또는 봉인(sealed)된 배열(및 배열 유사 객체) 호출 성능이 크게 개선되었습니다. V8 v7.6은 `frozen`이 고정(frozen) 또는 봉인(sealed)된 배열 또는 배열 유사 객체인 경우 다음 JavaScript 코딩 패턴을 강화합니다.

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- `fn(...frozen)`와 같은 스프레드 호출
- `fn(...[...frozen])`와 같은 중첩 배열의 스프레드 호출
- `fn.apply(this, [...frozen])`와 같은 배열 스프레드로 호출

아래 차트는 개선 사항을 보여줍니다.

![다양한 배열 작업에서 성능 향상을 보여주는 차트](/_img/v8-release-76/frozen-sealed-elements.svg)

[V8의 고속 frozen & sealed 요소에 대한 디자인 문서](https://bit.ly/fast-frozen-sealed-elements-in-v8)를 참조하십시오.

### 유니코드 문자열 처리

[문자열을 유니코드로 변환](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea)하는 최적화로 인해 `String#localeCompare`, `String#normalize` 및 일부 `Intl` API와 같은 호출 속도가 크게 개선되었습니다. 예를 들어, 이 변경으로 인해 한 바이트 문자열의 `String#localeCompare` 처리량이 약 2배 증가했습니다.

## 자바스크립트 언어 기능

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled)는 입력된 모든 프로미스가 _settled_되었을 때 신호를 제공합니다. 이는 프로미스 상태에 관계없이 작업이 완료되었음을 알기만 하면 되는 경우 유용합니다. [promise 결합자에 대한 우리의 설명서](/features/promise-combinators)에서 더 많은 세부 사항과 예제를 확인할 수 있습니다.

### 개선된 `BigInt` 지원

[`BigInt`](/features/bigint)는 이제 언어에서 더 나은 API 지원을 제공합니다. `toLocaleString` 메서드를 사용하여 지역화 형태로 `BigInt`를 포맷할 수 있습니다. 이는 일반 숫자와 동일하게 작동합니다:

```js
12345678901234567890n.toLocaleString('en'); // 🐌
// → '12,345,678,901,234,567,890'
12345678901234567890n.toLocaleString('de'); // 🐌
// → '12.345.678.901.234.567.890'
```

같은 지역화 형식을 사용해 여러 숫자 또는 `BigInt`를 포맷하려는 경우, `Intl.NumberFormat` API를 사용하는 것이 더 효율적입니다. 이 API는 이제 `format` 및 `formatToParts` 메서드에서 `BigInt`를 지원합니다. 이렇게 하면 재사용 가능한 포맷터 인스턴스를 생성할 수 있습니다.

```js
const nf = new Intl.NumberFormat('fr');
nf.format(12345678901234567890n); // 🚀
// → '12345 678 901 234 567 890'
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: 'integer', value: '123' },
// →   { type: 'group', value: ' ' },
// →   { type: 'integer', value: '456' }
// → ]
```

### `Intl.DateTimeFormat` 개선 사항

앱은 호텔 예약, 서비스 청구 주기, 음악 축제와 같은 이벤트 기간을 나타내기 위해 날짜 간격 또는 날짜 범위를 자주 표시합니다. `Intl.DateTimeFormat` API는 이제 로캘별 방식으로 날짜 범위를 편리하게 형식화할 수 있는 `formatRange` 및 `formatRangeToParts` 메서드를 지원합니다.

```js
const start = new Date('2019-05-07T09:20:00');
// → '2019년 5월 7일'
const end = new Date('2019-05-09T16:00:00');
// → '2019년 5월 9일'
const fmt = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const output = fmt.formatRange(start, end);
// → '2019년 5월 7일 – 9일'
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { 'type': 'month',   'value': 'May',  'source': 'shared' },
// →   { 'type': 'literal', 'value': ' ',    'source': 'shared' },
// →   { 'type': 'day',     'value': '7',    'source': 'startRange' },
// →   { 'type': 'literal', 'value': ' – ',  'source': 'shared' },
// →   { 'type': 'day',     'value': '9',    'source': 'endRange' },
// →   { 'type': 'literal', 'value': ', ',   'source': 'shared' },
// →   { 'type': 'year',    'value': '2019', 'source': 'shared' },
// → ]
```

추가적으로, `format`, `formatToParts`, `formatRangeToParts` 메서드는 이제 새로운 `timeStyle` 및 `dateStyle` 옵션을 지원합니다:

```js
const dtf = new Intl.DateTimeFormat('de', {
  timeStyle: 'medium',
  dateStyle: 'short'
});
dtf.format(Date.now());
// → '19.06.19, 13:33:37'
```

## 네이티브 스택 탐색

V8은 자체 호출 스택을 탐색할 수 있지만(예: 디버깅 또는 DevTools에서 프로파일링 시), Windows 운영 체제는 x64 아키텍처에서 TurboFan이 생성한 코드를 포함하는 호출 스택을 탐색할 수 없었습니다. 이는 V8을 사용하는 프로세스를 분석할 때 네이티브 디버거 또는 ETW 샘플링을 사용하면 _깨진 스택_을 유발할 수 있었습니다. 최근 변경 사항으로 Windows가 x64에서 이러한 스택을 탐색할 수 있도록 [필요한 메타데이터를 등록](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0)하도록 V8을 활성화했으며, v7.6에서는 기본적으로 활성화되었습니다.

## V8 API

API 변경 사항 목록을 얻으려면 `git log branch-heads/7.5..branch-heads/7.6 include/v8.h`를 사용하십시오.

현재 [V8 체크아웃 사용 중](/docs/source-code#using-git)인 개발자는 `git checkout -b 7.6 -t branch-heads/7.6`을 사용하여 V8 v7.6의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널 을 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능을 직접 시도해 볼 수 있습니다.
