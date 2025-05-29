---
title: &apos;V8 임베딩 시작하기&apos;
description: &apos;이 문서는 주요 V8 개념을 소개하고 V8 코드로 시작하는 데 도움이 되는 “헬로 월드” 예제를 제공합니다.&apos;
---
이 문서는 주요 V8 개념을 소개하고 V8 코드로 시작하는 데 도움이 되는 “헬로 월드” 예제를 제공합니다.

## 대상

이 문서는 C++ 애플리케이션 내에 V8 자바스크립트 엔진을 임베딩하려는 C++ 프로그래머를 대상으로 합니다. 이를 통해 사용자 애플리케이션의 C++ 객체와 메서드를 자바스크립트에서 사용할 수 있도록 하고, 자바스크립트 객체와 기능을 C++ 애플리케이션에서 사용할 수 있도록 합니다.

## 헬로 월드

자바스크립트 문장을 문자열 인수로 받아 이를 자바스크립트 코드로 실행하고 표준 출력에 결과를 출력하는 [헬로 월드 예제](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc)를 살펴봅시다.

먼저 몇 가지 주요 개념들:

- 격리(isolate)는 자체 힙을 가진 VM 인스턴스입니다.
- 로컬 핸들은 객체를 가리키는 포인터입니다. 모든 V8 객체는 핸들을 사용하여 접근합니다. 이는 V8 가비지 컬렉터가 작동하는 방식 때문에 필요합니다.
- 핸들 범위(handle scope)는 핸들을 포함하는 컨테이너로 생각할 수 있습니다. 핸들을 더 이상 사용하지 않을 때 각각을 개별적으로 삭제하는 대신 해당 범위를 삭제하면 됩니다.
- 컨텍스트(context)는 단일 V8 인스턴스에서 독립적이고 관련 없는 자바스크립트 코드를 실행할 수 있는 실행 환경입니다. 자바스크립트 코드를 실행할 컨텍스트를 명시적으로 지정해야 합니다.

