---
title: "V8 릴리즈 v7.1"
author: "Stephan Herhut ([@herhut](https://twitter.com/herhut)), 클론 클론에서 클론된 클론자"
avatars:
  - stephan-herhut
date: 2018-10-31 15:44:37
tags:
  - release
description: "V8 v7.1은 임베디드 바이트코드 핸들러, 개선된 TurboFan 탈출 분석, postMessage(wasmModule), Intl.RelativeTimeFormat, 그리고 globalThis를 제공합니다!"
tweet: "1057645773465235458"
---
매 6주마다 우리는 [릴리즈 프로세스](/docs/release-process)의 일환으로 새로운 V8 브랜치를 생성합니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터로부터 브랜치됩니다. 오늘 우리는 최신 브랜치 [V8 버전 7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1)을 발표하게 되어 기쁩니다. 이는 몇 주 내에 Chrome 71 안정 버전과 함께 출시될 때까지 베타 상태에 있습니다. V8 v7.1은 모든 종류의 개발자 친화적인 기능으로 가득합니다. 이 게시물은 릴리즈를 앞두고 몇 가지 주요 사항을 미리 살펴봅니다.

<!--truncate-->
## 메모리

v6.9/v7.0에서 [바이너리에 내장 기능 직접 포함](/blog/embedded-builtins)에 대한 작업을 이어서, 인터프리터의 바이트코드 핸들러가 이제 [바이너리에 포함](https://bugs.chromium.org/p/v8/issues/detail?id=8068)됩니다. 이는 평균적으로 Isolate 당 약 200 KB를 절약합니다.

## 성능

TurboFan에서 객체가 최적화 단위에 국한된 경우 스칼라 대체를 수행하는 탈출 분석이 개선되어, 주변 컨텍스트에서 로컬 클로저로 변수들이 탈출하는 고차 함수의 [로컬 함수 컨텍스트를 처리](https://bit.ly/v8-turbofan-context-sensitive-js-operators)합니다. 아래 예를 고려해보세요:

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

여기서 `x`는 로컬 클로저 `y => y + x`의 자유변수입니다. V8 v7.1은 이제 `x`의 컨텍스트 할당을 완전히 제거할 수 있어 일부 경우 최대 **40%**의 성능 개선을 제공합니다.

![새로운 탈출 분석으로 인한 성능 개선 (낮을수록 좋음)](/_img/v8-release-71/improved-escape-analysis.svg)

탈출 분석은 이제 로컬 배열에 대한 일부 변수 인덱스 접근을 제거할 수도 있습니다. 다음 예를 보세요:

```js
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; ++i)
    total += args[i];
  return total;
}

function sum2(x, y) {
  return sum(x, y);
}
```

`args`는 `sum2`에 로컬입니다 (`sum`이 `sum2`로 인라인된 경우). V8 v7.1에서는 TurboFan이 `args`의 할당을 완전히 제거하고 변수 인덱스 접근 `args[i]`를 `i === 0 ? x : y` 형태의 삼항 연산자로 대체할 수 있습니다. 이는 JetStream/EarleyBoyer 벤치마크에서 약 ~2%의 향상을 제공합니다. 우리는 향후 두 개 이상의 요소를 가진 배열에서도 이러한 최적화를 확대할 수 있습니다.

## Wasm 모듈의 구조적 복제

마침내 [`postMessage`가 Wasm 모듈에 대해 지원됩니다](https://github.com/WebAssembly/design/pull/1074). 이제 `WebAssembly.Module` 객체를 웹 워커에 `postMessage`할 수 있습니다. 이는 동일 프로세스 내 (다른 쓰레드) 웹 워커에 국한되며, 교차 프로세스 시나리오 (예: 교차 도메인 `postMessage` 또는 공유 웹 워커)로 확장되지는 않습니다.

## 자바스크립트 언어 기능

[`Intl.RelativeTimeFormat` API](/features/intl-relativetimeformat)는 상대 시간을 로컬화된 형식으로 작성(예: “어제”, “42초 전”, 또는 “3개월 후”)할 수 있도록 하면서도 성능을 희생하지 않습니다. 아래는 예시입니다:

```js
// 항상 숫자 값을 출력에 사용할 필요가 없는 영어용 상대 시간 포맷터를 만듭니다.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → '어제'

rtf.format(0, 'day');
// → '오늘'

rtf.format(1, 'day');
// → '내일'

rtf.format(-1, 'week');
// → '지난 주'

rtf.format(0, 'week');
// → '이번 주'

rtf.format(1, 'week');
// → '다음 주'
```

[우리 `Intl.RelativeTimeFormat` 분석서](/features/intl-relativetimeformat)를 읽고 더 많은 정보를 얻으세요.

V8 v7.1은 또한 엄격한 함수나 모듈에서도 플랫폼에 관계없이 글로벌 객체에 접근할 수 있는 보편적인 메커니즘을 제공하는 [`globalThis` 제안](/features/globalthis)의 지원을 추가했습니다.

## V8 API

`git log branch-heads/7.0..branch-heads/7.1 include/v8.h`를 사용하여 API 변경 사항의 목록을 확인하세요.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 7.1 -t branch-heads/7.1`을 사용하여 V8 v7.1의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 새로운 기능을 직접 사용해볼 수 있습니다.
