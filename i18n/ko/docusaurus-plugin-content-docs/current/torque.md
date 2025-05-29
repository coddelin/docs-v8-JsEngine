---
title: 'V8 Torque 사용자 매뉴얼'
description: '이 문서는 V8 코드베이스에서 사용되는 V8 Torque 언어에 대해 설명합니다.'
---
V8 Torque는 V8 프로젝트에 기여하는 개발자가 VM에 대한 변경 의도를 표현하면서 관련 없는 구현 세부 사항에 얽매이지 않고 VM의 변경 사항을 쉽게 표현할 수 있게 해주는 언어입니다. 이 언어는 [ECMAScript 규격](https://tc39.es/ecma262/)을 V8 구현으로 직접 번역하기 쉽게 설계되었으며, 특정 객체 모양에 대한 테스트를 기반으로 빠른 경로를 생성하는 것과 같은 저수준의 V8 최적화 기술도 견고하게 표현할 수 있을 만큼 강력합니다.

Torque는 TypeScript와 유사한 구문을 결합하여 V8 엔지니어와 JavaScript 개발자들에게 친숙하며, [`CodeStubAssembler`](/blog/csa)에서 이미 일반적인 개념을 반영한 구문과 타입을 제공합니다. 강력한 타입 시스템과 구조화된 제어 흐름으로 Torque는 설계 단계에서 올바름을 보장합니다. Torque의 표현력은 V8의 [기본함수 기능](/docs/builtin-functions)에 현재 구현된 거의 모든 기능을 표현하기에 충분합니다. 또한 C++로 작성된 `CodeStubAssembler` 기본 함수 및 `macro`와 매우 상호 운용 가능하며, Torque 코드는 수작업으로 작성된 CSA 기능을 사용할 수 있고 그 반대도 가능합니다.

Torque는 V8 구현의 높은 수준의 의미가 풍부한 조각을 표현할 수 있는 언어 구조를 제공하며, Torque 컴파일러는 이러한 내용들을 효율적인 어셈블리 코드로 변환합니다. Torque의 언어 구조와 컴파일러의 오류 검사는 `CodeStubAssembler`의 직접 사용에서 발생하던 고된 작업과 오류를 방지합니다. 전통적으로 `CodeStubAssembler`로 최적의 코드를 작성하려면 많은 전문 지식을 머릿속에 숙지해야 했으며, 대부분 문서로 공식적으로 잡혀 있지 않은 지식이 많았습니다. 이러한 지식 없이는 효율적인 기본 함수를 작성하는 데 학습 곡선이 가팔랐습니다. 필요한 지식을 갖추고 있더라도 눈에 띄지 않고 관리되지 않는 함정들이 올바름 또는 [보안](https://bugs.chromium.org/p/chromium/issues/detail?id=775888) [버그](https://bugs.chromium.org/p/chromium/issues/detail?id=785804) 문제를 초래하곤 했습니다. Torque를 사용하면 이러한 함정 중 다수를 자동으로 방지하고 컴파일러가 찾아낼 수 있습니다.

## 시작하기

Torque로 작성된 대부분의 소스는 V8 저장소의 [`src/builtins` 디렉토리](https://github.com/v8/v8/tree/master/src/builtins)에 `.tq` 파일 확장자로 등록되어 있습니다. V8의 힙 할당 클래스에 대한 Torque 정의는 C++ 정의와 함께 `src/objects` 디렉토리에 동일한 이름의 `.tq` 파일에 위치합니다. 실제 Torque 컴파일러는 [`src/torque`](https://github.com/v8/v8/tree/master/src/torque)에 있으며, Torque 기능에 대한 테스트는 [`test/torque`](https://github.com/v8/v8/tree/master/test/torque), [`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque), [`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque)에 등록되어 있습니다.

언어의 맛을 느끼기 위해, “Hello World!”를 출력하는 V8 기본 함수를 작성해 보겠습니다. 이를 위해 Torque `macro`를 테스트 케이스에 추가하고 `cctest` 테스트 프레임워크에서 호출할 것입니다.

`test/torque/test-torque.tq` 파일을 열어 파일 끝(마지막 닫는 `}` 전에)에 다음 코드를 추가합니다:

```torque
@export
macro PrintHelloWorld(): void {
  Print('Hello world!');
}
```

다음으로, `test/cctest/torque/test-torque.cc`를 열고 새 Torque 코드를 사용하여 코드 스텁을 생성하는 다음 테스트 케이스를 추가합니다:

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

그런 다음 [`cctest` 실행 파일을 빌드](/docs/test)하고 마지막으로 `cctest` 테스트를 실행하여 ‘Hello world’를 출력합니다:

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
Hello world!
```

## Torque가 코드를 생성하는 방법

Torque 컴파일러는 기계 코드를 직접 생성하지 않지만 V8의 기존 `CodeStubAssembler` 인터페이스를 호출하는 C++ 코드를 생성합니다. `CodeStubAssembler`는 [TurboFan 컴파일러](https://v8.dev/docs/turbofan)의 백엔드를 사용하여 효율적인 코드를 생성합니다. 따라서 Torque 컴파일에는 여러 단계가 필요합니다:

1. `gn` 빌드는 먼저 Torque 컴파일러를 실행합니다. 이것은 모든 `*.tq` 파일을 처리합니다. 각 Torque 파일 `path/to/file.tq`는 다음 파일들을 생성합니다:
    - `path/to/file-tq-csa.cc` 및 `path/to/file-tq-csa.h`에 생성된 CSA 매크로가 포함되어 있습니다.
    - `path/to/file-tq.inc`는 클래스 정의를 포함하는 해당 헤더 `path/to/file.h`에 포함되도록 생성됩니다.
    - `path/to/file-tq-inl.inc`는 클래스 정의의 C++ 접근자를 포함하는 해당 인라인 헤더 `path/to/file-inl.h`에 포함되도록 생성됩니다.
    - `path/to/file-tq.cc`에는 생성된 힙 검증자, 프린터 등이 포함되어 있습니다.

    Torque 컴파일러는 다른 여러 `.h` 파일도 생성하며, 이는 V8 빌드에서 사용됩니다.
1. `gn` 빌드는 1단계에서 생성된 `-csa.cc` 파일을 `mksnapshot` 실행 파일로 컴파일합니다.
1. `mksnapshot` 실행 시, Torque에서 정의된 내장 함수와 Torque 정의 기능을 사용하는 기타 모든 내장 함수를 포함하여 V8의 모든 내장 함수가 생성되고 스냅샷 파일에 패키징됩니다.
1. 나머지 V8이 빌드됩니다. Torque로 작성된 모든 내장 함수는 V8에 연결된 스냅샷 파일을 통해 액세스할 수 있으며 다른 내장 함수처럼 호출할 수 있습니다. 또한, `d8` 또는 `chrome` 실행 파일은 클래스 정의와 관련된 생성된 컴파일 단위도 직접 포함합니다.

시각적으로 빌드 프로세스는 다음과 같습니다:

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Torque 도구

Torque를 위한 기본 도구 및 개발 환경 지원이 제공됩니다.

- Torque를 위한 [Visual Studio Code 플러그인](https://github.com/v8/vscode-torque)이 있으며, 이 플러그인은 사용자 정의 언어 서버를 사용해 정의로 이동 기능 등을 제공합니다.
- `.tq` 파일을 변경한 후 사용해야 하는 포매팅 도구가 있습니다: `tools/torque/format-torque.py -i <filename>`

## Torque와 관련된 빌드 문제 해결

이 내용을 알아야 하는 이유는 무엇입니까? Torque 파일이 기계 코드로 변환되는 과정을 이해하는 것은 Torque가 스냅샷에 포함된 이진 데이터로 번역되는 다양한 단계에서 각기 다른 문제(및 버그)가 발생할 수 있기 때문입니다:

- Torque 코드(즉, `.tq` 파일)에 구문 또는 의미적 오류가 있으면 Torque 컴파일러가 실패합니다. 이 단계에서 V8 빌드가 중단되며, 이후 빌드 단계에서 발견될 수 있는 다른 오류는 표시되지 않습니다.
- Torque 코드가 구문적으로 올바르고 Torque 컴파일러의 엄격한(다소) 의미론적 검사를 통과한 경우에도 `mksnapshot` 빌드가 실패할 수 있습니다. 이는 주로 `.tq` 파일에 제공된 외부 정의의 불일치로 인해 발생합니다. Torque 코드에서 `extern` 키워드로 표시된 정의는 필요한 기능의 정의가 C++에서 발견된다는 것을 Torque 컴파일러에 신호합니다. 현재로서는 `.tq` 파일의 `extern` 정의와 해당 `extern` 정의가 참조하는 C++ 코드 간의 연계가 느슨하며, Torque 컴파일 시간에 이러한 연계를 검증하지 않습니다. `extern` 정의가 `code-stub-assembler.h` 헤더 파일이나 다른 V8 헤더에서 액세스하는 기능과 일치하지 않거나(또는 가장 미묘한 경우에는 가리는 경우) C++ `mksnapshot` 빌드가 실패합니다.
- 심지어 `mksnapshot`가 성공적으로 빌드된 경우에도 실행 중에 실패할 수 있습니다. 예를 들어 Torque `static_assert`를 Turbofan이 확인할 수 없어 생성된 CSA 코드를 컴파일하지 못할 수 있습니다. 또한, 스냅샷 생성 중 실행되는 Torque 제공 내장 함수에 버그가 있을 수 있습니다. 예를 들어, Torque로 작성된 내장 함수 `Array.prototype.splice`는 기본 JavaScript 환경을 설정하기 위해 JavaScript 스냅샷 초기화 과정의 일부로 호출됩니다. 구현에 버그가 있는 경우, `mksnapshot` 실행 중 충돌이 발생합니다. `mksnapshot` 충돌 시, `--gdb-jit-full` 플래그를 함께 전달해 호출하는 것이 때로는 유용합니다. 이는 추가적인 디버그 정보를 생성해 `gdb` 스택 크롤에서 Torque 생성 내장 함수 이름과 같은 유용한 컨텍스트를 제공합니다.
- 물론 Torque로 작성된 코드가 `mksnapshot`를 통과하더라도 여전히 버그가 있거나 충돌할 수 있습니다. `torque-test.tq` 및 `torque-test.cc`에 테스트 케이스를 추가하는 것은 Torque 코드가 실제로 예상하는 대로 작동하는지 확인하는 좋은 방법입니다. Torque 코드가 `d8` 또는 `chrome`에서 충돌하는 경우 `--gdb-jit-full` 플래그는 다시 매우 유용합니다.

## `constexpr`: 컴파일 타임 대 런타임

Torque 빌드 프로세스를 이해하는 것은 Torque 언어의 핵심 기능 중 하나인 `constexpr`를 이해하는 데에도 중요합니다.

Torque는 Torque 코드에서 표현식을 런타임(즉, JavaScript를 실행하는 동안 V8 내장 함수가 실행될 때)에서 평가할 수 있도록 허용합니다. 반면 컴파일 타임(즉, Torque 빌드 프로세스의 일부로, V8 라이브러리와 `d8` 실행 파일이 생성되기 전)에서도 표현식을 실행할 수 있습니다.

Torque는 `constexpr` 키워드를 사용하여 표현식이 빌드 타임에서 평가되어야 함을 나타냅니다. 사용법은 [C++의 `constexpr`](https://en.cppreference.com/w/cpp/language/constexpr)과 유사합니다. C++에서 `constexpr` 키워드와 일부 구문을 차용한 것 외에도 Torque는 `constexpr`을 사용하여 컴파일 타임과 런타임 간의 평가 차이를 나타냅니다.

하지만 Torque의 `constexpr` 의미론에는 미묘한 차이가 있습니다. C++에서는 `constexpr` 표현식이 C++ 컴파일러에서 완전히 평가될 수 있습니다. Torque에서는 `constexpr` 표현식이 Torque 컴파일러에 의해 완전히 평가될 수는 없지만, 대신 `mksnapshot` 실행 시 완전히 평가될 수 있는 C++ 타입, 변수 및 표현식으로 매핑됩니다. Torque 작성자의 관점에서 `constexpr` 표현식은 런타임에서 실행되는 코드를 생성하지 않으므로 컴파일 타임이라는 의미는 있지만, 기술적으로 보면 Torque 외부의 C++ 코드인 `mksnapshot`에 의해 평가됩니다. 따라서 Torque에서는 `constexpr`이 본질적으로 “`mksnapshot`-타임”, 즉 “컴파일 타임”이 아니라는 의미입니다.

일반형과 결합하여 `constexpr`은 V8 개발자가 미리 예상할 수 있는 몇 가지 특정 세부 사항에서 서로 다른 매우 효율적인 전문화된 빌트인을 다수 생성하는 데 사용할 수 있는 강력한 Torque 도구입니다.

## 파일

Torque 코드는 개별 소스 파일로 패키지화됩니다. 각 소스 파일은 선언 시리즈로 구성되며, 이러한 선언은 선택적으로 네임스페이스 선언 내부에 감싸져 선언의 네임스페이스를 분리할 수 있습니다. 문법에 대한 다음 설명은 현재 최신 상태가 아닐 수 있습니다. 진위는 [Torque 컴파일러의 문법 정의](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar)에 있습니다. 이 정의는 컨텍스트 자유 문법 규칙을 사용하여 작성되었습니다.

Torque 파일은 선언의 시퀀스로 구성됩니다. 가능한 선언은 [`torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration)에서 나열됩니다.

## 네임스페이스

Torque 네임스페이스는 선언을 독립적인 네임스페이스에 있을 수 있도록 합니다. 이는 C++ 네임스페이스와 유사합니다. 다른 네임스페이스에서 자동으로 표시되지 않는 선언을 생성할 수 있습니다. 중첩할 수 있으며, 중첩된 네임스페이스 내부 선언은 자격 지정 없이 이를 포함하는 네임스페이스 내 선언에 접근할 수 있습니다. 네임스페이스 선언에 명시적으로 포함되지 않은 선언은 모든 네임스페이스에서 볼 수 있는 공유 전역 기본 네임스페이스에 포함됩니다. 네임스페이스는 여러 파일에서 정의될 수 있도록 다시 열릴 수 있습니다.

예를 들어:

```torque
macro IsJSObject(o: Object): bool { … }  // 기본 네임스페이스

namespace array {
  macro IsJSArray(o: Object): bool { … }  // 배열 네임스페이스
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // 확인, 글로벌 네임스페이스가 여기에서 보임
    IsJSArray(o);  // 오류, 이 네임스페이스에서 보이지 않음
    array::IsJSArray(o);  // 확인, 명시적 네임스페이스 자격
  }
  // …
};

namespace array {
  // 확인, 네임스페이스가 다시 열림.
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## 선언

### 타입

Torque는 강력한 타입 시스템을 가지고 있습니다. 이 타입 시스템은 제공하는 보안성과 정확성 보증의 기초가 됩니다.

많은 기본 타입에 대해 Torque는 실제로 그 타입에 대해 많이 알지 못합니다. 대신 많은 타입은 명시적인 타입 매핑을 통해 `CodeStubAssembler` 및 C++ 타입과 느슨하게 연결되어 있으며, 이러한 매핑의 정확성을 C++ 컴파일러에게 의존하도록 합니다. 이러한 타입은 추상 타입으로 실현됩니다.

#### 추상 타입

Torque의 추상 타입은 C++ 컴파일 타임 및 CodeStubAssembler 런타임 값에 직접 매핑됩니다. 선언은 이름과 C++ 타입과의 관계를 지정합니다.

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName`는 추상 타입의 이름을 지정하며, `ExtendsDeclaration`은 선언된 타입이 상속하는 타입을 선택적으로 지정합니다. `GeneratesDeclaration`은 선택적으로 문자열 리터럴을 지정하며, 이 문자열 리터럴은 런타임 값의 타입을 포함하기 위해 `CodeStubAssembler` 코드에서 사용되는 C++ `TNode` 타입에 해당합니다. `ConstexprDeclaration`은 빌드 타임(`mksnapshot`-타임) 평가를 위한 Torque 타입의 `constexpr` 버전에 해당하는 C++ 타입을 지정하는 문자열 리터럴입니다.

다음은 Torque의 31 및 32비트 부호 있는 정수 타입에 대한 `base.tq`에서의 예입니다:

```torque
type int32 generates &apos;TNode<Int32T>&apos; constexpr &apos;int32_t&apos;;
type int31 extends int32 generates &apos;TNode<Int32T>&apos; constexpr &apos;int31_t&apos;;
```

#### 유니온 타입

유니온 타입은 값이 여러 가능한 타입 중 하나에 속한다는 것을 나타냅니다. 우리는 태그가 있는 값에 대해 유니온 타입만 허용하며, 런타임에서 맵 포인터를 사용하여 구별할 수 있습니다. 예를 들어, JavaScript 숫자는 Smi 값이거나 할당된 `HeapNumber` 객체입니다.

```torque
type Number = Smi | HeapNumber;
```

유니온 타입은 다음과 같은 동등성을 만족합니다:

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A` (만약 `B`가 `A`의 하위 타입인 경우)

태그가 지정된 타입으로만 유니온 타입을 형성하는 것이 허용되는데, 이는 런타임에서 태그가 없는 타입을 구별할 수 없기 때문입니다.

유니온 타입을 CSA로 매핑할 때, 유니온 타입의 모든 타입에서 가장 특화된 공통 상위 타입을 선택합니다. 단, `Number`와 `Numeric`은 해당되는 CSA 유니온 타입으로 매핑됩니다.

#### 클래스 타입

클래스 타입은 Torque 코드에서 V8 GC 힙에 구조적 객체를 정의, 할당 및 조작할 수 있도록 합니다. 각 Torque 클래스 타입은 C++ 코드에서 HeapObject의 하위 클래스와 대응해야 합니다. V8의 C++ 구현과 Torque 구현 간에 보일러플레이트 객체 액세스 코드를 유지하는 비용을 최소화하기 위해 가능한 경우 (적절한 경우) Torque 클래스 정의를 사용하여 필요한 C++ 객체 액세스 코드를 생성합니다. 이를 통해 C++과 Torque를 수동으로 동기화하는 번거로움을 줄입니다.

```grammar
ClassDeclaration :
  ClassAnnotation* extern opt transient opt class IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt {
    ClassMethodDeclaration*
    ClassFieldDeclaration*
  }

ClassAnnotation :
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( NumericLiteral )
  @apiExposedInstanceTypeValue ( NumericLiteral )

ClassMethodDeclaration :
  transitioning opt IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock

ClassFieldDeclaration :
  ClassFieldAnnotation* weak opt const opt FieldDeclaration;

ClassFieldAnnotation :
  @noVerifier
  @if ( Identifier )
  @ifnot ( Identifier )

FieldDeclaration :
  Identifier ArraySpecifier opt : Type ;

ArraySpecifier :
  [ Expression ]
```

클래스 예제:

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern`은 이 클래스가 Torque에서 정의되지 않고 C++에서 정의된다는 것을 나타냅니다.

클래스의 필드 선언은 암묵적으로 CodeStubAssembler에서 사용할 수 있는 필드 getter 및 setter를 생성합니다, 예를 들어:

```cpp
// TorqueGeneratedExportedMacrosAssembler에서:
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

위에서 설명한 것처럼 Torque 클래스에서 정의된 필드는 C++ 코드로 변환되어 중복 보일러플레이트 액세서 및 힙 방문자 코드를 제거합니다. JSProxy의 수동 정의는 아래와 같이 생성된 클래스 템플릿을 상속받아야 합니다:

```cpp
// js-proxy.h 파일에서:
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // Torque에서 생성된 것 외에 클래스가 필요한 것들이 여기 들어갑니다...

  // 마지막에, public/private을 다루기 때문에:
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// js-proxy-inl.h 파일에서:
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

생성된 클래스는 캐스트 함수, 필드 액세스 함수, 필드 오프셋 상수(`kTargetOffset` 및 `kHandlerOffset` 등)를 제공합니다. 이는 클래스 시작점부터 각 필드의 바이트 오프셋을 나타냅니다.

##### 클래스 타입 주석

일부 클래스는 위 예제에서 보여준 상속 패턴을 사용할 수 없습니다. 그럴 경우, 클래스는 `@doNotGenerateCppClass`를 지정하여 직접 상위 클래스 타입을 상속하고 Torque에서 생성된 필드 오프셋 상수를 위한 매크로를 포함할 수 있습니다. 이러한 클래스는 고유의 액세서와 캐스트 함수를 구현해야 합니다. 매크로 사용은 다음과 같습니다:

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // 클래스의 나머지는 생략...
}
```

`@generateBodyDescriptor`는 Torque가 생성된 클래스 내에 garbage collector가 객체를 방문하는 방식을 나타내는 클래스 `BodyDescriptor`를 생성하도록 합니다. 그렇지 않으면 C++ 코드가 자체 객체 방문을 정의하거나 기존 패턴(예: `Struct`를 상속받고 `STRUCT_LIST`에 클래스를 포함하면 클래스가 태그값만 포함해야 하는 것으로 간주됨)을 사용해야 합니다.

`@generatePrint` 주석이 추가되면, 생성기는 Torque 레이아웃에 의해 정의된 것처럼 필드 값을 출력하는 C++ 함수를 구현합니다. JSProxy 예를 사용하는 경우 시그니처는 `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)`이며, 이는 `JSProxy`에서 상속받을 수 있습니다.

Torque 컴파일러는 모든 `extern` 클래스에 대해 검증 코드를 생성하며, 클래스가 `@noVerifier` 주석을 사용해 제외하지 않는 한 적용됩니다. 예를 들어, 위에서 사용된 JSProxy 클래스 정의는 Torque 타입 정의에 따라 필드가 유효한지 확인하는 C++ 메서드 `void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)`를 생성합니다. 또한, `TorqueGeneratedClassVerifiers`에 있는 정적 함수와 연결된 생성된 클래스의 메서드, `TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`도 생성됩니다. 클래스에 대한 추가 검증을 추가하고 싶은 경우(숫자의 허용 값 범위, 필드 `bar`가 null이 아닌 경우 필드 `foo`가 true 이어야 하는지 등), C++ 클래스에 `DECL_VERIFIER(JSProxy)`를 추가하고 이를 `src/objects-debug.cc`에서 구현합니다. 이러한 맞춤 검증기의 첫 번째 단계는 생성된 검증기, 예: `TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`를 호출하는 것입니다. (모든 GC 전후에 이러한 검증을 실행하려면, `v8_enable_verify_heap = true`로 빌드하고 `--verify-heap` 옵션으로 실행하세요.)

`@abstract`는 해당 클래스 자체가 인스턴스화되지 않으며 자체 인스턴스 타입을 갖지 않는다는 것을 나타냅니다. 이 클래스에 논리적으로 속하는 인스턴스 타입은 자식 클래스의 인스턴스 타입입니다.

`@export` 주석은 Torque 컴파일러가 구체적인 C++ 클래스(예: 위의 예제에서 `JSProxy`)를 생성하도록 합니다. 이는 Torque가 생성한 코드 외에 C++ 기능을 추가하지 않으려는 경우에만 유용합니다. `extern`과 함께 사용할 수 없습니다. Torque 내에서만 정의되고 사용하는 클래스의 경우, `extern`이나 `@export`를 사용하지 않는 것이 가장 적합합니다.

`@hasSameInstanceTypeAsParent`는 부모 클래스와 동일한 인스턴스 타입을 가지지만 일부 필드 이름을 변경하거나 또는 다른 맵을 가질 수 있는 클래스를 나타냅니다. 이러한 경우 부모 클래스는 추상적이지 않습니다.

`@highestInstanceTypeWithinParentClassRange`, `@lowestInstanceTypeWithinParentClassRange`, `@reserveBitsInInstanceType`, 및 `@apiExposedInstanceTypeValue` 주석은 모두 인스턴스 타입 생성에 영향을 미칩니다. 일반적으로 이러한 주석은 무시해도 괜찮습니다. Torque는 모든 클래스에 대해 `v8::internal::InstanceType` 열거형에서 고유한 값을 할당하여 V8이 런타임에 JS 힙의 모든 객체의 타입을 판별할 수 있도록 합니다. Torque의 인스턴스 타입 할당은 거의 대부분의 경우 충분하지만, 특정 클래스에 대해 빌드 간에 안정적인 인스턴스 타입이 필요하거나, 슈퍼클래스에 할당된 인스턴스 타입 범위의 시작이나 끝에 위치하거나, Torque 외부에서 정의할 수 있는 예약 값의 범위일 경우 몇 가지 예외가 존재합니다.

##### 클래스 필드

위의 예제와 같이 간단한 값뿐만 아니라 클래스 필드는 인덱스된 데이터를 포함할 수 있습니다. 다음은 예제입니다:

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

이는 `CoverageInfo` 인스턴스의 크기가 `slot_count` 데이터에 따라 달라진다는 것을 의미합니다.

C++과 달리 Torque는 필드 간에 패딩을 암시적으로 추가하지 않습니다. 대신 필드가 올바르게 정렬되지 않은 경우 실패하고 오류를 발생시킵니다. Torque는 강(Strong) 필드, 약(Weak) 필드, 스칼라(Scalar) 필드가 서로 같은 카테고리의 다른 필드와 함께 필드 순서에 배치되도록 요구합니다.

`const`는 필드가 런타임에 수정될 수 없음을 나타냅니다(적어도 쉽게는 수정되지 않습니다. Torque는 필드를 설정하려고 하면 컴파일을 실패시킵니다). 이는 길이 필드에 적합한 방법으로, 길이 필드는 매우 신중하게 재설정되어야 하며 해제된 공간을 해제하고 표시 스레드와의 데이터 레이스를 유발할 수 있습니다.
실제로, Torque는 인덱스 데이터에 사용되는 길이 필드가 `const`여야 한다고 요구합니다.

`weak`는 필드 선언의 시작 부분에 있으면, 필드가 약한 참조의 사용자 정의 형태임을 나타냅니다. 이는 약한 필드를 위한 `MaybeObject` 태그 메커니즘과 반대됩니다.
추가적으로 `weak`는 일부 사용자 정의 `BodyDescriptor`에서 사용하는 `kEndOfStrongFieldsOffset` 및 `kStartOfWeakFieldsOffset`과 같은 상수 생성에 영향을 미치며, 현재는 여전히 `weak`로 표시된 필드를 그룹화해야 합니다. Torque가 모든 `BodyDescriptor`를 생성할 수 있게 되면 이 키워드를 제거하는 것을 목표로 하고 있습니다.

필드에 저장된 객체가 `MaybeObject` 스타일의 약한 참조(두 번째 비트가 설정된)가 될 수 있는 경우, 타입에서 `Weak<T>`를 사용해야 하며 `weak` 키워드를 사용하면 **안 됩니다**. 그러나 여전히 이 규칙의 예외는 존재합니다. 예를 들어, `Map`의 이 필드는 강력한 타입과 약한 타입을 모두 포함할 수 있으며 약한 섹션에 포함되도록 `weak`로 표시됩니다:

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if`와 `@ifnot`는 일부 빌드 구성에서는 포함되어야 하고 다른 경우 포함되지 않아야 하는 필드를 표시합니다. 이들은 `src/torque/torque-parser.cc`의 `BuildFlags` 목록에서 값을 수락합니다.

