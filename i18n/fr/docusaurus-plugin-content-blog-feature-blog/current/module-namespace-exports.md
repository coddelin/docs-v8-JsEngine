---
title: &apos;Exports de l&apos;espace de noms des modules&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-18
tags:
  - ECMAScript
  - ES2020
description: &apos;Les modules JavaScript prennent désormais en charge une nouvelle syntaxe pour réexporter toutes les propriétés au sein d&apos;un espace de noms.&apos;
---
Dans [les modules JavaScript](/features/modules), il était déjà possible d&apos;utiliser la syntaxe suivante :

```js
import * as utils from &apos;./utils.mjs&apos;;
```

Cependant, aucune syntaxe d&apos;exportation symétrique n&apos;existait… [jusqu&apos;à maintenant](https://github.com/tc39/proposal-export-ns-from) :

```js
export * as utils from &apos;./utils.mjs&apos;;
```

Cela équivaut à ce qui suit :

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```
