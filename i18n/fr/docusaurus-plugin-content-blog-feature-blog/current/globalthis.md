---
title: '`globalThis`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-07-16
tags:
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: 'globalThis introduit un mécanisme unifié pour accéder à l'objet global dans n'importe quel environnement JavaScript, quel que soit l'objectif du script.'
tweet: '1151140681374547969'
---
Si vous avez déjà écrit du JavaScript pour une utilisation dans un navigateur web, vous avez peut-être utilisé `window` pour accéder au `this` global. Dans Node.js, vous avez peut-être utilisé `global`. Si vous avez écrit du code qui doit fonctionner dans les deux environnements, vous avez peut-être détecté lequel de ces éléments est disponible, puis utilisé celui-ci — mais la liste des identifiants à vérifier s'allonge avec le nombre d'environnements et de cas d'utilisation que vous souhaitez prendre en charge. Cela devient vite ingérable :

<!--truncate-->
```js
// Une tentative naïve pour obtenir le `this` global. Ne l'utilisez pas !
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  // Attention : cela pourrait encore renvoyer un mauvais résultat !
  if (typeof this !== 'undefined') return this;
  throw new Error('Impossible de localiser l'objet `this` global');
};
const theGlobalThis = getGlobalThis();
```

Pour plus de détails sur pourquoi l'approche ci-dessus est insuffisante (ainsi qu'une technique encore plus complexe), lisez [_a horrifying `globalThis` polyfill in universal JavaScript_](https://mathiasbynens.be/notes/globalthis).

[La proposition `globalThis`](https://github.com/tc39/proposal-global) introduit un mécanisme *unifié* pour accéder au `this` global dans n'importe quel environnement JavaScript (navigateur, Node.js, ou autre chose ?), quel que soit l'objectif du script (script classique ou module ?).

```js
const theGlobalThis = globalThis;
```

Notez que le code moderne pourrait ne pas avoir besoin d'accéder au `this` global du tout. Avec les modules JavaScript, vous pouvez `importer` et `exporter` des fonctionnalités de manière déclarative au lieu de modifier l'état global. `globalThis` reste utile pour les polyfills et autres bibliothèques qui nécessitent un accès global.

## Support de `globalThis`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
