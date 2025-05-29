---
title: "V8 릴리즈 v7.4"
author: "Georg Neis"
date: 2019-03-22 16:30:42
tags:
  - release
description: "V8 v7.4는 WebAssembly 스레드/Atomics, 비공개 클래스 필드, 성능 및 메모리 개선 등 다양한 기능을 제공합니다!"
tweet: "1109094755936489472"
---
매 6주마다 우리는 [릴리즈 프로세스](/docs/release-process)의 일환으로 새로운 V8 브랜치를 생성합니다. 각 버전은 크롬 베타 마일스톤 직전 V8의 Git 마스터에서 브랜칭됩니다. 오늘 우리는 [V8 버전 7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4)라는 최신 브랜치를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후에 Chrome 74 Stable과 함께 출시되기 전까지 베타 버전으로 제공됩니다. V8 v7.4는 개발자들이 사용할 수 있는 여러 가지 유용한 기능들로 가득합니다. 이 게시물은 출시를 앞두고 주목할 만한 부분에 대한 미리보기를 제공합니다.

<!--truncate-->
## JIT-less V8

V8은 이제 실행 중 실행 가능한 메모리를 할당하지 않고도 *JavaScript* 실행을 지원합니다. 이 기능에 대한 자세한 정보는 [전용 블로그 게시물](/blog/jitless)에서 확인할 수 있습니다.

## WebAssembly 스레드/Atomics 출시

