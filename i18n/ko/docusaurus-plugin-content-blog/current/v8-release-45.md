---
title: "V8 릴리스 v4.5"
author: "V8 팀"
date: 2015-07-17 13:33:37
tags:
  - 릴리스
description: "V8 v4.5는 성능 향상과 함께 여러 ES2015 기능 지원을 추가합니다."
---
약 6주마다 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 V8의 Git 마스터에서 Chrome이 Chrome Beta 마일스톤을 위해 브랜치하기 직전에 분기됩니다. 오늘은 최신 브랜치인 [V8 버전 4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5)를 발표하게 되어 기쁩니다. 이 브랜치는 Chrome 45 Stable과 함께 릴리스될 때까지 베타 상태에 있을 것입니다. V8 v4.5는 개발자가 사용하기 좋은 다양한 기능들로 가득 차 있어 몇 주 후에 릴리스될 예정인 주요 내용을 미리 보여드리고자 합니다.

<!--truncate-->
## 향상된 ECMAScript 2015 (ES6) 지원

V8 v4.5는 여러 [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/) 기능을 지원합니다.

### 화살표 함수

[화살표 함수](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)를 이용하면 보다 간결한 코드를 작성할 수 있습니다.

```js
const data = [0, 1, 3];
// 화살표 함수를 사용하지 않은 코드
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// 화살표 함수를 사용한 코드
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

화살표 함수의 또 다른 주요 장점은 'this'의 레키컬 바인딩입니다. 결과적으로 메서드에서 콜백을 사용하는 것이 훨씬 간단해집니다.

```js
class MyClass {
  constructor() { this.a = '안녕하세요, '; }
  hello() { setInterval(() => console.log(this.a + '세계!'), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### 배열/TypedArray 함수

ES2015에 명시된 [배열 및 TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#Methods)의 새로운 메서드는 이제 V8 v4.5에서 지원됩니다. 배열과 TypedArray를 더 편리하게 작업할 수 있습니다. 추가된 메서드 중에는 `Array.from` 및 `Array.of`가 있습니다. 각 종류의 TypedArray에서 대부분의 `Array` 메서드를 반영하는 메서드도 추가되었습니다.

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)는 개발자가 객체를 빠르게 병합하고 복제할 수 있도록 해줍니다.

```js
const target = { a: '안녕하세요, ' };
const source = { b: '세계!' };
// 객체 병합
Object.assign(target, source);
console.log(target.a + target.b);
```

이 기능은 기능을 혼합하는 데에도 사용할 수 있습니다.

## 더욱 최적화 가능한 JavaScript 언어 기능

수년간, V8의 전통적인 최적화 컴파일러인 [Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)는 많은 일반적인 JavaScript 패턴을 최적화하는 훌륭한 역할을 했습니다. 그러나 JavaScript 전체 언어를 지원할 수 있는 기능은 없었으며, `try`/`catch` 및 `with`와 같은 특정 언어 기능을 함수에서 사용하는 것이 최적화되지 못하게 했습니다. V8은 이러한 함수에 대해 느린 초기 컴파일러로 돌아가야 했습니다.

V8의 새로운 최적화 컴파일러인 [TurboFan](/blog/turbofan-jit)의 설계 목표 중 하나는 ECMAScript 2015 기능을 포함한 모든 JavaScript를 결국 최적화할 수 있도록 하는 것입니다. V8 v4.5에서는 TurboFan을 사용하여 Crankshaft에서 지원하지 않는 일부 언어 기능(`for`-`of`, `class`, `with`, 계산된 속성 이름)을 최적화하기 시작했습니다.

여기 'for-of'를 사용하는 코드의 예가 있습니다. 이는 이제 TurboFan으로 컴파일할 수 있습니다.

```js
const sequence = ['첫째', '둘째', '셋째'];
for (const value of sequence) {
  // 이 범위는 이제 최적화 가능합니다.
  const object = {a: '안녕하세요, ', b: '세계!', c: value};
  console.log(object.a + object.b + object.c);
}
```

초기에 이러한 언어 기능을 사용하는 함수는 Crankshaft에 의해 컴파일된 다른 코드만큼 높은 성능에 도달하지 못할 수도 있지만, TurboFan은 현재의 초기 컴파일러보다 훨씬 더 속도를 개선할 수 있습니다. 더 나아가, TurboFan의 최적화를 개발하면서 성능이 빠르게 계속 향상될 것입니다.

## V8 API

[API 변경 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인해 보세요. 이 문서는 주요 릴리스 후 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](https://v8.dev/docs/source-code#using-git)이 있는 개발자는 `git checkout -b 4.5 -t branch-heads/4.5`를 사용하여 V8 v4.5의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 새로운 기능을 직접 사용해 볼 수 있습니다.
