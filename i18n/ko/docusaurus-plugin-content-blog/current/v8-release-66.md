---
title: 'V8 릴리즈 v6.6'
author: 'V8 팀'
date: 2018-03-27 13:33:37
tags:
  - 릴리즈
description: 'V8 v6.6에는 선택적 catch 바인딩, 확장된 문자열 트리밍, 여러 파싱/컴파일/런타임 성능 개선 등이 포함됩니다!'
tweet: '978534399938584576'
---
6주마다 우리는 [릴리즈 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 6.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.6)을 발표하게 되어 기쁩니다. 이 버전은 출시 전 몇 주간 Chrome 66 정식 버전과 조정되어 베타로 제공됩니다. V8 v6.6에는 개발자 중심의 다양한 편리함이 포함되어 있습니다. 이 게시글에서는 출시를 기대하며 몇 가지 하이라이트를 살펴봅니다.

<!--truncate-->
## JavaScript 언어 기능

### `Function.prototype.toString` 수정  #function-tostring

[`Function.prototype.toString()`](/features/function-tostring)는 이제 공백과 주석을 포함하여 소스 코드 텍스트의 정확한 슬라이스를 반환합니다. 기존 동작과 새 동작을 비교한 예시는 다음과 같습니다:

```js
// `function` 키워드와 함수 이름 사이의 주석
// 그리고 함수 이름 뒤의 공백을 확인하세요.
function /* a comment */ foo () {}

// 이전에:
foo.toString();
// → 'function foo() {}'
//             ^ 주석 없음
//                ^ 공백 없음

// 이제:
foo.toString();
// → 'function /* comment */ foo () {}'
```

### JSON ⊂ ECMAScript

라인 구분자(U+2028)와 문단 구분자(U+2029) 기호가 이제 문자열 리터럴에서 [JSON과 일치하도록](/features/subsume-json) 허용됩니다. 이전에는 문자열 리터럴 내에서 이러한 기호가 줄 구분자로 처리되어 `SyntaxError` 예외를 발생시켰습니다.

### 선택적 `catch` 바인딩

`try` 문의 `catch` 블록은 이제 [매개변수 없이도 사용 가능](/features/optional-catch-binding)합니다. 이는 예외 개체를 처리하는 코드에서 필요하지 않을 때 유용합니다.

```js
try {
  doSomethingThatMightThrow();
} catch { // → 엄마, 바인딩이 없어요!
  handleException();
}
```

### 단방향 문자열 트리밍

`String.prototype.trim()`에 추가하여, V8은 이제 [`String.prototype.trimStart()` 및 `String.prototype.trimEnd()`](/features/string-trimming)을 구현합니다. 이 기능은 이전에 비표준 `trimLeft()` 및 `trimRight()` 메서드를 통해 사용할 수 있었으며, 새로운 메서드의 별칭으로 남아 이전 버전과의 호환성을 제공합니다.

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trim();
// → 'hello world'
```

### `Array.prototype.values`

[`Array.prototype.values()` 메서드](https://tc39.es/ecma262/#sec-array.prototype.values)는 배열에 ES2015 `Map` 및 `Set` 컬렉션과 동일한 반복 인터페이스를 제공합니다. 이제 배열, `Map`, 및 `Set`은 동일한 이름의 메서드를 호출하여 `keys`, `values`, 또는 `entries`로 순회할 수 있습니다. 이 변경은 기존 JavaScript 코드와 호환되지 않을 가능성이 있습니다. 웹사이트에서 이상하거나 깨진 동작을 발견하면 `chrome://flags/#enable-array-prototype-values`에서 이 기능을 비활성화하고 [이슈를 제기](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user)해 주십시오.

## 실행 후 코드 캐싱

_콜드 로드_ 및 _웜 로드_라는 용어는 로딩 성능에 관심 있는 사람들에게 잘 알려져 있을 수 있습니다. V8에는 또한 _핫 로드_라는 개념이 존재합니다. Chrome이 V8을 임베딩하는 예제를 통해 이러한 단계들을 설명하겠습니다:

