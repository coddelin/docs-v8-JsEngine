---
title: "将 JSON 嵌入 ECMAScript，也就是 JSON ⊂ ECMAScript"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-08-14
tags: 
  - ES2019
description: "JSON 现在是 ECMAScript 的语法子集。"
tweet: "1161649929904885762"
---
通过 [JSON ⊂ ECMAScript 提案](https://github.com/tc39/proposal-json-superset)，JSON 成为了 ECMAScript 的语法子集。如果你对此感到惊讶，你并不孤单！

## ES2018 的旧行为

在 ES2018 中，ECMAScript 字符串字面量不能包含未转义的 U+2028 行分隔符和 U+2029 段分隔符字符，因为它们即使在该上下文中也被视为行终止符：

```js
// 一个包含原始 U+2028 字符的字符串。
const LS = ' ';
// → ES2018: 语法错误

// 一个包含原始 U+2029 字符的字符串，由 `eval` 生成：
const PS = eval('"\u2029"');
// → ES2018: 语法错误
```

这很麻烦，因为 JSON 字符串 _可以_ 包含这些字符。因此，开发者不得不在将有效 JSON 嵌入到 ECMAScript 程序中时实现专门的后处理逻辑来处理这些字符。如果没有这样的逻辑，代码可能会出现细微的错误，甚至可能带来 [安全问题](#security)！

<!--truncate-->
## 新行为

在 ES2019 中，字符串字面量现在可以包含原始 U+2028 和 U+2029 字符，消除了 ECMAScript 和 JSON 之间令人困惑的不匹配。

```js
// 一个包含原始 U+2028 字符的字符串。
const LS = ' ';
// → ES2018: 语法错误
// → ES2019: 无异常

// 一个包含原始 U+2029 字符的字符串，由 `eval` 生成：
const PS = eval('"\u2029"');
// → ES2018: 语法错误
// → ES2019: 无异常
```

这一小改进大大简化了开发者的思维模型（少了一种需要记住的边界情况！），并减少了在将有效 JSON 嵌入到 ECMAScript 程序中时需要的专门后处理逻辑。

## 在 JavaScript 程序中嵌入 JSON

由于这一提案，`JSON.stringify` 现在可以用于生成有效的 ECMAScript 字符串字面量、对象字面量和数组字面量。并且由于单独的 [规范化 `JSON.stringify` 提案](/features/well-formed-json-stringify)，这些字面量可以安全地用 UTF-8 和其他编码表示（这对你试图将它们写入磁盘上的文件时很有帮助）。这对于元编程用例非常有用，比如动态创建 JavaScript 源代码并将其写入磁盘。

以下是利用 JSON 语法现为 ECMAScript 子集的例子，通过一个给定的数据对象创建一个有效的 JavaScript 程序：

```js
// 表示某些数据的 JavaScript 对象（或数组，或字符串）。
const data = {
  LineTerminators: '\n\r  ',
  // 注意：字符串包含 4 个字符：'\n\r\u2028\u2029'。
};

// 将数据转换为其 JSON 字符串形式。由于 JSON ⊂
// ECMAScript，`JSON.stringify` 的输出保证是
// 语法有效的 ECMAScript 字面量：
const jsObjectLiteral = JSON.stringify(data);

// 创建一个嵌入数据为对象字面量的有效 ECMAScript 程序。
const program = `const data = ${ jsObjectLiteral };`;
// → 'const data = {"LineTerminators":"…"};'
// （如果目标是内联 <script> 需要进行额外的转义。）

// 将包含 ECMAScript 程序的文件写入磁盘。
saveToDisk(filePath, program);
```

上述脚本生成以下代码，评估后得到一个等效对象：

```js
const data = {"LineTerminators":"\n\r  "};
```

## 使用 `JSON.parse` 在 JavaScript 程序中嵌入 JSON

如 [_JSON 的成本_](/blog/cost-of-javascript-2019#json) 所解释的那样，与其像下面这样内联数据为 JavaScript 对象字面量：

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…数据可以用 JSON 字符串形式表示，并在运行时通过 JSON 解析，这样在处理大对象（10 kB+）时可以获得性能改进：

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

以下是一个示例实现：

```js
// 表示某些数据的 JavaScript 对象（或数组，或字符串）。
const data = {
  LineTerminators: '\n\r  ',
  // 注意：字符串包含 4 个字符：'\n\r\u2028\u2029'。
};

// 将数据转换为其 JSON 字符串形式。
const json = JSON.stringify(data);

// 现在，我们想将 JSON 插入到一个脚本主体中，作为 JavaScript
// 字符串字面量，参见 https://v8.dev/blog/cost-of-javascript-2019#json，
// 转义数据中的特殊字符如 `"`。
// 由于 JSON ⊂ ECMAScript，`JSON.stringify` 的输出保证是
// 语法有效的 ECMAScript 字面量：
const jsStringLiteral = JSON.stringify(json);
// 创建一个嵌入 JavaScript 字符串字面量表示的 JSON 数据
// 于 `JSON.parse` 调用中的有效 ECMAScript 程序。
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → 'const data = JSON.parse("…");'
// （如果目标是行内 <script>，需要额外的转义。）

// 将包含 ECMAScript 程序的文件写入磁盘。
saveToDisk(filePath, program);
```

上述脚本会生成以下代码，该代码等效于一个对象：

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

[Google 对比 `JSON.parse` 和 JavaScript 对象文字的基准测试](https://github.com/GoogleChromeLabs/json-parse-benchmark) 在其构建步骤中利用了这一技术。Chrome DevTools 的“复制为 JS”功能通过采用类似技术已被[显著简化](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js)。

## 关于安全性的说明

JSON ⊂ ECMAScript 特别是在字符串文字的情况下减少了 JSON 和 ECMAScript 之间的不匹配。由于字符串文字可以出现在其他 JSON 支持的数据结构（如对象和数组）中，因此也解决了这些情况，如以上代码示例所示。

然而，U+2028 和 U+2029 在 ECMAScript 语法中的其他部分仍然被视为行终止符。这意味着在某些情况下，将 JSON 注入 JavaScript 程序仍然是不安全的。以下示例中，一个服务器在运行 `JSON.stringify()` 后将某些用户提供的内容注入到 HTML 响应中：

```ejs
<script>
  // 调试信息：
  // 用户代理：<%= JSON.stringify(ua) %>
</script>
```

请注意，`JSON.stringify` 的结果被注入到脚本中的单行注释中。

如以上示例所示，`JSON.stringify()` 保证返回单行。问题在于对于什么是“单行”[JSON 和 ECMAScript 的定义不同](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136)。如果 `ua` 包含未转义的 U+2028 或 U+2029 字符，我们会跳出单行注释并执行 `ua` 的其余部分作为 JavaScript 源代码：

```html
<script>
  // 调试信息：
  // 用户代理："用户提供的字符串<U+2028>  alert('XSS');//"
</script>
<!-- …等效于： -->
<script>
  // 调试信息：
  // 用户代理："用户提供的字符串
  alert('XSS');//"
</script>
```

:::note
**注意：** 在上述示例中，未转义的原始 U+2028 字符表示为 `<U+2028>`，以便更容易理解。
:::

JSON ⊂ ECMAScript 在这种情况下无济于事，因为它只影响字符串文字，而在这种情况下，`JSON.stringify` 的输出被注入到一个非直接生成 JavaScript 字符串文字的位置。

除非引入针对这两个字符的特殊后处理，否则以上代码片段会导致跨站脚本攻击漏洞（XSS）！

:::note
**注意：** 根据上下文，对用户控制的输入进行后处理以转义任何特殊字符序列至关重要。在此特定情况下，我们将内容注入 `<script>` 标签，因此我们必须（也）[转义 `</script`、`<script` 和 `<!-​-`](https://mathiasbynens.be/notes/etago#recommendations)。
:::

## JSON ⊂ ECMAScript 的支持

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="yes"
                 safari="yes"
                 nodejs="10"
                 babel="yes https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
