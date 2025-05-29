---
title: 'ECMAScript 명세 이해하기, 4부'
author: '[Marja Hölttä](https://twitter.com/marjakh), 추측적 명세 관찰자'
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - ECMAScript 이해하기
description: 'ECMAScript 명세 읽기에 대한 튜토리얼'
tweet: '1262815621756014594'
---

[모든 에피소드](/blog/tags/understanding-ecmascript)

## 웹의 다른 부분에서는

[Jason Orendorff](https://github.com/jorendorff)가 Mozilla에서 [JS 구문적인 특성에 대한 훌륭하고 심층적인 분석](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme)을 발표했습니다. 구현 세부사항은 다르더라도, 모든 JS 엔진은 이러한 특성과 관련된 동일한 문제에 직면합니다.

<!--truncate-->
## 커버 문법

이번 에피소드에서는 *커버 문법*에 대해 깊이 살펴보겠습니다. 이는 처음에는 모호해 보이는 구문 구조에 대해 문법을 지정하는 방법입니다.

다시 한 번, 간결함을 위해 `[In, Yield, Await]`의 아래첨자를 생략하겠습니다. 이는 이 블로그 게시물에 중요하지 않습니다. 그 의미와 사용에 대한 설명은 [3부](/blog/understanding-ecmascript-part-3)를 참조하세요.

## 유한한 루카헤드

일반적으로 구문 분석기는 유한한 루카헤드(고정된 수의 후속 토큰)를 기반으로 어떤 생산을 사용할지 결정합니다.

어떤 경우에는 다음 토큰이 사용할 생산을 명확하게 결정합니다. [예를 들어](https://tc39.es/ecma262/#prod-UpdateExpression):

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

`UpdateExpression`을 구문 분석하고 있고 다음 토큰이 `++` 또는 `--`라면, 바로 사용할 생산을 알 수 있습니다. 다음 토큰이 그 둘 중 어느 것도 아니면, 여전히 어렵지 않습니다: 현재 위치에서 `LeftHandSideExpression`을 구문 분석하고, 그것을 구문 분석한 후에 무엇을 할지 결정할 수 있습니다.

`LeftHandSideExpression` 다음 토큰이 `++`라면, 사용할 생산은 `UpdateExpression : LeftHandSideExpression ++`입니다. `--`의 경우도 비슷합니다. `LeftHandSideExpression` 다음 토큰이 `++` 또는 `--`이 아닌 경우, 생산 `UpdateExpression : LeftHandSideExpression`을 사용합니다.

### 화살표 함수 매개변수 목록 또는 괄호로 묶인 표현식?

화살표 함수 매개변수 목록과 괄호로 묶인 표현식을 구별하는 것은 더 복잡합니다.

예를 들어:

```js
let x = (a,
```

이것은 다음과 같은 화살표 함수의 시작인가요?

```js
let x = (a, b) => { return a + b };
```

아니면 다음과 같은 괄호로 묶인 표현식일까요?

```js
let x = (a, 3);
```

괄호로 묶인 무엇이든 간에 임의적으로 길어질 수 있습니다 - 고정된 수의 토큰만으로 그것이 무엇인지 알 수 없습니다.

잠시 동안 다음과 같은 간단한 생산이 있다고 상상해봅시다:

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

이제 우리는 유한한 루카헤드만으로 사용할 생산을 선택할 수 없습니다. 만약 우리가 `AssignmentExpression`을 구문 분석해야 하고 다음 토큰이 `(`라면, 무엇을 구문 분석할지 어떻게 결정하겠습니까? 우리는 `ArrowParameterList` 또는 `ParenthesizedExpression` 중 하나를 구문 분석할 수 있지만, 우리의 추측이 틀릴 수도 있습니다.

### 매우 허용적인 새로운 기호: `CPEAAPL`

명세는 뒤에서 `ParenthesizedExpression` 또는 `ArrowParameterList`일 수 있지만 아직 어떤 것인지 알 수 없는 기호 `CoverParenthesizedExpressionAndArrowParameterList` (`CPEAAPL` 약칭)을 도입하여 이 문제를 해결합니다.

[CPEAAPL](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList)의 생산은 매우 허용적이며, `ParenthesizedExpression` 및 `ArrowParameterList`에서 발생할 수 있는 모든 구조를 허용합니다:

```grammar
CPEAAPL :
  ( Expression )
  ( Expression , )
  ( )
  ( ... BindingIdentifier )
  ( ... BindingPattern )
  ( Expression , ... BindingIdentifier )
  ( Expression , ... BindingPattern )
```

예를 들어, 다음 표현식은 유효한 `CPEAAPL`입니다:

```js
// 유효한 ParenthesizedExpression 및 ArrowParameterList:
(a, b)
(a, b = 1)

// 유효한 ParenthesizedExpression:
(1, 2, 3)
(function foo() { })

// 유효한 ArrowParameterList:
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// 여전히 유효하지 않지만 여전히 CPEAAPL인 경우:
(1, ...b)
(1, )
```

뒤따라오는 쉼표와 `...`는 오직 `ArrowParameterList`에서만 발생할 수 있습니다. `b = 1`과 같은 일부 구조는 둘 다에서 발생할 수 있지만 그 의미는 다릅니다: `ParenthesizedExpression` 내부에서 이는 할당이고, `ArrowParameterList` 내부에서는 기본값이 설정된 매개변수입니다. 숫자 및 기타 `PrimaryExpressions`는 파라미터 이름 또는 매개변수 해체 패턴으로 유효하지 않은 것이 `ParenthesizedExpression`에서만 발생할 수 있습니다. 그러나 그것들은 모두 `CPEAAPL` 내에 포함될 수 있습니다.

### 생산에서 `CPEAAPL` 사용하기

이제 우리는 [`AssignmentExpression` 프로덕션](https://tc39.es/ecma262/#prod-AssignmentExpression)에서 매우 관대한 `CPEAAPL`을 사용할 수 있습니다. (참고: `ConditionalExpression`은 여기서 보여지지 않는 긴 프로덕션 체인을 통해 `PrimaryExpression`으로 이어집니다.)

```grammar
AssignmentExpression :
  ConditionalExpression
  ArrowFunction
  ...

ArrowFunction :
  ArrowParameters => ConciseBody

ArrowParameters :
  BindingIdentifier
  CPEAAPL

PrimaryExpression :
  ...
  CPEAAPL

```

`AssignmentExpression`을 파싱하고 다음 토큰이 `(`인 상황을 다시 한번 상상해봅시다. 이제 우리는 `CPEAAPL`을 파싱하고 나중에 어떤 프로덕션을 사용할지 결정할 수 있습니다. `ArrowFunction`을 파싱하든 `ConditionalExpression`을 파싱하든 상관없이 어느 경우에나 다음에 파싱할 기호는 `CPEAAPL`입니다!

`CPEAAPL`을 파싱한 후에는 원래 `AssignmentExpression` (`CPEAAPL`을 포함하는) 에 대한 프로덕션을 선택할 수 있습니다. 이 결정은 `CPEAAPL` 다음의 토큰을 기반으로 이루어집니다.

토큰이 `=>`인 경우, 다음 프로덕션을 사용합니다:

```grammar
AssignmentExpression :
  ArrowFunction
```

토큰이 다른 것일 경우, 다음 프로덕션을 사용합니다:

```grammar
AssignmentExpression :
  ConditionalExpression
```

예를 들어:

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             CPEAAPL 뒤의 토큰

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            CPEAAPL 뒤의 토큰
```

이 시점에서 `CPEAAPL`을 그대로 유지하고 프로그램의 나머지를 계속 파싱할 수 있습니다. 예를 들어, `CPEAAPL`이 `ArrowFunction` 안에 있을 경우, 그것이 유효한 화살표 함수 매개변수 목록인지 아닌지를 아직 볼 필요가 없습니다 - 이는 이후에 처리할 수 있습니다. (실제 파서는 유효성 검사를 바로 수행할 수 있지만, 사양 관점에서는 그럴 필요가 없습니다.)

### CPEAAPLs 제한

이전에 보았듯이 `CPEAAPL`에 대한 문법 프로덕션은 매우 관대하며 `(1, ...a)`와 같이 결코 유효하지 않은 구성을 허용합니다. 문법에 따라 프로그램을 파싱한 후, 해당 불법적 구성을 금지해야 합니다.

사양은 다음의 제한을 추가하여 이를 수행합니다:

:::ecmascript-algorithm
> [정적 의미: 초기 오류](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> `CPEAAPL`이 `ParenthesizedExpression`을 포함하지 않으면 구문 오류입니다.

:::ecmascript-algorithm
> [보충 문법](https://tc39.es/ecma262/#sec-primary-expression)
>
> `PrimaryExpression : CPEAAPL` 프로덕션의 인스턴스를 처리할 때,
>
> `CPEAAPL`의 해석은 다음 문법을 사용하여 세밀하게 조정됩니다:
>
> `ParenthesizedExpression : ( Expression )`

이는 문법 트리에서 `PrimaryExpression` 위치에 `CPEAAPL`이 나타나는 경우, 실제로는 `ParenthesizedExpression`이며 이는 유효한 유일한 프로덕션이 된다는 것을 의미합니다.

`Expression`은 절대 비어 있을 수 없기 때문에 `( )`는 유효한 `ParenthesizedExpression`이 아닙니다. `(1, 2, 3)` 같은 쉼표로 구분된 목록은 [쉼표 연산자](https://tc39.es/ecma262/#sec-comma-operator)에 의해 생성됩니다:

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

마찬가지로, `ArrowParameters` 위치에 `CPEAAPL`이 발생하는 경우, 다음 제한이 적용됩니다:

:::ecmascript-algorithm
> [정적 의미: 초기 오류](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> `CPEAAPL`이 `ArrowFormalParameters`를 포함하지 않으면 구문 오류입니다.

:::ecmascript-algorithm
> [보충 문법](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> 다음 프로덕션이 인식될 때,
>
> `ArrowParameters : CPEAAPL`
>
> `CPEAAPL`의 해석은 다음 문법을 사용하여 세밀하게 조정됩니다:
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### 기타 커버 문법

`CPEAAPL` 외에도 사양은 다른 모호해 보이는 구성에 대해 커버 문법을 사용합니다.

`ObjectLiteral`은 화살표 함수 매개변수 목록 내에서 발생하는 `ObjectAssignmentPattern`의 커버 문법으로 사용됩니다. 이는 `ObjectLiteral`이 실제 객체 리터럴 내부에서는 발생할 수 없는 구성을 허용한다는 것을 의미합니다.

```grammar
ObjectLiteral :
  ...
  { PropertyDefinitionList }

PropertyDefinition :
  ...
  CoverInitializedName

CoverInitializedName :
  IdentifierReference Initializer

Initializer :
  = AssignmentExpression
```

예를 들어:

```js
let o = { a = 1 }; // 구문 오류

// 기본값이 있는 구조화 매개 변수를 사용한 화살표 함수:
//
let f = ({ a = 1 }) => { return a; };
f({}); // 1 반환
f({a : 6}); // 6 반환
```

유한한 Lookahead를 가지고 보면 비동기 화살표 함수도 모호해 보입니다:

```js
let x = async(a,
```

이는 `async`라는 함수 호출인가요, 아니면 비동기 화살표 함수인가요?

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

이를 위해 문법은 `CPEAAPL`과 유사하게 작동하는 커버 문법 기호 `CoverCallExpressionAndAsyncArrowHead`를 정의합니다.

## 요약

이번 에피소드에서는 명세서가 cover 문법을 정의하고 이를 유한한 선행 탐색으로 현재 구문 구조를 식별할 수 없는 경우에 사용하는 방법에 대해 살펴보았습니다.

특히, 화살표 함수 매개변수 목록과 괄호로 묶인 표현식을 구분하는 방법과 명세서가 모호해 보이는 구문을 처음에는 관대하게 파싱하고 이후에 정적 의미 규칙으로 이를 제한하는 cover 문법을 사용하는 방법에 대해 살펴보았습니다.
