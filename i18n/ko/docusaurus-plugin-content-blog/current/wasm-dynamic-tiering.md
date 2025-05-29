---
title: "Chrome 96에서 WebAssembly Dynamic Tiering 사용해보기"
author: "Andreas Haas — 즐거운 시간"
avatars:
  - andreas-haas
date: 2021-10-29
tags:
  - WebAssembly
description: "Chrome 96과 V8 v9.6에서 WebAssembly Dynamic Tiering을 명령줄 플래그 또는 Origin Trial을 통해 사용해볼 수 있습니다."
tweet: "1454158971674271760"
---

V8에는 WebAssembly 코드를 기계 코드로 컴파일하여 실행할 수 있도록 하는 두 가지 컴파일러가 있습니다: 기본 컴파일러 __Liftoff__와 최적화 컴파일러 __TurboFan__ 입니다. Liftoff는 TurboFan보다 훨씬 빠르게 코드를 생성할 수 있어 빠른 시작 시간을 제공합니다. 반면 TurboFan은 더 빠른 코드를 생성하여 높은 성능을 제공합니다.

<!--truncate-->
현재 Chrome 설정에서는 WebAssembly 모듈이 Liftoff에 의해 먼저 완전히 컴파일됩니다. Liftoff 컴파일이 완료된 후 TurboFan이 백그라운드에서 모듈 전체를 다시 즉시 컴파일합니다. 스트리밍 컴파일이 활성화된 경우, WebAssembly 코드가 다운로드되는 속도보다 Liftoff가 WebAssembly 코드를 더 빠르게 컴파일하면 TurboFan 컴파일이 더 일찍 시작될 수 있습니다. 초기 Liftoff 컴파일은 빠른 시작 시간을 제공하며, 백그라운드에서 실행되는 TurboFan 컴파일은 가능한 빨리 높은 성능을 제공합니다. Liftoff, TurboFan 및 전체 컴파일 프로세스에 대한 자세한 내용은 [별도 문서](https://v8.dev/docs/wasm-compilation-pipeline)에서 확인할 수 있습니다.

WebAssembly 모듈 전체를 TurboFan으로 컴파일하면 컴파일이 완료되었을 때 최상의 성능을 제공하지만, 그만큼 비용이 발생합니다:

- 백그라운드에서 TurboFan 컴파일을 실행하는 CPU 코어가 웹 애플리케이션 작업자와 같은 다른 CPU 작업을 차단할 수 있습니다.
- 중요하지 않은 함수에 대한 TurboFan 컴파일이 주요 함수의 TurboFan 컴파일을 늦추어 웹 애플리케이션이 완전한 성능에 도달하는 데 지연을 초래할 수 있습니다.
- 일부 WebAssembly 함수는 실행되지 않을 수 있으며, 이러한 함수들을 TurboFan으로 컴파일하는 데 리소스를 사용하는 것은 가치가 없을 수 있습니다.

## Dynamic Tiering

Dynamic tiering은 실제로 여러 번 실행된 함수만 TurboFan으로 컴파일함으로써 이러한 문제를 완화할 수 있습니다. 이로 인해 Dynamic tiering은 여러 방식으로 웹 애플리케이션의 성능을 변경할 수 있습니다: Dynamic tiering은 CPU의 부하를 줄여 WebAssembly 컴파일 외의 시작 작업이 더 많은 CPU를 사용할 수 있도록 하여 시작 시간을 단축할 수 있습니다. Dynamic tiering은 중요한 함수의 TurboFan 컴파일을 지연시킴으로써 성능을 저하시킬 수도 있습니다. V8이 WebAssembly 코드에서 스택 대체(on-stack-replacement)를 사용하지 않기 때문에 Liftoff 코드에서 루프에 갇힐 수 있습니다. 또한 코드 캐싱이 영향을 받습니다. Chrome은 TurboFan 코드만 캐싱하며, TurboFan 컴파일 자격이 없는 모든 함수는 컴파일된 WebAssembly 모듈이 캐시에 이미 존재하더라도 초기 Liftoff에서 시작 시 컴파일됩니다.

## 어떻게 사용해볼 수 있나요

관심 있는 개발자가 자신들의 웹 애플리케이션에서 Dynamic tiering의 성능 영향을 실험해보는 것을 권장합니다. 이를 통해 초기 단계에서 성능 퇴보를 방지할 수 있습니다. Chrome을 `--enable-blink-features=WebAssemblyDynamicTiering` 명령줄 플래그와 함께 실행하여 로컬에서 Dynamic Tiering을 활성화할 수 있습니다.

V8 Embedders는 V8 플래그 `--wasm-dynamic-tiering`을 설정하여 Dynamic Tiering을 활성화할 수 있습니다.

### Origin Trial을 활용하여 필드에서 테스트하기

Chrome을 명령줄 플래그와 함께 실행하는 것은 개발자가 할 수 있는 일이지만, 일반 사용자가 기대하기에는 어렵습니다. 애플리케이션을 필드에서 실험하려면 [Origin Trial](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md)에 참여할 수 있습니다. Origin Trial은 특정 도메인에 연결된 특별 토큰을 통해 최종 사용자와 함께 실험적 기능을 사용할 수 있도록 해줍니다. 이 특별 토큰은 토큰이 포함된 특정 페이지에서 최종 사용자에게 WebAssembly Dynamic Tiering을 활성화합니다. Origin Trial을 실행하기 위한 자체 토큰을 얻으려면 [신청 양식](https://developer.chrome.com/origintrials/#/view_trial/3716595592487501825)을 사용하세요.

## 피드백 제공

이 기능을 실험하는 개발자로부터 피드백을 요청합니다. 이는 TurboFan 컴파일이 언제 유용하고 언제 효과가 없으며 피할 수 있는지를 나타낼 수 있는 기준을 조정하는 데 도움이 됩니다. 피드백을 보내는 가장 좋은 방법은 [문제 신고](https://bugs.chromium.org/p/chromium/issues/detail?id=1260322)를 이용하는 것입니다.
