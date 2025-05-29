---
title: &apos;`Array`와 TypedArray에서 요소 찾기&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-10-27
tags:
  - ECMAScript
description: &apos;JavaScript에서 Arrays와 TypedArrays에서 요소를 찾는 방법&apos;
tweet: &apos;1453354998063149066&apos;
---
## 시작점에서 요소 찾기

`Array`에서 특정 조건을 만족하는 요소를 찾는 것은 일반적인 작업이며, `Array.prototype`와 다양한 TypedArray 프로토타입에서 `find`와 `findIndex` 메서드를 사용하여 수행됩니다. `Array.prototype.find`는 조건문을 받아 해당 조건문이 `true`를 반환하는 첫 번째 요소를 반환합니다. 조건문이 어떤 요소에 대해서도 `true`를 반환하지 않으면, 이 메서드는 `undefined`를 반환합니다.

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex`는 비슷한 방식으로 작동하지만, 요소를 찾으면 해당 인덱스를 반환하며, 찾지 못하면 `-1`을 반환합니다. TypedArray의 `find`와 `findIndex` 버전은 완전히 동일하게 작동하며, 단지 Array 인스턴스 대신 TypedArray 인스턴스를 대상으로 작동한다는 점만 다릅니다.

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## 마지막부터 요소 찾기

`Array`에서 마지막 요소를 찾고 싶다면 어떻게 해야 할까요? 여러 매칭 중 마지막 요소를 선택하거나, 특정 요소가 배열의 끝부분에 있을 가능성이 높은 상황에서 이러한 사용 사례가 자연스럽게 발생합니다. `find` 메서드를 사용하여 한 가지 해결 방법은 입력을 먼저 뒤집는 것입니다.

```js
inputArray.reverse().find(predicate)
```

그러나 이는 원래의 `inputArray`를 제자리(in-place)에서 뒤집기 때문에 바람직하지 않을 때가 있습니다.

`findLast`와 `findLastIndex` 메서드를 사용하면 이러한 사용 사례를 직접적으로 편리하게 해결할 수 있습니다. 이들은 각각의 `find`와 `findIndex`와 정확히 동일하게 작동하지만, `Array` 또는 TypedArray의 끝에서부터 검색을 시작합니다.

```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.findLast((element) => element.v % 2 === 0);
// → {v:4}
inputArray.findLast((element) => element.v % 7 === 0);
// → undefined
inputArray.findLastIndex((element) => element.v % 2 === 0);
// → 3
inputArray.findLastIndex((element) => element.v % 7 === 0);
// → -1
```

## `findLast`와 `findLastIndex` 지원

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
