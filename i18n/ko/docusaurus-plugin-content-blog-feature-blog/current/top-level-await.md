---
title: "최상위 `await`"
author: "Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))"
avatars: 
  - "myles-borins"
date: 2019-10-08
tags: 
  - ECMAScript
  - Node.js 14
description: "JavaScript 모듈에 최상위 `await`가 도입됩니다! 곧 비동기 함수에 있지 않아도 `await`를 사용할 수 있습니다."
tweet: "1181581262399643650"
---
[최상위 `await`](https://github.com/tc39/proposal-top-level-await)는 개발자가 비동기 함수 외부에서 `await` 키워드를 사용할 수 있도록 합니다. 이는 큰 비동기 함수처럼 동작하며, 이를 `import`하는 다른 모듈들이 본문의 평가를 시작하기 전에 대기하게 합니다.

<!--truncate-->
## 이전 동작

`async`/`await`가 처음 도입되었을 때, `async` 함수 외부에서 `await`를 사용하려고 하면 `SyntaxError`가 발생했습니다. 많은 개발자가 이 기능을 사용할 수 있도록 하기 위해 즉시 호출되는 비동기 함수 표현식을 사용하곤 했습니다.

```js
await Promise.resolve(console.log('🎉'));
// → SyntaxError: await is only valid in async function

(async function() {
  await Promise.resolve(console.log('🎉'));
  // → 🎉
}());
```

## 새로운 동작

최상위 `await`로, 위 코드는 [모듈](/features/modules) 내에서 예상한 대로 작동하게 됩니다:

```js
await Promise.resolve(console.log('🎉'));
// → 🎉
```

:::note
**참고:** 최상위 `await`는 _오직_ 모듈의 최상위에서만 작동합니다. 이는 고전적인 스크립트나 비동기 함수 외부에서는 지원되지 않습니다.
:::

## 사용 사례

이 사용 사례는 [사양 제안 리포지토리](https://github.com/tc39/proposal-top-level-await#use-cases)에서 가져왔습니다.

### 동적 의존성 경로 지정

```js
const strings = await import(`/i18n/${navigator.language}`);
```

이 기능은 런타임 값을 사용하여 의존성을 결정할 수 있도록 합니다. 이는 개발/운영 분리, 국제화, 환경 분리 등과 같은 작업에 유용합니다.

### 리소스 초기화

```js
const connection = await dbConnector();
```

이 기능은 모듈이 리소스를 나타내고 모듈을 사용할 수 없는 경우 오류를 발생시킬 수도 있도록 합니다.

### 의존성 대체

다음 예제는 CDN A에서 JavaScript 라이브러리를 로드하려고 시도하고, 실패할 경우 CDN B로 대체합니다:

```js
let jQuery;
try {
  jQuery = await import('https://cdn-a.example.com/jQuery');
} catch {
  jQuery = await import('https://cdn-b.example.com/jQuery');
}
```

## 모듈 실행 순서

최상위 `await`와 함께 JavaScript에서 가장 큰 변화 중 하나는 그래프 내 모듈의 실행 순서입니다. JavaScript 엔진은 모듈을 [후위 순회](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order) 방식으로 실행합니다: 모듈 그래프의 가장 왼쪽 서브트리를 시작으로 모듈이 평가되고, 바인딩이 내보내지며, 형제 모듈이 실행되고, 마지막으로 부모가 실행됩니다. 이 알고리즘은 모듈 그래프의 루트를 실행할 때까지 재귀적으로 실행됩니다.

최상위 `await` 이전에는 이 순서가 항상 동기적이고 결정적이었습니다: 코드가 여러 번 실행되는 경우에도 그래프는 항상 같은 순서로 실행됐습니다. 최상위 `await`가 도입되면, 동일한 보장이 있지만, 최상위 `await`를 사용하지 않는 한에만 해당됩니다.

모듈에서 최상위 `await`를 사용할 때 다음이 발생합니다:

1. 현재 모듈의 실행이 대기 중인 프로미스가 해결될 때까지 연기됩니다.
1. 부모 모듈의 실행이 `await`를 호출한 자식 모듈과 모든 형제 모듈이 바인딩을 내보낼 때까지 연기됩니다.
1. 형제 모듈과 부모 모듈의 형제 모듈은 그래프 내에서 순환이나 다른 `await`된 프로미스가 없는 경우 같은 동기적 순서로 계속 실행할 수 있습니다.
1. `await`를 호출한 모듈은 대기 중인 프로미스가 해결된 후 실행을 재개합니다.
1. 부모 모듈과 이후의 트리가 다른 `await`된 프로미스가 없는 한 동기적 순서로 계속 실행됩니다.

## 개발 도구에서는 이미 작동하지 않나요?

맞습니다! [Chrome DevTools](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await), [Node.js](https://github.com/nodejs/node/issues/13209), Safari Web Inspector의 REPL은 이미 최상위 `await`를 지원합니다. 하지만 이 기능은 비표준적이고 REPL에만 제한되었습니다! 이는 언어 사양의 일부인 최상위 `await` 제안과는 다르며, 모듈에서만 적용됩니다. 제안 사양의 동작과 완전히 일치하도록 최상위 `await`를 사용하는 코드를 테스트하려면 실제 앱에서 테스트하고 DevTools나 Node.js REPL에서만 테스트하지 마세요!

## 최상위 `await`가 문제를 일으킬 수 있지 않을까요?

[Rich Harris](https://twitter.com/Rich_Harris)가 처음 제안한 [악명 높은 gist](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221)를 본 적이 있을 것입니다. 이 gist에서 그는 최상위 `await`에 대한 여러 가지 우려를 제기하며 JavaScript 언어에 이 기능을 구현하지 말 것을 제안했습니다. 구체적인 우려 사항은 다음과 같습니다:

- 최상위 `await`가 실행을 차단할 수 있습니다.
- 최상위 `await`가 자원의 가져오기를 차단할 수 있습니다.
- CommonJS 모듈에 대한 명확한 상호운용성이 없을 것입니다.

제안의 단계 3 버전에서는 이러한 문제를 직접적으로 해결합니다:

- 형제 모듈이 실행 가능하므로, 결정적인 차단은 없습니다.
- 최상위 `await`는 모듈 그래프의 실행 단계에서 발생합니다. 이 시점에서 모든 자원은 이미 가져오고 연결되었습니다. 자원의 가져오기를 차단할 위험은 없습니다.
- 최상위 `await`는 모듈로 제한됩니다. 스크립트 또는 CommonJS 모듈에 대한 지원은 명시적으로 없습니다.

모든 새로운 언어 기능과 마찬가지로 예상치 못한 동작의 위험이 항상 존재합니다. 예를 들어, 최상위 `await`로 인해 순환 모듈 종속성이 교착 상태를 초래할 수 있습니다.

최상위 `await`가 없을 경우, JavaScript 개발자는 `await`에 접근하기 위해 비동기 즉시 호출 함수 표현식을 자주 사용했습니다. 불행히도 이 패턴은 그래프 실행의 결정성을 줄이고 애플리케이션의 정적 분석 가능성을 낮추게 됩니다. 이러한 이유로 최상위 `await`의 부재는 이 기능으로 인해 발생하는 위험보다 더 큰 위험으로 간주되었습니다.

## 최상위 `await`에 대한 지원

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="no https://github.com/babel/proposals/issues/44"></feature-support>