##### Torque 외부에서 전적으로 정의된 클래스

일부 클래스는 Torque에서 정의되지 않지만 Torque는 모든 클래스를 알아야 합니다. 이는 Torque가 인스턴스 타입 지정의 책임이 있기 때문입니다. 이 경우, 클래스는 본문 없이 선언될 수 있으며 Torque는 인스턴스 타입만 생성합니다. 예제:

```torque
extern class OrderedHashMap extends HashTable;
```

#### Shapes

`shape`를 정의하는 것은 `class`를 정의하는 것과 동일하지만 `class` 대신 `shape` 키워드를 사용합니다. `shape`는 `JSObject`의 하위 타입으로, 객체 내 속성의 특정 시점 배열(사양상의 "데이터 속성"으로, "내부 슬롯"이 아님)을 나타냅니다. `shape`는 자체 인스턴스 타입을 가지지 않습니다. 특정 `shape`를 가진 객체는 언제든지 변경되어 그 `shape`를 잃을 수 있습니다. 객체가 사전(Dictionary) 모드로 전환되어 모든 속성을 별도의 백업 스토어로 이동시킬 수 있기 때문입니다.

#### Structs

`struct`는 데이터를 쉽게 함께 전달할 수 있도록 하는 데이터 모음입니다. (클래스 `Struct`와는 전혀 관계가 없습니다.) 클래스처럼 매크로를 포함하여 데이터를 조작할 수 있습니다. 그러나 클래스와 달리 제네릭을 지원합니다. 문법은 클래스와 유사하게 보입니다:

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Struct 주석

