---
title: 'V8는 더욱 빠르고 안전해졌습니다!'
author: '[Victor Gomes](https://twitter.com/VictorBFG), 글뤼바인의 전문가'
avatars:
  - victor-gomes
date: 2023-12-14
tags:
  - JavaScript
  - WebAssembly
  - 보안
  - 벤치마크
description: "V8의 2023년 놀라운 성과"
tweet: ''
---

V8의 짜릿한 세계에 오신 것을 환영합니다. 여기서는 속도가 단순한 기능이 아닌 삶의 방식입니다. 2023년을 보내며 V8이 올해 이룩한 놀라운 성과를 축하할 때입니다.

혁신적인 성능 최적화를 통해 V8은 웹의 끊임없이 진화하는 환경에서 가능한 것의 경계를 계속해서 넓혀가고 있습니다. 우리는 새로운 중간 단계 컴파일러를 도입하고, 최고 단계 컴파일러 인프라, 런타임 및 가비지 컬렉터에 여러 가지 개선을 적용하여 전반적으로 상당한 속도 향상을 이루었습니다.

<!--truncate-->
성능 개선 외에도 JavaScript와 WebAssembly에 대하여 흥미로운 새 기능들을 적용하였습니다. 또한 [WebAssembly 가비지 컬렉션(WasmGC)](https://v8.dev/blog/wasm-gc-porting)를 이용하여 가비지 컬렉션을 사용하는 프로그래밍 언어를 웹에 효율적으로 도입하는 새로운 접근 방식을 도입했습니다.

하지만 우리의 탁월함에 대한 헌신은 여기서 멈추지 않습니다 – 우리는 안전성을 우선으로 생각해왔습니다. 우리는 샌드박스 인프라를 개선하고 [Control-flow Integrity (CFI)](https://en.wikipedia.org/wiki/Control-flow_integrity)를 V8에 도입하여 사용자에게 더 안전한 환경을 제공합니다.

아래는 올해 주요 하이라이트를 요약한 내역입니다.

# Maglev: 새로운 중간 단계 최적화 컴파일러

우리는 기존의 [Sparkplug](https://v8.dev/blog/sparkplug)와 [TurboFan](https://v8.dev/docs/turbofan) 컴파일러 사이에 [Maglev](https://v8.dev/blog/maglev)라는 새로운 최적화 컴파일러를 도입했습니다. 이 컴파일러는 고속 최적화 컴파일러로 전략적으로 위치하며, 놀라운 속도로 최적화된 코드를 효율적으로 생성합니다. 이 컴파일러는 기본 비최적화 컴파일러 Sparkplug보다 약 20배 느리게 코드를 생성하지만, 상위 단계 TurboFan보다 10배에서 100배 빠르게 코드를 생성합니다. Maglev을 통해 큰 성능 개선을 관찰했으며, [JetStream](https://browserbench.org/JetStream2.1/)에서는 8.2%, [Speedometer](https://browserbench.org/Speedometer2.1/)에서는 6% 증가를 보였습니다. Maglev의 빠른 컴파일 속도와 TurboFan에 대한 의존도 감소로 인해 Speedometer 실행에서 V8의 전체 소비 에너지가 10% 절감되었습니다. [완전히 완성된 상태는 아니지만](https://en.m.wikipedia.org/wiki/Full-employment_theorem), 현재 상태만으로도 Chrome 117에 출시하기에 충분합니다. 자세한 내용은 우리의 [블로그 게시글](https://v8.dev/blog/maglev)을 참조하세요.

# Turboshaft: 상위 단계 최적화 컴파일러를 위한 새로운 아키텍처

Maglev은 개선된 컴파일러 기술에 대한 우리의 유일한 투자가 아니었습니다. 우리는 또한 상위 단계 최적화 컴파일러 TurboFan의 새로운 내부 아키텍처인 Turboshaft를 도입하여 새로운 최적화를 더 쉽게 확장하고 컴파일 속도를 더욱 빠르게 만들었습니다. Chrome 120부터 CPU 비의존적 백엔드 단계가 모두 Turbofan 대신 Turboshaft를 사용하고 있으며, 이전보다 약 두 배 빠르게 컴파일됩니다. 이는 에너지를 절약하고 향후 더 흥미로운 성능 향상을 위한 길을 열어갈 것입니다. 업데이트를 주목하세요!

# 빠른 HTML 파서

우리는 HTML 파싱이 벤치마크 시간의 상당 부분을 소비하고 있음을 관찰했습니다. 이는 V8에 대한 직접적인 개선은 아니지만, 우리는 성능 최적화에 대한 전문성을 활용하여 Blink에 빠른 HTML 파서를 추가하는 데 주도적으로 나섰습니다. 이러한 변경 사항은 Speedometer 점수가 상당히 3.4% 증가하는 결과를 가져왔습니다. Chrome에 긍정적인 영향을 미친 후, WebKit 프로젝트는 [그들의 저장소](https://github.com/WebKit/WebKit/pull/9926)에 즉시 이러한 변경 사항을 통합했습니다. 우리는 더 빠른 웹을 구현하기 위한 공동의 목표에 기여한 것을 자랑스럽게 생각합니다!

# 빠른 DOM 할당

우리는 또한 DOM 측면에 적극적으로 투자해왔습니다. DOM 객체를 할당하기 위한 메모리 할당 전략인 [Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md)에 상당한 최적화를 적용했습니다. 메모리 페이지 풀을 추가하여 커널로의 왕복 비용을 현저히 줄였습니다. Oilpan은 압축 및 비압축 포인터를 모두 지원하며, Blink에서 높은 트래픽 필드를 압축하지 않도록 구현하였습니다. 탈압축이 얼마나 빈번하게 수행되는지를 고려할 때 이는 성능에 널리 영향을 미쳤습니다. 또한, 할당자가 빠른 속도를 알고 자주 할당되는 클래스들을 Oilpan으로 전환하였으며, 이는 할당 작업을 3배 빠르게 만들어 DOM 중심 벤치마크(예: Speedometer)에 상당한 개선을 보였습니다.

# 새로운 JavaScript 기능

JavaScript는 새로 표준화된 기능과 함께 계속 발전하고 있으며, 올해도 예외는 아니었습니다. 우리는 [Resizable ArrayBuffers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers)와 [ArrayBuffer transfer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer), 문자열 [`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) 및 [`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed), [RegExp `v` 플래그](https://v8.dev/features/regexp-v-flag) (유니코드 집합 표기법), [`JSON.parse` with source](https://github.com/tc39/proposal-json-parse-with-source), [배열 그룹화](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy), [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) 및 [`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync)을 배포했습니다. 안타깝게도 [iterator helpers](https://github.com/tc39/proposal-iterator-helpers)를 웹 비호환성을 발견한 후 배포하지 못했지만, TC39와 문제를 해결하기 위해 협력하며 곧 다시 배포할 예정입니다. 마지막으로, 우리는 `let` 및 `const` 바인딩의 불필요한 임시 데드 존 점검을 생략하여 [ES6+ JS 코드의 속도를 향상시켰습니다](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing).

# WebAssembly 업데이트

올해 Wasm에 많은 새로운 기능과 성능 개선이 이루어졌습니다. 우리는 [다중 메모리](https://github.com/WebAssembly/multi-memory), [테일 호출](https://github.com/WebAssembly/tail-call) (더 많은 세부 정보를 보려면 [블로그 게시물](https://v8.dev/blog/wasm-tail-call)을 참조) 및 [완화된 SIMD](https://github.com/WebAssembly/relaxed-simd)를 지원하여 차세대 성능을 발휘했습니다. 우리는 메모리를 많이 사용하는 애플리케이션을 위해 [memory64](https://github.com/WebAssembly/memory64)에 대한 구현을 완료했으며, 배포를 위해 [4단계에 도달하기를](https://github.com/WebAssembly/memory64/issues/43) 기다리고 있습니다. 이전 형식을 계속 지원하는 한편 [예외 처리 제안](https://github.com/WebAssembly/exception-handling)의 최신 업데이트를 통합하였습니다. 그리고 우리는 [JSPI](https://v8.dev/blog/jspi)에 지속적으로 투자하여 [웹의 또 다른 큰 애플리케이션 부류를 가능하게](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m) 했습니다. 내년을 기대해 주세요!

# WebAssembly 가비지 컬렉션

새로운 애플리케이션 부류를 웹에 도입하는 이야기가 나왔으니, 몇 년간의 [제안](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md) 표준화 작업 및 [구현](https://bugs.chromium.org/p/v8/issues/detail?id=7748) 이후 결국 WebAssembly 가비지 컬렉션(WasmGC)을 배포한 것도 언급해야 합니다. Wasm은 이제 객체와 배열을 V8의 기존 가비지 수집기로 관리 가능한 방식으로 할당하는 내장 방식을 갖추게 되었습니다. 이를 통해 Java, Kotlin, Dart 및 유사한 가비지 컬렉션 언어로 작성된 애플리케이션을 Wasm으로 컴파일할 수 있게 되었으며, 이를 JavaScript로 컴파일한 경우보다 일반적으로 약 2배 빠르게 실행됩니다. 더 많은 세부 정보는 [우리의 블로그 게시물](https://v8.dev/blog/wasm-gc-porting)을 참조하세요.

# 보안

보안 측면에서, 올해 우리의 주요 주제는 샌드박싱, 퍼징 및 CFI였습니다. [샌드박싱](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) 측면에서는 코드 작성 및 신뢰할 수 있는 포인터 테이블과 같은 누락된 인프라를 구축하는 데 초점을 맞추었습니다. 퍼징 측면에서는 퍼징 인프라부터 특수 목적 퍼저 및 더 나은 언어 지원까지 모든 것에 투자했습니다. 우리의 일부 작업은 [이 발표](https://www.youtube.com/watch?v=Yd9m7e9-pG0)에서 다뤄졌습니다. 마지막으로, CFI 측면에서는 [CFI 아키텍처](https://v8.dev/blog/control-flow-integrity)의 기초를 마련하여 가능한 많은 플랫폼에서 실현될 수 있도록 했습니다. 이 외에도, 주목할 만한 작은 노력들로는 `the_hole`을 중심으로 한 [인기 있는 익스플로잇 기술 완화 작업](https://crbug.com/1445008)과 [V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md) 형태의 새로운 익스플로잇 현상금 프로그램 출시가 포함됩니다.

# 결론

올해 동안 우리는 수많은 점진적인 성능 개선에 힘을 쏟았습니다. 이 블로그 게시물에 자세히 다룬 프로젝트들뿐 아니라 작은 프로젝트들의 결합된 영향은 상당합니다! 아래는 V8이 2023년에 이루어낸 성능 개선을 보여주는 벤치마크 점수로, JetStream에서는 `14%`의 전체 성장, Speedometer에서는 `34%`의 인상적인 성장을 이뤘습니다.

![13” M1 MacBook Pro에서 측정된 웹 성능 벤치마크.](/_img/holiday-season-2023/scores.svg)

이 결과는 V8이 이전보다 빠르고 안전하다는 것을 보여줍니다. 개발자 여러분, V8과 함께 빠르고 역동적인 웹의 여정은 이제 막 시작됐습니다! 우리는 V8이 지구상 최고의 JavaScript 및 WebAssembly 엔진으로 계속 자리 잡을 수 있도록 최선을 다하겠습니다!

V8 팀 모두가 여러분에게 빠르고 안전하며, 멋진 경험으로 가득 찬 즐거운 연말을 보내시기를 기원합니다!
