---
title: &apos;V8에서 아키텍처 복잡성을 다루기 — CodeStubAssembler&apos;
author: &apos;[Daniel Clifford](https://twitter.com/expatdanno), CodeStubAssembler 조립자&apos;
date: 2017-11-16 13:33:37
tags:
  - 내부구조
description: &apos;V8에는 어셈블리 코드 위에 자체 추상화 계층인 CodeStubAssembler가 있습니다. CSA는 여러 플랫폼을 지원하면서 V8이 낮은 수준에서 JS 기능을 빠르고 안정적으로 최적화할 수 있도록 합니다.&apos;
tweet: &apos;931184976481177600&apos;
---
이 글에서는 V8의 매우 유용한 도구였던 CodeStubAssembler(CSA)를 소개하고자 합니다. CSA는 지난 몇 번의 V8 릴리스 동안 [큰](/blog/optimizing-proxies) [성능](https://twitter.com/v8js/status/918119002437750784) [개선](https://twitter.com/_gsathya/status/900188695721984000)을 달성하는 데 기여한 구성 요소입니다. CSA는 높은 신뢰도를 유지하며 낮은 수준에서 JavaScript 기능을 신속하게 최적화할 수 있는 V8 팀의 역량을 크게 향상시키며 개발 속도를 개선했습니다.

<!--truncate-->
## V8의 내장 함수와 손으로 작성한 어셈블리 코드의 간략한 역사

CSA의 V8에서 역할을 이해하려면, 이를 개발하게 된 배경과 역사를 조금 이해하는 것이 중요합니다.

V8은 다양한 기술을 결합하여 JavaScript 성능을 향상시킵니다. 장시간 실행되는 JavaScript 코드의 경우, V8의 [TurboFan](/docs/turbofan) 최적화 컴파일러는 ES2015+ 기능의 전체 스펙트럼을 최고 성능으로 가속화하는 데 뛰어납니다. 하지만 V8은 짧게 실행되는 JavaScript 코드 또한 효율적으로 실행하여 기본 성능을 제공해야 합니다. 특히 [ECMAScript 사양](https://tc39.es/ecma262/)에서 정의된 모든 JavaScript 프로그램에서 사용 가능한 사전 정의된 객체의 **내장 함수**에 해당됩니다.

과거에는 이러한 내장 함수 중 많은 부분이 [자체 호스팅](https://en.wikipedia.org/wiki/Self-hosting) 방식으로 작성되었습니다. 즉, V8 개발자가 JavaScript(특수한 V8 내부 방언 포함)로 이를 작성했습니다. 좋은 성능을 얻기 위해, 이러한 자체 호스팅된 내장 함수는 사용자가 제공한 JavaScript를 최적화하는 V8 메커니즘과 동일한 방법을 사용하였습니다. 사용자 제공 코드와 마찬가지로, 자체 호스팅된 내장 함수는 유형 피드백을 수집하는 웜업 단계와 최적화 컴파일러에 의해 컴파일되는 과정을 거쳐야 했습니다.

이 기술은 특정 상황에서는 좋은 성능을 제공하지만, 더 나은 성능을 제공할 수도 있습니다. `Array.prototype`의 사전 정의된 함수의 정확한 의미는 사양에서 [정교하게 정의](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object)되어 있습니다. V8 구현자는 사양을 이해하여 이러한 내장 함수가 작동하는 방식을 미리 정확하게 알고 있으며 이 지식을 사용하여 처음부터 신중히 세밀하게 조정된 맞춤 버전을 작성합니다. 이러한 _최적화된 내장 함수_는 웜업 단계나 최적화 컴파일러 호출 없이 일반적인 경우를 처리하여 기본 성능을 첫 번째 호출 시점부터 최적으로 제공합니다.

손으로 작성한 내장 JavaScript 함수(및 내장 함수라고도 혼란스럽게 불리는 다른 빠른 경로 V8 코드)에서 최고의 성능을 도출하기 위해 V8 개발자는 전통적으로 어셈블리 언어로 최적화된 내장 함수를 작성했습니다. 어셈블리를 사용함으로써, 이러한 손으로 작성한 내장 함수는 V8의 C++ 코드 호출을 회피하고 JavaScript 함수 호출 내부에서 사용하는 맞춤형 레지스터 기반 [ABI](https://en.wikipedia.org/wiki/Application_binary_interface)를 활용하는 등 다양한 이유로 특히 빠르게 작동했습니다.

손으로 작성한 어셈블리 코드의 장점 덕분에, V8은 몇 년 동안 플랫폼별로 수만 줄의 손으로 작성한 어셈블리 코드 내장 함수를 축적하게 되었습니다. 이러한 손으로 작성한 어셈블리 내장 함수는 성능을 개선하는 데 훌륭했지만, 새로운 언어 기능이 지속적으로 표준화되면서 이를 유지하고 확장하는 작업이 고된 작업이 되었으며 오류가 발생하기 쉬웠습니다.

## CodeStubAssembler의 등장

V8 개발자는 몇 년 동안 딜레마에 직면했습니다: 손으로 작성한 어셈블리의 이점을 가지면서도 유지 보수가 쉽고 안정적인 내장 함수를 만들 수 있을까요?

TurboFan이 등장하면서 드디어 이 질문에 대한 답은 “예”가 되었다. TurboFan의 백엔드는 저수준 기계 작업을 위한 크로스 플랫폼 [중간 표현](https://en.wikipedia.org/wiki/Intermediate_representation) (IR)을 사용한다. 이 저수준 기계 IR은 모든 플랫폼에서 매우 우수한 코드를 생성하는 명령 선택기, 레지스터 할당기, 명령 스케줄러 및 코드 생성기에 입력된다. 백엔드는 또한 V8의 손으로 작성된 어셈블리 빌트인에서 사용되는 많은 트릭—예를 들어, 사용자 정의 레지스터 기반 ABI를 사용하는 방법 및 호출하는 방법, 기계 수준의 꼬리 호출을 지원하는 방법, 및 리프 함수에서 스택 프레임의 생성을 생략하는 방법—에 대해 알고 있다. 이러한 지식은 TurboFan 백엔드를 매우 빠르고 V8의 다른 부분과 잘 통합된 코드를 생성하는 데 특별히 적합하게 만든다.

이 기능의 조합은 손으로 작성된 어셈블리 빌트인의 견고하고 유지 관리 가능한 대안을 처음으로 가능하게 했다. 팀은 TurboFan 백엔드 위에 구축된 휴대용 어셈블리 언어를 정의하는 새로운 V8 구성 요소—CodeStubAssembler 또는 CSA라 불리는 것—을 개발했다. CSA는 JavaScript를 작성하고 구문 분석하거나 TurboFan의 JavaScript 특화된 최적화를 적용하지 않고 직접 TurboFan 기계 수준 IR을 생성 할 수 있는 API를 추가한다. 이 빠른 코드 생성 경로는 V8 개발자가 내부적으로 V8 엔진을 가속화하는 데만 사용할 수 있지만 CSA와 함께 구성된 빌트인의 모든 개발자의 JavaScript 코드, V8 인터프리터 [Ignition](/docs/ignition)의 성능이 중요한 바이트 코드 핸들러를 포함하여 크로스 플랫폼 방식으로 최적화된 어셈블리 코드를 생성하는 효율적인 경로를 직접적으로 이롭게 한다.

![CSA 및 JavaScript 컴파일 파이프라인](/_img/csa/csa.svg)

CSA 인터페이스에는 어셈블리 코드를 작성한 적이 있는 누구에게나 익숙한 매우 저수준의 작업이 포함되어 있다. 예를 들어, “지정된 주소에서 이 객체 포인터를 로드”하거나 “이 두 32비트 숫자를 곱하기”와 같은 기능을 포함한다. CSA는 컴파일 시간에 많은 오류를 검출하기 위해 IR 수준에서 타입 검증을 수행한다. 예를 들어, V8 개발자가 메모리에서 로드된 객체 포인터를 32비트 곱셈의 입력으로 실수로 사용하는 일이 없도록 할 수 있다. 이러한 타입 검증은 손으로 작성된 어셈블리 스텁으로는 불가능하다.

## CSA 체험

CSA가 제공하는 것을 더 잘 이해하기 위해 간단한 예를 살펴보자. 객체가 문자열인 경우 문자열 길이를 반환하는 새로운 내부 빌트인을 V8에 추가할 것이다. 입력 객체가 문자열이 아닌 경우 빌트인은 `undefined`를 반환할 것이다.

우선, 새로운 빌트인 `GetStringLength`를 선언하고 상수 `kInputObject`로 식별되는 단일 입력 매개변수를 가지는 것을 지정하는 매크로 `BUILTIN_LIST_BASE`에 한 줄을 V8의 [`builtin-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h) 파일에 추가한다:

```cpp
TFS(GetStringLength, kInputObject)
```

`TFS` 매크로는 CSA를 사용해 코드를 생성하며 매개변수를 레지스터를 통해 전달할 것으로 기대되는 소스 연결(Linkage)를 사용하는 **T**urbo**F**an 빌트인으로 선언한다.

그런 다음 [`builtins-string-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-string-gen.cc) 파일에서 빌트인의 내용을 정의할 수 있다:

```cpp
TF_BUILTIN(GetStringLength, CodeStubAssembler) {
  Label not_string(this);

  // 첫 번째 매개변수에 대해 정의한 상수를 사용하여 입력 객체를 가져옵니다.
  Node* const maybe_string = Parameter(Descriptor::kInputObject);

  // 입력이 Smi(작은 숫자에 대한 특수 표현)인지 확인합니다.
  // 아래 IsString 확인 전에 이를 수행해야 합니다.
  // IsString은 인수가 객체 포인터가 아니라고 가정합니다.
  // 만약 실제로 입력이 Smi라면, |not_string| 라벨로 이동합니다.
  GotoIf(TaggedIsSmi(maybe_string), &not_string);

  // 입력 객체가 문자열인지 확인하고, 표시가 없으면 |not_string| 라벨로 이동합니다.
  GotoIfNot(IsString(maybe_string), &not_string);

  // 문자열인지 확인된 후 해당 문자열 길이를 로드하고 CSA "매크로"를 사용하여
  // 반환합니다.
  Return(LoadStringLength(maybe_string));

  // 위의 IsString 체크에 실패했을 경우의 타겟 위치 정의
  BIND(&not_string);

  // 입력 객체가 문자열이 아니므로 JavaScript undefined 상수를 반환합니다.
  Return(UndefinedConstant());
}
```

위 예제에서는 두 가지 유형의 명령이 사용된 것을 주목하라. `GotoIf`와 `Return`과 같은 _원시_ CSA 명령은 하나 또는 두 개의 어셈블리 명령으로 직접 변환된다. CSA의 사전 정의된 원시 명령 세트는 V8의 지원되는 칩 아키텍처에서 일반적으로 사용되는 명령을 대략적으로 나타낸다. 다른 명령은 `LoadStringLength`, `TaggedIsSmi`, 및 `IsString`과 같은 편리한 _매크로_ 명령으로, 원시 또는 매크로 명령을 한 줄에 출력하는 편리함을 제공한다. 매크로 명령은 쉽게 재사용할 수 있도록 V8 구현 방법론을 캡슐화한다. 이들은 임의로 길게 정의할 수 있으며 필요에 따라 V8 개발자가 쉽게 새 매크로 명령을 정의할 수 있다.

위의 변경 사항으로 V8을 컴파일한 후, V8의 스냅샷을 준비하기 위해 builtins를 컴파일하는 도구인 `mksnapshot`를 `--print-code` 명령줄 옵션과 함께 실행할 수 있습니다. 이 옵션은 각 builtin에 대해 생성된 어셈블리 코드를 출력합니다. 출력에서 `GetStringLength`를 `grep`하면, x64에서 다음과 같은 결과를 얻습니다 (코드 출력이 읽기 쉽도록 약간 정리되었습니다):

```asm
  test al,0x1
  jz not_string
  movq rbx,[rax-0x1]
  cmpb [rbx+0xb],0x80
  jnc not_string
  movq rax,[rax+0xf]
  retl
not_string:
  movq rax,[r13-0x60]
  retl
```

32비트 ARM 플랫폼에서는 `mksnapshot`이 다음의 코드를 생성합니다:

```asm
  tst r0, #1
  beq +28 -> not_string
  ldr r1, [r0, #-1]
  ldrb r1, [r1, #+7]
  cmp r1, #128
  bge +12 -> not_string
  ldr r0, [r0, #+7]
  bx lr
not_string:
  ldr r0, [r10, #+16]
  bx lr
```

우리의 새로운 builtin이 비표준 (적어도 비-C++) 호출 규칙을 사용하더라도, 이를 테스트하는 테스트 케이스를 작성하는 것이 가능합니다. 다음 코드를 [`test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc)에 추가하여 모든 플랫폼에서 builtin을 테스트할 수 있습니다:

```cpp
TEST(GetStringLength) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  // 입력이 문자열일 때 테스트합니다.
  StubTester tester(isolate, zone, Builtins::kGetStringLength);
  Handle<String> input_string(
      isolate->factory()->
        NewStringFromAsciiChecked("Oktoberfest"));
  Handle<Object> result1 = tester.Call(input_string);
  CHECK_EQ(11, Handle<Smi>::cast(result1)->value());

  // 입력이 문자열이 아닌 경우 (예: undefined) 테스트합니다.
  Handle<Object> result2 =
      tester.Call(factory->undefined_value());
  CHECK(result2->IsUndefined(isolate));
}
```

다양한 종류의 builtin에 CSA를 사용하는 방법과 추가 예제에 대한 자세한 내용은 [이 위키 페이지](/docs/csa-builtins)를 참조하세요.

## V8 개발자의 생산성을 배가시키는 도구

CSA는 여러 플랫폼을 대상으로 하는 범용 어셈블리 언어 이상의 가치를 제공합니다. 새 기능을 구현할 때, 각 아키텍처별로 코드를 수작업으로 작성하던 기존 방식에 비해 훨씬 빠르게 작업을 완료할 수 있습니다. CSA는 수작업으로 작성한 어셈블리가 제공하는 모든 이점을 제공하면서, 어셈블리 처리 시 발생할 수 있는 가장 까다로운 함정으로부터 개발자를 보호합니다:

- CSA를 사용하면, 개발자는 어셈블리 명령으로 직접 변환되는 저수준의 크로스 플랫폼 기본 구성요소를 사용하여 builtin 코드를 작성할 수 있습니다. CSA의 명령어 선택기는 이 코드가 V8이 타겟팅하는 모든 플랫폼에서 최적화되도록 보장하며, V8 개발자가 각 플랫폼의 어셈블리 언어를 전문으로 하지 않아도 됩니다.
- CSA의 인터페이스는 선택적 타입을 제공하여, 생성된 저수준 어셈블리가 처리하는 값이 코드 작성자가 기대하는 타입인지 확인할 수 있습니다.
- 어셈블리 명령 사이의 레지스터 할당은 CSA에 의해 자동으로 수행되며, 스택 프레임 생성 및 값 스택 저장 등도 포함됩니다. 이는 builtin이 사용 가능한 레지스터 수를 초과하거나 호출하는 경우에도 적용됩니다. 이러한 방식은 수작업으로 작성된 어셈블리 builtin에서 발생하던 미묘하고 찾기 어려운 버그의 전체 유형을 제거합니다. CSA는 생성된 코드를 덜 취약하게 만들어, 올바른 저수준 builtin을 작성하는 데 소요되는 시간을 대폭 줄입니다.
- CSA는 ABI 호출 규칙, 즉 표준 C++ 및 V8 내부의 레지스터 기반 호출 규칙 모두를 이해하여, CSA로 생성된 코드와 V8의 다른 부분 간의 상호 운용을 쉽게 만듭니다.
- CSA 코드가 C++이므로, 쉽게 재사용할 수 있는 매크로에 공통 코드 생성 패턴을 캡슐화하기 쉽습니다.
- V8은 Ignition의 바이트코드 핸들러를 생성하기 위해 CSA를 사용하므로, CSA 기반 builtin의 기능을 핸들러에 직접 인라인하여 인터프리터의 성능을 향상시키는 것이 매우 쉽습니다.
- V8 테스트 프레임워크는 어셈블리 어댑터를 작성할 필요 없이 C++에서 CSA 기능과 CSA 기반 builtin을 테스트하는 것을 지원합니다.

결론적으로, CSA는 V8 개발을 완전히 혁신한 도구입니다. 팀이 V8을 최적화하는 능력을 크게 향상시켰으며, 이는 V8 사용자를 위해 JavaScript 언어의 더 많은 부분을 더 빠르게 최적화할 수 있음을 의미합니다.
