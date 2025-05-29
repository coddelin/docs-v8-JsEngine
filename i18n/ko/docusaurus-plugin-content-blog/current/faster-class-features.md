---
title: &apos;새로운 클래스 기능으로 인스턴스 초기화 속도 향상&apos;
author: &apos;[Joyee Cheung](https://twitter.com/JoyeeCheung), 인스턴스 초기화자&apos;
avatars:
  - &apos;joyee-cheung&apos;
date: 2022-04-20
tags:
  - 내부구조
description: &apos;V8 v9.7 이후 새로운 클래스 기능으로 인한 인스턴스 초기화 속도가 빨라졌습니다.&apos;
tweet: &apos;1517041137378373632&apos;
---

클래스 필드는 V8 v7.2부터 제공되었으며, 비공개 클래스 메서드는 V8 v8.4부터 제공되었습니다. 제안이 2021년에 단계 4에 도달한 후, V8에서 새로운 클래스 기능 지원을 향상시키기 위한 작업이 시작되었습니다. 그때까지 채택에 영향을 미치는 두 가지 주요 문제가 있었습니다:

<!--truncate-->
1. 클래스 필드와 비공개 메서드 초기화는 일반 속성 할당보다 훨씬 느렸습니다.
2. 클래스 필드 초기화는 사용자 애플리케이션이나 Node.js 및 Deno와 같은 임베더가 부트스트래핑 속도를 높이기 위해 사용하는 [시작 스냅샷](https://v8.dev/blog/custom-startup-snapshots)에서 작동하지 않았습니다.

첫 번째 문제는 V8 v9.7에서 수정되었으며 두 번째 문제에 대한 수정은 V8 v10.0에서 릴리스되었습니다. 이 글에서는 첫 번째 문제가 어떻게 수정되었는지 다루며, 스냅샷 문제 수정을 읽고 싶다면 [이 글](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/)을 확인하세요.

## 클래스 필드 최적화

일반 속성 할당과 클래스 필드 초기화 간의 성능 격차를 없애기 위해 기존 [인라인 캐시 (IC) 시스템](https://mathiasbynens.be/notes/shapes-ics)을 후자에 맞게 업데이트했습니다. v9.7 이전에는 V8이 항상 클래스 필드 초기화를 위해 비용이 많이 드는 런타임 호출을 사용했습니다. v9.7부터 V8은 초기화 패턴이 충분히 예측 가능하다고 판단되면 일반 속성 할당에서도 활용하는 새로운 IC를 사용하여 동작 속도를 향상시켰습니다.

![초기화 성능, 최적화됨](/_img/faster-class-features/class-fields-performance-optimized.svg)

![초기화 성능, 해석됨](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### 클래스 필드의 원래 구현

비공개 필드를 구현하기 위해 V8은 내부 비공개 심볼을 사용합니다&mdash;이는 표준 `Symbol`과 비슷한 내부 V8 데이터 구조로, 속성 키로 사용될 때 열거형이 아닙니다. 이 클래스를 예로 들어보세요:


```js
class A {
  #a = 0;
  b = this.#a;
}
```

V8은 클래스 필드 초기화 (`#a = 0` 및 `b = this.#a`)를 수집하고 이를 함수 본문으로 사용하는 합성 인스턴스 멤버 함수를 생성했습니다. 이 합성 함수에 대해 생성된 바이트코드는 다음과 같았습니다:

```cpp
// `#a`를 위한 비공개 이름 심볼을 r1에 로드
LdaImmutableCurrentContextSlot [2]
Star r1

// 0을 r2에 로드
LdaZero
Star r2

// 대상 r0로 이동
Mov <this>, r0

// %AddPrivateField() 런타임 함수를 사용하여
// 인스턴스에서 비공개 이름 심볼 `#a`로 키가 지정된 속성 값으로서 0을 저장
// 이는 `#a = 0`을 의미합니다.
CallRuntime [AddPrivateField], r0-r2

// 속성 이름 `b`를 r1에 로드
LdaConstant [0]
Star r1

// `#a`를 위한 비공개 이름 심볼을 로드
LdaImmutableCurrentContextSlot [2]

// 인스턴스에서 `#a`로 키가 지정된 속성 값을 r2에 로드
LdaKeyedProperty <this>, [0]
Star r2

// 대상 r0로 이동
Mov <this>, r0

// %CreateDataProperty() 런타임 함수를 사용하여
// `#a`로 키가 지정된 속성을 `b`로 키가 지정된 속성 값으로 저장
// 이를 `b = this.#a`로 의미합니다.
CallRuntime [CreateDataProperty], r0-r2
```

이전 코드 조각에 보인 클래스와 이런 클래스를 비교해보세요:

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

기술적으로 이 두 클래스는 동일하지 않으며, `this.#a`와 `this._a` 간의 가시성 차이를 무시하더라도 그렇습니다. 사양은 "설정" 의미보다 "정의" 의미를 요구합니다. 즉, 클래스 필드 초기화는 setter 또는 `set` Proxy 트랩을 트리거하지 않습니다. 첫 번째 클래스의 근사값은 속성을 초기화하기 위해 간단한 할당 대신 `Object.defineProperty()`를 사용해야 합니다. 추가적으로 (초기화 대상이 기본 생성자에서 다른 인스턴스로 재정의된 경우를 대비하여) 비공개 필드가 이미 인스턴스에 존재할 경우 해당 필드는 예외를 발생시켜야 합니다:

```js
class A {
  constructor() {
    // %AddPrivateField() 호출이 대략적으로 번역되는 방법:
    const _a = %PrivateSymbol(&apos;#a&apos;)
    if (_a in this) {
      throw TypeError(&apos;같은 객체에서 #a를 두 번 초기화할 수 없습니다&apos;);
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // %CreateDataProperty() 호출이 대략적으로 번역되는 방법:
    Object.defineProperty(this, &apos;b&apos;, {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```
제안이 최종 확정되기 전에 지정된 의미론을 구현하기 위해 V8은 더 유연한 런타임 함수 호출을 사용했습니다. 위의 바이트코드에 표시된 것처럼 공용 필드의 초기화는 `%CreateDataProperty()` 런타임 호출로 구현되었으며, 비공용 필드의 초기화는 `%AddPrivateField()`로 구현되었습니다. 런타임 호출은 상당한 오버헤드를 수반하기 때문에 클래스 필드의 초기화는 일반 개체 속성 할당에 비해 훨씬 느렸습니다.

그러나 대부분의 사용 사례에서는 의미적 차이가 중요하지 않습니다. 이러한 경우 속성의 최적화된 할당 성능을 활용할 수 있다면 좋을 것입니다 &mdash; 그래서 제안이 확정된 후 더 최적화된 구현이 만들어졌습니다.

### 비공용 클래스 필드와 계산된 공용 클래스 필드 최적화

비공용 클래스 필드와 계산된 공용 클래스 필드의 초기화를 가속화하기 위해, 이러한 작업을 처리할 때 [인라인 캐시(IC) 시스템](https://mathiasbynens.be/notes/shapes-ics)과 통합할 수 있는 새로운 장치를 도입했습니다. 이 새로운 장치는 세 가지 협력 요소로 구성됩니다:

- 바이트코드 생성기에서 새로운 바이트코드 `DefineKeyedOwnProperty`가 추가됩니다. 이는 클래스 필드 초기화를 나타내는 `ClassLiteral::Property` AST 노드의 코드를 생성할 때 사용됩니다.
- TurboFan JIT에서는 새 바이트코드에서 컴파일 가능한 대응 IR 명령어 `JSDefineKeyedOwnProperty`를 추가합니다.
- IC 시스템에서는 새로운 바이트코드의 인터프리터 핸들러와 새 IR 명령어에서 컴파일된 코드에서 사용되는 새로운 `DefineKeyedOwnIC`를 추가합니다. 구현을 단순화하기 위해 새로운 IC는 일반 속성 저장소를 대상으로 하는 `KeyedStoreIC`의 일부 코드를 재사용합니다.

이제 V8이 이 클래스를 처리할 때:

```js
class A {
  #a = 0;
}
```

`#a = 0` 초기화자에 대해 다음 바이트코드를 생성합니다:

```cpp
// `#a`의 비공용 이름 심볼을 r1에 로드
LdaImmutableCurrentContextSlot [2]
Star0

// DefineKeyedOwnProperty 바이트코드를 사용하여
// `#a` 비공용 이름 심볼로 키가 지정된 속성의 값으로 0을 저장
// 즉, `#a = 0`.
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

초기화자가 충분히 많이 실행되면, V8은 초기화되는 각 필드에 대해 하나의 [피드백 벡터 슬롯](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)을 할당합니다. 슬롯에는 추가되는 필드의 키(비공용 필드의 경우 개인 이름 심볼)와 필드 초기화 결과로 인스턴스가 전환된 두 가지 [숨겨진 클래스](https://v8.dev/docs/hidden-classes)가 포함됩니다. 이후 초기화에서 IC는 피드백을 사용하여 동일한 숨겨진 클래스를 가진 인스턴스에서 필드가 동일한 순서로 초기화되는지 확인합니다. 초기화가 V8이 이전에 본 패턴과 일치하면(대부분의 경우가 그러함), V8은 빠른 경로를 선택하고 런타임 호출 대신 사전에 생성된 코드를 사용하여 초기화를 수행하여 작업 속도를 향상시킵니다. 초기화가 V8이 이전에 본 패턴과 일치하지 않을 경우 느린 경우를 처리하기 위해 런타임 호출로 되돌아갑니다.

### 이름이 지정된 공용 클래스 필드 최적화

이름이 지정된 공용 클래스 필드 초기화를 가속화하기 위해, 기존의 `DefineNamedOwnProperty` 바이트코드를 재사용하여 인터프리터 또는 `JSDefineNamedOwnProperty` IR 명령어에서 컴파일된 코드를 통해 `DefineNamedOwnIC`로 호출합니다.

이제 V8이 이 클래스를 처리할 때:

```js
class A {
  #a = 0;
  b = this.#a;
}
```

`b = this.#a` 초기화자에 대해 다음 바이트코드를 생성합니다:

```cpp
// `#a`의 비공용 이름 심볼을 로드
LdaImmutableCurrentContextSlot [2]

// 인스턴스에서 `#a`로 키가 지정된 속성 값을 r2에 로드
// 참고: LdaKeyedProperty는 리팩토링에서 GetKeyedProperty로 이름이 변경됨
GetKeyedProperty <this>, [2]

// DefineKeyedOwnProperty 바이트코드를 사용하여
// `b`로 키가 지정된 속성 값으로 `#a`로 키가 지정된 속성을 저장
// 즉, `b = this.#a;`.
DefineNamedOwnProperty <this>, [0], [4]
```

기존의 `DefineNamedOwnIC` 장치는 이름이 지정된 공용 클래스 필드를 처리하는 데 단순히 플러그인 할 수 없었습니다. 이는 원래 개체 리터럴 초기화에만 의도되었기 때문입니다. 이전에는 초기화되는 대상을 사용자에 의해 생성 이후로 아직 터치되지 않은 개체일 것으로 기대했는데, 이는 항상 개체 리터럴의 경우 사실이었지만, 클래스 필드는 생성자가 대상을 재정의하는 기반 클래스를 확장할 때 사용자 정의 개체에서 초기화될 수 있습니다:

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log('object:', object);
          console.log('key:', key);
          console.log('desc:', desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // 관찰할 수 없음.
}

// object: { a: 1 },
// key: 'a',
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```
이러한 대상들을 처리하기 위해, 객체가 Proxy이거나, 정의하려는 필드가 이미 객체에 존재하거나, 객체가 IC가 이전에 본 적 없는 숨겨진 클래스를 가지고 있을 때에는 런타임으로 폴백하도록 IC를 패치했습니다. 극단적인 경우가 충분히 일반화되면 이를 최적화하는 것도 가능하겠으나, 현재로는 구현의 단순성을 위해 이러한 경우들의 성능을 일부 희생하는 것이 더 나은 것으로 보입니다.

## 비공개 메서드 최적화

### 비공개 메서드의 구현

[스펙](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd)에서는 비공개 메서드가 클래스에 설치되지 않고 인스턴스에 설치되는 것으로 기술되어 있습니다. 하지만 메모리를 절약하기 위해, V8의 구현에서는 비공개 메서드를 클래스와 연결된 컨텍스트에 있는 비공개 브랜드 심볼과 함께 저장합니다. 생성자가 호출될 때, V8은 해당 컨텍스트에 대한 참조를 인스턴스에 저장하며, 비공개 브랜드 심볼을 키로 사용합니다.

![비공개 메서드를 가진 클래스의 평가와 인스턴스화](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

비공개 메서드에 접근할 때, V8은 실행 컨텍스트에서 시작하여 컨텍스트 체인을 따라 클래스 컨텍스트를 찾고, 발견된 컨텍스트에서 정적으로 알려진 슬롯을 읽어 클래스의 비공개 브랜드 심볼을 가져옵니다. 그런 다음, 해당 심볼로 키가 설정된 속성이 인스턴스에 있는지 확인하여, 해당 인스턴스가 이 클래스로부터 생성되었는지 확인합니다. 브랜드 확인이 통과하면, V8은 동일한 컨텍스트에 있는 또 다른 알려진 슬롯에서 비공개 메서드를 로드하여 접근을 완료합니다.

![비공개 메서드의 접근 과정](/_img/faster-class-features/access-private-methods.svg)

다음 코드 스니펫을 예로 들어보겠습니다:

```js
class A {
  #a() {}
}
```

`A`의 생성자에 대해 V8이 생성했던 바이트코드는 다음과 같습니다:

```cpp
// 현재 컨텍스트의 슬롯 [3]에서 클래스 A의 비공개 브랜드 심볼을 로드해
// r1에 저장합니다.
LdaImmutableCurrentContextSlot [3]
Star r1

// 대상(r0)을 로드합니다.
Mov <this>, r0
// 현재 컨텍스트를 r2에 로드합니다.
Mov <context>, r2
// 런타임 함수 %AddPrivateBrand()를 호출하여 컨텍스트를
// 비공개 브랜드를 키로 하여 인스턴스에 저장합니다.
CallRuntime [AddPrivateBrand], r0-r2
```

%AddPrivateBrand() 런타임 함수 호출이 존재했기 때문에, 생성자가 오직 공개 메서드만 가진 클래스의 생성자보다 훨씬 느려졌습니다.

### 비공개 브랜드 초기화 최적화

비공개 브랜드 설치를 가속화하기 위해, 대부분의 경우 비공개 필드를 최적화하기 위해 추가된 `DefineKeyedOwnProperty` 기계를 재사용합니다:

```cpp
// 현재 컨텍스트의 슬롯 [3]에서 클래스 A의 비공개 브랜드 심볼을 로드해
// r1에 저장합니다.
LdaImmutableCurrentContextSlot [3]
Star0

// DefineKeyedOwnProperty 바이트코드를 사용하여
// 비공개 브랜드를 키로 하여 컨텍스트를 인스턴스에 저장합니다.
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![다른 메서드를 가진 클래스 인스턴스 초기화의 성능](/_img/faster-class-features/private-methods-performance.svg)

다만 주의할 점이 있습니다: 클래스가 `super()`를 호출하는 파생 클래스인 경우, 비공개 메서드의 초기화 - 여기서는 비공개 브랜드 심볼 설치 - 는 `super()` 호출이 반환된 이후에 이루어져야 합니다:

```js
class A {
  constructor() {
    // super()가 아직 반환되지 않았기 때문에 새 B() 호출에서 오류를 발생시킵니다.
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

이전에 설명한 것처럼, 브랜드를 초기화할 때 V8은 인스턴스에 클래스 컨텍스트 참조도 저장합니다. 이 참조는 브랜드 확인에 사용되지는 않지만, 대신 디버거가 어떤 클래스로 생성되었는지 알지 못하더라도 인스턴스로부터 비공개 메서드 목록을 가져오도록 의도된 것입니다. 생성자에서 `super()`가 직접 호출될 때, V8은 단순히 컨텍스트 레지스터에서 컨텍스트를 불러(위의 바이트코드에서 `Mov <context>, r2` 또는 `Ldar <context>`를 가리킴) 초기화를 수행할 수 있지만, `super()`는 다른 컨텍스트에서 호출될 수 있는 중첩된 화살표 함수에서 호출될 수도 있습니다. 이 경우, V8은 컨텍스트 레지스터에 의존하지 않고 컨텍스트 체인에서 클래스 컨텍스트를 찾기 위해 런타임 함수(여전히 `%AddPrivateBrand()`로 명명됨)를 사용합니다. 예를 들어, 아래의 `callSuper` 함수에서는:

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...무언가 수행
    run(callSuper)
  }
};

new A((fn) => fn());
```

이제 V8은 다음과 같은 바이트코드를 생성합니다:

```cpp
// super 생성자를 호출하여 인스턴스를 생성하고
// 이를 r3에 저장합니다.
...

// 현재 컨텍스트에서 깊이 1로부터 클래스 컨텍스트에서
// 비공개 브랜드 심볼을 로드하여 r4에 저장합니다.
LdaImmutableContextSlot <context>, [3], [1]
Star4

// 깊이 1을 Smi로 로드하여 r6에 저장합니다.
LdaSmi [1]
Star6

// 현재 컨텍스트를 r5에 로드합니다.
Mov <context>, r5

// %AddPrivateBrand()를 사용하여 현재 컨텍스트에서
// 깊이 1의 클래스 컨텍스트를 찾아
// 비공개 브랜드 심볼을 키로 하여 인스턴스에 저장합니다.
CallRuntime [AddPrivateBrand], r3-r6
```

이 경우 런타임 호출의 비용이 다시 발생하므로 이 클래스의 인스턴스를 초기화하는 속도는 여전히 공용 메서드만 있는 클래스의 초기화보다 느릴 것입니다. `%AddPrivateBrand()`이 수행하는 작업을 구현하기 위해 전용 바이트코드를 사용하는 것이 가능하지만, 중첩된 화살표 함수에서 `super()`를 호출하는 경우가 매우 드물기 때문에 우리는 다시 구현의 간소화를 위해 성능을 희생했습니다.

## 최종 노트

이 블로그 글에서 언급된 작업은 [Node.js 18.0.0 릴리즈](https://nodejs.org/en/blog/announcements/v18-release-announce/)에도 포함되어 있습니다. 이전에는 Node.js가 몇 가지 내장 클래스에서 심볼 프로퍼티로 전환하여 프라이빗 필드를 사용했던 이유를 포함시켰고, 이는 내장 부트스트랩 스냅샷에 포함시키며 생성자 성능을 개선하기 위한 것이었습니다(자세한 내용은 [이 블로그 글](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/)을 참조하세요). V8에서 클래스 기능 지원이 개선됨에 따라 Node.js는 이 클래스들에서 다시 [프라이빗 클래스 필드로 전환](https://github.com/nodejs/node/pull/42361)하였으며 Node.js의 벤치마크는 [이 변경 사항이 성능 저하를 유발하지 않았음을 보여주었습니다](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385).

Igalia와 Bloomberg가 이 구현에 기여해 주셔서 감사합니다!
