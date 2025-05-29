---
title: "`Object.hasOwn`"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-01
tags:
  - ECMAScript
description: "`Object.hasOwn`은 `Object.prototype.hasOwnProperty`를 더 쉽게 접근할 수 있도록 만듭니다."
tweet: "1410577516943847424"
---

오늘날, 아래와 같은 코드를 작성하는 것이 매우 일반적입니다:

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object`에 `foo`라는 속성이 있습니다.
}
```

또는 [has](https://www.npmjs.com/package/has) 혹은 [lodash.has](https://www.npmjs.com/package/lodash.has)와 같은 라이브러리를 사용하여 `Object.prototype.hasOwnProperty`의 간단한 버전을 사용하는 것이 일반적입니다.

[`Object.hasOwn` 제안](https://github.com/tc39/proposal-accessible-object-hasownproperty)을 통해, 우리는 단순히 다음과 같이 작성할 수 있습니다:

```js
if (Object.hasOwn(object, 'foo')) {
  // `object`에 `foo`라는 속성이 있습니다.
}
```

`Object.hasOwn`는 이미 V8 v9.3에서 `--harmony-object-has-own` 플래그 뒤에 사용할 수 있으며, 곧 Chrome에 적용될 예정입니다.

## `Object.hasOwn` 지원

<feature-support chrome="yes https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="yes https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->