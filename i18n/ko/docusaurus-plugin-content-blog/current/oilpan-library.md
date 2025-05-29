---
title: "Oilpan 라이브러리"
author: "Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)) - 효율적이고 효과적인 파일 이동자"
avatars:
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags:
  - internals
  - memory
  - cppgc
description: "V8은 관리되는 C++ 메모리를 호스팅하기 위한 가비지 컬렉션 라이브러리인 Oilpan을 제공합니다."
tweet: "1458406645181165574"
---

이 글의 제목이 오일팬 관련 책 모음을 깊이 탐구하자는 의미로 보일 수 있으나(오일팬을 위한 구조적 기준을 생각하면 놀라울 정도로 많은 문헌이 이에 대해 다룹니다), 우리는 V8 v9.4부터 라이브러리로 호스팅되고 있는 C++ 가비지 컬렉터인 Oilpan에 대해 좀 더 자세히 살펴보려고 합니다.

<!--truncate-->
Oilpan은 [추적 기반 가비지 컬렉터](https://en.wikipedia.org/wiki/Tracing_garbage_collection)로, 마킹 단계에서 객체 그래프를 순회하여 살아 있는 객체를 결정합니다. 그리고 나서 스위핑 단계에서 죽은 객체를 회수하며, 이는 우리가 [지난 블로그에서 다뤘던](https://v8.dev/blog/high-performance-cpp-gc) 주제입니다. 두 단계 모두 실제 C++ 애플리케이션 코드와 병렬 또는 교차 실행될 수 있습니다. 힙 객체에 대한 참조 처리는 정확하며, 네이티브 스택은 보수적으로 처리됩니다. 이는 Oilpan이 힙에 있는 참조의 위치를 알고 있으나 스택에 대해서는 임의의 비트 시퀀스가 포인터를 나타낸다고 가정하여 메모리를 스캔해야 한다는 것을 의미합니다. 또한 Oilpan은 네이티브 스택 없이 가비지 컬렉션이 실행될 때 특정 객체에 대해 메모리를 조각 모음(힙 디프래그먼트)하여 지원합니다.

그럼, V8을 통해 라이브러리로 제공하는 이유는 무엇일까요?

Blink는 WebKit에서 포크되어 원래 힙 메모리를 관리하기 위해 [C++ 코드의 잘 알려진 패러다임](https://en.cppreference.com/w/cpp/memory/shared_ptr)인 참조 카운트를 사용했습니다. 참조 카운트는 메모리 관리 문제를 해결하도록 설계되었지만, 주기 문제로 인해 메모리 누수가 발생하기 쉽다는 점이 알려져 있습니다. 이러한 고유한 문제 외에도 Blink는 성능상의 이유로 참조 카운트를 생략하는 경우가 종종 있어 [사용 후 해제 문제](https://en.wikipedia.org/wiki/Dangling_pointer)를 겪기도 했습니다. Oilpan은 메모리 누수와 사용 후 해제 문제를 제거하고 프로그래밍 모델을 단순화하기 위해 초기에는 Blink용으로 특별히 개발되었습니다. 우리는 Oilpan이 모델을 단순화하고 코드를 더 안전하게 만드는 데 성공했다고 믿습니다.

Blink에서 Oilpan을 도입한 또 다른 덜 강조된 이유는 V8과 같은 기타 가비지 컬렉션 시스템과의 통합을 지원하기 위함이었으며, 이는 결국 [통합 JavaScript 및 C++ 힙](https://v8.dev/blog/tracing-js-dom)의 구현으로 구체화되었고 여기서 Oilpan은 C++ 객체 처리를 담당하였습니다[^1]. 더 많은 객체 계층이 관리되고 V8과의 통합이 강화되면서, 시간이 지남에 따라 Oilpan은 점점 더 복잡해졌고 팀은 V8의 가비지 컬렉터와 동일한 개념을 재구성하고 동일한 문제를 해결하고 있다는 것을 깨달았습니다. Blink 내에서의 통합은 통합 힙을 위한 Hello World 가비지 컬렉션 테스트를 실제로 실행하기 위해 약 30,000개의 타겟 빌드를 필요로 했습니다.

2020년 초, 우리는 Blink에서 Oilpan을 분리하고 라이브러리로 캡슐화하는 여정을 시작했습니다. 우리는 V8에 코드를 호스팅하고 가능할 경우 추상화를 재사용하며, 가비지 컬렉션 인터페이스를 정리하기로 결정했습니다. 위에서 언급한 모든 문제를 해결하는 것 외에도, [라이브러리](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/)는 다른 프로젝트가 가비지 컬렉션된 C++를 활용할 수 있도록 해줍니다. 우리는 V8 v9.4에서 라이브러리를 출시했고, Chromium M94부터 Blink에서 이를 활성화했습니다.

## 무엇이 포함되어 있나요?

V8의 나머지 부분과 마찬가지로, Oilpan은 이제 [안정된 API](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/)를 제공하며, 임베더는 정기적인 [V8 규칙](https://v8.dev/docs/api)에 의존할 수 있습니다. 예를 들어, 이는 API가 적절히 문서화되어 있다는 것을 의미하며(예: [GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17) 참조), 제거나 변경 대상이 될 경우 사전 경고 기간을 거치게 됩니다.

Oilpan의 핵심은 `cppgc` 네임스페이스에서 독립형 C++ 가비지 컬렉터로 사용할 수 있습니다. 이 설정은 기존의 V8 플랫폼을 재사용하여 관리되는 C++ 객체에 대한 힙을 생성할 수 있도록 허용합니다. 가비지 컬렉션은 작업 인프라에 통합되어 자동으로 실행되거나, 네이티브 스택을 고려하여 명시적으로 트리거될 수 있도록 구성할 수 있습니다. 이 설정은 V8 전체를 다루지 않고 관리되는 C++ 객체만을 원하는 삽입자들에게 적합하게 만든 것입니다. [hello world 프로그램](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc)을 예로 참조하십시오. PDFium은 이 설정의 삽입자로서 Oilpan의 독립형 버전을 사용해 [XFA 보안](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer)하여 더욱 동적인 PDF 콘텐츠를 허용합니다.

편리하게도, Oilpan의 핵심 테스트는 이 설정을 사용하므로 특정 가비지 컬렉션 테스트를 빌드하고 실행하는 데 몇 초밖에 걸리지 않습니다. 오늘날 기준으로 Oilpan의 핵심을 위한 [400개 이상의 유닛 테스트](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/)가 존재합니다. 이 설정은 실험을 하고 새로운 것을 시도해 볼 수 있는 작업 공간 역할도 하며, 성능에 대한 가정을 검증하는 데 사용할 수 있습니다.

Oilpan 라이브러리는 V8을 통해 통합 힙으로 실행할 때 C++ 객체를 처리하는 데도 신경 쓰며, 이를 통해 C++와 JavaScript 객체 그래프의 완전한 얽힘이 가능합니다. 이 설정은 DOM과 그 외 더 많은 C++ 메모리를 관리하기 위해 Blink에서 사용됩니다. Oilpan은 특정 liveness를 결정하기 위한 매우 구체적인 요구 사항을 가진 타입을 활용할 수 있도록 가비지 컬렉터의 핵심을 확장할 수 있는 트레이트 시스템도 제공합니다. 이렇게 Blink는 자체 수집 라이브러리를 제공할 수 있으며, 심지어 C++에서 [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)와 같은 JavaScript 스타일의 일시적인 맵을 구축할 수 있습니다. 이는 모두를 위한 권장은 아니지만, 이 시스템이 맞춤화가 필요한 경우 어떤 일을 할 수 있는지를 보여줍니다.

## 우리는 어디로 나아가고 있는가?

Oilpan 라이브러리는 우리가 이제 성능을 개선하기 위해 활용할 수 있는 견고한 기반을 제공합니다. 이전에는 Oilpan과 상호 작용하기 위해 V8의 공개 API에서 가비지 컬렉션 관련 기능을 명시해야 했지만, 이제는 직접 필요한 것을 구현할 수 있습니다. 이것은 빠른 반복을 가능하게 하고 가능한 곳에서 지름길을 사용하여 성능을 향상시킬 수도 있습니다.

우리는 또한 특정 기본 컨테이너를 Oilpan을 통해 직접 제공하여 다시 바퀴를 발명하지 않도록 잠재력을 보고 있습니다. 이는 이전에 Blink를 위해 특별히 생성된 데이터 구조의 혜택을 다른 삽입자도 누릴 수 있도록 할 것입니다.

Oilpan의 밝은 미래를 기대하면서, 기존의 [`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75) API는 더 이상 개선되지 않을 것이며, 어떤 시점에서 더 이상 사용되지 않을 수 있음을 언급하고자 합니다. 이러한 API를 사용하는 삽입자들이 이미 자체 추적 시스템을 구현했다고 가정하면, Oilpan으로의 마이그레이션은 새로 작성된 [Oilpan 힙](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91)에 C++ 객체를 할당하고 이를 V8 Isolate에 붙이는 것만큼 간단해야 합니다. [`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334) (V8로의 참조용) 및 [내부 필드](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502) (V8에서 나가는 참조용)와 같은 참조 모델링을 위한 기존 인프라는 Oilpan에서 지원됩니다.

앞으로 있을 가비지 컬렉션 개선에 대한 소식을 놓치지 마세요!

문제에 직면했거나 제안이 있으신가요? 알려주세요:

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail: [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: 구성 요소 전반의 가비지 컬렉션에 대한 더 많은 정보를 [연구 기사](https://research.google/pubs/pub48052/)에서 찾을 수 있습니다.
