---
title: &apos;Modul-Namespace-Exporte&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;JavaScript-Module unterstützen jetzt neue Syntax zum erneuten Export aller Eigenschaften innerhalb eines Namespaces.&apos;
---
In [JavaScript-Modulen](/features/modules) war es bereits möglich, die folgende Syntax zu verwenden:

```js
import * as utils from &apos;./utils.mjs&apos;;
```

Es existierte jedoch keine symmetrische `export`-Syntax… [bis jetzt](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from &apos;./utils.mjs&apos;;
```

Dies ist gleichbedeutend mit dem Folgenden:

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
