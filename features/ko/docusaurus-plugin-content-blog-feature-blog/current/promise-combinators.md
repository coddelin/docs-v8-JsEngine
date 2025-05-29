---
title: &apos;Promise 조합자들&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-12
tags:
  - ECMAScript
  - ES2020
  - ES2021
  - io19
  - Node.js 16
description: &apos;자바스크립트에는 네 가지 Promise 조합자가 있습니다: Promise.all, Promise.race, Promise.allSettled, 그리고 Promise.any.&apos;
tweet: &apos;1138819493956710400&apos;
---
ES2015에서 Promise가 도입된 이후, 자바스크립트는 정확히 두 가지 Promise 조합자: `Promise.all` 과 `Promise.race`를 지원했습니다.

현재 두 가지 새로운 제안인 `Promise.allSettled`와 `Promise.any`가 표준화 과정을 진행 중입니다. 이 추가들로 인해 자바스크립트에는 총 네 가지 Promise 조합자가 존재하게 되며, 각각 다른 사용 사례를 가능하게 합니다.

<!--truncate-->
다음은 네 가지 조합자들의 개요입니다:


| 이름                                        | 설명                                      | 상태                                                           |
| ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | 단축 판단하지 않음                          | [ES2020에 추가됨 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)               | 입력 값 중 하나가 거부될 때 단축 판단         | ES2015에 추가됨 ✅                                              |
| [`Promise.race`](#promise.race)             | 입력 값 중 하나가 완료될 때 단축 판단         | ES2015에 추가됨 ✅                                              |
| [`Promise.any`](#promise.any)               | 입력 값 중 하나가 성공 시 단축 판단          | [ES2021에 추가됨 ✅](https://github.com/tc39/proposal-promise-any)        |


각 조합자의 사용 사례를 예로 살펴보겠습니다.

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all`은 모든 입력 Promise가 이행되었는지 또는 하나가 거부되었는지를 알 수 있게 합니다.

사용자가 버튼을 클릭했을 때 전혀 새로운 UI를 렌더링하기 위해 여러 스타일시트를 로드하고 싶다고 상상해 보십시오. 이 프로그램은 각 스타일시트에 대해 병렬로 HTTP 요청을 시작합니다:

```js
const promises = [
  fetch(&apos;/component-a.css&apos;),
  fetch(&apos;/component-b.css&apos;),
  fetch(&apos;/component-c.css&apos;),
];
try {
  const styleResponses = await Promise.all(promises);
  enableStyles(styleResponses);
  renderNewUi();
} catch (reason) {
  displayError(reason);
}
```

모든 요청이 성공한 경우에만 새 UI 렌더링을 시작하고 싶습니다. 문제가 생겼을 경우, 다른 작업이 끝나기를 기다릴 필요 없이 가능한 한 빨리 오류 메시지를 표시해야 합니다.

이런 경우 `Promise.all`을 사용할 수 있습니다: 모든 Promise가 이행되거나, 하나가 거부되는 즉시 알기를 원하기 때문입니다.

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race`는 여러 Promises를 실행하면서 둘 중 하나를 원할 때 유용합니다...

1. (Promise가 이행되는 경우) 가장 먼저 도착하는 성공적인 결과를 처리하거나, _또는_
2. Promises 중 하나가 거부되자마자 처리할 때.

즉, Promise 중 하나가 거부되면, 이 거부를 유지하여 오류 케이스를 별도로 처리하고 싶다는 것입니다. 다음 예는 정확히 그것을 수행합니다:

```js
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ]);
  renderResult(result);
} catch (error) {
  renderError(error);
}
```

계산적으로 비용이 많이 드는 작업을 시작하지만, 2초 후에 거부되는 Promise와 경주를 벌입니다. 먼저 이행되거나 거부되는 Promise에 따라, 계산된 결과 또는 오류 메시지를 별도의 코드 경로로 렌더링합니다.

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled`는 모든 입력 Promise가 완료(즉, 이행되거나 거부됨)되었음을 나타냅니다. Promise 상태에 상관없이 작업이 완료되었는지 여부만 알고 싶을 때 유용합니다.

예를 들어, 독립적인 API 호출 시리즈를 시작하고 `Promise.allSettled`을 사용하여 모든 호출이 완료된 후 로딩 스피너를 제거하는 등의 작업을 수행할 수 있습니다:

```js
const promises = [
  fetch(&apos;/api-call-1&apos;),
  fetch(&apos;/api-call-2&apos;),
  fetch(&apos;/api-call-3&apos;),
];
// 이 요청들 중 일부가 실패하고 일부가 성공한다고 가정해봅시다.

await Promise.allSettled(promises);
// 모든 API 호출이 종료되었음 (성공 또는 실패).
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any`은 여러 개의 promise 중 하나라도 완료되면 바로 신호를 제공합니다. `Promise.race`와 유사하지만, `any`는 promise 중 하나가 실패할 경우 조기 실패하지 않습니다.

```js
const promises = [
  fetch(&apos;/endpoint-a&apos;).then(() => &apos;a&apos;),
  fetch(&apos;/endpoint-b&apos;).then(() => &apos;b&apos;),
  fetch(&apos;/endpoint-c&apos;).then(() => &apos;c&apos;),
];
try {
  const first = await Promise.any(promises);
  // 어느 promise가 완료되었습니다.
  console.log(first);
  // → 예: &apos;b&apos;
} catch (error) {
  // 모든 promise가 실패했습니다.
  console.assert(error instanceof AggregateError);
  // 실패한 값들 로그:
  console.log(error.errors);
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

이 코드 예제는 어떤 엔드포인트가 가장 빠르게 반응하는지 확인하고 이를 로그로 기록합니다. 오직 _모든_ 요청이 실패한 경우에만 `catch` 블록으로 들어가며, 여기서 오류를 처리할 수 있습니다.

`Promise.any`의 실패는 한 번에 여러 오류를 나타낼 수 있습니다. 이를 언어 수준에서 지원하기 위해 `AggregateError`라는 새로운 오류 유형이 도입되었습니다. 위의 예제에서 기본 사용법 외에도, 다른 오류 유형과 마찬가지로 `AggregateError` 객체를 프로그래밍적으로 생성할 수도 있습니다:

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], &apos;문제가 발생했습니다!&apos;);
```
