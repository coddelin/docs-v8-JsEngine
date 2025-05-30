---
title: "Contenu supplémentaire pour \"Comprendre la spécification ECMAScript, partie 2\""
author: "[Marja Hölttä](https://twitter.com/marjakh), spectatrice de spécifications spéculatives"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
description: "Tutoriel sur la lecture de la spécification ECMAScript"
tweet: ""
---

### Pourquoi `o2.foo` est-il une `AssignmentExpression` ?

`o2.foo` ne ressemble pas à une `AssignmentExpression` puisqu'il n'y a pas d'affectation. Pourquoi est-ce une `AssignmentExpression` ?

La spécification autorise en fait une `AssignmentExpression` à la fois comme argument et comme côté droit d'une affectation. Par exemple :

```js
function simple(a) {
  console.log('L'argument était ' + a);
}
simple(x = 1);
// → Affiche “L'argument était 1”.
x;
// → 1
```

…et…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo` est une `AssignmentExpression` qui n'assigne rien. Cela découle des productions grammaticales suivantes, chaque une prenant le cas « le plus simple » jusqu'à la dernière :

Une `AssignmentExpression` n'a pas besoin d'avoir une affectation, elle peut aussi être juste une `ConditionalExpression` :

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

(Il existe d'autres productions également, ici nous montrons uniquement celle pertinente.)

Une `ConditionalExpression` n'a pas besoin d'avoir une condition (`a == b ? c : d`), elle peut aussi être simplement une `ShortcircuitExpression` :

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

Et ainsi de suite :

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
Presque arrivé…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

Ne désespérez pas ! Encore quelques productions…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

Ensuite, nous arrivons aux productions pour `LeftHandSideExpression` :

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

Il n'est pas évident de savoir quelle production pourrait s'appliquer à `o2.foo`. Nous devons simplement savoir (ou découvrir) qu'une `NewExpression` n'a pas nécessairement besoin du mot-clé `new`.

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression` semble être quelque chose que nous recherchions, alors maintenant nous prenons la production

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

Donc, `o2.foo` est une `MemberExpression` si `o2` est une `MemberExpression` valide. Heureusement, cela est beaucoup plus simple à voir :

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2` est sûrement un `Identifier` donc nous sommes bons. `o2` est une `MemberExpression`, donc `o2.foo` est également une `MemberExpression`. Une `MemberExpression` est une `AssignmentExpression` valide, donc `o2.foo` est également une `AssignmentExpression`.
