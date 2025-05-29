---
title: &apos;モジュール名前空間エクスポート&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;JavaScriptモジュールは、名前空間内のすべてのプロパティを再エクスポートする新しい構文をサポートするようになりました。&apos;
---
[JavaScriptモジュール](/features/modules)では、次の構文を使用することがすでに可能でした:

```js
import * as utils from &apos;./utils.mjs&apos;;
```

しかし、これまで対称的な`export`構文は存在しませんでした… [今までは](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from &apos;./utils.mjs&apos;;
```

これは次のものと同等です:

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
