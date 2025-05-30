---
title: "V8 릴리스 v5.6"
author: "V8 팀"
date: "2016-12-02 13:33:37"
tags: 
  - 릴리스
description: "V8 v5.6은 새로운 컴파일러 파이프라인, 성능 개선 및 ECMAScript 언어 기능 지원 증가를 제공합니다."
---
6주마다 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 바로 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 [V8 버전 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6)의 새 브랜치를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 56 안정 버전과 함께 릴리스될 때까지 베타 버전으로 유지됩니다. V8 5.6은 개발자를 위한 다양한 선물이 가득하며, 이번 릴리스를 기대하며 일부 하이라이트를 미리 소개하고자 합니다.

<!--truncate-->
## ES.next(및 기타)의 Ignition 및 TurboFan 파이프라인 제공

5.6 버전부터 V8은 JavaScript 언어 전체를 최적화할 수 있습니다. 또한, 많은 언어 기능이 V8의 새로운 최적화 파이프라인을 통해 전달됩니다. 이 파이프라인은 V8의 [Ignition 인터프리터](/blog/ignition-interpreter)를 기본으로 사용하며, 더 강력한 [TurboFan 최적화 컴파일러](/docs/turbofan)로 자주 실행되는 메서드를 최적화합니다. 이 새로운 파이프라인은 새로운 언어 기능(예: ES2015 및 ES2016 명세서의 많은 새로운 기능) 또는 Crankshaft ([V8의 '클래식' 최적화 컴파일러](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html))가 메서드를 최적화할 수 없는 경우(예: try-catch, with)에 활성화됩니다.

왜 일부 JavaScript 언어 기능만 새로운 파이프라인으로 처리하나요? 새로운 파이프라인은 JS 언어(과거 및 현재)의 전체 스펙트럼을 최적화하는 데 더 적합합니다. 이는 더 건강하고 현대적인 코드베이스이며, 저메모리 장치에서 V8 실행을 포함한 실제 사용 사례를 위해 특별히 설계되었습니다.

우리는 V8에 추가된 최신 ES.next 기능(ES.next = ES2015 및 이후에 지정된 JavaScript 기능)과 함께 Ignition/TurboFan을 사용하기 시작했으며, 성능을 계속 개선함에 따라 더 많은 기능을 이를 통해 처리할 계획입니다. 중기적으로 V8 팀은 V8의 모든 JavaScript 실행을 새로운 파이프라인으로 전환하는 것을 목표로 하고 있습니다. 그러나 Crankshaft가 여전히 JavaScript 코드를 새로운 Ignition/TurboFan 파이프라인보다 더 빠르게 실행하는 실제 사용 사례가 있는 한, 단기적으로는 모든 상황에서 V8에서 JavaScript가 가능한 한 빠르게 실행되도록 두 파이프라인을 지원할 것입니다.

그렇다면 왜 새로운 파이프라인에서 Ignition 인터프리터와 TurboFan 최적화 컴파일러를 모두 사용하는 것일까요? JavaScript를 빠르고 효율적으로 실행하려면 JavaScript 가상 머신 내부에서 실행의 세부 작업을 수행하기 위한 여러 메커니즘 또는 계층이 필요합니다. 예를 들어, 코드를 빠르게 실행하기 시작하는 첫 번째 계층이 있고, 더 오래 실행되는 코드를 위한 성능을 최대화하기 위해 '핫 함수'를 더 오래 컴파일하는 최적화 계층이 있는 것이 유용합니다.

