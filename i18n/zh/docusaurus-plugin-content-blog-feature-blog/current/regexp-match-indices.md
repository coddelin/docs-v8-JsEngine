---
title: '正则表达式匹配索引'
author: 'Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski))，经常表达新特性'
avatars:
  - 'maya-armyanova'
date: 2019-12-17
tags:
  - ECMAScript
  - Node.js 16
description: '正则表达式匹配索引用于提供每个匹配捕获组的 `start` 和 `end` 索引位置。'
tweet: '1206970814400270338'
---
JavaScript现在具备一个新的正则表达式增强功能，称为“匹配索引”。假设您希望找到JavaScript代码中与保留词重合的无效变量名，并在变量名下输出一个插入号和一个“下划线”，例如：

<!--truncate-->
```js
const function = foo;
      ^------- 无效的变量名
```

在上面的示例中，`function` 是一个保留词，不能用作变量名。为此，我们可能会编写以下函数：

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // 索引 `1` 对应第一个捕获组。
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // 调整插入号位置。
    '^' +
    '-'.repeat(end - start - 1) +   // 添加下划线。
    ' ' + message;                  // 添加消息。
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // 错误代码
displayError(code, '无效的变量名');
```

:::note
**注意：** 为了简化，以上示例仅包含了一些JavaScript的[保留词](https://mathiasbynens.be/notes/reserved-keywords)。
:::

简而言之，新的 `indices` 数组存储每个匹配捕获组的开始和结束位置。当源正则表达式使用 `/d` 标志时，该新数组适用于所有生成正则表达式匹配对象的内建方法，包括 `RegExp#exec`、`String#match` 和 [`String#matchAll`](https://v8.dev/features/string-matchall)。

如果您对其工作原理感兴趣，可以继续阅读详细内容。

## 动机

让我们来看一个更复杂的示例，思考如何解决解析编程语言的任务（例如 [TypeScript 编译器](https://github.com/microsoft/TypeScript/tree/master/src/compiler) 的工作）——首先将输入的源代码拆分为标记，然后为这些标记提供语法结构。如果用户写了一些语法错误的代码，您希望为其提供有意义的错误提示，最好指出第一次发现问题代码的位置。例如，针对以下代码片段：

```js
let foo = 42;
// 一些其他代码
let foo = 1337;
```

我们希望向程序员展示如下错误信息：

```js
let foo = 1337;
    ^
SyntaxError: 标识符 'foo' 已经声明过
```

为了实现这一点，我们需要一些构建块，其中第一个是识别 TypeScript 的标识符。然后我们将重点确定错误发生的具体位置。考虑以下示例，使用正则表达式判断一个字符串是否为有效标识符：

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**注意：** 一个真实的解析器可以使用正则表达式中引入的[属性转义](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples)，并使用以下正则表达式匹配所有有效的 ECMAScript 标识符名称：

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

为了简化，我们将使用之前的正则表达式，该表达式仅匹配拉丁字符、数字和下划线。
:::

如果我们遇到像上面变量声明一样的错误并希望向用户打印精确位置，我们可能希望扩展上述正则表达式并使用类似的函数：

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

可以使用 `RegExp.prototype.exec` 返回的匹配对象上的 `index` 属性，它返回整个匹配的起始位置。但对于上面描述的用例，您通常希望使用（可能多个）捕获组。直到最近，JavaScript 尚未提供这些捕获组开始和结束位置的索引。

## 解释正则表达式匹配索引

理想情况下，我们希望在变量名的位置显示错误，而不是在 `let`/`const` 关键字处（如上述示例所示）。但是为此，我们需要找到索引为 `2` 的捕获组的位置。（索引 `1` 指的是 `(let|const|var)` 捕获组，而 `0` 指的是整个匹配。）

如上所述，[新的JavaScript功能](https://github.com/tc39/proposal-regexp-match-indices)在`RegExp.prototype.exec()`结果（子字符串数组）上添加了一个`indices`属性。让我们改进上面的示例以利用此新属性：

```js
function getVariablePosition(source) {
  // 注意`d`标志，它启用了`match.indices`
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition('let foo');
// → [4, 7]
```

此示例返回数组`[4, 7]`，这是组索引为`2`的匹配子字符串的`[开始, 结束)`位置。基于此信息，我们的编译器现在可以打印所需的错误。

## 其他功能

`indices`对象还包含一个`groups`属性，可以通过[命名捕获组](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups)的名称进行索引。使用它，可以将上面的函数重写为：

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition('let foo');
```

## 对正则表达式匹配索引的支持

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="no"></feature-support>
