---
title: '속성 가져오기'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2024-01-31
tags:
  - ECMAScript
description: '속성 가져오기: 가져오기 어설션의 진화'
tweet: ''
---

## 이전에

V8은 v9.1에서 [가져오기 어설션](https://chromestatus.com/feature/5765269513306112) 기능을 도입했습니다. 이 기능은 모듈 가져오기 구문에 `assert` 키워드를 사용하여 추가 정보를 포함할 수 있게 해줍니다. 현재 추가 정보는 JavaScript 모듈 내부에서 JSON 및 CSS 모듈을 가져오는 데 사용됩니다.

<!--truncate-->
## 속성 가져오기

그 이후로 가져오기 어설션은 [가져오기 속성](https://github.com/tc39/proposal-import-attributes)으로 진화했습니다. 기능의 핵심 포인트는 동일합니다: 모듈 가져오기 구문에 추가 정보를 포함할 수 있도록 하는 것입니다.

가장 중요한 차이점은 가져오기 어설션이 단지 어설션만을 의미하는 반면, 가져오기 속성은 더 완화된 의미를 가지는 것입니다. 어설션만의 의미는 추가 정보가 모듈을 _어떻게_ 로드하는가가 아니라 _로드할 수 있는지_ 여부에만 영향을 미친다는 것입니다. 예를 들어, JSON 모듈은 MIME 유형에 의해 항상 JSON 모듈로 로드되며, `assert { type: 'json' }` 절은 요청된 모듈의 MIME 유형이 `application/json`이 아닌 경우 로드를 실패하게 할 수 있을 뿐입니다.

그러나 어설션만의 의미는 치명적인 결함을 가지고 있었습니다. 웹에서는 요청하는 자원의 유형에 따라 HTTP 요청의 형태가 달라집니다. 예를 들어, [`Accept` 헤더](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept)는 응답의 MIME 유형에 영향을 미치며, [`Sec-Fetch-Dest` 메타데이터 헤더](https://web.dev/articles/fetch-metadata)는 웹 서버가 요청을 받을지 거부할지에 영향을 미칩니다. 가져오기 어설션은 모듈을 _어떻게_ 로드할지에 영향을 미칠 수 없었기 때문에 HTTP 요청의 형태를 변경할 수 없었습니다. 요청된 자원의 유형은 사용되는 [콘텐츠 보안 정책](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)에도 영향을 미칩니다. 가져오기 어설션은 웹의 보안 모델과 올바르게 작동할 수 없었습니다.

가져오기 속성은 어설션만의 의미를 완화하여 속성이 모듈의 로드 방식에 영향을 미치도록 합니다. 즉, 가져오기 속성은 적절한 `Accept` 및 `Sec-Fetch-Dest` 헤더를 포함하는 HTTP 요청을 생성할 수 있습니다. 새로운 의미에 맞추기 위해 오래된 `assert` 키워드는 `with`로 업데이트되었습니다:

```javascript
// main.mjs
//
// 새로운 'with' 구문.
import json from './foo.json' with { type: 'json' };
console.log(json.answer); // 42
```

## 동적 `import()`

유사하게, [동적 `import()`](https://v8.dev/features/dynamic-import#dynamic)도 `with` 옵션을 받아들일 수 있도록 업데이트되었습니다.

```javascript
// main.mjs
//
// 새로운 'with' 옵션.
const jsonModule = await import('./foo.json', {
  with: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

## `with`의 가용성

가져오기 속성은 V8 v12.3에서 기본적으로 활성화되어 있습니다.

## `assert`의 사용 중단 및 최종 제거

V8 v12.3부터 `assert` 키워드는 사용 중단되었으며 v12.6과 함께 제거될 예정입니다. `assert` 대신 `with`를 사용하세요! `assert` 절을 사용하면 `with` 사용을 권장하는 경고 메시지가 콘솔에 출력됩니다.

## 가져오기 속성 지원

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="no"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="yes https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
