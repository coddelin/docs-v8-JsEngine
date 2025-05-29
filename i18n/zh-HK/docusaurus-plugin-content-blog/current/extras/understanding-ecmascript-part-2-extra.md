---
title: &apos;額外內容：「理解 ECMAScript 規格，第二部分」&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh)，投機規格觀察者&apos;
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
description: &apos;閱讀 ECMAScript 規格的教程&apos;
tweet: &apos;&apos;
---

### 為什麼 `o2.foo` 是一個 `AssignmentExpression`？

`o2.foo` 看起來不像是一個 `AssignmentExpression`，因為沒有賦值操作。為什麼它是一個 `AssignmentExpression`？

規格實際上允許 `AssignmentExpression` 作為參數或賦值右側。例如：

```js
function simple(a) {
  console.log(&apos;這個參數是 &apos; + a);
}
simple(x = 1);
// → 輸出「這個參數是 1」。
x;
// → 1
```

…還有…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo` 是一個不執行任何賦值的 `AssignmentExpression`。這是根據以下語法產生式的逐層簡化到最後一層：

`AssignmentExpresssion` 不需要具有賦值操作，它也可以僅僅是一個 `ConditionalExpression`：

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

（還有其他產生式，在這裡僅展示相關部分。）

`ConditionalExpression` 不必有條件交互操作（如 `a == b ? c : d`），它也可以僅僅是一個 `ShortcircuitExpression`：

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

接下來：

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
幾乎完成了……

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

不要氣餒！還有幾個產生式…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

接下來進入 `LeftHandSideExpression` 的產生式：

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

目前還不清楚哪個產生式適用於 `o2.foo`。我們只需要知道（或找到）`NewExpression` 實際上不必一定有 `new` 關鍵字。

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression` 聽起來像正是我們要找的，因此我們採用以下產生式

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

因此，如果 `o2` 是一個有效的 `MemberExpression`，那麼 `o2.foo` 也是一個 `MemberExpression`。幸運的是這點比較容易看出：

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2` 明顯是一個 `Identifier`，所以我們完成了。`o2` 是一個 `MemberExpression`，因此 `o2.foo` 也是一個 `MemberExpression`。而 `MemberExpression` 是一個有效的 `AssignmentExpression`，所以 `o2.foo` 也是一個 `AssignmentExpression`。
