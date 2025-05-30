---
title: "Modul-Namespace-Exporte"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-12-18
tags: 
  - ECMAScript
  - ES2020
description: "JavaScript-Module unterstützen jetzt neue Syntax zum erneuten Export aller Eigenschaften innerhalb eines Namespaces."
---
In [JavaScript-Modulen](/features/modules) war es bereits möglich, die folgende Syntax zu verwenden:

```js
import * as utils from './utils.mjs';
```

Es existierte jedoch keine symmetrische `export`-Syntax… [bis jetzt](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from './utils.mjs';
```

Dies ist gleichbedeutend mit dem Folgenden:

```js
import * as utils from './utils.mjs';
export { utils };
```