이 개념들은 [고급 안내서](/docs/embed#advanced-guide)에서 자세히 다룹니다.

## 예제 실행하기

다음 단계를 따라 직접 예제를 실행해 보세요:

1. [Git 지침](/docs/source-code#using-git)을 따르며 V8 소스 코드를 다운로드합니다.
1. 이 헬로 월드 예제에 대한 지침은 V8 v13.1과 마지막으로 테스트되었습니다. `git checkout branch-heads/13.1 -b sample -t` 명령을 사용하여 이 브랜치를 체크아웃할 수 있습니다.
1. 도우미 스크립트를 사용하여 빌드 구성을 생성합니다:

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    아래 명령을 실행하여 빌드 구성을 검사하고 수동으로 수정할 수 있습니다:

    ```bash
    gn args out.gn/x64.release.sample
    ```

1. Linux 64 시스템에서 정적 라이브러리를 빌드합니다:

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

1. 빌드 과정에서 생성된 정적 라이브러리에 링크하여 `hello-world.cc`를 컴파일합니다. 예를 들어, GNU 컴파일러와 LLD 링커를 사용하는 64비트 Linux에서는 다음 명령을 실행합니다:

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

1. 더 복잡한 코드의 경우, V8은 ICU 데이터 파일이 없으면 작동하지 않습니다. 이 파일을 실행 파일이 저장된 위치로 복사합니다:

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

1. 명령줄에서 `hello_world` 실행 파일을 실행합니다. 예를 들어, V8 디렉토리의 Linux에서 실행:

    ```bash
    ./hello_world
    ```

1. 이는 `Hello, World!`를 출력합니다. 축하합니다!  
   참고: 2024년 11월 기준으로 프로세스 시작 직전에 세그멘테이션 오류(segfault)가 발생할 수도 있습니다. 조사가 진행 중입니다. 만약 이 오류를 직면하고 원인을 알아낼 수 있다면, [issue 377222400](https://issues.chromium.org/issues/377222400)에 댓글을 달거나 [패치 제출](https://v8.dev/docs/contribute)을 해주세요.

메인 브랜치와 동기화된 예제를 찾고 있다면, 파일 [`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc)를 확인하세요. 이는 매우 간단한 예제이며, 스크립트를 문자열로 실행하는 것 이상의 작업을 하고 싶을 것입니다. 아래 [고급 안내서](#advanced-guide)에 V8 임베딩에 대한 추가 정보가 포함되어 있습니다.

## 더 많은 예제 코드

다음 샘플은 소스 코드 다운로드의 일부로 제공됩니다.

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

이 샘플은 가상의 HTTP 요청 처리 애플리케이션(예: 웹 서버의 일부일 수 있음)을 확장하여 스크립트로 처리 가능하게 하는 데 필요한 코드를 제공합니다. 자바스크립트 스크립트를 인수로 받아야 하며, 이는 `Process`라는 이름의 함수를 제공해야 합니다. 자바스크립트 `Process` 함수는 가상의 웹 서버에서 처리된 각 페이지의 히트 수와 같은 정보를 수집하는 데 사용할 수 있습니다.

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

이 샘플은 파일명을 인수로 받아 해당 내용을 읽고 실행합니다. 자바스크립트 코드 스니펫을 입력할 수 있는 커맨드 프롬프트를 포함하며 실행됩니다. 이 샘플에서는 추가적인 함수들인 `print`와 같은 것이 객체 및 함수 템플릿을 사용하여 자바스크립트에 추가됩니다.

## 고급 안내서

이제 V8을 독립 실행형 가상 머신으로 사용하는 방법과 핸들, 스코프, 컨텍스트와 같은 V8의 주요 개념에 익숙해졌으니, 이러한 개념을 더 자세히 논의하고 여러분의 C++ 애플리케이션 내에서 V8을 포함시키는 데 중요한 다른 몇 가지 개념들을 소개해 보겠습니다.

V8 API는 스크립트 컴파일 및 실행, C++ 메서드 및 데이터 구조 액세스, 오류 처리 및 보안 체크 기능을 제공합니다. 애플리케이션은 V8을 다른 C++ 라이브러리처럼 사용할 수 있습니다. C++ 코드에서 V8 API를 사용하려면 헤더 파일 `include/v8.h`를 포함하면 됩니다.

### 핸들과 가비지 컬렉션

핸들은 JavaScript 객체의 힙 내 위치에 대한 참조를 제공합니다. V8 가비지 컬렉터는 더 이상 액세스할 수 없는 객체가 사용하는 메모리를 해제합니다. 가비지 컬렉션 과정에서 가비지 컬렉터는 종종 객체를 힙 내의 다른 위치로 이동시킵니다. 가비지 컬렉터가 객체를 이동시킬 때, 해당 객체를 참조하는 모든 핸들을 해당 객체의 새로운 위치로 업데이트합니다.

객체가 JavaScript에서 접근할 수 없고 이를 참조하는 핸들이 없는 경우, 해당 객체는 가비지로 간주됩니다. 가비지 컬렉터는 때때로 가비지로 간주된 모든 객체를 제거합니다. V8의 가비지 컬렉션 메커니즘은 V8 성능의 핵심입니다.

여러 종류의 핸들이 있습니다:

- 로컬 핸들은 스택에 저장되며 적절한 소멸자가 호출되었을 때 삭제됩니다. 이 핸들의 수명은 핸들 스코프에 의해 결정되며, 이는 종종 함수 호출 시작에 만들어집니다. 핸들 스코프가 삭제되면, JavaScript 또는 다른 핸들에서 더 이상 접근할 수 없다면 가비지 컬렉터가 이전에 핸들 스코프에서 참조하던 객체를 할당 해제할 수 있습니다. 위의 간단한 예제는 이 유형의 핸들을 사용합니다.

    로컬 핸들은 `Local<SomeType>` 클래스입니다.

    **참고:** 핸들 스택은 C++ 호출 스택의 일부가 아니지만, 핸들 스코프는 C++ 스택에 포함됩니다. 핸들 스코프는 스택에서만 할당할 수 있으며, `new`로 할당할 수 없습니다.

- 지속적인 핸들은 로컬 핸들과 마찬가지로 힙에 할당된 JavaScript 객체에 대한 참조를 제공합니다. 이 핸들은 참조 수명 관리 방식에 따라 두 종류로 나뉩니다. 여러 함수 호출에서 객체 참조를 유지하거나 핸들 수명이 C++ 스코프와 일치하지 않을 때는 지속적인 핸들을 사용해야 합니다. 예를 들어, Google Chrome은 지속적인 핸들을 사용하여 Document Object Model (DOM) 노드를 참조합니다. 지속적인 핸들은 `PersistentBase::SetWeak`을 사용해 약한 상태로 만들 수 있으며, 가비지 컬렉터가 객체에 대한 참조가 약한 지속적인 핸들만 남아 있을 때 콜백을 트리거합니다.

    - `UniquePersistent<SomeType>` 핸들은 C++ 생성자와 소멸자를 활용해 기반 객체의 수명을 관리합니다.
    - `Persistent<SomeType>` 핸들은 생성자로 생성할 수 있지만, `Persistent::Reset`을 사용해 명시적으로 삭제해야 합니다.

- 다른 종류의 핸들은 드물게 사용되며 여기서는 간단히만 언급합니다:

    - `Eternal`은 삭제되지 않을 것으로 예상되는 JavaScript 객체를 위한 지속적인 핸들입니다. 가비지 컬렉터가 해당 객체의 활성 여부를 확인하지 않아도 되기 때문에 더 저렴하게 사용할 수 있습니다.
    - `Persistent`와 `UniquePersistent`는 복사할 수 없으므로 C++11 이전의 표준 라이브러리 컨테이너 값으로는 부적합합니다. `PersistentValueMap`과 `PersistentValueVector`는 맵 및 벡터와 유사한 의미를 가진 지속적인 값에 대한 컨테이너 클래스를 제공합니다. C++11을 사용하는 사람들은 이동 의미론이 기본 문제를 해결하므로 이 클래스가 필요하지 않습니다.

물론, 객체를 만들 때마다 로컬 핸들을 만들게 되면 핸들이 너무 많아질 수 있습니다! 이럴 때 핸들 스코프가 매우 유용합니다. 핸들 스코프는 수많은 핸들을 담는 컨테이너라고 생각할 수 있습니다. 핸들 스코프의 소멸자가 호출되면 해당 스코프에서 생성된 모든 핸들이 스택에서 제거됩니다. 예상대로, 이는 핸들이 가리키는 객체들이 가비지 컬렉터에 의해 힙에서 삭제될 수 있음을 의미합니다.

간단한 [헬로 월드 예제](#hello-world)로 돌아가면, 다음 다이어그램에서 핸들 스택과 힙에 할당된 객체들을 볼 수 있습니다. `Context::New()`는 `Local` 핸들을 반환하며, `Persistent` 핸들을 생성해 `Persistent` 핸들의 사용 방법을 보여줍니다.

![](/_img/docs/embed/local-persist-handles-review.png)

소멸자 `HandleScope::~HandleScope`가 호출될 때 핸들 스코프가 삭제됩니다. 삭제된 핸들 스코프 내에 있는 핸들이 참조하는 객체들은 다른 참조가 없는 경우 다음 가비지 수집 때 제거될 수 있습니다. 가비지 수집기는 또한 JavaScript에서 더 이상 어떤 핸들이나 참조로 접근할 수 없는 `source_obj`와 `script_obj` 객체를 힙에서 제거할 수 있습니다. 컨텍스트 핸들은 지속적인 핸들이므로 핸들 스코프를 벗어날 때 제거되지 않습니다. 컨텍스트 핸들을 제거하는 유일한 방법은 명시적으로 `Reset`을 호출하는 것입니다.

:::note
**참고:** 이 문서 전체에서 "핸들"이라는 용어는 로컬 핸들을 나타냅니다. 지속적인 핸들에 대해 논의할 때는 해당 용어를 전체적으로 사용합니다.
:::

이 모델에서 흔히 발생하는 한 가지 함정을 인지하는 것이 중요합니다: *핸들 스코프를 선언하는 함수에서 로컬 핸들을 직접 반환할 수 없습니다.* 만약 그렇게 한다면 반환하려는 로컬 핸들은 함수가 반환되기 직전에 핸들 스코프의 소멸자에 의해 삭제됩니다. 로컬 핸들을 반환하는 올바른 방법은 `HandleScope` 대신 `EscapableHandleScope`를 생성하고 반환하려는 핸들을 전달하여 핸들 스코프의 `Escape` 메소드를 호출하는 것입니다. 실제로 작동하는 방법을 보여주는 예제는 다음과 같습니다:

```cpp
// 이 함수는 x, y, z 세 개의 요소를 가진 새로운 배열을 반환합니다.
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // 임시 핸들을 생성할 예정이기 때문에 핸들 스코프를 사용합니다.
  v8::EscapableHandleScope handle_scope(isolate);

  // 새로운 빈 배열을 생성합니다.
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // 배열 생성에 오류가 발생한 경우 빈 결과를 반환합니다.
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // 값을 채웁니다.
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // Escape를 통해 값을 반환합니다.
  return handle_scope.Escape(array);
}
```

`Escape` 메소드는 그 인자의 값을 외부 스코프로 복사하고 모든 로컬 핸들을 삭제한 다음 안전하게 반환할 수 있는 새로운 핸들 복사본을 반환합니다.

### 컨텍스트

V8에서는 컨텍스트란 단일 V8 인스턴스 내에서 별개의 JavaScript 애플리케이션이 실행될 수 있게 하는 실행 환경입니다. 원하는 JavaScript 코드를 실행하려면 컨텍스트를 명시적으로 지정해야 합니다.

왜 이것이 필요할까요? JavaScript는 JavaScript 코드로 변경할 수 있는 내장 유틸리티 함수 및 객체 세트를 제공합니다. 예를 들어, 완전히 별개의 두 개의 JavaScript 함수가 동일한 방식으로 전역 객체를 변경하게 되면 예상하지 못한 결과가 발생할 가능성이 높습니다.

내장 객체를 생성해야 하는 횟수를 고려할 때 새로운 실행 컨텍스트를 만드는 것이 CPU 시간과 메모리 관점에서 비용이 많이 드는 작업처럼 보일 수 있습니다. 하지만 V8의 광범위한 캐싱은 첫 번째 컨텍스트를 생성하는 것은 다소 비용이 많이 들지만 이후 컨텍스트들은 훨씬 저렴하게 생성될 수 있도록 보장합니다. 이는 첫 번째 컨텍스트가 내장 객체를 생성하고 내장 JavaScript 코드를 분석해야 하지만 이후 컨텍스트들은 해당 컨텍스트를 위한 내장 객체만 생성하면 되기 때문입니다. V8 스냅샷 기능(`snapshot=yes`로 빌드 옵션 활성화, 기본값)은 첫 번째 컨텍스트 생성에 걸리는 시간이 크게 최적화될 수 있도록 스냅샷이 이미 컴파일된 내장 JavaScript 코드가 포함된 직렬화된 힙을 포함하게 됩니다. 가비지 수집과 함께 V8의 광범위한 캐싱은 V8의 성능 핵심 요소입니다.

컨텍스트를 생성하면 해당 컨텍스트에 얼마든지 들어가고 나올 수 있습니다. 컨텍스트 A에 있는 동안 다른 컨텍스트 B에 진입할 수도 있습니다. 이는 A를 현재 컨텍스트에서 B로 교체하는 것을 의미합니다. B를 벗어나면 A가 현재 컨텍스트로 복원됩니다. 아래에 설명되어 있습니다:

![](/_img/docs/embed/intro-contexts.png)

각 컨텍스트의 내장 유틸리티 함수와 객체는 별도로 유지된다는 점에 유의하세요. 컨텍스트를 생성할 때 보안 토큰을 선택적으로 설정할 수 있습니다. 자세한 내용은 [보안 모델](#security-model) 섹션을 참조하세요.

V8에서 컨텍스트를 사용하는 동기는 브라우저의 각 창과 iframe이 자체적인 JavaScript 환경을 가질 수 있도록 하기 위한 것이었습니다.

### 템플릿

템플릿은 컨텍스트에서 JavaScript 함수와 객체에 대한 청사진입니다. 템플릿을 사용하여 C++ 함수와 데이터 구조를 JavaScript 객체로 래핑하여 JavaScript 스크립트로 조작할 수 있도록 할 수 있습니다. 예를 들어, Google Chrome은 템플릿을 사용하여 C++ DOM 노드를 JavaScript 객체로 래핑하고 전역 네임스페이스에 함수를 설치합니다. 템플릿 세트를 생성한 다음 새로 만든 모든 컨텍스트에 동일한 템플릿을 사용할 수 있습니다. 필요한 만큼 많은 템플릿을 가질 수 있습니다. 하지만 주어진 컨텍스트에서 각 템플릿의 인스턴스는 하나만 가질 수 있습니다.

JavaScript에서는 함수와 객체 간의 강한 이중성이 존재합니다. Java나 C++에서 새 객체 유형을 생성하려면 일반적으로 새 클래스를 정의할 것입니다. 하지만 JavaScript에서는 대신 새 함수를 생성하고 생성자로써 그 함수를 사용하여 인스턴스를 만듭니다. JavaScript 객체의 레이아웃과 기능은 그것을 생성한 함수와 밀접하게 연결됩니다. 이는 V8 템플릿의 작동 방식에 반영됩니다. 템플릿에는 두 가지 유형이 있습니다:

- 함수 템플릿

    함수 템플릿은 하나의 함수에 대한 청사진입니다. 자바스크립트 함수 템플릿의 `GetFunction` 메서드를 호출하여 이 템플릿에 대한 자바스크립트 인스턴스를 생성할 수 있습니다. 또한, 자바스크립트 함수 인스턴스가 호출될 때 실행되는 C++ 콜백을 함수 템플릿에 연결할 수도 있습니다.

- 객체 템플릿

    각 함수 템플릿에는 연관된 객체 템플릿이 있습니다. 이는 이 함수로 생성된 객체들이 생성자로서 구성되도록 사용됩니다. 객체 템플릿에 연결할 수 있는 C++ 콜백에는 두 가지 유형이 있습니다:

    - 액세서 콜백은 특정 객체 속성이 스크립트에 의해 접근될 때 호출됩니다.
    - 인터셉터 콜백은 모든 객체 속성이 스크립트에 의해 접근될 때 호출됩니다.

  [액세서](#accessors)와 [인터셉터](#interceptors)는 이 문서의 후반부에서 논의됩니다.

다음 코드는 글로벌 객체의 템플릿을 생성하고 빌트인 글로벌 함수를 설정하는 예제입니다.

```cpp
// 글로벌 객체에 대한 템플릿을 생성하고 빌트인 글로벌 함수를 설정합니다.
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// 각 프로세서는 고유의 컨텍스트를 가져서 다른 프로세서가 서로 영향을 미치지 않도록 합니다.
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

이 예제 코드는 `process.cc` 샘플 파일의 `JsHttpProcessor::Initializer`에서 가져왔습니다.

### 액세서

액세서는 자바스크립트 스크립트에서 객체 속성이 접근될 때 계산하여 값을 반환하는 C++ 콜백입니다. 액세서는 `SetAccessor` 메서드를 사용하여 객체 템플릿을 통해 설정됩니다. 이 메서드는 스크립트에서 속성을 읽거나 쓰려고 시도할 때 실행되는 두 개의 콜백과 연결된 속성 이름을 받습니다.

액세서의 복잡성은 조작 중인 데이터 유형에 따라 달라집니다:

- [정적 글로벌 변수 접근](#accessing-static-global-variables)
- [동적 변수 접근](#accessing-dynamic-variables)

### 정적 글로벌 변수 접근

두 개의 C++ 정수 변수 `x`와 `y`를 컨텍스트 내에서 자바스크립트 글로벌 변수로 사용할 수 있도록 만든다고 가정해 봅시다. 이를 수행하려면 스크립트가 이러한 변수를 읽거나 쓸 때마다 C++ 액세서 함수가 호출되어야 합니다. 이러한 액세서 함수는 `Integer::New`를 사용하여 C++ 정수를 자바스크립트 정수로 변환하고, `Int32Value`를 사용하여 자바스크립트 정수를 C++ 정수로 변환합니다. 예제는 아래에 제공됩니다:

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetter는 유사하므로 간략화를 위해 생략되었습니다

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

위 코드에서 객체 템플릿은 컨텍스트와 동시에 생성되었습니다. 템플릿은 사전에 생성되고 여러 컨텍스트에 사용될 수도 있습니다.

### 동적 변수 접근

앞선 예에서는 변수가 정적이고 글로벌이었습니다. 조작 중인 데이터가 브라우저 DOM 트리처럼 동적이라면 어떻게 될까요? 이제 `x`와 `y`가 C++ 클래스 `Point`의 객체 필드라고 상상해 봅시다:

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

어떤 수의 C++ `point` 인스턴스를 자바스크립트에서 사용할 수 있도록 하려면 각 C++ `point`에 대한 자바스크립트 객체를 생성하고 자바스크립트 객체와 C++ 인스턴스 간의 연결을 설정해야 합니다. 이는 외부 값 및 내부 객체 필드를 통해 수행됩니다.

먼저 `point` 래퍼 객체에 대한 객체 템플릿을 생성합니다:

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

각 자바스크립트 `point` 객체는 래퍼 역할을 하는 C++ 객체에 대한 참조를 내부 필드로 유지합니다. 이러한 필드는 자바스크립트 내에서 접근할 수 없고, 오직 C++ 코드에서만 접근 가능합니다. 객체는 내부 필드 수를 객체 템플릿에서 설정할 수 있으며 다음과 같이 설정할 수 있습니다:

```cpp
point_templ->SetInternalFieldCount(1);
```

여기서 내부 필드 카운트는 `1`로 설정되며, 이 값은 해당 객체가 인덱스 `0`인 내부 필드 하나를 가지며 C++ 객체를 가리킨다는 뜻입니다.

`x`와 `y` 액세서를 템플릿에 추가합니다:

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

이어서 C++ 포인트를 래핑하기 위해 템플릿의 새 인스턴스를 생성한 다음 내부 필드 `0`을 포인트 `p` 주위에 외부 래퍼로 설정합니다.

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

외부 객체는 단순히 `void*` 주위의 래퍼입니다. 외부 객체는 내부 필드에 참조 값을 저장하는 데만 사용될 수 있습니다. JavaScript 객체는 C++ 객체에 직접 참조를 가질 수 없으므로 외부 값은 JavaScript에서 C++로 이동하는 "다리" 역할을 합니다. 이러한 점에서 외부 값은 핸들과 반대입니다. 왜냐하면 핸들은 C++이 JavaScript 객체에 참조를 만들 수 있게 하기 때문입니다.

다음은 `x`의 `get` 및 `set` 접근자의 정의입니다. `y` 접근자의 정의는 동일하며 `x` 대신 `y`가 사용됩니다:

```cpp
void GetPointX(Local<String> property,
               const PropertyCallbackInfo<Value>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  int value = static_cast<Point*>(ptr)->x_;
  info.GetReturnValue().Set(value);
}

void SetPointX(v8::Local<v8::String> property, v8::Local<v8::Value> value,
               const v8::PropertyCallbackInfo<void>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  static_cast<Point*>(ptr)->x_ = value->Int32Value();
}
```

접근자는 JavaScript 객체에 의해 래핑된 `point` 객체에 대한 참조를 추출하고 관련 필드를 읽고 씁니다. 이렇게 하면 이러한 일반적인 접근자를 여러 래핑된 포인트 객체에서 사용할 수 있습니다.

### 인터셉터

스크립트가 모든 객체 속성에 접근할 때마다 콜백을 지정할 수도 있습니다. 이를 인터셉터라고 합니다. 효율성을 위해 두 가지 유형의 인터셉터가 있습니다:

- *네임드 속성 인터셉터* - 문자열 이름을 가진 속성을 접근할 때 호출됩니다.
  브라우저 환경에서의 예로는 `document.theFormName.elementName`가 있습니다.
- *인덱싱된 속성 인터셉터* - 인덱싱된 속성을 접근할 때 호출됩니다. 브라우저 환경에서의 예로는 `document.forms.elements[0]`가 있습니다.

V8 소스 코드와 함께 제공되는 샘플 `process.cc`는 인터셉터 사용 예제를 포함하고 있습니다. 다음 코드 조각에서 `SetNamedPropertyHandler`는 `MapGet` 및 `MapSet` 인터셉터를 지정합니다:

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

`MapGet` 인터셉터는 아래와 같습니다:

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // 이 객체에 의해 래핑된 맵을 가져옵니다.
  map<string, string> *obj = UnwrapMap(info.Holder());

  // JavaScript 문자열을 std::string으로 변환합니다.
  string key = ObjectToString(name);

  // 표준 STL 관례를 사용하여 값이 존재하는지 확인합니다.
  map<string, string>::iterator iter = obj->find(key);

  // 키가 존재하지 않는 경우 빈 핸들을 신호로 반환합니다.
  if (iter == obj->end()) return;

  // 그렇지 않으면 값을 가져와 JavaScript 문자열로 래핑합니다.
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

접근자와 마찬가지로, 지정된 콜백은 속성에 접근할 때마다 호출됩니다. 접근자와 인터셉터의 차이점은 인터셉터는 모든 속성을 처리하는 반면, 접근자는 특정 속성과 연관된다는 점입니다.

### 보안 모델

“동일 출처 정책”(Netscape Navigator 2.0에서 처음 도입됨)은 한 “출처”에서 로드된 문서 또는 스크립트가 다른 “출처”의 문서의 속성을 가져오거나 설정하지 못하도록 방지합니다. 여기서 출처란 도메인 이름(e.g. `www.example.com`), 프로토콜(e.g. `https`) 및 포트를 조합한 것을 의미합니다. 예를 들어, `www.example.com:81`은 `www.example.com`과 동일한 출처가 아닙니다. 두 웹 페이지가 동일한 출처로 간주되기 위해서는 세 가지 모두 일치해야 합니다. 이러한 보호가 없으면 악의적인 웹 페이지가 다른 웹 페이지의 무결성을 손상시킬 수 있습니다.

V8에서는 “출처”가 컨텍스트로 정의됩니다. 호출하는 컨텍스트와 다른 컨텍스트에 대한 접근은 기본적으로 허용되지 않습니다. 호출하는 컨텍스트와 다른 컨텍스트에 접근하려면 보안 토큰 또는 보안 콜백을 사용해야 합니다. 보안 토큰은 임의의 값일 수 있지만 일반적으로 다른 곳에서는 존재하지 않는 심볼, 정시화된 문자열입니다. 컨텍스트를 설정할 때 `SetSecurityToken`을 사용하여 보안 토큰을 선택적으로 지정할 수 있습니다. 보안 토큰을 지정하지 않으면 V8은 생성 중인 컨텍스트에 대해 자동으로 하나를 생성합니다.

글로벌 변수를 액세스하려는 시도가 있을 때 V8 보안 시스템은 먼저 액세스하려고 하는 글로벌 객체의 보안 토큰을 글로벌 객체에 접근하려는 코드의 보안 토큰과 비교합니다. 토큰이 일치하면 접근이 허용됩니다. 토큰이 일치하지 않으면 V8은 콜백을 수행하여 접근이 허용되어야 하는지 확인합니다. 객체 템플릿에서 `SetAccessCheckCallbacks` 메서드를 사용하여 객체에 대한 보안 콜백을 설정함으로써 객체에 대한 접근을 허용할지 여부를 지정할 수 있습니다. V8 보안 시스템은 접근하려는 객체의 보안 콜백을 가져와 다른 컨텍스트가 이를 접근할 수 있는지 확인하기 위해 호출합니다. 이 콜백은 접근하려는 객체, 접근하려는 속성의 이름, 접근 유형(예: 읽기, 쓰기 또는 삭제)을 받아들여 접근 허용 여부를 반환합니다.

이 메커니즘은 Google Chrome에서 구현되며, 보안 토큰이 일치하지 않을 경우 특별한 콜백을 사용하여 다음 요소에 대한 접근만 허용합니다: `window.focus()`, `window.blur()`, `window.close()`, `window.location`, `window.open()`, `history.forward()`, `history.back()`, `history.go()`.

### 예외

스크립트나 함수가 존재하지 않는 속성을 읽으려고 시도하거나, 함수가 아닌 것을 호출하려는 등 오류가 발생하면 V8은 예외를 발생시킵니다.

V8은 작업이 성공하지 못한 경우 빈 핸들을 반환합니다. 따라서 실행을 계속하기 전에 반환 값이 빈 핸들이 아닌지 확인하는 것이 중요합니다. `Local` 클래스의 공개 멤버 함수 `IsEmpty()`를 사용하여 빈 핸들을 확인할 수 있습니다.

`TryCatch`를 사용하여 예외를 처리할 수 있습니다. 예를 들어:

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("Exception: %s\n", *exception_str);
  // ...
}
```

반환된 값이 빈 핸들이고, `TryCatch`를 설정하지 않은 경우에는 코드 실행을 중단해야 합니다. `TryCatch`가 있다면 예외가 캡처되며 코드 처리가 계속됩니다.

### 상속

JavaScript는 *클래스가 없는* 객체 지향 언어이며, 전통적인 클래스 상속 대신 프로토타입 상속을 사용합니다. 이는 C++ 및 Java와 같은 일반적인 객체 지향 언어에 익숙한 프로그래머들에게 혼란을 줄 수 있습니다.

Java와 C++와 같은 클래스 기반 객체 지향 언어는 클래스와 인스턴스의 두 가지 별개의 엔터티 개념에 기반을 둡니다. JavaScript는 프로토타입 기반 언어이므로 이러한 구분 없이 단순히 객체를 가집니다. JavaScript는 기본적으로 클래스 계층 구조 선언을 지원하지 않습니다. 그러나 JavaScript의 프로토타입 메커니즘은 모든 객체 인스턴스에 사용자 정의 속성과 메서드를 추가하는 과정을 간소화합니다. 예를 들어, JavaScript에서 객체에 사용자 정의 속성을 추가할 수 있습니다. 예를 들면:

```js
// `bicycle`이라는 객체를 생성합니다.
function bicycle() {}
// `roadbike`라는 `bicycle` 인스턴스를 생성합니다.
var roadbike = new bicycle();
// `roadbike`에 사용자 정의 속성 `wheels`를 정의합니다.
roadbike.wheels = 2;
```

이 방식으로 추가된 사용자 정의 속성은 객체의 해당 인스턴스에만 존재합니다. 예를 들어, `bicycle()`의 또 다른 인스턴스 `mountainbike`를 생성하면, `mountainbike.wheels`는 명시적으로 `wheels` 속성을 추가하지 않는 한 `undefined`를 반환합니다.

때로는 이것이 정확히 필요한 경우지만, 다른 경우에는 객체의 모든 인스턴스에 사용자 정의 속성을 추가하는 것이 유용할 것입니다. 결국 모든 자전거는 바퀴가 있으니까요. 이때 JavaScript의 프로토타입 객체가 매우 유용합니다. 프로토타입 객체를 사용하려면, 다음과 같이 사용자 정의 속성을 추가하기 전에 객체에서 `prototype` 키워드를 참조하십시오:

```js
// 먼저, “bicycle” 객체를 생성합니다.
function bicycle() {}
// 객체의 프로토타입에 wheels 속성을 할당합니다.
bicycle.prototype.wheels = 2;
```

`bicycle()`의 모든 인스턴스는 이제 기본적으로 내장된 `wheels` 속성을 가지게 됩니다.

V8에서 템플릿에도 동일한 접근법이 사용됩니다. 각 `FunctionTemplate`에는 함수의 프로토타입에 대한 템플릿을 제공하는 `PrototypeTemplate` 메서드가 있습니다. `PrototypeTemplate`에서 속성을 설정하거나 해당 속성과 C++ 함수를 연결할 수 있습니다. 이는 해당 `FunctionTemplate`의 모든 인스턴스에 존재하게 됩니다. 예를 들어:

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

이 코드는 `biketemplate`의 모든 인스턴스에 프로토타입 체인에서 `wheels` 메서드가 존재하도록 하며, 호출 시 C++ 함수 `MyWheelsMethodCallback`이 호출됩니다.

V8의 `FunctionTemplate` 클래스는 함수 템플릿이 다른 함수 템플릿에서 상속받도록 하고자 할 때 호출할 수 있는 공개 멤버 함수 `Inherit()`을 제공합니다. 다음과 같이 사용할 수 있습니다:

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