`@export`로 표시된 모든 `struct`는 생성된 파일 `gen/torque-generated/csa-types.h`에 예측 가능한 이름으로 포함됩니다. 이름은 `TorqueStruct`가 앞에 붙게 되어, 예를 들어 `PromiseResolvingFunctions`는 `TorqueStructPromiseResolvingFunctions`가 됩니다.

`struct` 필드는 `const`로 표시할 수 있으며, 이는 해당 필드에 쓰기가 금지됨을 의미합니다. 그러나 전체 `struct`는 여전히 덮어쓸 수 있습니다.

##### 클래스 필드로서의 Struct

Struct는 클래스 필드의 유형으로 사용할 수 있습니다. 이 경우, 클래스 내에서 정렬된 데이터로 표현됩니다(그렇지 않으면, Struct는 정렬 요구 사항이 없습니다). 이는 클래스 내 색인 필드에 특히 유용합니다. 예를 들어, `DescriptorArray`는 세 값으로 이루어진 Struct 배열을 포함합니다:

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### 참조와 슬라이스

`Reference<T>`와 `Slice<T>`는 힙 객체 내 데이터를 가리키는 포인터를 나타내는 특수 Struct입니다. 둘 다 객체와 오프셋을 포함하며, `Slice<T>`는 추가로 길이를 포함합니다. 이 Struct를 직접 구성하는 대신, 특수 문법을 사용할 수 있습니다: `&o.x`는 객체 `o` 내 필드 `x`에 대한 `Reference`를 생성하거나, `x`가 색인 필드인 경우 데이터에 대한 `Slice`를 생성합니다. 참조와 슬라이스 모두 상수 및 변경 가능한 버전이 있습니다. 참조의 경우 이렇게 작성됩니다: `&T`와 `const &T`는 각각 변경 가능 및 상수 참조를 나타냅니다. 변경 가능성은 그들이 가리키는 데이터에 관한 것이며 전역적으로 유지되지 않을 수 있습니다. 즉, 변경 가능한 데이터에 대한 상수 참조를 생성할 수 있습니다. 슬라이스에는 타입에 대한 특수 문법이 없으며, 두 버전은 각각 `ConstSlice<T>`와 `MutableSlice<T>`로 작성됩니다. 참조는 C++와 일관되게 `*` 또는 `->`로 역참조할 수 있습니다.

