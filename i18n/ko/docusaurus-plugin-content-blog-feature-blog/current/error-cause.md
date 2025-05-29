---
title: &apos;오류 원인&apos;
author: &apos;Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))&apos;
avatars:
  - &apos;victor-gomes&apos;
date: 2021-07-07
tags:
  - ECMAScript
description: &apos;JavaScript는 이제 오류 원인을 지원합니다.&apos;
tweet: &apos;1412774651558862850&apos;
---

두 개의 별도 작업 `doSomeWork`와 `doMoreWork`를 호출하는 함수를 상상해보세요. 두 함수는 동일한 종류의 오류를 던질 수 있지만, 각각 다른 방식으로 처리해야 합니다.

오류를 잡은 다음 추가적인 컨텍스트 정보를 추가하여 다시 던지는 것은 이 문제에 대한 일반적인 접근 방식입니다. 예를 들어:

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError(&apos;작업 중 오류가 발생했습니다&apos;, err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // |err|가 |doSomeWork|에서 왔는지 |doMoreWork|에서 왔는지 어떻게 알 수 있을까요?
}
```

유감스럽게도 위 솔루션은 번거롭습니다. 자체적으로 `CustomError`를 생성해야 하기 때문입니다. 더욱이 개발 도구는 예기치 못한 예외에 대해 유용한 진단 메시지를 제공할 수 없습니다. 이러한 오류를 어떻게 제대로 표현할지에 대한 합의가 없기 때문입니다.

<!--truncate-->
지금까지 부족했던 것은 오류를 체계적으로 연결하는 표준 방식입니다. JavaScript는 이제 오류 원인을 지원합니다. `Error` 생성자에 `cause` 속성을 가진 추가 옵션 매개변수를 추가할 수 있으며, 이 값은 오류 인스턴스에 할당됩니다. 그런 다음 오류를 쉽게 연결할 수 있습니다.

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error(&apos;작업 중 오류가 발생했습니다&apos;, { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error(&apos;추가 작업 중 오류가 발생했습니다&apos;, { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case &apos;작업 중 오류가 발생했습니다&apos;:
      handleSomeWorkFailure(err.cause);
      break;
    case &apos;추가 작업 중 오류가 발생했습니다&apos;:
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

이 기능은 V8 v9.3에서 사용할 수 있습니다.

## 오류 원인 지원

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
