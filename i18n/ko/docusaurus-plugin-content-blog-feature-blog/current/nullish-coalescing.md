---
title: "널 병합(nüllish coalescing)"
author: "저스틴 리지웰(Justin Ridgewell)"
avatars: 
  - "justin-ridgewell"
date: 2019-09-17
tags: 
  - ECMAScript
  - ES2020
description: "JavaScript의 널 병합 연산자는 보다 안전한 기본값 표현식을 가능하게 합니다."
tweet: "1173971116865523714"
---
[널 병합 제안](https://github.com/tc39/proposal-nullish-coalescing/) (`??`)은 기본값을 처리하기 위한 새로운 단축 평가 연산자를 추가합니다.

여러분은 이미 단축 평가 연산자인 `&&`와 `||`를 알고 있을 가능성이 높습니다. 이 연산자들은 “true값”과 “false값”을 처리합니다. 예를 들어 `lhs && rhs`라는 코드 샘플을 생각해 봅시다. `lhs`(좌측 피연산자)가 false값이면, 표현식은 `lhs`를 평가합니다. 그렇지 않으면 `rhs`(우측 피연산자)를 평가합니다. 반대로 `lhs || rhs`라는 코드 샘플의 경우에는, `lhs`가 true값이면 표현식은 `lhs`를 평가합니다. 그렇지 않으면 `rhs`를 평가합니다.

<!--truncate-->
하지만 “true값”과 “false값”이 정확히 무슨 의미일까요? 명세 용어로는 이것이 [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean) 추상 연산과 동등합니다. 일반적인 JavaScript 개발자들에게는, **모든 값**이 true값이며, false값은 `undefined`, `null`, `false`, `0`, `NaN`, 그리고 빈 문자열 `''`뿐입니다. (기술적으로 `document.all`에 연결된 값도 false값이지만, 이것은 나중에 다룰 것입니다.)

그렇다면 `&&`와 `||`의 문제는 무엇일까요? 왜 새로운 널 병합 연산자가 필요할까요? 그것은 true값과 false값의 정의가 모든 상황에 들어맞지 않아서 버그가 발생하기 때문입니다. 다음과 같은 예를 생각해 봅시다:

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

이 예제에서 `enabled` 속성을 구성 요소의 특정 기능이 활성화될지 여부를 제어하는 선택적 불 대수 속성으로 취급한다고 가정해 봅시다. 이는 `enabled`를 `true` 또는 `false`로 명시적으로 설정할 수 있음을 의미합니다. 하지만 _선택적_ 속성이기 때문에 전혀 설정하지 않음으로써 암시적으로 `undefined`로 설정할 수도 있습니다. `undefined`이면 구성 요소가 `enabled = true`(기본값)인 것처럼 다루고 싶습니다.

이제 코드 예제에서 버그를 발견할 수 있을 것입니다. 우리가 `enabled = true`를 명시적으로 설정하면 `enable` 변수는 `true`입니다. `enabled = undefined`를 암시적으로 설정하면 `enable` 변수는 `true`입니다. 그리고 `enabled = false`를 명시적으로 설정하면 `enable` 변수가 여전히 `true`입니다! 우리는 값을 기본값으로 `true`로 설정하려고 했지만 실제로는 값을 강제로 설정했습니다. 이 경우 문제를 해결하려면 우리가 기대하는 값을 명확히 해야 합니다:

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

우리는 모든 false값에서 이러한 유형의 버그가 나타나는 것을 볼 수 있습니다. 이것은 아주 쉽게 선택적 문자열(빈 문자열 `''`이 유효한 입력으로 간주되는 경우) 또는 선택적 숫자(`0`이 유효한 입력으로 간주되는 경우)가 될 수 있습니다. 이러한 문제는 매우 일반적이어서 이제 널 병합 연산자를 도입하여 기본값 할당을 처리하려 합니다:

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

널 병합 연산자 (`??`)는 `||` 연산자와 매우 비슷하게 작동하지만, 연산자를 평가할 때 “true값”을 사용하지 않습니다. 대신 “널 값(nullish)”의 정의를 사용합니다. 즉, 값이 `null` 또는 `undefined`와 엄격히 동등한지 여부를 판단합니다. 따라서 `lhs ?? rhs` 표현식을 생각해 보면, `lhs`가 널 값이 아니면 `lhs`를 평가합니다. 그렇지 않으면 `rhs`를 평가합니다.

명시적으로, 이는 값 `false`, `0`, `NaN`, 그리고 빈 문자열 `''` 모두가 false값이며, 널 값이 아님을 의미합니다. 이러한 false값이지만 널 값이 아닌 값들이 `lhs ?? rhs`의 좌측에 있을 때, 표현식은 우측이 아닌 해당 값을 평가합니다. 이제 버그는 사라집니다!

```js
false ?? true;   // => false
0 ?? 1;          // => 0
'' ?? '기본값'; // => ''

null ?? [];      // => []
undefined ?? []; // => []
```

## 객체 구조 분해 시 기본값 할당은 어떨까요?

마지막 코드 예제를 객체 구조 분해 내에서 기본값 할당을 사용하여 해결할 수도 있음을 알아차렸을 겁니다:

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

조금 장황하게 느껴질 수 있지만, 이는 완전히 유효한 JavaScript입니다. 다만, 약간 다른 의미론을 사용합니다. 객체 구조 분해 내에서의 기본값 할당은 속성이 `undefined`와 엄격히 동등한지를 확인하고, 그렇다면 기본값을 할당합니다.

하지만 이러한 `undefined`만에 대한 엄격한 동등성 검사가 항상 바람직한 것은 아니며, 구조 분해할 객체가 항상 제공되는 것도 아닙니다. 예를 들어, 함수의 반환 값에서 기본값을 설정하고 싶을 수도 있습니다(구조 분해할 객체가 없음). 또는 함수가 `null`을 반환할 수도 있습니다(DOM API에서 흔히 발생). 이럴 때 널 병합을 사용하는 것이 좋습니다:

```js
// 간결한 널 병합
const link = document.querySelector('link') ?? document.createElement('link');

// 기본 할당 구조 분해와 상용구
const {
  link = document.createElement('link'),
} = {
  link: document.querySelector('link') || undefined
};
```

또한 [옵셔널 체이닝](/features/optional-chaining)과 같은 특정 새로운 기능은 구조 분해와 완벽하게 작동하지 않을 수 있습니다. 구조 분해는 객체를 필요로 하므로, 옵셔널 체인이 객체 대신 `undefined`를 반환했을 경우를 대비해 구조 분해를 보호해야 합니다. Nullish 병합 연산자를 사용할 경우 이런 문제가 없습니다:

```js
// 옵셔널 체이닝 및 Nullish 병합 연산자의 동시 사용
const link = obj.deep?.container.link ?? document.createElement('link');

// 옵셔널 체이닝과 기본 할당 구조 분해
const {
  link = document.createElement('link'),
} = (obj.deep?.container || {});
```

## 연산자 혼합 및 조합

언어 디자인은 어렵습니다. 새로운 연산자를 만드는 경우 개발자의 의도를 약간 모호하게 만들 가능성이 있습니다. `&&`와 `||` 연산자를 혼합하여 사용한 적이 있다면 이 모호성을 직접 경험해봤을 것입니다. 표현식 `lhs && middle || rhs`를 생각해 보세요. 자바스크립트에서는 이것을 `(lhs && middle) || rhs`로 해석합니다. 이제 `lhs || middle && rhs` 표현식을 생각해 보면 이것은 `lhs || (middle && rhs)`로 해석됩니다.

`&&` 연산자는 `||` 연산자보다 왼쪽 및 오른쪽에서 더 높은 우선 순위를 갖습니다. 따라서 묵시적 괄호가 `||` 대신 `&&`를 감싸게 됩니다. `??` 연산자를 설계할 때, 우리는 우선 순위가 어떻게 되어야 할지 결정해야 했습니다. 다음 중 하나를 선택해야 했습니다:

1. `&&`와 `||`보다 낮은 우선 순위
1. `&&`보다 낮지만 `||`보다는 높은 우선 순위
1. `&&`와 `||`보다 높은 우선 순위

각각의 우선 순위 정의를 네 가지 가능한 테스트 케이스에 통과시켜야 했습니다:

1. `lhs && middle ?? rhs`
1. `lhs ?? middle && rhs`
1. `lhs || middle ?? rhs`
1. `lhs ?? middle || rhs`

각 테스트 표현식에서 묵시적 괄호가 어디에 위치해야 할지 결정해야 했습니다. 괄호가 개발자가 의도한 표현을 정확히 감싸지 않으면 잘못 작성된 코드가 됩니다. 불행히도 어떤 우선 순위를 선택하더라도 하나의 테스트 표현식은 개발자의 의도를 위반할 수 있었습니다.

결국 우리는 `??`와 (`&&` 또는 `||`)를 혼합할 때 명시적 괄호를 요구하도록 결정했습니다 (괄호 그룹은 명시적으로 표시했습니다! 메타 농담!). 혼합하는 경우 연산자 그룹 중 하나를 괄호로 묶어야 하며 그렇지 않으면 구문 오류가 발생합니다.

```js
// 혼합하려면 명시적 괄호 그룹이 필요합니다
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

이 방식으로 언어 파서는 항상 개발자가 의도한 대로 대응하며, 이후에 코드를 읽는 사람도 즉시 이해할 수 있습니다. 훌륭하죠!

## `document.all`에 대해 말해주세요

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all)은 절대로 사용해서는 안 되는 특별한 값입니다. 그러나 이것을 사용한 경우, 이것이 어떻게 “truthy” 및 “nullish”와 상호작용하는지 이해하는 것이 중요합니다.

`document.all`은 배열과 비슷한 객체로, 배열처럼 인덱스 속성과 길이를 가지고 있습니다. 객체는 보통 truthy이지만 `document.all`은 놀랍게도 falsy로 간주됩니다! 사실 이것은 `null` 및 `undefined`와 느슨하게 동일합니다 (이는 일반적으로 속성을 가질 수 없음을 뜻합니다).

`document.all`을 `&&` 또는 `||`와 함께 사용할 때, 이것은 falsy로 간주됩니다. 그러나 이것은 `null` 또는 `undefined`와 엄격하게 동일하지 않으므로, nullish가 아닙니다. 따라서 `document.all`을 `??`와 함께 사용할 때는 일반 객체처럼 동작합니다.

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## Nullish 병합 연산자에 대한 지원

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
