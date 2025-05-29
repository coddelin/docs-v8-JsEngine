---
title: 'ECMAScript 사양 이해하기, Part 3'
author: '[Marja Hölttä](https://twitter.com/marjakh), 추측적 사양 관찰자'
avatars:
  - marja-holtta
date: 2020-04-01
tags:
  - ECMAScript
  - ECMAScript 이해하기
description: 'ECMAScript 사양 읽기에 대한 튜토리얼'
tweet: '1245400717667577857'
---

[모든 에피소드 보기](/blog/tags/understanding-ecmascript)

이번 에피소드에서는 ECMAScript 언어와 그 문법 정의에 대해 더 깊이 들어가 보겠습니다. 만약 문맥 자유 문법(context-free grammar)에 익숙하지 않다면, 사양이 언어를 정의하기 위해 문맥 자유 문법을 사용하기 때문에 기본을 확인할 좋은 기회입니다. 더 쉬운 입문서를 원한다면 ["Crafting Interpreters"의 문맥 자유 문법에 관한 챕터](https://craftinginterpreters.com/representing-code.html#context-free-grammars)를 확인하거나, 더 수학적인 정의를 원한다면 [위키피디아 페이지](https://en.wikipedia.org/wiki/Context-free_grammar)를 참고하세요.

<!--truncate-->
## ECMAScript 문법

ECMAScript 사양은 네 가지 문법을 정의합니다:

[어휘 문법](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar)은 [유니코드 코드 포인트](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology)가 **입력 요소**(토큰, 줄 끝 기호, 주석, 공백)의 시퀀스로 변환되는 방식을 설명합니다.

[구문 문법](https://tc39.es/ecma262/#sec-syntactic-grammar)은 구문적으로 올바른 프로그램이 토큰으로 구성되는 방식을 정의합니다.

[RegExp 문법](https://tc39.es/ecma262/#sec-patterns)은 유니코드 코드 포인트가 정규 표현식으로 변환되는 방식을 설명합니다.

[숫자 문자열 문법](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type)은 문자열이 숫자 값으로 변환되는 방식을 설명합니다.

각 문법은 생산물 집합으로 구성된 문맥 자유 문법으로 정의됩니다.

문법은 약간 다른 표기법을 사용합니다: 구문 문법은 `왼쪽주석기호 :`를, 어휘 문법과 RegExp 문법은 `왼쪽주석기호 ::`를, 숫자 문자열 문법은 `왼쪽주석기호 :::`를 사용합니다.

다음으로 어휘 문법과 구문 문법을 좀 더 상세히 살펴보겠습니다.

## 어휘 문법

사양은 ECMAScript 소스 텍스트를 유니코드 코드 포인트의 시퀀스로 정의합니다. 예를 들어, 변수 이름은 ASCII 문자로 제한되지 않고 다른 유니코드 문자를 포함할 수 있습니다. 사양은 실제 인코딩(예: UTF-8 또는 UTF-16)에 대해 언급하지 않습니다. 소스 코드는 이미 해당 인코딩에 따라 유니코드 코드 포인트의 시퀀스로 변환되었다고 가정합니다.

ECMAScript 소스 코드를 미리 토큰화 할 수 없으므로 어휘 문법을 정의하는 데 약간 더 복잡합니다.

예를 들어, `/`이 나눗셈 연산자인지 아니면 RegExp의 시작인지를 그 영역의 더 넓은 문맥을 보지 않고는 알 수 없습니다:

```js
const x = 10 / 5;
```

여기서 `/`은 `나눗셈 기호`입니다.

```js
const r = /foo/;
```

여기서 첫 번째 `/`은 `정규 표현식 리터럴`의 시작입니다.

템플릿은 비슷한 모호성을 도입합니다. <code>}`</code>의 해석은 발생하는 컨텍스트에 따라 달라집니다:

```js
const what1 = 'temp';
const what2 = 'late';
const t = `I am a ${ what1 + what2 }`;
```

여기서 <code>\`I am a $\{</code>는 `템플릿 헤드`이고, <code>\}\`</code>는 `템플릿 테일`입니다.

```js
if (0 == 1) {
}`not very useful`;
```

여기서 `}`은 `우측 중괄호`이고 <code>\`</code>은 `NoSubstitutionTemplate`의 시작입니다.

비록 `/`과 <code>}`</code>의 해석이 그들의 코드 문장 구조 내 위치 즉 “문맥”에 따라 달라지더라도, 우리가 다음에 설명할 문법들은 여전히 문맥 자유입니다.

어휘 문법은 몇 가지 목표 기호를 사용하여 일부 입력 요소가 허용되는 컨텍스트와 그렇지 않은 컨텍스트를 구분합니다. 예를 들어 `/`가 나눗셈이고 `/=`가 나눗셈-할당인 컨텍스트에는 목표 기호 `InputElementDiv`가 사용됩니다. [`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv) 생산 규칙은 이 컨텍스트에서 생성될 수 있는 가능한 토큰을 나열합니다:

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

이 컨텍스트에서 `/`를 만나면 `DivPunctuator` 입력 요소를 생성합니다. 여기서는 `RegularExpressionLiteral`을 생성하는 것은 옵션이 아닙니다.

한편, [`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp)는 `/`가 RegExp의 시작인 컨텍스트를 위한 목표 기호입니다:

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

생산 규칙에서 확인한 것처럼 `RegularExpressionLiteral` 입력 요소를 생성할 수 있는 가능성이 있지만, `DivPunctuator`를 생성하는 것은 불가능합니다.

마찬가지로 `RegularExpressionLiteral` 외에도 `TemplateMiddle` 및 `TemplateTail`이 허용되는 문맥에서는 다른 목표 기호 `InputElementRegExpOrTemplateTail`도 있습니다. 마지막으로, `RegularExpressionLiteral`이 허용되지 않고 오직 `TemplateMiddle` 및 `TemplateTail`만 허용되는 문맥에서는 목표 기호가 `InputElementTemplateTail`입니다.

구현에서 구문 문법 분석기(“파서”)는 목표 기호를 매개변수로 전달하여 해당 목표 기호에 적합한 다음 입력 요소를 요청하면서 어휘 문법 분석기(“토크나이저” 또는 “렉서”)를 호출할 수 있습니다.

## 구문 문법

우리는 유니코드 코드 포인트에서 토큰을 구성하는 방법을 정의하는 어휘 문법을 살펴보았습니다. 구문 문법은 이를 기반으로 하여 구문적으로 올바른 프로그램이 토큰으로 어떻게 구성되는지를 정의합니다.

### 예시: 레거시 식별자 허용

문법에 새로운 키워드를 도입하는 것은 기존 코드가 이미 해당 키워드를 식별자로 사용하는 경우를 고려할 때 잠재적으로 호환성을 깨는 변경일 수 있습니다.

예를 들어, `await`가 키워드가 되기 전에 누군가가 다음과 같은 코드를 작성했을 수 있습니다:

```js
function old() {
  var await;
}
```

ECMAScript 문법은 이 코드가 계속 작동하도록 `await` 키워드를 신중하게 추가했습니다. 비동기 함수 내에서는 `await`가 키워드이므로, 이는 작동하지 않습니다:

```js
async function modern() {
  var await; // 문법 오류
}
```

비생성기에서 `yield`를 식별자로 허용하고 생성기에서는 이를 허용하지 않는 것도 유사한 방식으로 작동합니다.

`await`가 식별자로 허용되는 방식을 이해하려면 ECMAScript 특정 구문 문법 표기법을 이해해야 합니다. 함께 살펴봅시다!

### 생산 규칙 및 약어

[`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement)의 생산 규칙이 어떻게 정의되는지 알아봅시다. 처음 보면 문법이 약간 복잡해 보일 수 있습니다:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

첨자(`[Yield, Await]`)와 접두사(`+In`의 `+`, `?Async`의 `?`)는 무엇을 의미할까요?

해당 표기법은 [Grammar Notation](https://tc39.es/ecma262/#sec-grammar-notation) 섹션에서 설명되어 있습니다.

첨자는 한 번에 왼쪽 기호의 집합에 대한 생산 규칙 세트를 표현하는 약어입니다. 왼쪽 기호는 두 개의 매개변수를 가지며, 이는 네 개의 "실제" 왼쪽 기호 즉, `VariableStatement`, `VariableStatement_Yield`, `VariableStatement_Await`, 및 `VariableStatement_Yield_Await`로 확장됩니다.

여기서 단순한 `VariableStatement`는 “`_Await`와 `_Yield`가 없는 `VariableStatement`”를 의미합니다. 이는 <code>VariableStatement<sub>[Yield, Await]</sub></code>와 혼동해서는 안 됩니다.

생산 규칙의 오른쪽에서 `+In`과 같은 약어를 볼 수 있습니다. 이는 "`_In` 버전을 사용"을 의미하며, `?Await`는 "왼쪽 기호가 `_Await`를 포함하는 경우에만 `_Await` 버전을 사용"을 의미합니다 (`?Yield`도 유사).

세 번째 약어, `~Foo`,는 "`_Foo` 없이 버전을 사용"을 의미하며, 이 생산 규칙에서는 사용되지 않습니다.

이 정보를 바탕으로 생산 규칙을 다음과 같이 확장할 수 있습니다:

```grammar
VariableStatement :
  var VariableDeclarationList_In ;

VariableStatement_Yield :
  var VariableDeclarationList_In_Yield ;

VariableStatement_Await :
  var VariableDeclarationList_In_Await ;

VariableStatement_Yield_Await :
  var VariableDeclarationList_In_Yield_Await ;
```

결국 우리는 두 가지를 알아내야 합니다:

1. `_Await`를 사용하는 경우와 사용하지 않는 경우가 어디에서 결정되는가?
2. `Something_Await`와 `Something`(즉, `_Await` 없는) 생산 규칙이 어디에서 갈라지는가?

### `_Await` 또는 `_Await` 없음?

먼저 질문 1을 해결해 봅시다. 비동기 함수와 비비동기 함수가 함수 본문에서 `_Await` 매개변수를 선택하는지 여부에 따라 다르다는 것을 짐작하기는 비교적 쉽습니다. 비동기 함수 선언에 대한 생산 규칙을 보면 [다음](https://tc39.es/ecma262/#prod-AsyncFunctionBody)을 찾을 수 있습니다:

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

여기서 `AsyncFunctionBody`에는 매개변수가 없습니다—매개변수는 오른쪽 기호 `FunctionBody`에 추가됩니다.

이 생산 규칙을 확장하면 다음과 같습니다:

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

다시 말해 비동기 함수는 `FunctionBody_Await`를 가지며, 이는 `await`를 키워드로 취급하는 함수 본문을 의미합니다.

반면 비비동기 함수 내에서는 [관련 생산 규칙](https://tc39.es/ecma262/#prod-FunctionDeclaration)이 다음과 같습니다:

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

(`FunctionDeclaration`에는 다른 생산 규칙도 있지만, 우리의 코드 예제와는 관련이 없습니다.)

조합 확장을 피하기 위해, 여기서는 이 특정 생산 규칙에서 사용되지 않는 `Default` 매개변수를 무시하겠습니다.

생산 규칙의 확장된 형태는 다음과 같습니다:

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield_Await :
  function BindingIdentifier_Yield_Await ( FormalParameters ) { FunctionBody }
```

이 생성 규칙에서는 항상 `[~Yield, ~Await]`로 매개변수화된 비확장 생성 규칙에서 `_Yield`와 `_Await`가 없는 `FunctionBody`와 `FormalParameters`를 얻습니다.

함수 이름은 다르게 처리됩니다: 왼쪽 기호에 `_Await`와 `_Yield` 매개변수가 있으면 이를 받습니다.

요약하자면, 비동기 함수는 `FunctionBody_Await`를 가지고 비비동기 함수는 `_Await`이 없는 `FunctionBody`를 가집니다. 우리는 비제너레이터 함수를 다루고 있기 때문에, 비동기 예제 함수와 비비동기 예제 함수 모두 `_Yield` 없이 매개변수화됩니다.

`FunctionBody`와 `FunctionBody_Await` 중 어느 것이 어느 것인지 기억하기 어려울 수 있습니다. `FunctionBody_Await`가 `await`이 식별자인 함수일까요, 아니면 `await`이 키워드인 함수일까요?

매개변수 `_Await`를 "`await`이 키워드입니다"라고 생각할 수 있습니다. 이 접근법은 미래 지향적이기도 합니다. 새로운 키워드 `blob`이 추가되어 "blobby" 함수 내부에만 존재한다고 상상해 보세요. 비blobby 비비동기 비제너레이터는 여전히 `FunctionBody` (`_Await`, `_Yield` 또는 `_Blob` 없이)를 가지며 현재와 동일합니다. Blobby 함수는 `FunctionBody_Blob`를 가지며, 비동기 Blobby 함수는 `FunctionBody_Await_Blob`을 가지는 방식입니다. 기존 함수에 대한 `FunctionBody`의 확장 형태는 그대로 유지됩니다.

### `await`를 식별자로 허용하지 않기

다음으로, 우리가 `FunctionBody_Await` 내에 있을 경우 `await`이 식별자로서 허용되지 않는 방법을 알아봐야 합니다.

생성 규칙을 더 따라가면 `_Await` 매개변수가 `FunctionBody`에서 우리가 이전에 살펴본 `VariableStatement` 생성까지 변경되지 않고 그대로 전달되는 것을 확인할 수 있습니다.

따라서, 비동기 함수 내부에서는 `VariableStatement_Await`를 갖고 비비동기 함수 내부에서는 `VariableStatement`를 갖게 됩니다.

생성 규칙을 계속 따라가서 매개변수를 추적할 수 있습니다. 우리는 이미 [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement)에 대한 생성 규칙을 보았습니다:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

모든 [`VariableDeclarationList`](https://tc39.es/ecma262/#prod-VariableDeclarationList) 생성 규칙에서는 매개변수가 그대로 전달됩니다:

```grammar
VariableDeclarationList[In, Yield, Await] :
  VariableDeclaration[?In, ?Yield, ?Await]
```

(여기서는 우리의 예제와 관련된 [생성](https://tc39.es/ecma262/#prod-VariableDeclaration)만 표시합니다.)

```grammar
VariableDeclaration[In, Yield, Await] :
  BindingIdentifier[?Yield, ?Await] Initializer[?In, ?Yield, ?Await] opt
```

`opt` 약어는 오른쪽 기호가 선택 사항임을 의미합니다; 실제로는 선택 항목이 있는 생성 규칙과 없는 생성 규칙 두 개가 있습니다.

우리의 예제에서 관련된 간단한 경우, `VariableStatement`는 `var` 키워드로 구성되며, 초기화가 없는 단일 `BindingIdentifier` 뒤에 세미콜론으로 끝납니다.

`await`를 `BindingIdentifier`로 허용하거나 허용하지 않도록 하려면, 다음과 같은 결과를 얻기를 희망합니다:

```grammar
BindingIdentifier_Await :
  Identifier
  yield

BindingIdentifier :
  Identifier
  yield
  await
```

이렇게 하면 비동기 함수 내부에서는 `await`이 식별자로 허용되지 않고, 비비동기 함수 내부에서는 식별자로 허용됩니다.

하지만 명세는 이렇게 정의하지 않고, 대신에 이 [생성 규칙](https://tc39.es/ecma262/#prod-BindingIdentifier)을 찾을 수 있습니다:

```grammar
BindingIdentifier[Yield, Await] :
  Identifier
  yield
  await
```

확장하면, 이는 다음 생성 규칙을 뜻합니다:

```grammar
BindingIdentifier_Await :
  Identifier
  yield
  await

BindingIdentifier :
  Identifier
  yield
  await
```

(우리의 예제에서 필요 없는 `BindingIdentifier_Yield` 및 `BindingIdentifier_Yield_Await` 생성 규칙은 생략합니다.)

이것은 `await`과 `yield`가 항상 식별자로 허용된 것처럼 보입니다. 무슨 일인가요? 이번 블로그 글이 쓸모없는 것인가요?

### 정적 의미론에 의존하기

비동기 함수 내부에서 `await`이 식별자로 금지되기 위해서는 **정적 의미론**이 필요하다는 것이 밝혀졌습니다.

정적 의미론은 정적 규칙, 즉 프로그램 실행 전에 체크되는 규칙을 설명합니다.

이 경우, [`BindingIdentifier`](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors)에 대한 정적 의미론은 다음 구문 지향 규칙을 정의합니다:

> ```grammar
> BindingIdentifier[Yield, Await] : await
> ```
>
> 이 생성 규칙이 <code><sub>[Await]</sub></code> 매개변수를 가질 경우 문법 오류입니다.

실질적으로, 이는 `BindingIdentifier_Await : await` 생성 규칙을 금지합니다.

명세서에서는 이런 문법 생산물을 갖는 이유가 있지만 정적 의미론에 의해 이를 구문 오류로 정의한 이유는 자동 세미콜론 삽입(ASI)과의 간섭 때문이라고 설명합니다.

ASI는 우리가 문법 생산물에 따라 코드 한 줄을 구문 분석할 수 없을 때 활성화됩니다. ASI는 명령문과 선언문이 세미콜론으로 끝나야 한다는 요구를 만족시키기 위해 세미콜론을 추가하려고 시도합니다. (ASI에 대해서는 나중 에피소드에서 더 자세히 설명하겠습니다.)

다음 코드를 고려해 보세요(명세서에 있는 예제):

```js
async function too_few_semicolons() {
  let
  await 0;
}
```

만약 문법이 `await`를 식별자로 허용하지 않는다면, ASI가 활성화되어 다음과 같은 문법적으로 올바른 코드로 변환됩니다. 이 코드는 또한 `let`을 식별자로 사용합니다:

```js
async function too_few_semicolons() {
  let;
  await 0;
}
```

ASI와의 이러한 간섭이 너무 혼란스럽다고 판단되어 정적 의미론을 사용하여 `await`를 식별자로 사용하는 것을 금지했습니다.

### 금지된 식별자의 `StringValues`

또 다른 관련 규칙도 있습니다:

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> 이 생산물이 <code><sub>[Await]</sub></code> 매개변수를 가지고 있고 `Identifier`의 `StringValue`가 `"await"`인 경우 구문 오류입니다.

처음에는 이 규칙이 헷갈릴 수 있습니다. [`Identifier`](https://tc39.es/ecma262/#prod-Identifier)는 다음과 같이 정의됩니다:

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName but not ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await`는 `ReservedWord`입니다. 그렇다면 어떻게 `Identifier`가 `await`가 될 수 있을까요?

사실, `Identifier`는 `await`가 될 수 없습니다. 하지만 `StringValue`가 `"await"`인 다른 요소 — `await`라는 문자 시퀀스의 다른 표현 — 는 될 수 있습니다.

[식별자 이름에 대한 정적 의미론](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue)은 식별자 이름의 `StringValue`가 어떻게 산출되는지 정의합니다. 예를 들어, `a`의 유니코드 이스케이프 시퀀스는 `\u0061`입니다. 따라서 `\u0061wait`는 `StringValue`가 `"await"`입니다. `\u0061wait`는 어휘 문법 상 키워드로 인식되지 않고 대신 `Identifier`가 될 것입니다. 정적 의미론은 이를 비동기 함수 내부에서 변수 이름으로 사용하는 것을 금지합니다.

그래서 다음 코드는 작동합니다:

```js
function old() {
  var \u0061wait;
}
```

반면, 이는 작동하지 않습니다:

```js
async function modern() {
  var \u0061wait; // 구문 오류
}
```

## 요약

이 에피소드에서는 어휘 문법, 구문 문법, 구문 문법을 정의하는 데 사용되는 약어를 익혔습니다. 예제로, 비동기 함수 내부에서 `await`를 식별자로 사용하는 것을 금지하면서 비 비동기 함수에서는 허용되는 경우를 살펴보았습니다.

자동 세미콜론 삽입과 표기 구문과 같은 구문 문법의 다른 흥미로운 부분은 나중 에피소드에서 다룰 예정입니다. 계속 지켜봐 주세요!
