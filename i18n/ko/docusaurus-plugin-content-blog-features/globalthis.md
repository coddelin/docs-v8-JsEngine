---
title: "`globalThis`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-07-16
tags: 
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: "globalThis는 JavaScript에서 스크립트의 목표와 상관없이 모든 환경에서 전역 this를 접근할 수 있는 통합 메커니즘을 제공합니다."
tweet: "1151140681374547969"
---
웹 브라우저에서 사용하기 위한 JavaScript를 작성한 적이 있다면, 전역 `this`에 접근하기 위해 `window`를 사용한 적이 있을 것입니다. Node.js에서는 `global`을 사용했을지도 모릅니다. 두 환경에서 모두 작동해야 하는 코드를 작성한 경우, 사용할 수 있는 것을 감지하여 이를 사용했을 것입니다. 그러나 지원하려는 환경과 사용 사례가 늘어남에 따라 체크해야 할 식별자의 목록이 증가하면서 금방 복잡해집니다:

<!--truncate-->
```js
// 전역 `this`를 얻으려는 단순한 시도. 이 코드를 사용하지 마세요!
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  // 참고: 이것이 여전히 잘못된 결과를 반환할 수 있습니다!
  if (typeof this !== 'undefined') return this;
  throw new Error('전역 `this`를 찾을 수 없습니다');
};
const theGlobalThis = getGlobalThis();
```

위 접근법이 왜 충분하지 않은지에 대한 더 자세한 설명 (그리고 더 복잡한 기술)에 대해서는 [_보편적인 JavaScript에서의 끔찍한 `globalThis` 폴리필_](https://mathiasbynens.be/notes/globalthis)을 읽어보세요.

[`globalThis` 제안서](https://github.com/tc39/proposal-global)는 스크립트의 목표(클래식 스크립트나 모듈 여부)와 상관없이 어떤 JavaScript 환경(브라우저, Node.js 또는 기타)에서도 전역 `this`에 접근할 수 있는 *통합된* 메커니즘을 제공합니다.

```js
const theGlobalThis = globalThis;
```

현대적인 코드에서는 전역 `this`에 접근할 필요 자체가 없을 수도 있습니다. JavaScript 모듈을 사용하면 글로벌 상태를 조작하는 대신 선언적으로 기능을 `import` 및 `export`할 수 있습니다. `globalThis`는 여전히 전역 액세스가 필요한 폴리필 및 기타 라이브러리에 유용합니다.

## `globalThis` 지원

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
