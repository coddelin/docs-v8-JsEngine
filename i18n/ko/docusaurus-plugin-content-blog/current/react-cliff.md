---
title: 'React에서의 V8 성능 저하 이야기'
author: 'Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)) 및 Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'benedikt-meurer'
  - 'mathias-bynens'
date: 2019-08-28 16:45:00
tags:
  - internals
  - presentations
description: '이 글에서는 V8이 다양한 JavaScript 값을 메모리에 최적으로 표현하는 방법과 그로 인해 Shape 기계에 어떤 영향을 미치는지를 설명합니다. 이를 통해 최근 React 핵심에서 발생한 V8 성능 저하 현상을 이해할 수 있습니다.'
tweet: '1166723359696130049'
---
[이전](https://mathiasbynens.be/notes/shapes-ics)에는 Shapes와 Inline Caches를 사용하여 JavaScript 엔진이 객체 및 배열 접근을 최적화하는 방식을 논의했고, [프로토타입 속성 접근 속도를 높이는 방법](https://mathiasbynens.be/notes/prototypes)을 탐구했습니다. 이번 글에서는 V8이 다양한 JavaScript 값을 메모리에 최적으로 표현하는 방식을 설명하며, Shape 기계에 어떤 영향을 미치는지 — 이러한 모든 내용은 [React 핵심에서 발생한 최근 V8 성능 저하](https://github.com/facebook/react/issues/14365)를 이해하는 데 도움이 됩니다.

<!--truncate-->
:::note
**참고:** 글을 읽는 것보다 발표를 보는 것을 선호한다면 아래의 동영상을 즐겨 보세요! 그렇지 않다면 동영상을 건너뛰고 글을 계속 읽으세요.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">“JavaScript 엔진 기본 사항: 좋음, 나쁨, 그리고 이상함”</a> - Mathias Bynens와 Benedikt Meurer가 AgentConf 2019에서 발표한 내용</figcaption>
</figure>

## JavaScript 타입

모든 JavaScript 값은 (현재로서는) 정확히 여덟 가지 서로 다른 타입 중 하나를 갖습니다: `Number`, `String`, `Symbol`, `BigInt`, `Boolean`, `Undefined`, `Null`, 그리고 `Object`.

![](/_img/react-cliff/01-javascript-types.svg)

주목할만한 예외 하나를 제외하고, 이들 타입은 JavaScript에서 `typeof` 연산자를 통해 관찰할 수 있습니다:

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null`은 `'object'`를 반환하며, `'null'`을 반환하지 않습니다. 비록 `Null`이 하나의 독립된 타입이지만요. 이유를 이해하려면, 모든 JavaScript 타입 집합이 두 그룹으로 나뉜다는 것을 고려해보세요:

- _객체_ (즉, `Object` 타입)
- _원시 값_ (즉, 객체가 아닌 모든 값)

따라서, `null`은 “객체 값이 없음”을 의미하는 반면, `undefined`는 “값이 없음”을 의미합니다.

![](/_img/react-cliff/02-primitives-objects.svg)

이러한 사고 방식을 따르며, Brendan Eich는 JavaScript를 설계하면서 `typeof`가 오른쪽에 있는 모든 값, 즉 모든 객체 및 `null` 값에 대해 `'object'`를 반환하도록 했습니다. 이는 Java의 정신에 따라 이루어진 것입니다. 이 때문에 사양에 별도의 `Null` 타입이 있음에도 불구하고 `typeof null === 'object'`로 표시됩니다.

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## 값 표현

JavaScript 엔진은 메모리에서 임의의 JavaScript 값을 표현할 수 있어야 합니다. 그러나 값의 JavaScript 타입과 JavaScript 엔진이 메모리에서 그 값을 표현하는 방식은 분리된다는 점을 이해하는 것이 중요합니다.

예를 들어, `42`라는 값은 JavaScript에서 `number` 타입을 가집니다.

```js
typeof 42;
// → 'number'
```

메모리에서 `42`와 같은 정수 숫자를 표현하는 방법은 여러 가지가 있습니다:

:::table-wrapper
| 표현                              | 비트                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------- |
| 2의 보수 8비트                     | `0010 1010`                                                                       |
| 2의 보수 32비트                    | `0000 0000 0000 0000 0000 0000 0010 1010`                                         |
| 압축된 이진 코드화된 십진수 (BCD)  | `0100 0010`                                                                       |
| 32비트 IEEE-754 부동소수점        | `0100 0010 0010 1000 0000 0000 0000 0000`                                         |
| 64비트 IEEE-754 부동소수점        | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

ECMAScript는 숫자를 64비트 부동소수점 값으로 표준화합니다. 이를 _이중 정밀 부동소수점_ 또는 _Float64_라고도 합니다. 하지만 이는 JavaScript 엔진이 숫자를 항상 Float64 표현으로 저장한다는 것을 의미하지는 않습니다 — 그렇게 하면 효율성이 매우 떨어질 것입니다! 엔진은 외부에서 관찰 가능한 동작이 Float64와 정확히 일치하기만 하면 다른 내부 표현을 선택할 수 있습니다.

대부분의 실세계 JavaScript 애플리케이션에서 숫자는 [유효한 ECMAScript 배열 인덱스](https://tc39.es/ecma262/#array-index)인 경우가 많습니다. 즉, 0부터 2³²−2 범위의 정수 값입니다.

```js
array[0]; // 가능한 가장 작은 배열 인덱스
array[42];
array[2**32-2]; // 가능한 가장 큰 배열 인덱스
```

JavaScript 엔진은 배열 요소를 인덱스에 의해 접근하는 코드를 최적화하기 위해 이러한 숫자에 대해 최적의 메모리 표현을 선택할 수 있습니다. 프로세서가 메모리 접근 작업을 수행하려면 배열 인덱스가 [2의 보수](https://en.wikipedia.org/wiki/Two%27s_complement) 형식으로 제공되어야 합니다. 배열 인덱스를 Float64로 표현하는 것은 비효율적이며, 배열 요소를 접근할 때마다 엔진이 Float64와 2의 보수 형식 간 변환을 수행해야 하기 때문입니다.

32비트 2의 보수 표현은 배열 작업에만 유용하지 않습니다. 일반적으로 **프로세서는 정수 연산을 부동 소수점 연산보다 훨씬 빠르게 실행합니다**. 따라서 다음 예제에서 첫 번째 루프는 두 번째 루프에 비해 두 배 빠르게 실행됩니다.

```js
for (let i = 0; i < 1000; ++i) {
  // 빠름 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // 느림 🐌
}
```

운영도 마찬가지입니다. 다음 코드 조각에서 모듈로 연산자의 성능은 정수를 다루는지 여부에 따라 달라집니다.

```js
const remainder = value % divisor;
// `value`와 `divisor`가 정수로 표시되면 빠름 🚀,
// 그렇지 않으면 느림 🐌.
```

두 피연산자가 정수로 표현되면 CPU는 결과를 매우 효율적으로 계산할 수 있습니다. V8은 `divisor`가 2의 제곱인 경우에 대해 추가적인 빠른 경로도 제공합니다. 값이 부동 소수점으로 표현되는 경우 계산이 훨씬 복잡해지고 시간이 더 오래 걸립니다.

정수 연산이 일반적으로 부동 소수점 연산보다 훨씬 더 빠르게 실행되기 때문에, 엔진이 모든 정수와 모든 정수 연산 결과에 대해 항상 2의 보수를 사용할 것처럼 보일 수 있습니다. 그러나 이는 ECMAScript 사양을 위반하는 것입니다! ECMAScript는 Float64를 표준으로 정하며, 따라서 **특정 정수 연산은 실제로 부동 소수점을 생성합니다**. 이러한 경우 JS 엔진이 정확한 결과를 생성하는 것이 중요합니다.

```js
// Float64는 안전한 정수 범위가 53비트입니다. 이 범위를 벗어나면
// 정밀도가 손실됩니다.
2**53 === 2**53+1;
// → true

// Float64는 음수 0을 지원하므로 -1 * 0은 -0이어야 하지만,
// 2의 보수에서 음수 0을 표현할 방법은 없습니다.
-1*0 === -0;
// → true

// Float64는 0으로 나누기를 통해 생성할 수 있는 무한도 지원합니다.
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64에는 NaN도 있습니다.
0/0 === NaN;
```

왼쪽의 값이 정수라 하더라도 오른쪽의 모든 값은 부동 소수점입니다. 따라서 위 연산 중 어느 것도 32비트 2의 보수를 사용하여 올바르게 수행할 수 없습니다. JavaScript 엔진은 정수 연산이 적절하게 되돌아가 Fancy Float64 결과를 생성하게 하기 위해 특별히 주의를 기울여야 합니다.

31비트 부호 있는 정수 범위의 작은 정수에 대해 V8은 `Smi`라는 특수 표현을 사용합니다. `Smi`가 아닌 모든 것은 `HeapObject`로 표현되며, 이는 메모리 내의 어떤 엔티티의 주소입니다. 숫자의 경우, `HeapObject`의 특별한 종류인 `HeapNumber`를 사용하여 `Smi` 범위에 없는 숫자를 표현합니다.

```js
 -Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

위 예에서 볼 수 있듯이, 일부 JavaScript 숫자는 `Smi`로 표현되고, 다른 숫자는 `HeapNumber`로 표현됩니다. V8은 실세계 JavaScript 프로그램에서 작은 정수가 매우 일반적이기 때문에 `Smi`에 대해 특별히 최적화되어 있습니다. `Smi`는 메모리에 전용 엔티티로 할당될 필요가 없으며, 일반적으로 빠른 정수 연산을 가능하게 합니다.

여기서 중요한 점은, **동일한 JavaScript 유형을 가진 값들이 내부적으로 완전히 다른 방식으로 표현될 수 있다**는 점입니다. 이는 최적화를 위한 것입니다.

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

다음은 내부적으로 작동하는 방식입니다. 다음 객체가 있다고 가정해 봅시다:

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

`x`의 값 `42`는 `Smi`로 인코딩될 수 있으므로 객체 자체에 저장될 수 있습니다. 반면, `y`의 값 `4.2`는 값을 보유하기 위한 별도의 엔티티가 필요하며, 객체는 해당 엔티티를 가리킵니다.

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

이제 다음 JavaScript 코드를 실행한다고 가정해 보겠습니다:

```js
o.x += 10;
// → o.x는 이제 52입니다
o.y += 1;
// → o.y는 이제 5.2입니다
```

이 경우 `x`의 값은 새 값 `52`도 `Smi` 범위에 맞기 때문에 제자리에서 업데이트될 수 있습니다.

![](/_img/react-cliff/05-update-smi.svg)

하지만 `y=5.2`의 새로운 값은 `Smi`에 맞지 않으며 이전 값인 `4.2`와도 다르므로, V8은 `y`에 할당하기 위해 새로운 `HeapNumber` 엔티티를 할당해야 합니다.

![](/_img/react-cliff/06-update-heapnumber.svg)

`HeapNumber`는 변경할 수 없기 때문에 특정 최적화가 가능해집니다. 예를 들어, `y`의 값을 `x`에 할당한다고 가정하면:

```js
o.x = o.y;
// → o.x는 이제 5.2입니다
```

…이제 동일한 값을 위해 새로운 `HeapNumber`를 할당하는 대신, 단순히 동일한 `HeapNumber`를 참조하면 됩니다.

![](/_img/react-cliff/07-heapnumbers.svg)

`HeapNumber`가 불변이라는 단점은 다음과 같은 경우 자주 `Smi` 범위 외의 값으로 필드를 업데이트하는 것이 느릴 수 있다는 점입니다.

```js
// `HeapNumber` 인스턴스를 생성합니다.
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // 또 다른 `HeapNumber` 인스턴스를 생성합니다.
  o.x += 1;
}
```

첫 번째 줄에서는 초기 값 `0.1`로 `HeapNumber` 인스턴스를 생성합니다. 루프 본문은 이 값을 `1.1`, `2.1`, `3.1`, `4.1`, 그리고 마지막으로 `5.1`로 변경하며, 이 과정에서 총 여섯 개의 `HeapNumber` 인스턴스가 생성되는데, 루프가 끝나면 그 중 다섯 개는 가비지가 됩니다.

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

이 문제를 피하기 위해 V8은 최적화로 비 `Smi` 숫자 필드를 제자리에서 업데이트할 수 있는 방법을 제공합니다. 숫자 필드가 `Smi` 범위를 벗어난 값을 보유할 경우, V8은 해당 필드를 형태상 `Double` 필드로 표시하고, 실제 값을 Float64로 인코딩한 `MutableHeapNumber`를 할당합니다.

![](/_img/react-cliff/09-mutableheapnumber.svg)

필드의 값이 변경되면 V8은 새로운 `HeapNumber`를 할당할 필요 없이 제자리에서 `MutableHeapNumber`를 업데이트할 수 있습니다.

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

그러나 이 접근 방식에도 주의할 점이 있습니다. `MutableHeapNumber`의 값이 변경될 수 있으므로, 이러한 값이 다른 곳으로 전달되지 않는 것이 중요합니다.

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

예를 들어, `o.x`를 다른 변수 `y`에 할당할 경우, 다음에 `o.x`가 변경될 때 `y`의 값이 변경되는 것은 원치 않을 것입니다. 이는 JavaScript 사양을 위반하는 것이기 때문입니다! 따라서 `o.x`에 접근할 때, 숫자는 일반 `HeapNumber`로 다시 포장된 후에야 `y`에 할당됩니다.

부동소수점 숫자의 경우, V8은 위에서 언급한 모든 “포장” 작업을 백그라운드에서 수행합니다. 그러나 작은 정수의 경우 `Smi`가 더 효율적인 표현이므로, `MutableHeapNumber` 접근 방식을 사용하는 것은 낭비가 될 것입니다.

```js
const object = { x: 1 };
// → object의 `x`에는 “포장”이 없습니다

object.x += 1;
// → object 내부의 `x` 값을 업데이트합니다.
```

비효율성을 피하기 위해, 작은 정수에 대해서는 형태 상 필드를 `Smi` 표현으로 표시하고, 작은 정수 범위에 맞는 한 숫자 값을 제자리에서 단순히 업데이트하면 됩니다.

![](/_img/react-cliff/12-smi-no-boxing.svg)

## 형태 감소 및 이행

그러면 처음엔 `Smi`를 포함하다가 나중에 작은 정수 범위를 벗어난 숫자를 포함하는 필드는 어떻게 될까요? 다음과 같이 처음에 동일한 형태를 사용하는 두 객체에서 `x`가 `Smi`로 표현된 경우를 생각해봅시다.

```js
const a = { x: 1 };
const b = { x: 2 };
// → 객체는 이제 `x`를 `Smi` 필드로 가집니다

b.x = 0.2;
// → 이제 `b.x`는 `Double`로 표현됩니다

y = a.x;
```

이는 `x`가 `Smi` 표현으로 표시된 동일한 형태를 가리키는 두 객체로 시작됩니다.

![](/_img/react-cliff/13-shape.svg)

`b.x`가 `Double` 표현으로 변경되면, V8은 `x`에 `Double` 표현이 할당된 새로운 형태를 할당하고, 이를 빈 형태로 되돌립니다. 또한 `x` 속성의 새로운 값인 `0.2`를 보유할 `MutableHeapNumber`를 할당합니다. 그런 다음 객체 `b`를 이 새 형태를 가리키도록 업데이트하고, 객체 내부 슬롯을 이전에 할당된 `MutableHeapNumber`를 가리키도록 변경합니다. 마지막으로, 이전 형태를 사용 중단하고 전환 트리에서 링크를 끊습니다. 이는 빈 형태에서 새로 생성된 형태로 `‘x’`에 대한 전환을 생성하여 수행됩니다.

![](/_img/react-cliff/14-shape-transition.svg)

이 시점에서 `a`가 여전히 사용 중이므로 이전 형태를 완전히 제거할 수는 없습니다. 메모리를 탐색하여 이전 형태를 가리키는 모든 객체를 찾아 이를 즉시 업데이트하는 것은 너무 비용이 많이 들기 때문입니다. 대신 V8은 이를 지연식으로 처리합니다: `a`에 대한 속성 접근이나 할당 작업이 수행될 때, 먼저 새 형태로 마이그레이션됩니다. 목표는 사용되지 않는 형태를 점진적으로 도달할 수 없는 상태로 만들고 가비지 수집기가 이를 제거하도록 하는 것입니다.

![](/_img/react-cliff/15-shape-deprecation.svg)

더 까다로운 경우는 표현이 변경되는 필드가 체인의 마지막이 아닐 때 발생합니다:

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

이 경우 V8은 이른바 _분리 형태_를 찾아야 합니다. 이는 관련 속성이 소개되기 전에 체인에서 마지막 형태입니다. 여기서는 `y`를 변경하고 있으므로, `y`가 없는 마지막 형태를 찾아야 하며, 이는 예제에서 `x`가 도입된 형태입니다.

![](/_img/react-cliff/16-split-shape.svg)

분할된 모양에서 시작하여, 우리가 `'y'`를 `Double` 표현으로 표시하여 이전의 모든 전환을 재현하는 새로운 전환 체인을 생성합니다. 그리고 이 새로운 전환 체인을 사용하여 `y`를 관리하며, 이전 하위 트리를 사용되지 않음으로 표시합니다. 마지막 단계에서 우리는 `o` 인스턴스를 새로운 모양으로 이동시키고, 이제는 `y`의 값을 보유하기 위해 `MutableHeapNumber`를 사용합니다. 이렇게 하면 새로운 객체는 이전 경로를 따라가지 않으며, 이전 모양에 대한 모든 참조가 없어지면 트리의 사용되지 않는 모양 부분이 사라지게 됩니다.

## 확장성과 무결성 수준 전환

`Object.preventExtensions()`은 객체에 새로운 속성을 추가하는 것을 막습니다. 만약 시도하면 예외가 발생합니다. (엄격 모드가 아닐 때는 예외를 발생시키지 않고 조용히 아무 일도 하지 않습니다.)

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: Cannot add property y;
//            object is not extensible
```

`Object.seal`은 `Object.preventExtensions`과 동일하게 동작하지만, 모든 속성을 비구성 가능으로 표시합니다. 즉, 속성을 삭제하거나, 열거 가능성, 구성 가능성 또는 쓰기 가능성을 변경할 수 없습니다.

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: Cannot add property y;
//            object is not extensible
delete object.x;
// TypeError: Cannot delete property x
```

`Object.freeze`는 `Object.seal`과 동일하게 동작하지만, 기존 속성의 값을 변경하는 것을 막기 위해 속성을 쓰기 불가능으로 표시합니다.

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: Cannot add property y;
//            object is not extensible
delete object.x;
// TypeError: Cannot delete property x
object.x = 3;
// TypeError: Cannot assign to read-only property x
```

이 구체적인 예제를 고려해 봅시다. 두 개의 객체가 각각 단일 속성 `x`를 가지고 있으며, 그 중 두 번째 객체에 대해 향후 확장을 방지합니다.

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

빈 모양에서 속성 `'x'`를 포함하는 새로운 모양으로의 전환부터 시작되는 것을 이미 알고 있습니다(이 속성은 `Smi`로 표시됨). 우리는 `b`에 대한 확장을 방지하며, 비확장 가능으로 표시된 새로운 모양으로 특별한 전환을 수행합니다. 이 특별한 전환은 새로운 속성을 추가하지 않습니다 — 단지 마커 역할을 합니다.

![](/_img/react-cliff/17-shape-nonextensible.svg)

확장 가능했던 다른 객체 `a`에서 이 모양을 여전히 필요로 하기 때문에, `x`를 포함하는 모양을 인플레이스로 업데이트할 수는 없습니다.

## React 성능 문제

이제 우리가 배운 것을 함께 모아 [최근 React 이슈 #14365](https://github.com/facebook/react/issues/14365)를 이해해 봅시다. React 팀이 실제 앱을 프로파일링 할 때 React의 핵심에 영향을 미치는 V8 성능 문제를 발견했습니다. 버그에 대한 간단한 재현:

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

우리는 `Smi` 표현을 가지는 두 필드가 있는 객체를 가지고 있습니다. 우리는 객체에 대한 더 이상의 확장을 방지하고, 결국 두 번째 필드를 `Double` 표현으로 강제합니다.

이전에 배운 것처럼 대략적으로 다음과 같은 설정을 만듭니다:

![](/_img/react-cliff/18-repro-shape-setup.svg)

두 속성이 `Smi` 표현으로 표시되며, 최종 전환은 모양을 비확장 가능으로 표시하는 확장성 전환입니다.

이제 `y`를 `Double` 표현으로 변경해야 하므로, 다시 분할 모양을 찾아야 합니다. 이 경우 `x`를 도입한 모양입니다. 그러나 이번에는 V8이 혼란을 느꼈습니다. 분할 모양은 확장 가능했고 현재 모양은 비확장 가능으로 표시되었습니다. 그리고 V8은 이런 경우 전환을 올바르게 재생하는 방법을 몰랐습니다. 그래서 V8은 결국 이를 이해하려고 하지 않고 기존 모양 트리와 연결되지 않고 다른 객체와 공유되지 않는 별개의 모양을 생성했습니다. 이를 _고아 모양_으로 생각할 수 있습니다:

![](/_img/react-cliff/19-orphaned-shape.svg)

많은 객체에서 이런 일이 발생하면 전체 모양 시스템이 무용지물이 될 수 있습니다.

React의 경우, 여기서 발생한 것은 각 `FiberNode`에 프로파일링이 활성화될 때 타임스탬프를 보유하기 위한 몇 가지 필드가 있다는 것입니다.

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

이 필드(`actualStartTime` 등)는 `0` 또는 `-1`로 초기화되며, 따라서 `Smi` 표현으로 시작됩니다. 그러나 나중에 [`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now)에서 가져온 실제 부동 소수점 타임스탬프가 이러한 필드에 저장되며, 이는 `Smi`에 맞지 않기 때문에 `Double` 표현으로 전환합니다. 게다가 React는 `FiberNode` 인스턴스에 대한 확장도 방지합니다.

