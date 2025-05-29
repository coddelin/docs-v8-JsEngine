---
title: 'Exports de l'espace de noms des modules'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: 'Les modules JavaScript prennent désormais en charge une nouvelle syntaxe pour réexporter toutes les propriétés au sein d'un espace de noms.'
---
Dans [les modules JavaScript](/features/modules), il était déjà possible d'utiliser la syntaxe suivante :

```js
import * as utils from './utils.mjs';
```

Cependant, aucune syntaxe d'exportation symétrique n'existait… [jusqu'à maintenant](https://github.com/tc39/proposal-export-ns-from) :

```js
export * as utils from './utils.mjs';
```

Cela équivaut à ce qui suit :

```js
import * as utils from './utils.mjs';
export { utils };
```
