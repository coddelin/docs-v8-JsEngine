---
title: "클래스 정적 초기화 블록"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2021-03-30
tags:
  - ECMAScript
description: "자바스크립트 클래스는 정적 초기화를 위한 전용 문법을 갖습니다."
tweet: "1376925666780798989"
---
새로운 클래스 정적 초기화 블록 문법은 개발자가 특정 클래스 정의에 대해 한 번 실행되어야 할 코드를 수집하고 이를 한 곳에 모을 수 있게 합니다. 아래는 암호화 랜덤 숫자 생성기가 정적 블록을 사용하여 `class MyPRNG` 정의가 평가될 때 한 번 엔트로피 풀을 초기화하는 예제입니다.

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error('엔트로피 풀이 고갈되었습니다');
      }
      seed = MyPRNG.entropyPool.pop();
    }
    this.seed = seed;
  }

  getRandom() { … }

  static entropyPool = [];
  static {
    for (let i = 0; i < 512; i++) {
      this.entropyPool.push(probeEntropySource());
    }
  }
}
```

## 범위(Scope)

각 정적 초기화 블록은 자체적인 `var` 및 `let`/`const` 범위를 가집니다. 정적 필드 초기화에서와 마찬가지로, 정적 블록 내에서의 `this` 값은 클래스 생성자 자체입니다. 마찬가지로, 정적 블록 내부에서 `super.property`는 상위 클래스의 정적 속성을 가리킵니다.

```js
var y = '외부 y';
class A {
  static fieldA = 'A.fieldA';
}
class B extends A {
  static fieldB = 'B.fieldB';
  static {
    let x = super.fieldA;
    // → 'A.fieldA'
    var y = this.fieldB;
    // → 'B.fieldB'
  }
}
// 정적 블록은 자체적인 `var` 범위이므로, `var`는 호이스팅되지 않습니다!
y;
// → '외부 y'
```

## 여러 블록

클래스에는 여러 개의 정적 초기화 블록이 있을 수 있습니다. 이러한 블록은 텍스트 순서대로 평가됩니다. 추가적으로, 정적 필드가 있는 경우 모든 정적 요소는 텍스트 순서대로 평가됩니다.

```js
class C {
  static field1 = console.log('필드 1');
  static {
    console.log('정적 블록 1');
  }
  static field2 = console.log('필드 2');
  static {
    console.log('정적 블록 2');
  }
}
// → 필드 1
//   정적 블록 1
//   필드 2
//   정적 블록 2
```

## 프라이빗 필드 접근

클래스 정적 초기화 블록은 항상 클래스 내부에 중첩되어 있기 때문에 해당 클래스의 프라이빗 필드에 접근할 수 있습니다.

```js
let getDPrivateField;
class D {
  #privateField;
  constructor(v) {
    this.#privateField = v;
  }
  static {
    getDPrivateField = (d) => d.#privateField;
  }
}
getDPrivateField(new D('프라이빗'));
// → 프라이빗
```

이 정도면 충분합니다. 객체 지향 프로그래밍을 즐기세요!

## 클래스 정적 초기화 블록 지원

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
