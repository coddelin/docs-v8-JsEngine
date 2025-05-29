---
title: 'Version V8 v4.7'
author: 'l'équipe V8'
date: 2015-10-14 13:33:37
tags:
  - sortie
description: 'La version V8 v4.7 offre une réduction de la consommation de mémoire et prend en charge les nouvelles fonctionnalités du langage ES2015.'
---
Environ toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](https://v8.dev/docs/release-process). Chaque version est issue du master Git de V8 juste avant que Chrome ne branche pour une étape bêta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre toute nouvelle branche, [Version V8 4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7), qui sera en bêta jusqu'à sa libération en coordination avec Chrome 47 Stable. La version V8 v4.7 est remplie de toutes sortes de nouveautés destinées aux développeurs, alors nous aimerions vous donner un aperçu de certains des points forts en prévision de la sortie dans quelques semaines.

<!--truncate-->
## Amélioration de la prise en charge d'ECMAScript 2015 (ES6)

### Opérateur « rest »

L'[opérateur « rest »](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters) permet au développeur de transmettre un nombre indéfini d'arguments à une fonction. Il est similaire à l'objet `arguments`.

```js
// Sans opérateur « rest »
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join('');
}

// Avec l'opérateur « rest »
function concatWithRest(...strings) {
  return strings.join('');
}
```

## Prise en charge des futures fonctionnalités de l'ES

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) est une nouvelle fonctionnalité qui est actuellement une proposition de niveau 3 en vue de son inclusion dans ES2016. Elle offre une syntaxe concise pour déterminer si un élément se trouve ou non dans un tableau donné en retournant une valeur booléenne.

```js
[1, 2, 3].includes(3); // true
['apple', 'banana', 'cherry'].includes('apple'); // true
['apple', 'banana', 'cherry'].includes('peach'); // false
```

## Réduction de la pression sur la mémoire lors de l'analyse

[Les récentes modifications du parseur V8](https://code.google.com/p/v8/issues/detail?id=4392) réduisent considérablement la mémoire consommée lors de l'analyse des fichiers comportant de grandes fonctions imbriquées. En particulier, cela permet à V8 d'exécuter des modules asm.js plus grands qu'auparavant.

## API V8

Veuillez consulter notre [résumé des modifications de l'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque sortie majeure. Les développeurs ayant une [version active de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 4.7 -t branch-heads/4.7` pour expérimenter les nouvelles fonctionnalités de la version V8 v4.7. Autrement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et tester bientôt les nouvelles fonctionnalités par vous-même.
