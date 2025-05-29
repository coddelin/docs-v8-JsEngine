---
title: &apos;模块命名空间导出&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;JavaScript模块现在支持新的语法以重新导出命名空间中的所有属性。&apos;
---
在[JavaScript模块](/features/modules)中，已经可以使用以下语法：

```js
import * as utils from &apos;./utils.mjs&apos;;
```

然而，之前没有对称的`export`语法… [直到现在](https://github.com/tc39/proposal-export-ns-from)：

```js
export * as utils from &apos;./utils.mjs&apos;;
```

这等同于以下内容：

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
