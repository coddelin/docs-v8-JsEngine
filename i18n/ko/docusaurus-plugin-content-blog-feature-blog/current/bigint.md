---
title: "BigInt: JavaScript에서 임의 정밀도를 가진 정수"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-05-01
tags:
  - ECMAScript
  - ES2020
  - io19
description: "BigInt는 JavaScript에서 임의 정밀도의 정수를 표현할 수 있는 새로운 숫자형 원시 자료형입니다. 이 글은 몇 가지 사용 사례를 살펴보고 BigInt와 JavaScript의 Number를 비교하여 Chrome 67에서 추가된 새로운 기능을 설명합니다."
tweet: "990991035630206977"
---
`BigInt`는 JavaScript에서 임의 정밀도로 정수를 표현할 수 있는 새로운 숫자형 원시 자료형입니다. `BigInt`를 사용하면 `Number`의 안전한 정수 범위를 초과하는 큰 정수를 안전하게 저장하고 연산할 수 있습니다. 이 글은 몇 가지 사용 사례를 살펴보고 `BigInt`와 `Number`를 비교하여 Chrome 67에서 추가된 새로운 기능을 설명합니다.

<!--truncate-->
## 사용 사례

임의 정밀도 정수는 JavaScript를 위한 많은 새로운 사용 사례를 열어 줍니다.

`BigInt`는 정수 산술을 정확하게 수행할 수 있도록 하며 오버플로가 발생하지 않도록 합니다. 이것만으로도 새로운 가능성을 무수히 열 수 있습니다. 예를 들어 금융 기술에서는 대규모 숫자에 대한 수학적 연산이 흔히 사용됩니다.

