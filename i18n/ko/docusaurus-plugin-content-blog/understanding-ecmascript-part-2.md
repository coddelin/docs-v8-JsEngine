---
title: "ECMAScript 사양 이해하기, 파트 2"
author: "[Marja Hölttä](https://twitter.com/marjakh), 추측적 사양 관찰자"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
  - ECMAScript 이해하기
description: "ECMAScript 사양 읽기에 대한 튜토리얼, 파트 2"
tweet: "1234550773629014016"
---

우리는 사양 읽기 기술을 더 연습해볼 것입니다. 이전 에피소드를 아직 보지 않았다면, 지금 확인해보세요!

[모든 에피소드](/blog/tags/understanding-ecmascript)

## 파트 2 준비되었나요?

사양을 익히는 재미있는 방법은 우리가 알고 있는 JavaScript 기능에서 시작해 그것이 어떻게 명시되어 있는지 알아보는 것입니다.

> 경고! 이 에피소드에는 2020년 2월 기준 [ECMAScript 사양](https://tc39.es/ecma262/)에서 복사된 알고리즘이 포함되어 있습니다. 결국 오래되었을 것입니다.

우리는 속성이 프로토타입 체인에서 검색된다는 것을 알고 있습니다: 객체가 우리가 읽으려는 속성을 가지지 않는 경우, 우리는 프로토타입 체인 위로 올라가 그것을 찾거나 (더 이상 프로토타입을 가지지 않는 객체를 찾을 때까지) 찾습니다.

예를 들어:

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## 프로토타입 걷기는 어디에 정의되나요?

이 행동이 어디에 정의되어 있는지 알아봅시다. 좋은 출발점은 [객체 내부 메서드](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots)의 목록입니다.

`[[GetOwnProperty]]`와 `[[Get]]`이 모두 있지만, 우리는 _자신_ 속성에만 제한되지 않는 버전을 찾고 있기 때문에 `[[Get]]`을 선택합니다.

불행히도, [속성 설명자 사양 타입](https://tc39.es/ecma262/#sec-property-descriptor-specification-type)에도 `[[Get]]`이라는 필드가 있으므로, 사양에서 `[[Get]]`을 탐색할 때 두 개의 독립적인 사용을 신중히 구분해야 합니다.

<!--truncate-->
`[[Get]]`은 **필수 내부 메서드**입니다. **보통 객체**는 필수 내부 메서드에 대한 기본 행동을 구현합니다. **특이 객체**는 기본 행동에서 벗어나는 자체 내부 메서드 `[[Get]]`을 정의할 수 있습니다. 이 포스팅에서는 보통 객체에 집중합니다.

`[[Get]]`의 기본 구현은 `OrdinaryGet`로 위임됩니다:

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> `O`의 `[[Get]]` 내부 메서드가 속성 키 `P`와 ECMAScript 언어 값 `Receiver`로 호출되었을 때, 다음 단계가 수행됩니다:
>
> 1. `? OrdinaryGet(O, P, Receiver)`를 반환합니다.

`Receiver`는 접근자 속성의 getter 함수 호출 시 **this 값**으로 사용되는 값임을 곧 볼 수 있을 것입니다.

`OrdinaryGet`는 다음과 같이 정의됩니다:

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> 추상 작업 `OrdinaryGet`가 객체 `O`, 속성 키 `P`, 그리고 ECMAScript 언어 값 `Receiver`로 호출될 때, 다음 단계가 수행됩니다:
>
> 1. `IsPropertyKey(P)`가 `true`인지 확인합니다.
> 1. `desc`를 `? O.[[GetOwnProperty]](P)`로 설정합니다.
> 1. `desc`가 `undefined`이면,
>     1. `parent`를 `? O.[[GetPrototypeOf]]()`로 설정합니다.
>     1. `parent`가 `null`이면 `undefined`를 반환합니다.
>     1. `? parent.[[Get]](P, Receiver)`를 반환합니다.
> 1. `IsDataDescriptor(desc)`가 `true`이면 `desc.[[Value]]`를 반환합니다.
> 1. `IsAccessorDescriptor(desc)`가 `true`인지 확인합니다.
> 1. `getter`를 `desc.[[Get]]`로 설정합니다.
> 1. `getter`가 `undefined`이면 `undefined`를 반환합니다.
> 1. `? Call(getter, Receiver)`를 반환합니다.

프로토타입 체인 걷기는 3단계 내에 있습니다: 우리가 속성을 자신 소유 속성으로 찾지 못한다면, 우리는 프로토타입의 `[[Get]]` 메서드를 호출하고 이는 다시 `OrdinaryGet`으로 위임합니다. 속성을 여전히 찾을 수 없다면, 우리는 그 프로토타입의 `[[Get]]` 메서드를 호출하고 이는 다시 `OrdinaryGet`으로 위임합니다. 이 과정을 속성을 찾거나 프로토타입이 없는 객체에 도달할 때까지 반복합니다.

`o2.foo`에 접근할 때 이 알고리즘이 어떻게 작동하는지 살펴봅시다. 먼저 우리는 `o2`를 `O`로, `"foo"`를 `P`로 설정하여 `OrdinaryGet`을 호출합니다. `O.[[GetOwnProperty]]("foo")`는 `undefined`를 반환합니다. 이는 `o2`가 `"foo"`라는 자신 소유 속성을 가지고 있지 않기 때문에, 3단계의 조건 브랜치로 들어갑니다. 3.a 단계에서 우리는 `parent`를 `o2`의 프로토타입, 즉 `o1`로 설정합니다. `parent`는 `null`이 아니므로, 3.b 단계에서 반환금지됩니다. 3.c 단계에서는 부모의 `[[Get]]` 메서드를 속성 키 `"foo"`로 호출하고 반환된 결과를 반환합니다.

부모 (`o1`)는 보통 객체이므로 그 `[[Get]]` 메서드는 다시 `OrdinaryGet`을 호출합니다. 이번에는 `O`가 `o1`이고 `P`가 `"foo"`입니다. `o1`은 `"foo"`라는 자신 소유 속성을 가지고 있으므로, 2단계에서 `O.[[GetOwnProperty]]("foo")`는 관련 속성 설명자를 반환하며 우리는 그것을 `desc`에 저장합니다.

[Property Descriptor](https://tc39.es/ecma262/#sec-property-descriptor-specification-type)는 명세 유형입니다. Data Property Descriptor는 속성의 값을 `[[Value]]` 필드에 직접 저장합니다. Accessor Property Descriptor는 접근자 함수를 `[[Get]]` 및/또는 `[[Set]]` 필드에 저장합니다. 이 경우, `"foo"`에 연결된 Property Descriptor는 data Property Descriptor입니다.

2단계에서 `desc`에 저장된 data Property Descriptor는 `undefined`가 아니므로 3단계에서 `if` 분기를 수행하지 않습니다. 다음으로 4단계를 실행합니다. Property Descriptor가 data Property Descriptor이므로 4단계에서 `[[Value]]` 필드, 즉 `99`를 반환하며 작업을 종료합니다.

## `Receiver`란 무엇이며 어디에서 오는가?

`Receiver` 매개변수는 8단계의 접근자 속성 경우에만 사용됩니다. 이는 접근자 속성의 getter 함수를 호출할 때 **this 값**으로 전달됩니다.

`OrdinaryGet`는 원래의 `Receiver`를 재귀 동안 변경하지 않고 그대로 전달합니다(3.c단계). 이제 `Receiver`가 원래 어디에서 오는지 알아봅시다!

`[[Get]]`이 호출되는 곳을 검색하면 References에서 작동하는 추상 연산 `GetValue`를 찾을 수 있습니다. Reference는 명세 유형으로, 기본 값, 참조된 이름 및 엄격 참조 플래그로 구성됩니다. `o2.foo`의 경우, 기본 값은 객체 `o2`, 참조된 이름은 문자열 `"foo"`, 엄격 참조 플래그는 `false`입니다. 예제 코드가 느슨한 모드로 작성되었기 때문입니다.

### 곁가지: Reference가 왜 Record가 아닌가?

곁가지: Reference는 Record가 아닙니다. 이는 Record로 표현할 수도 있을 것처럼 들리지만 말입니다. Reference는 세 개의 컴포넌트를 포함하며, 이는 세 개의 이름 필드로도 동일하게 표현될 수 있습니다. Reference가 Record가 아닌 이유는 단순히 역사적인 이유 때문입니다.

### `GetValue`로 돌아가기

`GetValue`가 어떻게 정의되어 있는지 살펴봅시다:

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`를 반환한다.
> 1. `Type(V)`가 `Reference`가 아니면, `V`를 반환한다.
> 1. `base`를 `GetBase(V)`로 설정한다.
> 1. `IsUnresolvableReference(V)`가 `true`면, `ReferenceError` 예외를 던진다.
> 1. `IsPropertyReference(V)`가 `true`라면,
>     1. `HasPrimitiveBase(V)`가 `true`라면,
>         1. 이 경우, `base`가 `undefined` 또는 `null`이 아님을 보장한다.
>         1. `base`를 `! ToObject(base)`로 설정한다.
>     1. `? base.[[Get]](GetReferencedName(V), GetThisValue(V))`를 반환한다.
> 1. 그렇지 않으면,
>     1. `base`가 환경 레코드(환경 기록)임을 보장한다.
>     1. `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))`를 반환한다.

예제의 Reference는 `o2.foo`로, 이는 속성 참조입니다. 따라서 5단계를 따릅니다. 5.a 분기를 따르지 않습니다. `base` (`o2`)가 [원시 값](/blog/react-cliff#javascript-types)(숫자, 문자열, 심볼, BigInt, 불리언, undefined, 또는 null)이 아니기 때문입니다.

그런 다음 5.b 단계에서 `[[Get]]`을 호출합니다. 전달된 `Receiver`는 `GetThisValue(V)`입니다. 이 경우, Reference의 기본 값일 뿐입니다:

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. `IsPropertyReference(V)`가 `true`임을 보장한다.
> 1. `IsSuperReference(V)`가 `true`라면,
>     1. 참조 `V`의 thisValue 구성 요소 값을 반환한다.
> 1. `GetBase(V)`를 반환한다.

`o2.foo`의 경우, 이 단계에서 Super Reference(예: `super.foo`)가 아니므로 2단계를 따르지 않습니다. 대신 3단계를 수행하며 Reference의 base 값인 `o2`를 반환합니다.

모든 것을 종합하여, 우리는 `Receiver`를 원래 Reference의 base로 설정하고, 이후 프로토타입 체인에서 변경하지 않습니다. 마지막으로 찾은 속성이 접근자 속성일 경우, 이를 호출할 때 `Receiver`를 **this 값**으로 사용합니다.

특히, getter 내부의 **this 값**은 속성을 얻으려고 시도한 원래 객체를 참조하며, 프로토타입 체인에서 속성을 찾은 객체를 참조하지 않습니다.

실제로 해봅시다!

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

이 예제에서, 우리는 `foo`라는 접근자 속성을 갖고, getter를 정의했습니다. getter는 `this.x`를 반환합니다.

그런 다음 `o2.foo`에 접근합니다 - getter는 무엇을 반환할까요?

우리는 getter를 호출할 때, **this 값**이 속성을 얻으려고 시도한 원래 객체이고, 속성을 찾은 객체가 아니란 것을 발견했습니다. 이 경우, **this 값**은 `o2`이며, `o1`이 아닙니다. getter가 `o2.x` 또는 `o1.x`를 반환하는지 확인함으로써 이를 확인할 수 있습니다. 실제로 getter는 `o2.x`를 반환합니다.

정확히 작동합니다! 우리는 명세에서 읽은 바를 토대로 이 코드 조각의 동작을 예측할 수 있었습니다.

## 속성에 접근하기 - 왜 `[[Get]]`을 호출하는가?

`o2.foo`와 같은 속성에 접근할 때 객체의 내부 메서드 `[[Get]]`가 호출된다고 명세는 어디에 정의되어 있습니까? 분명히 어딘가에 정의되어 있을 겁니다. 저를 믿지 마세요!

우리는 객체의 내부 메서드 `[[Get]]`이 References에서 작동하는 추상 연산 `GetValue`에서 호출된다는 것을 발견했습니다. 하지만 `GetValue`는 어디에서 호출됩니까?

### `MemberExpression`의 런타임 의미론

명세의 문법 규칙은 언어의 구문을 정의합니다. [런타임 의미](https://tc39.es/ecma262/#sec-runtime-semantics)는 구문 구성 요소가 '무엇을 의미하는지'(런타임에서 어떻게 평가되는지)를 정의합니다.

[문맥 자유 문법](https://en.wikipedia.org/wiki/Context-free_grammar)에 익숙하지 않으시다면, 지금 한 번 확인해보는 것이 좋습니다!

문법 규칙을 좀 더 깊게 살펴보는 것은 이후 에피소드에서 진행할 예정이며, 지금은 간단히 알아봅시다! 특히, 이번 에피소드에서는 프로덕션의 하위 표기 (`Yield`, `Await` 등)를 무시해도 괜찮습니다.

다음 프로덕션은 [`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression)이 어떻게 생겼는지를 설명합니다:

