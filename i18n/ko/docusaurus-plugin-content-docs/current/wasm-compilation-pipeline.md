---
title: "WebAssembly 컴파일 파이프라인"
description: "이 글에서는 V8의 WebAssembly 컴파일러와 언제 WebAssembly 코드를 컴파일하는지에 대해 설명합니다."
---

WebAssembly는 자바스크립트 외의 프로그래밍 언어 코드를 웹에서 효율적이고 안전하게 실행할 수 있는 바이너리 형식입니다. 이 문서에서는 V8의 WebAssembly 컴파일 파이프라인을 자세히 살펴보고 성능 향상을 위해 서로 다른 컴파일러를 어떻게 사용하는지 설명합니다.

## Liftoff

처음에는 V8이 WebAssembly 모듈의 어떤 함수도 컴파일하지 않습니다. 대신 함수가 처음 호출될 때 베이스라인 컴파일러 [Liftoff](/blog/liftoff)로 지연 컴파일됩니다. Liftoff는 [원패스 컴파일러](https://en.wikipedia.org/wiki/One-pass_compiler)로, WebAssembly 코드를 한 번만 반복 처리하여 각 WebAssembly 명령어에 대해 즉각적으로 기계 코드를 생성합니다. 원패스 컴파일러는 빠른 코드 생성을 잘 수행하지만 소수의 최적화만 적용할 수 있습니다. 실제로 Liftoff는 WebAssembly 코드를 매우 빠르게 컴파일하며 초당 수십 메가바이트를 처리할 수 있습니다.

Liftoff 컴파일이 완료되면 생성된 기계 코드가 WebAssembly 모듈에 등록되어, 이후 해당 함수 호출 시 컴파일된 코드를 즉시 사용할 수 있습니다.

## TurboFan

Liftoff는 매우 짧은 시간 안에 꽤 빠른 기계 코드를 생성합니다. 그러나 각 WebAssembly 명령어에 대해 독립적으로 코드를 생성하기 때문에, 레지스터 할당 개선, 중복 로드 제거, 강도 감소, 함수 인라이닝과 같은 일반적인 컴파일러 최적화는 거의 수행되지 않습니다.

따라서 자주 실행되는 _핫_ 함수는 [TurboFan](/docs/turbofan)을 사용하여 재컴파일됩니다. TurboFan은 WebAssembly와 자바스크립트에 최적화된 V8의 컴파일러입니다. TurboFan은 [멀티패스 컴파일러](https://en.wikipedia.org/wiki/Multi-pass_compiler)로, 기계 코드를 생성하기 전에 여러 내부 표현을 빌드합니다. 이러한 추가 내부 표현은 최적화와 더 나은 레지스터 할당을 가능하게 하여 훨씬 빠른 코드를 생성합니다.

V8은 WebAssembly 함수가 얼마나 자주 호출되는지 모니터링합니다. 함수가 특정 임계값에 도달하면 해당 함수는 _핫_으로 간주되며, 백그라운드 스레드에서 재컴파일이 시작됩니다. 컴파일이 완료되면 새로운 코드가 WebAssembly 모듈에 등록되며 기존의 Liftoff 코드를 대체합니다. 이후 해당 함수에 대한 새 호출은 Liftoff 코드가 아닌 TurboFan이 생성한 최적화된 코드를 사용합니다. 다만 TurboFan 코드가 함수 호출 후에 사용 가능해지더라도 온스택 교체는 수행하지 않는다는 점에 유의하세요. 따라서 함수 호출은 Liftoff 코드로 실행을 완료합니다.

## 코드 캐싱

WebAssembly 모듈이 `WebAssembly.compileStreaming`으로 컴파일된 경우 TurboFan이 생성한 기계 코드는 캐시되기도 합니다. 동일한 URL에서 동일한 WebAssembly 모듈을 다시 가져오는 경우 캐시된 코드를 추가 컴파일 없이 즉시 사용할 수 있습니다. 코드 캐싱에 대한 자세한 정보는 [별도의 블로그 게시물](/blog/wasm-code-caching)에서 확인할 수 있습니다.

생성된 TurboFan 코드가 특정 임계값에 도달하면 코드 캐싱이 트리거됩니다. 이는 대규모 WebAssembly 모듈에서는 TurboFan 코드가 점진적으로 캐시되는 반면, 소규모 WebAssembly 모듈에서는 TurboFan 코드가 전혀 캐시되지 않을 수 있음을 의미합니다. Liftoff 코드는 캐시되지 않는데, 이는 Liftoff 컴파일이 캐시에서 코드를 로드하는 것만큼이나 빠르기 때문입니다.

## 디버깅

앞서 설명했듯이 TurboFan은 최적화를 적용하며, 코드를 재배치하거나 변수들을 제거하거나 코드의 일부를 생략하기도 합니다. 따라서 특정 명령어에 중단점을 설정하려는 경우 프로그램 실행이 실제로 어디에서 중지되어야 하는지 명확하지 않을 수 있습니다. 다시 말해 TurboFan 코드는 디버깅에 적합하지 않습니다. 따라서 DevTools를 열어 디버깅을 시작하면 모든 TurboFan 코드가 다시 Liftoff 코드로 대체됩니다("tiers down"). Liftoff 코드에서는 각 WebAssembly 명령어가 정확히 하나의 기계 코드 섹션에 매핑되며 모든 로컬 및 전역 변수가 온전한 상태로 유지됩니다.

## 프로파일링

조금 더 혼란스러울 수 있지만, DevTools에서 Performance 탭을 열고 "Record" 버튼을 클릭하면 모든 코드는 다시 tiered up(TurboFan으로 재컴파일)됩니다. "Record" 버튼은 성능 프로파일링을 시작합니다. Liftoff 코드를 프로파일링하는 것은 TurboFan이 완료되지 않은 동안에만 사용되기 때문에 유의미하지 않을 수 있습니다. 이 코드는 TurboFan의 출력보다 훨씬 느릴 수 있으며 대부분의 실행 시간 동안 TurboFan이 실행됩니다.

## 실험을 위한 플래그

실험을 위해 V8 및 Chrome을 Liftoff만 사용하거나 TurboFan만 사용하도록 WebAssembly 코드를 컴파일하도록 구성할 수 있습니다. 함수가 처음 호출될 때만 컴파일되는 게으른 컴파일을 실험하는 것도 가능합니다. 다음 플래그는 이러한 실험 모드를 활성화합니다:

- Liftoff 전용:
    - V8에서는 `--liftoff --no-wasm-tier-up` 플래그를 설정합니다.
    - Chrome에서는 WebAssembly 계층화를 비활성화(`chrome://flags/#enable-webassembly-tiering`)하고 WebAssembly 기본 컴파일러를 활성화(`chrome://flags/#enable-webassembly-baseline`)합니다.

- TurboFan 전용:
    - V8에서는 `--no-liftoff --no-wasm-tier-up` 플래그를 설정합니다.
    - Chrome에서는 WebAssembly 계층화를 비활성화(`chrome://flags/#enable-webassembly-tiering`)하고 WebAssembly 기본 컴파일러를 비활성화(`chrome://flags/#enable-webassembly-baseline`)합니다.

- 게으른 컴파일:
    - 게으른 컴파일은 함수가 처음 호출될 때만 컴파일되는 컴파일 방식입니다. 프로덕션 설정과 비슷하게 함수는 처음 Liftoff로 컴파일됩니다(실행 차단). Liftoff 컴파일이 완료되면 함수는 TurboFan으로 백그라운드에서 다시 컴파일됩니다.
    - V8에서는 `--wasm-lazy-compilation` 플래그를 설정합니다.
    - Chrome에서는 WebAssembly 게으른 컴파일을 활성화(`chrome://flags/#enable-webassembly-lazy-compilation`)합니다.

## 컴파일 시간

Liftoff 및 TurboFan의 컴파일 시간을 측정하는 방법에는 여러 가지가 있습니다. V8의 프로덕션 설정에서 Liftoff의 컴파일 시간은 `new WebAssembly.Module()`이 완료되는 데 걸리는 시간 또는 `WebAssembly.compile()`이 약속을 해결하는 데 걸리는 시간을 측정하여 JavaScript에서 측정할 수 있습니다. TurboFan의 컴파일 시간을 측정하려면 TurboFan 전용 설정에서 동일한 작업을 수행할 수 있습니다.

![[Google Earth](https://earth.google.com/web)의 WebAssembly 컴파일에 대한 추적입니다.](/_img/wasm-compilation-pipeline/trace.svg)

컴파일은 `chrome://tracing/`에서 `v8.wasm` 카테고리를 활성화하여 더 자세히 측정할 수도 있습니다. Liftoff 컴파일은 컴파일 시작에서 `wasm.BaselineFinished` 이벤트까지 소요된 시간이고, TurboFan 컴파일은 `wasm.TopTierFinished` 이벤트에서 종료됩니다. 컴파일 자체는 `WebAssembly.compileStreaming()`의 경우 `wasm.StartStreamingCompilation` 이벤트에서, `new WebAssembly.Module()`의 경우 `wasm.SyncCompile` 이벤트에서, `WebAssembly.compile()`의 경우 `wasm.AsyncCompile` 이벤트에서 시작됩니다. Liftoff 컴파일은 `wasm.BaselineCompilation` 이벤트로 표시되고, TurboFan 컴파일은 `wasm.TopTierCompilation` 이벤트로 표시됩니다. 위 그림은 Google Earth에 대해 기록된 추적을 보여주며, 주요 이벤트가 강조 표시되어 있습니다.

더 자세한 추적 데이터는 `v8.wasm.detailed` 카테고리로 제공되며, 여기에는 단일 함수의 컴파일 시간이 포함됩니다.
