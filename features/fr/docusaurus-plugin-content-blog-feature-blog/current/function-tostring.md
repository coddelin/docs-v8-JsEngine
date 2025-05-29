---
title: &apos;Révision de `Function.prototype.toString`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Function.prototype.toString retourne désormais des extraits exacts du texte du code source, y compris les espaces et les commentaires.&apos;
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) retourne désormais des extraits exacts du texte du code source, y compris les espaces et les commentaires. Voici un exemple comparant l’ancien comportement au nouveau :

<!--truncate-->
```js
// Notez le commentaire entre le mot-clé `function`
// et le nom de la fonction, ainsi que l’espace suivant
// le nom de la fonction.
function /* un commentaire */ foo () {}

// Auparavant, dans V8 :
foo.toString();
// → &apos;function foo() {}&apos;
//             ^ pas de commentaire
//                ^ pas d’espace

// Maintenant :
foo.toString();
// → &apos;function /* commentaire */ foo () {}&apos;
```

## Prise en charge de la fonctionnalité

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="oui"
                 safari="non"
                 nodejs="8"
                 babel="non"></feature-support>
