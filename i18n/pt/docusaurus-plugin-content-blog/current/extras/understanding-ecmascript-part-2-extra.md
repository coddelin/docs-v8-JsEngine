---
title: "Conteúdo adicional para \"Compreendendo a especificação ECMAScript, parte 2\""
author: "[Marja Hölttä](https://twitter.com/marjakh), espectadora especulativa de especificações"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
description: "Tutorial sobre como ler a especificação ECMAScript"
tweet: ""
---

### Por que `o2.foo` é uma `AssignmentExpression`?

`o2.foo` não parece ser uma `AssignmentExpression`, já que não há atribuição. Por que ela é uma `AssignmentExpression`?

Na verdade, a especificação permite uma `AssignmentExpression` tanto como um argumento quanto como o lado direito de uma atribuição. Por exemplo:

```js
function simple(a) {
  console.log('O argumento foi ' + a);
}
simple(x = 1);
// → Registra “O argumento foi 1”.
x;
// → 1
```

…e…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo` é uma `AssignmentExpression` que não atribui nada. Isso decorre das seguintes produções gramaticais, cada uma tomando o caso "mais simples" até a última:

Uma `AssignmentExpression` não precisa ter uma atribuição, ela pode ser apenas uma `ConditionalExpression`:

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

(Existem outras produções também, aqui mostramos apenas a relevante.)

Uma `ConditionalExpression` não precisa ter uma condicional (`a == b ? c : d`), ela pode ser apenas uma `ShortcircuitExpression`:

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

E assim por diante:

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
Estamos quase lá…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

Não desista! Apenas mais algumas produções…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

Então chegamos às produções para `LeftHandSideExpression`:

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

Não está claro qual produção pode se aplicar a `o2.foo`. Só precisamos saber (ou descobrir) que uma `NewExpression` não precisa necessariamente ter a palavra-chave `new`.

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression` parece algo que estávamos procurando, então agora tomamos a produção

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

Portanto, `o2.foo` é uma `MemberExpression` se `o2` for uma `MemberExpression` válida. Felizmente, é muito mais fácil ver:

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2` certamente é um `Identifier`, então estamos bem. `o2` é uma `MemberExpression`, então `o2.foo` também é uma `MemberExpression`. Uma `MemberExpression` é uma `AssignmentExpression` válida, então `o2.foo` também é uma `AssignmentExpression`.
