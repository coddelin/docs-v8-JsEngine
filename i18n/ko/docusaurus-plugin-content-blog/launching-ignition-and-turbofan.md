---
title: "Ignition과 TurboFan 출시"
author: "V8 팀"
date: "2017-05-15 13:33:37"
tags: 
  - internals
description: "V8 v5.9는 Ignition 인터프리터와 TurboFan 최적화 컴파일러를 기반으로 한 완전히 새로운 JavaScript 실행 파이프라인을 제공합니다."
---
오늘 우리는 Chrome v59의 안정 버전에 도달할 V8 v5.9에 대한 새로운 JavaScript 실행 파이프라인 출시를 발표하게 되어 기쁩니다. 새 파이프라인을 통해 실제 JavaScript 애플리케이션에서 대규모 성능 향상과 상당한 메모리 절약을 이룰 수 있습니다. 이 게시물 끝부분에서 숫자에 대해 자세히 논의하겠지만 먼저 파이프라인 자체를 살펴보겠습니다.

<!--truncate-->
새로운 파이프라인은 [Ignition](/docs/ignition), V8의 인터프리터와 [TurboFan](/docs/turbofan), V8의 최신 최적화 컴파일러를 기반으로 구축되었습니다. 지난 몇 년 동안 V8 블로그를 팔로우해 온 여러분들께 [익숙할](/blog/turbofan-jit) [수](/blog/ignition-interpreter) [있는](/blog/test-the-future) 기술이지만 새 파이프라인으로의 전환은 두 가지 모두에 있어 대규모 새로운 이정표를 나타냅니다.

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Ignition, V8의 완전히 새로운 인터프리터 로고</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>TurboFan, V8의 완전히 새로운 최적화 컴파일러 로고</figcaption>
</figure>

처음으로 V8 v5.9에서 JavaScript 실행을 위해 Ignition과 TurboFan이 보편적이고 독점적으로 사용되었습니다. 더욱이, v5.9부터는 [2010년부터 V8을 잘 제공했던](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html) 기술인 Full-codegen과 Crankshaft는 JavaScript 실행에서 더 이상 사용되지 않습니다. 이는 새로운 JavaScript 언어 기능 및 그 기능이 요구하는 최적화에 발맞추지 못하기 때문입니다. 우리는 이를 곧 완전히 제거할 계획입니다. 이는 앞으로 V8이 훨씬 단순하고 유지 관리가 용이한 아키텍처를 갖게 된다는 뜻입니다.

## 긴 여정

Ignition과 TurboFan이 결합된 파이프라인은 거의 3년 반 동안 개발되어 왔습니다. 이는 V8 팀이 실제 JavaScript 성능을 측정하고 Full-codegen 및 Crankshaft의 단점을 신중히 고려하여 얻은 집단적 통찰력의 정점을 나타냅니다. 이는 향후 JavaScript 언어 전체를 계속 최적화할 수 있는 기초가 되어줍니다.

TurboFan 프로젝트는 본래 Crankshaft의 단점을 해결하기 위해 2013년 말에 시작되었습니다. Crankshaft는 JavaScript 언어의 일부만 최적화할 수 있었습니다. 예를 들어, JavaScript의 try, catch, finally 키워드로 구분되는 코드 블록을 사용하는 구조적 예외 처리를 최적화하도록 설계되지 않았습니다. 또한 Crankshaft에 새로운 언어 기능을 추가하기는 어렵습니다. 이 기능들은 거의 항상 아홉 개의 지원 플랫폼에 대해 아키텍처별 코드를 작성해야 하기 때문입니다. 한편, Crankshaft의 아키텍처는 최적의 기계 코드를 생성할 수 있는 범위가 제한되어 있습니다. V8 팀이 칩 아키텍처 당 10,000줄 이상의 코드를 유지 관리해야 함에도 불구하고 JavaScript에서 얻을 수 있는 성능 향상은 제한적입니다.

TurboFan은 ES5 당시 JavaScript 표준에서 발견된 모든 언어 기능뿐만 아니라 ES2015 이후도 포함하여 향후 계획된 모든 기능을 최적화하도록 처음부터 설계되었습니다. 이는 높은 수준과 낮은 수준의 컴파일러 최적화를 간단히 분리하는 레이어드 컴파일러 디자인을 도입하여 아키텍처별 코드를 수정하지 않고도 새로운 언어 기능을 쉽게 추가할 수 있게 합니다. TurboFan은 각 지원 플랫폼에 대해 아키텍처별 코드를 훨씬 적게 작성할 수 있게 하는 명확한 명령 선택 컴파일 단계도 추가합니다. 이 새로운 단계 덕분에 아키텍처별 코드는 한 번 작성되면 거의 변경할 필요가 없습니다. 이러한 결정과 기타 사항들이 V8이 지원하는 모든 아키텍처에 대해 더욱 유지 보수 가능하고 확장 가능한 최적화 컴파일러를 만들게 해줍니다.

