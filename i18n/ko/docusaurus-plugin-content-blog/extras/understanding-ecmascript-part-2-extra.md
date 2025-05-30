---
title: "\"ECMAScript 사양 이해하기, 2부\"의 추가 콘텐츠"
author: "[Marja Hölttä](https://twitter.com/marjakh), 추측적 사양 관찰자"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
description: "ECMAScript 사양을 읽는 튜토리얼"
tweet: ""
---

### 왜 `o2.foo`가 `AssignmentExpression`인가요?

`o2.foo`는 할당이 없는 것처럼 보이기 때문에 `AssignmentExpression`처럼 느껴지지 않습니다. 왜 이것이 `AssignmentExpression`인가요?

사양은 실제로 `AssignmentExpression`이 매개변수로 사용되거나 할당의 오른쪽에 올 수 있도록 허용합니다. 예를 들어:

```js
function simple(a) {
  console.log('매개변수는 ' + a);
}
simple(x = 1);
// → “매개변수는 1”이 로깅됩니다.
x;
// → 1
```

…및…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo`는 아무것도 할당하지 않는 `AssignmentExpression`입니다. 이는 다음 문법 생산에서 비롯되며 각각은 마지막 케이스까지 "가장 간단한" 케이스를 선택합니다:

`AssignmentExpression`은 반드시 할당을 포함할 필요가 없으며, 단순히 `ConditionalExpression`일 수도 있습니다:

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

(이 외의 생산도 있지만, 여기서는 관련된 것만 보여줍니다.)

`ConditionalExpression`은 반드시 조건부 (`a == b ? c : d`)를 포함할 필요가 없으며, 단순히 `ShortcircuitExpression`일 수도 있습니다:

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

그리고 계속해서:

> [`ShortCircuitExpression : LogicalORExpression`](https://tc39.es/ecma262/#prod-ShortCircuitExpression)
>
> [`LogicalORExpression : LogicalANDExpression`](https://tc39.es/ecma262/#prod-LogicalORExpression)
>
> [`LogicalANDExpression : BitwiseORExpression`](https://tc39.es/ecma262/#prod-LogicalANDExpression)
>
> [`BitwiseORExpression : BitwiseXORExpression`](https://tc39.es/ecma262/#prod-BitwiseORExpression)
>
> [`BitwiseXORExpression : BitwiseANDExpression`](https://tc39.es/ecma262/#prod-BitwiseXORExpression)
>
> [`BitwiseANDExpression : EqualityExpression`](https://tc39.es/ecma262/#prod-BitwiseANDExpression)
>
> [`EqualityExpression : RelationalExpression`](https://tc39.es/ecma262/#sec-equality-operators)
>
> [`RelationalExpression : ShiftExpression`](https://tc39.es/ecma262/#prod-RelationalExpression)

<!--truncate-->
거의 다 왔습니다…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

좌절하지 마세요! 몇 개의 생산만 더 남았습니다…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

그런 다음 `LeftHandSideExpression`에 대한 생산을 만나게 됩니다:

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

`o2.foo`에 적용될 생산이 무엇인지 명확하지 않습니다. `NewExpression`이 실제로 `new` 키워드를 가질 필요가 없다는 것을 알고 혹은 알아내야 합니다.

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression`은 우리가 찾던 것처럼 들리므로 이제 다음 생산을 다룹니다

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

따라서, `o2.foo`는 `o2`가 유효한 `MemberExpression`일 경우 `MemberExpression`입니다. 다행히도 이를 찾기 훨씬 더 쉬워졌습니다:

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2`는 확실히 `Identifier`이므로 괜찮습니다. `o2`는 `MemberExpression`이며 따라서 `o2.foo`도 `MemberExpression`입니다. `MemberExpression`은 유효한 `AssignmentExpression`이므로 `o2.foo`도 `AssignmentExpression`입니다.
