---
title: "Array.prototype.flat`과 `Array.prototype.flatMap`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Array.prototype.flat은 지정된 깊이까지 배열을 평탄화합니다. Array.prototype.flatMap은 map을 수행하고 flat을 별도로 적용하는 것과 동일합니다."
tweet: "1138457106380709891"
---
## `Array.prototype.flat`

이 예제의 배열은 여러 수준으로 중첩되어 있습니다. 배열 안에 또 다른 배열이 포함됩니다.

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ 외부 배열
//                ^^^^^^^^  내부 배열
//                    ^^^   가장 안쪽 배열
```

`Array#flat`은 주어진 배열의 평탄화된 버전을 반환합니다.

```js
array.flat();
// → [1, 2, [3]]

// …다음과 동등합니다:
array.flat(1);
// → [1, 2, [3]]
```

기본 깊이는 `1`이지만, 원하는 깊이까지 재귀적으로 평탄화를 실행하려면 숫자를 전달할 수 있습니다. 배열에 더 이상 중첩 배열이 없을 때까지 평탄화를 계속하려면 `Infinity`를 전달합니다.

```js
// 배열에 더 이상 중첩된 배열이 포함되지 않을 때까지 재귀적으로 평탄화:
array.flat(Infinity);
// → [1, 2, 3]
```

왜 이 메서드를 `Array.prototype.flatten`이 아니라 `Array.prototype.flat`으로 명명했는지 궁금하신가요? [#SmooshGate에 대한 우리의 설명을 읽어보세요!](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

다음은 또 다른 예제입니다. 값 하나를 두 번 포함하는 배열을 반환하는 `duplicate` 함수를 정의합니다. 이 배열의 각 값에 `duplicate`를 적용하면 중첩된 배열이 생성됩니다.

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

그런 다음 결과에 `flat`을 호출하여 배열을 평탄화할 수 있습니다:

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

이 패턴이 함수형 프로그래밍에서 매우 일반적이기 때문에, 이를 위한 전용 `flatMap` 메서드가 새로 추가되었습니다.

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap`은 `map`을 먼저 수행하고 `flat`을 별도로 수행하는 것보다 조금 더 효율적입니다.

`flatMap`의 사용 사례에 관심 있으신가요? [Axel Rauschmayer의 설명을 확인하세요.](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values)

## `Array#{flat,flatMap}` 지원

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