태그되지 않은 데이터에 대한 참조와 슬라이스는 힙 외부 데이터도 가리킬 수 있습니다.

#### 비트필드 Struct

`bitfield struct`는 단일 숫자 값에 패킹된 숫자 데이터를 모은 것을 의미합니다. 문법은 일반 `struct`와 유사하며 각 필드에 대한 비트 수를 추가로 표시합니다.

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

비트필드 Struct(또는 기타 숫자 데이터)가 `Smi` 내에 저장되면 `SmiTagged<T>` 유형을 사용하여 표현할 수 있습니다.

#### 함수 포인터 유형

함수 포인터는 기본 ABI를 보장하기 때문에 Torque에서 정의된 빌트인만 가리킬 수 있습니다. 이는 바이너리 코드 크기를 줄이는 데 특히 유용합니다.

함수 포인터 유형은 익명으로 작성되며(C와 유사), 타입 별칭에 바인딩될 수 있습니다(C의 `typedef`와 유사).

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### 특수 유형

`void`와 `never`라는 키워드로 표시된 두 가지 특수 유형이 있습니다. `void`는 값을 반환하지 않는 호출 가능한 것에 대한 반환 유형으로 사용되며, `never`는 실제로 반환되지 않는 호출 가능한 것(즉, 예외 경로를 통해서만 종료되는 경우)의 반환 유형으로 사용됩니다.

