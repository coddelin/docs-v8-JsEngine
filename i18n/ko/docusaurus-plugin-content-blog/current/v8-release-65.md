---
title: 'V8 릴리스 v6.5'
author: 'V8 팀'
date: 2018-02-01 13:33:37
tags:
  - 릴리스
description: 'V8 v6.5는 스트리밍 WebAssembly 컴파일을 지원하며 새로운 “신뢰할 수 없는 코드 모드”를 포함합니다.'
tweet: '959174292406640640'
---
매 6주마다, 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 크롬 베타 마일스톤 직전에 V8 Git 마스터에서 파생됩니다. 오늘 우리는 우리의 최신 브랜치인 [V8 버전 6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5)를 발표하게 되어 기쁩니다. 이는 몇 주 후 Chrome 65 Stable과의 조정에 따라 출시될 때까지 베타 상태에 있습니다. V8 v6.5는 다양한 개발자 중심의 기능으로 가득합니다. 이 게시물은 출시를 기대하며 몇 가지 주요 사항을 미리 제공합니다.

<!--truncate-->
## 신뢰할 수 없는 코드 모드

Spectre로 불리는 최신 추측적 사이드 채널 공격에 대응하기 위해, V8은 [신뢰할 수 없는 코드 모드](/docs/untrusted-code-mitigations)를 도입했습니다. V8을 포함하는 경우, 애플리케이션이 사용자 생성 코드를 처리하는 경우라면 이 모드를 활용하는 것을 고려하십시오. 이 모드는 Chrome을 포함하여 기본적으로 활성화되어 있음을 참고하시기 바랍니다.

## WebAssembly 코드의 스트리밍 컴파일

WebAssembly API는 `fetch()` API와 조합하여 [스트리밍 컴파일](https://developers.google.com/web/updates/2018/04/loading-wasm)을 지원하는 특별한 함수를 제공합니다:

```js
const module = await WebAssembly.compileStreaming(fetch('foo.wasm'));
```

이 API는 V8 v6.1 및 Chrome 61 이후로 사용할 수 있었지만 초기 구현에서는 실제로 스트리밍 컴파일을 사용하지 않았습니다. 그러나 V8 v6.5와 Chrome 65에서 우리는 이 API를 활용하여 WebAssembly 모듈을 다운로드 중에도 이미 컴파일합니다. 한 함수의 모든 바이트를 다운로드하는 즉시, 우리는 그 함수를 백그라운드 스레드로 전달하여 컴파일합니다.

우리의 측정 결과에 따르면 이 API를 사용하면 Chrome 65에서 WebAssembly 컴파일이 고급 기기에서 최대 50 Mbit/s 다운로드 속도를 유지할 수 있습니다. 즉, 50 Mbit/s로 WebAssembly 코드를 다운로드하면 해당 코드의 컴파일은 다운로드가 완료되자마자 완료됩니다.

아래 그래프에서는 67 MB 크기와 약 190,000개의 함수로 구성된 WebAssembly 모듈을 다운로드하고 컴파일하는 데 걸리는 시간을 측정합니다. 우리는 25 Mbit/s, 50 Mbit/s, 100 Mbit/s 다운로드 속도로 측정합니다.

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

다운로드 시간이 WebAssembly 모듈 컴파일 시간보다 긴 경우(예: 위 그래프에서 25 Mbit/s 및 50 Mbit/s) `WebAssembly.compileStreaming()`은 마지막 바이트가 다운로드된 직후 거의 즉시 컴파일을 완료합니다.

다운로드 시간이 컴파일 시간보다 짧은 경우, `WebAssembly.compileStreaming()`은 모듈 다운로드 없이 WebAssembly 모듈을 컴파일하는 데 걸리는 시간과 거의 같은 시간이 걸립니다.

## 속도

우리는 JavaScript 기본 내부 함수를 더 빠르게 처리하는 경로를 확장하는 작업을 계속 진행했으며, '비최적화 루프'라는 치명적인 상황을 탐지하고 방지하기 위한 메커니즘을 추가했습니다. 이는 최적화된 코드가 비최적화되었을 때, _무엇이 잘못되었는지_ 배울 방법이 없을 때 발생합니다. 이러한 상황에서 TurboFan은 최적화를 계속 시도하다가 약 30번 시도 후 포기합니다. 예를 들어, 두 번째 순서의 배열 기본 내부 함수의 콜백 함수에서 배열의 모양을 변경하는 경우 발생할 수 있습니다. 예를 들어 배열의 `length`를 변경하는 경우 - V8 v6.5에서는 해당 상황이 발생할 때 이를 기록하고, 그 위치에서 해당 배열 기본 내부 함수를 미래 최적화 시도에서 인라인하지 않습니다.

우리는 또한 호출할 함수의 로드를 호출 자체와 나누는 부작용 때문에 이전에는 제외되었던 많은 기본 내부 함수를 인라인하여 빠른 경로를 확장했습니다. 그리고 `String.prototype.indexOf`는 [함수 호출에서 10배 성능 개선](https://bugs.chromium.org/p/v8/issues/detail?id=6270)을 얻었습니다.

V8 v6.4에서는 `Array.prototype.forEach`, `Array.prototype.map`, 그리고 `Array.prototype.filter`에 대한 지원을 인라인했습니다. V8 v6.5에서는 다음을 위한 인라인 지원을 추가했습니다:

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

또한 우리는 이러한 모든 기본 내부 함수에서 빠른 경로를 확장했습니다. 처음에는 부동 소수점 숫자가 포함된 배열을 보았을 때, 또는 (더 많은 경우에) 배열에 [“홀”이 있으면](/blog/elements-kinds) 탐색을 취소했습니다. 예시: `[3, 4.5, , 6]`. 이제, 우리는 `find`와 `findIndex`를 제외하곤 부동 소수점 배열의 모든 공백 배열을 처리합니다. 이는 공백을 `undefined`로 변환해야 하는 규격 요구사항이 우리의 노력에 장애물을 던지기 때문입니다 (_지금은…!_).

다음 이미지는 V8 v6.4에 비해 인라인 빌트인에서의 개선 델타를 보여줍니다. 이는 정수 배열, 더블 배열, 그리고 구멍이 있는 더블 배열로 나뉘어 있습니다. 시간은 밀리초 단위로 표시됩니다.

![V8 v6.4 이후의 성능 향상](/_img/v8-release-65/performance-improvements.svg)

## V8 API

`git log branch-heads/6.4..branch-heads/6.5 include/v8.h` 명령어를 사용하여 API 변경 사항 목록을 확인하세요.

[활성화된 V8 체크아웃](/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 6.5 -t branch-heads/6.5`를 사용하여 V8 v6.5의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 베타 채널에 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능을 직접 사용해볼 수 있습니다.
