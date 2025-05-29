---
title: "模組命名空間導出"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: "JavaScript 模組現在支持新的語法來重新導出命名空間中的所有屬性。"
---
在 [JavaScript 模組](/features/modules) 中，先前已經可以使用以下語法：

```js
import * as utils from './utils.mjs';
```

然而，並沒有對稱的 `export` 語法……[直到現在](https://github.com/tc39/proposal-export-ns-from)：

```js
export * as utils from './utils.mjs';
```

這相當於以下：

```js
import * as utils from './utils.mjs';
export { utils };
```