- **콜드 로드:** Chrome이 방문한 웹 페이지를 처음으로 확인하고 전혀 캐시 데이터를 갖고 있지 않은 상태입니다.
- **웜 로드**: Chrome이 웹 페이지를 이미 방문했음을 기억하고 특정 자산(예: 이미지 및 스크립트 소스 파일)을 캐시에서 검색할 수 있습니다. V8은 페이지가 동일한 스크립트 파일을 이미 제공했음을 인식하여 스크립트 파일과 함께 컴파일된 코드를 디스크 캐시에 캐시합니다.
- **핫 로드**: Chrome이 웹 페이지를 세 번째로 방문할 때, 디스크 캐시에서 스크립트 파일을 제공하면서 이전 로드 중에 캐시된 코드도 V8에 제공합니다. V8은 이 캐시된 코드를 사용하여 스크립트를 처음부터 파싱하고 컴파일하는 과정을 건너뛸 수 있습니다.

V8 v6.6 이전 버전에서는 최상위 컴파일 직후 즉시 생성된 코드를 캐시했습니다. V8은 최상위 컴파일 동안 즉시 실행될 것으로 알고 있는 함수만 컴파일하고, 다른 함수에는 지연 컴파일을 표시합니다. 이는 캐시된 코드가 최상위 코드만 포함하고, 다른 모든 함수는 각 페이지 로드 시 처음부터 지연 컴파일해야 한다는 것을 의미합니다. v6.6 버전부터 V8은 스크립트의 최상위 실행 후 생성된 코드를 캐시합니다. 스크립트를 실행하면 더 많은 함수들이 지연 컴파일되며 캐시에 포함될 수 있습니다. 그 결과, 이러한 함수들은 미래의 페이지 로드에서 컴파일할 필요가 없어져 핫로드 상황에서 컴파일 및 파싱 시간이 20-60% 감소합니다. 사용자에게 눈에 띄는 변화는 메인 스레드의 혼잡이 줄어들어 더 부드럽고 빠른 로딩 경험을 제공한다는 점입니다.

이 주제에 대한 자세한 블로그 글을 곧 확인하세요.

## 백그라운드 컴파일

V8은 오랫동안 [백그라운드 스레드에서 JavaScript 코드를 파싱](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)할 수 있었습니다. V8의 새로운 [Ignition 바이트코드 인터프리터](/blog/launching-ignition-and-turbofan)는 JavaScript 소스를 바이트코드로 컴파일하는 작업도 백그라운드 스레드에서 수행할 수 있도록 확장되었습니다. 이를 통해 메인 스레드를 더 많이 비워주어 더 많은 JavaScript를 실행하고 끊김 현상을 줄일 수 있습니다. Chrome 66에서 이 기능을 활성화했으며, 일반 웹사이트에서 메인 스레드 컴파일 시간이 5%에서 20%까지 감소하는 것을 확인했습니다. 자세한 내용은 [관련 블로그 글](/blog/background-compilation)을 참조하세요.

## AST 번호 부여 제거

지난해 [Ignition 및 TurboFan 출시](/blog/launching-ignition-and-turbofan) 이후로 컴파일 파이프라인을 단순화하면서 이점이 계속 이어졌습니다. 이전 파이프라인에서는 "AST 번호 부여"라는 후처리 단계가 필요했는데, 생성된 추상 구문 트리의 노드에 번호를 부여하여 다양한 컴파일러 간에 공통 참조점을 제공했습니다.

시간이 지나며 이 후처리 단계는 다른 기능들도 포함하게 되었고, 이에 따라 숫자화는 생성기 및 비동기 함수의 일시 중지 지점을 번호화하거나, 조기 컴파일을 위한 내부 함수를 수집하거나, 리터럴을 초기화하거나 최적화 불가능한 코드 패턴을 감지하는 기능을 포함하게 되었습니다.

