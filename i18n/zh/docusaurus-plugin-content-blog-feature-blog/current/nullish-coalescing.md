---
title: "空值合并"
author: "Justin Ridgewell"
avatars: 
  - "justin-ridgewell"
date: 2019-09-17
tags: 
  - ECMAScript
  - ES2020
description: "JavaScript 的空值合并操作符可以实现更安全的默认值表达式。"
tweet: "1173971116865523714"
---
[空值合并提案](https://github.com/tc39/proposal-nullish-coalescing/) (`??`) 添加了一个新的短路操作符，用于处理默认值。

你可能已经熟悉其他的短路操作符 `&&` 和 `||`。这两个操作符处理“真值”和“假值”。假设代码示例为 `lhs && rhs`。如果 `lhs`（即左操作数）为假值，则表达式返回 `lhs`。否则，返回 `rhs`（即右操作数）。代码示例 `lhs || rhs` 的逻辑则相反。如果 `lhs` 为真值，则表达式返回 `lhs`。否则，返回 `rhs`。

<!--truncate-->
但“真值”和“假值”到底是什么意思？在规范术语中，它等价于 [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean) 抽象操作。对于我们普通的 JavaScript 开发者来说，**除** `undefined`、`null`、`false`、`0`、`NaN` 和空字符串 `''` **之外的所有值**都是真值。（严格来说，与 `document.all` 相关的值也是假值，但我们稍后再讨论这个问题。）

那么，`&&` 和 `||` 的问题是什么？为什么我们需要一个新的空值合并操作符？这是因为“真值”和“假值”的定义并不适合所有场景，这会导致 bug。想象一下以下这种场景：

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

在这个例子中，我们将 `enabled` 属性视为一个可选的布尔值属性，用于控制组件中某些功能是否启用。这意味着我们可以显式地将 `enabled` 设置为 `true` 或 `false`。但由于它是一个可选属性，我们可以通过不设置它而隐式地将其设为 `undefined`。如果它是 `undefined`，我们希望将组件视为 `enabled = true`（其默认值）。

此时，你可能已经发现了代码示例中的 bug。如果我们显式地设置 `enabled = true`，那么 `enable` 变量是 `true`。如果我们隐式地设置 `enabled = undefined`，那么 `enable` 变量仍然是 `true`。但如果我们显式地设置 `enabled = false`，那么 `enable` 变量居然仍然是 `true`！我们的初衷是将值默认设为 `true`，但实际上我们却强制设置了值。此时的解决方法是明确我们期望的值：

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

类似的 bug 会出现在所有的假值场景中。这很可能是一个可选的字符串（空字符串 `''` 被视为有效输入）或一个可选的数字（`0` 被视为有效输入）。这个问题如此常见，以至于我们现在引入了空值合并操作符来处理这种默认值赋值问题：

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

空值合并操作符 (`??`) 的行为与 `||` 操作符非常类似，不同的是它在评估操作符时不使用“真值”，而使用“空值”的定义，即“是否严格等于 `null` 或 `undefined`”。所以假设表达式 `lhs ?? rhs`：如果 `lhs` 不是空值，则结果为 `lhs`。否则，结果为 `rhs`。

具体来说，这意味着 `false`、`0`、`NaN` 和空字符串 `''` 都是非空值的假值。当这些假值但非空值作为 `lhs ?? rhs` 的左操作数时，表达式的结果是它们本身，而不是右侧的值。Bug 消失不见了！

```js
false ?? true;   // => false
0 ?? 1;          // => 0
'' ?? 'default'; // => ''

null ?? [];      // => []
undefined ?? []; // => []
```

## 解构时的默认赋值呢？

你可能已经注意到，最后的代码示例也可以通过在对象解构中使用默认赋值来实现：

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

这有点啰嗦，但仍然是完全有效的 JavaScript。不过，这使用了稍微不同的语义。在对象解构中进行默认赋值会检查属性是否严格等于 `undefined`，如果是，则进行默认赋值。

但严格仅测试 `undefined` 并不总是理想的，而且要进行解构的对象也并不总是存在。例如，你可能想对函数的返回值进行默认设定（没有对象可供解构）。或者函数的返回值是 `null` （在 DOM API 中很常见）。这些情况下你就需要使用空值合并操作符：

```js
// 简洁的空值合并
const link = document.querySelector('link') ?? document.createElement('link');

// 默认赋值解构，带样板代码
const {
  link = document.createElement('link'),
} = {
  link: document.querySelector('link') || undefined
};
```

此外，某些新特性如[可选链](/features/optional-chaining)与解构使用时效果可能不够完美。由于解构需要一个对象，因此在可选链返回 `undefined` 而不是对象时，必须保护解构。而使用空值合并操作符，我们就不会有这个问题：

```js
// 可选链与空值合并的联合使用
const link = obj.deep?.container.link ?? document.createElement('link');

// 使用可选链的默认赋值解构
const {
  link = document.createElement('link'),
} = (obj.deep?.container || {});
```

## 混合使用各种操作符

语言设计很复杂，我们并不能总是创造新的操作符而不带一定的开发者意图上的模糊性。如果你曾经混合使用 `&&` 和 `||` 操作符，你很可能就遇到过这种模糊性。设想表达式 `lhs && middle || rhs`。在 JavaScript 中，这实际上被解析为如下表达式 `(lhs && middle) || rhs`。现在设想表达式 `lhs || middle && rhs`。这个表达式实际上被解析为 `lhs || (middle && rhs)`。

你可能会注意到，`&&` 操作符相对于 `||` 操作符具有更高的优先级，这意味着隐含的括号会围绕 `&&` 而不是 `||`。在设计 `??` 操作符时，我们必须决定其优先级。它可以是：

1. 比 `&&` 和 `||` 都低的优先级
1. 比 `&&` 低但比 `||` 高的优先级
1. 比 `&&` 和 `||` 都高的优先级

对于每种优先级定义，我们都必须运行四种可能的测试用例：

1. `lhs && middle ?? rhs`
1. `lhs ?? middle && rhs`
1. `lhs || middle ?? rhs`
1. `lhs ?? middle || rhs`

在每个测试表达式中，我们必须决定隐含的括号应该放在哪里。如果括号没有完全按照开发者设想的方式包装表达式，那么代码就可能写得很糟糕。不幸的是，无论我们选择哪种优先级水平，其中一个测试表达式都可能违反开发者的意图。

最终，我们决定在混合使用 `??` 与 (`&&` 或 `||`) 时需要显式的括号分组（注意我很明确地使用了括号分组！自带幽默！）。如果你混合使用这些操作符，你必须用括号包裹其中一个操作符组，否则会出现语法错误。

```js
// 混合使用时需要显式的括号分组
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

通过这种方式，语言解析器总能够匹配开发者的意图。而任何后来阅读代码的人也能立即理解。很棒！

## 告诉我关于 `document.all` 的事情

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all) 是一个特殊且永远不该使用的值。但如果你确实使用了它，你最好了解它在“真值”和“空值”上的交互。

`document.all` 是一个类数组对象，意味着它有像数组一样的索引属性和长度。对象通常被认为是真值 —— 但令人惊讶的是，`document.all` 假装自己是一个假值！事实上，它既与 `null` 也与 `undefined` 松散相等（这通常意味着它不能拥有任何属性）。

在 `document.all` 与 `&&` 或 `||` 操作时，它假装为假值。但它并不严格等于 `null` 或 `undefined`，因此它不是空值。因此在与 `??` 操作时，`document.all` 的行为像任何其他对象一样。

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## 空值合并的支持情况

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
