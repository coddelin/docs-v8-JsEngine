---
title: &apos;빠르고 병렬적인 애플리케이션과 WebAssembly SIMD&apos;
author: &apos;Deepti Gandluri ([@dptig](https://twitter.com/dptig)), Thomas Lively ([@tlively52](https://twitter.com/tlively52)), Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))&apos;
date: 2020-01-30
updated: 2022-11-06
tags:
  - WebAssembly
description: &apos;벡터 연산을 WebAssembly로 가져오기&apos;
tweet: &apos;1222944308183085058&apos;
---
SIMD는 _단일 명령, 다중 데이터(Single Instruction, Multiple Data)_의 약자입니다. SIMD 명령은 응용 프로그램에서 데이터 병렬성을 활용하여 여러 데이터 요소에 동시에 동일한 작업을 수행하는 특수한 클래스의 명령입니다. 오디오/비디오 코덱, 이미지 프로세서와 같은 계산 집약적인 애플리케이션은 모두 SIMD 명령을 활용하여 성능을 가속화합니다. 대부분의 최신 아키텍처는 SIMD 명령의 일부 변형을 지원합니다.

<!--truncate-->
WebAssembly SIMD 제안은 대부분의 최신 아키텍처에서 사용할 수 있는 이식 가능하며 성능이 우수한 SIMD 연산의 하위 집합을 정의합니다. 이 제안은 [SIMD.js 제안](https://github.com/tc39/ecmascript_simd)에서 많은 요소를 가져왔으며, 이는 원래 [Dart SIMD](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages) 사양에서 유래되었습니다. SIMD.js 제안은 SIMD 계산을 수행하기 위해 새 유형과 기능을 포함하는 API로 TC39에 제안되었지만, WebAssembly에서 더욱 명시적으로 SIMD 연산을 지원하는 방향으로 보류되었습니다. [WebAssembly SIMD 제안](https://github.com/WebAssembly/simd)은 브라우저가 하드웨어를 활용하여 데이터 수준 병렬성을 활용할 수 있도록 도입되었습니다.

## WebAssembly SIMD 제안

WebAssembly SIMD 제안의 고수준 목표는 WebAssembly 사양에 벡터 연산을 추가하여 이식 가능하며 성능이 보장되는 방식으로 제공하는 것입니다.

SIMD 명령 세트는 크고 아키텍처마다 다양합니다. WebAssembly SIMD 제안에 포함된 연산 세트는 다양한 플랫폼에서 잘 지원되고 성능이 입증된 연산으로 구성됩니다. 이를 위해 현재 제안은 고정된 너비 128비트 SIMD 연산을 표준화하는 데 제한됩니다.

현재 제안은 새로운 `v128` 값 유형과 이 유형에서 작동하는 여러 새로운 연산을 소개합니다. 이러한 연산을 결정하는 데 사용된 기준은 다음과 같습니다:

- 연산은 여러 최신 아키텍처에서 잘 지원되어야 합니다.
- 명령 그룹 내에서 관련 아키텍처 전반에 걸쳐 성능 상 이점이 있어야 합니다.
- 선택된 연산 세트는 성능 저하를 최소화해야 합니다.

제안은 현재 [최종 상태(4단계)](https://github.com/WebAssembly/simd/issues/480)에 있으며, V8 및 툴체인은 동작하는 구현을 갖추고 있습니다.

## SIMD 지원 활성화

### 기능 감지

우선, SIMD는 새로운 기능이며 WebAssembly를 지원하는 모든 브라우저에서 아직 사용할 수 없습니다. 새 WebAssembly 기능을 지원하는 브라우저를 [webassembly.org](https://webassembly.org/roadmap/) 웹사이트에서 확인할 수 있습니다.

모든 사용자가 애플리케이션을 로드할 수 있도록 보장하려면 SIMD를 활성화한 버전과 활성화하지 않은 버전을 각각 빌드하고, 기능 감지 결과에 따라 해당 버전을 로드해야 합니다. 런타임에 SIMD를 감지하려면 [`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect) 라이브러리를 사용하여 다음과 같이 해당 모듈을 로드할 수 있습니다:

```js
import { simd } from &apos;wasm-feature-detect&apos;;

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import(&apos;./module-with-simd.js&apos;)
      : import(&apos;./module-without-simd.js&apos;)
  );
  // …이제 평소처럼 `module`을 사용하세요.
})();
```

SIMD 지원 코드 빌드에 대해 자세히 알아보려면 [아래 섹션](#building-with-simd-support)을 확인하세요.

### 브라우저에서의 SIMD 지원

WebAssembly SIMD 지원은 Chrome 91부터 기본적으로 사용 가능합니다. 최신 사양의 최종 버전을 지원하는 엔진을 감지하려면 아래에 설명된 대로 최신 툴체인과 함께 최신 wasm-feature-detect를 사용하세요. 문제가 발생한다면 [버그 신고](https://crbug.com/v8)를 해주세요.

WebAssembly SIMD는 Firefox 89 이상에서도 지원됩니다.

## SIMD 지원을 사용하여 빌드하기

### C / C++를 SIMD 대상으로 빌드하기

WebAssembly의 SIMD 지원은 WebAssembly LLVM 백엔드가 활성화된 최신 clang 빌드 사용에 따라 달라집니다. Emscripten은 WebAssembly SIMD 제안을 지원합니다. [emsdk](https://emscripten.org/docs/getting_started/downloads.html)를 사용하여 `latest` 배포판의 emscripten을 설치하고 활성화하여 SIMD 기능을 사용하세요.

```bash
./emsdk install latest
./emsdk activate latest
```

애플리케이션을 SIMD를 사용하도록 포팅할 때, SIMD 코드를 생성할 수 있도록 활성화하는 몇 가지 다른 방법이 있습니다. 최신 상위 emscripten 버전을 설치한 후, emscripten을 사용해 컴파일하고, `-msimd128` 플래그를 전달하여 SIMD를 활성화합니다.

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

이미 WebAssembly로 포팅된 애플리케이션들은 소스 수정 없이도 LLVM의 자동 벡터화 최적화를 통해 SIMD의 이점을 얻을 수 있습니다.

이 최적화는 반복문에서 각 반복마다 산술 연산을 수행하는 루프를 SIMD 명령어를 사용하여 한 번에 여러 입력에서 동일한 산술 연산을 수행하는 동등한 루프로 자동으로 변환할 수 있습니다. `-msimd128` 플래그가 제공되었을 때 LLVM의 자동 벡터화기는 기본적으로 `-O2` 및 `-O3` 최적화 수준에서 활성화됩니다.

예를 들어, 두 개의 입력 배열 요소를 곱하여 결과를 출력 배열에 저장하는 다음 함수를 고려해보십시오.

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

`-msimd128` 플래그를 전달하지 않으면 컴파일러는 이 WebAssembly 루프를 생성합니다:

```wasm
(loop
  (i32.store
    … `out`의 주소 가져오기 …
    (i32.mul
      (i32.load … `in_a`의 주소 가져오기 …)
      (i32.load … `in_b`의 주소 가져오기 …)
  …
)
```

하지만 `-msimd128` 플래그가 사용되면, 자동 벡터화기는 다음 루프를 포함한 코드로 변환합니다:

```wasm
(loop
  (v128.store align=4
    … `out`의 주소 가져오기 …
    (i32x4.mul
       (v128.load align=4 … `in_a`의 주소 가져오기 …)
       (v128.load align=4 … `in_b`의 주소 가져오기 …)
    …
  )
)
```

루프 본문은 동일한 구조를 가지고 있지만, 루프 본문 내부에서 SIMD 명령어가 한 번에 네 개의 요소를 로드, 곱셈, 저장하는 데 사용됩니다.

컴파일러가 생성하는 SIMD 명령어를 보다 세밀하게 제어하려면, [`wasm_simd128.h` 헤더 파일](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h)을 포함하십시오. 이는 일련의 내재함수를 정의합니다. 내재함수는 호출될 때 해당 WebAssembly SIMD 명령어로 컴파일러에 의해 변환되며, 컴파일러가 추가 최적화를 수행할 수도 있습니다.

예로, 아래는 이전에 사용한 동일 함수에서 SIMD 내재함수를 수동으로 사용하도록 다시 작성한 코드입니다.

```cpp
#include <wasm_simd128.h>

void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i += 4) {
    v128_t a = wasm_v128_load(&in_a[i]);
    v128_t b = wasm_v128_load(&in_b[i]);
    v128_t prod = wasm_i32x4_mul(a, b);
    wasm_v128_store(&out[i], prod);
  }
}
```

이 수동으로 다시 작성된 코드는 입력 및 출력 배열이 정렬되어 있고 대칭하지 않으며, 크기가 4의 배수임을 가정합니다. 자동 벡터화기는 이러한 가정을 할 수 없으므로, 그렇지 않은 경우를 처리하기 위한 추가 코드를 생성해야 합니다. 따라서 수동으로 작성한 SIMD 코드는 종종 자동 벡터화된 SIMD 코드보다 작습니다.

### 기존 C / C++ 프로젝트 크로스 컴파일

많은 기존 프로젝트는 이미 다른 플랫폼을 대상으로 할 때 SIMD(SSE, AVX, NEON 명령어에 대해) 지원을 제공합니다. 이러한 방식은 두 가지로 구현됩니다.

첫 번째 방식은 SIMD 작업을 처리하는 어셈블리 파일을 사용하고, 이를 C / C++과 함께 빌드 프로세스에서 연결하는 것입니다. 어셈블리 문법과 명령어는 플랫폼에 따라 다르며 이식성이 없기 때문에, 이러한 프로젝트에서 SIMD를 활용하려면 WebAssembly를 추가적으로 지원 대상으로 추가하고, 함수들을 [WebAssembly 텍스트 형식](https://webassembly.github.io/spec/core/text/index.html) 또는 [위의 내재함수](#building-c-%2F-c%2B%2B-to-target-simd)를 사용하여 재구현해야 합니다.

다른 일반적인 접근 방식은 SSE / SSE2 / AVX / NEON 내재함수를 C / C++ 코드에서 직접 사용하는 것입니다. 여기서 Emscripten은 도움을 줄 수 있습니다. Emscripten은 이러한 모든 명령어 세트를 위한 [호환 헤더 및 에뮬레이션 레이어](https://emscripten.org/docs/porting/simd.html)를 제공하며, 이를 Wasm 내재함수로 바로 컴파일하거나 그렇지 않을 경우 스칼라 코드로 변환합니다.

이러한 프로젝트를 크로스 컴파일하려면, 먼저 `./configure --enable-simd`와 같은 프로젝트별 구성 플래그를 통해 SIMD를 활성화하십시오. 이렇게 하면 컴파일러에 `-msse`, `-msse2`, `-mavx` 또는 `-mfpu=neon`을 전달하고 해당 내재함수를 호출합니다. 그런 다음 `CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …` 설정을 사용하거나 Wasm 대상으로 빌드 구성을 직접 수정하여 WebAssembly SIMD를 추가로 활성화하십시오.

### Rust를 빌드하여 SIMD 대상으로 지정

Rust 코드를 WebAssembly SIMD 대상으로 컴파일할 때, 위 Emscripten과 마찬가지로 `simd128` LLVM 기능을 활성화해야 합니다.

`rustc` 플래그를 직접 제어하거나 환경 변수 `RUSTFLAGS`를 통해 제어할 수 있다면, `-C target-feature=+simd128`를 전달하십시오:

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

또는

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

Clang / Emscripten과 마찬가지로, `simd128` 기능이 활성화되면 LLVM의 자동 벡터화기가 최적화 코드에 대해 기본적으로 활성화됩니다.

예를 들어, 위의 `multiply_arrays` 예제와 동등한 Rust 코드

```rust
pub fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.iter()
    .zip(in_b)
    .zip(out)
    .for_each(|((a, b), dst)| {
        *dst = a * b;
    });
}
```

입력값의 정렬된 부분에 대해 유사한 자동 벡터화된 코드를 생성합니다.

SIMD 작업을 수동으로 제어하려면, nightly 툴체인을 사용하고 Rust 기능 `wasm_simd`를 활성화한 후 [`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd) 네임스페이스에서 제공되는 내장 함수를 직접 호출할 수 있습니다.

```rust
#![feature(wasm_simd)]

use std::arch::wasm32::*;

pub unsafe fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.chunks(4)
    .zip(in_b.chunks(4))
    .zip(out.chunks_mut(4))
    .for_each(|((a, b), dst)| {
      let a = v128_load(a.as_ptr() as *const v128);
      let b = v128_load(b.as_ptr() as *const v128);
      let prod = i32x4_mul(a, b);
      v128_store(dst.as_mut_ptr() as *mut v128, prod);
    });
}
```

또한, 다양한 플랫폼에서 SIMD 구현을 추상화한 [`packed_simd`](https://crates.io/crates/packed_simd_2)와 같은 헬퍼 크레이트를 사용할 수도 있습니다.

## 강력한 사용 사례

WebAssembly SIMD 제안은 오디오/비디오 코덱, 이미지 처리 애플리케이션, 암호화 애플리케이션 등과 같은 높은 계산이 필요한 애플리케이션을 가속화하기 위해 설계되었습니다. 현재 WebAssembly SIMD는 [Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md), [OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html), [XNNPACK](https://github.com/google/XNNPACK)과 같은 널리 사용되는 오픈 소스 프로젝트에서 실험적으로 지원됩니다.

Google Research 팀의 [MediaPipe 프로젝트](https://github.com/google/mediapipe)에서도 흥미로운 데모를 볼 수 있습니다.

MediaPipe는 멀티모달(예: 비디오, 오디오, 시계열 데이터) 적용 머신러닝 파이프라인을 구축하는 프레임워크로 소개되어 있으며, [웹 버전](https://developers.googleblog.com/2020/01/mediapipe-on-web.html)도 존재합니다.

가장 시각적으로 매력적인 데모 중 하나로, SIMD에 의해 성능 차이를 쉽게 관찰할 수 있는 CPU 전용(비-GPU) 버전의 손 추적 시스템이 있습니다. [SIMD 없이](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html)는 최신 노트북에서 초당 약 14-15프레임(FPS)만 가능하지만, [Chrome Canary에서 SIMD 활성화](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html)하면 38-40 FPS의 훨씬 부드러운 경험을 제공합니다.

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

SIMD를 활용하여 부드러운 경험을 제공하는 또 다른 흥미로운 데모 세트는 WebAssembly로도 컴파일할 수 있는 인기 있는 컴퓨터 비전 라이브러리 OpenCV에서 제공합니다. [링크](https://bit.ly/opencv-camera-demos)로 확인할 수 있으며, 아래의 미리 녹화된 버전에서도 확인할 수 있습니다.

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>카드 읽기</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>투명 망토</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>이모지 대체</figcaption>
</figure>

## 향후 작업

현재 고정 너비의 SIMD 제안은 [Phase 4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group)에 있으며, 완료된 것으로 간주됩니다.

미래 SIMD 확장에 대한 일부 탐색은 [Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) 및 [Flexible Vectors](https://github.com/WebAssembly/flexible-vectors) 제안에서 시작되었으며, 이 글을 작성하는 시점에는 Phase 1에 있습니다.
