---
title: "개인 브랜드 검사 일명 `#foo in obj`"
author: "마르야 헐타 ([@marjakh](https://twitter.com/marjakh))"
avatars: 
  - "marja-holtta"
date: 2021-04-14
tags: 
  - ECMAScript
description: "개인 브랜드 검사를 통해 객체에 개인 필드의 존재를 테스트할 수 있습니다."
tweet: "1382327454975590401"
---

[`in` 연산자](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)는 주어진 객체(또는 그 프로토타입 체인의 객체)에 주어진 속성이 있는지 테스트하는 데 사용할 수 있습니다:

```javascript
const o1 = {'foo': 0};
console.log('foo' in o1); // true
const o2 = {};
console.log('foo' in o2); // false
const o3 = Object.create(o1);
console.log('foo' in o3); // true
```

개인 브랜드 검사 기능은 `in` 연산자를 확장하여 [개인 클래스 필드](https://v8.dev/features/class-fields#private-class-fields)를 지원합니다:

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }
  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false

class B {
  #foo = 0;
}

A.test(new B()); // false; 동일한 #foo가 아님
```

개인 이름은 그것을 정의한 클래스 내부에서만 사용할 수 있으므로 테스트는 위의 `static test`와 같은 메서드에서와 같이 클래스 내부에서 발생해야 합니다.

하위 클래스 인스턴스는 소유 속성으로 부모 클래스에서 개인 필드를 받습니다:

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

그러나 `Object.create`로 생성된 객체(또는 `__proto__` 세터나 `Object.setPrototypeOf`를 통해 나중에 프로토타입이 설정된 경우)는 소유 속성으로 개인 필드를 받지 않습니다. 개인 필드 조회는 소유 속성에서만 작동하므로 `in` 연산자는 이러한 상속된 필드를 찾지 못합니다:

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, 개인 필드는 상속되었지만 소유되지 않음
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, 개인 필드는 상속되었지만 소유되지 않음
A.test(o2.__proto__); // true
```

존재하지 않는 개인 필드에 액세스하면 오류가 발생합니다. 이는 일반 속성의 경우와 달리, 존재하지 않는 속성에 액세스할 때 `undefined`를 반환하지만 오류를 발생시키지 않기 때문입니다. 개인 브랜드 검사 이전에는, 개발자는 필요한 개인 필드가 없는 객체의 경우 대비 백업 동작을 구현하기 위해 `try`-`catch`를 사용해야 했습니다:

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // obj에 #foo가 없는 경우 대비 백업
    }
  }
  #foo = 0;
}
```

이제 개인 필드의 존재는 개인 브랜드 검사를 사용하여 테스트할 수 있습니다:

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // obj에 #foo가 없는 경우 대비 백업
    }
  }
  #foo = 0;
}
```

그러나 주의하세요 - 하나의 개인 필드의 존재는 객체가 클래스에서 선언한 모든 개인 필드를 갖고 있음을 보장하지 않습니다! 다음 예제는 해당 클래스에서 선언한 두 개인 필드 중 하나만 가진 반쯤 생성된 객체를 보여줍니다:

```javascript
let halfConstructed;
class F {
  m() {
    console.log(#x in this); // true
    console.log(#y in this); // false
  }
  #x = 0;
  #y = (() => {
    halfConstructed = this;
    throw 'error';
  })();
}

try {
  new F();
} catch {}

halfConstructed.m();
```

## 개인 브랜드 검사 지원

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
