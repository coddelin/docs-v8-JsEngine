---
title: &apos;Экспорт пространства имен модулей&apos;
author: &apos;Маттиас Байненс ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;Модули JavaScript теперь поддерживают новый синтаксис для повторного экспорта всех свойств внутри пространства имен.&apos;
---
В [модулях JavaScript](/features/modules) уже можно было использовать следующий синтаксис:

```js
import * as utils from &apos;./utils.mjs&apos;;
```

Однако симметричный синтаксис `export` отсутствовал… [до сегодняшнего дня](https://github.com/tc39/proposal-export-ns-from):

```js
export * as utils from &apos;./utils.mjs&apos;;
```

Это эквивалентно следующему:

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
