---
title: "理解ECMAScript规范，第三部分"
author: "[Marja Hölttä](https://twitter.com/marjakh)，推测性规范观察者"
avatars: 
  - marja-holtta
date: 2020-04-01
tags: 
  - ECMAScript
  - 理解ECMAScript
description: "阅读ECMAScript规范的教程"
tweet: "1245400717667577857"
---

[所有系列文章](/blog/tags/understanding-ecmascript)

在本篇中，我们将深入了解ECMAScript语言及其语法的定义。如果您对上下文无关语法不熟悉，现在是学习基础知识的好时机，因为规范使用上下文无关语法来定义语言。请参阅[《Crafting Interpreters》中的上下文无关语法章节](https://craftinginterpreters.com/representing-code.html#context-free-grammars)以获得更易理解的介绍，或者查看[维基百科页面](https://en.wikipedia.org/wiki/Context-free_grammar)以获取更数学化的定义。

<!--truncate-->
## ECMAScript语法

ECMAScript规范定义了四种语法：

[词法语法](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar)描述了如何将[Unicode代码点](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology)转换为**输入元素**序列（标记、换行符、注释、空白）。

[句法语法](https://tc39.es/ecma262/#sec-syntactic-grammar)定义了如何将语法正确的程序组成标记。

[RegExp语法](https://tc39.es/ecma262/#sec-patterns)描述了如何将Unicode代码点转换为正则表达式。

[数值字符串语法](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type)描述了如何将字符串转换为数值。

每种语法都定义为一种上下文无关语法，由一组规则组成。

这些语法稍有不同的符号表示：句法语法使用`LeftHandSideSymbol :`，而词法语法和RegExp语法使用`LeftHandSideSymbol ::`，数值字符串语法使用`LeftHandSideSymbol :::`。

接下来我们将更详细地研究词法语法和句法语法。

## 词法语法

规范将ECMAScript源文本定义为Unicode代码点的序列。例如，变量名不限于ASCII字符，还可以包含其他Unicode字符。规范并未提及实际的编码方式（如UTF-8或UTF-16）。它假设源代码已根据其编码转换为Unicode代码点的序列。

提前对ECMAScript源代码进行标记是不可能的，这使得定义词法语法稍微复杂一些。

例如，我们无法在不查看其出现的更大上下文的情况下确定`/`是除法运算符还是RegExp的开始：

```js
const x = 10 / 5;
```

此处的`/`是`DivPunctuator`。

```js
const r = /foo/;
```

此处，第一个`/`是`RegularExpressionLiteral`的开始。

模板引入了类似的模糊性——<code>}`</code>的解释取决于其出现的上下文：

```js
const what1 = 'temp';
const what2 = 'late';
const t = `I am a ${ what1 + what2 }`;
```

此处<code>`I am a ${</code>是`TemplateHead`，<code>}``</code>是`TemplateTail`。

```js
if (0 == 1) {
}`not very useful`;
```

此处`}`是`RightBracePunctuator`，<code>`</code>是`NoSubstitutionTemplate`的开始。

尽管`/`和<code>}`</code>的解释取决于它们的“上下文”——代码的语法结构中的位置——我们接下来要描述的语法仍然是上下文无关的。

词法语法使用几个目标符号来区分某些输入元素被允许或不被允许的上下文。例如，目标符号`InputElementDiv`用于表示`/`是分割运算符而`/=`是分割赋值的上下文。[`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv)规则列出了在这种上下文中可以生成的标记：

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

在这种上下文中遇到`/`会生成`DivPunctuator`输入元素。在此情况下生成`RegularExpressionLiteral`是不可能的。

另一方面，[`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp)是表示`/`是正则表达式开始的上下文目标符号：

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

正如我们从规则中看到的，这种上下文可能会生成`RegularExpressionLiteral`输入元素，但生成`DivPunctuator`是不可能的。

类似地，还有另一个目标符号 `InputElementRegExpOrTemplateTail`，用于 `TemplateMiddle` 和 `TemplateTail` 被允许的上下文中，并允许 `RegularExpressionLiteral`。最后，`InputElementTemplateTail` 是仅允许 `TemplateMiddle` 和 `TemplateTail` 而不允许 `RegularExpressionLiteral` 的上下文中的目标符号。

在实现中，句法语法分析器（即“解析器”）可以调用词法语法分析器（即“标记器”或“词法分析器”），传递目标符号作为参数并请求下一个适用于该目标符号的输入元素。

## 句法语法

我们已经查看了词法语法，它定义了如何从 Unicode 代码点构建标记。句法语法基于词法语法扩展，它定义了语法正确的程序如何由标记组成。

### 示例：允许旧式标识符

向语法引入一个新的关键字可能会导致代码不兼容——如果已有的代码已经将关键字用作标识符怎么办？

例如，在 `await` 成为关键字之前，有人可能写过如下代码：

```js
function old() {
  var await;
}
```

ECMAScript 语法谨慎地加入了 `await` 关键字，以使上述代码继续工作。在异步函数中，`await` 是关键字，因此此代码会报错：

```js
async function modern() {
  var await; // 语法错误
}
```

允许在非生成器中将 `yield` 作为标识符，而在生成器中禁用它的规则类似。

理解 `await` 如何被允许作为标识符需要了解 ECMAScript 特有的句法语法符号。让我们深入探讨吧！

### 生成规则和简写

让我们来看看 [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) 的生成规则是如何定义的。乍一看，语法可能看起来有点复杂：

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

下标 (`[Yield, Await]`) 和前缀（如 `+In` 中的 `+` 以及 `?Async` 中的 `?`）是什么意思？

这些符号在 [Grammar Notation](https://tc39.es/ecma262/#sec-grammar-notation) 部分中进行了说明。

下标是一种简写，用于一次性表达用于一组左侧符号的一组生成规则。左侧符号有两个参数，它展开为四个“真实的”左侧符号：`VariableStatement`、`VariableStatement_Yield`、`VariableStatement_Await` 和 `VariableStatement_Yield_Await`。

注意，此处的普通 `VariableStatement` 表示“没有 `_Await` 和 `_Yield` 的 `VariableStatement`”。这不应与 <code>VariableStatement<sub>[Yield, Await]</sub></code> 混淆。

在生成规则的右侧，我们看到简写 `+In`，意思是“使用带有 `_In` 的版本”；以及 `?Await`，意思是“仅当左侧符号包含 `_Await` 时使用带有 `_Await` 的版本”（`?Yield` 的情况类似）。

第三种简写 `~Foo`，意为“使用不带 `_Foo` 的版本”，在此生成规则中未使用。

通过这些信息，我们可以扩展这些生成规则，如下所示：

```grammar
VariableStatement :
  var VariableDeclarationList_In ;

VariableStatement_Yield :
  var VariableDeclarationList_In_Yield ;

VariableStatement_Await :
  var VariableDeclarationList_In_Await ;

VariableStatement_Yield_Await :
  var VariableDeclarationList_In_Yield_Await ;
```

最终，我们需要弄清以下两件事情：

1. 在哪里决定我们是否处于有 `_Await` 或没有 `_Await` 的情况？
2. 在哪里产生差异 —— `Something_Await` 和 `Something`（没有 `_Await`）的生成规则有何不同？

### 有 `_Await` 还是没有 `_Await`？

让我们先回答第一个问题。很容易猜到，非异步函数和异步函数在是否为函数体选择 `_Await` 参数上有所不同。阅读异步函数声明的生成规则，我们会发现 [这个](https://tc39.es/ecma262/#prod-AsyncFunctionBody)：

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

注意 `AsyncFunctionBody` 没有参数 — 它们被添加到右侧的 `FunctionBody` 中。

如果扩展此生成规则，我们会得到：

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

换句话说，异步函数拥有 `FunctionBody_Await`，即一个将 `await` 视为关键字的函数体。

另一方面，如果处于非异步函数中，[相关的生成规则](https://tc39.es/ecma262/#prod-FunctionDeclaration) 是：

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

（`FunctionDeclaration` 有另一个生成规则，但它与我们的代码示例无关。）

为了避免组合式展开，让我们忽略此特定生成规则中未使用的 `Default` 参数。

此生成规则的展开形式为：

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield_Await :
  function BindingIdentifier_Yield_Await ( FormalParameters ) { FunctionBody }
```

在这个生成式中，我们总是得到 `FunctionBody` 和 `FormalParameters`（没有 `_Yield` 和 `_Await`），因为它们在未扩展的生成式中被参数化为 `[~Yield, ~Await]`。

函数名被区别对待：如果左侧符号有参数 `_Await` 和 `_Yield`，它就会继承这些参数。

总结一下：异步函数有 `FunctionBody_Await`，而非异步函数有 `FunctionBody`（没有 `_Await`）。因为我们讨论的是非生成器函数，所以异步例子函数和非异步例子函数都没有 `_Yield` 作为参数。

可能记住哪个是 `FunctionBody`，哪个是 `FunctionBody_Await` 会有点困难。`FunctionBody_Await` 是用于 `await` 是标识符的函数，还是用于 `await` 是关键字的函数？

你可以将 `_Await` 参数理解为“`await` 是关键字”。这种方式也是面向未来的处理方法。想象一下，新增一个关键词 `blob`，但只有在“blobby”函数中有效。非“blobby”的非异步非生成器函数仍然会有 `FunctionBody`（没有 `_Await`，`_Yield` 或 `_Blob`），就像现在一样。Blobby 函数将具有 `FunctionBody_Blob`，异步 blobby 函数将具有 `FunctionBody_Await_Blob`，等等。我们仍然需要在生成式中添加 `Blob` 下标，但已存在函数的 `FunctionBody` 展开的形式保持不变。

### 禁止将 `await` 用作标识符

接下来，我们需要找到在 `FunctionBody_Await` 内部如何禁止将 `await` 用作标识符。

我们可以进一步跟踪生成式，发现 `_Await` 参数从 `FunctionBody` 原样传递到了之前我们看到的 `VariableStatement` 生成式。

因此，在异步函数内部，我们将有一个 `VariableStatement_Await`；而在非异步函数内部，我们将有一个 `VariableStatement`。

我们可以进一步跟踪生成式并记录参数。我们已经看到了 [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) 的生成式：

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

关于 [`VariableDeclarationList`](https://tc39.es/ecma262/#prod-VariableDeclarationList) 的所有生成式仅仅是原样传递参数：

```grammar
VariableDeclarationList[In, Yield, Await] :
  VariableDeclaration[?In, ?Yield, ?Await]
```

（这里我们仅展示与我们的例子相关的 [生成式](https://tc39.es/ecma262/#prod-VariableDeclaration)。）

```grammar
VariableDeclaration[In, Yield, Await] :
  BindingIdentifier[?Yield, ?Await] Initializer[?In, ?Yield, ?Await] opt
```

其中 `opt` 是可选的简写，表示右侧符号是可选的；实际上有两个生成式，一个有可选符号，一个没有。

对于我们的示例相关的简单情况，`VariableStatement` 由关键字 `var` 组成，后跟一个没有初始值的单一 `BindingIdentifier`，并以分号结束。

为了禁止或允许将 `await` 用作 `BindingIdentifier`，我们希望得到如下内容：

```grammar
BindingIdentifier_Await :
  Identifier
  yield

BindingIdentifier :
  Identifier
  yield
  await
```

这将会禁止在异步函数中将 `await` 作为标识符，并允许在非异步函数中将其作为标识符。

但规范并没有如此定义，取而代之的是，我们发现这样一个 [生成式](https://tc39.es/ecma262/#prod-BindingIdentifier)：

```grammar
BindingIdentifier[Yield, Await] :
  Identifier
  yield
  await
```

展开以后，这意味着以下生成式：

```grammar
BindingIdentifier_Await :
  Identifier
  yield
  await

BindingIdentifier :
  Identifier
  yield
  await
```

（我们省略了与示例无关的 `BindingIdentifier_Yield` 和 `BindingIdentifier_Yield_Await` 的生成式。）

这看起来像是 `await` 和 `yield` 总是可以作为标识符。那么这是怎么回事呢？整个博客文章是否无意义了？

### 静态语义帮助解决问题

事实证明，需要借助 **静态语义** 来禁止在异步函数中将 `await` 用作标识符。

静态语义描述静态规则——也就是说，程序运行之前检查的规则。

在这种情况下，[`BindingIdentifier` 的静态语义](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors) 定义了以下语法导向规则：

> ```grammar
> BindingIdentifier[Yield, Await] : await
> ```
>
> 如果此生成式带有 <code><sub>[Await]</sub></code> 参数，则为语法错误。

实际效果是，这禁止了 `BindingIdentifier_Await : await` 生成式。

规范解释了为什么要有这个产生式但通过静态语义将其定义为语法错误，这是因为它与自动分号插入（ASI）存在干扰。

记住，当我们无法根据语法产生式解析代码行时，ASI会介入。ASI尝试添加分号以满足语句和声明必须以分号结束的要求。（我们将在后续章节中更详细地描述ASI。）

考虑以下代码（来自规范的示例）：

```js
async function too_few_semicolons() {
  let
  await 0;
}
```

如果语法禁止将`await`作为标识符，ASI会介入并将代码转换为以下语法正确的代码，同时也使用`let`作为标识符：

```js
async function too_few_semicolons() {
  let;
  await 0;
}
```

这种与ASI的干扰被认为过于令人困惑，因此使用静态语义来禁止将`await`作为标识符。

### 禁止使用标识符的`StringValues`

还有另一条相关规则：

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> 如果此产生式具有<code><sub>[Await]</sub></code>参数，并且`Identifier`的`StringValue`为`"await"`，则这是一个语法错误。

一开始这可能会让人感到困惑。[`Identifier`](https://tc39.es/ecma262/#prod-Identifier)被定义如下：

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName but not ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await`是一个`ReservedWord`，那么`Identifier`怎么可能是`await`呢？

事实证明，`Identifier`不能是`await`，但可以是其他形式，其`StringValue`是`"await"`——字符序列`await`的不同表示法。

[标识符名称的静态语义](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue)定义了如何计算标识符名称的`StringValue`。例如，`a`的Unicode转义序列是`\u0061`，因此`\u0061wait`的`StringValue`为`"await"`。`\u0061wait`不会被词法语法识别为关键字，而是一个`Identifier`。静态语义禁止在异步函数中使用它作为变量名。

因此，这样可以正常工作：

```js
function old() {
  var \u0061wait;
}
```

而下面的代码则会报错：

```js
async function modern() {
  var \u0061wait; // 语法错误
}
```

## 总结

在本章中，我们熟悉了词法语法、句法语法以及定义句法语法时使用的简写语法。作为一个例子，我们研究了禁止在异步函数中使用`await`作为标识符，但允许在非异步函数中使用。

句法语法的其他有趣部分，例如自动分号插入和封面语法将在后续章节中介绍。敬请期待！
