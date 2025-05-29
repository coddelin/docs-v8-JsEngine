---
title: "`at` 메서드 - 상대 인덱싱을 위한 방법"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2021-07-13
tags:
  - ECMAScript
description: "JavaScript에 이제 배열, TypedArray 및 문자열을 위한 상대 인덱싱 메서드가 추가되었습니다."
---

새로운 `at` 메서드는 `Array.prototype`, 다양한 TypedArray 프로토타입 및 `String.prototype`에 추가되어 컬렉션의 끝에 가까운 요소를 더 쉽게 접근하고 간결하게 사용할 수 있습니다.

컬렉션의 끝에서 N번째 요소에 접근하는 것은 일반적인 작업입니다. 하지만 기존의 방법들은 `my_array[my_array.length - N]`처럼 길거나 `my_array.slice(-N)[0]`처럼 성능에 영향을 줄 수 있습니다. 새로운 `at` 메서드는 이 작업을 더 편리하게 만들어주며, 음수를 인덱스 값으로 사용하면 "끝에서부터"를 의미하게 해줍니다. 이전 예제들은 `my_array.at(-N)`으로 표현할 수 있습니다.

<!--truncate-->
일관성을 위해 양의 인덱스도 지원되며, 이는 기존의 속성 접근과 동일합니다.

이 새로운 메서드는 아래의 준수 폴리필 구현에서 보여지는 바와 같이 작은 기능으로, 전체 동작을 이해할 수 있습니다:

```js
function at(n) {
  // 인수를 정수로 변환
  n = Math.trunc(n) || 0;
  // 끝에서부터의 인덱싱 허용
  if (n < 0) n += this.length;
  // 범위를 벗어난 접근은 undefined를 반환
  if (n < 0 || n >= this.length) return undefined;
  // 그렇지 않으면 기본적인 속성 접근과 동일
  return this[n];
}
```

## 문자열에 대한 한마디

`at`가 궁극적으로 일반적인 인덱싱을 수행하기 때문에, String 값에서 `at`를 호출하면 기본 인덱싱과 마찬가지로 코드 유닛을 반환합니다. 그리고 문자열에서의 일반적인 인덱싱과 마찬가지로, 코드 유닛은 유니코드 문자열에서 원하는 결과가 아닐 수 있습니다! 사용 사례에 따라 [`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt)이 더 적합한지 확인하세요.

## `at` 메서드 지원

<feature-support chrome="92"
                 firefox="90"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