```grammar
MemberExpression :
  PrimaryExpression
  MemberExpression [ Expression ]
  MemberExpression . IdentifierName
  MemberExpression TemplateLiteral
  SuperProperty
  MetaProperty
  new MemberExpression Arguments
```

여기서는 `MemberExpression`에 대한 7개의 프로덕션을 정의하고 있습니다. `MemberExpression`은 단순히 `PrimaryExpression` 일 수 있습니다. 또는, 다른 `MemberExpression`과 `Expression`을 조합하여 `MemberExpression [ Expression ]`, 예를 들어 `o2['foo']` 처럼 구성할 수 있습니다. 혹은 `MemberExpression . IdentifierName`, 예를 들어 `o2.foo`와 같이 될 수 있는데, 이것이 우리의 예제에서 관련된 프로덕션입니다.

`MemberExpression : MemberExpression . IdentifierName` 프로덕션의 런타임 의미는 이를 평가할 때 수행해야 할 단계들을 정의합니다:

:::ecmascript-algorithm
> **[`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)의 런타임 의미: 평가**
>
> 1. `MemberExpression`을 평가한 결과를 `baseReference`로 합니다.
> 1. `? GetValue(baseReference)`를 `baseValue`로 합니다.
> 1. 이 `MemberExpression`에 매치된 코드가 엄격 모드 코드인 경우 `strict`를 `true`로, 그렇지 않은 경우 `strict`를 `false`로 합니다.
> 1. `? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)`를 반환합니다.

알고리즘은 추상 작업 `EvaluatePropertyAccessWithIdentifierKey`로 위임되므로, 이를 읽어봐야 합니다:

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey(baseValue, identifierName, strict)`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> 추상 작업 `EvaluatePropertyAccessWithIdentifierKey`는 `baseValue` 값, `identifierName` 구문 노드, 및 `strict` 논리값을 인수로 받아 다음 단계를 수행합니다:
>
> 1. `identifierName`이 `IdentifierName`이라고 가정합니다.
> 1. `? RequireObjectCoercible(baseValue)`를 `bv`로 합니다.
> 1. `identifierName`의 `StringValue`를 `propertyNameString`으로 합니다.
> 1. 기본 값 구성 요소가 `bv`, 참조된 이름 구성 요소가 `propertyNameString`, 그리고 엄격 참조 플래그가 `strict`인 Reference 유형 값을 반환합니다.

