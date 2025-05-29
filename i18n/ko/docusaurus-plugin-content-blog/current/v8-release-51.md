---
title: "V8 릴리스 v5.1"
author: "V8 팀"
date: 2016-04-23 13:33:37
tags:
  - release
description: "V8 v5.1은 성능 개선, 지터 감소, 메모리 소비 감소 및 ECMAScript 언어 기능 지원 증가를 제공합니다."
---
V8 [릴리스 프로세스](/docs/release-process)의 첫 번째 단계는 약 6주마다 Chrome 베타 마일스톤을 위해 Chromium이 분기되기 직전에 Git 마스터에서 새 분기를 만드는 것입니다. 우리의 최신 릴리스 분기는 [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1)이며, Chrome 51 Stable과 함께 안정적인 빌드를 릴리스할 때까지 베타 상태를 유지할 것입니다. 이번 V8 버전에서 개발자들이 주목해야 할 새로운 기능을 소개합니다.

<!--truncate-->
## 향상된 ECMAScript 지원

V8 v5.1은 ES2017 초안 규격 준수를 위한 여러 가지 변경 사항을 포함하고 있습니다.

### `Symbol.species`

`Array.prototype.map`과 같은 배열 메서드는 해당 하위 클래스의 인스턴스를 출력으로 생성하며, [`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species)를 변경하여 이를 사용자 정의할 수 있습니다. 이와 유사한 변경 사항이 다른 기본 클래스에도 적용되었습니다.

### `instanceof` 사용자 정의

생성자는 자체 [`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols) 메서드를 구현하여 기본 동작을 재정의할 수 있습니다.

### 반복자 종료

[`for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) 루프(또는 [스프레드](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator) 연산자와 같은 기타 내장 반복)를 생성하는 반복자는 종료 메서드가 있는지 확인하며, 루프가 일찍 종료되는 경우 호출됩니다. 이를 통해 반복이 끝난 후 정리 작업을 수행할 수 있습니다.

### RegExp 하위 클래스의 `exec` 메서드

RegExp 하위 클래스는 기본 매칭 알고리즘만 수정할 수 있도록 `exec` 메서드를 덮어쓸 수 있으며, 이 방법은 `String.prototype.replace`와 같은 고수준 함수에 의해 호출됩니다.

### 함수 이름 추론

함수 표현식의 추론된 함수 이름이 이제 일반적으로 ES2015의 규칙 공식화를 따라 함수의 [`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name) 속성으로 제공됩니다. 이 변경은 기존 스택 트레이스를 변경하거나 이전 V8 버전과 다른 이름을 제공할 수 있습니다. 또한 계산된 속성 이름을 가진 속성과 메서드에 유용한 이름을 부여합니다:

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

다른 컬렉션 타입과 마찬가지로, 배열의 [`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values) 메서드는 배열의 내용을 반복하는 반복자를 반환합니다.

## 성능 향상

V8 v5.1은 다음 JavaScript 기능과 관련하여 몇 가지 주목할 만한 성능 향상을 제공합니다:

- `for`-`in` 루프 실행
- `Object.assign`
- Promise 및 RegExp 인스턴스화
- `Object.prototype.hasOwnProperty` 호출
- `Math.floor`, `Math.round` 및 `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` & `Array.prototype.toString`
- 반복 문자열 평탄화 예: `'.'.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1은 [WebAssembly](/blog/webassembly-experimental)를 위한 초기 지원을 포함합니다. `d8`에서 `--expose_wasm` 플래그를 통해 활성화할 수 있습니다. 또는 Chrome 51(베타 채널)로 [Wasm 데모](https://webassembly.github.io/demo/)를 직접 체험할 수 있습니다.

## 메모리

V8은 [Orinoco](/blog/orinoco)의 추가 부분을 구현했습니다:

- 병렬 젊은 세대 이동
- 확장 가능한 기억 세트
- 블랙 할당

이로 인해 필요 시 지터와 메모리 소비가 감소합니다.

## V8 API

우리의 [API 변경 사항 요약](https://bit.ly/v8-api-changes)을 확인하세요. 이 문서는 주요 릴리스 후 몇 주 뒤에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](https://v8.dev/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 5.1 -t branch-heads/5.1` 명령을 사용하여 V8 v5.1의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 구독하여 새 기능을 직접 체험할 수도 있습니다.
