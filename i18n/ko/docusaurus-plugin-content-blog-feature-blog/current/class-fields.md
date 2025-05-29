---
title: "공용 및 비공용 클래스 필드"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-12-13
tags: 
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: "여러 제안이 기존 JavaScript 클래스 문법을 새로운 기능으로 확장합니다. 이 글은 V8 v7.2와 Chrome 72에서 새로운 공용 클래스 필드 문법, 그리고 곧 출시될 비공용 클래스 필드 문법에 대해 설명합니다."
tweet: "1121395767170740225"
---
여러 제안이 기존 JavaScript 클래스 문법을 새로운 기능으로 확장합니다. 이 글은 V8 v7.2와 Chrome 72에서 새로운 공용 클래스 필드 문법, 그리고 곧 출시될 비공용 클래스 필드 문법에 대해 설명합니다.

`IncreasingCounter`라는 이름의 클래스 인스턴스를 생성하는 코드 예시는 다음과 같습니다:

```js
const counter = new IncreasingCounter();
counter.value;
// 로그 출력: '현재 값을 가져오는 중!'
// → 0
counter.increment();
counter.value;
// 로그 출력: '현재 값을 가져오는 중!'
// → 1
```

`value` 접근 시 코드를 실행한 후 결과를 반환합니다(즉, 메시지가 로그에 출력됩니다). 그렇다면 이 클래스를 JavaScript로 어떻게 구현할 수 있을까요? 🤔

## ES2015 클래스 문법

`IncreasingCounter`를 ES2015 클래스 문법을 사용하여 구현하는 방법은 다음과 같습니다:

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log('현재 값을 가져오는 중!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

클래스는 `value` getter와 `increment` 메소드를 프로토타입에 설치합니다. 더 흥미로운 것은, 클래스가 생성자인데, 이는 인스턴스 속성 `_count`를 생성하고 초기값을 `0`으로 설정합니다. 현재는 언더스코어 접두사를 사용하여 `_count`를 소비자가 직접 사용하지 않도록 권장합니다. 하지만 이것은 단지 관례일 뿐이며, 언어에 의해 특별한 의미가 부여된 _“비공용”_ 속성은 아닙니다.

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// 로그 출력: '현재 값을 가져오는 중!'
// → 0

// `_count` 인스턴스 속성을 읽거나 변경하는 것을
// 아무도 막지 못합니다. 😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// 로그 출력: '현재 값을 가져오는 중!'
// → 42
```

## 공용 클래스 필드

새로운 공용 클래스 필드 문법을 사용하면 클래스 정의를 단순화할 수 있습니다:

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log('현재 값을 가져오는 중!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

`_count` 속성이 이제 클래스 상단에 깔끔하게 선언되었습니다. 필드를 정의하기 위해 더 이상 생성자가 필요하지 않습니다. 정말 깔끔하네요!

하지만 `_count` 필드는 여전히 공용 속성입니다. 이 특정 예에서 우리는 사람들이 속성에 직접 접근하는 것을 방지하고 싶습니다.

## 비공용 클래스 필드

여기서 비공용 클래스 필드가 등장합니다. 새로운 비공용 필드 문법은 공용 필드와 비슷하지만 [필드 이름 앞에 `#`를 사용하여 비공용으로 표시](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md)합니다. `#`를 필드 이름의 일부로 간주할 수 있습니다:

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('현재 값을 가져오는 중!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

비공용 필드는 클래스 본문 밖에서는 접근할 수 없습니다:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## 공용 및 비공용 정적 속성

클래스 필드 문법은 공용 및 비공용 정적 속성과 메소드를 생성하는 데도 사용할 수 있습니다:

```js
class FakeMath {
  // `PI`는 공용 정적 속성입니다.
  static PI = 22 / 7; // 가까운 값입니다.

  // `#totallyRandomNumber`는 비공용 정적 속성입니다.
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber`는 비공용 정적 메소드입니다.
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random`은 공용 정적 메소드(ES2015 문법)로, `#computeRandomNumber`를 소비합니다.
  static random() {
    console.log('랜덤 넘버를 좋아한다는 말을 들었어요…');
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// 로그 출력: '랜덤 넘버를 좋아한다는 말을 들었어요…'
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## 간단한 서브클래싱

클래스 필드 문법의 장점은 추가 필드를 도입하는 서브클래스를 다룰 때 더욱 명확해집니다. 다음의 기본 클래스 `Animal`을 상상해보세요:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

추가 인스턴스 속성을 도입하는 `Cat` 서브클래스를 생성하려면, 기본 클래스 `Animal`의 생성자를 실행하기 위해 `super()`를 호출한 후 속성을 생성해야 합니다:

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('야옹!');
  }
}
```

고양이는 목욕을 즐기지 않는다는 것을 나타내기 위해 많은 보일러플레이트 코드가 필요합니다. 다행히도 클래스 필드 문법을 사용하면 전체 생성자와 어색한 `super()` 호출을 포함하는 부분을 제거할 수 있습니다:

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('야옹!');
  }
}
```

## 기능 지원

### 공개 클래스 필드 지원

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="yes https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### 비공개 클래스 필드 지원

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### 비공개 메서드 및 접근자 지원

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
