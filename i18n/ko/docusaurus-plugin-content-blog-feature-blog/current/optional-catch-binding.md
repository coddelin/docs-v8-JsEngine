---
title: '옵션 `catch` 바인딩'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: 'ES2019에서, catch를 이제 매개변수 없이 사용할 수 있습니다.'
tweet: '956209997808939008'
---
`try` 문장의 `catch` 절은 바인딩을 필요로 했습니다:

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // 우리는 바인딩 이름을 지정해야 하지만, 사용하지 않을 수도 있습니다!
  handleException();
}
```

ES2019에서는 `catch`를 이제 [바인딩 없이 사용할 수 있습니다](https://tc39.es/proposal-optional-catch-binding/). 이는 예외를 처리하는 코드에서 `exception` 객체가 필요하지 않은 경우 유용합니다.

```js
try {
  doSomethingThatMightThrow();
} catch { // → 바인딩 없음!
  handleException();
}
```

## 선택적 `catch` 바인딩 지원

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->