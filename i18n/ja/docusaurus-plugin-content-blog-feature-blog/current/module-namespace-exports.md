---
title: "モジュール名前空間エクスポート"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-12-18
tags: 
  - ECMAScript
  - ES2020
description: "JavaScriptモジュールは、名前空間内のすべてのプロパティを再エクスポートする新しい構文をサポートするようになりました。"
---
[JavaScriptモジュール](/features/modules)では、次の構文を使用することがすでに可能でした:

```js
import * as utils from './utils.mjs';
```

しかし、これまで対称的な`export`構文は存在しませんでした… [今までは](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from './utils.mjs';
```

これは次のものと同等です:

```js
import * as utils from './utils.mjs';
export { utils };
```
