---
title: 'Publication de V8 v9.7'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-11-05
tags:
 - publication
description: 'La version V8 v9.7 introduit de nouvelles méthodes JavaScript pour rechercher à rebours dans les tableaux.'
tweet: ''
---
Toutes les quatre semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du dépôt Git principal de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [V8 version 9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7), qui est en version bêta jusqu'à sa publication en coordination avec Chrome 97 Stable dans quelques semaines. V8 v9.7 regorge de nouvelles fonctionnalités pour les développeurs. Cet article offre un aperçu de certains des points forts attendus lors de la publication.

<!--truncate-->
## JavaScript

### Méthodes de tableau `findLast` et `findLastIndex`

Les méthodes `findLast` et `findLastIndex` sur les `Array` et `TypedArray` permettent de trouver des éléments correspondant à un prédicat à partir de la fin d’un tableau.

Par exemple :

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4 (dernier élément pair)
```

Ces méthodes sont disponibles sans drapeau à partir de la version v9.7.

Pour plus de détails, veuillez consulter notre [explication de la fonctionnalité](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end).

## API V8

Veuillez utiliser `git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h` pour obtenir une liste des modifications de l'API.

Les développeurs disposant d’un dépôt V8 actif peuvent utiliser `git checkout -b 9.7 -t branch-heads/9.7` pour expérimenter les nouvelles fonctionnalités de V8 v9.7. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités vous-même.
