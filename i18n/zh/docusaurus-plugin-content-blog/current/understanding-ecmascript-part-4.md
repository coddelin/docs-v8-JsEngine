---
title: "理解ECMAScript规范，第4部分"
author: "[Marja Hölttä](https://twitter.com/marjakh)，探索性规范观察者"
avatars: 
  - marja-holtta
date: 2020-05-19
tags: 
  - ECMAScript
  - 理解ECMAScript
description: "关于如何阅读ECMAScript规范的教程"
tweet: "1262815621756014594"
---

[所有章节](/blog/tags/understanding-ecmascript)

## 同时在Web的其他部分

[Jason Orendorff](https://github.com/jorendorff) 来自Mozilla发布了[对JS语法怪癖的深度分析](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme)。尽管实现细节不同，每个JS引擎都面临着这些怪癖带来的相同问题。

<!--truncate-->
## 封面语法

在本集里，我们将深入研究*封面语法*。它是指定看起来模棱两可的语法结构的一种方式。

我们依然会省略 `[In, Yield, Await]` 的下标以简洁，因为它们对于本文不重要。参见[第3部分](/blog/understanding-ecmascript-part-3)了解它们的意义和用法。

## 有限前瞻

通常情况下，解析器会根据有限前瞻（固定数量的后续符号）决定使用哪个生成式。

在某些情况下，下一个符号可以明确决定要使用哪个生成式。[例如](https://tc39.es/ecma262/#prod-UpdateExpression)：

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

如果我们正在解析 `UpdateExpression` 且下一个符号是 `++` 或 `--`，我们可以立刻决定使用哪个生成式。如果下一个符号不是这些也还好：我们可以从当前位置开始解析一个 `LeftHandSideExpression`，然后在解析完后再确定下一步。

如果跟在 `LeftHandSideExpression` 后的符号是 `++`，使用的生成式是 `UpdateExpression : LeftHandSideExpression ++`。`--` 的情况类似。如果跟在 `LeftHandSideExpression` 后的符号既不是 `++` 也不是 `--`，我们使用生成式 `UpdateExpression : LeftHandSideExpression`。

### 箭头函数参数列表还是带括号的表达式？

区分箭头函数参数列表和带括号的表达式更为复杂。

例如：

```js
let x = (a,
```

这是箭头函数的开始吗，像这样？

```js
let x = (a, b) => { return a + b };
```

还是可能是带括号的表达式，像这样？

```js
let x = (a, 3);
```

带括号的内容可以任意长——我们无法基于有限数量的符号确定它是什么。

让我们暂时假设有以下直接的生成式：

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

现在我们无法用有限前瞻选择要使用的生成式。如果我们需要解析一个 `AssignmentExpression` 且下一个符号是 `(`，我们将如何决定接下来解析什么？我们可以解析 `ArrowParameterList` 或 `ParenthesizedExpression`，但我们的选择可能出错。

### 一个非常宽容的新符号：`CPEAAPL`

规范通过引入符号 `CoverParenthesizedExpressionAndArrowParameterList`（简称 `CPEAAPL`）解决了这个问题。`CPEAAPL` 是一个实际上是 `ParenthesizedExpression` 或 `ArrowParameterList` 的符号，但我们尚不知道它是哪一个。

[生成式](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList)中允许所有可能出现在 `ParenthesizedExpression` 和 `ArrowParameterList` 中的构造，非常宽容：

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

例如，以下表达式都是有效的 `CPEAAPL`：

```js
// 有效的 ParenthesizedExpression 和 ArrowParameterList：
(a, b)
(a, b = 1)

// 有效的 ParenthesizedExpression：
(1, 2, 3)
(function foo() { })

// 有效的 ArrowParameterList：
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// 无效的，但仍然是 CPEAAPL：
(1, ...b)
(1, )
```

尾随逗号和 `...` 只能出现在 `ArrowParameterList` 中。一些构造，比如 `b = 1` 可以同时出现在两者中，但它们有不同的意义：在 `ParenthesizedExpression` 中这是一项赋值；在 `ArrowParameterList` 中这是一带默认值的参数。数字和其他`PrimaryExpressions`（不是有效的参数名或参数解构模式）只能出现在 `ParenthesizedExpression` 中。但它们都可以出现在 `CPEAAPL` 中。

### 在生成式中使用 `CPEAAPL`

现在我们可以在 [`AssignmentExpression` 生产式](https://tc39.es/ecma262/#prod-AssignmentExpression) 中使用非常宽松的 `CPEAAPL`。（注意：`ConditionalExpression` 通过一个长的生产链条（此处未显示）通向 `PrimaryExpression`。）

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

假设我们再次处于需要解析一个 `AssignmentExpression` 且下一个标记是 `(` 的情景。现在我们可以解析一个 `CPEAAPL`，并稍后判定该使用哪个生产式。无论我们是在解析一个 `ArrowFunction` 还是一个 `ConditionalExpression`，接下来需要解析的符号都是 `CPEAAPL`！

在我们解析了 `CPEAAPL` 后，我们可以决定对于最初的 `AssignmentExpression`（包含 `CPEAAPL` 的那个）使用哪个生产式。这一决定基于 `CPEAAPL` 后的标记来做。

如果标记是 `=>`，我们使用以下生产式：

```grammar
AssignmentExpression :
  ArrowFunction
```

如果标记是其他内容，我们使用以下生产式：

```grammar
AssignmentExpression :
  ConditionalExpression
```

例如：

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             CPEAAPL之后的标记

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            CPEAAPL之后的标记
```

此时，我们可以保持 `CPEAAPL` 原样并继续解析程序的其余部分。例如，如果 `CPEAAPL` 在一个 `ArrowFunction` 内，我们尚不需要查看它是否是有效的箭头函数参数列表——这可以稍后处理。（现实中解析器可能会选择立即完成有效性检查，但从规范的角度来看，我们并不必须这样做。）

### 限制CPEAAPL

如我们之前所见，`CPEAAPL` 的语法生产式非常宽松，允许一些永远不合法的构造（例如 `(1, ...a)`）。在根据语法完成程序解析后，我们需要禁止对应的非法构造。

规范通过添加以下限制来实现这一点：

:::ecmascript-algorithm
> [静态语义：早期错误](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> 如果 `CPEAAPL` 没有覆盖一个 `ParenthesizedExpression`（括号表达式），则是语法错误。

:::ecmascript-algorithm
> [补充语法](https://tc39.es/ecma262/#sec-primary-expression)
>
> 处理以下生产式实例时
>
> `PrimaryExpression : CPEAAPL`
>
> 使用以下语法对 `CPEAAPL` 的解释进行细化：
>
> `ParenthesizedExpression : ( Expression )`

这意味着：如果 `CPEAAPL` 在语法树中作为 `PrimaryExpression` 出现，实际上它是一个 `ParenthesizedExpression`，并且这是它唯一有效的生产式。

`Expression` 永远不能是空的，因此 `( )` 不是有效的 `ParenthesizedExpression`。由逗号分隔列表（如 `（1, 2, 3）`）是由[逗号操作符](https://tc39.es/ecma262/#sec-comma-operator)创建的：

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

同样，如果 `CPEAAPL` 在语法树中作为 `ArrowParameters` 出现，会应用以下限制：

:::ecmascript-algorithm
> [静态语义：早期错误](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> 如果 `CPEAAPL` 没有覆盖一个 `ArrowFormalParameters`，则是语法错误。

:::ecmascript-algorithm
> [补充语法](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> 识别以下生产式时
>
> `ArrowParameters` : `CPEAAPL`
>
> 使用以下语法对 `CPEAAPL` 的解释进行细化：
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### 其他覆盖语法

除了 `CPEAAPL`，规范还为其他看起来模棱两可的构造使用覆盖语法。

`ObjectLiteral` 用作箭头函数参数列表内的 `ObjectAssignmentPattern` 的覆盖语法。这意味着 `ObjectLiteral` 允许构造无法出现在实际对象字面量中的内容。

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

例如：

```js
let o = { a = 1 }; // 语法错误

// 使用解构参数和默认值的箭头函数：
//
let f = ({ a = 1 }) => { return a; };
f({}); // 返回 1
f({a : 6}); // 返回 6
```

异步箭头函数也在有限前瞻中显得模棱两可：

```js
let x = async(a,
```

这是对一个名为 `async` 的函数的调用还是一个异步箭头函数？

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

为此，语法定义了一个覆盖语法符号 `CoverCallExpressionAndAsyncArrowHead`，其工作方式类似于 `CPEAAPL`。

## 总结

在本集节目中，我们研究了规范如何定义覆盖语法，并在无法根据有限的前瞻确定当前语法结构的情况下使用覆盖语法。

特别地，我们研究了如何区分箭头函数参数列表和括号表达式，以及规范如何使用覆盖语法来首次宽松地解析一些看似模糊的结构，并随后通过静态语义规则对其进行限制。
