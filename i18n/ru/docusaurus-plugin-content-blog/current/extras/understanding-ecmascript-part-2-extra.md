---
title: 'Дополнительный контент для "Понимание спецификации ECMAScript, часть 2"'
author: '[Марья Хёлтта](https://twitter.com/marjakh), наблюдатель за спекулятивной спецификацией'
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
description: 'Учебник по чтению спецификации ECMAScript'
tweet: ''
---

### Почему `o2.foo` является `AssignmentExpression`?

`o2.foo` не выглядит как `AssignmentExpression`, так как нет присваивания. Почему он является `AssignmentExpression`?

Спецификация на самом деле позволяет `AssignmentExpression` как аргумент и как правую часть присваивания. Например:

```js
function simple(a) {
  console.log('Аргумент был ' + a);
}
simple(x = 1);
// → Выводит “Аргумент был 1”.
x;
// → 1
```

…и…

```js
x = y = 5;
x; // 5
y; // 5
```

`o2.foo` является `AssignmentExpression`, который ничего не присваивает. Это следует из следующих грамматических правил, каждое из которых выбирает "самый простой" случай до последнего:

`AssignmentExpression` не обязательно должен содержать присваивание, он также может быть просто `ConditionalExpression`:

> **[`AssignmentExpression : ConditionalExpression`](https://tc39.es/ecma262/#sec-assignment-operators)**

(Есть и другие правила, здесь мы показываем только релевантное.)

`ConditionalExpression` не обязательно должен содержать условие (`a == b ? c : d`), он также может быть просто `ShortcircuitExpression`:

> **[`ConditionalExpression : ShortCircuitExpression`](https://tc39.es/ecma262/#sec-conditional-operator)**

И так далее:

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
Почти готово…

> [`ShiftExpression : AdditiveExpression`](https://tc39.es/ecma262/#prod-ShiftExpression)
>
> [`AdditiveExpression : MultiplicativeExpression`](https://tc39.es/ecma262/#prod-AdditiveExpression)
>
> [`MultiplicativeExpression : ExponentialExpression`](https://tc39.es/ecma262/#prod-MultiplicativeExpression)
>
> [`ExponentialExpression : UnaryExpression`](https://tc39.es/ecma262/#prod-ExponentiationExpression)

Не отчаивайтесь! Осталось всего несколько правил…

> [`UnaryExpression : UpdateExpression`](https://tc39.es/ecma262/#prod-UnaryExpression)
>
> [`UpdateExpression : LeftHandSideExpression`](https://tc39.es/ecma262/#prod-UpdateExpression)

Затем мы доходим до правил для `LeftHandSideExpression`:

> [`LeftHandSideExpression :`](https://tc39.es/ecma262/#prod-LeftHandSideExpression)
> `NewExpression`
> `CallExpression`
> `OptionalExpression`

Не очевидно, какое правило может применяться к `o2.foo`. Нам просто нужно знать (или выяснить), что `NewExpression` не обязательно должен содержать ключевое слово `new`.

> [`NewExpression : MemberExpression`](https://tc39.es/ecma262/#prod-NewExpression)

`MemberExpression` звучит как то, что мы искали, поэтому теперь мы берем правило

> [`MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#prod-MemberExpression)

Итак, `o2.foo` является `MemberExpression`, если `o2` является допустимым `MemberExpression`. К счастью, это намного проще увидеть:

> [`MemberExpression : PrimaryExpression`](https://tc39.es/ecma262/#prod-MemberExpression)
>
> [`PrimaryExpression : IdentifierReference`](https://tc39.es/ecma262/#prod-PrimaryExpression)
>
> [`IdentifierReference : Identifier`](https://tc39.es/ecma262/#prod-IdentifierReference)

`o2` наверняка является `Identifier`, так что все в порядке. `o2` является `MemberExpression`, значит `o2.foo` тоже является `MemberExpression`. `MemberExpression` является допустимым `AssignmentExpression`, следовательно, `o2.foo` также является `AssignmentExpression`.
