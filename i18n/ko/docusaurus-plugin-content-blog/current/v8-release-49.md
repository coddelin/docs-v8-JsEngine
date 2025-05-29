---
title: 'V8 릴리스 v4.9'
author: 'V8 팀'
date: 2016-01-26 13:33:37
tags:
  - release
description: 'V8 v4.9는 개선된 `Math.random` 구현을 제공하며 몇 가지 새로운 ES2015 언어 기능을 지원합니다.'
---
약 6주마다 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤을 위해 Chrome이 분리되기 직전에 V8의 Git 마스터로부터 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9)를 발표하게 되어 기쁩니다. 이 브랜치는 Chrome 49 Stable과의 협업을 통해 출시될 때까지 베타 버전으로 제공됩니다. V8 4.9는 개발자들이 직면하는 다양한 유용한 기능들로 가득 차 있으므로 몇 주 후 출시에 앞서 주요 내용을 미리 보여드리고자 합니다.

<!--truncate-->
## 91% ECMAScript 2015 (ES6) 지원

V8 릴리스 4.9에서는 이전 릴리스보다 더 많은 JavaScript ES2015 기능을 제공하여 [Kangax 호환성 테이블](https://kangax.github.io/compat-table/es6/) 기준으로 91% 완료 상태에 도달했습니다(1월 26일 기준). V8은 이제 디스트럭처링, 기본 매개변수, Proxy 객체 및 Reflect API를 지원합니다. 릴리스 4.9는 또한 `class` 및 `let` 같은 블록 수준의 구조를 엄격 모드 외부에서도 사용할 수 있도록 만들고 정규식의 스티키 플래그와 사용자 정의 가능한 `Object.prototype.toString` 출력을 지원합니다.

### 디스트럭처링

변수 선언, 매개변수 및 할당은 이제 패턴을 통해 객체와 배열의 [디스트럭처링](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)을 지원합니다. 예를 들면:

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

배열 패턴은 배열의 나머지를 할당받는 나머지 패턴을 포함할 수 있습니다:

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

게다가 패턴 요소에는 기본값을 지정할 수 있으며, 적절한 속성이 일치하지 않는 경우 기본값이 사용됩니다:

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// 또는…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

디스트럭처링은 객체와 배열에서 데이터를 더 간결하게 접근할 수 있도록 만들어줍니다.

### 프록시 & Reflect

오랜 기간의 개발 끝에, V8은 이제 완전한 [프록시](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 구현을 ES2015 스펙에 맞게 제공합니다. 프록시는 속성 접근을 사용자 지정할 수 있는 개발자 제공 훅 집합을 통해 객체와 함수의 가상화를 가능하게 하는 강력한 메커니즘입니다. 객체 가상화 외에도 프록시는 인터셉션 구현, 속성 설정에 대한 유효성 검사 추가, 디버깅 및 프로파일링 간소화, [멤브레인](http://tvcutsem.github.io/js-membranes/)과 같은 고급 추상화를 활용할 수 있습니다.

특정 객체의 프록시를 생성하려면 다양한 트랩을 정의하는 핸들러 placeholder 객체를 만들어 프록시가 가상화하는 타겟 객체에 적용해야 합니다:

```js
const target = {};
const handler = {
  get(target, name='world') {
    return `Hello, ${name}!`;
  }
};

const foo = new Proxy(target, handler);
foo.bar;
// → 'Hello, bar!'
```

프록시 객체와 함께 Reflect 모듈이 제공되며, 모든 프록시 트랩에 대해 적합한 기본값을 정의합니다:

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`Debug: get 호출됨, 필드: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`Debug: set 호출됨, 필드: ${name}, 값: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = 'John Doe';
// Debug: set 호출됨, 필드: name, 값: John Doe
const title = `Mr. ${debugMe.name}`; // → 'Mr. John Doe'
// Debug: get 호출됨, 필드: name
```

프록시와 Reflect API 사용에 대한 자세한 내용은 [MDN 프록시 페이지](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Examples)의 예제 섹션을 참조하세요.

### 기본 매개변수

ES5 및 이전 버전에서는 함수 정의에서 선택적 매개변수를 처리하려면 매개변수가 정의되지 않은지 확인하는 보일러플레이트 코드를 작성해야 했습니다:

```js
function sublist(list, start, end) {
  if (typeof start === 'undefined') start = 0;
  if (typeof end === 'undefined') end = list.length;
  ...
}
```

ES2015에서는 함수 매개변수가 [기본값](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)을 가질 수 있게 되었으며, 이를 통해 더 명확하고 간결한 함수 정의가 가능합니다:

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

기본 매개변수와 구조 분해를 물론 결합할 수 있습니다:

```js
function vector([x, y, z] = []) { … }
```

### 느슨한 모드에서 클래스와 렉시컬 선언

V8은 버전 4.1과 4.2부터 각각 렉시컬 선언(`let`, `const`, 블록-로컬 `function`)과 클래스를 지원했지만, 지금까지 이를 사용하려면 엄격 모드가 필요했습니다. V8 버전 4.9부터 이제 ES2015 사양에 따라 이러한 기능들이 엄격 모드 외부에서도 활성화됩니다. 이로 인해 DevTools Console에서 프로토타이핑이 훨씬 쉬워졌지만, 개발자들에게는 새로운 코드를 위해 엄격 모드로 전환할 것을 권장합니다.

### 정규식

V8은 이제 정규식에서 새로운 [sticky 플래그](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky)를 지원합니다. sticky 플래그는 문자열에서 검색이 일반적으로 문자열의 시작 부분에서 시작되는지 (`lastIndex` 속성에서 시작되도록) 여부를 전환합니다. 이 동작은 많은 서로 다른 정규식으로 임의 길이의 입력 문자열을 효율적으로 파싱하는 데 유용합니다. sticky 검색을 활성화하려면 정규식에 `y` 플래그를 추가하세요: (예: `const regex = /foo/y;`).

### 사용자 정의 가능한 `Object.prototype.toString` 출력

`Symbol.toStringTag`를 사용하여 사용자 정의 타입이 `Object.prototype.toString`에 전달되었을 때 사용자 정의된 출력을 반환할 수 있습니다(직접 또는 문자열 강제 변환의 결과로):

```js
class Custom {
  get [Symbol.toStringTag]() {
    return &apos;Custom&apos;;
  }
}
Object.prototype.toString.call(new Custom);
// → &apos;[object Custom]&apos;
String(new Custom);
// → &apos;[object Custom]&apos;
```

## 향상된 `Math.random()`

V8 v4.9는 `Math.random()` 구현의 향상을 포함하고 있습니다. [지난달 발표된 대로](/blog/math-random), V8의 PRNG 알고리즘을 [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf)로 전환하여 더 높은 품질의 의사 난수를 제공합니다.

## V8 API

API 변경 사항에 대한 [요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 각 주요 릴리스 후 몇 주 후에 정기적으로 업데이트 됩니다.

[활성 V8 체크아웃](https://v8.dev/docs/source-code#using-git)을 가지고 있는 개발자는 `git checkout -b 4.9 -t branch-heads/4.9` 명령을 사용하여 V8 v4.9의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome&apos;s Beta 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 새로운 기능을 직접 사용해 볼 수 있습니다.
