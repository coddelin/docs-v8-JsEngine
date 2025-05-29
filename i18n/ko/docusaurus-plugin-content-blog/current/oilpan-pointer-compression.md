---
title: 'Oilpan에서의 포인터 압축'
author: 'Anton Bikineev와 Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), walking disassemblers'
avatars:
  - anton-bikineev
  - michael-lippautz
date: 2022-11-28
tags:
  - internals
  - memory
  - cppgc
description: 'Oilpan에서의 포인터 압축은 C++ 포인터를 압축하여 힙 크기를 최대 33%까지 줄일 수 있습니다.'
tweet: '1597274125780893697'
---

> 프로그램이 4GB 미만의 RAM을 사용하는 경우 64비트 포인터를 사용하는 것은 절대적으로 터무니없습니다. 그러한 포인터 값이 구조체 안에 나타난다면, 이는 메모리를 절반 이상 낭비할 뿐만 아니라 캐시의 절반을 효과적으로 버리는 셈입니다.
>
> – [Donald Knuth (2008)](https://cs.stanford.edu/~knuth/news08.html)

<!--truncate-->

거의 진리 그 자체인 말입니다. CPU 벤더들이 실제로 [64비트 CPU를 출하하지 않는 경우](https://en.wikipedia.org/wiki/64-bit_computing#Limits_of_processors)가 있으며 Android OEM들도 커널에서 페이지 테이블 조회 속도를 높이기 위해 [39비트 주소 공간만 선택하는 경우](https://www.kernel.org/doc/Documentation/arm64/memory.txt)가 있습니다. Chrome에서 실행되는 V8은 또한 단일 탭에 필요한 실제 주소 공간 요구를 제한하는 [사이트를 별도의 프로세스로 분리](https://www.chromium.org/Home/chromium-security/site-isolation/)합니다. 이러한 모두는 완전히 새로운 것은 아닙니다. 그래서 우리는 [2020년 V8에서 포인터 압축을 출시](https://v8.dev/blog/pointer-compression)했고 웹 전반적으로 메모리가 크게 개선되는 것을 보았습니다. [Oilpan 라이브러리](https://v8.dev/blog/oilpan-library)와 함께 우리는 또 다른 웹의 빌딩 블록을 제어할 수 있게 되었습니다. [Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/README.md)은 C++용 트레이스 기반의 가비지 컬렉터로 Blink에서 문서 객체 모델을 유지관리할 때 사용되어 메모리를 최적화할 흥미로운 대상입니다.

## 배경

포인터 압축은 64비트 플랫폼에서 포인터 크기를 줄이는 메커니즘입니다. Oilpan의 포인터는 [`Member`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/member.h)라는 스마트 포인터에 캡슐화되어 있습니다. 압축되지 않은 힙 레이아웃에서는 `Member` 참조가 직접 힙 객체를 가리키며, 즉 참조당 8바이트 메모리가 사용됩니다. 이러한 시나리오에서는 힙이 전체 주소 공간에 퍼질 수 있으며, 각 포인터는 객체를 참조하는 데 필요한 모든 관련 정보를 포함하고 있습니다.

![압축되지 않은 힙 레이아웃](/_img/oilpan-pointer-compression/uncompressed-layout.svg)

압축된 힙 레이아웃에서는 `Member` 참조가 힙 케이지 내부의 오프셋만 나타냅니다. 힙 케이지는 연속적인 메모리 영역입니다. 힙 케이지 시작 부분을 가리키는 기본 포인터(base)와 Member의 조합은 전체 포인터를 형성하며, 이는 [세그먼트 주소 지정을 사용하는 방식](https://en.wikipedia.org/wiki/Memory_segmentation#Segmentation_without_paging)과 매우 유사합니다. 힙 케이지 크기는 오프셋에 사용할 수 있는 비트의 양에 따라 제한됩니다. 예를 들어, 4GB 힙 케이지는 32비트 오프셋이 필요합니다.

![압축된 힙 레이아웃](/_img/oilpan-pointer-compression/compressed-layout.svg)

편리하게도 Oilpan 힙은 이미 64비트 플랫폼에서 그러한 4GB 힙 케이지 내에 포함되어 있어 유효한 힙 포인터를 가장 가까운 4GB 경계로 정렬하기만 하면 가비지 수집 메타데이터를 참조할 수 있습니다.

Oilpan은 Blink에서 C++ 힙을 사용하는 웹 워커를 지원하기 위해 같은 프로세스에서 여러 힙을 지원합니다. 이러한 설정으로 인해 발생하는 문제는 많은 힙 케이지를 힙에 매핑하는 방법입니다. Blink에서 힙은 네이티브 스레드에 바인딩되기 때문에 여기에서 제시된 해결책은 스레드 로컬 기본 포인터를 통해 힙 케이지를 참조하는 것입니다. V8과 그 임베더가 어떤 방식으로 컴파일되는지에 따라 스레드 로컬 스토리지(TLS) 모델을 제한하여 메모리에서 기본을 로드하는 속도를 높일 수 있습니다. 궁극적으로는 가장 일반적인 TLS 모드가 필요하지만, Android를 지원하려면, 이 플랫폼에서 렌더러(따라서 V8)가 `dlopen`을 통해 로드되므로 TLS 사용이 성능적 관점에서 불가능할 수 있습니다[^1]. 최고의 성능을 제공하기 위해 Oilpan은 V8과 마찬가지로 포인터 압축을 사용할 때 모든 힙을 단일 힙 케이지에 할당합니다. 이는 전체 메모리 사용을 제한하지만, 포인터 압축이 이미 메모리를 줄이는 것을 목표로 하고 있으므로 현재로서는 이것이 용인된다고 믿습니다. 단일 4GB 힙 케이지가 너무 제한적이라면, 현재 압축 방식은 성능을 희생하지 않고 힙 케이지 크기를 16GB로 증가시킬 수 있는 기능을 제공합니다.

## Oilpan에서의 구현

### 요구 사항

지금까지 우리는 base를 offset에 더하여 Member 포인터에 저장하는 간단한 인코딩 방식을 설명했습니다. 그러나 실제 구현된 방식은 아쉽게도 그렇게 간단하지 않습니다. Oilpan에서는 Member가 다음 중 하나를 할당받을 수 있어야 합니다:

1. 객체에 대한 유효한 힙 포인터;
2. C++의 `nullptr` (또는 유사한 것);
3. 컴파일 시간에 알려져야 하는 센티널 값. 센티널 값은 예를 들어 `nullptr`를 항목으로 지원하는 해시 테이블에서 삭제된 값을 나타내는 데 사용할 수 있습니다.

`nullptr`와 센티널 주위에서 문제가 되는 부분은 호출자 측에서 이를 잡아낼 명시적인 타입이 없다는 점입니다:

```cpp
void* ptr = member.get();
if (ptr == nullptr) { /* ... * }
```

가능성이 압축된 `nullptr` 값을 저장할 명시적인 타입이 없으므로 상수와 비교하기 위해 실제 압축 해제가 필요합니다.

이 사용 사례를 염두에 두고, 우리는 사례 1.-3.을 투명하게 처리하는 방식을 찾았습니다. 압축 및 압축 해제 시퀀스가 Member가 사용되는 모든 곳에서 인라인으로 배치되므로 다음 속성도 바람직합니다:

- 동일한 빠르고 간결한 명령어 시퀀스로 icache 미스를 최소화합니다.
- 분기 예측기를 사용하지 않도록 분기 없는 명령어 시퀀스.

읽기 작업이 쓰기 작업보다 훨씬 많을 것으로 예상되므로, 빠른 압축 해제를 선호하는 비대칭 방식이 허용됩니다.

### 압축 및 압축 해제

간략하게 하기 위해 여기서는 최종적으로 사용되는 압축 방식만을 설명합니다. 우리는 어떻게 여기에 도달했는지와 고려했던 대안에 대한 자세한 정보는 [디자인 문서](https://docs.google.com/document/d/1neGN8Jq-1JLrWK3cvwRIfrSjLgE0Srjv-uq7Ze38Iao)를 참조하세요.

오늘날 구현된 방식의 주요 아이디어는 힙 공간의 정렬을 이용하여 일반 힙 포인터를 `nullptr` 및 센티널 값과 분리하는 것입니다. 본질적으로 힙 공간은 상위 절반 단어의 최소 중요한 비트가 항상 설정되도록 정렬되어 할당됩니다. 우리는 상위 32비트와 하위 32비트를 각각 U<sub>31</sub>...U<sub>0</sub> 및 L<sub>31</sub>...L<sub>0</sub>로 나타냅니다.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 상위 비트                               | 하위 비트                                   |
| ------------ | ---------------------------------------: | -----------------------------------------: |
| 힙 포인터   | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`   | <tt>0...0</tt>                           | <tt>0...000</tt>                           |
| 센티널 값   | <tt>0...0</tt>                           | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

압축은 단순히 오른쪽으로 한 번 쉬프트하여 값을 압축된 값으로 생성하고 값의 상위 절반을 자르는 것입니다. 이러한 방식으로 정렬 비트(이제 압축된 값의 가장 중요한 비트가 됨)는 유효한 힙 포인터를 나타냅니다.

:::table-wrapper
| C++                                             | x64 어셈블리         |
| :---------------------------------------------- | :------------ |
| ```cpp                                          | ```asm        \
| uint32_t Compress(void* ptr) \{                  | mov rax, rdi  \
|   return ((uintptr_t)ptr) >> 1;                 | shr rax       \
| \}                                               | ```           \
| ```                                             |               |
:::

압축된 값의 인코딩 방식은 다음과 같습니다:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 압축된 값                            |
| ------------ | -----------------------------------------: |
| 힙 포인터   | <tt>1L<sub>31</sub>...L<sub>2</sub>00</tt> |
| `nullptr`   | <tt>0...00</tt>                            |
| 센티널 값   | <tt>0...01</tt>                            |
<!-- markdownlint-enable no-inline-html -->
:::

압축된 값이 힙 포인터, `nullptr` 또는 센티널 값을 나타내는지 판단할 수 있어 사용자 코드에서 불필요한 압축 해제를 피할 수 있습니다 (아래 참조).

압축 해제를 위한 아이디어는 특정 방식으로 설정된 기본 포인터를 활용하는 것입니다. 이 기본 포인터는 하위 32비트가 모두 1로 설정됩니다.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 상위 비트                               | 하위 비트       |
| ------------ | ---------------------------------------: | -------------: |
| 기본 포인터 | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>1...1</tt> |
<!-- markdownlint-enable no-inline-html -->
:::


압축 해제 작업은 먼저 압축된 값을 부호 확장하고 그 후 가장 중요한 비트의 압축 작업을 실행 취소하기 위해 왼쪽으로 쉬프트합니다. 결과로 생성된 중간 값은 다음과 같이 인코딩됩니다.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 상위 비트       | 하위 비트                                  |
| ------------ | -------------: | -----------------------------------------: |
| 힙 포인터   | <tt>1...1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt> | <tt>0...000</tt>                           |
| sentinel     | <tt>0...0</tt> | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

마지막으로, 디컴프레스된 포인터는 이 중간값과 기준 포인터(base pointer)간의 비트 연산 결과에 불과합니다.

:::table-wrapper
| C++                                                    | x64 assembly       |
| :----------------------------------------------------- | :----------------- |
| ```cpp                                                 | ```asm             \
| void* Decompress(uint32_t compressed) \{                | movsxd rax, edi    \
|   uintptr_t intermediate =                             | add rax, rax       \
|       (uintptr_t)((int32_t)compressed)  &lt;&lt;1;           | and rax, qword ptr \
|   return (void*)(intermediate & base);                 |     [rip + base]   \
| \}                                                      | ```                \
| ```                                                    |                    |
:::

결과적으로 생성된 스킴은 분기 없는 비대칭 스킴을 통해 경우 1.-3.을 투명하게 처리합니다. 압축은 3바이트를 사용하며, 호출 자체는 인라인화될 것이므로 초기 레지스터 이동을 제외합니다. 디컴프레스는 초기 부호 확장 레지스터 이동을 포함해 13바이트를 소비합니다.

## 선택된 세부 정보

이전 섹션에서는 사용된 압축 스킴을 설명했습니다. 고성능을 달성하기 위해서는 압축 스킴이 간결해야 합니다. 위에서 설명한 압축 스킴은 Speedometer에서 관측 가능한 성능 저하로 이어졌습니다. 다음 단락에서는 Oilpan의 성능을 허용 가능한 수준으로 개선하기 위해 필요한 추가적인 내용을 설명합니다.

### Cage 기준 값 로드 최적화

기술적으로 C++ 관점에서 전역 기준 포인터는 상수일 수 없습니다. 이는 `main()` 이후 런타임 시점에 Oilpan이 초기화될 때 초기화되기 때문입니다. 이 전역 변수가 변경 가능하면 중요한 상수 전파 최적화를 방해합니다. 예를 들어, 컴파일러는 랜덤 호출이 기준(base)을 수정하지 않는다고 증명할 수 없으므로 두 번 로드해야 할 수 있습니다:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
| C++                        | x64 assembly                    |
| :------------------------- | :------------------------------ |
| ```cpp                     | ```asm                          \
| void foo(GCed*);           | baz(Member&lt;GCed>):              \
| void bar(GCed*);           |   movsxd rbx, edi               \
|                            |   add rbx, rbx                  \
| void baz(Member&lt;GCed> m) \{ |   mov rdi, qword ptr            \
|   foo(m.get());            |       [rip + base]              \
|   bar(m.get());            |   and rdi, rbx                  \
| }                          |   call foo(GCed*)               \
| ```                        |   and rbx, qword ptr            \
|                            |       [rip + base] # extra load \
|                            |   mov rdi, rbx                  \
|                            |   jmp bar(GCed*)                \
|                            | ```                             |
<!-- markdownlint-enable no-inline-html -->
:::

추가 속성을 통해 전역 기준값을 상수로 처리하도록 클랭(Clang)을 교육했으며, 이를 통해 문맥 내에서 단일 로드만 수행했습니다.

### 디컴프레스를 완전히 피하기

가장 빠른 명령 시퀀스는 'nop'입니다! 이를 염두에 두고, 많은 포인터 연산에서 중복된 압축 및 디컴프레스는 쉽게 피할 수 있습니다. 단순히, `nullptr`인지 확인하기 위해 Member를 디컴프레스할 필요가 없습니다. 다른 Member로부터 Member를 생성하거나 할당할 때 디컴프레스 및 컴프레스가 필요하지 않습니다. 포인터 비교는 압축을 통해 유지되므로, 이에 대한 변환도 피할 수 있습니다. Member 추상화는 이와 같은 병목 역할을 잘 해줍니다.

해싱은 압축된 포인터로 속도를 높일 수 있습니다. 해시 계산을 위한 디컴프레스는 기준값이 해시 엔트로피를 증가시키지 않으므로 중복입니다. 대신, 32비트 정수에 대해 더 간단한 해싱 함수가 사용될 수 있습니다. Blink에는 Member를 키로 사용하는 많은 해시 테이블이 있습니다. 32비트 해싱은 더 빠른 컬렉션을 가능하게 했습니다!

### 클랭이 최적화에 실패한 경우 도와주기

생성된 코드를 분석할 때, 컴파일러가 충분히 최적화를 수행하지 않은 또 다른 흥미로운 지점을 발견했습니다:

:::table-wrapper
| C++                               | x64 assembly               |
| :-------------------------------- | :------------------------- |
| ```cpp                            | ```asm                     \
| extern const uint64_t base;       | Assign(unsigned int):      \
| extern std::atomic_bool enabled;  |   mov dword ptr [rdi], esi \
|                                   |   mov rdi, qword ptr       \
| void Assign(uint32_t ptr) \{       |       [rip + base]         \
|   ptr_ = ptr                      |   mov al, byte ptr         \
|   WriteBarrier(Decompress(ptr));  |       [rip + enabled]      \
| }                                 |   test al, 1               \
|                                   |   jne .LBB4_2 # 매우 드묾     \
| void WriteBarrier(void* ptr) \{    |   ret                      \
|   if (LIKELY(                     | .LBB4_2:                   \
|       !enabled.load(relaxed)))    |   movsxd rax, esi          \
|     return;                       |   add rax, rax             \
|   SlowPath(ptr);                  |   and rdi, rax             \
| }                                 |   jmp SlowPath(void*)      \
| ```                               | ```                        |
:::

생성된 코드는 변수 자체가 사용되지 않음에도 불구하고 기본 블록에서 기본 로드를 수행하며, 이는 `SlowPath()`가 호출되고 디컴프레스된 포인터가 실제로 사용되는 아래의 기본 블록으로 쉽게 이동될 수 있었습니다. 컴파일러는 비원자적 로드와 원자-릴랙스드 로드를 다시 정렬하지 않기로 보수적으로 결정했는데, 이는 언어 규정에 비추어서 완벽히 합법적이었을 것입니다. 우리는 쓰기 배리어와 함께 할당을 최대한 효율적으로 만들기 위해 원자 읽기 아래로 디컴프레션을 수동으로 이동했습니다.


### Blink에서 구조체 패킹 개선

Oilpan 포인터 크기를 절반으로 줄이는 효과를 추정하기는 어렵습니다. 본질적으로 이렇게 하면 이러한 포인터의 컨테이너와 같은 “패킹된” 데이터 구조에 대해 메모리 활용도가 향상될 것입니다. 지역 측정에서는 Oilpan 메모리가 약 16% 개선되었다고 나타났습니다. 그러나 조사를 통해 일부 유형에서는 실제 크기가 줄어들지 않고 필드 간 내부 패딩만 증가한 것으로 나타났습니다.

이러한 패딩을 최소화하기 위해, 우리는 필드의 순서를 재배치하면 전체 클래스 크기를 줄일 수 있는 가비지 컬렉션 클래스들을 자동으로 식별하는 clang 플러그인을 작성했습니다. Blink 코드베이스 전반에 걸쳐 이러한 사례가 많았기 때문에, 우리는 가장 많이 사용되는 것들에 대해 재배치를 적용했으며, [설계 문서](https://docs.google.com/document/d/1bE5gZOCg7ipDUOCylsz4_shz1YMYG5-Ycm0911kBKFA)를 참조하십시오.

### 실패한 시도: 힙 케이지 크기 제한

모든 최적화가 잘된 것은 아닙니다. 압축을 더욱 최적화하려는 시도로, 우리는 힙 케이지를 2GB로 제한했습니다. 우리는 케이지 기본값의 하위 워드 상위 비트가 1임을 확인하여 시프트를 완전히 피할 수 있게 했습니다. 압축은 단순한 잘라내기가 되었고 디컴프레션은 간단한 로드와 비트 AND 연산이 될 것입니다.

Blink 렌더러에서 Oilpan 메모리가 평균적으로 10MB 미만을 차지하므로, 우리는 더 빠른 방식을 선택하고 케이지 크기를 제한해도 안전할 것이라고 가정했습니다. 하지만, 최적화를 도입한 후 드문 작업 부하에서 메모리 부족 오류가 발생하기 시작했습니다. 우리는 이 최적화를 되돌리기로 결정했습니다.

## 결과와 미래

Oilpan에서의 포인터 압축은 **Chrome 106**에서 기본적으로 활성화되었습니다. 우리는 전반적으로 큰 메모리 개선을 목격했습니다:


<!-- markdownlint-disable no-inline-html -->
| Blink 메모리 | P50                                                 | P99                                               |
| -----------: | :-------------------------------------------------: | :-----------------------------------------------: |
| Windows      | **<span style={{color:'green'}}>-21% (-1.37MB)</span>** | **<span style={{color:'green'}}>-33% (-59MB)</span>** |
| Android      | **<span style={{color:'green'}}>-6% (-0.1MB)</span>**   | **<span style={{color:'green'}}>-8% (-3.9MB)</span>** |
<!-- markdownlint-enable no-inline-html -->


보고된 숫자는 Oilpan을 사용하여 할당된 Blink 메모리에 대해 함대 전반에서 50번째와 99번째 백분위수를 나타냅니다[^2]. 보고된 데이터는 Chrome 105와 106 스테이블 버전 간의 차이를 보여줍니다. MB 단위의 절대 숫자는 사용자들이 기대할 수 있는 최저치를 나타냅니다. 실제 개선 사항은 일반적으로 크롬의 전체 메모리 소비에 미치는 간접적인 효과로 인해 약간 더 높습니다. 상대적으로 더 큰 개선은 데이터 패킹이 이러한 경우에 더 나은 것을 나타내며, 이는 더 많은 메모리가 컬렉션 (예: 벡터)에서 사용된다는 것을 보여주는 지표입니다. 구조체 패딩의 개선은 Chrome 108에 반영되었으며, Blink 메모리에서 평균적으로 추가 4% 개선을 보여주었습니다.

Blink에서 Oilpan이 널리 사용되기 때문에, 성능 비용은 [Speedometer2](https://browserbench.org/Speedometer2.1/)를 통해 추정할 수 있습니다. 스레드 로컬 버전을 기반으로 한 [초기 프로토타입](https://chromium-review.googlesource.com/c/v8/v8/+/2739979)은 15%의 성능 저하를 보였습니다. 하지만 앞서 언급한 최적화들을 통해 눈에 띄는 성능 저하는 관찰되지 않았습니다.

### 보수적인 스택 스캐닝

Oilpan에서는 스택을 보수적으로 스캔하여 힙에 대한 포인터를 찾습니다. 압축된 포인터를 사용할 경우, 모든 하프워드를 잠재적인 포인터로 처리해야 합니다. 게다가, 압축 과정에서 컴파일러가 중간 값을 스택에 저장하도록 결정할 수 있으며, 이는 스캐너가 모든 가능한 중간 값을 고려해야 함을 의미합니다(우리의 압축 스킴에서 유일한 가능한 중간 값은 잘렸지만 아직 이동되지 않은 값입니다). 중간 값을 스캔하면 오탐지(즉, 압축된 포인터처럼 보이는 하프워드)의 수가 증가하여 메모리 개선 효과가 약 3% 줄어들었습니다(추정된 메모리 개선 효과는 원래 24%였을 것입니다).

### 기타 압축

우리는 과거에 V8 JavaScript와 Oilpan에 압축을 적용하여 큰 개선을 이뤘습니다. 이 패러다임은 Chrome의 다른 스마트 포인터(`base::scoped_refptr` 등)에도 적용할 수 있다고 생각합니다. 초기 실험은 [유망한 결과](https://docs.google.com/document/d/1Rlr7FT3kulR8O-YadgiZkdmAgiSq0OaB8dOFNqf4cD8/edit)를 보여주었습니다.

조사 결과 메모리의 큰 부분이 실제로 vtable을 통해 유지된다는 것도 확인했습니다. 같은 맥락에서, Android64에서 [상대적 vtable-ABI를 활성화](https://docs.google.com/document/d/1rt6IOEBevCkiVjiARUy8Ib1c5EAxDtW0wdFoTiijy1U/edit?usp=sharing)하여 가상 테이블을 압축했습니다. 이를 통해 더 많은 메모리를 절약하고 동시에 시작 시간을 개선할 수 있었습니다.

[^1]: 관심 있는 독자는 Blink의 [`ThreadStorage::Current()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/heap/thread_state_storage.cc;drc=603337a74bf04efd536b251a7f2b4eb44fe153a9;l=19)를 참조하여 TLS 접근 방식을 다른 모드로 컴파일한 결과를 확인할 수 있습니다.
[^2]: 숫자는 Chrome의 사용자 메트릭 분석 프레임워크를 통해 수집되었습니다.
