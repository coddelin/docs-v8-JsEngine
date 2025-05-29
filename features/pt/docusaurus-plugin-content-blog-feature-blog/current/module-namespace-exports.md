---
title: &apos;Exportações de namespace de módulo&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;Os módulos JavaScript agora suportam nova sintaxe para reexportar todas as propriedades dentro de um namespace&apos;
---
Em [módulos JavaScript](/features/modules), já era possível usar a seguinte sintaxe:

```js
import * as utils from &apos;./utils.mjs&apos;;
```

No entanto, não existia uma sintaxe `export` simétrica… [até agora](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from &apos;./utils.mjs&apos;;
```

Isso é equivalente ao seguinte:

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
