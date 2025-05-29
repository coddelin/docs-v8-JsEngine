---
title: &apos;Exportación de nombres de espacios en módulos&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;Los módulos de JavaScript ahora admiten una nueva sintaxis para reexportar todas las propiedades dentro de un namespace.&apos;
---
En [módulos de JavaScript](/features/modules), ya era posible usar la siguiente sintaxis:

```js
import * as utils from &apos;./utils.mjs&apos;;
```

Sin embargo, no existía una sintaxis de `export` simétrica… [hasta ahora](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from &apos;./utils.mjs&apos;;
```

Esto es equivalente a lo siguiente:

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
