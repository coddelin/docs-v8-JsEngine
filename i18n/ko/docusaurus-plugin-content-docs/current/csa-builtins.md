---
title: 'CodeStubAssembler 내장 기능'
description: '이 문서는 CodeStubAssembler 내장 기능 작성에 대한 소개를 목적으로 하며, V8 개발자를 대상으로 합니다.'
---
이 문서는 CodeStubAssembler 내장 기능 작성에 대한 소개를 목적으로 하며, V8 개발자를 대상으로 합니다.

:::note
**참고:** [Torque](/docs/torque)는 새로운 내장 기능을 구현하기 위한 권장 방법으로 CodeStubAssembler를 대체합니다. 이 가이드의 Torque 버전을 보려면 [Torque builtins](/docs/torque-builtins)를 참조하세요.
:::

## 내장 기능

V8에서는 내장 기능을 런타임에 VM이 실행할 수 있는 코드 덩어리로 볼 수 있습니다. 일반적인 사용 사례로는 내장 객체의 함수(예: RegExp 또는 Promise)를 구현하는 것이 있지만, 내장 기능은 다른 내부 기능을 제공하는 데도 사용할 수 있습니다(예: IC 시스템의 일부로).

V8의 내장 기능은 여러 가지 방법(방법에 따라 상이한 장단점이 있음)을 사용하여 구현할 수 있습니다:

- **플랫폼 종속 어셈블리 언어**: 매우 효율적일 수 있으나 모든 플랫폼에서 수동으로 포팅해야 하며 유지 관리가 어렵습니다.
- **C++**: 런타임 함수와 스타일이 매우 유사하며 V8의 강력한 런타임 기능에 액세스할 수 있지만, 일반적으로 민감한 성능이 요구되는 영역에는 적합하지 않습니다.
- **JavaScript**: 간결하고 가독성 있는 코드, 빠른 기본 intrinsics에 액세스 가능하지만, 느린 런타임 호출의 빈번한 사용, 타입 오염을 통한 예측 불가능한 성능, (복잡하고 명확하지 않은) JS 의미 체제와 관련된 미묘한 문제에 취약합니다.
- **CodeStubAssembler**: 플랫폼 독립성을 유지하면서 효율적이고 읽기 쉬운 어셈블리 언어에 매우 가까운 저수준 기능을 제공합니다.

나머지 문서는 마지막 방법에 초점을 맞추고, JavaScript에 노출된 간단한 CodeStubAssembler (CSA) 내장 기능을 개발하기 위한 간략한 튜토리얼을 제공합니다.

## CodeStubAssembler

V8의 CodeStubAssembler는 어셈블리에 대한 얇은 추상화를 제공하는 저수준 원시 함수와 플랫폼 무관 조립기를 가지고 있으며, 고수준 기능의 광범위한 라이브러리도 제공합니다.

```cpp
// 저수준:
// addr에서 포인터 크기의 데이터를 value로 로드합니다.
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// 고수준:
// JS 연산 ToString(object)을 수행합니다.
// ToString 의미 체제는 https://tc39.es/ecma262/#sec-tostring에서 명시되어 있습니다.
Node* object = /* ... */;
Node* string = ToString(context, object);
```

CSA 내장 기능은 TurboFan 컴파일 파이프라인의 일부를 거칩니다 (블록 스케줄링 및 레지스터 할당 포함). 이후 최종 실행 가능한 코드가 생성됩니다. 단, 최적화 단계는 포함되지 않습니다.

## CodeStubAssembler 내장 기능 작성하기

이 섹션에서는 단일 인수를 받아 숫자 `42`를 나타내는지 여부를 반환하는 간단한 CSA 내장 기능을 작성합니다. 내장 기능은 `Math` 객체에 설치되어 JavaScript에서 노출됩니다 (가능하기 때문입니다).

다음 예제는 다음을 보여줍니다:

- JavaScript 링크로 CSA 내장 기능 생성, JS 함수처럼 호출 가능.
- CSA를 사용하여 간단한 로직 구현: Smi와 힙 숫자 처리, 조건문, TFS 내장 호출.
- CSA 변수 사용.
- `Math` 객체에 CSA 내장 기능 설치.

로컬에서 따라 하고 싶으시면, 아래 코드는 [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0) 리비전을 기반으로 합니다.

## `MathIs42` 선언하기

