---
title: 'V8 릴리즈 v8.6'
author: '잉그바르 스테파냔 ([@RReverser](https://twitter.com/RReverser)), 키보드 퍼저'
avatars:
 - 'ingvar-stepanyan'
date: 2020-09-21
tags:
 - 릴리즈
description: 'V8 릴리즈 v8.6은 존중하는 코드, 성능 개선, 및 규범적 변경사항을 제공합니다.'
tweet: '1308062287731789825'
---
매 6주마다 [릴리즈 과정](https://v8.dev/docs/release-process)의 일부로 V8의 새 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 새 브랜치인 [V8 버전 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6)을 발표하게 되어 기쁩니다. 이 버전은 몇 주 후에 Chrome 86 Stable과 함께 릴리즈될 때까지 베타 상태입니다. V8 v8.6은 다양한 개발자 친화적인 항목들로 채워져 있습니다. 이 게시물에서는 릴리즈를 기대하며 몇 가지 주요 내용을 미리 소개합니다.

<!--truncate-->
## 존중하는 코드

v8.6 버전은 V8 코드 베이스를 [더 존중하는 방식](https://v8.dev/docs/respectful-code)으로 만듭니다. 팀은 Google의 인종적 공정성 약속을 따르기 위해 프로젝트에서 일부 민감한 용어를 교체하는 Chromium 전역 노력에 동참했습니다. 이 작업은 여전히 진행 중이며 외부 기여자도 도움을 줄 수 있습니다! 아직 남은 작업 목록을 [여기](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit)에서 확인할 수 있습니다.

## 자바스크립트

### 오픈소스 JS-Fuzzer

JS-Fuzzer는 Oliver Chang이 처음 작성한 변형 기반 JavaScript 퍼저입니다. 과거에 V8의 [안정성](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) 및 [보안성](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1)의 기초 역할을 했으며 이제 [오픈소스](https://chromium-review.googlesource.com/c/v8/v8/+/2320330)로 제공됩니다.

이 퍼저는 기존의 교차 엔진 테스트 사례를 변형하여 [Babel](https://babeljs.io/) AST 변환을 사용하며 확장 가능한 [변형자 클래스](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/)로 구성됩니다. 최근에는 JavaScript [정확성 문제](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1)를 탐지하기 위한 차별 테스트 모드에서 퍼저 인스턴스를 실행하기 시작했습니다. 기여를 환영합니다! 자세한 내용은 [README](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md)를 참조하세요.

### `Number.prototype.toString` 속도 향상

JavaScript 숫자를 문자열로 변환하는 작업은 일반적인 경우에 놀랍도록 복잡할 수 있습니다; 이는 부동소수점 정밀도, 과학 기호법, NaN, 무한대, 반올림 등을 고려해야 하기 때문입니다. 실제로 계산하기 전에는 결과 문자열의 크기가 얼마나 될지 알 수 없습니다. 이러한 이유로 우리의 `Number.prototype.toString` 구현은 C++ 런타임 함수로 넘어가야 했습니다.

하지만 많은 경우 단순하고 작은 정수(“Smi”)를 출력하기만 원하는 때가 있습니다. 이는 훨씬 간단한 작업이며 C++ 런타임 함수 호출의 오버헤드가 더 이상 가치가 없습니다. 그래서 Microsoft와 협력하여 Torque로 작성된 `Number.prototype.toString`에 작은 정수를 위한 간단한 빠른 경로를 추가하여 이러한 일반적인 케이스에 대한 오버헤드를 줄였습니다. 이 개선은 숫자 출력 마이크로벤치마크를 약 75% 향상시켰습니다.

### `Atomics.wake` 제거됨

`Atomics.wake`는 [v7.3에서](https://v8.dev/blog/v8-release-73#atomics.notify) 사양 변경에 맞춰 `Atomics.notify`로 이름이 변경되었습니다. 실제로는 이제 `Atomics.wake` 별칭이 제거되었습니다.

### 소규모 규범적 변경 사항

- 익명 클래스는 이제 값이 빈 문자열 `''`인 `.name` 속성을 가집니다. [사양 변경](https://github.com/tc39/ecma262/pull/1490).
- `\8` 및 `\9` 이스케이프 시퀀스는 이제 [해이 모드](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode)의 템플릿 문자열 리터럴과 [엄격 모드](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)에서 모든 문자열 리터럴에서 허용되지 않습니다. [사양 변경](https://github.com/tc39/ecma262/pull/2054).
- 내장 `Reflect` 객체에는 이제 값이 `'Reflect'`인 `Symbol.toStringTag` 속성이 있습니다. [사양 변경](https://github.com/tc39/ecma262/pull/2057).

## 웹어셈블리

### Liftoff에서의 SIMD

Liftoff는 WebAssembly의 기본 컴파일러이며, V8 v8.5부터 모든 플랫폼에서 제공됩니다. [SIMD 제안](https://v8.dev/features/simd)은 WebAssembly가 통애적으로 사용 가능한 하드웨어 벡터 명령을 활용하여 계산 집약적인 작업을 가속화할 수 있도록 합니다. 현재 [원본 시험](https://v8.dev/blog/v8-release-84#simd-origin-trial) 단계에 있으며, 이는 기능이 표준화되기 전에 개발자가 이를 실험해볼 수 있도록 합니다.

지금까지 SIMD는 V8의 최상위 컴파일러인 TurboFan에만 구현되었습니다. 이것은 SIMD 명령에서 최대 성능을 얻기 위해 필요합니다. SIMD 명령을 사용하는 WebAssembly 모듈은 더 빠른 시작과 종종 TurboFan으로 컴파일된 스칼라 대응물보다 더 빠른 런타임 성능을 제공합니다. 예를 들어, 배열의 부동소수점 숫자를 받아 그 값을 0으로 클램프하는 함수(JavaScript로 작성됨)는 다음과 같습니다:

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

Liftoff와 TurboFan을 사용하여 이 기능을 구현한 두 가지를 비교해봅시다:

1. 루프를 4번 반복하는 스칼라 구현.
2. `i32x4.max_s` 명령을 사용하는 SIMD 구현.

Liftoff 스칼라 구현을 기준선으로 삼았을 때, 다음과 같은 결과를 볼 수 있습니다:

![Liftoff SIMD가 Liftoff 스칼라에 비해 약 2.8배 빠르고 TurboFan SIMD가 약 7.5배 빠른 그래프](/_img/v8-release-86/simd.svg)

### 더 빠른 Wasm-to-JS 호출

WebAssembly가 가져온 JavaScript 함수를 호출하면, 우리는 소위 “Wasm-to-JS 래퍼”(또는 “임포트 래퍼”)를 통해 호출합니다. 이 래퍼는 [인수를 변환](https://webassembly.github.io/spec/js-api/index.html#tojsvalue)하여 JavaScript가 이해할 수 있는 객체로 만들고, JavaScript 호출에서 반환되었을 때 반환 값(들)을 [WebAssembly로 변환](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue)합니다.

JavaScript `arguments` 객체가 WebAssembly에서 전달된 인수를 정확히 반영하도록 보장하기 위해, 전달된 인수 수가 일치하지 않는 경우 소위 “인수 어댑터 트램펄린”을 통해 호출해야 합니다.

그러나 많은 경우 호출된 함수가 `arguments` 객체를 사용하지 않기 때문에 이것이 필요하지 않습니다. v8.6에서는 이러한 경우에 인수 어댑터를 통해 호출하는 것을 생략하는 마이크로소프트 기여자의 [패치](https://crrev.com/c/2317061)를 적용하여 영향을 받는 호출을 상당히 빠르게 만들었습니다.

## V8 API

### `Isolate::HasPendingBackgroundTasks`로 대기 중인 백그라운드 작업 감지

새로운 API 함수 `Isolate::HasPendingBackgroundTasks`를 사용하면 내장자가 결국 새로운 포어그라운드 작업을 게시할 백그라운드 작업(WebAssembly 컴파일 등)이 대기중인지 확인할 수 있습니다.

이 API는 내장자가 여전히 대기 중인 WebAssembly 컴파일이 있어서 추가 스크립트 실행을 시작할 때에도 V8을 종료하는 문제를 해결해야 합니다. `Isolate::HasPendingBackgroundTasks`를 사용하여 내장자는 V8을 종료하는 대신 새로운 포어그라운드 작업을 기다릴 수 있습니다.

`git log branch-heads/8.5..branch-heads/8.6 include/v8.h`를 사용하여 API 변경 사항 목록을 받을 수 있습니다.

활성 V8 체크아웃을 사용하고 있는 개발자는 `git checkout -b 8.6 -t branch-heads/8.6`를 사용하여 V8 v8.6의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 곧 직접 새로운 기능을 시도해볼 수 있습니다.
