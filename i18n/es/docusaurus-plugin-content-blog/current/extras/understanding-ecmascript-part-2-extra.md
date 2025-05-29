---
title: "Contenido adicional para \"Entendiendo la especificación ECMAScript, parte 2\""
author: "[Marja Hölttä](https://twitter.com/marjakh), espectador especulativo de especificaciones"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
description: "Tutorial sobre cómo leer la especificación ECMAScript"
tweet: ""
---

### ¿Por qué es `o2.foo` una `AssignmentExpression`?

`o2.foo` no parece una `AssignmentExpression` ya que no hay asignación. ¿Por qué es una `AssignmentExpression`?

La especificación permite en realidad una `AssignmentExpression` tanto como argumento como en el lado derecho de una asignación. Por ejemplo:

```js
function simple(a) {
  console.log('El argumento fue ' + a);
}
simple(x = 1);
// → Registra “El argumento fue 1”.
x;
// → 1
```

…y…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo` es una `AssignmentExpression` que no asigna nada. Esto se deduce de las siguientes producciones gramaticales, cada una tomando el caso "más simple" hasta la última:

Una `AssignmentExpression` no necesita tener una asignación, también puede ser simplemente una `ConditionalExpression`:

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

(También hay otras producciones, aquí mostramos solo la relevante.)

Una `ConditionalExpression` no necesita tener una condicional (`a == b ? c : d`), también puede ser simplemente una `ShortcircuitExpression`:

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

Y así sucesivamente:

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
Casi llegamos…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

¡No te desesperes! Solo un par de producciones más…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

Luego llegamos a las producciones de `LeftHandSideExpression`:

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

No está claro qué producción podría aplicarse a `o2.foo`. Solo necesitamos saber (o averiguar) que una `NewExpression` no tiene que tener necesariamente la palabra clave `new`.

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression` suena a algo que estábamos buscando, así que ahora tomamos la producción

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

Por lo tanto, `o2.foo` es una `MemberExpression` si `o2` es una `MemberExpression` válida. Por suerte es mucho más fácil de ver:

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2` es seguramente un `Identifier`, así que estamos bien. `o2` es una `MemberExpression`, por lo que `o2.foo` también es una `MemberExpression`. Una `MemberExpression` es una `AssignmentExpression` válida, por lo que `o2.foo` también es una `AssignmentExpression`.