[대규모 정수 ID](https://developer.twitter.com/en/docs/basics/twitter-ids)와 [고정밀 타임스탬프](https://github.com/nodejs/node/pull/20220)는 JavaScript에서 `Number`로 안전하게 표현될 수 없습니다. 이는 [종종](https://github.com/stedolan/jq/issues/1399) [실제 버그](https://github.com/nodejs/node/issues/12115)를 초래하며, JavaScript 개발자가 이를 대신 문자열로 표현하도록 합니다. 이제 `BigInt`를 사용하면 이 데이터를 수치 값으로 표현할 수 있습니다.

`BigInt`는 결국 `BigDecimal` 구현의 기초가 될 수 있습니다. 이는 소수 정밀도를 가진 금액을 표현하고 정확하게 연산하는 데 유용합니다(즉, `0.10 + 0.20 !== 0.30` 문제).

이전에는 이러한 사용 사례를 가진 JavaScript 애플리케이션이 `BigInt`와 비슷한 기능을 모방하는 사용자 라이브러리를 사용해야 했습니다. `BigInt`가 널리 사용 가능해지면 이러한 애플리케이션은 실행 시간 종속성을 제거하고 원시 `BigInt`를 선호할 수 있습니다. 이렇게 하면 로드 시간, 파싱 시간 및 컴파일 시간이 줄어들고 실행 시간 성능도 크게 향상됩니다.

![Chrome의 원시 `BigInt` 구현은 인기 있는 사용자 라이브러리보다 더 나은 성능을 제공합니다.](/_img/bigint/performance.svg)

## 현재 상황: `Number`

JavaScript의 `Number`는 [배정밀도 실수 형태](https://en.wikipedia.org/wiki/Floating-point_arithmetic)로 표현됩니다. 이는 제한된 정밀도를 가지는 것을 의미합니다. `Number.MAX_SAFE_INTEGER` 상수는 안전하게 증가할 수 있는 최대 정수를 제공합니다. 그 값은 `2**53-1`입니다.

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**참고:** 숫자의 가독성을 높이기 위해 큰 숫자를 천 단위로 그룹화하고 밑줄을 구분자로 사용하고 있습니다. [숫자 리터럴 구분자 제안](/features/numeric-separators)은 JavaScript 숫자 리터럴에 대해 정확히 이러한 기능을 제공합니다.
:::

한 번 증가시키면 예상 결과를 얻습니다:

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

하지만 한 번 더 증가시키면 결과는 더 이상 JavaScript `Number`로 정확하게 표현되지 않습니다:

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

`max + 1`과 `max + 2`가 동일한 결과를 생성한다는 점에 주목하세요. JavaScript에서 이 특정 값을 얻을 때 정확하거나 그렇지 않은지를 확인할 방법이 없습니다. 안전한 정수 범위를 넘어서는 정수에 대한 모든 계산(`Number.MIN_SAFE_INTEGER`에서 `Number.MAX_SAFE_INTEGER`까지)은 정밀도를 잃을 가능성이 있습니다. 이러한 이유로 우리는 안전 범위 내의 정수 값을 신뢰할 수 있습니다.

## 새로운 기능: `BigInt`

`BigInt`는 JavaScript에서 [임의 정밀도](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic)로 정수를 표현할 수 있는 새로운 숫자형 원시 자료형입니다. `BigInt`를 사용하면 `Number`의 안전한 정수 한계를 초과하는 큰 정수를 안전하게 저장하고 연산할 수 있습니다.

`BigInt`를 생성하려면, 정수 리터럴 뒤에 `n` 접미사를 추가하면 됩니다. 예를 들어, `123`은 `123n`이 됩니다. 전역 `BigInt(number)` 함수는 `Number`를 `BigInt`로 변환하는 데 사용할 수 있습니다. 다시 말해, `BigInt(123) === 123n`입니다. 이전에 해결하려 했던 문제를 이 두 가지 기술을 사용해 해결해 보겠습니다:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

다른 예에서는 두 `Number`를 곱해봅니다:

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

`9`와 `3`이라는 가장 적은 자릿수를 보면, 곱셈 결과가 `7`로 끝나야 한다는 것을 알 수 있습니다 (`9 * 3 === 27`). 그러나 결과는 여러 개의 0으로 끝납니다. 이것은 정확하지 않습니다! 대신 `BigInt`를 사용하여 다시 시도해 보겠습니다:

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

이번에는 올바른 결과를 얻었습니다.

`BigInt`에서는 `Number`의 안전한 정수 범위 제한이 적용되지 않습니다. 따라서 `BigInt`를 사용하면 정밀도를 잃는 걱정 없이 올바른 정수 계산을 수행할 수 있습니다.

### 새로운 기본형

`BigInt`는 자바스크립트 언어의 새로운 기본형입니다. 따라서 `typeof` 연산자를 사용하여 감지할 수 있는 자체 유형을 갖습니다:

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

`BigInt`는 별도의 타입으로, 예를 들어 `42n !== 42`처럼 `Number`와 절대적으로 같지 않습니다. `BigInt`를 `Number`와 비교하려면 비교를 수행하기 전에 한 유형에서 다른 유형으로 변환하거나 추상적 동등(`==`)을 사용하십시오:

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

`if`, `&&`, `||`, 또는 `Boolean(int)` 등을 사용할 때 강제적으로 부울 값으로 변환될 때, `BigInt`는 `Number`와 동일한 논리를 따릅니다.

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → logs 'else', because `0n` is falsy.
```

### 연산자

`BigInt`는 일반적인 대부분의 연산자를 지원합니다. 이항 `+`, `-`, `*`, 그리고 `**`는 예상대로 작동합니다. `/`와 `%`는 작동하며, 필요에 따라 0으로 반올림됩니다. 비트 연산 `|`, `&`, `<<`, `>>`, 그리고 `^`는 음수 값에 대해 [2의 보수 표현](https://en.wikipedia.org/wiki/Two%27s_complement)을 가정하여 비트 계산을 수행하며, 이는 `Number`에서와 동일합니다.

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

단항 `-`를 사용하여 음의 `BigInt` 값을 나타낼 수 있습니다, 예: `-42n`. 그러나 단항 `+`는 지원되지 않습니다. 이는 `+x`가 항상 `Number` 또는 예외를 생성해야 한다고 예상하는 asm.js 코드를 깨뜨리기 때문입니다.

`BigInt`와 `Number` 간의 연산을 섞는 것은 허용되지 않습니다. 이는 암시적 변환이 정보를 잃을 수 있기 때문에 좋은 일입니다. 다음 예제를 고려해 보십시오:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

결과가 무엇이어야 할까요? 여기에 좋은 답이 없습니다. `BigInt`는 분수를 표현할 수 없고, `Number`는 안전한 정수 범위 이상의 `BigInt`를 표현할 수 없습니다. 따라서 `BigInt`와 `Number` 간의 연산을 섞으면 `TypeError` 예외가 발생합니다.

이 규칙에 대한 유일한 예외는 비교 연산자인 `===`, `<`, 그리고 `>=`입니다 – 이는 부울 값을 반환하므로 정확도 손실 위험이 없습니다.

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

`BigInt`와 `Number`는 일반적으로 혼합되지 않으므로, 기존 코드를 `Number` 대신 `BigInt`로 업그레이드하거나 과도하게 사용하지 마십시오. 두 도메인 중 하나를 결정하여 작업한 후 그에 충실하십시오. 잠재적으로 큰 정수에 대해 작업하는 _새로운_ API의 경우 `BigInt`가 최선의 선택입니다. 안전한 정수 범위에 있는 정수 값에 대해서는 여전히 `Number`가 적합합니다.

[`>>>` 연산자](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift)는 `BigInt`가 항상 부호 있는 값이므로 의미가 없습니다. 이 때문에 `BigInt`에서는 `>>>`가 작동하지 않습니다.

### API

`BigInt`-전용 여러 API가 제공됩니다.

글로벌 `BigInt` 생성자는 `Number` 생성자와 유사합니다: 그것은 인수를 `BigInt`로 변환합니다 (앞서 언급된 바와 같이). 변환이 실패하면 예외 `SyntaxError` 또는 `RangeError`를 발생시킵니다.

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

첫 번째 예제는 숫자 리터럴을 `BigInt()`에 전달합니다. 이는 안 좋은 관행입니다. `Number`는 정밀도 손실을 겪기 때문에, `BigInt` 변환이 발생하기 전에 이미 정밀도를 잃을 수 있습니다:

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

이런 이유로, `BigInt` 리터럴 표기법 (`n` 접미사 사용)에 충실하거나 문자열 (절대 `Number`가 아님)을 대신 `BigInt()`에 전달할 것을 권장합니다:

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

두 개의 라이브러리 함수는 `BigInt` 값을 지정된 비트 수로 제한된 부호 있는 또는 부호 없는 정수로 래핑합니다. `BigInt.asIntN(width, value)`는 `BigInt` 값을 `width`-자리 이진 부호 정수로 래핑하고, `BigInt.asUintN(width, value)`는 `BigInt` 값을 `width`-자리 이진 부호 없는 정수로 래핑합니다. 예를 들어 64비트 산술을 수행하는 경우, 이 API를 사용하여 적절한 범위 내에 유지할 수 있습니다:

```js
// signed 64-bit 정수로 표현 가능한 가장 높은 BigInt 값.
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
// → 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ 오버플로로 인해 음수 값
```

64비트 정수 범위(절대 숫자 값에 대해 63비트 + 부호에 대해 1비트)를 초과하는 `BigInt` 값을 전달하자마자 오버플로우가 발생하는 것을 확인하십시오.

`BigInt`는 다른 프로그래밍 언어에서 일반적으로 사용되는 64비트 부호형 및 부호없는 정수를 정확하게 표현할 수 있도록 합니다. 두 가지 새로운 형식 배열 형식인 `BigInt64Array`와 `BigUint64Array`는 이러한 값들의 목록을 효율적으로 표현하고 작업하기 쉽게 만들어줍니다:

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

`BigInt64Array` 형식은 값들이 부호형 64비트 한도를 초과하지 않도록 보장합니다.

```js
// 부호형 64비트 정수로 표현 가능한 가장 높은 BigInt 값입니다.
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ 오버플로우로 인해 음수가 됨
```

`BigUint64Array` 형식은 대신 부호없는 64비트 한도를 사용하여 동일한 작업을 수행합니다.

## BigInt를 폴리필 및 트랜스파일링하기

`BigInt`가 작성 당시에는 Chrome에서만 지원됩니다. 다른 브라우저들도 구현 작업을 적극적으로 진행 중입니다. 그렇다면 브라우저 호환성을 포기하지 않으면서 *오늘* `BigInt` 기능을 사용하고 싶다면 어떻게 해야 할까요? 흥미로운 답변이 있습니다.

대부분의 현대적인 JavaScript 기능과 다르게, `BigInt`는 ES5로 합리적으로 트랜스파일할 수 없습니다.

`BigInt` 제안은 [연산자](#operators)의 동작을 변경하여(`+`, `>=` 등) `BigInt`에서 작동하도록 만듭니다. 이러한 변경은 직접 폴리필할 수 없으며 대부분의 경우 Babel이나 유사한 도구를 사용하여 `BigInt` 코드를 대체 코드로 트랜스파일링하는 것도 불가능합니다. 그 이유는 프로그램 내의 *모든 연산자*를 타입 검사를 수행하는 함수 호출로 대체해야 한다는 것인데, 이로 인해 감당할 수 없는 실행 성능 저하가 발생합니다. 또한, 트랜스파일된 번들의 파일 크기를 크게 증가시켜 다운로드, 파싱 및 컴파일 시간이 부정적으로 영향을 받습니다.

보다 실행 가능하고 미래 지향적인 해결책은 [JSBI 라이브러리](https://github.com/GoogleChromeLabs/jsbi#why)를 사용하여 코드를 작성하는 것입니다. JSBI는 V8 및 Chrome의 `BigInt` 구현을 JavaScript로 포팅한 것으로, 본래 `BigInt` 기능처럼 정확히 작동합니다. 차이점은 구문에 의존하는 대신 [API](https://github.com/GoogleChromeLabs/jsbi#how)를 노출한다는 점입니다:

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt('2');
const result = JSBI.add(max, two);
console.log(result.toString());
// → '9007199254740993'
```

모든 브라우저에서 `BigInt`가 기본적으로 지원되면 [`babel-plugin-transform-jsbi-to-bigint`를 사용하여 코드를 네이티브 `BigInt` 코드로 트랜스파일링](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint)하고 JSBI 종속성을 제거할 수 있습니다. 예를 들어 위 예제는 다음으로 트랜스파일됩니다:

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → '9007199254740993'
```

## 추가 읽기 자료

`BigInt`가 내부적으로 어떻게 작동하는지 (예: 메모리에서 어떻게 표현되고 연산은 어떻게 수행되는지)에 관심이 있다면, [구현 세부 사항에 대한 V8 블로그 게시물](/blog/bigint)을 읽어보십시오.

## `BigInt` 지원

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