새로운 파이프라인에서는 Ignition 바이트코드가 공통 참조점이 되었고, 숫자화 자체는 더 이상 필요하지 않았으나, 여전히 필요한 기능은 남아있었고 AST 번호 부여 단계도 유지되었습니다.

V8 v6.6에서는 [남아있는 기능을 다른 처리 단계로 이동하거나 폐지](https://bugs.chromium.org/p/v8/issues/detail?id=7178)함으로써 이 트리 탐색을 제거할 수 있었습니다. 그 결과 실제 컴파일 시간이 3-5% 개선되었습니다.

## 비동기 성능 개선

약속(Promise)와 비동기 함수에서 멋진 성능 개선을 달성했으며, 특히 비동기 함수와 Promise 체인 간의 차이를 좁혔습니다.

![Promise 성능 개선](/_img/v8-release-66/promise.svg)

추가적으로 비동기 생성기 및 비동기 반복(iteration) 성능이 크게 개선되어 V8 v6.6을 포함하는 다가오는 Node 10 LTS에서 사용할 수 있는 유효한 옵션이 되었습니다. 예를 들어 아래의 Fibonacci 수열 구현을 살펴보세요:

```js
async function* fibonacciSequence() {
  for (let a = 0, b = 1;;) {
    yield a;
    const c = a + b;
    a = b;
    b = c;
  }
}

async function fibonacci(id, n) {
  for await (const value of fibonacciSequence()) {
    if (n-- === 0) return value;
  }
}
```

Babel 트랜스파일 이전과 이후로 이 패턴에서 다음과 같은 개선을 측정했습니다:

![비동기 생성기 성능 개선](/_img/v8-release-66/async-generator.svg)

마지막으로, "일시 중지 가능한 함수"(생성기, 비동기 함수, 모듈 등)에 대한 [바이트코드 개선](https://chromium-review.googlesource.com/c/v8/v8/+/866734)을 통해 인터프리터에서 실행되는 동안 이러한 함수의 성능을 개선하고 컴파일된 크기를 감소시켰습니다. 우리는 향후 출시에서 비동기 함수와 비동기 생성기의 성능을 더 개선할 계획이니 기대해주세요.

## 배열 성능 개선

홀리(double) 배열의 `Array#reduce` 처리 성능이 10배 이상 향상되었습니다([홀리 및 패킹 배열이 무엇인지에 대한 설명은 블로그 글을 참조하세요](/blog/elements-kinds)). 이는 `Array#reduce`가 홀리 및 패킹 더블 배열에 적용되는 경우의 빠른 경로를 넓혔습니다.

![`Array.prototype.reduce` 성능 개선](/_img/v8-release-66/array-reduce.svg)

## 신뢰할 수 없는 코드 완화

V8 v6.6에서는 정보 유출을 방지하기 위해 신뢰할 수 없는 JavaScript 및 WebAssembly 코드를 대상으로 한 [부채널 취약점에 대한 완화](/docs/untrusted-code-mitigations)를 추가했습니다.

## GYP 제거 완료

이번 V8 버전은 처음으로 GYP 파일 없이 공식적으로 제공됩니다. 삭제된 GYP 파일이 필요한 경우, 자체 소스 저장소에 복사해야 합니다.

## 메모리 프로파일링

Chrome DevTools는 이제 C++ DOM 객체를 추적하고 스냅샷을 생성하여 JavaScript에서 참조되는 모든 DOM 객체를 표시할 수 있습니다. 이 기능은 V8 가비지 컬렉터의 새로운 C++ 추적 메커니즘의 이점 중 하나입니다. 자세한 정보는 [전용 블로그](blog/tracing-js-dom)를 확인하세요.

## V8 API

`git log branch-heads/6.5..branch-heads/6.6 include/v8.h` 명령어를 사용하여 API 변경 사항 목록을 확인하세요.