내장 기능은 [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1)의 `BUILTIN_LIST_BASE` 매크로에서 선언됩니다. JavaScript 링크와 `X`라는 매개변수 하나를 가진 새로운 CSA 내장 기능을 만들려면:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […생략…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […생략…]
```

`BUILTIN_LIST_BASE`는 다른 내장 기능 종류를 나타내는 몇 가지 다른 매크로를 사용합니다 (자세한 내용은 인라인 문서 참조). 특히 CSA 내장 기능은 다음으로 나뉩니다:

- **TFJ**: JavaScript 링크.
- **TFS**: 스텁 링크.
- **TFC**: 사용자 정의 인터페이스 디스크립터가 필요한 스텁 링크 내장 기능 (예: 인수가 태그되지 않았거나 특정 레지스터에 전달되어야 하는 경우).
- **TFH**: IC 핸들러에 사용되는 특수화된 스텁 링크 내장 기능.

## `MathIs42` 정의하기

내장 기능 정의는 `src/builtins/builtins-*-gen.cc` 파일에 있으며, 대략 주제에 따라 정리되어 있습니다. 우리가 `Math` 내장 기능을 작성할 것이므로, 정의를 [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1)에 넣겠습니다.

```cpp
// TF_BUILTIN은 주어진 어셈블러의 새로운 서브클래스를 무대 뒤에서 생성하는 편의 매크로입니다.
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // 현재 함수 컨텍스트를 로드합니다 (모든 스텁에 대한 암묵적인 인수입니다)
  // 그리고 X 인수를 로드합니다. 내장 선언에서 정의된 이름으로
  // 매개변수를 참조할 수 있습니다.
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // 이 시점에서 x는 기본적으로 Smi, HeapNumber, undefined 또는 다른 임의의 JS 객체일 수 있습니다. x를 사용할 수 있는 숫자로 변환하기 위해 ToNumber
  // 내장을 호출합시다.
  // CallBuiltin을 사용하여 편리하게 CSA 내장을 호출할 수 있습니다.
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // 결과 값을 저장할 CSA 변수를 생성합니다. 변수 타입은 kTagged입니다.
  // 여기에서는 태그된 포인터만 저장합니다.
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // 점프 타겟으로 사용할 레이블을 몇 개 정의해야 합니다.
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber는 항상 숫자를 반환합니다. 숫자가 Smi인지 여부를 확인하고 조건적으로
  // 해당 레이블로 점프합니다.
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // 레이블을 바인딩하면 해당 레이블에 대한 코드 생성을 시작합니다.
  BIND(&if_issmi);
  {
    // SelectBooleanConstant은 전달된 조건이 참/거짓인지에 따라 JS true/false 값을 반환합니다.
    // 결과는 var_result 변수에 바인딩되고, 조건 없이 out 레이블로 점프합니다.
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber는 Smi 또는 힙 숫자 중 하나만 반환할 수 있습니다. 확실히 하기 위해
    // 숫자가 실제로 힙 숫자인지 확인하는 단정을 추가합니다.
    CSA_ASSERT(this, IsHeapNumber(number));
    // 힙 숫자는 부동 소수점 값을 감쌉니다. 우리는 이 값을 명시적으로 추출하고 부동 소수점 비교를 수행해야 합니다.
    // 그리고 결과에 따라 다시 var_result를 바인딩합니다.
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## `Math.Is42` 부착

`Math`와 같은 내장 객체는 주로 [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1)에서 설정됩니다 (일부 설정은 `.js` 파일에서 이루어짐). 새로운 내장을 추가하는 것은 간단합니다:

```cpp
// 명확성을 위해 포함된 기존 Math 설정 코드.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […생략…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

`Is42`가 부착되면 JS에서 호출할 수 있습니다:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## 스텁 링크로 내장을 정의하고 호출하기

CSA 내장은 스텁 링크(위 예제의 `MathIs42`에서 사용한 JS 링크 대신)로도 생성 가능합니다. 이러한 내장은 공통적으로 사용되는 코드를 별도의 코드 객체로 추출하여 여러 호출자가 사용하고 해당 코드가 한 번만 생성되도록 하는 데 유용할 수 있습니다. 힙 숫자를 처리하는 코드를 `MathIsHeapNumber42`라는 별도의 내장으로 추출하고 이를 `MathIs42`에서 호출해 봅시다.

TFS 스텁을 정의하고 사용하는 것은 쉽습니다; 선언은 [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1)에서 다시 작성합니다:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […생략…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […생략…]
```

현재로서는 `BUILTIN_LIST_BASE` 내의 순서가 중요하다는 점에 유의하세요. `MathIs42`가 `MathIsHeapNumber42`를 호출하기 때문에 후자가 먼저 나열되어야 합니다.

정의도 간단합니다. [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1)에서:

```cpp
// TFS 내장을 정의하는 것은 TFJ 내장을 정의하는 것과 정확히 같습니다.
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

마지막으로 `MathIs42`에서 새로운 내장을 호출해 봅시다:

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […생략…]
  BIND(&if_isheapnumber);
  {
    // 힙 숫자를 인라인으로 처리하는 대신, 이제 새로운 TFS 스텁으로 호출합니다.
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […생략…]
}
```

TFS 빌트인을 전혀 신경 써야 할 이유가 있을까요? 코드를 인라인으로 남겨두지 않고(또는 가독성을 위해 헬퍼 메서드로 추출하지 않고)?

중요한 이유는 코드 공간에 있습니다: 빌트인들은 컴파일 시간에 생성되어 V8 스냅샷에 포함되므로, 생성된 모든 고립체에서 무조건적으로 (상당한) 공간을 차지합니다. 일반적으로 사용되는 코드의 큰 블록을 TFS 빌트인으로 추출하면 10KB에서 100KB에 이르는 공간 절약을 빠르게 얻을 수 있습니다.

## 스텁-링키지 빌트인 테스트

새로운 빌트인이 비표준(적어도 C++에서는) 호출 규약을 사용하더라도, 이를 위한 테스트 케이스를 작성하는 것은 가능합니다. 다음 코드는 모든 플랫폼에서 빌트인을 테스트하기 위해 [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717)에 추가될 수 있습니다:

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
