---
title: "V8의 Elements 종류"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: "2017-09-12 13:33:37"
tags: 
  - internals
  - presentations
description: "이 기술적 심층 분석은 V8이 배열 작업을 최적화하는 방법과 그것이 JavaScript 개발자들에게 어떤 의미를 가지는지 설명합니다."
tweet: "907608362191376384"
---
:::note
**참고:** 기사 읽기 대신 발표를 보는 것을 선호하는 경우 아래 비디오를 즐기세요!
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

JavaScript 객체는 임의의 속성을 가질 수 있습니다. 객체 속성 이름에는 어떤 문자든 포함될 수 있습니다. JavaScript 엔진이 최적화하려는 흥미로운 경우 중 하나는 속성 이름이 숫자로만 구성된 속성, 특히 [배열 인덱스](https://tc39.es/ecma262/#array-index)입니다.

<!--truncate-->
V8에서는 정수 이름을 가진 속성 — 가장 일반적인 형태는 `Array` 생성자로 생성된 객체 — 이 특별히 처리됩니다. 많은 경우에 이 숫자 인덱스 속성이 다른 속성과 똑같이 동작하지만, V8은 최적화를 위해 숫자가 아닌 속성과 별도로 저장합니다. 내부적으로 V8은 이러한 속성에 특별한 이름을 붙입니다: _elements_. 객체는 값에 매핑되는 [속성](/blog/fast-properties)을 가지며, 배열은 요소에 매핑되는 인덱스를 가집니다.

이 내부 구조는 JavaScript 개발자들에게 직접 노출되지 않지만, 특정 코드 패턴이 다른 코드보다 빠른 이유를 설명합니다.

## 일반적인 Elements 종류

JavaScript 코드를 실행하는 동안, V8은 각 배열이 어떤 종류의 요소를 포함하고 있는지 추적합니다. 이러한 정보는 V8이 이 요소 유형에 대해 배열 작업을 최적화할 수 있게 합니다. 예를 들어, 배열에서 `reduce`, `map` 또는 `forEach`를 호출할 때, V8은 배열이 포함하는 요소 종류에 따라 이러한 작업을 최적화할 수 있습니다.

예를 들어 다음 배열을 살펴보세요:

```js
const array = [1, 2, 3];
```

이 배열에는 어떤 종류의 요소가 포함되어 있나요? `typeof` 연산자에 물어보면 배열이 `number`를 포함한다고 말할 것입니다. 언어 수준에서는 그것이 전부입니다: JavaScript는 정수, 부동 소수점, 더블을 구분하지 않습니다 — 모두 단지 숫자일 뿐입니다. 그러나 엔진 수준에서는 더 정밀한 구별을 할 수 있습니다. 이 배열의 elements 종류는 `PACKED_SMI_ELEMENTS`입니다. V8에서는 Smi라는 용어는 작은 정수를 저장하는 데 사용되는 특정 형식을 나타냅니다. (곧 `PACKED` 부분에 대해 다루겠습니다.)

나중에 같은 배열에 부동 소수점을 추가하면 더 일반적인 elements 종류로 전환됩니다:

```js
const array = [1, 2, 3];
// elements 종류: PACKED_SMI_ELEMENTS
array.push(4.56);
// elements 종류: PACKED_DOUBLE_ELEMENTS
```

배열에 문자열 리터럴을 추가하면 elements 종류가 다시 변경됩니다.

```js
const array = [1, 2, 3];
// elements 종류: PACKED_SMI_ELEMENTS
array.push(4.56);
// elements 종류: PACKED_DOUBLE_ELEMENTS
array.push('x');
// elements 종류: PACKED_ELEMENTS
```

지금까지 우리는 다음 기본 유형을 가진 세 가지 다른 elements 종류를 살펴보았습니다:

- <b>Sm</b>all <b>i</b>ntegers, Smi로도 알려져 있음.
- Doubles, 부동 소수점 숫자와 Smi로 표현할 수 없는 정수를 위한 종류.
- Regular elements, Smi 또는 doubles로 표현할 수 없는 값을 위한 종류.

doubles는 Smi의 더 일반적인 변형을 형성하고, regular elements는 doubles 위에 또 다른 일반화를 형성합니다. Smi로 표현할 수 있는 숫자 집합은 doubles로 표현할 수 있는 숫자 집합의 부분 집합입니다.

여기서 중요한 것은 elements 종류 전환은 특정한 종류(e.g. `PACKED_SMI_ELEMENTS`)에서 더 일반적인 종류(e.g. `PACKED_ELEMENTS`)로만 진행된다는 점입니다. 한 번 배열이 `PACKED_ELEMENTS`로 표시되면 다시 `PACKED_DOUBLE_ELEMENTS`로 돌아갈 수 없습니다.

지금까지 다음 내용을 배웠습니다:

- V8은 각 배열에 elements 종류를 할당합니다.
- 배열의 elements 종류는 고정되어 있지 않으며 런타임에 변경될 수 있습니다. 이전 예에서는 `PACKED_SMI_ELEMENTS`에서 `PACKED_ELEMENTS`로 전환했습니다.
- Elements 종류 전환은 특정한 종류에서 더 일반적인 종류로만 진행됩니다.

## `PACKED` vs. `HOLEY` 종류

지금까지 우리는 밀집된(dense) 또는 패킹된(packed) 배열만 다루었습니다. 배열에 구멍(hole)을 만듦(즉, 배열을 희박하게 만듦)으로써 elements 종류가 “holey” 변형으로 강등됩니다:

```js
const array = [1, 2, 3, 4.56, 'x'];
// elements 종류: PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5]에서 array[8]는 이제 구멍입니다
// elements 종류: HOLEY_ELEMENTS
```

V8는 밀집 배열에서의 작업이 공백 배열에서의 작업보다 더 효율적으로 최적화될 수 있기 때문에 이러한 구분을 제공합니다. 밀집 배열의 경우 대부분의 작업이 효율적으로 수행될 수 있습니다. 비교하면, 공백 배열에서의 작업은 추가적인 확인과 프로토타입 체인에서 비싼 조회를 필요로 합니다.

지금까지 본 기본 요소 종류(Smis, doubles, 일반 요소)는 모두 두 가지 버전으로 제공됩니다: 밀집 버전과 공백 버전. 예를 들어 `PACKED_SMI_ELEMENTS`에서 `PACKED_DOUBLE_ELEMENTS`로 전환할 수 있을 뿐만 아니라, 모든 `PACKED` 종류에서 해당하는 `HOLEY` 버전으로 전환할 수도 있습니다.

요약하자면:

- 가장 일반적인 요소 종류는 `PACKED`와 `HOLEY` 버전으로 제공됩니다.
- 밀집 배열에서의 작업은 공백 배열에서의 작업보다 더 효율적입니다.
- 요소 종류는 `PACKED`에서 `HOLEY` 버전으로 전환될 수 있습니다.

## 요소 종류 격자

V8은 이 태그 전환 시스템을 [격자](https://en.wikipedia.org/wiki/Lattice_%28order%29)로 구현합니다. 여기에는 가장 일반적인 요소 종류만 포함된 간단한 시각화가 있습니다:

![](/_img/elements-kinds/lattice.svg)

격자를 통해 아래쪽으로만 전환할 수 있습니다. Smi 배열에 단 하나의 부동소수점 숫자를 추가하면 그 배열은 DOUBLE로 표시되며, 나중에 부동소수점을 Smi로 덮어쓰더라도 마찬가지입니다. 마찬가지로 배열에 공백이 생성되면 나중에 그것을 채우더라도 그 배열은 영원히 공백으로 표시됩니다.

:::note
**2025년 2월 28일 업데이트:** 이제 [구체적으로 `Array.prototype.fill`](https://chromium-review.googlesource.com/c/v8/v8/+/6285929)에 대한 예외가 있습니다.
:::

현재 V8에서는 [21가지 다른 요소 종류](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d)가 구분되어 있으며, 각각 자신만의 가능한 최적화 세트를 포함하고 있습니다.

일반적으로, 더 구체적인 요소 종류는 더 섬세한 최적화를 가능하게 합니다. 격자에서 요소 종류가 아래로 내려갈수록 해당 객체를 조작하는 속도가 느려질 수 있습니다. 최적의 성능을 위해, 불필요하게 덜 특정한 유형으로 전환하지 말고, 상황에 가장 적합한 유형으로 유지하세요.

## 성능 팁

대부분의 경우, 요소 종류 추적은 배경에서 보이지 않게 작동하며 그것에 대해 걱정할 필요가 없습니다. 하지만 시스템으로부터 가능한 최대 혜택을 얻기 위해 할 수 있는 몇 가지가 있습니다.

### 배열 길이를 초과하여 읽지 않기

다소 예상치 못한 경우(이 게시물 제목을 고려했을 때), 첫 번째 성능 팁은 요소 종류 추적과 직접적으로 관련되지 않습니다(배경에서 발생하는 작업이 약간 비슷하지만). 배열 길이를 초과하여 읽는 것은 놀라운 성능 영향을 미칠 수 있습니다. 예: `array[42]`를 읽는데 `array.length === 5`인 경우. 이 경우 배열 인덱스 `42`는 범위 밖이며, 속성이 배열 자체에 없으므로 JavaScript 엔진은 프로토타입 체인 조회를 수행해야 합니다. 로드가 이러한 상황에 부딪히면 V8은 “이 로드는 특별한 사례를 처리해야 한다”고 기억하며, 범위를 벗어나기 이전의 속도만큼 다시 빠를 수는 없습니다.

다음과 같은 루프를 작성하지 마세요:

```js
// 이렇게 하지 마세요!
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

이 코드는 배열의 모든 요소를 읽고 나서 한 요소를 더 읽습니다. 이는 `undefined` 또는 `null` 요소를 찾을 때에야 종료됩니다. (jQuery는 몇몇 곳에서 이 패턴을 사용합니다.)

대신, 다음과 같이 루프를 작성하여 마지막 요소에 도달할 때까지 반복하세요.

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

루프할 컬렉션이 iterable인 경우(예: 배열 및 `NodeList`), 이 방법이 더 나은데, 그냥 `for-of`를 사용하세요.

```js
for (const item of items) {
  doSomething(item);
}
```

배열에 특별히 적용하면, 내장된 `forEach`를 사용할 수 있습니다:

```js
items.forEach((item) => {
  doSomething(item);
});
```

현재, `for-of`와 `forEach`의 성능은 기존 방식의 `for` 루프와 동등합니다.

배열의 길이를 넘어서 읽지 마세요! 이 경우, V8의 경계 확인이 실패하며, 속성이 있는지 확인하는 것도 실패하고, 그러면 V8은 프로토타입 체인을 조회해야 합니다. 그런 다음 값을 실수로 계산에 사용하는 경우 영향은 더욱 심각해집니다. 예를 들어:

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // 잘못된 비교!
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

여기서는 마지막 반복이 배열 길이를 넘어서 읽습니다. 이는 `undefined`를 반환하고, 이는 로드뿐만 아니라 비교까지 오염시킵니다: 숫자만 비교하는 대신 이제 특별한 사례를 처리해야 합니다. 종료 조건을 적절한 `i < array.length`로 수정하면 이 예제에서 성능이 **6배** 개선됩니다(10,000개의 요소를 포함하는 배열에서 측정된 결과로, 반복 횟수는 0.01%만 감소합니다).

### 요소 종류 전환을 피하기

일반적으로 배열에서 많은 작업을 수행해야 한다면 가능한 한 구체적인 요소 유형을 유지하려고 노력하세요. 이렇게 하면 V8이 해당 작업을 최적화할 수 있습니다.

이것은 보기보다 어렵습니다. 예를 들어, 작은 정수 배열에 `-0`을 추가하는 것만으로도 배열을 `PACKED_DOUBLE_ELEMENTS`로 전환할 수 있습니다.

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

결과적으로, 이 배열에 대한 미래 작업은 Smi 배열에서 작업한 방식과 완전히 다르게 최적화됩니다.

코드에서 `-0`과 `+0`을 구분해야 하는 경우가 아니라면 `-0`을 피하십시오. (대부분 필요하지 않습니다.)

`NaN`과 `Infinity`도 같은 방식으로 처리됩니다. 이 값은 실수로 표현되므로, `SMI_ELEMENTS` 배열에 단일 `NaN` 또는 `Infinity`를 추가하면 `DOUBLE_ELEMENTS`로 전환됩니다.

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

정수 배열에서 많은 작업을 수행하려는 경우, 초기화 시 `-0` 정규화 및 `NaN`과 `Infinity`를 차단하는 것을 고려하십시오. 이렇게 하면 배열이 `PACKED_SMI_ELEMENTS` 유형을 유지합니다. 이 한 번의 정규화 비용은 이후 최적화를 위한 가치가 있을 수 있습니다.

실제로, 숫자 배열에 대한 수학적 작업을 수행하려는 경우, TypedArray를 사용하는 것을 고려하십시오. 이는 특별히 최적화된 요소 유형도 있습니다.

### 배열과 배열 유사 객체 비교

JavaScript에는 특히 DOM에서 배열처럼 보이지만 실제 배열이 아닌 객체들이 있습니다. 당신은 배열 유사 객체(array-like objects)를 직접 만들 수도 있습니다:

```js
const arrayLike = {};
arrayLike[0] = 'a';
arrayLike[1] = 'b';
arrayLike[2] = 'c';
arrayLike.length = 3;
```

이 객체는 `length`를 가지고 있으며 인덱스를 사용한 요소 접근을 지원하지만(배열처럼!) 프로토타입에 `forEach`와 같은 배열 메서드는 없습니다. 하지만 배열 제너릭 메서드를 호출하는 것은 가능합니다.

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// 이는 '0: a', '1: b', 그리고 최종적으로 '2: c'를 출력합니다.
```

이 코드는 배열 유사 객체에 대해 내장된 `Array.prototype.forEach`를 호출하며 예상대로 작동합니다. 하지만 이 작업은 V8에서 고도로 최적화된 적절한 배열을 사용하는 것보다 느립니다. 배열 내장 함수(array built-ins)를 이 객체에서 여러 번 사용하려는 경우, 사전에 실제 배열로 변환하는 것을 고려하십시오:

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// 이는 '0: a', '1: b', 그리고 최종적으로 '2: c'를 출력합니다.
```

한 번의 변환 비용은 나중의 최적화를 위해 가치가 있을 수 있습니다. 특히 배열에서 많은 작업을 수행하려는 경우 더욱 그렇습니다.

예를 들어, `arguments` 객체는 배열 유사 객체입니다. 배열 내장 메서드를 호출할 수 있지만, 이러한 작업은 적절한 배열에서처럼 완전히 최적화되지는 않습니다.

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// 이는 '0: a', '1: b', 그리고 최종적으로 '2: c'를 출력합니다.
```

ES2015의 rest parameter는 여기서 도움을 줄 수 있습니다. 이것은 배열 유사 `arguments` 객체 대신 사용할 수 있는 적절한 배열을 생성합니다.

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// 이는 '0: a', '1: b', 그리고 최종적으로 '2: c'를 출력합니다.
```

오늘날에는 `arguments` 객체를 직접 사용하는 이유가 거의 없습니다.

일반적으로, 가능한 한 배열 유사 객체를 피하고 적절한 배열을 사용하는 것이 좋습니다.

### 다형성 피하기

여러 가지 요소 유형을 처리하는 배열을 다루는 코드가 있다면, 이는 코드가 단일 요소 유형만 다루는 버전보다 느린 다형적 작업(polymorphic operations)으로 이어질 수 있습니다.

다음 예를 고려하십시오, 여기서는 다양한 요소 유형으로 라이브러리 함수를 호출합니다. (참고로, 이는 본고에서 논의된 요소 유형별 최적화 외에도 자체 최적화 세트를 갖춘 네이티브 `Array.prototype.forEach`가 아닙니다.)

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each(['a', 'b', 'c'], doSomething);
// `each`는 `PACKED_ELEMENTS`로 호출됩니다. V8은 이 특정 요소 유형으로 `each`가 호출된다는 것을 기억하기 위해 인라인 캐시
// (또는 “IC”)를 사용합니다. V8은 낙관적이며, `each` 함수 내부의 `array.length` 및 `array[index]` 접근이 모노모픽적인
// (즉, 단일 요소 유형만 받는) 것으로 가정합니다. 이후 `each`를 호출할 때마다 V8은 요소 유형이 `PACKED_ELEMENTS`인지 확인합니다.
// 맞다면 이전에 생성된 코드를 재사용할 수 있습니다. 그렇지 않은 경우에는 더 많은 작업이 필요합니다.

each([1.1, 2.2, 3.3], doSomething);
// `each`가 `PACKED_DOUBLE_ELEMENTS`와 함께 호출됩니다. V8은
// 이제 `each`에서 전달된 다양한 elements kinds를 IC에서
// 보았기 때문에, `each` 함수 내의 `array.length` 및 `array[index]`
// 접근이 다형적으로 표시됩니다. 이제 V8은 `each`가 호출될 때마다 추가 검사를
// 수행해야 합니다: `PACKED_ELEMENTS` (이전과 동일),
// `PACKED_DOUBLE_ELEMENTS`를 위한 새 검사, 그리고 이전과 같은
// 다른 elements kinds를 처리하는 검사. 이는 성능에 영향을 미칩니다.

each([1, 2, 3], doSomething);
// `each`가 `PACKED_SMI_ELEMENTS`와 함께 호출됩니다. 이는 또 다른
// 다형성 수준을 유발합니다. 이제 `each`에 대한 IC에 세 가지
// 다른 elements kinds가 있습니다. 이제부터 모든 `each` 호출에서는
// 생성된 코드를 재사용하기 위해 또 다른 elements kind 검사가
// 필요합니다. 이는 성능 비용을 수반합니다.
```

내장 메서드(예: `Array.prototype.forEach`)는 이런 유형의 다형성을 훨씬 더 효율적으로 처리할 수 있으므로, 성능이 중요한 상황에서는 사용자 정의 라이브러리 함수 대신 이를 사용하는 것을 고려하세요.

V8에서의 단형성과 다형성의 또 다른 예는 객체 모양, 즉 객체의 숨겨진 클래스와 관련이 있습니다. 이에 대해 자세히 알고 싶다면 [Vyacheslav의 글](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html)을 확인하세요.

### 구멍 생성 피하기

실제 코딩 패턴에서는 구멍이 생긴 배열과 패킹된 배열을 접근하는 데 있어 성능 차이가 보통은 너무 작거나 측정할 수 없는 정도입니다. (그리고 이건 큰 “만약”입니다!) 성능 측정 결과 최적화된 코드에서의 단 한 줄의 CPU 명령어라도 절약할 가치가 있다고 판단된다면, 배열을 패킹된 elements 모드로 유지하려고 시도해 볼 수 있습니다. 예를 들어 배열을 생성하려고 할 때:

```js
const array = new Array(3);
// 배열은 이 시점에서 스파스(sparse)하며, 따라서
// `HOLEY_SMI_ELEMENTS`로 표시됩니다. 즉,
// 현재 정보로 가능한 가장 특정한 요소 종류입니다.
array[0] = 'a';
// 잠시만요, 작은 정수 대신 문자열이네요… 그래서
// 종류가 `HOLEY_ELEMENTS`로 전환됩니다.
array[1] = 'b';
array[2] = 'c';
// 이 시점에서, 배열의 세 위치가 모두 채워졌으므로
// 배열은 패킹됩니다(더 이상 스파스하지 않습니다). 그러나
// `PACKED_ELEMENTS`와 같은 더 특정한 종류로 전환할 수 없습니다.
// 요소 종류는 `HOLEY_ELEMENTS`로 남습니다.
```

배열이 한 번 구멍 있는(holey) 상태로 표시되면 나중에 모든 요소가 존재하더라도 그 상태로 남아 있습니다!

배열을 생성하는 더 나은 방법은 리터럴(literal)을 사용하는 것입니다:

```js
const array = ['a', 'b', 'c'];
// 요소 종류: PACKED_ELEMENTS
```

미리 알 수 없는 값들이 있다면, 빈 배열을 생성하고 나중에 `push` 메서드로
값들을 추가하세요.

```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```

이 접근 방식은 배열이 홀리 요소 종류로 변환되지 않도록 보장합니다. 결과적으로, V8은 이 배열에 대한 일부 연산에 대해 조금 더 빠른 최적화된 코드를 생성할 가능성이 있습니다.

## 요소 종류 디버깅

주어진 객체의 “요소 종류”를 알아내려면, `d8`의 디버그 빌드를 가져오세요([소스 빌드](/docs/build)로 디버그 모드에서 빌드하거나 [`jsvu`](https://github.com/GoogleChromeLabs/jsvu)를 사용해 프리컴파일된 바이너리를 가져올 수 있습니다) 그리고 실행하세요:

```bash
out/x64.debug/d8 --allow-natives-syntax
```

이는 `d8` REPL을 엽니다. 여기에서 `%DebugPrint(object)`와 같은
[특수 함수](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime.h?l=20&rcl=05720af2b09a18be5c41bbf224a58f3f0618f6be)를 사용할 수 있습니다. 출력의 “elements” 필드에서 제공한 객체의 “요소 종류”를 알 수 있습니다.

```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```

참고로 “COW”는 [Copy-on-Write](https://en.wikipedia.org/wiki/Copy-on-write)의 약자로, 이는 또 다른 내부 최적화를 나타냅니다. 지금은 걱정하지 마세요 — 이는 또 다른 블로그 게시물의 주제입니다!

디버그 빌드에서 사용할 수 있는 또 다른 유용한 플래그는 `--trace-elements-transitions`입니다. 이를 활성화하면 V8이 요소 종류 전환이 발생할 때마다 정보를 제공합니다.

```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
elements transition [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] in ~+34 at x.js:2 for 0x1df87228c911 <JSArray[3]> from 0x1df87228c889 <FixedArray[3]> to 0x1df87228c941 <FixedDoubleArray[22]>
```
