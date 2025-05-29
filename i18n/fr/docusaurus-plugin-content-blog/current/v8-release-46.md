---
title: 'Version V8 v4.6'
author: 'l’équipe V8'
date: 2015-08-28 13:33:37
tags:
  - version
description: 'V8 v4.6 offre moins de saccades et prend en charge les nouvelles fonctionnalités linguistiques d’ES2015.'
---
Environ toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de version](https://v8.dev/docs/release-process). Chaque version est dérivée de la branche master de Git V8 immédiatement avant que Chrome ne crée une branche pour une étape bêta de Chrome. Aujourd'hui, nous sommes heureux d’annoncer notre toute nouvelle branche, [V8 version 4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6), qui sera en bêta jusqu’à sa sortie coordonnée avec Chrome 46 Stable. V8 4.6 est rempli de nombreuses fonctionnalités utiles aux développeurs, nous aimerions donc vous donner un aperçu de certains points forts en prévision de la sortie dans quelques semaines.

<!--truncate-->
## Amélioration de la prise en charge d’ECMAScript 2015 (ES6)

V8 v4.6 prend en charge plusieurs fonctionnalités d’[ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/).

### Opérateur de décomposition

L’[opérateur de décomposition](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator) rend le travail avec les tableaux beaucoup plus pratique. Par exemple, il rend le code impératif obsolète lorsque vous souhaitez simplement fusionner des tableaux.

```js
// Fusion de tableaux
// Code sans opérateur de décomposition
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// Code avec opérateur de décomposition
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

Un autre bon usage de l’opérateur de décomposition pour remplacer `apply` :

```js
// Paramètres de fonction stockés dans un tableau
// Code sans opérateur de décomposition
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = ['Salut ', 'Opérateur de ', 'décomposition !'];
myFunction.apply(null, argsInArray);

// Code avec opérateur de décomposition
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = ['Salut ', 'Opérateur de ', 'décomposition !'];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target) est l’une des fonctionnalités d’ES6 conçues pour améliorer le travail avec les classes. En réalité, c’est un paramètre implicite pour chaque fonction. Si une fonction est appelée avec le mot-clé new, alors le paramètre contient une référence à la fonction appelée. Si new n’est pas utilisé, le paramètre est undefined.

En pratique, cela signifie que vous pouvez utiliser new.target pour savoir si une fonction a été appelée normalement ou en tant que constructeur via le mot-clé new.

```js
function myFunction() {
  if (new.target === undefined) {
    throw 'Essayez de l’appeler avec new.';
  }
  console.log('Ça marche !');
}

// Ne fonctionne pas :
myFunction();

// Fonctionne :
const a = new myFunction();
```

Lorsque les classes et les héritages ES6 sont utilisés, new.target dans le constructeur d’une super-classe est lié au constructeur dérivé qui a été appelé avec new. En particulier, cela donne aux super-classes un accès au prototype de la classe dérivée pendant la construction.

## Réduction des saccades

Les [saccades](https://en.wiktionary.org/wiki/jank#Noun) peuvent être pénibles, surtout lorsque vous jouez à un jeu. Souvent, c’est encore pire lorsque le jeu implique plusieurs joueurs. [oortonline.gl](http://oortonline.gl/) est un benchmark WebGL qui teste les limites des navigateurs actuels en rendant une scène 3D complexe avec des effets de particules et un rendu de shaders modernes. L’équipe V8 s’est lancée dans une quête pour repousser les limites des performances de Chrome dans ces environnements. Nous n’en avons pas encore fini, mais les fruits de nos efforts commencent déjà à porter leurs fruits. Chrome 46 montre des avancées incroyables dans les performances d’oortonline.gl que vous pouvez voir par vous-même ci-dessous.

Certaines des optimisations incluent :

- [Améliorations des performances de TypedArray](https://code.google.com/p/v8/issues/detail?id=3996)
    - Les TypedArrays sont largement utilisés dans les moteurs de rendu tels que Turbulenz (le moteur derrière oortonline.gl). Par exemple, les moteurs créent souvent des tableaux typés (tels que Float32Array) en JavaScript et les passent à WebGL après avoir appliqué des transformations.
    - L’aspect clé était d’optimiser l’interaction entre l’intégrateur (Blink) et V8.
- [Améliorations des performances lors du passage de TypedArrays et d’autres mémoires de V8 à Blink](https://code.google.com/p/chromium/issues/detail?id=515795)
    - Il n’est pas nécessaire de créer des poignées supplémentaires (également suivies par V8) pour les tableaux typés lorsqu’ils sont passés à WebGL dans le cadre d’une communication unidirectionnelle.
    - En atteignant les limites de mémoire allouée externe (Blink), nous lançons maintenant une collecte des ordures incrémentielle au lieu d’une complète.
- [Planification de la collecte des ordures pendant les temps d’inactivité](/blog/free-garbage-collection)
    - Les opérations de collecte des ordures sont planifiées pendant les périodes d’inactivité sur le thread principal, ce qui débloque le compositeur et donne lieu à un rendu plus fluide.
- [Balayage simultané activé pour l'ensemble de la génération ancienne du tas collecté par le garbage collector](https://code.google.com/p/chromium/issues/detail?id=507211)
    - La libération des morceaux de mémoire inutilisés est effectuée sur des threads supplémentaires simultanément au thread principal, ce qui réduit considérablement le temps de pause principal de la collecte de déchets.

La bonne nouvelle est que toutes les modifications liées à oortonline.gl sont des améliorations générales qui affectent potentiellement tous les utilisateurs des applications qui utilisent fortement WebGL.

## API V8

Veuillez consulter notre [résumé des changements d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque version majeure.

Les développeurs avec un [checkout V8 actif](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 4.6 -t branch-heads/4.6` pour tester les nouvelles fonctionnalités de V8 v4.6. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités par vous-même prochainement.
