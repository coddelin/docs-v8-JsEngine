---
title: "논리적 할당"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2020-05-07
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: "자바스크립트가 이제 논리 연산과 함께 복합 할당을 지원합니다."
tweet: "1258387483823345665"
---
자바스크립트는 [복합 할당 연산자](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators)의 범위를 지원하여 프로그래머가 이진 연산과 할당을 간결하게 표현할 수 있게 합니다. 현재는 수학적 또는 비트 연산만 지원되고 있습니다.

<!--truncate-->
누락되었던 부분은 논리 연산과 할당을 결합할 수 있는 능력이었습니다. 이제는 가능합니다! 자바스크립트는 새로운 연산자인 `&&=`, `||=`, `??=`를 통해 논리적 할당을 지원합니다.

## 논리적 할당 연산자

새로운 연산자를 살펴보기 전에 기존의 복합 할당 연산자를 다시 복습해봅시다. 예를 들어, `lhs += rhs`의 의미는 대략적으로 `lhs = lhs + rhs`와 같습니다. 이는 기존 연산자인 `@=`에도 적용됩니다. 여기서 `@`는 `+`, `|`와 같은 이진 연산자를 의미합니다. 이는 엄밀히 말해 `lhs`가 변수일 때만 정확합니다. 예를 들어 `obj[computedPropertyName()] += rhs`과 같은 표현의 복잡한 왼쪽 값에서는 왼쪽 값이 한 번만 평가됩니다.

이제 새로운 연산자를 살펴봅시다. 기존 연산자와 대조적으로 `lhs @= rhs`는 `@`이 `&&`, `||`, 또는 `??`와 같은 논리 연산자일 때, 대략적으로 `lhs = lhs @ rhs`를 의미하지 않습니다.

```js
// 논리적 AND에 대한 추가 복습:
x && y
// → x가 참일 때 y
// → x가 거짓일 때 x

// 우선 논리 AND 할당. 이 주석 블록 뒤의 두 줄은 동등합니다.
// 기존 복합 할당 연산자와 마찬가지로 복잡한 왼쪽 값은
// 한 번만 평가됩니다.
x &&= y;
x && (x = y);

// 논리적 OR의 의미:
x || y
// → x가 참일 때 x
// → x가 거짓일 때 y

// 유사하게 논리 OR 할당:
x ||= y;
x || (x = y);

// Null 병합 연산자의 의미:
x ?? y
// → x가 null이거나 undefined일 때 y
// → x가 null이거나 undefined가 아닐 때 x

// 마지막으로 Null 병합 할당:
x ??= y;
x ?? (x = y);
```

## 단락 평가 의미론

수학적 및 비트 연산과 달리, 논리적 할당은 해당 논리 연산의 단락 평가 동작을 따릅니다. 논리 연산이 오른쪽 값을 평가할 때만 할당이 수행됩니다.

처음에는 이것이 혼란스러워 보일 수 있습니다. 왜 다른 복합 할당처럼 왼쪽에 무조건 할당하지 않는 걸까요?

여기에는 좋은 실용적 이유가 있습니다. 논리 연산과 할당을 결합할 때, 할당은 논리 연산 결과에 따라 조건부로 발생되어야 하는 부작용을 초래할 수 있습니다. 부작용이 무조건적으로 발생하면 프로그램 성능이나 정확성에 악영향을 줄 수 있습니다.

이를 명확히 하기 위해, 요소에 기본 메시지를 설정하는 함수의 두 가지 버전을 살펴봅시다.

```js
// 기본 메시지를 표시하지만 기존 메시지를 덮어쓰지 않음.
// innerHTML이 비어 있을 때만 할당합니다. msgElement의 내부
// 요소가 포커스를 잃지 않음.
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>No messages<p>';
}

// 기본 메시지를 표시하지만 기존 메시지를 덮어쓰지 않음.
// 오류 발생! 호출될 때마다 msgElement의 내부
// 요소가 포커스를 잃을 수 있음.
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>No messages<p>';
}
```

:::note
**참고:** `innerHTML` 속성이 [명시적으로](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml) `null` 또는 `undefined` 대신 빈 문자열을 반환하도록 지정되어 있기 때문에 `??=` 대신 `||=`를 사용해야 합니다. 많은 웹 API가 비어 있거나 결여된 값을 나타내기 위해 `null` 또는 `undefined`를 사용하지 않는다는 점을 염두에 두십시오.
:::

HTML에서 요소의 `.innerHTML` 속성에 할당하는 것은 파괴적입니다. 내부 자식 요소가 삭제되고 새로 할당된 문자열에서 파싱된 새 자식 요소가 삽입됩니다. 새 문자열이 기존 문자열과 동일할 때조차도 추가 작업이 발생하고 내부 요소가 포커스를 잃게 됩니다. 이러한 부작용을 방지하기 위해 논리적 할당 연산자의 의미론은 할당을 단락 평가합니다.

다른 복합 할당 연산자와의 대칭을 다음과 같이 생각하는 데 도움이 될 수 있습니다. 수학적 및 비트 연산자는 무조건적이며 할당도 무조건적입니다. 논리 연산자는 조건부이며 따라서 할당도 조건부입니다.

## 논리적 할당 지원

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#New-Features:~:text=논리적%20할당%20연산자%20지원이%20추가되었습니다."
                 nodejs="16"
                 babel="예 https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
