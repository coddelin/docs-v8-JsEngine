---
title: "모듈 네임스페이스 내보내기"
author: "마티아스 비넨스([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: "자바스크립트 모듈이 이제 새로운 문법을 사용하여 네임스페이스 내의 모든 속성을 다시 내보낼 수 있습니다."
---
[자바스크립트 모듈](/features/modules)에서는 이미 다음 문법을 사용할 수 있었습니다:

```js
import * as utils from './utils.mjs';
```

그러나 대칭적인 `export` 문법은 존재하지 않았습니다… [이번엔 다릅니다](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from './utils.mjs';
```

이는 다음과 동등합니다:

```js
import * as utils from './utils.mjs';
export { utils };
```
