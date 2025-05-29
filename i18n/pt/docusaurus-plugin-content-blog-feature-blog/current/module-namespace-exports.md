---
title: 'Exportações de namespace de módulo'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: 'Os módulos JavaScript agora suportam nova sintaxe para reexportar todas as propriedades dentro de um namespace'
---
Em [módulos JavaScript](/features/modules), já era possível usar a seguinte sintaxe:

```js
import * as utils from './utils.mjs';
```

No entanto, não existia uma sintaxe `export` simétrica… [até agora](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from './utils.mjs';
```

Isso é equivalente ao seguinte:

```js
import * as utils from './utils.mjs';
export { utils };
```
