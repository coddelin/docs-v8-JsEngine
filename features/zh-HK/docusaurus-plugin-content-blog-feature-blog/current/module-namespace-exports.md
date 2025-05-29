---
title: &apos;模組命名空間導出&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;JavaScript 模組現在支持新的語法來重新導出命名空間中的所有屬性。&apos;
---
在 [JavaScript 模組](/features/modules) 中，先前已經可以使用以下語法：

```js
import * as utils from &apos;./utils.mjs&apos;;
```

然而，並沒有對稱的 `export` 語法……[直到現在](https://github.com/tc39/proposal-export-ns-from)：

```js
export * as utils from &apos;./utils.mjs&apos;;
```

這相當於以下：

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
