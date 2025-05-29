---
title: 'Zusätzlicher Inhalt für "Understanding the ECMAScript spec, Teil 2"'
author: '[Marja Hölttä](https://twitter.com/marjakh), spekulative Spezifikationsbeobachterin'
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
description: 'Tutorial zum Lesen der ECMAScript-Spezifikation'
tweet: ''
---

### Warum ist `o2.foo` ein `AssignmentExpression`?

`o2.foo` sieht nicht wie eine `AssignmentExpression` aus, da es keine Zuweisung gibt. Warum ist es trotzdem eine `AssignmentExpression`?

Die Spezifikation erlaubt tatsächlich eine `AssignmentExpression` sowohl als Argument als auch auf der rechten Seite einer Zuweisung. Zum Beispiel:

```js
function simple(a) {
  console.log('Das Argument war ' + a);
}
simple(x = 1);
// → Gibt „Das Argument war 1“ aus.
x;
// → 1
```

…und…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo` ist eine `AssignmentExpression`, die nichts zuweist. Dies ergibt sich aus den folgenden Produktionsregeln der Grammatik, jede nimmt den "einfachsten" Fall bis zur letzten:

Eine `AssignmentExpression` muss keine Zuweisung enthalten, sie kann auch einfach eine `ConditionalExpression` sein:

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

(Es gibt auch andere Produktionsregeln, aber hier zeigen wir nur die relevante.)

Eine `ConditionalExpression` muss keine Bedingung (`a == b ? c : d`) enthalten, sie kann auch einfach eine `ShortcircuitExpression` sein:

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

Und so weiter:

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
Fast geschafft…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

Nicht verzweifeln! Nur noch ein paar Produktionsregeln…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

Dann stoßen wir auf die Produktionsregel für `LeftHandSideExpression`:

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

Es ist nicht eindeutig, welche Produktionsregel auf `o2.foo` zutreffen könnte. Wir müssen lediglich wissen (oder herausfinden), dass eine `NewExpression` nicht unbedingt das Schlüsselwort `new` enthalten muss.

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression` klingt nach etwas, das wir gesucht haben, daher nehmen wir nun die Produktionsregel

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

Also ist `o2.foo` eine `MemberExpression`, wenn `o2` eine gültige `MemberExpression` ist. Glücklicherweise ist das viel einfacher zu erkennen:

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2` ist sicher ein `Identifier`, also sind wir gut. `o2` ist eine `MemberExpression`, also ist `o2.foo` auch eine `MemberExpression`. Eine `MemberExpression` ist eine gültige `AssignmentExpression`, daher ist `o2.foo` auch eine `AssignmentExpression`.