Ignition과 TurboFan은 함께 사용할 때 가장 효과적인 V8의 두 가지 새로운 실행 계층입니다. 효율성, 단순성, 크기 고려 사항으로 인해 TurboFan은 V8의 Ignition 인터프리터가 생성한 [바이트코드](https://en.wikipedia.org/wiki/Bytecode)를 시작점으로 JavaScript 메서드를 최적화하도록 설계되었습니다. 두 구성 요소를 긴밀히 연동하도록 설계함으로써 둘 모두를 최적화할 수 있습니다. 결과적으로 5.6 버전부터 TurboFan으로 최적화될 모든 함수는 먼저 Ignition 인터프리터를 거칩니다. 이 통합 Ignition/TurboFan 파이프라인을 사용하면 과거에는 최적화할 수 없었던 기능도 활용하게 되어 최적화 가능하게 됩니다. 예를 들어, [제너레이터](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)를 Ignition 및 TurboFan에 라우팅함으로써 제너레이터 런타임 성능은 거의 3배 향상되었습니다.

Ignition 및 TurboFan을 채택하기 위한 V8의 여정에 대한 자세한 내용은 [Benedikt의 블로그 게시물](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/)을 참조하세요.

## 성능 개선

V8 v5.6은 메모리 및 성능 측면에서 여러 주요 개선 사항을 제공합니다.

### 메모리로 인한 끊김 현상

[동시 리멤버드 세트 필터링](https://bugs.chromium.org/p/chromium/issues/detail?id=648568)이 도입되었습니다. [Orinoco](/blog/orinoco)를 향한 또 하나의 진전입니다.

### ES2015 성능 대폭 개선

개발자들은 일반적으로 새로운 언어 기능을 사용할 때 호환성 문제와 성능 우려로 인해 트랜스파일러의 도움을 받습니다.

V8의 목표는 트랜스파일러와 V8의 "네이티브" ES.next 성능 간의 성능 격차를 줄여 후자의 문제를 제거하는 것입니다. 우리는 새로운 언어 기능의 성능을 트랜스파일된 ES5 등가물과 동등하게 가져오는 데 있어 큰 진전을 이루었습니다. 이 릴리스에서는 ES2015 기능의 성능이 이전 V8 릴리스보다 크게 향상되었으며, 특정 경우에는 ES2015 기능 성능이 트랜스파일된 ES5 등가물에 근접하고 있습니다.

특히 [spread](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator) 연산자는 이제 네이티브로 사용할 준비가 되었어야 합니다. 다음과 같이 작성하는 대신…

```js
// Math.max와 비슷하지만 인수가 없을 경우 -∞ 대신 0을 반환합니다.
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

…이제 이렇게 작성할 수 있습니다…

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

…그리고 유사한 성능 결과를 얻을 수 있습니다. 특히 V8 v5.6에는 다음과 같은 마이크로 벤치마크에 대한 성능 개선이 포함되어 있습니다:

- [destructuring](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [destructuring-array](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [destructuring-string](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [for-of-array](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [generator](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [spread](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [spread-generator](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [spread-literal](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

아래 차트에서 V8 v5.4와 v5.6 간의 성능 비교를 확인하세요.

![V8 v5.4 및 v5.6의 ES2015 기능 성능 비교 [SixSpeed](https://fhinkel.github.io/six-speed/)](/_img/v8-release-56/perf.png)

이것은 시작일 뿐입니다. 앞으로의 릴리스에서 따라올 더 많은 것이 있습니다!

## 언어 기능

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) 및 [`String.prototype.padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd)는 ECMAScript에 대한 최신 단계 4 추가 기능입니다. 이 라이브러리 함수들은 v5.6에 공식적으로 포함되었습니다.

:::note
**참고:** 다시 미출시 처리됨.
:::

## WebAssembly 브라우저 미리보기

V8 v5.6을 포함한 Chromium 56은 WebAssembly 브라우저 미리보기를 출시할 예정입니다. 자세한 내용은 [전용 블로그 게시물](/blog/webassembly-browser-preview)을 참조하세요.

## V8 API

우리의 [API 변경 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 주요 릴리스 이후 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 5.6 -t branch-heads/5.6`를 사용하여 V8 v5.6에서 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하고 직접 새로운 기능을 시도해 볼 수 있습니다.
