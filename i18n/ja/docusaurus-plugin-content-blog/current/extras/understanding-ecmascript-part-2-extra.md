---
title: 'ECMAScript仕様理解パート2の「追加内容」'
author: '[Marja Hölttä](https://twitter.com/marjakh), 推測的仕様の観察者'
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
description: 'ECMAScript仕様を読むためのチュートリアル'
tweet: ''
---

### なぜ`o2.foo`は`AssignmentExpression`なのか？

`o2.foo`は`AssignmentExpression`には見えません。なぜなら代入がないからです。なぜこれが`AssignmentExpression`なのでしょうか？

仕様では、`AssignmentExpression`を引数として使用したり代入の右辺に使用することが認められています。例を挙げると：

```js
function simple(a) {
  console.log('引数は ' + a);
}
simple(x = 1);
// → 「引数は 1」とログに記録される。
x;
// → 1
```

…および…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo`は何も代入をしない`AssignmentExpression`です。これには以下の文法生成規則が基づいています。それぞれ「最も簡単な」ケースをたどって最後に至ります：

`AssignmentExpression`は代入を伴う必要はなく、`ConditionalExpression`であることもできます：

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

(他にも生成規則がありますが、ここでは関連性のあるもののみを示しています。)

`ConditionalExpression`は条件式(`a == b ? c : d`)を持たない必要はなく、`ShortCircuitExpression`だけでも構いません：

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

さらに続けて：

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
もう少しです…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

絶望しないでください！もう少しです…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

`LeftHandSideExpression`の生成規則にたどり着きます：

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

`o2.foo`に適用される生成規則を特定することは明確ではありません。ただし、`NewExpression`が実際には`new`キーワードを持つ必要がないことを知る必要があります（または確認する必要があります）。

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression`は探していたもののようですので、次はこの生成規則を取得します：

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

したがって、`o2.foo`は`o2`が有効な`MemberExpression`である場合、`MemberExpression`です。幸運なことに、それははるかに簡単に見ることができます：

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2`は確かに`Identifier`であるため問題ありません。`o2`は`MemberExpression`であり、したがって`o2.foo`も`MemberExpression`です。`MemberExpression`は有効な`AssignmentExpression`なので、`o2.foo`は`AssignmentExpression`にもなります。
