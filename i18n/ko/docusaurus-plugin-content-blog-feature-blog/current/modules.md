---
title: '자바스크립트 모듈들'
author: '애디 오스마니([@addyosmani](https://twitter.com/addyosmani))와 마티아스 비넨스([@mathias](https://twitter.com/mathias))'
avatars:
- 'addy-osmani'
- 'mathias-bynens'
date: 2018-06-18
tags:
  - ECMAScript
  - ES2015
description: '이 글은 자바스크립트 모듈을 사용하는 방법, 이를 책임감 있게 배포하는 방법, 그리고 크롬 팀이 미래에 모듈을 더욱 개선하기 위해 노력하는 방식에 대해 설명합니다.'
tweet: '1008725884575109120'
---
자바스크립트 모듈은 이제 [모든 주요 브라우저에서 지원됩니다](https://caniuse.com/#feat=es6-module)!

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

이 글은 JS 모듈을 사용하는 방법, 이를 책임감 있게 배포하는 방법, 그리고 크롬 팀이 미래에 모듈을 더 나은 방향으로 개선하기 위해 노력하고 있는 방식을 설명합니다.

## JS 모듈이란?

JS 모듈(“ES 모듈” 또는 “ECMAScript 모듈”이라고도 함)은 주요 새로운 기능 또는 새로운 기능들의 모음입니다. 과거에 사용자 정의 자바스크립트 모듈 시스템을 사용한 적이 있을 것입니다. 아마도 [Node.js에서 사용하는 CommonJS](https://nodejs.org/docs/latest-v10.x/api/modules.html)를 사용했거나, [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md)를 사용했을 수 있습니다. 아니면 다른 것을 사용했을 수도 있습니다. 이러한 모든 모듈 시스템의 공통점은 무엇인가를 가져오고 내보내는 기능을 제공한다는 점입니다.

<!--truncate-->
이제 자바스크립트에는 이를 위한 표준화된 문법이 있습니다. 모듈 내부에서 `export` 키워드를 사용해 거의 모든 것을 내보낼 수 있습니다. `const`, `function`, 혹은 기타 변수 바인딩이나 선언을 내보낼 수 있습니다. 변수 문 혹은 선언 앞에 `export`를 붙이기만 하면 됩니다:

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

그런 다음 `import` 키워드를 사용해 다른 모듈에서 해당 모듈을 가져올 수 있습니다. 여기서는 `lib` 모듈에서 `repeat` 및 `shout` 기능을 가져와 `main` 모듈에서 사용합니다:

```js
// 📁 main.mjs
import {repeat, shout} from './lib.mjs';
repeat('hello');
// → 'hello hello'
shout('Modules in action');
// → 'MODULES IN ACTION!'
```

또한 모듈에서 _기본_ 값을 내보낼 수도 있습니다:

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

이러한 `default` 내보내기는 아무 이름으로나 가져올 수 있습니다:

```js
// 📁 main.mjs
import shout from './lib.mjs';
//     ^^^^^
```

모듈은 클래식 스크립트와 약간 다릅니다:

- 모듈은 기본적으로 [엄격 모드](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)가 활성화되어 있습니다.

- 모듈에서는 HTML 스타일 주석 문법이 지원되지 않지만 클래식 스크립트에서는 작동합니다.

    ```js
    // 자바스크립트에서 HTML 스타일 주석 문법을 사용하지 마세요!
    const x = 42; <!-- TODO: x를 y로 이름 변경.
    // 대신 일반 한 줄 주석을 사용하세요:
    const x = 42; // TODO: x를 y로 이름 변경.
    ```

- 모듈은 어휘적 최상위 범위를 가집니다. 예를 들어, 모듈 내에서 `var foo = 42;`를 실행하면 브라우저에서 `window.foo`를 통해 액세스할 수 있는 전역 변수 `foo`가 생성되지 않습니다. 이는 클래식 스크립트의 경우에는 해당됩니다.

- 비슷하게, 모듈 내의 `this`는 전역 `this`를 참조하지 않고, 대신 `undefined`입니다. (전역 `this`에 액세스해야 한다면, [`globalThis`](/features/globalthis)를 사용하세요.)

- 새 정적 `import` 및 `export` 문법은 모듈 내에서만 사용할 수 있으며, 클래식 스크립트에서는 작동하지 않습니다.

- [최상위 `await`](/features/top-level-await)은 모듈에서 사용할 수 있지만, 클래식 스크립트에서는 사용할 수 없습니다. 관련하여, 모듈에서는 어디에서도 변수 이름으로 `await`를 사용할 수 없지만, 클래식 스크립트에서는 비동기 함수 외부에서 변수를 `await`로 지정할 수 있습니다.

이러한 차이로 인해 *동일한 자바스크립트 코드가 모듈로 처리될 때와 클래식 스크립트로 처리될 때 다르게 동작할 수 있습니다*. 따라서, 자바스크립트 런타임은 어떤 스크립트가 모듈인지 알아야 합니다.

## 브라우저에서 JS 모듈 사용하기

웹에서 `<script>` 요소의 `type` 속성을 `module`로 설정하여 브라우저가 해당 스크립트를 모듈로 처리하도록 할 수 있습니다.

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

`type="module"`을 이해하는 브라우저는 `nomodule` 속성이 있는 스크립트를 무시합니다. 이는 모듈을 지원하는 브라우저에 모듈 기반의 페이로드를 제공하면서 다른 브라우저에 대체 방법을 제공할 수 있음을 의미합니다. 이러한 구분이 가능하다는 것은 놀랍습니다. 특히 성능 면에서요! 한 번 생각해보세요: 현대 브라우저만 모듈을 지원합니다. 브라우저가 모듈 코드를 이해한다면, 화살표 함수나 `async`-`await` 같은 [모듈 이전에 등장한 기능](https://codepen.io/samthor/pen/MmvdOM)도 지원합니다. 이제는 모듈 번들에서 이러한 기능을 변환할 필요가 없습니다! [현대 브라우저에 더 작고 변환되지 않은 모듈 기반 페이로드를 제공할 수](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/) 있습니다. 구형 브라우저에만 `nomodule` 페이로드가 제공됩니다.

[모듈은 기본적으로 지연](#defer)되므로, `nomodule` 스크립트를 지연 방식으로도 로드하고 싶을 수 있습니다:

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### 모듈과 클래식 스크립트 간의 브라우저별 차이

이제 알다시피, 모듈은 클래식 스크립트와 다릅니다. 위에서 설명한 플랫폼 독립적인 차이 외에도 브라우저별로 특정한 차이가 있습니다.

예를 들어, 모듈은 한 번만 평가되지만, 클래식 스크립트는 DOM에 추가된 만큼 여러 번 평가됩니다.

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js는 여러 번 실행됩니다. -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import &apos;./module.mjs&apos;;</script>
<!-- module.mjs는 한 번만 실행됩니다. -->
```

또한, 모듈 스크립트와 그 의존성은 CORS를 사용하여 가져옵니다. 이는 모든 크로스 오리진 모듈 스크립트가 `Access-Control-Allow-Origin: *`와 같은 적절한 헤더로 제공되어야 함을 의미합니다. 이는 클래식 스크립트에는 해당되지 않습니다.

다른 차이는 `async` 속성과 관련됩니다. `async` 속성은 스크립트를 HTML 파서를 차단하지 않고(예: `defer`처럼) 다운로드하도록 하며, HTML 파싱이 끝날 때까지 대기하지 않고 가능한 한 빨리 스크립트를 실행합니다. `async` 속성은 인라인 클래식 스크립트에서는 작동하지 않지만, 인라인 `<script type="module">`에서는 작동합니다.

### 파일 확장자에 대한 참고 사항

우리가 모듈에 `.mjs` 파일 확장자를 사용하고 있다는 것을 눈치챘을 것입니다. 웹에서는 파일이 [JavaScript MIME 타입 `text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type)로 제공되기만 하면 파일 확장자는 중요하지 않습니다. 브라우저는 스크립트 요소의 `type` 속성을 통해 해당 파일이 모듈임을 알게 됩니다.

그럼에도 불구하고, 다음 두 가지 이유로 모듈에는 `.mjs` 확장자를 사용하는 것이 좋습니다:

1. 개발 중에 `.mjs` 확장자는 파일이 클래식 스크립트가 아닌 모듈임을 프로젝트를 보는 당신과 다른 사람들에게 명확하게 보여줍니다. (코드를 보는 것만으로는 항상 알 수 있는 것은 아닙니다.) 이전에 언급했듯이, 모듈은 클래식 스크립트와 다르게 처리되므로 이 차이는 매우 중요합니다!
2. 이를 통해 [Node.js](https://nodejs.org/api/esm.html#enabling)와 [`d8`](/docs/d8) 같은 런타임 및 [Babel](https://babeljs.io/docs/en/options#sourcetype)와 같은 빌드 도구가 파일을 모듈로 구문 분석하도록 보장합니다. 이러한 환경과 도구 각각은 다른 확장자로 된 파일을 모듈로 해석하기 위한 자체 구성 방법을 제공하지만, `.mjs` 확장자는 파일을 모듈로 취급하도록 하는 크로스 호환 가능한 방법입니다.

:::note
**참고:** `.mjs`를 웹에 배포하려면, 위에서 언급했듯이 해당 확장자를 사용하는 파일을 적절한 `Content-Type: text/javascript` 헤더로 제공하도록 웹 서버를 구성해야 합니다. 또한, 편집기가 `.mjs` 파일을 `.js` 파일로 취급하여 구문 강조를 제공하도록 구성하는 것이 좋습니다. 대부분의 현대 편집기는 기본적으로 이렇게 설정되어 있습니다.
:::

### 모듈 지정자

모듈을 `import`할 때, 모듈의 위치를 지정하는 문자열을 “모듈 지정자” 또는 “import 지정자”라고 합니다. 이전 예제에서 모듈 지정자는 `&apos;./lib.mjs&apos;`입니다:

```js
import {shout} from &apos;./lib.mjs&apos;;
//                  ^^^^^^^^^^^
```

브라우저에서는 모듈 지정자에 몇 가지 제한이 적용됩니다. 소위 “단순한” 모듈 지정자는 현재 지원되지 않습니다. 이 제한 사항은 미래에 브라우저가 다음과 같은 bare 모듈 지정자에 특별한 의미를 부여하는 사용자 정의 모듈 로더를 허용할 수 있도록 [명시적으로 지정](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier)되어 있습니다:

```js
// 아직 지원되지 않습니다:
import {shout} from &apos;jquery&apos;;
import {shout} from &apos;lib.mjs&apos;;
import {shout} from &apos;modules/lib.mjs&apos;;
```

반면, 다음 예제는 모두 지원됩니다:

```js
// 지원됨:
import {shout} from &apos;./lib.mjs&apos;;
import {shout} from &apos;../lib.mjs&apos;;
import {shout} from &apos;/modules/lib.mjs&apos;;
import {shout} from &apos;https://simple.example/modules/lib.mjs&apos;;
```

현재로서는, 모듈 지정자는 풀 URL이거나, `/`, `./`, `../`로 시작하는 상대 URL이어야 합니다.

### 모듈은 기본적으로 지연됨

클래식 `<script>`는 기본적으로 HTML 파서를 차단합니다. [defer 속성](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer)을 추가하여, HTML 파싱과 동시에 스크립트 다운로드가 이루어지도록 처리할 수 있습니다.

![](/_img/modules/async-defer.svg)

모듈 스크립트는 기본적으로 지연됩니다. 따라서 `<script type="module">` 태그에 `defer`를 추가할 필요가 없습니다! 기본 모듈의 다운로드는 HTML 파싱과 동시에 이루어질 뿐만 아니라 모든 종속 모듈도 마찬가지입니다!

## 기타 모듈 기능

### 동적 `import()`

지금까지는 정적 `import`만 사용했습니다. 정적 `import`를 사용할 경우, 전체 모듈 그래프가 다운로드되고 실행된 후에야 주요 코드가 실행됩니다. 때로는 모듈을 사전에 로드하지 않고 수요에 따라, 예를 들어 사용자가 링크나 버튼을 클릭할 때만 로드하고 싶을 수 있습니다. 이는 초기 로드 시간 성능을 향상시킵니다. [동적 `import()`](/features/dynamic-import)로 이것이 가능합니다!

```html
<script type="module">
  (async () => {
    const moduleSpecifier = &apos;./lib.mjs&apos;;
    const {repeat, shout} = await import(moduleSpecifier);
    repeat(&apos;hello&apos;);
    // → &apos;hello hello&apos;
    shout(&apos;Dynamic import in action&apos;);
    // → &apos;DYNAMIC IMPORT IN ACTION!&apos;
  })();
</script>
```

정적 `import`와는 달리, 동적 `import()`는 일반 스크립트 내에서도 사용할 수 있습니다. 기존 코드 베이스에서 모듈을 점진적으로 사용하기 시작하는 쉬운 방법입니다. 자세한 내용은 [동적 `import()`에 대한 기사](/features/dynamic-import)를 참조하세요.

:::note
**참고:** [webpack은 자체 `import()` 버전](https://web.dev/use-long-term-caching/)을 가지고 있어 가져온 모듈을 기본 번들과 분리된 자체 청크로 나눕니다.
:::

### `import.meta`

`import.meta`는 현재 모듈에 대한 메타데이터를 제공하는 또 다른 새 모듈 관련 기능입니다. ECMAScript의 일부로 지정된 것이 아니기 때문에 얻을 수 있는 정확한 메타데이터는 호스트 환경에 따라 달라집니다. 예를 들어 브라우저에서는 Node.js와 다른 메타데이터를 얻을 수 있습니다.

다음은 웹에서 `import.meta`의 예입니다. 기본적으로 이미지는 HTML 문서의 현재 URL을 기준으로 로드됩니다. `import.meta.url`을 사용하면 현재 모듈을 기준으로 이미지를 로드할 수 있습니다.

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail(&apos;../img/thumbnail.png&apos;);
container.append(thumbnail);
```

## 성능 권장사항

### 번들링 유지

모듈을 사용하면 webpack, Rollup, Parcel과 같은 번들러를 사용하지 않고도 웹사이트를 개발할 수 있습니다. 다음과 같은 경우에는 네이티브 JS 모듈을 직접 사용하는 것이 괜찮습니다:

- 로컬 개발 중
- 전체적으로 100개 미만의 모듈과 비교적 얕은 종속 트리(즉, 최대 깊이 5 미만)를 포함하는 소규모 웹 애플리케이션의 프로덕션 환경

그러나 [300개 모듈로 구성된 모듈화된 라이브러리를 로드할 때 Chrome 로드 파이프라인 병목 현상 분석](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub)에서 배운 바와 같이, 번들링된 애플리케이션의 로딩 성능이 번들링되지 않은 애플리케이션보다 더 뛰어납니다.

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

정적 `import`/`export` 문법은 정적으로 분석 가능하기 때문에, 번들러 도구가 사용되지 않은 내보내기를 제거하여 코드를 최적화하는 데 도움을 줄 수 있습니다. 정적 `import`와 `export`는 단순한 문법 이상의 역할을 하며, 중요한 도구 기능입니다!

*일반적인 권장 사항으로, 모듈을 프로덕션에 배포하기 전에 계속 번들러를 사용하는 것입니다.* 어떤 면에서는 번들링이 코드를 최소화하는 것과 유사한 최적화로, 결과적으로 적은 코드를 전송하여 성능 이점을 얻을 수 있습니다. 번들링도 동일한 효과를 가져옵니다! 번들링을 유지하세요.

항상 [DevTools 코드 커버리지 기능](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage)을 사용하여 불필요한 코드를 사용자에게 전송하고 있는지 식별할 수 있습니다. 또한 [코드 분할](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading)을 사용하여 번들을 분할하고, 첫 번째 의미 있는 페인트에 중요하지 않은 스크립트 로드를 지연시키는 것을 권장합니다.

#### 번들링 대 비번들링 모듈 전송의 트레이드오프

웹 개발에서 항상 그렇듯이 모든 것은 트레이드오프입니다. 비번들된 모듈을 전송하면 초기 로드 성능(콜드 캐시)이 감소할 수 있지만, 코드 분할 없이 단일 번들을 전송하는 것에 비해 후속 방문(웜 캐시) 로드 성능이 실제로 향상될 수 있습니다. 200KB의 코드 기반에서, 단일 세부 모듈을 변경하고 그것만 서버에서 받아오는 것이 전체 번들을 다시 받아오는 것보다 훨씬 낫습니다.

따뜻한 캐시를 사용하는 방문자의 경험에 대해 더 신경 쓰고, 수백 개 미만의 세분화된 모듈 관리가 가능한 사이트라면, 비번들된 모듈 전송을 실험하고, 콜드 및 웜 로드 모두에 대한 성능 영향을 측정한 후 데이터에 기반한 결정을 내릴 수 있습니다!

브라우저 엔지니어들은 모듈의 성능을 기본적으로 개선하기 위해 열심히 작업 중입니다. 시간이 지나면서, 번들링되지 않은 모듈을 사용하는 것이 더 많은 상황에서 실현 가능해질 것으로 기대됩니다.

### 세분화된 모듈 사용

작고 세분화된 모듈을 사용하는 습관을 들이세요. 개발 중에는 여러 내보내기(export)를 수동으로 하나의 파일에 결합하는 것보다, 일반적으로 모듈마다 몇 가지 내보내기만 갖는 것이 더 좋습니다.

`./util.mjs`라는 모듈이 `drop`, `pluck`, `zip`이라는 세 가지 함수를 내보내는 예를 고려해 보세요:

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

코드 베이스에서 실제로 `pluck` 기능만 필요하다면, 다음과 같이 가져올 것입니다:

```js
import {pluck} from &apos;./util.mjs&apos;;
```

이 경우 (빌드 시 번들링 단계 없이), 브라우저는 실제로 한 가지 내보내기만 필요해도 여전히 전체 `./util.mjs` 모듈을 다운로드, 구문 분석 및 컴파일해야 합니다. 이는 낭비입니다!

`pluck`이 `drop` 및 `zip`과 코드를 공유하지 않는다면, 더 나은 방법은 이를 `./pluck.mjs`와 같은 독립된 세분화된 모듈로 이동시키는 것입니다.

```js
export function pluck() { /* … */ }
```

이제 `drop` 및 `zip`에 대한 과부하 없이 `pluck`을 가져올 수 있습니다:

```js
import {pluck} from &apos;./pluck.mjs&apos;;
```

:::note
**참고:** 여기에서 이름이 지정된 내보내기 대신 `default` 내보내기를 사용할 수도 있습니다. 이는 개인적인 선호도에 따라 다릅니다.
:::

이는 소스 코드를 단순하고 깔끔하게 유지시킬 뿐만 아니라 번들러가 수행하는 불필요한 코드 제거(dead-code elimination)의 필요성도 줄여줍니다. 소스 트리에 있는 모듈 중 하나가 사용되지 않는 경우, 가져오기가 발생하지 않으므로 브라우저는 이를 다운로드하지 않습니다. 사용하는 모듈은 브라우저에서 개별적으로 [코드 캐싱](/blog/code-caching-for-devs)될 수 있습니다. (이를 가능하게 하는 인프라는 이미 V8에 구현되었으며, [Chromium에서도 지원 작업](https://bugs.chromium.org/p/chromium/issues/detail?id=841466)이 진행 중입니다.)

작고 세분화된 모듈을 사용하면 [네이티브 번들링 솔루션](#web-packaging)이 제공될 미래에 대비하여 코드 베이스를 준비할 수 있습니다.

### 모듈 미리 로드

[`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload)를 사용하여 모듈의 전달을 최적화할 수 있습니다. 이렇게 하면 브라우저가 모듈 및 해당 종속성을 미리 로드하고 심지어 미리 구문 분석 및 컴파일할 수도 있습니다.

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

이는 특히 더 큰 종속 트리에서 중요합니다. `rel="modulepreload"` 없이 브라우저는 전체 종속 트리를 파악하기 위해 여러 HTTP 요청을 수행해야 합니다. 하지만 `rel="modulepreload"`로 종속 모듈 스크립트의 전체 목록을 선언하면, 브라우저는 이러한 종속성을 점진적으로 발견할 필요가 없습니다.

### HTTP/2 사용

가능한 경우 HTTP/2를 사용하는 것은 항상 성능상 좋은 조언입니다. 최소한 [다중화 지원](https://web.dev/performance-http2/#request-and-response-multiplexing) 때문이라도 그렇습니다. HTTP/2 다중화를 사용하면 여러 요청 및 응답 메시지가 동시에 진행될 수 있어 모듈 트리를 로드하는 데 유리합니다.

Chrome 팀은 또 다른 HTTP/2 기능, 구체적으로 [HTTP/2 서버 푸시](https://web.dev/performance-http2/#server-push)가 고도로 모듈화된 앱을 배포하는 데 실용적인 솔루션이 될 수 있는지 조사했습니다. 불행히도, [HTTP/2 서버 푸시는 올바르게 적용하기 어렵습니다](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/). 그리고 웹 서버 및 브라우저의 구현은 현재 고도로 모듈화된 웹 앱 사용 사례에 최적화되어 있지 않습니다. 예를 들어, 사용자가 이미 캐싱한 리소스를 제외하고 푸시하는 것이 어렵고, 이를 해결하기 위해 기원의 전체 캐시 상태를 서버에 전달하는 것은 개인정보 보호 위험이 될 수 있습니다.

그래서 필요하다면 HTTP/2를 사용하세요! 다만 HTTP/2 서버 푸시는 (안타깝게도) 만능 해결책이 아님을 기억하세요.

## JS 모듈의 웹 채택

JS 모듈은 웹에서 점차 채택되고 있습니다. [우리의 사용 카운터](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062)에 따르면 현재 모든 페이지 로드 중 0.08%가 `<script type="module">`을 사용하고 있습니다. 이 숫자는 동적 `import()` 또는 [Worklets](https://drafts.css-houdini.org/worklets/)과 같은 다른 진입점을 제외합니다.

## JS 모듈의 다음 단계는?

Chrome 팀은 다양한 방법으로 JS 모듈의 개발 시간 경험을 개선하기 위해 작업하고 있습니다. 몇 가지를 살펴보겠습니다.

### 더 빠르고 결정적인 모듈 해석 알고리즘

우리는 속도와 결정론 측면에서 결함을 해결하는 모듈 해상도 알고리즘 변경을 제안했습니다. 새로운 알고리즘은 현재 [HTML 사양](https://github.com/whatwg/html/pull/2991)과 [ECMAScript 사양](https://github.com/tc39/ecma262/pull/1006)에 도입되었으며, [Chrome 63](http://crbug.com/763597)에서 구현되었습니다. 이 개선 사항은 곧 더 많은 브라우저에서 사용할 수 있게 될 것입니다!

새로운 알고리즘은 훨씬 더 효율적이고 빠릅니다. 이전 알고리즘의 계산 복잡도는 의존성 그래프 크기에 따라 𝒪(n²)로, 크롬의 당시 구현도 마찬가지였습니다. 새로운 알고리즘은 선형, 즉 𝒪(n)입니다.

더불어, 새로운 알고리즘은 해상도 오류를 결정론적으로 보고합니다. 여러 오류가 포함된 그래프가 주어질 때, 이전 알고리즘의 반복 실행은 다양한 오류를 해상도 실패의 원인으로 보고할 수 있었습니다. 이는 디버깅을 불필요하게 어렵게 만들었습니다. 새로운 알고리즘은 항상 동일한 오류를 보고할 것을 보장합니다.

### 워클릿과 웹 워커

Chrome은 이제 [워크릿](https://drafts.css-houdini.org/worklets/)을 구현하여 웹 개발자가 웹 브라우저의 '저수준 부분'의 하드코딩된 로직을 사용자 정의할 수 있도록 합니다. 워크릿을 사용하면 웹 개발자는 렌더링 파이프라인이나 오디오 처리 파이프라인(그리고 미래에는 더 많은 파이프라인)에 JS 모듈을 제공할 수 있습니다.

Chrome 65는 DOM 요소의 페인팅 방식을 제어하기 위한 [`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi) (CSS Paint API라고도 함)을 지원합니다.

```js
const result = await css.paintWorklet.addModule(&apos;paint-worklet.mjs&apos;);
```

Chrome 66은 [`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet)을 지원하여 사용자 코드를 사용하여 오디오 처리를 제어할 수 있습니다. 같은 크롬 버전에서 [`AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ)을 위한 [OriginTrial](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ)이 시작되었으며, 스크롤 연결된 고성능 절차적 애니메이션을 생성할 수 있게 합니다.

마지막으로 [`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/) (CSS Layout API라고도 함)이 이제 Chrome 67에 구현되었습니다.

크롬에서는 전용 웹 워커에서 JS 모듈을 사용하는 지원을 추가하기 위해 [작업 중입니다](https://bugs.chromium.org/p/chromium/issues/detail?id=680046). 이미 `chrome://flags/#enable-experimental-web-platform-features`를 활성화하여 이 기능을 시도할 수 있습니다.

```js
const worker = new Worker(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
```

공유 워커와 서비스 워커에 대한 JS 모듈 지원도 곧 제공될 예정입니다:

```js
const worker = new SharedWorker(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
const registration = await navigator.serviceWorker.register(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
```

### Import maps

Node.js/npm에서는 JS 모듈을 '패키지 이름'으로 가져오는 것이 일반적입니다. 예를 들어:

```js
import moment from &apos;moment&apos;;
import {pluck} from &apos;lodash-es&apos;;
```

현재 [HTML 사양에 따르면](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier), 이러한 '베어 가져오기 지정자'는 예외를 발생시킵니다. [우리의 import maps 제안](https://github.com/domenic/import-maps)은 이러한 코드가 프로덕션 앱을 포함하여 웹에서 작동할 수 있도록 허용합니다. import map은 브라우저가 베어 가져오기 지정자를 전체 URL로 변환하도록 돕는 JSON 리소스입니다.

Import maps는 아직 제안 단계에 있습니다. 다양한 사용 사례를 어떻게 해결하는지에 대해 많이 생각해보았지만, 커뮤니티와 여전히 소통 중이며 전체 사양을 작성하지 않았습니다. 피드백을 환영합니다!

### 웹 패키징: 네이티브 번들

Chrome 로딩 팀은 현재 웹 앱을 배포하기 위한 새로운 방식으로 [네이티브 웹 패키징 형식](https://github.com/WICG/webpackage)을 탐구하고 있습니다. 웹 패키징의 주요 기능은 다음과 같습니다:

[서명된 HTTP 교환](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)은 브라우저가 단일 HTTP 요청/응답 쌍이 주장하는 출처에 의해 생성되었음을 신뢰할 수 있도록 합니다; [번들된 HTTP 교환](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00)은 각각 서명되거나 서명되지 않을 수 있는 교환들의 모음을 말하며, 번들을 전체로 해석하는 방법에 대한 일부 메타데이터를 포함합니다.

이 두 가지를 결합하여, 이러한 웹 패키징 형식은 *여러 동일 출처 리소스*를 *단일* HTTP `GET` 응답에 *안전하게 통합*할 수 있게 합니다.

현재 webpack, Rollup 또는 Parcel과 같은 기존 번들링 도구는 단일 JavaScript 번들을 생성하여 원래의 개별 모듈과 자산의 의미가 손실됩니다. 네이티브 번들을 사용하면 브라우저가 리소스를 원래 형태로 분리할 수 있습니다. 간단히 말하자면, 번들된 HTTP 교환은 앞뒤 수록 순서에 상관없이 내용 테이블(목차)을 통해 액세스할 수 있는 리소스 번들이며, 포함된 리소스는 상대적 중요도에 따라 효율적으로 저장되고 레이블링될 수 있으며, 모든 중 개별 파일의 개념을 유지할 수 있습니다. 이로 인해 네이티브 번들은 디버깅 경험을 향상시킬 수 있습니다. DevTools에서 자산을 볼 때, 브라우저가 복잡한 소스 맵 없이 원래 모듈을 정확히 확인할 수 있습니다.

네이티브 번들 형식의 투명성은 다양한 최적화 기회를 제공합니다. 예를 들어, 브라우저가 이미 네이티브 번들의 일부를 로컬에 캐싱한 경우, 웹 서버와 이를 통신하여 누락된 부분만 다운로드할 수 있습니다.

Chrome은 이미 제안서의 일부([`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html))를 지원하고 있지만, 번들 형식 자체와 고도로 모듈화된 앱에의 응용은 아직 탐구 단계에 있습니다. 여러분의 피드백을 저장소 또는 &lt;loading-dev@chromium.org> 이메일을 통해 환영합니다!

### 레이어드 API

새로운 기능과 웹 API를 배포하는 것은 지속적인 유지보수 및 실행 비용을 초래합니다 — 모든 새로운 기능은 브라우저 네임스페이스를 오염시키고, 시작 비용을 증가시키며, 코드베이스 전반에서 버그를 도입할 새로운 표면을 나타냅니다. [레이어드 API](https://github.com/drufball/layered-apis)는 웹 브라우저에서 더 확장 가능한 방식으로 고급 API를 구현하고 배포하려는 노력입니다. JS 모듈은 레이어드 API를 구현하기 위한 핵심 기술입니다:

- 모듈은 명시적으로 임포트되므로, 레이어드 API를 모듈을 통해 노출하도록 요구하면 개발자가 사용하는 레이어드 API에 대해서만 비용을 지불해야 합니다.
- 모듈 로딩은 구성 가능하므로, 레이어드 API는 레이어드 API를 지원하지 않는 브라우저에서 자동으로 폴리필을 로드하는 내장 메커니즘을 가질 수 있습니다.

모듈과 레이어드 API의 작동 방식에 대한 세부사항은 [여전히 논의 중](https://github.com/drufball/layered-apis/issues)이지만, 현재 제안은 다음과 같은 형식을 보입니다:

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

`<script>` 요소는 `virtual-scroller` API를 브라우저의 기본 내장된 레이어드 API 집합(`std:virtual-scroller`)에서 로드하거나 폴리필을 가리키는 대체 URL에서 로드합니다. 이 API는 웹 브라우저에서 JS 모듈이 할 수 있는 모든 작업을 수행할 수 있습니다. 한 가지 예는 [사용자 정의 `<virtual-scroller>` 요소](https://www.chromestatus.com/feature/5673195159945216)를 정의하는 것으로, 다음 HTML을 원하는 방식으로 점진적으로 강화할 수 있습니다:

```html
<virtual-scroller>
  <!-- 콘텐츠는 여기에 추가됩니다. -->
</virtual-scroller>
```

## 크레딧

JavaScript 모듈을 빠르게 만드는 데 도움을 준 Domenic Denicola, Georg Neis, Hiroki Nakagawa, Hiroshige Hayashizaki, Jakob Gruber, Kouhei Ueno, Kunihiko Sakamoto, Yang Guo에게 감사드립니다!

또한 이 가이드의 초안 버전을 읽고 의견을 제공해준 Eric Bidelman, Jake Archibald, Jason Miller, Jeffrey Posnick, Philip Walton, Rob Dodson, Sam Dutton, Sam Thorogood, Thomas Steiner에게도 감사드립니다.
