---
title: 'V8 릴리스 v8.5'
author: 'Zeynep Cankara, 일부 Maps 트랙킹'
avatars:
 - 'zeynep-cankara'
date: 2020-07-21
tags:
 - 릴리스
description: 'V8 릴리스 v8.5는 Promise.any, String#replaceAll, 논리 할당 연산자, WebAssembly 다중 값 및 BigInt 지원, 그리고 성능 개선을 포함합니다.'
tweet:
---
6주마다 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일부로 V8의 새 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 [V8 버전 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5)라는 새로운 브랜치를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 85 Stable과 함께 출시될 때까지 베타 상태에 있습니다. V8 v8.5는 다양한 개발자 중심의 재미있는 기능으로 가득 찹니다. 출시를 앞두고 이 게시물에서는 일부 주요 기능에 대한 미리보기를 제공합니다.

<!--truncate-->
## JavaScript

### `Promise.any` 및 `AggregateError`

`Promise.any`는 입력된 프라미스 중 하나가 이행되면 결과 프라미스를 바로 이행하는 프라미스 결합자입니다.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // 입력된 프라미스 중 하나가 이행되었습니다.
  console.log(first);
  // → 예: 'b'
} catch (error) {
  // 입력된 모든 프라미스가 거부되었습니다.
  console.assert(error instanceof AggregateError);
  // 거부된 값을 기록합니다:
  console.log(error.errors);
}
```

모든 입력 프라미스가 거부될 경우, 결과 프라미스는 `AggregateError` 객체로 거부되며 이 객체는 거부 값이 포함된 배열을 유지하는 `errors` 속성을 가집니다.

[우리의 설명서](https://v8.dev/features/promise-combinators#promise.any)를 참고하세요.

### `String.prototype.replaceAll`

`String.prototype.replaceAll`은 글로벌 `RegExp`를 만들지 않고도 하위 문자열의 모든 발생을 쉽게 교체할 수 있는 방법을 제공합니다.

```js
const queryString = 'q=query+string+parameters';

// 작동하지만 정규 표현식 내에서 이스케이프를 필요로 합니다.
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// 더 간단합니다!
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

[우리의 설명서](https://v8.dev/features/string-replaceall)를 참고하세요.

### 논리 할당 연산자

논리 할당 연산자는 `&&`, `||`, 또는 `??`를 할당과 결합한 새로운 복합 할당 연산자입니다.

```js
x &&= y;
// 대략적으로 x && (x = y)에 해당합니다
x ||= y;
// 대략적으로 x || (x = y)에 해당합니다
x ??= y;
// 대략적으로 x ?? (x = y)에 해당합니다
```

수학적 및 비트 연산 복합 할당 연산자와는 다르게, 논리 할당 연산자는 조건적으로만 할당을 수행합니다.

[우리의 설명서](https://v8.dev/features/logical-assignment)를 읽어 더 자세한 설명을 확인하세요.

## WebAssembly

### 모든 플랫폼에서 Liftoff가 제공됨

V8 v6.9 이후로 [Liftoff](https://v8.dev/blog/liftoff)는 Intel 플랫폼에서 WebAssembly의 기본 컴파일러로 사용되었습니다(Chrome 69는 데스크톱 시스템에서 이를 활성화했습니다). 우리는 기본 컴파일러에 의해 생성되는 더 많은 코드로 인해 메모리 증가를 우려했기 때문에 지금까지 모바일 시스템에서는 이를 보류했습니다. 지난 몇 달 동안 실험을 통해 메모리 증가가 대부분의 경우 미미하다는 확신을 가지게 되었고, 따라서 우리는 마침내 모든 아키텍처에서 Liftoff를 기본으로 활성화하여 특히 arm 장치에서 컴파일 속도를 증가시켰습니다(32비트 및 64비트). Chrome 85는 이를 따르며 Liftoff를 배포합니다.

### 다중 값 지원 제공

[다중 값 코드 블록 및 함수 반환](https://github.com/WebAssembly/multi-value)에 대한 WebAssembly 지원이 이제 일반적으로 사용 가능합니다. 이는 최근 공식 WebAssembly 표준에 제안 합병을 반영하며 모든 컴파일러 계층에서 지원됩니다.

예를 들어, 이제 다음은 유효한 WebAssembly 함수입니다:

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

함수가 내보내지면 JavaScript에서 호출할 수도 있으며 배열을 반환합니다:

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

반대로, JavaScript 함수가 배열(또는 반복자)을 반환하면, 이를 WebAssembly 모듈 내에서 다중 반환 함수로 가져와 호출할 수 있습니다:

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

더 중요한 것은, 도구 체인이 이제 WebAssembly 모듈에서 더 컴팩트하고 빠른 코드를 생성하는 데 이 기능을 사용할 수 있다는 점입니다.

### JS BigInts에 대한 지원

최신 공식 표준의 변경에 따라 [JavaScript BigInts로부터 WebAssembly I64 값 변환](https://github.com/WebAssembly/JS-BigInt-integration) 지원이 제공되었으며 일반적으로 사용 가능합니다.

따라서 i64 매개변수 및 반환 값을 가지는 WebAssembly 함수는 JavaScript에서 정밀도 손실 없이 호출할 수 있습니다:

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

JavaScript에서 I64 매개변수로는 BigInts만 전달할 수 있습니다:

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: 매개변수가 BigInt 유형이 아닙니다
  });
```

## V8 API

`git log branch-heads/8.4..branch-heads/8.5 include/v8.h`를 사용하여 API 변경 목록을 확인하십시오.

활성 V8 체크아웃을 가진 개발자는 `git checkout -b 8.5 -t branch-heads/8.5`를 사용하여 V8 v8.5의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 Beta 채널에 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능을 직접 사용해볼 수 있습니다.
