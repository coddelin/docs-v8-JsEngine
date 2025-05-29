---
title: "V8 릴리스 v7.9"
author: "Santiago Aboy Solanes, 포인터 압축 전문가"
avatars:
  - "santiago-aboy-solanes"
date: 2019-11-20
tags:
  - release
description: "V8 v7.9는 Double ⇒ Tagged 전환에 대한 폐기 제거, 내장 함수에서 API getter 처리, OSR 캐싱, 그리고 여러 코드 공간을 지원하는 Wasm 등 다양한 기능을 제공합니다."
tweet: "1197187184304050176"
---
6주마다, 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치 [V8 버전 7.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.9)를 발표하게 되어 기쁩니다. 이 브랜치는 몇 주 후 Chrome 79 Stable과 함께 릴리스될 때까지 베타 상태입니다. V8 v7.9는 개발자에게 유용한 다양한 기능을 제공합니다. 이 글에서는 주요 하이라이트 중 일부를 미리 살펴봅니다.

<!--truncate-->
## 성능 (크기 & 속도)

### Double ⇒ Tagged 전환에 대한 폐기 제거

이전 블로그 게시글에서 V8이 객체의 구조에서 필드가 표현되는 방식을 추적한다는 것을 기억할 것입니다. 필드 표현이 변경되면 현재 객체의 구조는 '폐기' 처리되고 새 필드 표현을 가진 새로운 구조가 생성됩니다.

한 가지 예외는 이전 필드 값이 새로운 표현과 호환이 보장되는 경우입니다. 이러한 경우 객체 구조에서 새로운 표현을 제자리에 넣어도 여전히 이전 객체의 필드 값에 대해 작동합니다. V8 v7.6에서 우리는 Smi ⇒ Tagged 그리고 HeapObject ⇒ Tagged 전환에 대한 이러한 제자리 표현 변경을 활성화했지만, MutableHeapNumber 최적화 때문에 Double ⇒ Tagged는 피할 수 없었습니다.

V8 v7.9에서 우리는 MutableHeapNumber를 제거하고 대신 Double 표현 필드에 속할 때 묵시적으로 변경 가능한 HeapNumbers를 사용합니다. 이는 HeapNumbers 처리에 조금 더 신중해야 하지만, HeapNumbers는 Tagged 표현과 호환되므로 Double ⇒ Tagged 또한 폐기를 피할 수 있습니다.

이 비교적 간단한 변경으로 Speedometer AngularJS 점수가 4% 향상되었습니다.

![Speedometer AngularJS 점수 향상](/_img/v8-release-79/speedometer-angularjs.svg)

### 내장 함수에서 API getter 처리

이전에는 V8이 포함 API(예: Blink)에 의해 정의된 getter를 처리할 때 항상 C++ 런타임으로 누락되곤 했습니다. 여기에는 `Node.nodeType`, `Node.nodeName` 등 HTML 사양에서 정의된 getter가 포함되었습니다.

V8은 getter를 로드하기 위해 내장 함수에서 전체 프로토타입 체인을 탐색한 뒤, getter가 API에 의해 정의되었다는 것을 인식하면 런타임으로 벗어납니다. 그런 다음 C++ 런타임에서 getter를 실행하기 전에 다시 프로토타입 체인을 따라 많은 작업을 중복합니다.

일반적으로, [인라인 캐싱(IC) 메커니즘](https://mathiasbynens.be/notes/shapes-ics)으로 인해 이는 완화될 수 있습니다. V8은 C++ 런타임에서 첫 번째 누락 후 IC 핸들러를 설치합니다. 하지만 새로운 [지연 피드백 할당](https://v8.dev/blog/v8-release-77#lazy-feedback-allocation)으로 인해, V8은 함수가 일정 시간 실행된 후에야 IC 핸들러를 설치합니다.

이제 V8 v7.9에서는 IC 핸들러가 설치되지 않았더라도 C++ 런타임으로 누락되지 않고 이러한 getter를 내장 함수에서 처리합니다. 이는 API getter를 직접 호출할 수 있는 특별한 API 스텁을 활용함으로써 가능합니다. 이 결과로 Speedometer의 Backbone 및 jQuery 벤치마크에서 IC 런타임에 소비된 시간이 12% 감소했습니다.

![Speedometer Backbone 및 jQuery 향상](/_img/v8-release-79/speedometer.svg)

### OSR 캐싱

V8이 특정 함수가 뜨거운 코드(자주 실행되는)의 일부라는 것을 확인하면 다음 호출 시 최적화를 위해 이를 표시합니다. 함수가 다시 실행되면 V8은 최적화 컴파일러를 사용하여 함수를 컴파일하고 이후 호출부터 최적화된 코드를 사용하기 시작합니다. 그러나 긴 루프를 실행하는 함수에 대해서는 이것만으로는 충분하지 않습니다. V8은 온스택 대체(OSR)라는 기술을 사용하여 현재 실행 중인 함수에 최적화된 코드를 설치합니다. 이를 통해 함수의 첫 번째 실행 동안에도 뜨거운 루프에서 최적화된 코드를 사용하기 시작할 수 있게 됩니다.

함수가 두 번째로 실행되면 OSR이 다시 발생할 가능성이 매우 높습니다. V8 v7.9 이전에는 OSR을 위해 함수를 다시 최적화해야 했지만, v7.9부터 우리는 OSR 캐싱을 추가하여 OSR 교체용 최적화된 코드를 보존하고, OSR 함수에서 진입점으로 사용된 루프 헤더를 키로 사용합니다. 이를 통해 몇 가지 최고 성능 벤치마크의 성능이 5–18% 향상되었습니다.

![OSR 캐싱 향상](/_img/v8-release-79/osr-caching.svg)

## WebAssembly

### 여러 코드 공간 지원

지금까지 각 WebAssembly 모듈은 64비트 아키텍처에서 정확히 하나의 코드 공간으로 구성되었으며, 이는 모듈 생성 시 예약되었습니다. 이를 통해 모듈 내에서 가까운 호출을 사용할 수 있었지만, arm64에서는 128MB의 코드 공간으로 제한되었고, x64에서는 처음부터 1GB를 예약해야 했습니다.

v7.9에서는 V8이 64비트 아키텍처에서 여러 코드 공간을 지원하게 되었습니다. 이를 통해 필요한 코드 공간만 예약하고, 필요시 더 많은 코드 공간을 추가할 수 있게 되었습니다. 가까운 점프로 호출이 불가능한 경우 코드 공간 간 호출에는 먼 점프가 사용됩니다. 이전에는 프로세스당 약 1000개의 WebAssembly 모듈만 지원했으나, 이제는 실제 메모리 용량에 따라 최대 수백만 개의 모듈을 지원합니다.

## V8 API

API 변경 사항 목록을 보려면 `git log branch-heads/7.8..branch-heads/7.9 include/v8.h`를 사용하세요.

활성 V8 체크아웃을 사용하는 개발자는 `git checkout -b 7.9 -t branch-heads/7.9`를 사용하여 V8 v7.9의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널 구독](https://www.google.com/chrome/browser/beta.html)을 통해 곧 새로운 기능을 직접 사용해 볼 수 있습니다.
