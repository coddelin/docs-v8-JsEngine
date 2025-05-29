---
title: "RegExp `v` 플래그와 집합 표기법 및 문자열 속성"
author: "Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer, 그리고 Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mark-davis"
  - "markus-scherer"
  - "mathias-bynens"
date: 2022-06-27
tags:
  - ECMAScript
description: "새로운 RegExp `v` 플래그는 `unicodeSets` 모드를 활성화하여 확장된 문자 클래스, 유니코드 문자열 속성, 집합 표기법 및 향상된 대소문자 무시 매칭을 지원합니다."
tweet: "1541419838513594368"
---
JavaScript는 ECMAScript 3 (1999)부터 정규 표현식을 지원했습니다. 16년 후, ES2015는 [유니코드 모드 (`u` 플래그)](https://mathiasbynens.be/notes/es6-unicode-regex), [스티키 모드 (`y` 플래그)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description), 그리고 [`RegExp.prototype.flags` 게터](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags)를 도입했습니다. 또 3년 뒤, ES2018은 [`dotAll` 모드 (`s` 플래그)](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll), [후행 어설션](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds), [명명된 캡처 그룹](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups) 및 [유니코드 문자 속성 이스케이프](https://mathiasbynens.be/notes/es-unicode-property-escapes)를 도입했습니다. ES2020에서는 [`String.prototype.matchAll`](https://v8.dev/features/string-matchall)이 정규 표현식을 다루는 데 더 쉽도록 만들어졌습니다. JavaScript 정규 표현식은 많은 발전을 이루었고, 여전히 진화하고 있습니다.

<!--truncate-->
그 최신 예는 [새로운 `unicodeSets` 모드, `v` 플래그를 사용하여 활성화](https://github.com/tc39/proposal-regexp-v-flag)입니다. 이 새로운 모드는 _확장된 문자 클래스_ 를 지원하며, 다음과 같은 기능을 포함합니다:

- [유니코드 문자열 속성](/features/regexp-v-flag#unicode-properties-of-strings)
- [집합 표기법 + 문자열 리터럴 구문](/features/regexp-v-flag#set-notation)
- [향상된 대소문자 무시 매칭](/features/regexp-v-flag#ignoreCase)

이 기사에서는 각각에 대해 깊이 다룹니다. 하지만 먼저 — 새로운 플래그를 사용하는 방법부터 알아봅시다:

```js
const re = /…/v;
```

`v` 플래그는 기존 정규 표현식 플래그와 결합할 수 있으며, 한 가지 주목할 만한 예외가 있습니다. `v` 플래그는 `u` 플래그의 장점들을 모두 활성화하지만, 추가적인 기능과 개선 사항도 포함되어 있습니다. 이 중 일부는 `u` 플래그와 하위 호환성이 없습니다. 핵심적으로, `v`는 `u`와 별개의 완전한 모드이므로 상호 보완적이지 않습니다. 이러한 이유로, `v`와 `u` 플래그는 결합하여 사용할 수 없습니다. 동일한 정규 표현식에서 두 플래그를 함께 사용하려고 하면 에러가 발생합니다. 유효한 옵션은 다음과 같습니다: `u` 만 사용하거나, `v` 만 사용하거나, `u` 와 `v` 둘 다 사용하지 않습니다. 하지만 `v`는 가장 기능이 완전한 옵션이므로 선택은 쉽게 할 수 있습니다.

새로운 기능을 살펴보겠습니다!

## 유니코드 문자열 속성

유니코드 표준은 각 기호에 다양한 속성과 속성 값을 할당합니다. 예를 들어, 그리스어 스크립트에서 사용되는 기호 집합을 얻으려면, `Script_Extensions` 속성 값이 `Greek`을 포함하는 기호를 유니코드 데이터베이스에서 검색하십시오.

ES2018 유니코드 문자 속성 이스케이프는 ECMAScript 정규 표현식에서 이러한 유니코드 문자 속성을 네이티브로 접근할 수 있게 했습니다. 예를 들어, 패턴 `\p{Script_Extensions=Greek}`는 그리스어 스크립트에서 사용된 모든 기호와 일치합니다:

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

정의상, 유니코드 문자 속성은 코드 포인트의 집합으로 확장되며, 개별적으로 일치하는 코드 포인트를 포함하는 문자 클래스로 트랜스파일할 수 있습니다. 예를 들어, `\p{ASCII_Hex_Digit}`는 `[0-9A-Fa-f]`와 동일합니다: 이는 한 번에 하나의 유니코드 문자/코드 포인트와만 일치합니다. 어떤 상황에서는 이것이 불충분합니다:

```js
// 유니코드는 “Emoji”라는 이름의 문자 속성을 정의합니다.
const re = /^\p{Emoji}$/u;

// 한 코드 포인트로 구성된 이모지와 일치:
re.test('⚽'); // '\u26BD'
// → true ✅

// 여러 코드 포인트로 구성된 이모지와 일치:
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → false ❌
```

위의 예에서, 정규 표현식은 👨🏾‍⚕️ 이모지와 일치하지 않습니다. 왜냐하면 이 이모지가 여러 코드 포인트로 구성되어 있으며, `Emoji`는 유니코드 _문자_ 속성이기 때문입니다.

다행히도 유니코드 표준은 여러 [문자열 속성](https://www.unicode.org/reports/tr18/#domain_of_properties)을 정의합니다. 이러한 속성은 하나 이상의 코드 포인트를 포함하는 문자열 세트로 확장됩니다. 정규 표현식에서는 문자열 속성이 대안 세트로 변환됩니다. 이를 설명하기 위해, 문자열 `'a'`, `'b'`, `'c'`, `'W'`, `'xy'`, 및 `'xyz'`에 적용되는 유니코드 속성을 상상해보세요. 이 속성은 교대 구문을 사용하여 다음 정규 표현식 패턴으로 변환됩니다: `xyz|xy|a|b|c|W` 또는 `xyz|xy|[a-cW]`. (긴 문자열이 먼저 오므로, `'xy'`와 같은 접두사가 `'xyz'`와 같이 더 긴 문자열을 숨기지 않도록 합니다.) 기존의 유니코드 속성 이스케이프와 달리, 이 패턴은 여러 문자로 이루어진 문자열을 일치시킬 수 있습니다. 문자열 속성 사용의 예제는 다음과 같습니다:

```js
const re = /^\p{RGI_Emoji}$/v;

// 하나의 코드 포인트만으로 구성된 이모지를 일치시키기:
re.test('⚽'); // '\u26BD'
// → true ✅

// 여러 코드 포인트로 구성된 이모지를 일치시키기:
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → true ✅
```

이 코드 스니펫은 문자열 속성 `RGI_Emoji`를 참조하며, 이는 Unicode에서 “일반 교환을 위한 권장 이모지 (문자 및 시퀀스)의 하위 집합”으로 정의됩니다. 이를 통해 코드 포인트의 수와 상관없이 이모지를 일치시킬 수 있습니다!

`v` 플래그는 처음부터 다음과 같은 유니코드 문자열 속성을 지원하도록 합니다:

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

추후 유니코드 표준이 추가 문자열 속성을 정의하면 지원 속성 리스트가 확대될 수 있습니다. 현재 모든 문자열 속성이 이모지 관련된 것이지만, 미래에는 완전히 다른 용도를 지원하는 속성이 생성될 수 있습니다.

:::note
**참고:** 현재 문자열 속성은 새로운 `v` 플래그로 제한되지만, [이들을 `u` 모드에서도 사용할 수 있도록 할 계획](https://github.com/tc39/proposal-regexp-v-flag/issues/49)입니다.
:::

## 집합 표기법 + 문자열 리터럴 구문

`\p{…}` 이스케이프를 사용할 때 (문자 속성이든 새 문자열 속성이든), 차이/뺄셈 및 교차를 수행하는 것이 유용할 수 있습니다. `v` 플래그를 사용하면 이제 문자 클래스가 중첩될 수 있으며, 이러한 집합 연산이 인접한 선행 또는 후행 어설션 없이 또는 계산된 범위를 나타내는 긴 문자 클래스 없이 수행될 수 있습니다.

### `--`을 사용한 차이/뺄셈

`A--B` 구문은 문자열 _`A`에는 있지만 `B`에는 없는_ 문자열을 일치시키는 데 사용할 수 있습니다, 즉 차이/뺄셈입니다.

예를 들어 모든 그리스어 기호를 일치시키되 글자 `π`는 제외하고 싶다면, 집합 표기를 사용하면 쉽게 해결할 수 있습니다:

```js
/[\p{Script_Extensions=Greek}--π]/v.test('π'); // → false
```

`--`을 사용하여 차이/뺄셈을 수행하면, 정규 표현식 엔진이 작업을 대신 해 주며 코드의 가독성과 유지보수성을 높일 수 있습니다.

하나의 문자 대신 문자들 `α`, `β`, `γ`의 집합을 빼고 싶다면 어떨까요? 문제없습니다 — 중첩된 문자 클래스를 사용하고 그 안의 내용을 뺄 수 있습니다:

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test('α'); // → false
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test('β'); // → false
```

다른 예로는 비-ASCII 숫자를 일치시키는 경우입니다. 나중에 이를 ASCII 숫자로 변환하기 위해:

```js
/[\p{Decimal_Number}--[0-9]]/v.test('𑜹'); // → true
/[\p{Decimal_Number}--[0-9]]/v.test('4'); // → false
```

새 문자열 속성에서도 집합 표기를 사용할 수 있습니다:

```js
// 참고: 🏴는 7개의 코드 포인트로 구성됩니다.

/^\p{RGI_Emoji_Tag_Sequence}$/v.test('🏴'); // → true
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test('🏴'); // → false
```

이 예제는 스코틀랜드 깃발을 제외한 모든 RGI 이모지 태그 시퀀스를 일치시킵니다. `\q{…}`를 사용하는 점에 주목하세요. 이는 문자 클래스 내 문자열 리터럴을 위한 새로운 문법입니다. 예를 들어, `\q{a|bc|def}`는 문자열 `a`, `bc`, 및 `def`를 일치시킵니다. `\q{…}` 없이 다중 문자로 이루어진 문자열을 하드코딩하고 빼는 것은 불가능합니다.

### `&&`을 사용한 교차

`A&&B` 구문은 문자열이 _`A`와 `B` 모두에 속하는_ 경우를 일치시키며, 즉 교차입니다. 이를 통해 그리스 문자 일치를 수행할 수 있습니다:

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 그리스어 소문자 파이
re.test('π'); // → true
// U+1018A 그리스어 영 숫자
re.test('𐆊'); // → false
```

모든 ASCII 공백 일치시키기:

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test('\n'); // → true
re.test('\u2028'); // → false
```

또는 모든 몽골어 숫자를 일치시키기:

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 몽골어 숫자 7
re.test('᠗'); // → true
// U+1834 몽골어 문자 차
re.test('ᠴ'); // → false
```

### 합집합

문자열이 _`A` 또는 `B`에 속하는_ 경우를 일치시키는 것은 이미 단일 문자 문자열에 대해 `[\p{Letter}\p{Number}]`와 같은 문자 클래스를 사용하여 가능했습니다. `v` 플래그로 이 기능은 더욱 강력해지며, 이제 문자열 속성이나 문자열 리터럴과 결합할 수도 있습니다:

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test('4️⃣'); // → true
re.test('_'); // → true
re.test('🇧🇪'); // → true
re.test('abc'); // → true
re.test('x'); // → true
re.test('4'); // → true
```

이 패턴의 문자 클래스는 다음을 결합합니다:

- 문자열 속성 (`\p{Emoji_Keycap_Sequence}`)
- 문자 속성 (`\p{ASCII}`)
- 다중 코드 포인트 문자열 `🇧🇪` 및 `abc`에 대한 문자열 리터럴 문법
- 고전적 문자 클래스 구문으로 단독 문자인 `x`, `y`, 및 `z`를 표현
- `0`에서 `9`까지의 문자 범위를 위한 기본 문자 클래스 문법

다음은 일반적으로 사용되는 모든 국기 이모티콘을 `RGI_Emoji_Flag_Sequence`로 인코딩된 두 글자 ISO 코드든, `RGI_Emoji_Tag_Sequence`로 인코딩된 특별 태그 시퀀스든 상관없이 매칭하는 또 다른 예입니다:

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// 2개의 코드 포인트로 구성된 국기 시퀀스 (벨기에 국기):
reFlag.test('🇧🇪'); // → true
// 7개의 코드 포인트로 구성된 태그 시퀀스 (잉글랜드 국기):
reFlag.test('🏴'); // → true
// 2개의 코드 포인트로 구성된 국기 시퀀스 (스위스 국기):
reFlag.test('🇨🇭'); // → true
// 7개의 코드 포인트로 구성된 태그 시퀀스 (웨일스 국기):
reFlag.test('🏴'); // → true
```

## 개선된 대소문자 무시 매칭

ES2015 `u` 플래그는 [혼란스러운 대소문자 무시 매칭 동작](https://github.com/tc39/proposal-regexp-v-flag/issues/30)을 가지고 있습니다. 다음 두 정규 표현식을 고려하세요:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

첫 번째 패턴은 모든 소문자를 매칭합니다. 두 번째 패턴은 `\P`를 사용하여 소문자를 제외한 모든 문자를 매칭하지만, 부정 문자 클래스(`[^…]`)로 감싸져 있습니다. 두 정규 표현식 모두 `i` 플래그(`ignoreCase`)를 설정하여 대소문자를 무시합니다.

직관적으로 볼 때, 두 정규 표현식이 동일하게 동작할 것이라고 기대할 수 있습니다. 실제로는 매우 다르게 동작합니다:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'aAbBcC4#'
```

새로운 `v` 플래그는 더 예측 가능한 동작을 제공합니다. `u` 플래그 대신 `v` 플래그를 사용하면 두 패턴이 동일하게 동작합니다:

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'XXXXXX4#'
```

더 일반적으로, `v` 플래그는 `[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` 및 `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`을 대소문자 무시 플래그 `i` 설정 여부와 관계없이 동일하게 만듭니다.

## 추가 읽기 자료

[제안 리포지토리](https://github.com/tc39/proposal-regexp-v-flag)에는 이러한 기능과 설계 결정에 대한 더 많은 세부 정보와 배경이 포함되어 있습니다.

우리가 이러한 JavaScript 기능에 대해 작업하는 과정에서, ECMAScript에 대한 명세 변경을 제안하는 것 이상을 넘어섰습니다. 우리는 "문자열 속성"의 정의를 [Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings)에 업스트림 하여 다른 프로그래밍 언어가 통합된 방식으로 유사한 기능을 구현할 수 있도록 했습니다. 또한 이러한 새로운 기능을 `pattern` 속성에서 활성화할 수 있도록 하기 위해 [HTML 표준 변경을 제안](https://github.com/whatwg/html/pull/7908)하고 있습니다.

## RegExp `v` 플래그 지원

V8 v11.0 (Chrome 110)에서는 `--harmony-regexp-unicode-sets` 플래그를 통해 이 새로운 기능에 대한 실험적 지원을 제공합니다. V8 v12.0 (Chrome 112)에서는 기본적으로 새로운 기능이 활성화되어 있습니다. Babel은 또한 `v` 플래그를 트랜스파일링할 수 있습니다 — [이 기사에서 예제를 Babel REPL에서 직접 시도해 보세요](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)! 아래 지원 표는 구독할 수 있는 트래킹 문제에 대한 링크를 제공합니다.

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
