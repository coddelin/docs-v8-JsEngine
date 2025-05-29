---
title: "导入断言"
author: "Dan Clark ([@dandclark1](https://twitter.com/dandclark1))，断言导入的坚定支持者"
avatars: 
  - "dan-clark"
date: 2021-06-15
tags: 
  - ECMAScript
description: "导入断言允许模块导入语句在模块规范符旁边包含额外信息"
tweet: ""
---

新的[导入断言](https://github.com/tc39/proposal-import-assertions)功能允许模块导入语句在模块规范符旁边包含额外的信息。该功能的初始用途是使 JSON 文档可以作为 [JSON 模块](https://github.com/tc39/proposal-json-modules) 导入：

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from './foo.json' assert { type: 'json' };
console.log(json.answer); // 42
```

## 背景：JSON 模块和 MIME 类型

一个自然的问题是为什么不能简单地像这样导入 JSON 模块：

```javascript
import json from './foo.json';
```

Web 平台在执行模块资源之前会检查 MIME 类型的有效性，理论上也可以通过 MIME 类型来决定是否将资源视为 JSON 或 JavaScript 模块。

但是，单独依赖 MIME 类型有一个[安全问题](https://github.com/w3c/webcomponents/issues/839)。

模块可以跨域导入，开发者可能从第三方源导入 JSON 模块。他们可能认为只要 JSON 得到适当的清理，即使来自不可信的第三方，这基本是安全的，因为导入 JSON 不会执行脚本。

然而，在这种情况下，第三方脚本可以实际被执行，因为第三方服务器可能意外返回 JavaScript MIME 类型和恶意 JavaScript 代码，在导入者的域中运行代码。

```javascript
// 如果 evil.com 返回的是 JavaScript MIME 类型（例如 `text/javascript`），则执行 JS！
import data from 'https://evil.com/data.json';
```

文件扩展名无法用于确定模块类型，因为它们[不能可靠地表示 Web 上的内容类型](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md)。因此，我们使用导入断言来指示预期的模块类型，以防止这种权限提升的陷阱。

当开发者想要导入 JSON 模块时，必须使用导入断言来指定它应该是 JSON。如果从网络接收到的 MIME 类型与预期类型不匹配，导入将失败：

```javascript
// 如果 evil.com 返回的是非 JSON MIME 类型，则失败。
import data from 'https://evil.com/data.json' assert { type: 'json' };
```

## 动态 `import()`

导入断言也可以作为新的第二个参数传递给[动态 `import()`](https://v8.dev/features/dynamic-import#dynamic)：

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import('./foo.json', {
  assert: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

JSON 内容是模块的默认导出，因此通过从 `import()` 返回的对象的 `default` 属性引用它。

## 总结

目前导入断言的唯一指定用途是用于指定模块类型。然而，该功能设计为允许任意键值对断言，因此如果在其他方式约束模块导入有用的话，未来可能会添加更多用途。

同时，带有新导入断言语法的 JSON 模块在 Chromium 91 中默认可用。[CSS 模块脚本](https://chromestatus.com/feature/5948572598009856)也即将推出，使用相同的模块类型断言语法。

## 导入断言支持

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/babel/babel/pull/12139"></feature-support>
