---
title: &apos;“理解ECMAScript规范，第二部分”的额外内容&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh)，推测的规范观察者&apos;
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
description: &apos;关于阅读ECMAScript规范的教程&apos;
tweet: &apos;&apos;
---

### 为什么`o2.foo`是一个`AssignmentExpression`?

`o2.foo`看起来不像一个`AssignmentExpression`，因为没有赋值。为什么它是一个`AssignmentExpression`？

规范实际上允许`AssignmentExpression`既可以作为参数，也可以作为赋值的右侧。例如：

```js
function simple(a) {
  console.log(&apos;参数是 &apos; + a);
}
simple(x = 1);
// → 输出“参数是 1”。
x;
// → 1
```

…以及…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo`是一个`AssignmentExpression`，但它实际上没有进行赋值。这源于以下语法规则，每一个规则都处理到“最简单”的情况直到最后一个：

`AssignmentExpression`不需要包含赋值，它也可以只是一个`ConditionalExpression`：

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

（还有其他规则，这里我们只展示相关的规则。）

`ConditionalExpression`不需要包含条件（`a == b ? c : d`），它也可以只是一个`ShortcircuitExpression`：

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

等等：

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
快要到终点了…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

不要灰心！就剩几个规则了…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

然后我们进入`LeftHandSideExpression`的规则：

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

目前还不清楚哪条规则适用于`o2.foo`。我们只需要知道（或者查证）`NewExpression`实际上不一定需要包含`new`关键字。

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression`听起来是我们在寻找的东西，所以现在我们取规则

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

所以，如果`o2`是一个有效的`MemberExpression`，那么`o2.foo`就是一个`MemberExpression`。幸运的是，这更容易理解：

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2`显然是一个`Identifier`，所以没问题。`o2`是一个`MemberExpression`，所以`o2.foo`也是一个`MemberExpression`。一个`MemberExpression`是一个有效的`AssignmentExpression`，所以`o2.foo`也是一个`AssignmentExpression`。