#### 일시적 유형

V8에서는 힙 객체가 런타임에 레이아웃을 변경할 수 있습니다. 타입 시스템에서 레이아웃 변경 또는 기타 임시 가정을 표현하기 위해 Torque는 “일시적 유형” 개념을 지원합니다. 추상 유형을 선언할 때 키워드 `transient`를 추가하면 일시적 유형으로 표시됩니다.

```torque
// JSArray 맵을 가진 HeapObject이며, 전역 NoElementsProtector가 무효화되지 않을 때
// 빠르게 채워진 요소 또는 빠르게 홀로 남은 요소를 가진 배열
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

예를 들어, `FastJSArray`의 경우 배열이 사전 요소로 변경되거나 전역 `NoElementsProtector`가 무효화되면 일시적 유형이 무효화됩니다. Torque에서 이를 표현하기 위해 잠재적으로 이를 수행할 수 있는 모든 호출 가능 객체를 `transitioning`으로 주석 처리하세요. 예를 들어, JavaScript 함수를 호출하는 것은 임의의 JavaScript를 실행할 수 있기 때문에 `transitioning`입니다.

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

이것이 형식 시스템에서 제어되는 방식은 전환 작업 중에 일시적인 형식의 값을 액세스하는 것이 불법이라는 것입니다.

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) otherwise Bailout;
Call(f, Undefined);
return fastArray; // 형식 오류: fastArray는 여기서 유효하지 않습니다.
```

