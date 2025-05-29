---
title: "임시로 Escape Analysis 비활성화"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), 샌드박스 Escape 분석 전문가"
avatars:
  - "mathias-bynens"
date: 2017-09-22 13:33:37
tags:
  - 보안
description: "보안 취약점으로부터 사용자를 보호하기 위해 Chrome 61에서 V8의 Escape Analysis를 비활성화했습니다."
tweet: "911339802884284416"
---
JavaScript에서, 할당된 객체는 현재 함수 밖에서 접근 가능할 경우 _escape_(탈출)하게 됩니다. 일반적으로 V8은 새로운 객체를 JavaScript 힙에 할당하지만, _escape analysis_(탈출 분석)를 사용하면 최적화 컴파일러는 객체의 수명이 함수의 실행에 따라 제한된 것을 입증할 수 있을 때 특수 처리를 할 수 있습니다. 새로 할당된 객체의 참조가 그것을 생성한 함수 밖으로 탈출하지 않는 경우, JavaScript 엔진은 명시적으로 그 객체를 힙에 할당할 필요가 없습니다. 대신 이 객체의 값을 함수의 지역 변수처럼 처리할 수 있습니다. 이는 스택이나 레지스터에 값을 저장하거나, 경우에 따라 값을 완전히 최적화하여 제거하는 등 여러 가지 최적화를 가능하게 합니다. 탈출하는 객체(더 정확히 말하면, 탈출하지 않음을 증명할 수 없는 객체)들은 반드시 힙에 할당되어야 합니다.

<!--truncate-->
예를 들어, Escape Analysis는 V8이 다음 코드를 효과적으로 재작성할 수 있게 합니다:

```js
function foo(a, b) {
  const object = { a, b };
  return object.a + object.b;
  // 주의: `object`는 탈출하지 않습니다.
}
```

...이를 통해 다음 코드로 변환할 수 있으며, 이는 여러 내부 최적화를 가능하게 합니다:

```js
function foo(a, b) {
  const object_a = a;
  const object_b = b;
  return object_a + object_b;
}
```

V8 v6.1 및 이전 버전은 복잡하고 도입 이후 많은 버그를 발생시킨 Escape Analysis 구현을 사용했습니다. 이 구현은 그 이후 제거되었으며, [V8 v6.2](/blog/v8-release-62)에서 볼 수 있는 완전히 새로운 Escape Analysis 코드 베이스가 제공됩니다.

그러나 [Chrome 보안 취약점](https://chromereleases.googleblog.com/2017/09/stable-channel-update-for-desktop_21.html)이 V8 v6.1의 이전 Escape Analysis 구현과 관련이 있는 것으로 발견되었으며, 책임감 있게 신고되었습니다. 사용자를 보호하기 위해 Chrome 61에서는 Escape Analysis를 비활성화했습니다. Node.js는 이 취약점이 신뢰할 수 없는 JavaScript 실행에 의존하기 때문에 영향을 받지 않습니다.

Escape Analysis를 비활성화하면 이러한 최적화를 사용할 수 없게 되어 성능에 부정적인 영향을 미칩니다. 특히, 다음 ES2015 기능들은 일시적으로 성능 저하가 발생할 수 있습니다:

- 구조 분해(destructuring)
- `for`-`of` 반복
- 배열 스프레드(array spread)
- 나머지 매개변수(rest parameters)

Escape Analysis 비활성화는 일시적인 조치일 뿐임을 유의하시기 바랍니다. Chrome 62에서는 V8 v6.2의 새롭게 구현된 — 그리고 가장 중요한 점은 활성화된 — Escape Analysis를 배포할 예정입니다.
