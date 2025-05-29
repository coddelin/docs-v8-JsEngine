---
title: 'V8 릴리스 v8.3'
author: '[Victor Gomes](https://twitter.com/VictorBFG), 집에서 안전하게 작업 중'
avatars:
 - 'victor-gomes'
date: 2020-05-04
tags:
 - release
description: 'V8 v8.3는 더 빠른 ArrayBuffers, 더 큰 Wasm 메모리 및 사용 중단된 API를 제공합니다.'
tweet: '1257333120115847171'
---

6주마다 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 직전의 V8의 Git 마스터에서 브랜치됩니다. 오늘은 최신 브랜치인 [V8 버전 8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3)을 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 83 안정 버전과의 조정에 따라 정식 릴리스되기 전까지 베타 상태에 있습니다. V8 v8.3에는 개발자 중심의 다양한 기능이 추가되었습니다. 이 게시물에서는 릴리스를 앞두고 몇 가지 주요 내용을 미리 살펴봅니다.

<!--truncate-->
## 성능

### 가비지 수집기에서 더 빠른 `ArrayBuffer` 추적

`ArrayBuffer`의 백킹 스토어는 V8의 힙 외부에서 임베더가 제공하는 `ArrayBuffer::Allocator`를 사용하여 할당됩니다. 이러한 백킹 스토어는 해당 `ArrayBuffer` 객체가 가비지 수집기에 의해 회수될 때 해제되어야 합니다. V8 v8.3에는 `ArrayBuffer`와 그 백킹 스토어를 추적하는 새 메커니즘이 도입되어 가비지 수집기가 애플리케이션과 동시에 백킹 스토어를 순회하고 해제할 수 있게 되었습니다. 자세한 내용은 [디자인 문서](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e)를 참조하세요. 이 메커니즘은 `ArrayBuffer`가 많은 작업 부하에서 총 GC 일시 중지 시간을 50% 단축했습니다.

### 더 큰 Wasm 메모리

[WebAssembly 사양](https://webassembly.github.io/spec/js-api/index.html#limits)의 업데이트에 따라, V8 v8.3은 최대 4GB 크기의 메모리를 요청할 수 있게 되어, 더 많은 메모리를 사용하는 사례가 V8 기반 플랫폼으로 가져올 수 있습니다. 사용자 시스템에서 이 정도의 메모리를 항상 사용할 수 있는 것은 아니므로, 메모리를 더 작은 크기로 생성하고 필요에 따라 증가시키며, 증가 실패를 우아하게 처리하는 것을 권장합니다.

## 수정사항

### 프로토타입 체인에 형식화된 배열이 있는 객체에 값 저장

JavaScript 사양에 따르면, 특정 키에 값을 저장할 때 프로토타입 체인을 조회하여 키가 이미 프로토타입에 있는지 확인해야 합니다. 대부분의 경우 이러한 키는 프로토타입 체인에 존재하지 않으므로 V8은 안전한 경우 이러한 프로토타입 체인 순회를 피하기 위해 빠른 조회 핸들러를 설치합니다.

하지만 최근에 V8이 이 빠른 조회 핸들러를 잘못 설치하여 잘못된 동작을 초래하는 특정 상황이 확인되었습니다. 프로토타입 체인에 `TypedArray`가 있을 경우, `TypedArray`의 범위를 벗어난(OOB) 키에 대한 모든 저장 동작은 무시되어야 합니다. 예를 들어, 아래 사례에서 `v[2]`는 `v`에 속성을 추가해서는 안 되며, 이후 읽기는 undefined를 반환해야 합니다.

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // undefined를 반환해야 함
```

V8의 빠른 조회 핸들러는 이 경우를 처리하지 못하며, 위 예제에서는 대신 `123`을 반환했습니다. V8 v8.3은 프로토타입 체인에 `TypedArray`가 있는 경우 빠른 조회 핸들러를 사용하지 않도록 하여 이 문제를 해결했습니다. 이는 일반적인 경우가 아니므로, 벤치마크에서 성능 저하가 관찰되지 않았습니다.

## V8 API

### 실험적 약한 참조 및 FinalizationRegistry API 사용 중단

다음과 같은 실험적인 약한 참조 관련 API는 사용 중단되었습니다:

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry`(기존 `FinalizationGroup`)는 [자바스크립트 약한 참조 제안](https://v8.dev/features/weak-references)의 일부로, 자바스크립트 프로그래머가 파이널라이저를 등록할 수 있는 방법을 제공합니다. 이 API는 임베더가 `FinalizationRegistry` 정리 작업을 예약하고 실행하는 데 사용되었으나, 더 이상 필요하지 않기 때문에 사용 중단되었습니다. 이제 `FinalizationRegistry` 정리 작업은 V8이 임베더의 `v8::Platform`이 제공하는 포그라운드 작업 실행자를 사용하여 자동으로 예약되며 추가적인 임베더 코드를 요구하지 않습니다.

### 기타 API 변경사항

API 변경 사항 목록을 보려면 `git log branch-heads/8.1..branch-heads/8.3 include/v8.h`를 사용하세요.

활성 V8 체크아웃을 가진 개발자는 `git checkout -b 8.3 -t branch-heads/8.3`를 사용하여 V8 v8.3의 새 기능을 실험할 수 있습니다. 또는 [Chrome의 Beta 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 직접 새 기능을 곧 시도할 수 있습니다.