V8 Ignition 인터프리터의 본래 동기는 모바일 장치에서 메모리 소비를 줄이는 것이었습니다. Ignition 이전에는 V8 Full-codegen 기본 컴파일러가 생성한 코드가 Chrome에서 전체 JavaScript 힙의 거의 3분의 1을 차지했습니다. 이는 웹 애플리케이션의 실제 데이터를 위한 공간을 적게 남겼습니다. Ignition이 RAM 제한이 있는 Android 기기의 Chrome M53에 대해 활성화되었을 때 ARM64 기반 모바일 장치에서 Baseline 비최적화 JavaScript 코드에 필요한 메모리 사용량이 9배 감소했습니다.

나중에 V8 팀은 Ignition의 바이트코드가 Crankshaft처럼 소스 코드를 다시 컴파일하지 않고 직접 TurboFan을 사용하여 최적화된 기계 코드로 생성할 수 있다는 점을 활용했습니다. Ignition의 바이트코드는 V8에서 깨끗하고 오류가 적은 기본 실행 모델을 제공하여 V8의 [적응형 최적화](https://en.wikipedia.org/wiki/Adaptive_optimization)의 주요 기능인 디옵티마이제이션 메커니즘을 간소화합니다. 마지막으로, 바이트코드 생성이 Full-codegen의 기본 컴파일 코드 생성보다 빠르므로 Ignition을 활성화하면 일반적으로 스크립트 시작 시간이 개선되고 따라서 웹 페이지 로드 시간이 단축됩니다.

Ignition과 TurboFan의 디자인을 밀접하게 결합함으로써 전체 아키텍처에 더 많은 이점을 제공합니다. 예를 들어, V8 팀은 Ignition의 고성능 바이트코드 핸들러를 직접 작성된 어셈블리가 아닌, 대신 TurboFan의 [중간 표현](https://en.wikipedia.org/wiki/Intermediate_representation)을 사용하여 핸들러의 기능을 표현하고 TurboFan이 V8이 지원하는 수많은 플랫폼에 대한 최적화 및 최종 코드 생성을 수행하도록 합니다. 이를 통해 Ignition은 V8이 지원하는 모든 칩 아키텍처에서 뛰어난 성능을 발휘하면서 동시에 9개의 개별 플랫폼 포트를 유지 관리해야 하는 부담을 제거합니다.

## 숫자를 분석해봅시다

역사를 제쳐두고 이제 새로운 파이프라인의 실제 성능 및 메모리 소비를 살펴보겠습니다.

V8 팀은 [Telemetry - Catapult](https://catapult.gsrc.io/telemetry) 프레임워크를 사용해 실제 사용 사례의 성능을 지속적으로 모니터링합니다. 이전에 이 블로그의 [게시글](/blog/real-world-performance)에서 우리는 왜 실제 데이터로 성능 최적화 작업을 진행하는 것이 중요한지에 대해 논의했으며, 이를 위해 [WebPageReplay](https://github.com/chromium/web-page-replay)를 Telemetry와 함께 사용하는 방법을 설명했습니다. Ignition과 TurboFan으로의 전환은 이러한 실제 테스트 사례에서 성능 개선을 보여줍니다. 특히, 새로운 파이프라인은 잘 알려진 웹사이트에 대한 사용자 상호작용 스토리 테스트에서 상당한 속도 향상을 가져옵니다:

![사용자 상호작용 벤치마크에서 V8에 소요된 시간 감소](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

Speedometer가 합성 벤치마크이긴 하지만, 이전에 다른 합성 벤치마크보다 현대 JavaScript의 실제 작업량을 더 잘 근사화한다는 것을 발견했습니다. Ignition 및 TurboFan으로의 전환은 플랫폼과 디바이스에 따라 V8의 Speedometer 점수를 5%-10% 향상시킵니다.

새로운 파이프라인은 서버 측 JavaScript도 가속화합니다. Node.js의 벤치마크인 [AcmeAir](https://github.com/acmeair/acmeair-nodejs)는 가상의 항공사 서버 백엔드 구현을 시뮬레이션하며, V8 v5.9를 사용하여 10% 이상 빠르게 실행됩니다.

![웹 및 Node.js 벤치마크 개선](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

Ignition과 TurboFan은 V8의 전체 메모리 사용량도 줄입니다. Chrome M59에서는 새로운 파이프라인이 데스크톱 및 고급 모바일 디바이스에서 V8의 메모리 사용량을 5%-10% 줄였습니다. 이 감소는 이전에 이 블로그에서 [다룬 바 있는](/blog/ignition-interpreter) Ignition 메모리 절감 효과를 V8이 지원하는 모든 디바이스 및 플랫폼으로 가져온 결과입니다.

이러한 개선은 단지 시작일 뿐입니다. 새로운 Ignition과 TurboFan 파이프라인은 JavaScript 성능을 더욱 향상시키고 Chrome 및 Node.js에서 V8의 메모리 사용량을 줄이는 추가 최적화를 가능하게 합니다. 우리는 이러한 개선을 개발자와 사용자에게 출시하면서 공유하기를 기대합니다. 계속 지켜봐 주세요.
