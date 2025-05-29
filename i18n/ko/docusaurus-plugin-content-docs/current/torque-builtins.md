---
title: &apos;V8 Torque 빌트인&apos;
description: &apos;이 문서는 Torque 빌트인 작성을 소개하며, V8 개발자를 대상으로 합니다.&apos;
---
이 문서는 Torque 빌트인 작성을 소개하며, V8 개발자를 대상으로 합니다. Torque는 CodeStubAssembler를 대체하여 새로운 빌트인을 구현하는 데 추천되는 방법입니다. 이 가이드의 CSA 버전에 대해서는 [CodeStubAssembler 빌트인](/docs/csa-builtins)을 참조하세요.

## 빌트인

V8에서 빌트인은 런타임 시 VM에 의해 실행 가능한 코드 청크로 볼 수 있습니다. 일반적인 사용 사례는 내장 객체(예: `RegExp` 또는 `Promise`)의 기능을 구현하는 것이지만 빌트인은 IC 시스템의 일부로 다른 내부 기능을 제공하기 위해서도 사용될 수 있습니다.

V8의 빌트인은 다음과 같은 다양한 방법(각각의 트레이드오프 포함)을 사용하여 구현할 수 있습니다:

- **플랫폼 종속 어셈블리 언어**: 매우 효율적일 수 있지만 모든 플랫폼에 대해 수동 포팅이 필요하고 유지보수가 어렵습니다.
- **C++**: 런타임 함수와 스타일이 매우 유사하고 V8의 강력한 런타임 기능에 액세스할 수 있지만 일반적으로 성능 민감한 영역에는 적합하지 않습니다.
- **JavaScript**: 간결하고 읽기 쉬운 코드, 빠른 내재 함수에 접근 가능하지만 느린 런타임 호출의 잦은 사용, 타입 오염으로 인한 예측 불가능한 성능, JS 시맨틱의 복잡하고 명확하지 않은 문제와 관련된 미묘한 문제에 직면합니다. JavaScript 빌트인은 사용 중단되었으며 더 이상 추가되지 않아야 합니다.
- **CodeStubAssembler**: 플랫폼 독립성을 유지하면서 가독성을 보존하면서 어셈블리 언어와 매우 근접한 효율적인 저수준 기능을 제공합니다.
- **[V8 Torque](/docs/torque)**: CodeStubAssembler로 번역되는 V8 특정 도메인 특화 언어입니다. 따라서 CodeStubAssembler를 확장하여 정적 타입 및 읽기 쉽고 표현력 있는 문법을 제공합니다.

남은 문서는 마지막 방법에 초점을 맞추고 간단한 Torque 빌트인을 개발하는 짧은 튜토리얼을 제공하며 이는 JavaScript로 노출됩니다. Torque에 대한 보다 완전한 정보는 [V8 Torque 사용자 매뉴얼](/docs/torque)을 참조하세요.

## Torque 빌트인 작성하기

이 섹션에서는 단일 인수를 받아서 이 인수가 숫자 `42`를 나타내는지를 반환하는 간단한 CSA 빌트인을 작성할 것입니다. 이 빌트인은 `Math` 객체에 설치하여 JS에서 사용할 수 있습니다.

이번 예시는 다음을 보여줍니다:

- JavaScript 연결을 가진 Torque 빌트인 생성, JS 함수처럼 호출 가능.
- Torque를 사용하여 간단한 로직 구현: 타입 구분, Smi 및 힙 넘버 처리, 조건문.
- CSA 빌트인을 `Math` 객체에 설치.

추적하여 로컬에서 따라 하고 싶다면, 아래 코드는 [589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614)를 기반으로 합니다.

## `MathIs42` 정의

Torque 코드는 주제로 대략적으로 정리된 `src/builtins/*.tq` 파일에 위치합니다. `Math` 빌트인을 작성할 것이기 때문에, `src/builtins/math.tq` 파일에 정의를 저장합니다. 이 파일이 아직 존재하지 않으므로 [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn)를 수정하여 [`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614)에 추가해야 합니다.

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // 이 시점에서 x는 Smi, HeapNumber, undefined 또는 기타 임의의 JS 객체가 될 수 있습니다.
    // ToNumber_Inline은 CodeStubAssembler에 정의되어 있습니다. 이미 숫자인 경우 빠른 경로를 포함하며 그렇지 않은 경우 ToNumber 빌트인을 호출합니다.
    const number: Number = ToNumber_Inline(x);
    // typeswitch는 값의 동적 타입에 따라 분기할 수 있게 해줍니다. 타입 시스템은
    // 숫자가 Smi 또는 HeapNumber만 될 수 있다는 것을 알고 있으므로 이 switch가 종합적입니다.
    typeswitch (number) {
      case (smi: Smi): {
        // smi == 42의 결과는 Javascript 불린이 아니므로 조건문을 사용하여 Javascript 불린 값을 생성합니다.
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

이 정의를 Torque 네임스페이스 `math`에 넣습니다. 이 네임스페이스는 이전에 존재하지 않았으므로 [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn)를 수정하여 [`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614)에 추가해야 합니다.

## `Math.is42` 추가

`Math`와 같은 내장 객체들은 주로 [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1)에서 설정됩니다(일부 설정은 `.js` 파일에서 이루어집니다). 새로운 내장 객체를 추가하는 것은 간단합니다:

```cpp
// Math를 설정하는 기존 코드, 명확성을 위해 포함.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […생략…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

이제 `is42`가 추가되었으므로 JS에서 호출할 수 있습니다:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42(&apos;42.0&apos;);
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## 스텁 연결을 사용하여 내장을 정의하고 호출하기

내장은 (위에서 `MathIs42`에서 사용한 JS 연결 대신) 스텁 연결로도 생성할 수 있습니다. 이러한 내장은 자주 사용되는 코드를 한 번만 생성하여 여러 호출자가 사용할 수 있는 별도의 코드 객체로 추출하는 데 유용할 수 있습니다. 이제 힙 숫자를 처리하는 코드를 `HeapNumberIs42`라는 별도의 내장으로 추출하고 이를 `MathIs42`에서 호출하도록 해보겠습니다.

정의는 역시 간단합니다. Javascript 연결을 사용하는 내장과의 유일한 차이점은 `javascript` 키워드가 생략되고 수신자 인수가 없다는 것입니다.

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // 힙 숫자를 인라인으로 처리하는 대신, 이제 새로운 내장을 호출합니다.
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

내장에 대해 왜 신경 써야 할까요? 코드를 인라인 상태로 두거나 (더 읽기 쉽도록) 매크로로 추출하는 것이 더 낫지 않을까요?

중요한 이유 중 하나는 코드 공간 절약입니다. 내장은 컴파일 타임에 생성되어 V8 스냅샷에 포함되거나 바이너리에 내장됩니다. 자주 사용되는 코드의 큰 부분을 별도의 내장으로 추출하면 10KB에서 100KB까지 빠르게 공간을 절약할 수 있습니다.

## 스텁 연결 내장 테스트

새로운 내장이 비표준(적어도 비 C++) 호출 규칙을 사용하더라도, 이를 테스트할 수 있습니다. 다음 코드를 [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc)에 추가하여 모든 플랫폼에서 내장을 테스트할 수 있습니다:

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
