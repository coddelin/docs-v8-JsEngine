---
title: &apos;V8에서의 포인터 압축&apos;
author: &apos;Igor Sheludko와 Santiago Aboy Solanes, *포인터 압축 전문가들*&apos;
avatars:
  - &apos;igor-sheludko&apos;
  - &apos;santiago-aboy-solanes&apos;
date: 2020-03-30
tags:
  - 내부 구조
  - 메모리
description: &apos;V8은 힙 크기를 최대 43%까지 줄였습니다! “V8에서의 포인터 압축”에서 그 방법을 알아보세요!&apos;
tweet: &apos;1244653541379182596&apos;
---
메모리와 성능 사이에는 항상 끊임없는 싸움이 있습니다. 사용자로서 우리는 빠르면서도 가능한 적은 메모리를 소비하기를 원합니다. 불행히도 일반적으로 성능을 향상시키면 메모리 소비가 증가하고 (그 반대도 마찬가지입니다).

<!--truncate-->
2014년, Chrome은 32비트 프로세스에서 64비트 프로세스로 전환했습니다. 이는 Chrome에 더 우수한 [보안, 안정성 및 성능](https://blog.chromium.org/2014/08/64-bits-of-awesome-64-bit-windows_26.html)을 제공했지만 이제 각각의 포인터가 4바이트 대신 8바이트를 차지하면서 메모리 비용이 증가했습니다. V8에서 이 오버헤드를 줄여 낭비된 4바이트를 최대한 회수하려는 도전을 시작했습니다.

구현에 뛰어들기 전에 우리가 어디에 위치해 있는지 파악해야 상황을 정확히 평가할 수 있습니다. 메모리와 성능을 측정하기 위해 실제로 인기가 많은 웹사이트를 반영하는 [웹 페이지 집합](https://v8.dev/blog/optimizing-v8-memory)을 사용합니다. 이 데이터는 V8이 데스크톱에서 Chrome의 [렌더러 프로세스](https://www.chromium.org/developers/design-documents/multi-process-architecture) 메모리 소비의 최대 60%를 차지하고 평균적으로는 40%를 차지한다는 것을 보여줍니다.

![Chrome 렌더러 메모리에서 V8 메모리 소비 백분율](/_img/pointer-compression/memory-chrome.svg)

포인터 압축은 V8에서 메모리 소비를 줄이기 위한 여러 진행 중인 노력 중 하나입니다. 아이디어는 매우 간단합니다: 64비트 포인터를 저장하는 대신, 특정 “기본” 주소로부터 32비트 오프셋을 저장할 수 있습니다. 이렇게 간단한 아이디어로 V8에서 얼마나 많은 이점을 얻을 수 있을까요?

V8 힙에는 부동 소수점 값, 문자열 문자, 인터프리터 바이트코드, 및 태그된 값(자세한 내용은 다음 섹션 참조)과 같은 다양한 항목이 포함됩니다. 힙을 검사한 결과, 실세계 웹사이트에서 태그된 값이 V8 힙의 약 70%를 차지한다는 것을 발견했습니다!

이제 태그된 값이 무엇인지 더 자세히 살펴보겠습니다.

## V8에서의 값 태깅

V8에서 JavaScript 값은 객체로 표현되며, 객체, 배열, 숫자 또는 문자열인지에 상관없이 V8 힙에서 할당됩니다. 이를 통해 어떤 값이든지 객체에 대한 포인터로 표현할 수 있습니다.

많은 JavaScript 프로그램이 루프에서 인덱스를 증가시키는 것과 같은 정수 값 계산을 수행합니다. 정수가 증가될 때마다 새로운 숫자 객체를 할당할 필요가 없도록, V8은 잘 알려진 [포인터 태깅](https://en.wikipedia.org/wiki/Tagged_pointer) 기술을 사용하여 V8 힙 포인터에 추가 또는 대체 데이터를 저장합니다.

태그 비트는 두 가지 목적을 가지고 있습니다: V8 힙에 위치한 객체에 대한 강한/약한 포인터 또는 작은 정수를 나타냅니다. 따라서 정수의 값은 태그된 값에 직접 저장될 수 있으며, 추가 저장 공간을 할당할 필요가 없습니다.

V8은 항상 힙에서 워드 정렬 주소에 객체를 할당하며, 이를 통해 2 (또는 머신 워드 크기에 따라 3) 하위 최하위 비트를 태깅에 사용할 수 있습니다. 32비트 아키텍처에서는 V8이 최하위 비트를 Smis와 힙 객체 포인터를 구별하는 데 사용합니다. 힙 포인터에 대해 두 번째 최하위 비트를 강한 참조와 약한 참조를 구별하는 데 사용합니다:

<pre>
                        |----- 32 bits -----|
Pointer:                |_____address_____<b>w1</b>|
Smi:                    |___int31_value____<b>0</b>|
</pre>

*w*는 강한 포인터와 약한 포인터를 구별하기 위해 사용되는 비트입니다.

Smi 값은 서명 비트를 포함하여 31비트 페이로드만을 가지고 있을 수 있습니다. 포인터의 경우, 힙 객체 주소 페이로드로 설정할 수 있는 30비트를 가지고 있습니다. 워드 정렬로 인해 할당 세분성은 4바이트이고, 이는 4GB의 주소 가능한 공간을 제공합니다.

64비트 아키텍처에서 V8 값은 다음과 같습니다:

<pre>
            |----- 32 bits -----|----- 32 bits -----|
Pointer:    |________________address______________<b>w1</b>|
Smi:        |____int32_value____|000000000000000000<b>0</b>|
</pre>

32비트 아키텍처와 달리, 64비트 아키텍처에서 V8은 Smi 값 페이로드에 대해 32비트를 사용할 수 있다는 점에 주목하세요. 포인터 압축에서 32비트 Smi의 함의는 다음 섹션에서 논의됩니다.

## 압축된 태그 값과 새로운 힙 레이아웃

포인터 압축을 통해, 우리의 목표는 태그된 두 종류의 값을 64비트 아키텍처에서 32비트에 맞게 조정하는 것입니다. 우리는 다음을 통해 포인터를 32비트로 맞출 수 있습니다:

- 모든 V8 객체를 4GB 메모리 범위 내에 할당하기
- 이 범위 내에서 포인터를 오프셋으로 표현하기

이러한 경계 제한이 있어 불행하지만, 크롬 내 V8은 이미 V8 힙의 크기에 대해 (기반 장치의 성능에 따라) 2GB 또는 4GB 제한이 있습니다. 이는 64비트 아키텍처에서도 마찬가지입니다. Node.js와 같은 다른 V8 임베더는 더 큰 힙을 요구할 수도 있습니다. 최대 4GB를 강제하면 이러한 임베더가 포인터 압축을 사용할 수 없게 됩니다.

이제 32비트 포인터가 V8 객체를 고유하게 식별하도록 힙 레이아웃을 어떻게 업데이트해야 하는지가 문제입니다.

### 간단한 힙 레이아웃

간단한 압축 방식은 주소 공간 초기 4GB에 객체를 할당하는 것입니다.

![간단한 힙 레이아웃](/_img/pointer-compression/heap-layout-0.svg)

유감스럽게도 크롬의 렌더러 프로세스는 동일한 렌더러 프로세스 내에서 예를 들어 웹/서비스 워커를 위해 여러 V8 인스턴스를 생성해야 할 수도 있으므로 V8에서는 이 방법을 사용할 수 없습니다. 이 방식을 사용할 경우, 이러한 모든 V8 인스턴스가 동일한 4GB 주소 공간을 놓고 경쟁하게 되며 결과적으로 모든 V8 인스턴스들에 대해 집단적으로 4GB 메모리 제한이 부과됩니다.

### 힙 레이아웃, v1

V8 힙을 주소 공간의 다른 연속적인 4GB 영역에 배열하면, **부호 없는** 32비트 오프셋을 기반으로 포인터를 고유하게 식별할 수 있습니다.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>힙 레이아웃, 시작점에 기반 정렬</figcaption>
</figure>

기반을 4GB로 정렬하여 상위 32비트가 모든 포인터에 동일하도록 보장할 수도 있습니다:

```
            |----- 32 bits -----|----- 32 bits -----|
Pointer:    |________base_______|______offset_____w1|
```

우리는 또한 Smi 페이로드를 31비트로 제한하고 하위 32비트에 배치하여 Smi를 압축 가능하게 만들 수 있습니다. 기본적으로 이것들을 32비트 아키텍처에서의 Smi와 유사하게 만드는 것입니다.

```
         |----- 32 bits -----|----- 32 bits -----|
Smi:     |sssssssssssssssssss|____int31_value___0|
```

*s*는 Smi 페이로드의 부호 값입니다. 부호 확장 표현이 있는 경우, 우리는 단순한 1비트 산술 이동을 통해 64비트 단어의 Smi를 압축 및 해제할 수 있습니다.

이제 우리는 포인터와 Smi 모두의 상위 반 단어가 하위 반 단어에 의해 완전히 정의된다는 것을 확인할 수 있습니다. 그러면 메모리에서 하위 반 단어만 저장하여 태그 값 저장에 필요한 메모리를 절반으로 줄일 수 있습니다:

```
                    |----- 32 bits -----|----- 32 bits -----|
Compressed pointer:                     |______offset_____w1|
Compressed Smi:                         |____int31_value___0|
```

기반이 4GB로 정렬되어 있다는 점을 감안하면 압축은 단순히 잘라내는 작업입니다:

```cpp
uint64_t uncompressed_tagged;
uint32_t compressed_tagged = uint32_t(uncompressed_tagged);
```

그러나 해제 코드(Decompression code)는 조금 더 복잡할 수 있습니다. 우리는 Smi를 부호 확장하는지와 포인터를 0으로 확장하는지, 그리고 기반을 추가할지 여부를 구별해야 합니다.

```cpp
uint32_t compressed_tagged;

uint64_t uncompressed_tagged;
if (compressed_tagged & 1) {
  // 포인터 사례
  uncompressed_tagged = base + uint64_t(compressed_tagged);
} else {
  // Smi 사례
  uncompressed_tagged = int64_t(compressed_tagged);
}
```

해제 코드를 간소화하기 위해 압축 방식을 변경해 보겠습니다.

### 힙 레이아웃, v2

만약 4GB의 시작점 대신에 기반을 _중간_에 배치하면, 압축된 값을 기반으로부터 **부호 있는** 32비트 오프셋으로 처리할 수 있습니다. 예약 전체는 더 이상 4GB로 정렬되지 않지만 기반은 정렬됩니다.

![힙 레이아웃, 중간에 기반 정렬](/_img/pointer-compression/heap-layout-2.svg)

이 새로운 레이아웃에서는 압축 코드는 동일하게 유지됩니다.

그러나 해제 코드는 더 간단해집니다. 부호 확장은 이제 Smi 및 포인터 사례에 공통적으로 사용되며 포인터 사례에서 기반을 추가할지 여부에 대한 분기만 남게 됩니다.

```cpp
int32_t compressed_tagged;

// 포인터 및 Smi 사례에 대한 공통 코드
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // 포인터 사례
  uncompressed_tagged += base;
}
```

코드에서의 분기 성능은 CPU의 분기 예측 유닛에 의해 결정됩니다. 해제 작업을 분기 없이 구현한다면 더 나은 성능을 얻을 수 있다고 생각했습니다. 약간의 비트 마법을 사용하여 위의 코드를 분기 없는 버전으로 작성할 수 있습니다:

```cpp
int32_t compressed_tagged;

// 포인터 및 Smi 사례에 동일한 코드 사용
int64_t sign_extended_tagged = int64_t(compressed_tagged);
int64_t selector_mask = -(sign_extended_tagged & 1);
// Smi의 경우 마스크는 0이고 포인터의 경우 모든 값이 1입니다
int64_t uncompressed_tagged =
    sign_extended_tagged + (base & selector_mask);
```

그 후, 우리는 분기 없는 구현으로 시작하기로 결정했습니다.

## 성능 진화

### 초기 성능

우리는 [Octane](https://v8.dev/blog/retiring-octane#the-genesis-of-octane) — 과거에 사용했던 고성능 벤치마크 — 에서 성능을 측정했습니다. 일상의 작업에서는 더 이상 고성능 개선에 집중하지 않지만, 특히 _모든 포인터_와 같이 성능에 민감한 작업의 경우에는 고성능이 저하되는 것을 원하지 않습니다. Octane은 이 작업에 여전히 좋은 벤치마크입니다.

이 그래프는 포인터 압축 구현을 최적화하고 다듬는 동안 x64 아키텍처에서 Octane의 점수를 보여줍니다. 그래프에서는 점수가 높을수록 좋은 것입니다. 빨간 선은 기존 전체 포인터 x64 빌드를 나타내며, 녹색 선은 포인터 압축 버전을 나타냅니다.

![Octane의 첫 번째 개선 라운드](/_img/pointer-compression/perf-octane-1.svg)

첫 번째 작동 구현으로 약 35%의 성능 저하가 발생했습니다.

#### Bump (1), +7%

우리는 '분기 없는 것이 더 빠르다'는 가설을 분기 없는 디컴프레션과 분기 있는 디컴프레션을 비교하며 검증했습니다. 결과적으로, 우리의 가설이 틀렸다는 것이 밝혀졌고, x64에서는 분기 있는 버전이 7% 더 빨랐습니다. 이는 꽤나 중요한 차이였습니다!

x64 어셈블리를 살펴보겠습니다.

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| 디컴프레션 | 분기 없는 버전          | 분기 있는 버전             |
|--------------|-------------------------|----------------------------|
| 코드          | ```asm                  | ```asm                       \
|               | movsxlq r11,[…]         | movsxlq r11,[…]              \
|               | movl r10,r11            | testb r11,0x1                \
|               | andl r10,0x1            | jz done                      \
|               | negq r10                | addq r11,r13                 \
|               | andq r10,r13            | done:                        \
|               | addq r11,r10            |                              | \
|               | ```                     | ```                          |
| 요약          | 20 바이트               | 13 바이트                    |
| ^^            | 6개의 실행된 명령어     | 3 또는 4개의 실행된 명령어    |
| ^^            | 분기 없음               | 1개의 분기                   |
| ^^            | 추가 레지스터 1개 사용 |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

**r13**은 여기에서 기본값을 저장하는 전용 레지스터입니다. 분기 없는 코드가 크고 더 많은 레지스터가 필요하다는 것을 알 수 있습니다.

Arm64에서도 동일한 현상을 관찰했습니다 - 분기 있는 버전이 고성능 CPU에서 확실히 더 빨랐습니다(두 경우 모두 코드 크기는 동일했지만).

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| 디컴프레션 | 분기 없는 버전          | 분기 있는 버전             |
|--------------|-------------------------|----------------------------|
| 코드          | ```asm                  | ```asm                       \
|               | ldur w6, […]            | ldur w6, […]                 \
|               | sbfx x16, x6, #0, #1    | sxtw x6, w6                  \
|               | and x16, x16, x26       | tbz w6, #0, #done            \
|               | add x6, x16, w6, sxtw   | add x6, x26, x6              \
|               |                         | done:                        \
|               | ```                     | ```                          |
| 요약          | 16 바이트               | 16 바이트                    |
| ^^            | 4개의 실행된 명령어     | 3 또는 4개의 실행된 명령어    |
| ^^            | 분기 없음               | 1개의 분기                   |
| ^^            | 추가 레지스터 1개 사용 |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

저성능 Arm64 기기에서 우리는 어느 쪽도 성능 차이가 거의 없음을 관찰했습니다.

우리의 결론은: 현대 CPU의 분기 예측기는 매우 우수하며, 코드 크기(특히 실행 경로 길이)가 성능에 더 영향을 미친다는 것입니다.

#### Bump (2), +2%

[TurboFan](https://v8.dev/docs/turbofan)은 코드 '노드의 바다'라는 개념을 중심으로 구축된 V8의 최적화 컴파일러입니다. 간단히 말하면, 각 작업이 그래프에서 하나의 노드로 표현됩니다(더 자세한 내용을 [이 블로그 게시물](https://v8.dev/blog/turbofan-jit)에서 확인할 수 있습니다). 이 노드들은 데이터 흐름과 제어 흐름을 포함하여 다양한 종속성을 가지고 있습니다.

포인터 압축에 있어 중요한 작업은 V8 힙과 파이프라인의 다른 부분을 연결하는 '로드'와 '스토어'입니다. 압축된 값을 힙에서 로드할 때마다 디컴프레션을 하고 그것을 저장하기 전에 다시 압축하면 파이프라인은 전체 포인터 모드에서와 마찬가지로 계속 작동할 수 있습니다. 그래서 우리는 노드 그래프에 새로운 명시적인 값 작업 - Decompress와 Compress를 추가했습니다.

디컴프레션이 실제로 필요하지 않은 경우도 있습니다. 예를 들어, 압축된 값이 힙에서 로드된 후 단순히 다른 위치에 저장되는 경우입니다.

불필요한 작업을 최적화하기 위해 우리는 TurboFan에 새로운 '디컴프레션 제거' 단계를 구현했습니다. 이 단계는 디컴프레션 뒤에 바로 오는 압축 작업을 제거하는 역할을 합니다. 이러한 노드들은 서로 바로 인접하지 않을 수 있기 때문에 그래프를 통해 디컴프레션을 전달하며 압축을 만나면 둘 다 제거하려고 시도합니다. 이것은 Octane 점수에서 2% 개선 효과를 가져왔습니다.

#### Bump (3), +2%

생성된 코드를 살펴보는 동안 우리는 방금 로드된 값을 디컴프레션하는 코드가 약간 너무 장황하다는 것을 발견했습니다:

```asm
movl rax, <mem>   // 로드
movlsxlq rax, rax // 부호 확장
```

메모리에서 로드한 값을 바로 부호 확장하도록 수정한 후:

```asm
movlsxlq rax, <mem>
```

또 다른 2% 개선을 얻을 수 있었습니다.

#### 향상 (4), +11%

TurboFan 최적화 단계는 그래프에 대한 패턴 매칭을 통해 작동합니다: 서브 그래프가 특정 패턴과 일치하면 의미적으로 동일하지만 더 나은 서브 그래프나 명령어로 대체됩니다.

패턴 매칭 실패는 명시적인 실패로 간주되지 않습니다. 그래프 내에 명시적으로 존재하는 Decompress/Compress 작업이 이전에 성공했던 패턴 매칭 시도를 방해하여 최적화가 조용히 실패하는 결과를 초래했습니다.

“깨진” 최적화의 한 예는 [할당 Preteneric](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf)입니다. 새로운 압축/압축해제 노드에 대응하도록 패턴 매칭을 업데이트한 후 또 다른 11% 향상을 얻을 수 있었습니다.

### 추가 개선 사항

![옥탄의 두 번째 개선 라운드](/_img/pointer-compression/perf-octane-2.svg)

#### 향상 (5), +0.5%

TurboFan에서 Decompression Elimination을 구현하는 동안 많은 것을 배웠습니다. 명시적인 Decompression/Compression 노드 접근법은 다음과 같은 특성을 가지고 있었습니다:

장점:

- 이러한 작업의 명시성은 서브 그래프의 표준 패턴 매칭을 통해 불필요한 압축해제를 최적화할 수 있게 했습니다.

하지만 구현을 계속하면서 단점도 발견되었습니다:

- 새로운 내부 값 표현으로 인해 변환 작업의 조합 폭발이 관리할 수 없게 되었습니다. 압축된 포인터, 압축된 Smi, 압축된 Any(포인터나 Smi일 수 있는 압축된 값)뿐만 아니라 기존 표현 세트(tagged Smi, tagged pointer, tagged any, word8, word16, word32, word64, float32, float64, simd128)가 추가되었습니다.
- 그래프 패턴 매칭을 기반으로 한 기존의 일부 최적화는 조용히 작동하지 않아 곳곳에서 성능 저하를 초래했습니다. 일부를 찾아 수정했지만, TurboFan의 복잡성은 계속 증가했습니다.
- 레지스터 할당기는 그래프 내 노드 수가 증가하면서 점점 불만족스러운 결과를 내며, 종종 나쁜 코드를 생성했습니다.
- 더 큰 노드 그래프는 TurboFan 최적화 단계를 지연시키고 컴파일 중 메모리 소비를 증가시켰습니다.

우리는 한 발짝 물러나 TurboFan에서 포인터 압축을 지원하기 위한 더 간단한 방법을 고민하기로 결정했습니다. 새로운 접근은 압축된 포인터/Smi/Any 표현을 제거하고, 명시적인 Compression/Decompression 노드를 Stores 및 Loads 내에 암시적으로 통합함으로써 항상 로드 전에 압축해제하고 저장 전에 압축한다고 가정하는 것입니다.

우리는 또한 “압축해제 제거” 단계를 대체할 새로운 단계를 TurboFan에 추가했습니다. 이 단계는 실제로 압축하거나 압축해제할 필요가 없음을 인식하고 해당 Loads와 Stores를 업데이트했습니다. 이러한 접근은 TurboFan에서 포인터 압축 지원의 복잡성을 크게 줄이고 생성된 코드 품질을 개선했습니다.

새로운 구현은 초기 버전만큼 효과적이었으며 추가로 0.5% 향상을 가져왔습니다.

#### 향상 (6), +2.5%

우리는 성능 동등성에 가까워지고 있었지만 여전히 격차가 있었습니다. 새로운 아이디어를 생각해내야 했습니다. 그 중 하나는: Smi 값을 처리하는 모든 코드가 상위 32비트를 “보지 않도록” 보장한다면 어떻게 될까? 라는 것이었습니다.

압축해제 구현을 다시 한 번 기억해봅시다:

```cpp
// 이전 압축해제 구현
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // 포인터 경우
  uncompressed_tagged += base;
}
```

Smi의 상위 32비트를 무시한다면 이를 정의되지 않은 것으로 간주할 수 있습니다. 그런 다음 Smi의 경우에도 예외 없이 base를 추가하여 압축해제하는 방식으로 포인터와 Smi 경우 간 특별 처리를 피할 수 있습니다! 우리는 이 접근법을 “Smi-오염”이라고 부릅니다.

```cpp
// 새로운 압축해제 구현
int64_t uncompressed_tagged = base + int64_t(compressed_tagged);
```

또한, 더 이상 Smi에 부호 확장이 필요하지 않으므로 이 변화는 힙 레이아웃 v1로 복귀할 수 있게 합니다. 이 레이아웃은 base가 4GB 예약의 시작을 가리키는 방식입니다.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>힙 레이아웃, base가 시작점에 정렬</figcaption>
</figure>

압축해제 코드 측면에서 이 변경은 부호 확장 작업을 0 확장 작업으로 변경하며 비용은 동일합니다. 그러나 이로 인해 런타임(C++) 측면에서는 간소화됩니다. 예를 들어, 주소 공간 영역 예약 코드(섹션 [일부 구현 세부 사항](#some-implementation-details) 참조).

비교를 위한 어셈블리 코드는 다음과 같습니다:

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| 압축 해제 | Branchful                    | Smi-손상                  |
|---------------|------------------------------|------------------------------|
| 코드          | ```asm                       | ```asm                       \
|               | movsxlq r11,[…]              | movl r11,[rax+0x13]          \
|               | testb r11,0x1                | addq r11,r13                 \
|               | jz done                      |                              | \
|               | addq r11,r13                 |                              | \
|               | done:                        |                              | \
|               | ```                          | ```                          |
| 요약          | 13 바이트                    | 7 바이트                     |
| ^^            | 3 또는 4개의 명령어 실행     | 2개의 명령어 실행            |
| ^^            | 1개의 분기                   | 분기 없음                    |
<!-- markdownlint-enable no-space-in-code -->
:::

그래서 우리는 V8의 모든 Smi-사용 코드 조각을 새 압축 스키마에 맞게 조정하여 추가로 2.5% 개선을 이루었습니다.

### 남아있는 격차

남아있는 성능 격차는 지표 압축과의 근본적인 비호환성 때문에 비활성화해야 했던 64비트 빌드 최적화 두 가지로 설명됩니다.

![Octane의 최종 개선 단계](/_img/pointer-compression/perf-octane-3.svg)

#### 32비트 Smi 최적화 (7), -1%

64비트 아키텍처의 전체 포인터 모드에서 Smi가 어떻게 생겼는지 기억해봅시다.

```
        |----- 32 비트 -----|----- 32 비트 -----|
Smi:    |____int32_value____|0000000000000000000|
```

32비트 Smi는 다음과 같은 이점을 제공합니다:

- 숫자 객체로 박싱하지 않고 더 큰 정수 범위를 표현할 수 있습니다; 그리고
- 읽기/쓰기를 할 때 32비트 값을 직접 액세스할 수 있는 형태를 제공합니다.

지표 압축과 함께 이 최적화를 수행할 수는 없습니다. Smi와 포인터를 구분하는 비트가 필요하기 때문에 32비트 압축 포인터에서 공간이 부족하기 때문입니다. 64비트 전체 포인터 버전에서 32비트 Smi를 비활성화하면 Octane 점수가 1% 하락합니다.

#### 더블 필드 언박싱 (8), -3%

이 최적화는 특정 가정 하에 부동 소수점 값을 객체의 필드에 직접 저장하려고 합니다. 이 최적화의 목표는 Smi만큼의 숫자 객체 할당을 줄이는 것입니다.

다음 JavaScript 코드를 상상해 보세요:

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = new Point(3.1, 5.3);
```

일반적으로 객체 p가 메모리에 어떻게 보이는지 살펴보면, 우리는 다음과 같은 모습을 보게 될 것입니다.

![메모리에 있는 객체 `p`](/_img/pointer-compression/heap-point-1.svg)

[이 기사](https://v8.dev/blog/fast-properties)에서 숨겨진 클래스 및 속성 및 요소 백킹 스토어에 대해 더 읽을 수 있습니다.

64비트 아키텍처에서 더블 값은 포인터와 같은 크기입니다. 따라서 Point의 필드가 항상 숫자 값을 포함한다는 가정을 하면, 이를 객체의 필드에 직접 저장할 수 있습니다.

![](/_img/pointer-compression/heap-point-2.svg)

이러한 가정이 어떤 필드에서 깨지면(예를 들어 아래 줄을 실행한 경우),

```js
const q = new Point(2, &apos;ab&apos;);
```

그때부터 y 속성의 숫자 값은 박싱된 상태로 저장되어야 합니다. 또한 이 가정을 기반으로 하는 투기적으로 최적화된 코드가 있다면 더 이상 사용할 수 없도록 하고 폐기(비최적화)해야 합니다. 이러한 '필드 유형' 일반화의 이유는 동일한 생성자 함수에서 생성된 객체의 형태 수를 최소화하는 데 있습니다. 이는 성능의 안정성을 위해 필요합니다.

![메모리에 있는 객체 `p`와 `q`](/_img/pointer-compression/heap-point-3.svg)

더블 필드 언박싱이 적용될 경우 다음과 같은 이점을 제공합니다:

- 숫자 객체를 통한 추가 참조 없이 객체 포인터를 통해 부동 소수점 데이터에 직접 액세스할 수 있습니다; 그리고
- (숫자 연산 애플리케이션처럼) 많은 더블 필드 액세스를 수행하는 타이트 루프에 대해 더 작고 더 빠른 최적화된 코드를 생성할 수 있습니다.

지표 압축이 활성화되면 더블 값은 더 이상 압축 필드에 맞지 않습니다. 하지만 미래에는 이 최적화를 지표 압축에 맞게 조정할 수도 있습니다.

고처리가 필요한 코드는 이러한 더블 필드 언박싱 최적화 없이도 (지표 압축과 호환되는 방식으로) 최적화 가능하게 다시 작성할 수 있으며, Float64 TypedArrays에 데이터를 저장하거나 심지어 [Wasm](https://webassembly.github.io/spec/core/)을 사용하는 방법을 활용할 수 있습니다.

#### 더 많은 개선 (9), 1%

마지막으로 TurboFan에서 압축 해제 제거 최적화를 약간 조정하여 추가로 1% 성능 개선을 이루었습니다.

## 일부 구현 세부사항

포인터 압축을 기존 코드에 통합하기 위해 값을 로드할 때마다 해제하고 저장할 때마다 압축하도록 결정했습니다. 이렇게 하면 태그가 지정된 값의 저장 형식을 변경하면서 실행 형식은 변경되지 않습니다.

### 네이티브 코드 측면

압축 해제를 위해 효율적인 코드를 생성할 수 있도록 기본 값이 항상 사용 가능해야 합니다. 다행히도 V8는 이미 JavaScript와 V8 내부 객체에 대한 참조(예: undefined, null, true, false 및 기타)를 항상 제공하는 'roots table'에 항상 포인터가 있는 전용 레지스터를 가지고 있었습니다. 이 레지스터는 'root register'라고 불리며 더 작고 [공유 가능한 builtins 코드](https://v8.dev/blog/embedded-builtins)를 생성하는 데 사용됩니다.

따라서 우리는 roots table을 V8 힙 예약 영역에 배치했으며 root register가 루트 포인터로 사용되고 압축 해제의 기본 값으로 사용될 수 있게 되었습니다.

### C++ 측면

V8 런타임은 힙에 저장된 데이터를 간편하게 볼 수 있도록 C++ 클래스를 통해 V8 힙의 객체에 접근합니다. V8 객체는 C++ 객체라기보다는 [POD](https://en.wikipedia.org/wiki/Passive_data_structure)와 유사한 구조입니다. 헬퍼 'view' 클래스는 자체 태그가 지정된 값과 함께 단지 하나의 uintptr_t 필드만 포함합니다. 이러한 view 클래스는 워드 크기여서 현대 C++ 컴파일러 덕분에 부담 없이 값을 통해 전달할 수 있습니다.

헬퍼 클래스의 가상 예시는 다음과 같습니다:

```cpp
// 숨겨진 클래스
class Map {
 public:
  …
  inline DescriptorArray instance_descriptors() const;
  …
  // Map view 객체에 저장된 실제 태그 포인터 값.
  const uintptr_t ptr_;
};

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uintptr_t da = *reinterpret_cast<uintptr_t*>(field_address);
  return DescriptorArray(da);
}
```

포인터 압축 버전의 첫 실행에 필요한 변경 수를 최소화하기 위해 압축 해제에 필요한 기본 값 계산을 getter에 통합했습니다.

```cpp
inline uintptr_t GetBaseForPointerCompression(uintptr_t address) {
  // 주소를 4GB로 내림
  const uintptr_t kBaseAlignment = 1 << 32;
  return address & -kBaseAlignment;
}

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  uintptr_t base = GetBaseForPointerCompression(ptr_);
  uintptr_t da = base + compressed_da;
  return DescriptorArray(da);
}
```

성능 측정은 모든 로드에서 기반 값을 계산하면 성능이 저하된다는 것을 확인했습니다. 그 이유는 C++ 컴파일러가 V8 힙의 모든 주소에 대해 GetBaseForPointerCompression() 호출 결과가 동일하다는 것을 알지 못하기 때문에 기본 값의 계산을 병합할 수 없기 때문입니다. 해당 코드가 여러 명령과 64비트 상수로 구성되어 있어 상당한 코드 팽창을 초래합니다.

이 문제를 해결하기 위해 우리는 V8 인스턴스 포인터를 압축 해제의 기반으로 재활용했습니다(V8 힙 레이아웃의 V8 인스턴스 데이터를 기억하십시오). 이 포인터는 런타임 함수에서 일반적으로 사용 가능하므로 V8 인스턴스 포인터를 요구하여 getter 코드를 단순화하고 성능 저하를 회복했습니다:

```cpp
DescriptorArray Map::instance_descriptors(const Isolate* isolate) const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  // Isolate 포인터가 이미 기반이므로 반올림이 필요하지 않습니다.
  uintptr_t base = reinterpret_cast<uintptr_t>(isolate);
  uintptr_t da = DecompressTagged(base, compressed_value);
  return DescriptorArray(da);
}
```

## 결과

이제 포인터 압축 최종 숫자를 살펴보겠습니다! 이러한 결과를 얻기 위해 우리는 이 블로그 게시물 시작 부분에서 소개한 동일한 인터넷 탐색 테스트를 사용했습니다. 참고로 이것들은 실제 세계 웹사이트 사용을 대표하는 탐색 사용자 스토리입니다.

이 테스트에서 우리는 포인터 압축이 **V8 힙 크기를 최대 43%** 줄인다는 것을 관찰했습니다! 결과적으로 **데스크탑의 Chrome 렌더러 프로세스 메모리가 최대 20%** 감소합니다.

![Windows 10에서 인터넷 탐색 시 메모리 절감](/_img/pointer-compression/v8-heap-memory.svg)

중요한 점은 모든 웹사이트가 동일한 양만큼 개선되지는 않는다는 것입니다. 예를 들어, 포인터 압축 이전에는 Facebook에서 사용된 V8 힙 메모리가 New York Times보다 더 컸으나, 포인터 압축 이후에는 실제로 반대가 됩니다. 이러한 차이는 일부 웹사이트가 다른 웹사이트보다 더 많은 태그 값을 가지고 있다는 사실로 설명될 수 있습니다.

이러한 메모리 개선 외에도 실제 세계에서 성능 개선을 확인했습니다. 실제 웹사이트에서 우리는 더 적은 CPU와 쓰레기 수집기 시간을 사용합니다!

![CPU 및 쓰레기 수집 시간 개선](/_img/pointer-compression/performance-improvements.svg)

## 결론

여기까지 오기 위한 여정은 결코 쉬운 일이 아니었지만, 그만한 가치가 있었습니다. [300+ 커밋](https://github.com/v8/v8/search?o=desc&q=repo%3Av8%2Fv8+%22%5Bptr-compr%5D%22&s=committer-date&type=Commits)을 통해, 포인터 압축을 사용하는 V8은 32비트 애플리케이션을 실행하는 것처럼 메모리를 사용하면서도 64비트 애플리케이션의 성능을 제공합니다.

우리는 항상 개선의 여지를 탐구하고 있으며, 아래와 같은 관련 작업들을 준비 중입니다:

- 생성된 어셈블리 코드의 품질을 개선합니다. 특정 경우에 더 적은 코드를 생성할 수 있는 방법을 알고 있으며, 이는 성능을 향상시킬 것입니다.
- 포인터 압축 친화적인 방식으로 더블 필드를 다시 언박싱할 수 있는 메커니즘을 포함한 관련 성능 저하 문제를 해결합니다.
- 8GB에서 16GB 범위의 더 큰 힙을 지원하는 아이디어를 탐구합니다.