Android가 아닌 운영 체제에서 WebAssembly 스레드/Atomics가 이제 활성화되었습니다. 이는 [V8 v7.0에서 시작한 오리진 트라이얼/프리뷰](/blog/v8-release-70#a-preview-of-webassembly-threads)를 완료하는 것입니다. Web Fundamentals 기사는 [Emscripten과 함께 WebAssembly Atomics를 사용하는 방법](https://developers.google.com/web/updates/2018/10/wasm-threads)을 설명합니다.

이를 통해 웹에서 다중 코어를 활용하는 새로운 계산 집중적 사용 사례를 가능하게 합니다.

## 성능

### 인수 불일치에 대한 더 빠른 호출

JavaScript에서는 함수 호출 시 너무 적거나 많은 매개변수를 사용하는 것이 완전히 유효합니다 (즉, 선언된 정식 매개변수보다 적거나 많게 넘어갈 수 있습니다). 전자는 _과소-적용_(under-application)이라고 하고, 후자는 _과다-적용_(over-application)이라고 합니다. 과소-적용의 경우, 나머지 정식 매개변수는 `undefined`로 할당되며, 과다-적용의 경우 초과 매개변수는 무시됩니다.

그러나 JavaScript 함수는 [`arguments` 객체](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments), [나머지 매개변수](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters), 또는 심지어 [비표준 `Function.prototype.arguments` 속성](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments)을 사용하여 실제 매개변수에 접근할 수 있습니다. 그래서 JavaScript 엔진은 실제 매개변수에 접근하는 방법을 제공해야 합니다. V8에서는 _인수 적응_(arguments adaption)이라는 기술을 통해 과소 또는 과다-적용이 발생할 경우 실제 매개변수를 제공합니다. 하지만 인수 적응은 성능 비용이 들며, 현대의 프론트엔드 및 미들웨어 프레임워크에서 일반적으로 필요합니다 (즉, 선택적 매개변수나 가변 인수 목록이 많은 API에서).

엔진이 인수 적응이 필요 없다는 것을 알 수 있는 시나리오도 있습니다. 이는 함수가 엄격 모드이고 `arguments` 또는 나머지 매개변수를 사용하지 않을 때 발생합니다. 이러한 경우 V8은 이제 인수 적응을 완전히 생략하여 호출 오버헤드를 **최대 60%**까지 줄입니다.

![인수 적응을 생략함으로써 발생하는 성능 영향, [마이크로 벤치마크](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js)를 통해 측정.](/_img/v8-release-74/argument-mismatch-performance.svg)

그래프는 실제로 호출된 인수를 가정할 때(호출자가 실제 인수를 관측할 수 없다고 가정), 인수 불일치의 경우에도 더 이상 오버헤드가 없음을 보여줍니다. 자세한 내용은 [설계 문서](https://bit.ly/v8-faster-calls-with-arguments-mismatch)를 참조하십시오.

### 네이티브 접근자 성능 개선

Angular 팀은 [발견](https://mhevery.github.io/perf-tests/DOM-megamorphic.html)에 따르면 네이티브 접근자(예: DOM 속성 접근자)에 각각의 `get` 함수로 직접 호출하는 것이 Chrome에서 [단형](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching) 또는 심지어 [다형](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching) 속성 접근보다 상당히 느렸습니다. 이는 [`Function#call()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)를 통해 DOM 접근자로 호출하는 데 있어 V8에서 느린 경로를 택했기 때문이었습니다. 속성 접근을 위해 이미 존재하는 빠른 경로 대신 느린 경로를 사용했습니다.

![](/_img/v8-release-74/native-accessor-performance.svg)

네이티브 접근자를 호출하는 성능을 향상시켜 메가모픽 속성 접근보다 상당히 빠르게 만들었습니다. 자세한 내용은 [V8 issue #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820)를 참조하세요.

### 파서 성능

Chrome에서는 충분히 큰 스크립트가 다운로드되는 동안 작업자 스레드에서 "스트리밍" 분석됩니다. 이번 릴리스에서 소스 스트림에 사용된 사용자 정의 UTF-8 디코딩의 성능 문제를 확인하고 수정하여 평균적으로 스트리밍 분석 속도가 8% 빨라졌습니다.

V8의 준비 분석기에서 추가 문제를 발견했는데, 이는 일반적으로 작업자 스레드에서 실행됩니다: 속성 이름이 불필요하게 중복 제거되었습니다. 이러한 중복 제거를 제거함으로써 스트리밍 분석기가 추가로 10.5% 향상되었습니다. 이는 작은 스크립트와 인라인 스크립트처럼 스트리밍되지 않는 스크립트의 주요 스레드 분석 시간도 개선됩니다.

![위 그래프에서 각 하락은 스트리밍 분석기의 성능 개선을 나타냅니다.](/_img/v8-release-74/parser-performance.jpg)

## 메모리

### 바이트코드 플러싱

JavaScript 소스에서 컴파일된 바이트코드는 일반적으로 관련 메타 데이터와 함께 V8 힙 공간의 약 15% 정도를 차지합니다. 많은 함수는 초기화 중에만 실행되거나 컴파일 후 거의 사용되지 않습니다.

V8의 메모리 오버헤드를 줄이기 위해 최근 실행되지 않은 함수에서 가비지 수집 중에 컴파일된 바이트코드를 플러싱하는 기능을 구현했습니다. 이를 활성화하기 위해 함수 바이트코드의 연령을 추적하고, 가비지 수집 중에 그 연령을 증가시키며 함수가 실행될 때 0으로 재설정합니다. 특정 연령 한계를 초과하는 바이트코드는 다음 가비지 수집에서 수집할 수 있으며, 함수는 나중에 필요하면 바이트코드를 다시 컴파일합니다.

바이트코드 플러싱 실험 결과 Chrome 사용자들의 메모리가 V8 힙에서 5–15% 감소하면서 성능 저하나 JavaScript 코드 컴파일에 소요되는 CPU 시간이 크게 증가하지 않는다는 것을 확인했습니다.

![](/_img/v8-release-74/bytecode-flushing.svg)

### 바이트코드 죽은 기본 블록 제거

Ignition 바이트코드 컴파일러는 `return` 또는 `break` 문 등의 코드가 죽었음을 알고 그 생성 코드를 피하려고 시도합니다:

```js
return;
deadCall(); // 실행되지 않음
```

하지만 이전에는 문 목록의 종료 문에 대해 선택적으로 처리되었으며, 참으로 알려진 조건 단축과 같은 다른 최적화를 고려하지 않았습니다:

```js
if (2.2) return;
deadCall(); // 실행되지 않음
```

이 문제를 V8 v7.3에서 해결하려고 시도했지만 여전히 문 단위에서만 작업되었으며, 제어 흐름이 더 복잡해지면 작동하지 않았습니다:

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // 실행되지 않음
```

위의 `deadCall()`은 새 기본 블록의 시작이 되어야 하며, 이 기본 블록은 루프 내의 `break` 문을 대상으로 도달 가능합니다.

V8 v7.4에서는 기본 블록 전체가 죽은 상태가 될 수 있도록 허용하며, 어떤 `Jump` 바이트코드(Ignition의 주요 제어 흐름 원시 코드)도 참조하지 않는 경우에만 가능합니다. 위 예제에서는 `break`가 생성되지 않아 루프에 `break` 문이 없습니다. 따라서 `deadCall()`으로 시작되는 기본 블록은 참조하는 점프가 없으며 죽은 상태로 간주됩니다. 이는 사용자 코드에 큰 영향을 미치지 않을 것으로 예상되지만, 생성기, `for-of`, `try-catch`와 같은 다양한 디슈가싱을 단순화하는 데 특히 유용하며, 기본 블록이 구현 중간에 복잡한 문을 '부활'시킬 수 있는 클래스의 버그를 제거합니다.

## JavaScript 언어 기능

### 비공개 클래스 필드

V8 v7.2는 공개 클래스 필드 구문을 지원했습니다. 클래스 필드는 생성자 함수 없이도 인스턴스 속성을 정의할 수 있도록 클래스를 간단하게 만듭니다. V8 v7.4부터 `#` 접두사를 사용하여 필드를 비공개로 표시할 수 있습니다.

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('현재 값을 가져옵니다!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

공개 필드와 달리 비공개 필드는 클래스 본문 외부에서 접근할 수 없습니다:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

자세한 내용은 [공개 및 비공개 클래스 필드에 대한 설명서](/features/class-fields)를 읽어보십시오.

### `Intl.Locale`

JavaScript 애플리케이션은 일반적으로 지역을 식별하기 위해 `'en-US'` 또는 `'de-CH'`와 같은 문자열을 사용합니다. `Intl.Locale`은 지역을 다루기 위한 더 강력한 메커니즘을 제공하며, 언어, 캘린더, 숫자 체계, 시간 주기 등과 같은 지역별 기본 설정을 쉽게 추출할 수 있게 합니다.

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → 'es-419-u-ca-gregory-hc-h12'
```

### 해시뱅 문법

JavaScript 프로그램은 이제 `#!`로 시작할 수 있으며, 이는 [해시뱅](https://github.com/tc39/proposal-hashbang)이라고 불립니다. 해시뱅 뒤의 줄은 단일 줄 주석으로 간주됩니다. 이는 Node.js와 같은 명령줄 JavaScript 호스트에서의 기존 사용과 일치합니다. 아래는 이제 문법적으로 유효한 JavaScript 프로그램입니다:

```js
#!/usr/bin/env node
console.log(42);
```

## V8 API

`git log branch-heads/7.3..branch-heads/7.4 include/v8.h`를 사용하여 API 변경 사항 목록을 얻을 수 있습니다.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 7.4 -t branch-heads/7.4`를 사용하여 V8 v7.4의 새로운 기능을 실험해 볼 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 구독하여 곧 스스로 새로운 기능을 시도해볼 수 있습니다.