#### 열거형

열거형은 상수 집합을 정의하고 이를 C++의 열거형 클래스와 유사한 이름으로 그룹화하는 수단을 제공합니다.
`enum` 키워드로 선언이 시작되며, 다음 구문 구조를 따릅니다:

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

기본적인 예제는 다음과 같습니다:

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

이 선언은 새로운 형식 `LanguageMode`를 정의하며, `extends` 절은 열거형 값을 표현하는 데 사용되는 런타임 형식을 지정합니다. 이 예에서 `Smi`는 `TNode<Smi>`를 생성합니다. `constexpr LanguageMode`는 생성된 CSA 파일에서 기본 이름을 대체하는 `constexpr` 절이 열거형에 지정되지 않았기 때문에 `LanguageMode`로 변환됩니다. `extends` 절이 생략되면 Torque는 형식의 `constexpr` 버전만 생성합니다. `extern` 키워드는 이 열거형의 C++ 정의가 있다는 것을 Torque에 알려줍니다. 현재는 `extern` 열거형만 지원됩니다.

Torque는 열거형의 각 항목에 대해 별도의 형식과 상수를 생성합니다. 이는 열거형 이름과 일치하는 네임스페이스 안에 정의됩니다. 항목의 `constexpr` 형식을 열거형 형식으로 변환하기 위한 `FromConstexpr<>`의 필요한 특수화가 생성됩니다. C++ 파일에서 생성된 항목 값은 `<enum-constexpr>::<entry-name>` 형식입니다. 여기서 `<enum-constexpr>`는 열거형에 대해 생성된 `constexpr` 이름입니다. 위의 예에서는 `LanguageMode::kStrict`와 `LanguageMode::kSloppy`가 해당됩니다.

Torque의 열거형은 `typeswitch` 구조와 잘 조화를 이루며, 각 값은 별도의 형식을 사용하여 정의됩니다:

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

만약 C++ 열거형 정의가 `.tq` 파일에서 사용된 값보다 더 많은 값을 포함한다면, Torque는 이를 알고 있어야 합니다. 이는 마지막 항목 뒤에 `...`를 추가하여 열거형을 '열림'으로 선언함으로써 수행됩니다. 예를 들어 Torque에서 일부 옵션만 사용할 수 있는/사용되는 `ExtractFixedArrayFlag`를 고려해 봅시다:

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### 호출 가능 객체

호출 가능 객체는 JavaScript 또는 C++의 함수처럼 개념적으로 동작하지만 CSA 코드 및 V8 런타임과 유용하게 상호작용할 수 있는 추가 의미를 가집니다. Torque는 여러 유형의 호출 가능 객체를 제공합니다: `macro`, `builtin`, `runtime`, 및 `intrinsic`.

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### `macro` 호출 가능 객체

Macro는 생성된 CSA를 생성하는 C++ 코드 조각과 관련된 호출 가능 객체입니다. `macro`는 Torque에서 완전히 정의되거나 `extern`로 표시될 수 있습니다. 후자의 경우 구현은 CodeStubAssembler 클래스에서 수동으로 작성된 CSA 코드로 제공되어야 합니다. 개념적으로 `macro`는 호출 사이트에서 인라인화된 CSA 코드 조각처럼 생각하면 유용합니다.

`macro` 선언은 Torque에서 다음과 같은 형식을 취합니다:

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

모든 비 `extern` Torque `macro`는 `StatementBlock` 본문을 사용하여 해당 네임스페이스의 `Assembler` 클래스에서 생성된 CSA를 생성합니다. 이 코드는 일명 `code-stub-assembler.cc`에서 찾을 수 있는 다른 코드와 매우 비슷합니다. 다만, 기계적으로 생성되므로 읽기 어려운 특징이 있습니다. `extern`으로 표시된 `macro`는 Torque에서 본문이 없으며, Torque에서 사용할 수 있도록 수동 작성된 C++ CSA 코드의 인터페이스만 제공합니다.

