---
title: 'ECMAScript 명세 이해하기, 1부'
author: '[Marja Hölttä](https://twitter.com/marjakh), 사양 관찰자'
avatars:
  - marja-holtta
date: 2020-02-03 13:33:37
tags:
  - ECMAScript
  - ECMAScript 이해하기
description: 'ECMAScript 명세 읽기에 대한 튜토리얼'
tweet: '1224363301146189824'
---

[모든 에피소드 보기](/blog/tags/understanding-ecmascript)

이 글에서는 명세에서 간단한 함수를 가져와 표기법을 이해해 봅니다. 시작해 볼까요!

## 서문

JavaScript를 알고 있어도 그 언어 명세인 [ECMAScript Language specification, 또는 줄여서 ECMAScript 명세](https://tc39.es/ecma262/)를 읽는 것은 상당히 어려울 수 있습니다. 적어도 제가 처음으로 읽기 시작했을 때 그렇게 느꼈습니다.

<!--truncate-->
구체적인 예제를 살펴보고 명세를 따라가며 이에 대해 이해해 봅시다. 아래 코드는 `Object.prototype.hasOwnProperty` 사용 예제를 보여줍니다:

```js
const o = { foo: 1 };
o.hasOwnProperty('foo'); // true
o.hasOwnProperty('bar'); // false
```

이 예제에서, `o`는 `hasOwnProperty`라는 속성을 가지고 있지 않으므로 프로토타입 체인을 따라가서 이를 찾습니다. 우리는 `o`의 프로토타입인 `Object.prototype`에서 이를 찾습니다.

`Object.prototype.hasOwnProperty`가 작동하는 방식을 설명하기 위해 명세는 다음과 같은 유사 코드 설명을 사용합니다:

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> `hasOwnProperty` 메서드가 인수 `V`로 호출되었을 때, 다음 단계가 수행됩니다:
>
> 1. `P`를 `? ToPropertyKey(V)`로 설정합니다.
> 2. `O`를 `? ToObject(this value)`로 설정합니다.
> 3. `? HasOwnProperty(O, P)`를 반환합니다.
:::

…그리고…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> 추상 작업 `HasOwnProperty`는 객체가 지정된 속성 키를 가진 고유 속성을 가지고 있는지 여부를 결정하는 데 사용됩니다. 부울 값이 반환됩니다. 이 작업은 `O`와 `P`라는 인수로 호출됩니다. 여기서 `O`는 객체이고 `P`는 속성 키입니다. 이 추상 작업은 다음 단계를 실행합니다:
>
> 1. `Type(O)`이 `Object`임을 보증합니다.
> 2. `IsPropertyKey(P)`가 `true`임을 보증합니다.
> 3. `desc`를 `? O.[[GetOwnProperty]](P)`로 설정합니다.
> 4. `desc`가 `undefined`이면 `false`를 반환합니다.
> 5. `true`를 반환합니다.
:::

하지만 “추상 작업”이란 무엇일까요? `[[ ]]` 안에 있는 것은 무엇일까요? 함수 앞에 `?`가 있는 이유는 무엇일까요? 어서션은 무엇을 의미할까요?

알아봅시다!

## 언어 타입과 명세 타입

익숙해 보이는 것부터 시작해 봅시다. 명세는 우리가 JavaScript에서 이미 알고 있는 값인 `undefined`, `true`, 및 `false`와 같은 값을 사용합니다. 이 값들은 모두 [**언어 값**](https://tc39.es/ecma262/#sec-ecmascript-language-types)이며, 명세에서 정의하는 **언어 타입**의 값들입니다.

명세는 내부적으로도 언어 값을 사용합니다. 예를 들어, 내부 데이터 타입은 가능한 값이 `true`와 `false`인 필드를 가질 수 있습니다. 반면, JavaScript 엔진은 언어 값을 내부적으로 자주 사용하지 않습니다. 예를 들어, JavaScript 엔진이 C++로 작성된 경우, C++의 `true`와 `false`를 사용하고 (JavaScript의 `true`와 `false`의 내부 표현을 사용하지 않습니다).

언어 타입 외에도 명세는 [**명세 타입**](https://tc39.es/ecma262/#sec-ecmascript-specification-types)을 사용합니다. 이 타입들은 명세에만 존재하며 JavaScript 언어에는 존재하지 않습니다. JavaScript 엔진은 이를 구현할 필요는 없지만 자유롭게 구현할 수 있습니다. 이 블로그 글에서는 명세 타입 Record (및 그 하위 타입 Completion Record)를 알아봅니다.

## 추상 작업

[**추상 작업**](https://tc39.es/ecma262/#sec-abstract-operations)은 ECMAScript 명세에서 정의된 함수들로, 명세를 간결하게 작성하기 위해 정의됩니다. JavaScript 엔진은 이를 별도의 함수로 구현할 필요는 없습니다. 이 함수들은 JavaScript에서 직접 호출할 수 없습니다.

## 내부 슬롯과 내부 메서드

[**내부 슬롯**과 **내부 메서드**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots)는 `[[ ]]`로 둘러싸인 이름을 사용합니다.

내부 슬롯은 JavaScript 객체나 명세 타입의 데이터 멤버입니다. 이는 객체의 상태를 저장하는 데 사용됩니다. 내부 메서드는 JavaScript 객체의 멤버 함수입니다.

예를 들어, 모든 JavaScript 객체는 내부 슬롯 `[[Prototype]]`과 내부 메서드 `[[GetOwnProperty]]`를 가지고 있습니다.

내부 슬롯과 메서드는 JavaScript에서 접근할 수 없습니다. 예를 들어, `o.[[Prototype]]`에 접근하거나 `o.[[GetOwnProperty]]()`를 호출할 수 없습니다. JavaScript 엔진은 이를 내부적으로 구현할 수 있지만 반드시 해야 하는 것은 아닙니다.

때로는 내부 메서드가 유사한 이름의 추상 작업으로 위임합니다. 예를 들어, 일반 객체의 `[[GetOwnProperty]]`의 경우:

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> 객체 `O`의 내부 메소드 `[[GetOwnProperty]]`가 속성 키 `P`와 함께 호출될 때, 다음 절차를 수행합니다:
>
> 1. `! OrdinaryGetOwnProperty(O, P)`를 반환합니다.
:::

(느낌표의 의미는 다음 챕터에서 알게 될 것입니다.)

`OrdinaryGetOwnProperty`는 내부 메소드가 아닙니다. 이는 특정 객체와 연결되어 있지 않기 때문입니다. 대신, 동작하는 객체가 매개변수로 전달됩니다.

`OrdinaryGetOwnProperty`는 일반 객체에 대해 작동하기 때문에 “ordinary”라고 불립니다. ECMAScript 객체는 **ordinary** 또는 **exotic**일 수 있습니다. Ordinary 객체는 **필수 내부 메소드**라고 불리는 메소드 집합에 대해 기본 동작을 가져야 합니다. 객체가 기본 동작에서 벗어난다면 이는 exotic입니다.

가장 잘 알려진 exotic 객체는 `Array`입니다. 이는 length 속성이 기본 방식과 다르게 동작하기 때문입니다: `length` 속성을 설정하면 `Array`에서 요소를 제거할 수 있습니다.

필수 내부 메소드는 [여기](https://tc39.es/ecma262/#table-5)에 나열된 메소드입니다.

## 완료 레코드

물음표와 느낌표는 무엇인가요? 이를 이해하려면 [**Completion Records (완료 레코드)**](https://tc39.es/ecma262/#sec-completion-record-specification-type)를 살펴봐야 합니다!

완료 레코드는 명세 목적을 위해 정의된 명세 데이터 타입입니다. JavaScript 엔진은 이에 상응하는 내부 데이터 타입을 가질 필요는 없습니다.

완료 레코드는 “레코드” — 고정된 이름 필드 집합을 가진 데이터 타입입니다. 완료 레코드는 세 가지 필드를 가지고 있습니다:

:::table-wrapper
| 이름         | 설명                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `[[Type]]`   | `normal`, `break`, `continue`, `return`, 또는 `throw` 중 하나. `normal`을 제외한 모든 유형은 **갑작스러운 완료**입니다.                   |
| `[[Value]]`  | 완료가 발생했을 때 생성된 값. 예를 들어 함수의 반환값이나 예외(예외가 발생한 경우)입니다. |
| `[[Target]]` | 방향 제어 전송에 사용됩니다 (이 블로그 게시물과는 관련이 없습니다).                                                                     |
:::

모든 추상 작업은 암시적으로 완료 레코드를 반환합니다. 추상 작업이 Boolean과 같은 간단한 타입을 반환할 것처럼 보이더라도 이는 암시적으로 `normal` 타입이 있는 완료 레코드로 감싸서 반환됩니다 ([암시적 완료 값 (Implicit Completion Values)](https://tc39.es/ecma262/#sec-implicit-completion-values)을 참고하세요).

참고 1: 명세는 이와 관련하여 완벽히 일관적이지 않습니다. 일부 도우미 함수는 단순 값을 반환하며 완료 레코드에서 값을 추출하지 않고 그대로 사용됩니다. 이는 일반적으로 문맥에서 명확합니다.

참고 2: 명세 편집자는 완료 레코드 처리를 보다 명시적으로 만드는 것을 검토 중입니다.

알고리즘이 예외를 던질 경우, 이는 `[[Type]]` `throw`와 `[[Value]]`로 예외 객체를 가진 완료 레코드를 반환하는 것과 같습니다. 지금은 `break`, `continue`, `return` 유형을 무시하겠습니다.

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt)는 다음 절차를 의미합니다:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `argument`가 갑작스러운 완료라면, `argument`를 반환합니다.
> 2. `argument`를 `argument.[[Value]]`로 설정합니다.
<!-- markdownlint-enable blanks-around-lists -->
:::

즉, 우리는 완료 레코드를 검사하여, 갑작스러운 완료일 경우 즉시 반환합니다. 그렇지 않으면 완료 레코드에서 값을 추출합니다.

`ReturnIfAbrupt`는 함수 호출처럼 보일 수 있지만 실제로는 그렇지 않습니다. 이는 `ReturnIfAbrupt()`가 발생하는 함수가 반환되게 합니다. `ReturnIfAbrupt` 함수 자체가 반환되는 것이 아닙니다. 이는 C 계열 언어에서의 매크로와 비슷하게 동작합니다.

`ReturnIfAbrupt`는 다음과 같이 사용할 수 있습니다:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `obj`를 `Foo()`로 설정합니다. (`obj`는 완료 레코드입니다.)
> 2. `ReturnIfAbrupt(obj)`.
> 3. `Bar(obj)`. (여전히 여기에 있다면, `obj`는 완료 레코드에서 추출된 값입니다.)
<!-- markdownlint-enable blanks-around-lists -->
:::

이제 [물음표](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands)가 등장합니다: `? Foo()`는 `ReturnIfAbrupt(Foo())`와 동일합니다. 단축형을 사용하는 것은 실용적입니다: 매번 에러 처리 코드를 명시적으로 작성할 필요가 없습니다.

마찬가지로, `Let val be ! Foo()`는 다음과 동일합니다:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `val`을 `Foo()`로 설정합니다.
> 2. `val`이 갑작스러운 완료가 아니라고 단언합니다.
> 3. `val`을 `val.[[Value]]`로 설정합니다.
<!-- markdownlint-enable blanks-around-lists -->
:::

이 지식을 사용하여 `Object.prototype.hasOwnProperty`를 이렇게 다시 작성할 수 있습니다:

:::ecmascript-algorithm
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. `P`를 `ToPropertyKey(V)`로 설정.
> 2. `P`가 비정상 완료라면, `P`를 반환.
> 3. `P`를 `P.[[Value]]`로 설정.
> 4. `O`를 `ToObject(this value)`로 설정.
> 5. `O`가 비정상 완료라면, `O`를 반환.
> 6. `O`를 `O.[[Value]]`로 설정.
> 7. `temp`를 `HasOwnProperty(O, P)`로 설정.
> 8. `temp`가 비정상 완료라면, `temp`를 반환.
> 9. `temp`를 `temp.[[Value]]`로 설정.
> 10. `NormalCompletion(temp)`를 반환.
:::

…그리고 우리는 `HasOwnProperty`를 이렇게 다시 작성할 수 있습니다:

:::ecmascript-algorithm
> **`HasOwnProperty(O, P)`**
>
> 1. `Type(O)`가 `Object`임을 단언.
> 2. `IsPropertyKey(P)`가 `true`임을 단언.
> 3. `desc`를 `O.[[GetOwnProperty]](P)`로 설정.
> 4. `desc`가 비정상 완료라면, `desc`를 반환.
> 5. `desc`를 `desc.[[Value]]`로 설정.
> 6. `desc`가 `undefined`라면, `NormalCompletion(false)`를 반환.
> 7. `NormalCompletion(true)`를 반환.
:::

`[[GetOwnProperty]]` 내부 메서드는 느낌표 없이도 다시 작성할 수 있습니다:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. `temp`를 `OrdinaryGetOwnProperty(O, P)`로 설정.
> 2. `temp`가 비정상 완료가 아님을 단언.
> 3. `temp`를 `temp.[[Value]]`로 설정.
> 4. `NormalCompletion(temp)`를 반환.
<!-- markdownlint-enable blanks-around-lists -->
:::

여기서 우리는 `temp`가 어떤 다른 것과 충돌하지 않는 완전히 새로운 임시 변수라고 가정합니다.

또한 `return` 문이 Completion Record 이외의 것을 반환할 때, 이는 암묵적으로 `NormalCompletion` 안에 래핑된다는 사실도 사용했습니다.

### 여담: `Return ? Foo()`

사양은 `Return ? Foo()` 표기법을 사용합니다 — 왜 물음표일까요?

`Return ? Foo()`는 다음과 같이 확장됩니다:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `temp`를 `Foo()`로 설정.
> 2. `temp`가 비정상 완료라면, `temp`를 반환.
> 3. `temp`를 `temp.[[Value]]`로 설정.
> 4. `NormalCompletion(temp)`를 반환.
<!-- markdownlint-enable blanks-around-lists -->
:::

이는 `Return Foo()`와 동일합니다; 이는 비정상 완료와 정상 완료 모두 동일하게 작동합니다.

`Return ? Foo()`는 단지 편집상의 이유로 사용되며, `Foo`가 Completion Record를 반환한다는 것을 더 명확히 나타내기 위함입니다.

## 단언

사양의 단언은 알고리즘의 불변 조건을 단언합니다. 이는 명확성을 위해 추가된 것이며, 구현에 요구 조건을 추가하는 것은 아닙니다 — 구현은 이를 확인할 필요가 없습니다.

## 계속 진행하기

추상 연산들은 다른 추상 연산으로 위임됩니다 (아래 그림 참조), 하지만 이 블로그 게시물에 기반하여 그들이 무엇을 하는지 알아낼 수 있어야 합니다. 우리는 속성 설명자 (Property Descriptors)를 접할 텐데, 이는 또 다른 사양 유형일 뿐입니다.

![`Object.prototype.hasOwnProperty`에서 시작하는 함수 호출 그래프](/_img/understanding-ecmascript-part-1/call-graph.svg)

## 요약

우리는 간단한 메서드 — `Object.prototype.hasOwnProperty` — 그리고 그것이 호출하는 **추상 연산**을 읽어보았습니다. 오류 처리에 관련된 단축 기호 `?`와 `!`에 익숙해졌습니다. 우리는 **언어 유형**, **사양 유형**, **내부 슬롯**, 그리고 **내부 메서드**를 접했습니다.

## 유용한 링크

[ECMAScript 사양 읽는 법](https://timothygu.me/es-howto/): 이 게시물에서 다룬 자료 대부분을 약간 다른 각도에서 다루는 튜토리얼.
