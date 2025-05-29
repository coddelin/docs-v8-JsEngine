---
title: "理解 ECMAScript 规范，第2部分"
author: "[Marja Hölttä](https://twitter.com/marjakh)，推测性规范观察者"
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
  - 理解ECMAScript
description: "阅读ECMAScript规范的教程，第2部分"
tweet: "1234550773629014016"
---

让我们继续练习我们出色的规范阅读技巧。如果你还没有查看前一集，现在是个好机会！

[所有章节](/blog/tags/understanding-ecmascript)

## 准备好进入第2部分了吗？

一个有趣的了解规范的方式是，从一个我们知道有的JavaScript功能开始，找出它是如何被规范定义的。

> 警告！本集包含从[ECMAScript规范](https://tc39.es/ecma262/)（截至2020年2月）中复制粘贴的算法。它们最终会过时。

我们知道属性是在原型链中查找的：如果一个对象没有我们尝试读取的属性，我们就沿着原型链向上查找，直到找到它（或者找到一个没有原型的对象）。

例如：

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## 原型链查找在哪里定义？

让我们来找出这种行为是在哪里定义的。一个好的起点是查看[对象内部方法](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots)的列表。

既有`[[GetOwnProperty]]`，也有`[[Get]]`——我们感兴趣的是不限于自身属性的版本，所以我们选择`[[Get]]`。

不幸的是，[属性描述符规格类型](https://tc39.es/ecma262/#sec-property-descriptor-specification-type)也有一个名为`[[Get]]`的字段，因此在查看规范时，我们需要仔细区分这两种独立的用法。

<!--truncate-->
`[[Get]]`是一个**基本内部方法**。**普通对象**实现了基本内部方法的默认行为。**异质对象**可以定义它们自己的`[[Get]]`内部方法，偏离默认行为。在本文中，我们专注于普通对象。

`[[Get]]`的默认实现委托给`OrdinaryGet`：

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> 当`O`的`[[Get]]`内部方法以属性键`P`和ECMAScript语言值`Receiver`被调用时，执行以下步骤：
>
> 1. 返回`? OrdinaryGet(O, P, Receiver)`。

我们很快会看到`Receiver`是调用访问器属性的getter函数时用作**this值**的值。

`OrdinaryGet`定义如下：

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> 当抽象操作`OrdinaryGet`以对象`O`、属性键`P`和ECMAScript语言值`Receiver`被调用时，执行以下步骤：
>
> 1. 断言：`IsPropertyKey(P)`为`true`。
> 1. 令`desc`为`? O.[[GetOwnProperty]](P)`。
> 1. 如果`desc`为`undefined`，则
>     1. 令`parent`为`? O.[[GetPrototypeOf]]()`。
>     1. 如果`parent`为`null`，返回`undefined`。
>     1. 返回`? parent.[[Get]](P, Receiver)`。
> 1. 如果`IsDataDescriptor(desc)`为`true`，返回`desc.[[Value]]`。
> 1. 断言：`IsAccessorDescriptor(desc)`为`true`。
> 1. 令`getter`为`desc.[[Get]]`。
> 1. 如果`getter`为`undefined`，返回`undefined`。
> 1. 返回`? Call(getter, Receiver)`。

原型链查找在步骤3中：如果我们没有找到作为自身属性的属性，我们调用原型的`[[Get]]`方法，该方法再次委托给`OrdinaryGet`。如果仍没有找到该属性，我们继续调用其原型的`[[Get]]`方法，其将再次委托给`OrdinaryGet`，以此类推，直到我们找到属性或到达没有原型的对象。

让我们看看当我们访问`o2.foo`时，这个算法是如何工作的。首先，我们调用`OrdinaryGet`，其中`O`为`o2`，`P`为`"foo"`。由于`o2`没有名为`"foo"`的自身属性，因此`O.[[GetOwnProperty]]("foo")`返回`undefined`，我们进入步骤3的分支。在步骤3.a中，我们将`parent`设置为`o2`的原型，即`o1`。`parent`不是`null`，因此我们未在步骤3.b退出。在步骤3.c中，我们调用父对象的`[[Get]]`方法，属性键为`"foo"`，并返回其结果。

父对象（`o1`）是一个普通对象，因此其`[[Get]]`方法再次调用`OrdinaryGet`，这次`O`为`o1`，`P`为`"foo"`。`o1`有一个名为`"foo"`的自身属性，因此在步骤2中，`O.[[GetOwnProperty]]("foo")`返回关联的属性描述符，并将其存储在`desc`中。

[属性描述符](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) 是一种规范类型。数据属性描述符直接将属性的值存储在 `[[Value]]` 字段中。访问器属性描述符将访问器函数存储在 `[[Get]]` 和/或 `[[Set]]` 字段中。在本例中，与 `"foo"` 关联的属性描述符是一个数据属性描述符。

我们在步骤 2 中存储在 `desc` 中的数据属性描述符不是 `undefined`，因此我们不会在步骤 3 中走 `if` 分支。接下来我们执行步骤 4。属性描述符是一个数据属性描述符，因此我们在步骤 4 中返回其 `[[Value]]` 字段，值为 `99`，到此结束。

## 什么是 `Receiver`，它是从哪里来的？

`Receiver` 参数仅在步骤 8 中用于访问器属性的情况。当调用访问器属性的 getter 函数时，它作为 **this 值** 被传递。

`OrdinaryGet` 在整个递归过程中传递原始的 `Receiver`，不做修改（步骤 3.c）。让我们找出 `Receiver` 起初是从哪里来的！

通过搜索 `[[Get]]` 的调用位置，我们发现一个处理引用的抽象操作 `GetValue`。引用是一种规范类型，由基本值、引用的名称和严格引用标志组成。对于 `o2.foo`，基本值是对象 `o2`，引用的名称是字符串 `"foo"`，由于示例代码是松散模式，严格引用标志为 `false`。

### 旁注：为什么引用不是记录？

旁注：引用不是记录，即使看起来可以是。它包含三个组成部分，这些组成部分也可以通过三个命名字段表示。引用不是记录，仅仅是由于历史原因。

### 回到 `GetValue`

让我们看看 `GetValue` 的定义：

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`。
> 1. 如果 `Type(V)` 不是 `Reference`，返回 `V`。
> 1. 令 `base` 为 `GetBase(V)`。
> 1. 如果 `IsUnresolvableReference(V)` 为 `true`，抛出 `ReferenceError` 异常。
> 1. 如果 `IsPropertyReference(V)` 为 `true`，那么
>     1. 如果 `HasPrimitiveBase(V)` 为 `true`，那么
>         1. 断言：在此情况下，`base` 永远不会是 `undefined` 或 `null`。
>         1. 将 `base` 设置为 `! ToObject(base)`。
>     1. 返回 `? base.[[Get]](GetReferencedName(V), GetThisValue(V))`。
> 1. 否则，
>     1. 断言：`base` 是一个环境记录。
>     1. 返回 `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))`。

在我们的示例中，引用是 `o2.foo`，它是一个属性引用。所以我们选择分支 5。我们不会选择分支 5.a，因为基本值（`o2`）不是[一个原始值](/blog/react-cliff#javascript-types)（如数字、字符串、符号、BigInt、布尔值、未定义或空）。

然后我们在步骤 5.b 中调用 `[[Get]]`。我们传递的 `Receiver` 是 `GetThisValue(V)`。在本例中，它只是引用的基本值：

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. 断言：`IsPropertyReference(V)` 为 `true`。
> 1. 如果 `IsSuperReference(V)` 为 `true`，那么
>     1. 返回引用 `V` 的 `thisValue` 组成部分的值。
> 1. 返回 `GetBase(V)`。

对于 `o2.foo`，我们不会选择步骤 2 的分支，因为它不是一个超级引用（如 `super.foo`），但我们选择步骤 3 并返回引用的基本值，即 `o2`。

将所有内容拼凑在一起，我们发现我们将 `Receiver` 设置为原始引用的基本值，然后在原型链遍历过程中保持不变。最终，如果我们找到的属性是一个访问器属性，我们在调用它时将 `Receiver` 用作 **this 值**。

特别地，getter 内的 **this 值** 指的是我们尝试从中获取属性的原始对象，而不是在原型链遍历中找到该属性的对象。

让我们试试吧！

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

在这个示例中，我们有一个名为 `foo` 的访问器属性，并为其定义了一个 getter。getter 返回 `this.x`。

然后我们访问 `o2.foo` —— getter 返回什么？

我们发现，当调用 getter 时，**this 值** 是我们最初尝试从中获取属性的对象，而不是找到该属性的对象。在本例中，**this 值** 是 `o2` 而不是 `o1`。我们可以通过检查 getter 返回的是 `o2.x` 还是 `o1.x` 来验证，确实，它返回的是 `o2.x`。

有效！我们能够根据规格中的内容预测此代码片段的行为。

## 访问属性 —— 为什么它会调用 `[[Get]]`？

规范在哪里规定当访问类似 `o2.foo` 的属性时会调用对象的内部方法 `[[Get]]`？肯定是在某处定义的。不要只是听我的话！

我们发现对象的内部方法 `[[Get]]` 是从抽象操作 `GetValue` 中调用的，而 `GetValue` 是用于处理引用的。但 `GetValue` 是从哪里调用的？

### `MemberExpression` 的运行时语义

规范的语法规则定义了语言的语法。[运行时语义](https://tc39.es/ecma262/#sec-runtime-semantics)定义了语法构造的“意义”（如何在运行时评估它们）。

如果您不熟悉[上下文无关文法](https://en.wikipedia.org/wiki/Context-free_grammar)，现在不妨查看一下！

我们将在以后的一集深入研究语法规则，现在先保持简单！特别是，对于本集，我们可以忽略生成式中的下标（例如 `Yield`、`Await` 等）。

以下的生成式描述了什么是[`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression)：

