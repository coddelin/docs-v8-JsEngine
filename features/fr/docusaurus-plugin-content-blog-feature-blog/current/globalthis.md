---
title: &apos;`globalThis`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-07-16
tags:
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: &apos;globalThis introduit un mécanisme unifié pour accéder à l&apos;objet global dans n&apos;importe quel environnement JavaScript, quel que soit l&apos;objectif du script.&apos;
tweet: &apos;1151140681374547969&apos;
---
Si vous avez déjà écrit du JavaScript pour une utilisation dans un navigateur web, vous avez peut-être utilisé `window` pour accéder au `this` global. Dans Node.js, vous avez peut-être utilisé `global`. Si vous avez écrit du code qui doit fonctionner dans les deux environnements, vous avez peut-être détecté lequel de ces éléments est disponible, puis utilisé celui-ci — mais la liste des identifiants à vérifier s&apos;allonge avec le nombre d&apos;environnements et de cas d&apos;utilisation que vous souhaitez prendre en charge. Cela devient vite ingérable :

<!--truncate-->
```js
// Une tentative naïve pour obtenir le `this` global. Ne l&apos;utilisez pas !
const getGlobalThis = () => {
  if (typeof globalThis !== &apos;undefined&apos;) return globalThis;
  if (typeof self !== &apos;undefined&apos;) return self;
  if (typeof window !== &apos;undefined&apos;) return window;
  if (typeof global !== &apos;undefined&apos;) return global;
  // Attention : cela pourrait encore renvoyer un mauvais résultat !
  if (typeof this !== &apos;undefined&apos;) return this;
  throw new Error(&apos;Impossible de localiser l&apos;objet `this` global&apos;);
};
const theGlobalThis = getGlobalThis();
```

Pour plus de détails sur pourquoi l&apos;approche ci-dessus est insuffisante (ainsi qu&apos;une technique encore plus complexe), lisez [_a horrifying `globalThis` polyfill in universal JavaScript_](https://mathiasbynens.be/notes/globalthis).

[La proposition `globalThis`](https://github.com/tc39/proposal-global) introduit un mécanisme *unifié* pour accéder au `this` global dans n&apos;importe quel environnement JavaScript (navigateur, Node.js, ou autre chose ?), quel que soit l&apos;objectif du script (script classique ou module ?).

```js
const theGlobalThis = globalThis;
```

Notez que le code moderne pourrait ne pas avoir besoin d&apos;accéder au `this` global du tout. Avec les modules JavaScript, vous pouvez `importer` et `exporter` des fonctionnalités de manière déclarative au lieu de modifier l&apos;état global. `globalThis` reste utile pour les polyfills et autres bibliothèques qui nécessitent un accès global.

## Support de `globalThis`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