초기에 위의 간단한 예제는 다음과 같이 보였습니다:

![](/_img/react-cliff/20-fibernode-shape.svg)

두 인스턴스가 모양 트리를 공유하며, 모두 의도대로 작동합니다. 그러나 실제 타임스탬프를 저장할 때 V8이 분할 모양을 찾는 데 혼란을 느낍니다:

![](/_img/react-cliff/21-orphan-islands.svg)

V8는 `node1`에 새로운 고립된 쉐이프를 부여하고, 나중에 동일한 일이 `node2`에서 발생하여 두 개의 _고립된 섬_이 생깁니다. 각 섬은 서로 분리된 쉐이프를 가지고 있습니다. 많은 실제 React 앱에서는 두 개가 아니라, 수만 개의 이러한 `FiberNode`가 존재합니다. 이 상황이 V8의 성능에 특히 좋지 않았음을 상상할 수 있을 것입니다.

운 좋게도 [우리는 이 성능 문제를 수정했습니다.](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/) [V8 v7.4](/blog/v8-release-74)에서, 그리고 우리는 [필드 표현 변경을 더 저렴하게 만드는 방법](https://bit.ly/v8-in-place-field-representation-changes)을 모색하여 남아있는 성능 문제를 제거하려고 노력하고 있습니다. 수정 후, V8은 이제 다음과 같은 올바른 작업을 수행합니다:

![](/_img/react-cliff/22-fix.svg)

두 개의 `FiberNode` 인스턴스가 비확장성이 있는 쉐이프를 참조하며, 여기서 `'actualStartTime'`은 `Smi` 필드입니다. `node1.actualStartTime`의 첫 번째 할당이 발생하면 새로운 전환 체인이 생성되고 이전 체인은 폐기된 것으로 표시됩니다:

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

확장성 전환이 이제 새로운 체인에서 올바르게 재생된 것을 주목하세요.

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

node2.actualStartTime에 할당한 후, 두 노드가 새로운 쉐이프를 참조하며, 전환 트리의 폐기된 부분은 쓰레기 수집기에 의해 정리될 수 있습니다.

:::note
**참고:** 정형 폐기/마이그레이션이 복잡하다고 생각할 수 있으며, 그 생각이 맞습니다. 사실 우리가 의심하는 바는 실제 웹사이트에서 그것이 (성능, 메모리 사용량 및 복잡성 측면에서) 더 많은 문제를 일으킨다는 것입니다. 특히 [포인터 압축](https://bugs.chromium.org/p/v8/issues/detail?id=7703)을 사용하면 더 이상 인라인 객체에 더블 값 필드를 저장할 수 없습니다. 그래서 우리는 [V8의 정형 폐기 메커니즘을 완전히 제거하려고 합니다.](https://bugs.chromium.org/p/v8/issues/detail?id=9606) 당신은 그것이 _\*선글라스를 쓰며\*_ 폐기될 예정이라고 말할 수 있습니다. _YEEEAAAHHH…_
:::

React 팀은 [자체적으로 문제를 해결](https://github.com/facebook/react/pull/14383)하기 위해 `FiberNode`의 모든 시간 및 지속 시간 필드가 처음부터 `Double` 표현으로 시작하도록 설정했습니다:

```js
class FiberNode {
  constructor() {
    // 초기부터 `Double` 표현을 강제합니다.
    this.actualStartTime = Number.NaN;
    // 나중에 원하는 값으로 초기화할 수 있습니다:
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

`Number.NaN` 대신 `Smi` 범위에 맞지 않는 임의의 부동 소수점 값을 사용할 수 있습니다. 예로는 `0.000001`, `Number.MIN_VALUE`, `-0`, 및 `Infinity` 등이 포함됩니다.

구체적인 React 버그는 V8-특유의 문제였고, 일반적으로 개발자가 특정 JavaScript 엔진 버전에 최적화하지 않는 것이 좋습니다. 그렇지만 상황이 제대로 작동하지 않을 때 대처할 수 있는 것은 좋은 일입니다.

JavaScript 엔진이 백그라운드에서 몇 가지 마법을 수행한다는 점을 기억하세요. 가능한 한 유형을 혼합하지 않도록 하면 도움이 됩니다. 예를 들어, 숫자 필드를 `null`로 초기화하지 마세요. 이는 필드 표현 추적의 모든 이점을 비활성화하며, 코드를 더욱 읽기 쉽게 만듭니다:

```js
// 이렇게 하지 마세요!
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

말하자면, **읽기 쉬운 코드를 작성하면 성능이 따라옵니다!**

## 요약

이번 심층 분석에서 다음 사항을 다루었습니다:

- JavaScript는 “기본형”과 “객체”를 구별하며, `typeof`는 정확하지 않습니다.
- 동일한 JavaScript 타입을 가진 값도 내부적으로 다른 표현을 가질 수 있습니다.
- V8은 JavaScript 프로그램의 모든 속성에 대해 최적의 표현을 찾으려고 노력합니다.
- V8이 정형 폐기 및 마이그레이션을 처리하는 방식, 확장성 전환을 포함하여 논의했습니다.

이 지식을 바탕으로 성능을 높이는 데 도움이 되는 몇 가지 실용적인 JavaScript 코딩 팁을 확인했습니다:

- 항상 객체를 동일한 방식으로 초기화하여 쉐이프가 효과적일 수 있도록 합니다.
- JavaScript 엔진의 표현 선택에 도움이 되는 합리적인 초기 값을 선택하세요.
