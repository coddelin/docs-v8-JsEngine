---
title: "초고속 `super` 프로퍼티 접근"
author: "[Marja Hölttä](https://twitter.com/marjakh), super 최적화 전문가"
avatars: 
  - marja-holtta
date: 2021-02-18
tags: 
  - JavaScript
description: "V8 v9.0에서 더 빠른 super 프로퍼티 접근"
tweet: "1362465295848333316"
---

[`super` 키워드](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/super)는 객체의 부모에 있는 프로퍼티와 함수에 접근하기 위해 사용될 수 있습니다.

이전에 `super` 프로퍼티 접근(`super.x` 등)은 런타임 호출을 통해 구현되었지만, V8 v9.0부터는 [인라인 캐시 시스템(IC)](https://mathiasbynens.be/notes/shapes-ics)을 비최적화 코드에서 재사용하고 런타임으로 점프하지 않고 `super` 프로퍼티 접근을 위한 적절한 최적화 코드를 생성합니다.

<!--truncate-->
아래 그래프에서 볼 수 있듯이, 이전에는 런타임 호출로 인해 `super` 프로퍼티 접근이 일반 프로퍼티 접근보다 훨씬 느렸습니다. 이제는 거의 대등한 수준에 가까워졌습니다.

![최적화된 일반 프로퍼티 접근과 super 프로퍼티 접근 비교](/_img/fast-super/super-opt.svg)

![비최적화된 일반 프로퍼티 접근과 super 프로퍼티 접근 비교](/_img/fast-super/super-no-opt.svg)

`super` 프로퍼티 접근은 함수 내에서 이루어져야 하므로 벤치마킹하기 어려운 작업입니다. 개별 프로퍼티 접근을 벤치마킹할 수 없으며, 더 큰 작업 단위만 계측 가능합니다. 따라서 함수 호출 오버헤드도 측정에 포함됩니다. 위의 그래프는 `super` 프로퍼티 접근과 일반 프로퍼티 접근 간의 차이를 다소 과소평가하고 있지만, 이전 방식과 새로운 방식의 `super` 프로퍼티 접근 간의 차이를 보여주는 데는 충분히 정확합니다.

비최적화(인터프리티드) 모드에서는 `super` 프로퍼티 접근이 늘 일반 프로퍼티 접근보다 느릴 수밖에 없습니다. 이는 컨텍스트에서 home 객체를 읽고 home 객체의 `__proto__`를 읽는 등의 추가 작업이 필요하기 때문입니다. 최적화된 코드에서는 가능한 경우 항상 home 객체를 상수로 삽입합니다. 이와 비슷하게 `__proto__`도 상수로 삽입하여 추가 개선할 수 있습니다.

### 프로토타입 상속과 `super`

우선 기본적인 것부터 시작해보겠습니다 - `super` 프로퍼티 접근이란 무엇일까요?

```javascript
class A { }
A.prototype.x = 100;

class B extends A {
  m() {
    return super.x;
  }
}
const b = new B();
b.m();
```

이제 `A`는 `B`의 부모 클래스이고 `b.m()`은 예상대로 `100`을 반환합니다.

![클래스 상속 다이어그램](/_img/fast-super/inheritance-1.svg)

[JavaScript의 프로토타입 상속](https://developer.mozilla.org/ko/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) 실체는 더 복잡합니다:

![프로토타입 상속 다이어그램](/_img/fast-super/inheritance-2.svg)

`__proto__`와 `prototype` 프로퍼티를 서로 혼동하지 않도록 주의해야 합니다 - 두 개념은 다릅니다! 더 혼란스러운 점은 객체 `b.__proto__`가 종종 "`b`의 프로토타입"으로 참조된다는 것입니다.

`b.__proto__`는 `b`가 프로퍼티를 상속받는 객체입니다. `B.prototype`은 `new B()`로 생성된 객체들의 `__proto__`가 되는 객체로, 즉 `b.__proto__ === B.prototype`입니다.

그 뒤로 `B.prototype`은 자체적으로 `__proto__` 프로퍼티를 가지며 그 값은 `A.prototype`과 동일합니다. 이렇게 해서 프로토타입 체인이 형성됩니다:

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

이 체인을 통해 `b`는 해당 객체들에 정의된 모든 프로퍼티에 접근할 수 있습니다. 메서드 `m`은 `B.prototype`의 프로퍼티인 `B.prototype.m`이며, 이 때문에 `b.m()`이 정상적으로 동작합니다.

`super.x`를 `m` 내부에 정의함으로써 프로퍼티 `x`를 *home 객체*의 `__proto__`에서 검색을 시작하고 프로토타입 체인을 따라 끝까지 검색하는 프로퍼티 조회로 정의할 수 있습니다.

home 객체는 메서드가 정의된 객체이며, 이 경우 `m`의 home 객체는 `B.prototype`입니다. 이 객체의 `__proto__`는 `A.prototype`이므로 여기서부터 프로퍼티 `x`를 찾기 시작합니다. 이 경우 정의 시작 객체에서 바로 프로퍼티 `x`를 찾을 수 있지만, 일반적으로는 프로토타입 체인 상의 더 높은 위치에서 찾을 수도 있습니다.

만약 `B.prototype`에 `x`라는 프로퍼티가 정의되어 있다고 하더라도 우리는 이를 무시하고 프로토타입 체인상에서 그보다 위에서 찾기 시작합니다. 또한 이 경우 `super` 프로퍼티 조회는 *receiver* — 즉 메서드 호출 시 `this` 값인 객체 — 에 따라 달라지지 않습니다.

```javascript
B.prototype.m.call(some_other_object); // 여전히 100 반환
```

프로퍼티에 getter가 있는 경우, receiver는 `this` 값으로 getter에 전달됩니다.

요약하자면, `super` 프로퍼티 접근 `super.x`에서 정의 시작 객체는 home 객체의 `__proto__`이며 receiver는 `super` 프로퍼티 접근이 발생하는 메서드의 receiver입니다.

일반적인 속성 접근 `o.x`에서는, 객체 `o`에서 속성 `x`를 찾기 시작하고 프로토타입 체인을 따라 올라갑니다. 만약 `x`가 getter를 가지고 있다면, 우리는 `o`를 리시버로 사용합니다. 즉, 탐색 시작 객체와 리시버는 동일한 객체(`o`)입니다.

*`super` 속성 접근은, 탐색 시작 객체와 리시버가 서로 다른 점을 제외하고는 일반 속성 접근과 유사합니다.*

### 더 빠른 `super` 구현하기

위와 같은 관찰은 빠른 super 속성 접근을 구현하는 핵심이 됩니다. V8는 이미 속성 접근을 빠르게 처리하도록 설계되어 있으며, 이제 리시버와 탐색 시작 객체가 다를 경우에도 이를 일반화했습니다.

V8의 데이터 기반 인라인 캐시 시스템은 빠른 속성 접근을 구현하기 위한 핵심 부분입니다. [위에서 링크된 고급 소개](https://mathiasbynens.be/notes/shapes-ics)나 [V8의 객체 표현 방식](https://v8.dev/blog/fast-properties) 및 [V8의 데이터 기반 인라인 캐시 시스템 구현 방식](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing)에 대한 더 자세한 설명을 참조하세요.

`super`를 더 빠르게 만들기 위해, 우리는 [Ignition](https://v8.dev/docs/ignition) 바이트 코드인 `LdaNamedPropertyFromSuper`를 추가했습니다. 이는 우리가 해석 모드에서 IC 시스템에 연결할 수 있게 해 주고, super 속성 접근을 위한 최적화된 코드를 생성할 수 있게 합니다.

새 바이트 코드를 통해, super 속성 로드를 가속화하기 위해 `LoadSuperIC`라는 새로운 IC를 추가할 수 있었습니다. 이는 일반 속성 로드를 처리하는 `LoadIC`와 유사하며, 본 적이 있는 탐색 시작 객체의 모양을 추적하고, 그러한 모양을 가진 객체에서 속성을 로드하는 방식을 기억합니다.

`LoadSuperIC`는 기존의 속성 로드를 위한 IC 구조를 재사용하며, 단지 다른 탐색 시작 객체를 사용합니다. IC 계층은 이미 탐색 시작 객체와 리시버를 구분하고 있었기 때문에 구현은 비교적 쉬워야 했습니다. 그러나 탐색 시작 객체와 리시버가 항상 동일했었기 때문에, 우리가 탐색 시작 객체를 사용해야 할 곳에서 리시버를 사용했거나 그 반대인 경우의 버그가 있었습니다. 이 버그들은 수정되었고 이제 탐색 시작 객체와 리시버가 다른 경우를 올바르게 지원합니다.

super 속성 접근을 위한 최적화된 코드는 [TurboFan](https://v8.dev/docs/turbofan) 컴파일러의 `JSNativeContextSpecialization` 단계에서 생성됩니다. 이 구현은 존재하는 속성 탐색 구조([`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130))를 일반화하여, 리시버와 탐색 시작 객체가 다른 경우를 처리할 수 있도록 합니다.

최적화된 코드는 우리가 `JSFunction` 내부에 저장된 홈 객체를 클래스 컨텍스트로 옮겼을 때 더욱 최적화되었습니다. 이는 TurboFan이 적절한 경우 이를 상수로 최적화된 코드에 삽입할 수 있게 합니다.

## `super`의 기타 사용 사례

객체 리터럴 메서드 내부의 `super`는 클래스 메서드 내부의 `super`와 동일하게 작동하며, 유사하게 최적화됩니다.

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // returns 100
```

물론, 최적화되지 않은 구석진 사례들도 존재합니다. 예를 들어, super 속성을 작성(`super.x = ...`)하는 것은 최적화되지 않았습니다. 또한, 믹스인을 사용하는 것은 접근 지점을 다형화하여 super 속성 접근 속도를 느리게 만듭니다:

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ 이 접근 지점은 다형적입니다
  }
  return Mixin;
}

class Base {
  m() { return 0; }
}

const myClass = createMixin(
  createMixin(
    createMixin(
      createMixin(
        createMixin(Base)
      )
    )
  )
);
(new myClass()).m();
```

모든 객체 지향 패턴이 최대한 빠르게 작동하도록 보장하기 위해 여전히 해야 할 일이 남아 있습니다. 추가 최적화를 기대하세요!
