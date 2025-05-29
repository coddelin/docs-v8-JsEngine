---
title: "格式良好的 `JSON.stringify`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: "JSON.stringify 現在對孤立代理項輸出轉義序列，令輸出有效 Unicode（並且可在 UTF-8 中表示）。"
---
`JSON.stringify` 之前的規範是當輸入包含任何孤立代理項時，返回格式不良的 Unicode 字串：

```js
JSON.stringify('\uD800');
// → '"�"'
```

[“格式良好的 `JSON.stringify`”提案](https://github.com/tc39/proposal-well-formed-stringify) 修改了 `JSON.stringify`，使其對孤立代理項輸出轉義序列，令其輸出有效 Unicode（並且可在 UTF-8 中表示）：

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

請注意，`JSON.parse(stringified)` 仍然會產生與之前相同的結果。

這個特性是一個早該完成的小修復。對 JavaScript 開發者來說，少了一個需要擔心的問題。配合 [_JSON ⊂ ECMAScript_](/features/subsume-json)，它使得可以安全地將 JSON-序列化的資料嵌入到 JavaScript 程式中作為文本，並且以任何 Unicode 兼容的編碼（例如 UTF-8）將生成的程式碼寫入磁碟。這對於[元程式設計的使用案例](/features/subsume-json#embedding-json)非常有用。

## 特性支持

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
