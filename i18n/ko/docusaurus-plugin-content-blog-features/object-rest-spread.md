---
title: "객체 나머지 및 펼침 속성"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-06-06
tags: 
  - ECMAScript
  - ES2018
description: "이 글에서는 JavaScript에서 객체 나머지 및 펼침 속성이 작동하는 방법을 설명하며, 배열 나머지 및 펼침 요소를 다시 살펴봅니다."
tweet: "890269994688315394"
---
_객체 나머지 및 펼침 속성_을 논의하기 전에, 기억을 되살리고 매우 유사한 기능을 상기해봅시다.

## ES2015 배열 나머지 및 펼침 요소

익숙한 ECMAScript 2015는 배열 구조 분해 할당을 위한 _나머지 요소_와 배열 리터럴을 위한 _펼침 요소_를 도입했습니다.

```js
// 배열 구조 분해 할당을 위한 나머지 요소:
const primes = [2, 3, 5, 7, 11];
const [first, second, ...rest] = primes;
console.log(first); // 2
console.log(second); // 3
console.log(rest); // [5, 7, 11]

// 배열 리터럴을 위한 펼침 요소:
const primesCopy = [first, second, ...rest];
console.log(primesCopy); // [2, 3, 5, 7, 11]
```

<feature-support chrome="47"
                 firefox="16"
                 safari="8"
                 nodejs="6"
                 babel="yes"></feature-support>

## ES2018: 객체 나머지 및 펼침 속성 🆕

그렇다면 새로워진 점은 무엇일까요? [제안서](https://github.com/tc39/proposal-object-rest-spread)에 따르면 객체 리터럴을 위한 나머지 및 펼침 속성도 사용할 수 있습니다.

```js
// 객체 구조 분해 할당을 위한 나머지 속성:
const person = {
    firstName: 'Sebastian',
    lastName: 'Markbåge',
    country: 'USA',
    state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: 'USA', state: 'CA' }

<!--truncate-->
// 객체 리터럴을 위한 펼침 속성:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

펼침 속성은 많은 상황에서 [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)에 대한 더 우아한 대안을 제공합니다:

```js
// 객체 얕은 복사:
const data = { x: 42, y: 27, label: 'Treasure' };
// 기존 방법:
const clone1 = Object.assign({}, data);
// 새로운 방법:
const clone2 = { ...data };
// 결과는 동일합니다:
// { x: 42, y: 27, label: 'Treasure' }

// 두 객체 병합:
const defaultSettings = { logWarnings: false, logErrors: false };
const userSettings = { logErrors: true };
// 기존 방법:
const settings1 = Object.assign({}, defaultSettings, userSettings);
// 새로운 방법:
const settings2 = { ...defaultSettings, ...userSettings };
// 결과는 동일합니다:
// { logWarnings: false, logErrors: true }
```

그러나 펼침이 setter를 처리하는 방식에는 미묘한 차이가 있습니다:

1. `Object.assign()`은 setter를 호출하지만, 펼침은 호출하지 않습니다.
1. `Object.assign()`은 상속된 읽기 전용 속성을 통해 자체 속성 생성을 중지할 수 있으나, 펼침 연산자는 그렇지 않습니다.

[Axel Rauschmayer의 글](http://2ality.com/2016/10/rest-spread-properties.html#spread-defines-properties-objectassign-sets-them)에서 이러한 함정에 대해 자세히 설명합니다.

<feature-support chrome="60"
                 firefox="55"
                 safari="11.1"
                 nodejs="8.6"
                 babel="yes"></feature-support>
