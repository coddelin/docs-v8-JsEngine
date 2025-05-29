---
title: 'Exportación de nombres de espacios en módulos'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: 'Los módulos de JavaScript ahora admiten una nueva sintaxis para reexportar todas las propiedades dentro de un namespace.'
---
En [módulos de JavaScript](/features/modules), ya era posible usar la siguiente sintaxis:

```js
import * as utils from './utils.mjs';
```

Sin embargo, no existía una sintaxis de `export` simétrica… [hasta ahora](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from './utils.mjs';
```

Esto es equivalente a lo siguiente:

```js
import * as utils from './utils.mjs';
export { utils };
```
