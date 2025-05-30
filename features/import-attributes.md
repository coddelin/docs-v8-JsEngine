---
title: "导入属性"
author: "郭恕宇 ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2024-01-31
tags: 
  - ECMAScript
description: "导入属性：导入声明的演变"
tweet: ""
---

## 之前

V8 在 v9.1 版本中发布了 [导入声明](https://chromestatus.com/feature/5765269513306112) 的功能。该功能允许模块导入语句通过使用 `assert` 关键字包含额外的信息。此额外信息目前用于在 JavaScript 模块中导入 JSON 和 CSS 模块。

<!--truncate-->
## 导入属性

从那时起，导入声明演变为 [导入属性](https://github.com/tc39/proposal-import-attributes)。该功能的核心目的保持不变：允许模块导入语句包含额外的信息。

最重要的区别在于导入声明仅具有断言语义，而导入属性具有更宽松的语义。仅断言语义意味着额外的信息不会影响模块的加载方式，只会影响模块是否能被加载。例如，一个 JSON 模块总是根据其 MIME 类型加载为 JSON 模块，`assert { type: 'json' }` 子句仅会导致加载失败，如果请求模块的 MIME 类型不是 `application/json`。

然而，仅断言语义存在一个致命缺陷。在 Web 上，HTTP 请求的形态会因所请求资源的类型而不同。例如，[`Accept` 头](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) 会影响响应的 MIME 类型，而 [`Sec-Fetch-Dest` 元数据头](https://web.dev/articles/fetch-metadata) 会决定 Web 服务器是否接受或拒绝请求。由于导入声明无法影响模块的加载方式，它无法修改 HTTP 请求的形态。此外，请求的资源类型还会影响使用哪些 [内容安全策略](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)：导入声明无法与 Web 的安全模型正确协作。

导入属性放宽了仅断言语义，以允许属性影响模块的加载方式。换句话说，导入属性可以生成包含适当的 `Accept` 和 `Sec-Fetch-Dest` 头的 HTTP 请求。为了匹配新语义，旧的 `assert` 关键字被更新为 `with`：

```javascript
// main.mjs
//
// 新的 'with' 语法。
import json from './foo.json' with { type: 'json' };
console.log(json.answer); // 42
```

## 动态 `import()`

类似地，[动态 `import()`](https://v8.dev/features/dynamic-import#dynamic) 也更新为接受一个 `with` 选项。

```javascript
// main.mjs
//
// 新的 'with' 选项。
const jsonModule = await import('./foo.json', {
  with: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

## `with` 的可用性

导入属性在 V8 v12.3 中默认启用。

## `assert` 的弃用及最终移除

`assert` 关键字自 V8 v12.3 起被弃用，计划在 v12.6 中移除。请使用 `with` 替代 `assert`！使用 `assert` 子句会在控制台中打印警告，建议改用 `with`。

## 导入属性支持

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="no"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="yes https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
