---
title: '格式良好的 `JSON.stringify`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: 'JSON.stringify 现在对独立代理对输出转义序列，使其输出为合法的 Unicode（且可表示为 UTF-8）。'
---
`JSON.stringify` 之前被规范为在输入包含任何独立代理对时返回格式不良的 Unicode 字符串：

```js
JSON.stringify('\uD800');
// → '"�"'
```

[“格式良好的 `JSON.stringify`”提案](https://github.com/tc39/proposal-well-formed-stringify) 修改了 `JSON.stringify`，使其对独立代理对输出转义序列，从而使其输出为合法的 Unicode（且可表示为 UTF-8）：

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

请注意，`JSON.parse(stringified)` 仍然会产生与之前相同的结果。

这一特性是 JavaScript 中长期未解决的小问题的一种修复。这减少了 JavaScript 开发者需要担心的问题。结合 [_JSON ⊂ ECMAScript_](/features/subsume-json)，它可以安全地将 JSON 序列化数据作为文字嵌入到 JavaScript 程序中，并以任何 Unicode 兼容的编码（例如 UTF-8）将生成的代码写入磁盘。这对于[元编程的用例](/features/subsume-json#embedding-json)非常有用。

## 特性支持

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
