---
title: &apos;V8 릴리즈 v6.9&apos;
author: &apos;V8 팀&apos;
date: 2018-08-07 13:33:37
tags:
  - 릴리즈
description: &apos;V8 v6.9는 내장 빌트인 기능을 통해 메모리 사용량 감소, Liftoff을 통한 WebAssembly의 빠른 시작, 향상된 DataView 및 WeakMap 성능 등 다양한 기능을 제공합니다!&apos;
tweet: &apos;1026825606003150848&apos;
---
6주마다, 우리는 [릴리즈 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치 [V8 버전 6.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9)를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 69 Stable과 함께 출시되기 전까지 베타 상태입니다. V8 v6.9는 개발자들에게 유익한 기능으로 가득합니다. 이 게시물은 출시를 앞두고 주요 기능들을 미리 보여줍니다.

<!--truncate-->
## 내장 빌트인을 통한 메모리 절약

V8은 광범위한 내장 함수 라이브러리를 제공합니다. 예를 들어 `Array.prototype.sort` 및 `RegExp.prototype.exec`와 같은 내장 객체 메서드뿐만 아니라 다양한 내부 기능이 있습니다. 이들 함수의 생성 시간이 오래 걸리기 때문에, 빌트인 함수들은 빌드 시간에 컴파일되어 [스냅샷](/blog/custom-startup-snapshots)으로 직렬화되며, 실행 시 디직렬화되어 초기 JavaScript 힙 상태를 생성합니다.

현재 내장 함수는 각 Isolate(Chrome에서 Isolate는 브라우저 탭에 해당)에 700 KB를 소비합니다. 이는 상당히 낭비적이며, 우리는 이 오버헤드를 줄이기 위한 작업을 시작했습니다. V8 v6.4에서는 [지연 디직렬화](/blog/lazy-deserialization)를 제공하여, 각 Isolate가 실제로 필요한 내장 함수만 지불하도록 했습니다(각 Isolate는 여전히 자체 복사본을 가집니다).

[내장 빌트인](/blog/embedded-builtins)은 한 단계 더 나아갑니다. 내장 빌트인은 모든 Isolate에서 공유되며, JavaScript 힙에 복사되는 대신 바이너리 자체에 내장됩니다. 이로 인해 실행 중인 Isolate 수에 관계없이 빌트인이 메모리에 한 번만 존재하며, 이는 기본적으로 활성화된 [사이트 격리](https://developers.google.com/web/updates/2018/07/site-isolation)에 매우 유용합니다. 내장 빌트인을 사용하여 x64 플랫폼 기준으로 상위 10k 웹사이트에서 V8 힙 크기가 평균 _9% 감소_하는 것을 확인했습니다. 이러한 사이트 중 50%는 최소 1.2 MB, 30%는 최소 2.1 MB, 10%는 3.7 MB 이상의 메모리를 절약합니다.

V8 v6.9는 x64 플랫폼에서 내장 빌트인 지원과 함께 제공됩니다. 다른 플랫폼도 곧 다가오는 릴리즈에서 지원될 예정입니다. 자세한 내용은 [관련 블로그 게시물](/blog/embedded-builtins)을 참조하세요.

## 성능

### Liftoff, WebAssembly의 새로운 1단계 컴파일러

WebAssembly는 대형 웹사이트(WebAssembly 모듈이 포함된 Google Earth 및 AutoCAD 등의 사이트)의 훨씬 빠른 시작을 위해 새로운 기본 컴파일러를 제공합니다. 하드웨어에 따라 10배 이상의 속도 향상을 확인할 수 있습니다. 자세한 내용은 [상세한 Liftoff 블로그 게시물](/blog/liftoff)을 참조하세요.

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Liftoff, WebAssembly의 기본 컴파일러를 위한 V8의 로고</figcaption>
</figure>

### 더 빠른 `DataView` 작업

[`DataView`](https://tc39.es/ecma262/#sec-dataview-objects) 메서드는 이제 V8 Torque로 재구현되어 이전 실행기 구현 대비 C++ 호출 비용을 절약합니다. 또한 JavaScript 코드를 TurboFan에서 컴파일할 때 `DataView` 메서드 호출을 인라인화하여 핫 코드에 대해 더 나은 최고 성능을 제공합니다. 이제 `DataView`를 사용하는 것이 `TypedArray`를 사용하는 만큼 효율적이며, 성능이 중요한 상황에서 `DataView`가 사용 가능한 선택지가 되었습니다. 곧 다가올 `DataView`에 대한 블로그 게시물에서 자세히 다룰 예정이니 기대해주세요!

### 가비지 컬렉션 동안 더 빠른 `WeakMap` 처리

V8 v6.9는 `WeakMap` 처리를 개선하여 Mark-Compact 가비지 컬렉션 일시 중지 시간을 줄였습니다. 동시 및 증가 마킹이 이제 `WeakMap`을 처리할 수 있으며, 이전에는 이 모든 작업이 Mark-Compact GC의 마지막 원자 중지 시간 동안 수행되었습니다. 모든 작업을 중지 시간 외로 이동할 수는 없지만, GC는 이제 일시 중지 시간을 더욱 줄이기 위해 병렬로 작업을 더 많이 수행합니다. 이러한 최적화는 [웹 도구 벤치마크](https://github.com/v8/web-tooling-benchmark)에서 Mark-Compact GC의 평균 일시 중지 시간을 사실상 절반으로 줄였습니다.

`WeakMap` 처리에는 고정점 반복 알고리즘이 사용되며, 특정 경우에는 이 알고리즘이 이차 시간 복잡도로 악화될 수 있습니다. 새로운 릴리스에서는 GC가 일정 횟수의 반복 내에 완료되지 않을 경우 선형 시간 안에 작업이 끝나도록 보장하는 다른 알고리즘으로 전환할 수 있습니다. 이전에는 상대적으로 작은 힙에서도 몇 초가 걸리는 최악의 사례를 생성할 수 있었던 반면, 선형 알고리즘은 몇 밀리초 내에 완료됩니다.

## JavaScript 언어 기능

V8 v6.9는 [`Array.prototype.flat` 및 `Array.prototype.flatMap`](/features/array-flat-flatmap)을 지원합니다.

`Array.prototype.flat`은 지정된 `depth`까지 주어진 배열을 재귀적으로 평탄화하며, 기본값은 `1`입니다:

```js
// 한 레벨 평탄화:
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// 배열에 중첩된 배열이 더 이상 없을 때까지 재귀적으로 평탄화:
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap`은 `Array.prototype.map`과 비슷하지만 결과를 새로운 배열로 평탄화합니다.

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

자세한 내용은 [우리의 `Array.prototype.{flat,flatMap}` 설명서](/features/array-flat-flatmap)를 참조하세요.

## V8 API

`git log branch-heads/6.8..branch-heads/6.9 include/v8.h`를 사용하여 API 변경의 목록을 확인하세요.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가지고 있는 개발자는 `git checkout -b 6.9 -t branch-heads/6.9`를 사용하여 V8 v6.9의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 구독하여 새로운 기능을 직접 체험할 수 있습니다.
