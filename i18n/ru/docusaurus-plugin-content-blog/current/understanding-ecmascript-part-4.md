---
title: 'Понимание спецификации ECMAScript, часть 4'
author: '[Марья Хёльтта](https://twitter.com/marjakh), зритель спекулятивной спецификации'
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - Понимание ECMAScript
description: 'Учебник по чтению спецификации ECMAScript'
tweet: '1262815621756014594'
---

[Все эпизоды](/blog/tags/understanding-ecmascript)

## Тем временем в других частях Веба

[Джейсон Орендорф](https://github.com/jorendorff) из Mozilla опубликовал [отличный подробный анализ синтаксических особенностей JS](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme). Несмотря на различия в деталях реализации, все движки JS сталкиваются с одинаковыми проблемами, связанными с этими особенностями.

<!--truncate-->
## Покрывающие грамматики

В этом эпизоде мы глубже изучим *покрывающие грамматики*. Это способ описания грамматики для синтаксических конструкций, которые на первый взгляд кажутся неоднозначными.

Снова пропустим нижние индексы для `[In, Yield, Await]` для краткости, так как они не важны для этого поста в блоге. Смотрите [часть 3](/blog/understanding-ecmascript-part-3) для объяснения их значения и использования.

## Конечный просмотр вперед

Обычно анализаторы решают, какое производство использовать, основываясь на конечном просмотре вперед (фиксированное количество следующих токенов).

В некоторых случаях следующий токен однозначно определяет производство. [Например](https://tc39.es/ecma262/#prod-UpdateExpression):

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

Если мы парсим `UpdateExpression` и следующий токен — это `++` или `--`, мы сразу знаем, какое производство использовать. Если следующий токен ни тот, ни другой, это всё ещё не так плохо: мы можем разобрать выражение `LeftHandSideExpression`, начиная с текущей позиции, и определить, что делать дальше, после того как мы его разберём.

Если токен после `LeftHandSideExpression` — это `++`, то используем производство `UpdateExpression : LeftHandSideExpression ++`. Случай с `--` аналогичен. А если токен после `LeftHandSideExpression` ни `++`, ни `--`, используем производство `UpdateExpression : LeftHandSideExpression`.

### Список параметров стрелочной функции или выражение в скобках?

Разграничение списков параметров стрелочных функций и выражений в скобках более сложно.

Например:

```js
let x = (a,
```

Это начало стрелочной функции, как здесь?

```js
let x = (a, b) => { return a + b };
```

Или, может быть, это выражение в скобках, как здесь?

```js
let x = (a, 3);
```

Содержимое скобок может быть произвольно длинным - мы не можем знать, что это такое, исходя из конечного количества токенов.

Давайте представим на мгновение, что у нас есть следующие прямолинейные продукции:

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

Теперь мы не можем выбрать производство, которое использовать, с конечным просмотром вперед. Если нам нужно разобрать `AssignmentExpression` и следующий токен — это `(`, как бы мы решили, что разбирать дальше? Мы могли либо разобрать `ArrowParameterList`, либо `ParenthesizedExpression`, но наша догадка могла бы быть неверной.

### Очень разрешительный новый символ: `CPEAAPL`

Спецификация решает эту проблему посредством введения символа `CoverParenthesizedExpressionAndArrowParameterList` (сокращенно `CPEAAPL`). `CPEAAPL` — это символ, который на деле является `ParenthesizedExpression` или `ArrowParameterList`, но мы пока не знаем, какой именно.

[Продукции](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList) для `CPEAAPL` очень разрешительные, они допускают все конструкции, которые могут встретиться в `ParenthesizedExpression` и в `ArrowParameterList`:

```grammar
CPEAAPL :
  ( Expression )
  ( Expression , )
  ( )
  ( ... BindingIdentifier )
  ( ... BindingPattern )
  ( Expression , ... BindingIdentifier )
  ( Expression , ... BindingPattern )
```

Например, следующие выражения являются допустимыми `CPEAAPL`:

```js
// Допустимые ParenthesizedExpression и ArrowParameterList:
(a, b)
(a, b = 1)

// Допустимые ParenthesizedExpression:
(1, 2, 3)
(function foo() { })

// Допустимые ArrowParameterList:
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// Недопустимые ни там, ни там, но всё ещё `CPEAAPL`:
(1, ...b)
(1, )
```

Запятая в конце и `...` могут встречаться только в `ArrowParameterList`. Некоторые конструкции, такие как `b = 1`, могут встречаться в обоих случаях, но их значение различается: Внутри `ParenthesizedExpression` это присваивание, а внутри `ArrowParameterList` это параметр со значением по умолчанию. Числа и другие `PrimaryExpressions`, которые не являются допустимыми именами параметров (или шаблонами деструктуризации параметров), могут встречаться только в `ParenthesizedExpression`. Однако они все могут встречаться внутри `CPEAAPL`.

### Использование `CPEAAPL` в продукциях

Теперь мы можем использовать очень разрешительный `CPEAAPL` в [`производствах AssignmentExpression`](https://tc39.es/ecma262/#prod-AssignmentExpression). (Примечание: `ConditionalExpression` приводит к `PrimaryExpression` через длинную цепочку производств, которая здесь не показана.)

```grammar
AssignmentExpression :
  ConditionalExpression
  ArrowFunction
  ...

ArrowFunction :
  ArrowParameters => ConciseBody

ArrowParameters :
  BindingIdentifier
  CPEAAPL

PrimaryExpression :
  ...
  CPEAAPL

```

Представим, что мы снова находимся в ситуации, когда нам нужно разобрать `AssignmentExpression`, а следующий токен — `(`. Теперь мы можем разобрать `CPEAAPL` и позже выяснить, какое производство использовать. Не имеет значения, разбираем ли мы `ArrowFunction` или `ConditionalExpression`, следующий символ для разбора — это `CPEAAPL` в любом случае!

После того как мы разобрали `CPEAAPL`, мы можем решить, какое производство использовать для исходного `AssignmentExpression` (того, который содержит `CPEAAPL`). Это решение принимается на основе токена, следующего за `CPEAAPL`.

Если токен — `=>`, мы используем производство:

```grammar
AssignmentExpression :
  ArrowFunction
```

Если токен — что-то другое, мы используем производство:

```grammar
AssignmentExpression :
  ConditionalExpression
```

Например:

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             Токен после CPEAAPL

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            Токен после CPEAAPL
```

На этом этапе мы можем оставить `CPEAAPL` как есть и продолжить разбор остальной программы. Например, если `CPEAAPL` находится внутри `ArrowFunction`, нам пока не нужно смотреть, является ли он допустимым списком параметров стрелочной функции — это можно сделать позже. (Парсеры в реальном мире могут предпочесть проверку допустимости сразу, но с точки зрения спецификации это не обязательно.)

### Ограничение CPEAAPL

Как мы видели ранее, грамматические производства для `CPEAAPL` очень разрешительные и позволяют конструкции (такие как `(1, ...a)`), которые никогда не являются допустимыми. После того как мы разобрали программу согласно грамматике, необходимо запретить соответствующие недопустимые конструкции.

Спецификация делает это, добавляя следующие ограничения:

:::ecmascript-algorithm
> [Статическая семантика: ранние ошибки](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> Это синтаксическая ошибка, если `CPEAAPL` не покрывает `ParenthesizedExpression`.

:::ecmascript-algorithm
> [Дополнительный синтаксис](https://tc39.es/ecma262/#sec-primary-expression)
>
> При обработке экземпляра производства
>
> `PrimaryExpression : CPEAAPL`
>
> интерпретация `CPEAAPL` уточняется с использованием следующей грамматики:
>
> `ParenthesizedExpression : ( Expression )`

Это означает: если `CPEAAPL` появляется на месте `PrimaryExpression` в синтаксическом дереве, это фактически `ParenthesizedExpression`, и это его единственное допустимое производство.

`Expression` никогда не может быть пустым, так что `( )` не является допустимым `ParenthesizedExpression`. Списки, разделённые запятыми, такие как `(1, 2, 3)`, создаются при помощи [оператора запятая](https://tc39.es/ecma262/#sec-comma-operator):

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

Точно так же, если `CPEAAPL` появляется на месте `ArrowParameters`, применяются следующие ограничения:

:::ecmascript-algorithm
> [Статическая семантика: ранние ошибки](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> Это синтаксическая ошибка, если `CPEAAPL` не покрывает `ArrowFormalParameters`.

:::ecmascript-algorithm
> [Дополнительный синтаксис](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> Когда производство
>
> `ArrowParameters : CPEAAPL`
>
> распознаётся, используется следующая грамматика для уточнения интерпретации `CPEAAPL`:
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### Другие покрытия грамматики

Помимо `CPEAAPL`, спецификация использует покрытие грамматики для других конструкций, выглядящих неоднозначно.

`ObjectLiteral` используется как покрытие грамматики для `ObjectAssignmentPattern`, который появляется внутри списков параметров стрелочной функции. Это означает, что `ObjectLiteral` допускает конструкции, которые не могут появляться внутри фактических объектных литералов.

```grammar
ObjectLiteral :
  ...
  { PropertyDefinitionList }

PropertyDefinition :
  ...
  CoverInitializedName

CoverInitializedName :
  IdentifierReference Initializer

Initializer :
  = AssignmentExpression
```

Например:

```js
let o = { a = 1 }; // синтаксическая ошибка

// Стрелочная функция с параметром-деструктуризацией с значением по умолчанию:
// значение:
let f = ({ a = 1 }) => { return a; };
f({}); // возвращает 1
f({a : 6}); // возвращает 6
```

Асинхронные стрелочные функции также выглядят неоднозначно с конечным заглядыванием вперед:

```js
let x = async(a,
```

Это вызов функции под названием `async` или асинхронная стрелочная функция?

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

Для этой цели грамматика определяет символ покрытия грамматики `CoverCallExpressionAndAsyncArrowHead`, который работает аналогично `CPEAAPL`.

## Сводка

В этом эпизоде мы рассмотрели, как спецификация определяет покрывающие грамматики и использует их в случаях, когда мы не можем идентифицировать текущую синтаксическую конструкцию на основе конечного прогноза.

В частности, мы рассмотрели различие между списками параметров стрелочной функции и выражениями в скобках, а также то, как спецификация использует покрывающую грамматику для первоначального разрешающего анализа неоднозначно выглядящих конструкций и последующего ограничения их с помощью статических семантических правил.
