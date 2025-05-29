---
title: '`Object.fromEntries`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias)), JavaScript 전문가'
avatars:
  - 'mathias-bynens'
date: 2019-06-18
tags:
  - ECMAScript
  - ES2019
  - io19
description: 'Object.fromEntries는 Object.entries를 보완하는 유용한 자바스크립트 내장 라이브러리 추가 기능입니다.'
tweet: '1140993821897121796'
---
`Object.fromEntries`는 자바스크립트 내장 라이브러리에 유용한 추가 기능입니다. 무엇을 하는지 설명하기 전에 기존의 `Object.entries` API를 이해하는 것이 도움이 됩니다.

## `Object.entries`

`Object.entries` API는 이미 오래전부터 존재해 왔습니다.

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

객체의 각 키-값 쌍에 대해 `Object.entries`는 첫 번째 요소가 키이고 두 번째 요소가 값인 배열을 제공합니다.

`Object.entries`는 특히 `for`-`of`와 결합할 때 유용하며, 객체의 모든 키-값 쌍을 우아하게 순회할 수 있게 합니다:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

for (const [key, value] of entries) {
  console.log(`The value of ${key} is ${value}.`);
}
// 출력:
// The value of x is 42.
// The value of y is 50.
```

불행히도, 현재까지는 entries 결과를 동일한 객체로 되돌리는 간단한 방법이 없었습니다… 이제는 가능합니다!

## `Object.fromEntries`

새로운 `Object.fromEntries` API는 `Object.entries`의 반대 동작을 수행합니다. 이를 통해 entries를 기반으로 객체를 손쉽게 다시 구성할 수 있습니다:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

일반적인 사용 사례 중 하나는 객체를 변환하는 것입니다. 이제 entries를 순회하고 이미 익숙한 배열 메서드를 사용하여 수행할 수 있습니다:

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

이 예제에서는 길이가 `1`인 키만 가져오도록 객체를 `filter`합니다. 즉, 키 `x`와 `y`는 포함하고, 키 `abc`는 포함하지 않습니다. 그런 다음 남아있는 entries를 `map`으로 순회하여 각 키-값 쌍에 대한 업데이트된 쌍을 반환합니다. 이 예제에서는 각 값을 `2`로 곱하여 두 배로 만듭니다. 최종 결과는 `x`와 `y` 속성만 가지며 새 값이 있는 새 객체입니다.

<!--truncate-->
## 객체 vs. 맵

자바스크립트는 `Map`도 지원하며, 이는 일반 객체보다 더 적합한 데이터 구조인 경우가 많습니다. 따라서 코드를 완전히 제어할 수 있는 경우 객체 대신 맵을 사용할 수 있습니다. 그러나 개발자로서 항상 표현 방법을 선택할 수 있는 것은 아닙니다. 때로는 외부 API에서나 객체를 반환하는 라이브러리 함수에서 데이터를 가져와야 합니다.

`Object.entries`는 객체를 맵으로 변환하는 것을 쉽게 만듭니다:

```js
const object = { language: 'JavaScript', coolness: 9001 };

// 객체를 맵으로 변환:
const map = new Map(Object.entries(object));
```

반대로 맵을 객체로 변환하는 것도 마찬가지로 유용합니다. 예를 들어 데이터를 JSON으로 직렬화하여 API 요청으로 전송해야 하거나, 객체를 기대하는 다른 라이브러리로 데이터를 전달해야 할 때입니다. 이러한 경우에, 맵 데이터를 기반으로 객체를 생성해야 합니다. `Object.fromEntries`로 이를 간단히 수행할 수 있습니다:

```js
// 맵을 다시 객체로 변환:
const objectCopy = Object.fromEntries(map);
// → { language: 'JavaScript', coolness: 9001 }
```

`Object.entries`와 `Object.fromEntries` 모두를 사용하여 이제 맵과 객체 간 변환을 쉽게 수행할 수 있습니다.

### 경고: 데이터 손실 주의

위 예제와 같이 맵을 평범한 객체로 변환할 때, 각 키가 고유하게 문자열로 변환될 것이라는 암묵적인 가정이 있습니다. 이 가정이 맞지 않으면 데이터 손실이 발생합니다:

```js
const map = new Map([
  [{}, 'a'],
  [{}, 'b'],
]);
Object.fromEntries(map);
// → { '[object Object]': 'b' }
// 참고: 값 'a'는 어디에도 없으며, 두 키 모두
// '[object Object]'로 문자열 변환됩니다.
```

`Object.fromEntries` 또는 다른 기술을 사용하여 맵을 객체로 변환하기 전에, 맵의 키가 고유한 `toString` 결과를 생성하는지 확인하십시오.

## `Object.fromEntries` 지원

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
