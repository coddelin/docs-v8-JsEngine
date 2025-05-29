---
title: 'String.prototype.replaceAll'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-11-11
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: 'JavaScript는 이제 새로운 `String.prototype.replaceAll` API를 통해 글로벌 하위 문자열 교체를 위한 일류 지원을 제공합니다.'
tweet: '1193917549060280320'
---
JavaScript에서 문자열을 다뤄본 적이 있다면, `String#replace` 메서드에 대해 들어본 적이 있을 가능성이 큽니다. `String.prototype.replace(searchValue, replacement)`는 지정한 매개변수에 따라 일부 일치 항목이 교체된 문자열을 반환합니다:

<!--truncate-->
```js
'abc'.replace('b', '_');
// → 'a_c'

'🍏🍋🍊🍓'.replace('🍏', '🥭');
// → '🥭🍋🍊🍓'
```

일반적인 사례는 주어진 하위 문자열의 _모든_ 인스턴스를 교체하는 것입니다. 그러나 `String#replace`는 이 사용 사례를 직접 처리하지 않습니다. `searchValue`가 문자열일 때, 하위 문자열의 첫 번째 발생만 교체됩니다:

```js
'aabbcc'.replace('b', '_');
// → 'aa_bcc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace('🍏', '🥭');
// → '🥭🍏🍋🍋🍊🍊🍓🍓'
```

이를 해결하기 위해, 개발자는 검색 문자열을 글로벌(`g`) 플래그를 사용하는 정규식으로 변환하는 경우가 많습니다. 이렇게 하면 `String#replace`가 _모든_ 일치를 교체합니다:

```js
'aabbcc'.replace(/b/g, '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace(/🍏/g, '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'
```

개발자 입장에서 글로벌 하위 문자열 교체만 원하는 경우 문자열을 정규식으로 변환하는 것이 번거롭습니다. 더 중요한 것은, 이러한 변환이 오류를 발생하기 쉬운 일반적인 버그 원인이라는 점입니다! 다음 예제를 고려해 보세요:

```js
const queryString = 'q=query+string+parameters';

queryString.replace('+', ' ');
// → 'q=query string+parameters' ❌
// 첫 번째 발생만 교체됩니다.

queryString.replace(/+/, ' ');
// → SyntaxError: 잘못된 정규식 ❌
// 알고 보니, `+`는 정규식 패턴에서 특수 문자입니다.

queryString.replace(/\+/, ' ');
// → 'q=query string+parameters' ❌
// 특수 정규식 문자를 이스케이프하면 정규식은 유효하지만,
// 여전히 문자열에서 `+`의 첫 번째 발생만 교체합니다.

queryString.replace(/\+/g, ' ');
// → 'q=query string parameters' ✅
// 특수 정규식 문자를 이스케이프하고 `g` 플래그를 사용하는 것으로 해결됩니다.
```

리터럴 문자열 `+`를 글로벌 정규식으로 변환하는 것은 단순히 `+` 따옴표를 제거하고, 이를 `/` 슬래시로 감싸고, `g` 플래그를 추가하는 문제가 아닙니다 — 정규식에서 특수 의미가 있는 모든 문자를 이스케이프해야 합니다. 이는 쉽게 잊어버릴 수 있으며, 올바르게 처리하기 어렵습니다. JavaScript는 정규식 패턴을 이스케이프할 수 있는 내장 메커니즘을 제공하지 않기 때문입니다.

대안적인 해결 방법은 `String#split`을 `Array#join`과 결합하는 것입니다:

```js
const queryString = 'q=query+string+parameters';
queryString.split('+').join(' ');
// → 'q=query string parameters'
```

이 접근 방법은 이스케이프를 피할 수 있지만 문자열을 부분 배열로 나눈 뒤 다시 합치는 오버헤드가 생깁니다.

분명히, 이러한 해결책은 이상적이지 않습니다. JavaScript에서 글로벌 하위 문자열 교체와 같은 기본 작업이 간단하면 얼마나 좋을까요?

## `String.prototype.replaceAll`

새로운 `String#replaceAll` 메서드는 이러한 문제를 해결하고 글로벌 하위 문자열 교체를 수행하기 위한 간단한 메커니즘을 제공합니다:

```js
'aabbcc'.replaceAll('b', '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replaceAll('🍏', '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'

const queryString = 'q=query+string+parameters';
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

언어에서 기존 API와 일관성을 유지하기 위해, `String.prototype.replaceAll(searchValue, replacement)`은 두 가지 예외를 제외하고 `String.prototype.replace(searchValue, replacement)`와 동일한 방식으로 작동합니다:

1. `searchValue`가 문자열인 경우, `String#replace`는 하위 문자열의 첫 번째 발생만 교체하지만, `String#replaceAll`은 _모든_ 발생을 교체합니다.
1. `searchValue`가 글로벌이 아닌 정규식인 경우, `String#replace`는 문자열에 대해 작동하는 것과 유사하게 한 번의 일치만 교체합니다. `String#replaceAll`은 이 경우 예외를 발생시키며, 이는 아마도 실수일 가능성이 높습니다: 정말로 '모두 교체'를 원하면 글로벌 정규식을 사용해야 하고, 단일 일치를 교체하려면 `String#replace`를 사용할 수 있습니다.

새로운 기능의 핵심 요소는 첫 번째 항목에 있습니다. `String.prototype.replaceAll`은 정규식 또는 기타 해결책 없이 JavaScript에 글로벌 하위 문자열 교체를 위한 일류 지원을 제공합니다.

## 특수 교체 패턴에 대한 주의 사항

주의사항: `replace`와 `replaceAll` 둘 다 [특별한 대체 패턴](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement)을 지원합니다. 이것들은 주로 정규 표현식과 결합하여 가장 유용하게 사용되지만, 일부 패턴(`$$`, `$&`, ``$` ``, 그리고 `$&apos;`)은 간단한 문자열 대체 수행 시에도 효과를 발휘할 수 있어 예기치 않게 작동할 수 있습니다:

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, &apos;$$&apos;);
// → &apos;x$z&apos; (not &apos;x$$z&apos;)
```

대체 문자열에 이러한 패턴 중 하나가 포함되어 있고, 이를 그대로 사용하려면 magical substitution 동작을 피하기 위해 문자열을 반환하는 replacer 함수 사용을 선택할 수 있습니다:

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, () => &apos;$$&apos;);
// → &apos;x$$z&apos;
```

## `String.prototype.replaceAll` 지원

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
