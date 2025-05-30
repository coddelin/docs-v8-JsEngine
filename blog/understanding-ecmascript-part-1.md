---
title: "理解 ECMAScript 规范，第一部分"
author: "[Marja Hölttä](https://twitter.com/marjakh)，规范观察者"
avatars: 
  - marja-holtta
date: "2020-02-03 13:33:37"
tags: 
  - ECMAScript
  - 理解 ECMAScript
description: "关于阅读 ECMAScript 规范的教程"
tweet: "1224363301146189824"
---

[所有章节](/blog/tags/understanding-ecmascript)

在本文中，我们将从规范中的一个简单函数入手，尝试理解它的符号。开始吧!

## 前言

即使你了解 JavaScript，阅读它的语言规范，[ECMAScript 语言规范，简称 ECMAScript 规范](https://tc39.es/ecma262/)，也可能会让人望而生畏。至少这是我第一次开始阅读时的感受。

<!--truncate-->
让我们从一个具体例子开始，逐步阅读规范以理解它。以下代码展示了 `Object.prototype.hasOwnProperty` 的使用：

```js
const o = { foo: 1 };
o.hasOwnProperty('foo'); // true
o.hasOwnProperty('bar'); // false
```

在例子中，`o` 没有名为 `hasOwnProperty` 的属性，因此我们沿着原型链向上寻找。我们在 `o` 的原型 `Object.prototype` 中找到了它。

为了描述 `Object.prototype.hasOwnProperty` 的工作方式，规范使用类似伪代码的描述：

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> 当使用参数 `V` 调用 `hasOwnProperty` 方法时，会执行以下步骤：
>
> 1. 令 `P` 为 `? ToPropertyKey(V)`。
> 2. 令 `O` 为 `? ToObject(this value)`。
> 3. 返回 `? HasOwnProperty(O, P)`。
:::

…以及…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> 抽象操作 `HasOwnProperty` 用于确定一个对象是否具有指定属性键的自有属性。返回一个布尔值。该操作以参数 `O` 和 `P` 调用，其中 `O` 是对象，`P` 是属性键。此抽象操作执行以下步骤：
>
> 1. 断言：`Type(O)` 是 `Object`。
> 2. 断言：`IsPropertyKey(P)` 是 `true`。
> 3. 令 `desc` 为 `? O.[[GetOwnProperty]](P)`。
> 4. 如果 `desc` 为 `undefined`，返回 `false`。
> 5. 返回 `true`。
:::

但什么是“抽象操作”？`[[ ]]` 内的东西是什么？为什么函数前面有一个 `?`？这些断言又是什么意思？

让我们来一探究竟！

## 语言类型与规范类型

让我们从一些看起来熟悉的东西开始。规范使用诸如 `undefined`、`true` 和 `false` 的值，这些值我们已经从 JavaScript 中知道了。它们都是 [**语言值**](https://tc39.es/ecma262/#sec-ecmascript-language-types)，**语言类型** 的值，规范也对其进行了定义。

规范也在内部使用语言值，例如，一个内部数据类型可能包含一个字段，其可能值为 `true` 和 `false`。相比之下，JavaScript 引擎通常不会在内部使用语言值。例如，如果 JavaScript 引擎是用 C++ 编写的，它通常使用 C++ 的 `true` 和 `false`（而不是 JavaScript 的内部表示 `true` 和 `false`）。

除了语言类型之外，规范还使用 [**规范类型**](https://tc39.es/ecma262/#sec-ecmascript-specification-types)，它们是仅存在于规范中的类型，而不是 JavaScript 语言中的类型。JavaScript 引擎不需要（但可以选择）实现它们。在这篇博客文章中，我们将认识到规范类型 Record（及其子类型 Completion Record）。

## 抽象操作

[**抽象操作**](https://tc39.es/ecma262/#sec-abstract-operations) 是 ECMAScript 规范中定义的函数；它们为简洁地编写规范而定义。JavaScript 引擎不必在引擎内部将它们实现为单独的函数。它们不能直接从 JavaScript 调用。

## 内部槽与内部方法

[**内部槽** 和 **内部方法**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots) 使用 `[[ ]]` 内的名称。

内部槽是 JavaScript 对象或规范类型的数据成员。它们用于存储对象的状态。内部方法是 JavaScript 对象的成员函数。

例如，每个 JavaScript 对象都有一个内部槽 `[[Prototype]]` 和一个内部方法 `[[GetOwnProperty]]`。

内部槽和方法不能从 JavaScript 访问。例如，您无法访问 `o.[[Prototype]]` 或调用 `o.[[GetOwnProperty]]()`。JavaScript 引擎可以为其自身的内部使用实现它们，但不一定必须实现。

有时，内部方法会委托给同名的抽象操作，例如普通对象的 `[[GetOwnProperty]]:`

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> 当调用 `O` 的 `[[GetOwnProperty]]` 内部方法并传入属性键 `P` 时，会执行以下步骤：
>
> 1. 返回 `! OrdinaryGetOwnProperty(O, P)`。
:::

（我们将在下一章中了解感叹号的含义。）

`OrdinaryGetOwnProperty` 不是一个内部方法，因为它不与任何对象相关联；相反，它操作的对象作为参数传递。

`OrdinaryGetOwnProperty` 被称为“普通的”，因为它操作的是普通对象。ECMAScript 对象可以是**普通的**或**特殊的**。普通对象必须为一组方法（称为**基本内部方法**）具有默认行为。如果对象偏离默认行为，它就是特殊对象。

最著名的特殊对象是 `Array`，因为它的 length 属性以非默认的方式工作：设置 `length` 属性可能会移除数组中的元素。

基本内部方法是 [这里](https://tc39.es/ecma262/#table-5) 列出的方法。

## 完成记录

问号和感叹号是怎么回事？要了解它们，我们需要研究 [**完成记录**](https://tc39.es/ecma262/#sec-completion-record-specification-type)！

完成记录是一种规范类型（仅为规范目的定义）。JavaScript 引擎不需要具有相应的内部数据类型。

完成记录是一种“记录”——具有固定命名字段集的数据类型。完成记录有三个字段：

:::table-wrapper
| 名称         | 描述                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `[[Type]]`   | 可能的值包括：`normal`、`break`、`continue`、`return` 或 `throw`。除了 `normal` 以外的所有类型都是**突然完成**。              |
| `[[Value]]`  | 完成时产生的值，例如函数的返回值或异常（如果抛出了异常）。                                                                       |
| `[[Target]]` | 用于定向控制转移（与本文无关）。                                                                                                  |
:::

每个抽象操作隐式返回一个完成记录。即使看起来一个抽象操作会返回一个简单类型（如布尔值），它也会隐式包装成类型为 `normal` 的完成记录（参见 [隐式完成值](https://tc39.es/ecma262/#sec-implicit-completion-values)）。

注解 1：在这方面，规范并不完全一致；有一些辅助函数返回裸值，其返回值会直接使用，而不从完成记录中提取值。这通常可以从上下文中明确看出。

注解 2：规范编辑者正在考虑使完成记录的处理更加明确。

如果算法抛出异常，这意味着返回一个 `[[Type]]` 为 `throw` 的完成记录，其 `[[Value]]` 为异常对象。我们现在先忽略 `break`、`continue` 和 `return` 类型。

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt) 的含义是：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 如果 `argument` 是突然完成，则返回 `argument`。
> 2. 将 `argument` 设置为 `argument.[[Value]]`。
<!-- markdownlint-enable blanks-around-lists -->
:::

也就是说，我们检查一个完成记录；如果是突然完成，则立即返回。否则，我们从完成记录中提取值。

`ReturnIfAbrupt` 看起来像是一个函数调用，但它并不是。它会导致包含 `ReturnIfAbrupt()` 的函数返回，而不是 `ReturnIfAbrupt` 本身返回。它的行为更像是类 C 语言中的宏。

`ReturnIfAbrupt` 可以这样使用：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 令 `obj` 为 `Foo()` 的结果。（`obj` 是一个完成记录。）
> 2. `ReturnIfAbrupt(obj)`。
> 3. `Bar(obj)`。（如果仍在这里，`obj` 就是从完成记录中提取的值。）
<!-- markdownlint-enable blanks-around-lists -->
:::

现在来看 [问号](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands)：`? Foo()` 等价于 `ReturnIfAbrupt(Foo())`。使用简写很实用：我们不需要每次都显式编写错误处理代码。

类似地，`Let val be ! Foo()` 等价于：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 令 `val` 为 `Foo()`。
> 2. 断言：`val` 不是突然完成。
> 3. 将 `val` 设置为 `val.[[Value]]`。
<!-- markdownlint-enable blanks-around-lists -->
:::

运用这些知识，我们可以像这样重写 `Object.prototype.hasOwnProperty`：

:::ecmascript-algorithm
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. 令 `P` 为 `ToPropertyKey(V)`。
> 2. 如果 `P` 是一个突然完成，返回 `P`。
> 3. 设置 `P` 为 `P.[[Value]]`。
> 4. 令 `O` 为 `ToObject(此值)`。
> 5. 如果 `O` 是一个突然完成，返回 `O`。
> 6. 设置 `O` 为 `O.[[Value]]`。
> 7. 令 `temp` 为 `HasOwnProperty(O, P)`。
> 8. 如果 `temp` 是一个突然完成，返回 `temp`。
> 9. 设置 `temp` 为 `temp.[[Value]]`。
> 10. 返回 `NormalCompletion(temp)`。
:::

…我们可以将 `HasOwnProperty` 重写如下：

:::ecmascript-algorithm
> **`HasOwnProperty(O, P)`**
>
> 1. 断言：`Type(O)` 是 `Object`。
> 2. 断言：`IsPropertyKey(P)` 是 `true`。
> 3. 令 `desc` 为 `O.[[GetOwnProperty]](P)`。
> 4. 如果 `desc` 是一个突然完成，返回 `desc`。
> 5. 设置 `desc` 为 `desc.[[Value]]`。
> 6. 如果 `desc` 是 `undefined`，返回 `NormalCompletion(false)`。
> 7. 返回 `NormalCompletion(true)`。
:::

我们也可以重写 `[[GetOwnProperty]]` 内部方法，并且去掉感叹号：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. 令 `temp` 为 `OrdinaryGetOwnProperty(O, P)`。
> 2. 断言：`temp` 不为一个突然完成。
> 3. 设置 `temp` 为 `temp.[[Value]]`。
> 4. 返回 `NormalCompletion(temp)`。
<!-- markdownlint-enable blanks-around-lists -->
:::

在这里我们假设 `temp` 是一个全新的临时变量，不会与其他任何变量冲突。

我们还利用了一个知识，即当一个返回语句返回的不是一个完成记录时，它会被隐式包裹在 `NormalCompletion` 里面。

### 旁支：`Return ? Foo()`

规范使用了符号 `Return ? Foo()` — 为什么有问号？

`Return ? Foo()` 展开为：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 令 `temp` 为 `Foo()`。
> 2. 如果 `temp` 是一个突然完成，返回 `temp`。
> 3. 设置 `temp` 为 `temp.[[Value]]`。
> 4. 返回 `NormalCompletion(temp)`。
<!-- markdownlint-enable blanks-around-lists -->
:::

它其实与 `Return Foo()` 相同；对于突然完成和正常完成表现一致。

`Return ? Foo()` 只是出于编辑上的理由被使用，使其更加显式地表明 `Foo` 返回一个完成记录。

## 断言

规范中的断言断定算法的不变量条件。它们是为了明确而添加的，但不会给实现增加任何要求—实现不需要检查它们。

## 继续前进

抽象操作委托到其他抽象操作（见下图），但基于本文，我们应该能够弄清楚它们的作用。我们将遇到属性描述符，这只是另一种规范类型。

![函数调用图，自 `Object.prototype.hasOwnProperty` 开始](/_img/understanding-ecmascript-part-1/call-graph.svg)

## 总结

我们浏览了一个简单的方法—`Object.prototype.hasOwnProperty`—以及它调用的**抽象操作**。我们熟悉了与错误处理相关的简写 `?` 和 `!`。我们遇到了**语言类型**、**规范类型**、**内部槽**和**内部方法**。

## 有用的链接

[如何阅读 ECMAScript 规范](https://timothygu.me/es-howto/)：一个涵盖了本文大部分内容的教程，从一个稍微不同的角度出发。
