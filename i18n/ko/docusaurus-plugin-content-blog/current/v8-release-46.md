---
title: 'V8 릴리스 v4.6'
author: 'V8 팀'
date: 2015-08-28 13:33:37
tags:
  - release
description: 'V8 v4.6은 지연 감소와 새로운 ES2015 언어 기능 지원을 제공합니다.'
---
대략 여섯 주마다, 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새 브랜치를 만듭니다. 각 버전은 Chrome이 Chrome Beta 마일스톤을 위해 분기하기 직전에 V8의 Git master에서 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6)을 발표하게 되어 기쁘며, 이 버전은 Chrome 46 Stable과 조정되어 릴리스될 때까지 베타 상태로 유지됩니다. V8 4.6은 개발자 중심의 다양한 혜택으로 가득 차 있으며, 몇 주 후 릴리스를 기대하며 주요 내용을 미리 소개하고자 합니다.

<!--truncate-->
## 개선된 ECMAScript 2015 (ES6) 지원

V8 v4.6은 여러 [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/) 기능을 지원합니다.

### 전개 연산자

[전개 연산자](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)는 배열을 다루는 것을 훨씬 더 편리하게 만듭니다. 예를 들어, 배열을 병합하고자 할 때, 명령형 코드를 불필요하게 만듭니다.

```js
// 배열 병합
// 전개 연산자를 사용하지 않은 코드
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// 전개 연산자를 사용한 코드
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

또한 전개 연산자를 사용하여 `apply`를 대체할 수 있습니다:

```js
// 배열에 저장된 함수 매개변수
// 전개 연산자를 사용하지 않은 코드
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = ['안녕하세요', '전개', '연산자!'];
myFunction.apply(null, argsInArray);

// 전개 연산자를 사용한 코드
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = ['안녕하세요', '전개', '연산자!'];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target)은 클래스 작업을 개선하기 위해 설계된 ES6 기능 중 하나입니다. 내부적으로 이는 모든 함수에 암묵적인 매개변수입니다. 함수가 new 키워드로 호출되면 매개변수는 호출된 함수의 참조를 보유합니다. new가 사용되지 않으면 매개변수는 undefined입니다.

실제로, 이것은 new.target을 사용하여 함수가 일반적으로 호출되었는지 아니면 new 키워드를 통해 생성자로 호출되었는지 알 수 있다는 뜻입니다.

```js
function myFunction() {
  if (new.target === undefined) {
    throw 'new 키워드로 호출해 보세요.';
  }
  console.log('작동합니다!');
}

// 깨짐:
myFunction();

// 작동:
const a = new myFunction();
```

ES6 클래스와 상속이 사용될 때, super 클래스의 생성자 내에서 new.target은 new로 호출된 파생 생성자에 바인딩됩니다. 특히 이것은 super 클래스가 생성 중 파생 클래스의 프로토타입에 접근할 수 있게 합니다.

## 지연 감소

[지연](https://en.wiktionary.org/wiki/jank#Noun)은 특히 게임을 할 때 고통스러울 수 있습니다. 종종, 게임이 여러 플레이어를 포함할 때는 더욱 악화됩니다. [oortonline.gl](http://oortonline.gl/)은 현재 브라우저의 한계를 테스트하기 위해 파티클 효과 및 현대적인 셰이더 렌더링을 사용하여 복잡한 3D 장면을 렌더링하는 WebGL 벤치마크입니다. V8 팀은 이러한 환경에서 Chrome의 성능 한계를 밀어붙이기 위해 노력했습니다. 우리는 아직 끝나지 않았지만, 우리의 노력의 결실은 이미 나타나고 있습니다. Chrome 46은 아래에서 직접 확인할 수 있듯 oortonline.gl 성능에서 놀라운 진전을 보여줍니다.

몇 가지 최적화에는 다음이 포함됩니다:

- [TypedArray 성능 향상](https://code.google.com/p/v8/issues/detail?id=3996)
    - TypedArrays는 Turbulenz와 같은 렌더링 엔진(예: oortonline.gl의 엔진)에서 많이 사용됩니다. 예를 들어, 엔진들은 종종 JavaScript에서 typed 배열(예: Float32Array)을 생성하고 변형을 적용한 후 WebGL에 전달합니다.
    - 핵심은 임베더(Blink)와 V8 간 상호작용을 최적화하는 것이었습니다.
- [V8에서 Blink로 TypedArrays 및 기타 메모리 전달 시 성능 개선](https://code.google.com/p/chromium/issues/detail?id=515795)
    - WebGL에 단방향 통신의 일부로 전달되는 typed 배열에 대해 추가적인 핸들(V8에 의해 추적되는)을 생성할 필요가 없습니다.
    - 외부(Blink에서) 메모리 한도에 도달하면 전체 가비지 컬렉션 대신 점진적인 가비지 컬렉션을 시작합니다.
- [유휴 가비지 컬렉션 스케줄링](/blog/free-garbage-collection)
    - 가비지 컬렉션 연산은 메인 스레드의 유휴 시간 동안 스케줄링되어 컴포지터를 해제하고 더 부드러운 렌더링을 제공합니다.
- [가비지 컬렉션 힙의 전체 old generation에 동시 스위핑 활성화](https://code.google.com/p/chromium/issues/detail?id=507211)
    - 사용하지 않는 메모리 청크의 해제가 주 스레드와 동시 실행되는 추가 스레드에서 수행되어 주요 가비지 컬렉션 일시 중지 시간을 크게 줄입니다.

긍정적인 점은 oortonline.gl 관련 모든 변경 사항이 WebGL을 많이 사용하는 응용 프로그램의 모든 사용자에게 잠재적으로 영향을 미치는 일반적인 개선 사항이라는 것입니다.

## V8 API

[API 변경 사항 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 각 주요 릴리스 후 몇 주마다 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](https://v8.dev/docs/source-code#using-git)이 있는 개발자는 `git checkout -b 4.6 -t branch-heads/4.6` 명령을 사용하여 V8 v4.6의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 베타 채널을 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능을 직접 확인할 수 있습니다.