```grammar
MemberExpression :
  PrimaryExpression
  MemberExpression [ Expression ]
  MemberExpression . IdentifierName
  MemberExpression TemplateLiteral
  SuperProperty
  MetaProperty
  new MemberExpression Arguments
```

这里我们有7种`MemberExpression`的生成式。`MemberExpression`可以只是一个`PrimaryExpression`。或者，`MemberExpression`可以由另一个`MemberExpression`和`Expression`拼接而成，例如：`MemberExpression [ Expression ]`，例如 `o2['foo']`。或者它可以是 `MemberExpression . IdentifierName`，例如 `o2.foo`——这就是与我们示例相关的生成式。

生产式`MemberExpression : MemberExpression . IdentifierName`的运行时语义定义了评估它时需要采取的一系列步骤：

:::ecmascript-algorithm
> **[`MemberExpression : MemberExpression . IdentifierName` 的运行时语义：评估](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)**
>
> 1. 让`baseReference`成为对`MemberExpression`评估的结果。
> 1. 让`baseValue`成为`? GetValue(baseReference)`。
> 1. 如果匹配此`MemberExpression`的代码是严格模式代码，则将`strict`设为`true`；否则将`strict`设为`false`。
> 1. 返回 `? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)`。

该算法委托给抽象操作`EvaluatePropertyAccessWithIdentifierKey`，因此我们也需要阅读它：

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey(baseValue, identifierName, strict)`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> 抽象操作`EvaluatePropertyAccessWithIdentifierKey`接受值`baseValue`、解析节点`identifierName`和布尔参数`strict`作为参数。它执行以下步骤：
>
> 1. 断言：`identifierName`是一个`IdentifierName`。
> 1. 让`bv`成为`? RequireObjectCoercible(baseValue)`。
> 1. 让`propertyNameString`成为`identifierName`的`StringValue`。
> 1. 返回一个类型为`Reference`的值，其基础值组件为`bv`，引用的名称组件为`propertyNameString`，其严格引用标志为`strict`。

也就是说：`EvaluatePropertyAccessWithIdentifierKey`构造了一个引用（Reference），使用提供的`baseValue`作为基础，`identifierName`的字符串值作为属性名称，并使用`strict`作为严格模式标志。

最终，这个引用会被传递给`GetValue`。根据引用的使用方式，在规范的多个地方定义了`GetValue`。

### `MemberExpression` 作为一个参数

在我们的示例中，我们使用属性访问作为一个参数：

```js
console.log(o2.foo);
```

在这种情况下，行为由`ArgumentList`生产式的运行时语义定义，该生产式会对参数调用`GetValue`：

:::ecmascript-algorithm
> **[运行时语义：`ArgumentListEvaluation`](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)**
>
> `ArgumentList : AssignmentExpression`
>
> 1. 让`ref`成为对`AssignmentExpression`评估的结果。
> 1. 让`arg`成为`? GetValue(ref)`。
> 1. 返回一个列表，其唯一项是`arg`。

`o2.foo`看起来不像一个`AssignmentExpression`，但它确实是一个，因此此生产式是适用的。要了解原因，您可以查看这段[额外内容](/blog/extras/understanding-ecmascript-part-2-extra)，但此时您并不需要严格理解。

步骤1中的`AssignmentExpression`是`o2.foo`。`ref`即对`o2.foo`评估的结果，是上文提到的引用。在步骤2中，我们对它调用`GetValue`。因此，我们知道对象的内部方法`[[Get]]`将被调用，同时会进行原型链的查找。

## 总结

在本集，我们研究了规范如何定义一个语言功能（在此例中是原型查找），涵盖了所有层面：触发该功能的语法构造和定义该功能的算法。