`macro` 정의는 암묵적 및 명시적 매개변수, 선택적 반환 형식 및 선택적 레이블을 지정합니다. 매개변수 및 반환 형식은 아래에서 자세히 논의되겠지만, 지금은 TypeScript의 매개변수처럼 작동한다는 것을 아는 것으로 충분합니다. 이는 TypeScript 문서의 함수 형식 섹션에서 [여기](https://www.typescriptlang.org/docs/handbook/functions.html)에서 논의되었습니다.

라벨은 `macro`로부터 예외적으로 탈출하기 위한 기제입니다. 이것은 CSA 라벨과 1:1로 매핑되며, `macro`를 위해 생성된 C++ 메소드에 `CodeStubAssemblerLabels*` 타입의 매개변수로 추가됩니다. 그들의 정확한 의미는 아래에서 논의되지만, `macro` 선언의 목적에 맞게, 라벨의 쉼표로 구분된 목록은 `labels` 키워드와 함께 선택적으로 제공되며, `macro`의 매개변수 목록 및 반환 타입 뒤에 배치됩니다.

`base.tq`에서 외부 및 Torque로 정의된 `macro`의 예는 다음과 같습니다:

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): never
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(implicit context: Context)(o: Object):
    never
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) otherwise NotTaken, Taken;
}
```

#### `builtin` 호출 가능한 함수

`builtin`은 Torque에서 완전히 정의되거나 `extern`으로 표시될 수 있다는 점에서 `macro`와 유사합니다. Torque 기반의 `builtin`의 경우, `builtin`의 본문은 V8 내장 기능을 생성하기 위해 사용되며, 모든 다른 V8 내장 기능과 마찬가지로 호출할 수 있고, 또한 `builtin-definitions.h`에 관련 정보를 자동으로 추가합니다. `macro`와 마찬가지로 Torque에서 `extern`으로 표시된 Torque `builtin`은 Torque 기반 본문이 없으며 기존 V8 `builtin`에 대한 인터페이스를 제공하기만 해서 Torque 코드에서 사용할 수 있습니다.

Torque에서의 `builtin` 선언은 다음과 같은 형식을 가집니다:

```grammar
MacroDeclaration :
  transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitParametersOrVarArgs ReturnType opt StatementBlock
  extern transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Torque 빌트인의 코드는 단 하나의 복사본만 있으며, 이는 생성된 빌트인 코드 객체 내부에 존재합니다. `macro`와 달리 Torque 코드에서 `builtin`이 호출될 때 CSA 코드가 호출지점에 인라인되지 않고 대신 빌트인으로의 호출이 생성됩니다.

`builtin`은 라벨을 가질 수 없습니다.