즉, `EvaluatePropertyAccessWithIdentifierKey`는 지정된 `baseValue`를 기본으로 사용하고, `identifierName`의 문자열 값을 속성 이름으로 사용하며, `strict`를 엄격 모드 플래그로 사용하는 Reference를 생성합니다.

결국 이 Reference는 `GetValue`로 전달됩니다. 이는 Reference가 사용되는 방식에 따라 명세의 여러 위치에 정의되어 있습니다.

### `MemberExpression`을 인수로 사용

예제에서, 우리는 속성 접근을 인수로 사용합니다:

```js
console.log(o2.foo);
```

이 경우, `ArgumentList` 프로덕션의 런타임 의미에서 동작이 정의되며 이는 인수에서 `GetValue`를 호출합니다:

:::ecmascript-algorithm
> **[`ArgumentListEvaluation`](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)의 런타임 의미**
>
> `ArgumentList : AssignmentExpression`
>
> 1. `AssignmentExpression`을 평가한 결과를 `ref`로 합니다.
> 1. `? GetValue(ref)`를 `arg`로 합니다.
> 1. 단일 항목인 `arg`를 포함한 목록을 반환합니다.

`o2.foo`는 겉보기에는 `AssignmentExpression`처럼 보이지 않지만 실제로는 그렇기 때문에 이 프로덕션이 적용됩니다. 이유를 알아보려면 이 [추가 콘텐츠](/blog/extras/understanding-ecmascript-part-2-extra)를 확인할 수 있지만, 지금 단계에서는 꼭 필요하지는 않습니다.

1단계에서의 `AssignmentExpression`은 `o2.foo`입니다. `o2.foo`를 평가한 결과인 `ref`는 앞서 언급한 Reference입니다. 2단계에서는 이를 대상으로 `GetValue`를 호출합니다. 따라서 객체 내부 메서드 `[[Get]]`가 호출되며 프로토타입 체인 탐색이 발생한다는 것을 알 수 있습니다.

## 요약

이번 에피소드에서는 명세가 언어 기능, 이 경우 프로토타입 탐색을 정의하는 방법을 다양한 계층에서 살펴보았습니다: 기능을 트리거하는 구문 구성 요소와 알고리즘을 포함하여 점검했습니다.
