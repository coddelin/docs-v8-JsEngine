---
title: 'Экспорт пространства имен модулей'
author: 'Маттиас Байненс ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: 'Модули JavaScript теперь поддерживают новый синтаксис для повторного экспорта всех свойств внутри пространства имен.'
---
В [модулях JavaScript](/features/modules) уже можно было использовать следующий синтаксис:

```js
import * as utils from './utils.mjs';
```

Однако симметричный синтаксис `export` отсутствовал… [до сегодняшнего дня](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from './utils.mjs';
```

Это эквивалентно следующему:

```js
import * as utils from './utils.mjs';
export { utils };
```