`builtin` 구현을 코딩 중이라면, `builtin` 내 마지막 호출인 경우에 한해 [tailcall](https://en.wikipedia.org/wiki/Tail_call)을 `builtin`이나 런타임 함수로 제작할 수 있습니다. 이 경우 컴파일러는 새로운 스택 프레임 생성이 필요 없을 수도 있습니다. 호출 앞에 `tail`을 추가하면 됩니다, 예: `tail MyBuiltin(foo, bar);`.

#### `runtime` 호출 가능한 함수

`runtime`은 Torque에서 외부 기능에 대한 인터페이스를 노출할 수 있다는 점에서 `builtin`과 유사합니다. 그러나 `runtime`으로 제공되는 기능은 항상 CSA 대신 V8에서 표준 runtime 콜백으로 구현되어야 합니다.

Torque에서의 `runtime` 선언은 다음 형식을 가집니다:

```grammar
MacroDeclaration :
  extern transitioning opt runtime IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

`extern runtime`으로 지정된 <i>IdentifierName</i>은 <code>Runtime::k<i>IdentifierName</i></code>로 지정된 런타임 함수에 해당됩니다.

`builtin`과 마찬가지로, `runtime`은 라벨을 가질 수 없습니다.

적합한 경우 런타임 함수 호출에서도 tailcall을 사용할 수 있습니다. 호출 앞에 `tail` 키워드를 포함하면 됩니다.

런타임 함수 선언은 종종 `runtime`이라는 네임스페이스에 배치됩니다. 이는 동일한 이름의 빌트인과 구분되며, 호출지점에서 런타임 함수를 호출하고 있다는 것을 쉽게 확인할 수 있습니다. 이를 의무화해야 할 필요가 있을 수 있습니다.

#### `intrinsic` 호출 가능한 함수

`intrinsic`은 Torque에서 구현될 수 없는 내부 기능에 대한 액세스를 제공하는 내장 호출 가능한 함수입니다. 이는 Torque에서 선언되지만 정의되지 않으며, 구현은 Torque 컴파일러에 의해 제공됩니다. `intrinsic` 선언은 다음의 문법을 사용합니다:

```grammar
IntrinsicDeclaration :
  intrinsic % IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt ;
```

대부분의 경우, “사용자” Torque 코드는 직접 `intrinsic`을 사용하는 일이 드물어야 합니다.
다음은 지원되는 일부 intrinsic입니다:

```torque
// %RawObjectCast는 Object에서 Object의 하위 타입으로 정밀한 테스트 없이 다운캐스트합니다.
// Object가 실제로 대상 타입인지 엄격히 테스트하지 않습니다.
// RawObjectCast는 Torque 코드의 적절한 type assert()로 시작된 Torque 기반 UnsafeCast 연산자 외에는 절대 사용되어서는 안됩니다 (거의 사용되지 않아야 합니다).
intrinsic %RawObjectCast<A: type>(o: Object): A;

// %RawPointerCast는 RawPtr에서 RawPtr의 하위 타입으로 엄격한 테스트 없이 다운캐스트합니다.
intrinsic %RawPointerCast<A: type>(p: RawPtr): A;

// %RawConstexprCast는 하나의 컴파일 시간 상수 값을 다른 값으로 변환합니다.
// 소스 및 대상 타입은 모두 `constexpr`이어야 합니다.
// %RawConstexprCast는 생성된 C++ 코드에서 static_cast로 변환됩니다.
intrinsic %RawConstexprCast<To: type, From: type>(f: From): To;

// %FromConstexpr는 constexpr 값을 non-constexpr 값으로 변환합니다.
// 현재 다음과 같은 non-constexpr 타입으로의 변환만 지원됩니다: Smi, Number, String, uintptr, intptr, int32
intrinsic %FromConstexpr<To: type, From: type>(b: From): To;

// %Allocate는 V8의 GC 힙에서 크기 `size`의 초기화되지 않은 객체를 할당하고
// 생성된 객체 포인터를 "reinterpret cast" 합니다.
// 설정된 Torque 클래스는 생성자가 이후에
// 표준 필드 접근 연산자를 사용하여 객체를 초기화할 수 있도록 허용합니다.
// 이 intrinsic은 Torque 코드에서 호출되어서는 안 됩니다. 이는
// 'new' 연산자 디슈가링 시 내부적으로 사용됩니다.
intrinsic %Allocate<Class: type>(size: intptr): Class;
```

`builtin` 및 `runtime`과 마찬가지로 `intrinsic`은 라벨을 가질 수 없습니다.

### 명시적 매개변수

Torque로 정의된 Callable, 예: Torque `macro` 및 `builtin`은 명시적 매개변수 목록을 가집니다. 이는 TypeScript 함수 매개변수 목록과 유사한 구문을 사용하여 식별자 및 유형 페어의 목록입니다. 단, Torque는 선택적 매개변수 또는 기본 매개변수를 지원하지 않습니다. 또한 Torque로 구현된 `builtin`은 선택적으로 V8의 내부 JavaScript 호출 규칙(예: `javascript` 키워드로 표시됨)을 사용하는 경우 나머지 매개변수를 지원할 수 있습니다.

```grammar
ExplicitParameters :
  ( ( IdentifierName : TypeIdentifierName ) list* )
  ( ( IdentifierName : TypeIdentifierName ) list+ (, ... IdentifierName ) opt )
```

예를 들어:

```torque
javascript builtin ArraySlice(
    (implicit context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### 암시적 매개변수

Torque Callable은 [Scala의 암시적 매개변수](https://docs.scala-lang.org/tour/implicit-parameters.html)와 유사한 것을 사용하여 암시적 매개변수를 지정할 수 있습니다:

```grammar
ImplicitParameters :
  ( implicit ( IdentifierName : TypeIdentifierName ) list* )
```

구체적으로: `macro`는 명시적 매개변수 외에 암시적 매개변수를 선언할 수 있습니다:

```torque
macro Foo(implicit context: Context)(x: Smi, y: Smi)
```

CSA로 매핑할 때, 암시적 매개변수와 명시적 매개변수는 동일하게 처리되며 결합된 매개변수 목록을 형성합니다.

암시적 매개변수는 호출지에서 언급되지 않지만 대신 암시적으로 전달됩니다: `Foo(4, 5)`. 이를 위해 `Foo(4, 5)`는 `context`라는 이름의 값을 제공하는 컨텍스트에서 호출되어야 합니다. 예:

```torque
macro Bar(implicit context: Context)() {
  Foo(4, 5);
}
```

Scala와 달리 암시적 매개변수의 이름이 동일하지 않을 경우 이를 금지합니다.

오버로드 해상도가 혼란스러운 동작을 유발할 수 있으므로 암시적 매개변수가 오버로드 해상도에 영향을 미치지 않도록 합니다. 즉, 오버로드 세트의 후보를 비교할 때 호출 사이트에서 사용 가능한 암시적 바인딩을 고려하지 않습니다. 단일 최상의 오버로드를 찾은 후 암시적 매개변수에 대한 암시적 바인딩이 사용 가능한지 확인합니다.

암시적 매개변수를 명시적 매개변수의 왼쪽에 두는 것은 Scala와 다르지만 `context` 매개변수를 먼저 두는 CSA의 기존 컨벤션에 더 잘 맞습니다.

#### `js-implicit`

Torque에서 정의된 JavaScript 연결을 가진 builtin의 경우 `js-implicit` 키워드를 사용해야 합니다. 인수는 호출 규칙의 다음 네 가지 구성 요소로 제한됩니다:

- context: `NativeContext`
- receiver: `JSAny` (JavaScript의 `this`)
- target: `JSFunction` (JavaScript의 `arguments.callee`)
- newTarget: `JSAny` (JavaScript의 `new.target`)

모두 선언할 필요는 없으며 사용하려는 것만 선언하면 됩니다. 예를 들어, `Array.prototype.shift`에 대한 코드는 다음과 같습니다:

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

`context` 인수가 `NativeContext`라는 점에 주목하십시오. 이는 V8의 builtin이 항상 네이티브 컨텍스트를 클로저에 포함한다는 점 때문입니다. js-implicit 규칙에서 이를 인코딩하면 프로그래머가 함수 컨텍스트에서 네이티브 컨텍스트를 로드하는 작업을 제거할 수 있습니다.

### 오버로드 해상도

Torque `macro` 및 연산자(`macro`의 별칭)는 인수 유형 오버로드를 허용합니다. 오버로드 규칙은 C++의 규칙에 영감을 받아 결정됩니다: 오버로드는 모든 대안보다 엄격히 더 나은 경우 선택됩니다. 이는 적어도 하나의 매개변수에서 엄격히 더 나아야 하며, 다른 모든 매개변수에서 더 나쁘지 않거나 동등하게 좋아야 함을 의미합니다.

두 오버로드의 해당 매개변수 쌍을 비교할 때…

- …동등하게 좋은 것으로 간주됩니다. 만약:
    - 두 매개변수 유형이 동일할 때;
    - 두 유형 모두 암시적 변환을 요구할 때.
- …하나는 더 좋은 것으로 간주됩니다. 만약:
    - 하나가 다른 유형의 엄격한 하위 타입일 때;
    - 하나는 암시적 변환을 요구하지 않지만 다른 하나는 요구할 때.

어떤 오버로드도 모든 대안보다 엄격히 더 낫지 않을 경우 컴파일 오류가 발생합니다.

### 지연 블록

문장 블록은 선택적으로 `deferred`로 표시될 수 있으며, 이는 해당 블록이 덜 자주 진입된다는 신호를 컴파일러에 전달합니다. 컴파일러는 이러한 블록들을 함수의 끝에 배치하여 비연기(deferred가 아닌) 코드 영역의 캐시 지역성을 개선할 수 있습니다. 예를 들어, `Array.prototype.forEach` 구현 코드에서 우리는 "빠른" 경로에 남아 있을 것으로 예상하며, 드물게 bailout 케이스를 취합니다:

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

다음은 또 다른 예제로, 사전(dictionary) 요소 케이스가 연기로 표시되어 더 가능성이 높은 케이스를 위한 코드 생성을 개선한 경우입니다 (`Array.prototype.join` 구현에서):

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <etc>...
```

## CSA 코드를 Torque로 이식하기

[`Array.of`를 이식한 패치](https://chromium-review.googlesource.com/c/v8/v8/+/1296464)는 CSA 코드를 Torque로 이식하는 최소한의 예제를 제공합니다.
