---
title: "Dynamic `import()`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-11-21
tags: 
  - ECMAScript
  - ES2020
description: "Dynamic import() 는 정적 import 와 비교하여 새로운 기능을 제공합니다. 이 기사에서는 두 가지를 비교하고 새로운 내용을 개괄적으로 소개합니다."
tweet: "932914724060254208"
---
[Dynamic `import()`](https://github.com/tc39/proposal-dynamic-import)는 정적 `import`와 비교하여 새로운 기능을 해제하는 함수 같은 형태의 `import`를 도입합니다. 이 기사에서는 두 가지를 비교하고 새로운 내용을 개괄적으로 소개합니다.

<!--truncate-->
## Static `import` (재검토)

Chrome 61은 [모듈](/features/modules) 내에서 ES2015 `import` 문 지원을 선보였습니다.

`./utils.mjs` 위치에 있는 다음 모듈을 고려하세요:

```js
// 기본 내보내기
export default () => {
  console.log('기본 내보내기로부터의 인사!');
};

// 이름이 지정된 내보내기 `doStuff`
export const doStuff = () => {
  console.log('일을 수행 중…');
};
```

`./utils.mjs` 모듈을 정적으로 가져오고 사용하는 방법은 다음과 같습니다:

```html
<script type="module">
  import * as module from './utils.mjs';
  module.default();
  // → logs '기본 내보내기로부터의 인사!'
  module.doStuff();
  // → logs '일을 수행 중…'
</script>
```

:::note
**참고:** 위의 예는 `.mjs` 확장을 사용하여 그것이 정규 스크립트가 아닌 모듈임을 나타냅니다. 웹에서 파일 확장은 파일이 `Content-Type` HTTP 헤더에 올바른 MIME 형식(예: 자바스크립트 파일의 경우 `text/javascript`)으로 제공되기만 하면 별로 중요하지 않습니다.

.mjs 확장은 [Node.js](https://nodejs.org/api/esm.html#esm_enabling) 및 [`d8`](/docs/d8)와 같이 MIME 형식의 개념이나 모듈인지 일반 스크립트인지 결정할 수 있는 `type="module"`과 같은 필수 후크가 없는 다른 플랫폼에서 특히 유용합니다. 동일한 확장을 사용하는 이유는 플랫폼 간 일관성을 유지하고 모듈과 일반 스크립트를 명확히 구분하기 위함입니다.
:::

이 모듈 가져오기 구문은 *정적* 선언입니다. 모듈 지정자로 문자열 리터럴만 허용하며, 사전 런타임 “링크” 프로세스를 통해 로컬 범위에 바인딩을 도입합니다. 정적 `import` 구문은 파일 최상위 레벨에서만 사용할 수 있습니다.

정적 `import`는 정적 분석, 번들링 도구, 트리 쉐이킹과 같은 중요한 사용 사례를 가능하게 합니다.

몇 가지 경우에는 다음이 유용할 수 있습니다:

- 필요에 따라(또는 조건부로) 모듈을 가져오기
- 런타임에 모듈 지정자를 계산하기
- (모듈이 아닌) 일반 스크립트 내에서 모듈을 가져오기

이러한 작업은 정적 `import`로는 불가능합니다.

## Dynamic `import()` 🔥

[Dynamic `import()`](https://github.com/tc39/proposal-dynamic-import)는 이러한 사용 사례에 맞춘 새로운 함수 같은 형태의 `import`를 도입합니다. `import(moduleSpecifier)`는 요청한 모듈의 네임스페이스 객체에 대한 프로미스를 반환하며, 이 객체는 모듈의 모든 의존성 및 모듈 자체를 가져와 인스턴스화하고 평가한 후 생성됩니다.

`./utils.mjs` 모듈을 동적으로 가져오고 사용하는 방법은 다음과 같습니다:

```html
<script type="module">
  const moduleSpecifier = './utils.mjs';
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → logs '기본 내보내기로부터의 인사!'
      module.doStuff();
      // → logs '일을 수행 중…'
    });
</script>
```

`import()`는 프로미스를 반환하므로, `then` 기반 콜백 스타일 대신 `async`/`await`를 사용할 수 있습니다:

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './utils.mjs';
    const module = await import(moduleSpecifier)
    module.default();
    // → logs '기본 내보내기로부터의 인사!'
    module.doStuff();
    // → logs '일을 수행 중…'
  })();
</script>
```

:::note
**참고:** `import()`는 함수 호출처럼 **보이지만**, 괄호를 사용하는 특정 *구문*으로 지정되어 있습니다([`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)와 비슷). 이는 `import`가 `Function.prototype`에서 상속받지 않으며 `call`이나 `apply`를 사용할 수 없고, `const importAlias = import`와 같은 동작도 작동하지 않음을 의미합니다 — 사실, `import`는 객체조차 아닙니다! 하지만 이런 점은 실제로는 별로 중요하지 않습니다.
:::

다음은 소형 단일 페이지 애플리케이션에서 탐색 시 모듈을 지연 로드할 수 있도록 동적 `import()`를 사용하는 예제입니다:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>내 라이브러리</title>
<nav>
  <a href="books.html" data-entry-module="books">책</a>
  <a href="movies.html" data-entry-module="movies">영화</a>
  <a href="video-games.html" data-entry-module="video-games">비디오 게임</a>
</nav>
<main>요구 시 로드될 콘텐츠의 자리 표시자입니다.</main>
<script>
  const main = document.querySelector('main');
  const links = document.querySelectorAll('nav > a');
  for (const link of links) {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // 모듈이 `loadPageInto`라는 함수를 내보냅니다.
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

올바르게 적용할 경우 동적 `import()`에 의해 가능해지는 지연 로딩 기능은 매우 강력할 수 있습니다. [Addy](https://twitter.com/addyosmani)는 모든 의존성을 정적으로 가져오고 처음 로드 시 댓글을 포함하여 로드하던 [예제 Hacker News PWA](https://hnpwa-vanilla.firebaseapp.com/)를 수정하였습니다. [업데이트된 버전](https://dynamic-import.firebaseapp.com/)은 동적 `import()`를 사용하여 댓글을 느리게 로드하며 사용자에게 댓글이 정말 필요할 때까지 로드, 파싱 및 컴파일 비용을 피합니다.

:::note
**참고:** 앱이 다른 도메인에서 스크립트를 가져온다면(정적 또는 동적), 해당 스크립트는 유효한 CORS 헤더(예: `Access-Control-Allow-Origin: *`)와 함께 반환되어야 합니다. 이는 일반 스크립트와 달리 모듈 스크립트(그리고 그들의 import)는 CORS로 가져오기 때문입니다.
:::

## 권장 사항

정적 `import`와 동적 `import()` 모두 유용합니다. 각 방식은 고유하고 매우 뚜렷한 사용 사례를 가집니다. 초기 화면 의존성, 특히 페이지 상단 콘텐츠에 대해 정적 `import`를 사용하세요. 다른 경우에는 동적 `import()`로 의존성을 필요할 때 로드하는 것을 고려하세요.

## 동적 `import()` 지원

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
