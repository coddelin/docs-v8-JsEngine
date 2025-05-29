---
title: "RegExp 매치 인덱스"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), 새로운 기능을 정기적으로 표현"
avatars:
  - "maya-armyanova"
date: 2019-12-17
tags:
  - ECMAScript
  - Node.js 16
description: "RegExp 매치 인덱스는 각 매치된 캡처 그룹의 `start`와 `end` 인덱스를 제공합니다."
tweet: "1206970814400270338"
---
JavaScript는 이제 '매치 인덱스(match indices)'라는 새 정규 표현식 기능을 갖추게 되었습니다. JavaScript 코드에서 예약어와 일치하는 유효하지 않은 변수 이름을 찾아 변수 이름 아래에 캐럿(caret)과 '밑줄'을 출력하고 싶다고 상상해보세요:

<!--truncate-->
```js
const function = foo;
      ^------- 유효하지 않은 변수 이름
```

위 예시에서 `function`은 예약어로, 변수 이름으로 사용할 수 없습니다. 이를 위해 다음 함수를 작성할 수 있습니다:

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // 인덱스 `1`은 첫 번째 캡처 그룹을 나타냅니다.
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // 캐럿 위치 조정
    '^' +
    '-'.repeat(end - start - 1) +   // 밑줄 추가
    ' ' + message;                  // 메시지 추가
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // 잘못된 코드
displayError(code, '유효하지 않은 변수 이름');
```

:::note
**참고:** 간단하게 하려고 위 예시에는 JavaScript [예약어](https://mathiasbynens.be/notes/reserved-keywords)의 일부만 포함했습니다.
:::

간단히 말해, 새 `indices` 배열은 각 매치된 캡처 그룹의 시작 및 종료 위치를 저장합니다. 이 새 배열은 소스 정규 표현식이 `/d` 플래그를 사용하는 경우, `RegExp#exec`, `String#match`, 그리고 [`String#matchAll`](https://v8.dev/features/string-matchall)과 같은 정규식 매치 객체를 생성하는 모든 내장 함수에서 사용할 수 있습니다.

더 자세히 어떻게 작동하는지 알고 싶다면 계속 읽어보세요.

## 동기

좀 더 복잡한 예제로 넘어가 프로그래밍 언어를 파싱하는 작업을 어떻게 해결할지 생각해 봅시다(예: [TypeScript 컴파일러](https://github.com/microsoft/TypeScript/tree/master/src/compiler)가 수행하는 작업). 먼저 입력 소스 코드를 토큰으로 나누고, 그런 다음 토큰에 구문 구조를 부여합니다. 사용자가 구문적으로 잘못된 코드를 작성했다면, 문제있는 코드가 처음으로 발견된 위치를 가리키면서 의미 있는 오류 메시지를 제공하고 싶을 것입니다. 예를 들어, 다음 코드 조각을 보면:

```js
let foo = 42;
// 다른 코드
let foo = 1337;
```

프로그래머에게 다음과 같은 오류를 제공하고 싶습니다:

```js
let foo = 1337;
    ^
SyntaxError: Identifier 'foo'는 이미 선언되었습니다
```

이 목표를 달성하려면 몇 가지 구성 요소가 필요합니다. 첫 번째는 TypeScript 식별자를 인식하는 것입니다. 그런 다음 오류가 발생한 정확한 위치를 찾는 데 집중하겠습니다. 다음 예제를 고려해 보세요. 여기선 문자열이 유효한 식별자인지 파악하기 위해 정규식을 사용합니다:

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**참고:** 실제 상황의 파서는 새롭게 도입된 [정규식의 속성 이스케이프](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples)를 사용하여 모든 유효한 ECMAScript 식별자 이름을 매치할 수 있는 다음 정규 표현식을 사용할 수 있습니다:

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

간단히 하기 위해 라틴 문자, 숫자, 밑줄만 매치하는 이전 정규식을 사용하겠습니다.
:::

위와 같은 변수 선언에서 오류가 발생하고 사용자에게 정확한 위치를 출력하려면, 위 정규식을 확장하고 비슷한 기능을 사용할 수 있습니다:

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

`RegExp.prototype.exec`에 의해 반환된 매치 객체의 `index` 속성은 전체 매치의 시작 위치를 반환합니다. 그러나 위에 설명된 것과 같은 사용 사례에서는 종종 (복수일 수도 있는) 캡처 그룹을 사용하는 경우가 많습니다. 하지만 지금까지 JavaScript는 캡처 그룹이 매치한 부분 문자열의 시작 및 종료 인덱스를 노출하지 않았습니다.

## RegExp 매치 인덱스 설명

이상적으로, 우리는 `let`/`const` 키워드가 아니라 변수 이름 위치에 오류를 출력하고 싶습니다(위 예시처럼 출력되지 않도록). 하지만 이를 위해서는 `2번` 인덱스를 가진 캡처 그룹의 위치를 찾아야 합니다. (인덱스 `1`은 `(let|const|var)` 캡처 그룹을 나타내며, `0`은 전체 매치를 나타냅니다.)

위에서 언급한 대로, [새로운 JavaScript 기능](https://github.com/tc39/proposal-regexp-match-indices)은 `RegExp.prototype.exec()`의 결과(부분 문자열 배열)에 `indices` 속성을 추가합니다. 이 새로운 속성을 활용하여 위의 예제를 향상시켜 봅시다:

```js
function getVariablePosition(source) {
  // `d` 플래그에 주목하세요. 이는 `match.indices`를 활성화합니다.
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition('let foo');
// → [4, 7]
```

이 예제는 배열 `[4, 7]`을 반환하며, 이는 인덱스 `2`를 가진 그룹에서 매치된 부분 문자열의 `[start, end)` 위치입니다. 이 정보를 바탕으로 컴파일러는 이제 원하는 오류를 출력할 수 있습니다.

## 추가 기능

`indices` 객체는 또한 [이름 있는 캡쳐 그룹](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups)의 이름으로 인덱싱할 수 있는 `groups` 속성을 포함합니다. 이를 사용하여 위 함수는 다음과 같이 다시 작성될 수 있습니다:

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition('let foo');
```

## RegExp 매치 인덱스 지원

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="no"></feature-support>
