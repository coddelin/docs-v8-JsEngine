---
title: '`String.prototype.matchAll`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-02-02
tags:
  - ECMAScript
  - ES2020
  - io19
description: 'String.prototype.matchAll를 사용하여 주어진 정규식이 생성하는 모든 매치 객체를 쉽게 순회할 수 있습니다.'
---
문자열에서 동일한 정규식을 반복 적용하여 모든 매치를 찾는 것은 일반적인 경우입니다. 어느 정도는 `String#match` 메서드를 사용하여 오늘날에도 가능합니다.

이 예제에서, 우리는 16진수 숫자로만 구성된 모든 단어를 찾고 각 매치를 로그로 출력합니다:

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// 출력:
//
// 'DEADBEEF'
// 'CAFE'
```

그러나 이것은 매치된 _서브스트링_만 제공합니다. 일반적으로 여러분은 서브스트링뿐만 아니라 각 서브스트링의 인덱스 또는 각 매치 내의 캡처 그룹과 같은 추가 정보를 원합니다.

자체 반복문을 작성하고 매치 객체를 스스로 추적함으로써 이를 달성할 수 있습니다. 그러나 이것은 다소 번거롭고 그렇게 편리하지 않습니다:

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// 출력:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

새로운 `String#matchAll` API를 사용하면 이전보다 더 쉽게 매치 객체를 얻을 수 있습니다. 이제 간단한 `for`-`of` 루프를 작성하여 모든 매치 객체를 가져올 수 있습니다.

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// 출력:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

`String#matchAll`은 캡처 그룹이 포함된 정규식에서 특히 유용합니다. 이는 각 개별 매치에 대한 캡처 그룹 포함 정보를 제공합니다.

```js
const string = 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} at ${match.index} with '${match.input}'`);
  console.log(`→ owner: ${match.groups.owner}`);
  console.log(`→ repo: ${match.groups.repo}`);
}

<!--truncate-->
// 출력:
//
// tc39/ecma262 at 23 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: tc39
// → repo: ecma262
// v8/v8.dev at 36 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: v8
// → repo: v8.dev
```

일반적인 아이디어는 간단한 `for`-`of` 루프를 작성하면 `String#matchAll`이 나머지를 처리한다는 것입니다.

:::note
**참고:** 이름에서 알 수 있듯이, `String#matchAll`은 _모든_ 매치 객체를 순회하기 위한 것입니다. 이로 인해 `g` 플래그가 설정된 글로벌 정규식과 함께 사용해야 하며, 비글로벌 정규식은 하나의 매치만(최대) 생성할 수 있습니다. 비글로벌 정규식으로 `matchAll`을 호출하면 `TypeError` 예외가 발생합니다.
:::

## `String.prototype.matchAll` 지원

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
