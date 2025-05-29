---
title: '안정적인 `Array.prototype.sort`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-07-02
tags:
  - ECMAScript
  - ES2019
  - io19
description: 'Array.prototype.sort가 이제 안정적인 동작을 보장합니다.'
tweet: '1146067251302244353'
---
강아지 배열이 있다고 가정합시다. 각 강아지는 이름과 등급을 가지고 있습니다. (이것이 이상한 예제처럼 느껴진다면, 정확히 이런 내용을 전문으로 하는 Twitter 계정이 있다는 것을 알아두세요... 묻지 마세요!)

```js
// 배열이 `name` 기준으로 알파벳 순서로 미리 정렬되어 있는 것을 확인하세요.
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// 강아지를 내림차순으로 `rating` 기준으로 정렬합니다.
// (이 작업은 `doggos`를 제자리에서 업데이트합니다.)
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
배열은 이름 기준으로 알파벳 순서로 미리 정렬되어 있습니다. 대신 등급을 기준으로 정렬하여 (가장 높은 등급의 강아지가 먼저 나오도록) 결과를 얻으려면, `Array#sort`를 사용하여 등급을 비교하는 사용자 정의 콜백을 전달합니다. 여러분이 예상할만한 결과는 다음과 같습니다:

```js
[
  { name: 'Choco',  rating: 14 },
  { name: 'Ghost',  rating: 14 },
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

강아지들은 등급별로 정렬되지만, 각 등급 내에서 여전히 이름 기준으로 알파벳 순으로 정렬됩니다. 예를 들어, Choco와 Ghost는 동일한 등급인 14를 가지고 있지만, Choco가 Ghost보다 정렬 결과에서 앞에 나타납니다. 이는 원래 배열에서도 그랬던 순서 때문입니다.

이 결과를 얻으려면 JavaScript 엔진이 _아무_ 정렬 알고리즘을 사용할 수는 없습니다. 반드시 소위 “안정 정렬(stable sort)”을 사용해야 합니다. 오랜 기간 동안 JavaScript 사양은 `Array#sort`에 대해 안정 정렬이 필요하지 않았고, 대신 구현에 맡겼습니다. 이로 인해 이 동작이 명확히 정의되지 않았기 때문에 다음과 같은 결과도 얻을 수 있었습니다. 이 경우 Ghost가 갑자기 Choco보다 앞서 나오게 됩니다:

```js
[
  { name: 'Ghost',  rating: 14 }, // 😢
  { name: 'Choco',  rating: 14 }, // 😢
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

즉, JavaScript 개발자는 안정 정렬에 의존할 수 없었습니다. 실제로 상황은 더욱 짜증스러웠습니다. 일부 JavaScript 엔진은 짧은 배열에서는 안정 정렬을 사용하고 긴 배열에서는 불안정 정렬을 사용하는 경우가 있었기 때문입니다. 이는 개발자가 코드를 테스트할 때 안정적인 결과를 확인했지만, 배열이 약간 더 커진 프로덕션 환경에서 갑자기 불안정한 결과가 나타나는 혼란을 초래했습니다.

좋은 소식이 있습니다. 저희는 `Array#sort`를 안정적으로 만드는 [사양 변경을 제안](https://github.com/tc39/ecma262/pull/1340)했고, 이는 승인되었습니다. 이제 모든 주요 JavaScript 엔진이 안정적인 `Array#sort`를 구현합니다. JavaScript 개발자로서 이제 걱정할 일이 하나 줄었습니다. 좋아요!

(아, 그리고 [`TypedArray`에 대해서도 같은 작업을 했습니다](https://github.com/tc39/ecma262/pull/1433): 해당 정렬도 이제 안정적입니다.)

:::note
**참고:** 안정성은 이제 사양에 따라 요구되지만, JavaScript 엔진은 여전히 선호하는 정렬 알고리즘을 자유롭게 구현할 수 있습니다. 예를 들어 [V8은 Timsort를 사용합니다](/blog/array-sort#timsort). 사양은 특정 정렬 알고리즘을 강제하지 않습니다.
:::

## 기능 지원

### 안정적인 `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="yes"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### 안정적인 `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
