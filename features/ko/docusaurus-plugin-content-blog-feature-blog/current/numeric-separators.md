---
title: '숫자 구분자'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-05-28
tags:
  - ECMAScript
  - ES2021
  - io19
description: 'JavaScript는 이제 숫자 리터럴에서 언더스코어를 구분 기호로 지원하여 소스 코드의 가독성과 유지 관리성을 높입니다.'
tweet: '1129073383931559936'
---
큰 숫자 리터럴은 특히 반복되는 숫자가 많을 때, 인간의 눈으로 빠르게 해석하기 어렵습니다:

```js
1000000000000
   1019436871.42
```

가독성을 개선하기 위해 [새로운 JavaScript 언어 기능](https://github.com/tc39/proposal-numeric-separator)은 숫자 리터럴에서 언더스코어를 구분 기호로 사용할 수 있게 합니다. 따라서 위의 코드는 이제 숫자를 천 단위로 그룹화하여 다시 작성할 수 있습니다:

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

이제 첫 번째 숫자가 1조이며, 두 번째 숫자가 약 10억 순위라는 것을 쉽게 알 수 있습니다.

숫자 구분자는 다양한 숫자 리터럴의 가독성을 향상시킵니다:

```js
// 천 단위로 그룹화된 10진수 정수 리터럴:
1_000_000_000_000
// 천 단위로 그룹화된 10진수 리터럴:
1_000_000.220_720
// 바이트 단위로 그룹화된 2진수 정수 리터럴:
0b01010110_00111000
// 니블로 그룹화된 2진수 정수 리터럴:
0b0101_0110_0011_1000
// 바이트 단위로 그룹화된 16진수 정수 리터럴:
0x40_76_38_6A_73
// 천 단위로 그룹화된 BigInt 리터럴:
4_642_473_943_484_686_707n
```

8진수 정수 리터럴에서도 작동합니다 (비록 이와 같은 리터럴에 대해 구분 기호가 가치 있는 경우를 [생각할 수는 없습니다](https://github.com/tc39/proposal-numeric-separator/issues/44)):

```js
// 8진수 정수 리터럴에서 숫자 구분자: 🤷‍♀️
0o123_456
```

JavaScript는 명시적인 `0o` 접두어 없이 8진수 리터럴을 표현하는 기존 문법도 지원합니다. 예를 들어, `017 === 0o17`. 이 문법은 엄격 모드 또는 모듈 내에서는 지원되지 않으며, 현대 코드에서는 사용하지 않아야 합니다. 따라서 이러한 리터럴에서는 숫자 구분자가 지원되지 않습니다. 대신 `0o17` 스타일 리터럴을 사용하세요.

## 숫자 구분자 지원

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
