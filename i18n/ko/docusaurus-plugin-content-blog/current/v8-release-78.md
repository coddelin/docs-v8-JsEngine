---
title: 'V8 릴리즈 v7.8'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 게으른 소서러'
avatars:
  - 'ingvar-stepanyan'
date: 2019-09-27
tags:
  - release
description: 'V8 v7.8는 프리로드에서의 스트리밍 컴파일, WebAssembly C API, 더 빠른 객체 비구조화 및 정규표현식 매칭, 그리고 향상된 시작 속도를 제공합니다.'
tweet: '1177600702861971459'
---
6주마다 우리는 [릴리즈 프로세스](/docs/release-process)의 일환으로 V8의 새 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 브랜치됩니다. 오늘 우리는 새로운 브랜치 [V8 버전 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8)을 발표하게 되어 기쁩니다. 이는 몇 주 내에 Chrome 78 Stable과의 협력 하에 릴리즈될 때까지 베타 상태에 있습니다. V8 v7.8은 개발자 대상의 다양한 기능들로 가득합니다. 이 포스트는 릴리즈를 예상하며 몇 가지 주요 내용을 미리 제공합니다.

<!--truncate-->
## JavaScript 성능 (크기 및 속도)

### 프리로드에서의 스크립트 스트리밍

[V8 v7.5의 스크립트 스트리밍 작업](/blog/v8-release-75#script-streaming-directly-from-network)을 기억하실 겁니다. 여기서 네트워크에서 데이터를 직접 읽도록 백그라운드 컴파일을 개선했습니다. Chrome 78에서는 프리로드 중에 스크립트 스트리밍을 활성화하고 있습니다.

이전에 `<script>` 태그가 HTML 파싱 중에 발견되면 스크립트 스트리밍이 시작되고, 파싱은 컴파일이 끝날 때까지 일시 중지되거나(일반 스크립트의 경우) 컴파일이 끝난 후 스크립트가 실행되었습니다(비동기 스크립트의 경우). 이는 다음과 같은 일반적이고 동기적인 스크립트에 대해 다음과 같은 방식으로 작동했습니다:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

…이전에는 파이프라인이 대략 다음과 같았습니다:

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

동기적 스크립트가 `document.write()`를 사용할 수 있기 때문에 우리는 `<script>` 태그를 볼 때 HTML 파싱을 중단해야 합니다. 컴파일은 `<script>` 태그가 발견되었을 때 시작되므로 HTML을 파싱하고 실제로 스크립트를 실행하는 사이에 큰 간격이 생기며, 이 동안 페이지 로드를 계속할 수 없습니다.

하지만, `<script>` 태그는 자원을 프리로드하기 위해 HTML을 스캔하는 초기 단계에서도 발견됩니다. 그래서 실제로 파이프라인은 다음과 같았습니다:

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

JavaScript 파일을 프리로드하면 결국 실행될 것이라는 것을 합리적으로 추측할 수 있습니다. 그래서 Chrome 76 이후로 우리는 스크립트를 로드할 때 동시에 컴파일을 시작하는 프리로드 스트리밍을 실험해오고 있습니다.

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

더 나아가 스크립트 로드가 끝나기 전에 컴파일을 시작할 수 있으므로 프리로드 스트리밍을 사용하는 파이프라인은 실제로 다음과 같이 보입니다:

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

이로 인해 일부 경우에는 감지 가능한 컴파일 시간(즉, `<script>` 태그 발견과 스크립트가 실행되기 시작하는 사이의 간격)을 0으로 줄일 수 있습니다. 실험에서 이 감지 가능한 컴파일 시간은 평균적으로 5–20% 감소했습니다.

가장 좋은 소식은 우리 실험 인프라 덕분에 Chrome 78에서 기본적으로 이를 활성화할 뿐만 아니라 Chrome 76 이상의 사용자에게도 이를 사용할 수 있도록 했다는 점입니다.

### 더 빠른 객체 비구조화

다음 형태의 객체 비구조화는…

```js
const {x, y} = object;
```

…다음과 거의 동일한 디슈거링한 형태입니다...

```js
const x = object.x;
const y = object.y;
```

…하지만 `object`가 `undefined` 또는 `null`인 경우에는 특별한 에러를 던져야 하는 점이 다릅니다...

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Cannot destructure property `x` of 'undefined' or 'null'.
const object = undefined; const {x, y} = object;
                                 ^
```

…undefined를 참조하려고 할 때 발생하는 일반적인 에러와는 다릅니다:

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Cannot read property 'x' of undefined
const object = undefined; object.x
                                 ^
```

이 추가적인 확인으로 인해 비구조화가 간단한 변수 할당보다 느리게 작동했으며, 이는 [Twitter를 통해 보고된 바 있습니다](https://twitter.com/mkubilayk/status/1166360933087752197).

V8 v7.8부터 객체 비구조화는 디슈거링한 변수 할당과 **동일하게 빠릅니다**(사실 두 가지 모두 같은 바이트코드를 생성합니다). 이제 명시적 `undefined`/`null` 확인 대신 `object.x`를 로드할 때 예외를 발생시키고, 그 예외가 비구조화의 결과인 경우 이를 인터셉트합니다.

### 느린 소스 위치

자바스크립트에서 바이트코드를 컴파일할 때, 소스 위치 테이블을 생성하여 바이트코드 시퀀스를 소스 코드 내의 문자 위치와 연결시킵니다. 그러나 이 정보는 예외를 상징화하거나 디버깅 및 프로파일링과 같은 개발자 작업을 수행할 때만 사용되므로, 대부분의 경우 메모리가 낭비됩니다.

이를 방지하기 위해, 이제 디버거나 프로파일러가 연결되지 않은 경우 소스 위치를 수집하지 않고 바이트코드를 컴파일합니다. 소스 위치는 실제로 스택 트레이스를 생성할 때만 수집됩니다. 예를 들어 `Error.stack`을 호출하거나 콘솔에 예외의 스택 트레이스를 출력하는 경우입니다. 이는 약간의 비용이 들 수 있습니다. 소스 위치를 생성하려면 함수가 다시 해석되고 컴파일되어야 하지만, 대부분의 웹사이트는 프로덕션 환경에서 스택 트레이스를 상징화하지 않기 때문에 성능에 눈에 띄는 영향을 받지 않습니다. 실험실 테스트에서 V8의 메모리 사용량이 1-2.5% 감소하는 것을 확인했습니다.

![AndroidGo 디바이스에서 지연 소스 위치로 인한 메모리 절약](/_img/v8-release-78/memory-savings.svg)

### 더 빠른 정규 표현식 매치 실패 처리

일반적으로 정규 표현식은 입력 문자열을 통해 앞으로 반복하며 각 위치에서 매치를 찾으려고 시도합니다. 현재 위치가 문자열의 끝에 가까워져 매치가 불가능한 지점에 도달하면, V8은 이제 (대부분의 경우) 새로운 매치의 시작점을 찾으려는 시도를 멈추고 빠르게 실패를 반환합니다. 이 최적화는 컴파일된 정규 표현식과 해석된 정규 표현식 모두에 적용되며, 매치를 찾지 못한 실패가 빈번하고 성공적인 매치의 최소 길이가 평균 입력 문자열 길이에 비해 상대적으로 큰 작업 부하에서 속도 개선을 제공합니다.

JetStream 2의 UniPoker 테스트에서 이 작업에서 영감을 얻어, V8 v7.8은 모든 반복 평균 점수에서 20% 개선을 제공합니다.

## WebAssembly

### WebAssembly C/C++ API

v7.8부터, V8의 [Wasm C/C++ API](https://github.com/WebAssembly/wasm-c-api) 구현은 실험적 상태에서 공식적으로 지원되는 상태로 업그레이드되었습니다. 이를 통해 C/C++ 애플리케이션에서 JavaScript를 사용하지 않고 WebAssembly 실행 엔진으로서 V8의 특별 빌드를 사용할 수 있습니다. 자세한 내용과 지침은 [문서](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit)를 참조하세요.

### 향상된 시작 시간

WebAssembly에서 JavaScript 함수를 호출하거나 JavaScript에서 WebAssembly 함수를 호출할 때, 함수의 인수를 서로 다른 표현으로 변환하도록 하는 래퍼 코드를 실행해야 합니다. 이러한 래퍼를 생성하는 비용이 꽤 클 수 있습니다. [Epic ZenGarden 데모](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)에서는 래퍼 컴파일이 18코어 Xeon 머신에서 모듈 시작 시간(컴파일 + 인스턴스화)의 약 20%를 차지합니다.

이번 릴리스에서는 다중 코어 머신에서 백그라운드 스레드를 더 잘 활용하여 상황을 개선했습니다. 최근 [함수 컴파일 확장](/blog/v8-release-77#wasm-compilation)을 위한 노력을 기반으로 하여 이러한 새로운 비동기 파이프라인에 래퍼 컴파일을 통합했습니다. 같은 머신에서 이제 Epic ZenGarden 데모 시작 시간의 약 8%가 래퍼 컴파일에 해당합니다.

## V8 API

`git log branch-heads/7.7..branch-heads/7.8 include/v8.h`를 사용하여 API 변경 사항 목록을 확인하세요.

V8을 [활성화된 체크아웃 상태](/docs/source-code#using-git)로 사용하는 개발자는 `git checkout -b 7.8 -t branch-heads/7.8`을 사용하여 V8 v7.8의 새로운 기능을 실험할 수 있습니다. 또한 [Chrome의 베타 채널에 가입](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능을 직접 경험할 수 있습니다.
