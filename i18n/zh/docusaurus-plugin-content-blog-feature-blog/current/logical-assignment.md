---
title: "逻辑赋值"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2020-05-07
tags: 
  - ECMAScript
  - ES2021
  - Node.js 16
description: "JavaScript 现在支持带有逻辑运算的复合赋值。"
tweet: "1258387483823345665"
---
JavaScript 支持一系列[复合赋值运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators)，允许程序员简洁地表达二元运算和赋值。当前，仅支持数学或按位运算。

<!--truncate-->
缺少的是将逻辑运算与赋值相结合的能力，现在 JavaScript 通过新增的运算符 `&&=`、`||=` 和 `??=` 支持逻辑赋值。

## 逻辑赋值运算符

在深入了解新运算符之前，让我们回顾一下现有的复合赋值运算符。例如，`lhs += rhs` 的含义大致等同于 `lhs = lhs + rhs`。这种粗略的等价性适用于所有的现有运算符 `@=`，其中 `@` 代表如 `+` 或 `|` 的二元运算符。值得注意的是，从严格意义上讲，这仅在 `lhs` 是变量时才正确。对于像 `obj[computedPropertyName()] += rhs` 这样的更复杂的左操作数，左操作数只会被评估一次。

现在我们深入了解新运算符。与现有运算符不同，当 `@` 是逻辑运算符 `&&`、`||` 或 `??` 时，`lhs @= rhs` 并不大致等同于 `lhs = lhs @ rhs`。

```js
// 复习一下逻辑与的语义：
x && y
// → y 当 x 为真值时
// → x 当 x 为假值时

// 首先是逻辑与赋值。以下两行代码等效。
// 注意，与现有的复合赋值运算符一样，更复杂的
// 左操作数只会被评估一次。
x &&= y;
x && (x = y);

// 以下是逻辑或的语义：
x || y
// → x 当 x 为真值时
// → y 当 x 为假值时

// 类似地，逻辑或赋值：
x ||= y;
x || (x = y);

// 以下是空值合并操作符的语义：
x ?? y
// → y 当 x 为 null 或 undefined 时
// → x 当 x 不为 null 或 undefined 时

// 最后是空值合并赋值：
x ??= y;
x ?? (x = y);
```

## 短路语义

与数学和按位运算符不同，逻辑赋值遵循各自逻辑运算的短路行为。它们仅在逻辑运算将评估右操作数时才执行赋值。

乍一看，这可能令人困惑。为什么不像其他复合赋值运算符那样无条件地赋值给左操作数？

这是有实用原因的。当将逻辑运算与赋值结合时，赋值可能导致副作用，这些副作用应基于逻辑运算的结果有条件地发生。如果无条件触发副作用，可能会对程序的性能或正确性产生负面影响。

让我们通过两个版本的函数示例来更具体地说明，这两个版本的函数为元素设置默认消息。

```js
// 如果没有覆盖任何内容，则显示默认消息。
// 只有在 innerHTML 为空时才会赋值。不造成 msgElement 内部
// 元素失去焦点。
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>暂无消息<p>';
}

// 如果没有覆盖任何内容，则显示默认消息。
// 有漏洞！每次调用可能导致 msgElement
// 内部元素失去焦点。
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>暂无消息<p>';
}
```

:::note
**注意：** 因为 `innerHTML` 属性被[规定](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml)返回空字符串而不是 `null` 或 `undefined`，所以必须使用 `||=` 而不是 `??=`。写代码时，请记住许多 Web API 并不使用 `null` 或 `undefined` 表示空或不存在。
:::

在 HTML 中，为元素的 `.innerHTML` 属性赋值是具有破坏性的。内部子元素会被删除，并插入从新赋值字符串解析出的新子元素。即使新字符串与旧字符串相同，这也会导致额外的工作并使内部元素失去焦点。为了避免不必要的副作用，逻辑赋值运算符的语义会短路赋值。

可以通过以下方式思考与其他复合赋值运算符的对称性来帮助理解。数学和按位运算符是无条件的，因此赋值也是无条件的。而逻辑运算符是有条件的，因此赋值也是有条件的。

## 逻辑赋值支持

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#New-Features:~:text=添加了逻辑赋值运算符支持."
                 nodejs="16"
                 babel="是 https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
