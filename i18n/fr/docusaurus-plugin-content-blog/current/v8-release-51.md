---
title: "Sortie de V8 version v5.1"
author: 'l'équipe V8'
date: 2016-04-23 13:33:37
tags:
  - sortie
description: 'V8 v5.1 offre des améliorations de performance, une réduction des saccades et de la consommation de mémoire, ainsi qu'un support accru des fonctionnalités du langage ECMAScript.'
---
La première étape du [processus de sortie](/docs/release-process) de V8 consiste à créer une nouvelle branche à partir du master Git immédiatement avant que Chromium ne branche pour une version Beta de Chrome (environ toutes les six semaines). Notre toute dernière branche est [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1), qui restera en version bêta jusqu'à ce que nous publions une version stable en conjonction avec Chrome 51 Stable. Voici un aperçu des nouvelles fonctionnalités destinées aux développeurs dans cette version de V8.

<!--truncate-->
## Meilleur support ECMAScript

V8 v5.1 contient un certain nombre de changements visant à se conformer au brouillon de spécification ES2017.

### `Symbol.species`

Les méthodes de tableau comme `Array.prototype.map` construisent des instances de la sous-classe comme sortie, avec la possibilité de personnaliser cela en changeant [`Symbol.species`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Symbol/species). Des modifications analogues sont apportées à d'autres classes intégrées.

### Personnalisation de `instanceof`

Les constructeurs peuvent implémenter leur propre méthode [`Symbol.hasInstance`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Symbol#Autres_symboles), qui remplace le comportement par défaut.

### Fermeture des itérateurs

Les itérateurs créés dans le cadre d'une boucle [`for`-`of`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Instructions/for...of) (ou d'autres itérations intégrées, comme l'opérateur [spread](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Opérateurs/Spread_operator)) sont maintenant vérifiés pour une méthode de clôture appelée si la boucle se termine prématurément. Cela peut être utilisé pour nettoyer après la fin de l'itération.

### Sous-classement de `RegExp` avec la méthode `exec`

Les sous-classes de `RegExp` peuvent remplacer la méthode `exec` pour modifier uniquement l'algorithme de correspondance principal, avec la garantie que cela sera appelé par les fonctions de niveau supérieur comme `String.prototype.replace`.

### Inférence du nom des fonctions

Les noms de fonctions déduits pour les expressions de fonction sont désormais généralement disponibles dans la propriété [`name`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Function/name) des fonctions, selon la formalisation ES2015 de ces règles. Cela peut modifier les traces d'appels existantes et fournir des noms différents des versions précédentes de V8. Cela donne également des noms utiles aux propriétés et méthodes avec des noms de propriétés calculés :

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

Analogiquement à d'autres types de collections, la méthode [`values`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Array/values) sur `Array` renvoie un itérateur sur les contenus du tableau.

## Améliorations de performance

V8 v5.1 apporte également quelques améliorations notables de performance aux fonctionnalités JavaScript suivantes :

- Exécution de boucles comme `for`-`in`
- `Object.assign`
- Instanciation de Promise et RegExp
- Appels à `Object.prototype.hasOwnProperty`
- `Math.floor`, `Math.round`, et `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` & `Array.prototype.toString`
- Aplatissement de chaînes répétées, par exemple `'.'.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1 inclut un support préliminaire pour [WebAssembly](/blog/webassembly-experimental). Vous pouvez l'activer via le flag `--expose_wasm` dans `d8`. Vous pouvez également tester les [démos Wasm](https://webassembly.github.io/demo/) avec Chrome 51 (Canal Beta).

## Mémoire

V8 a implémenté davantage de fragments d'[Orinoco](/blog/orinoco) :

- Évacuation parallèle de la jeune génération
- Ensembles mémorisés scalables
- Allocation noire

L'impact est une réduction des saccades et de la consommation de mémoire en cas de besoin.

## API de V8

Veuillez consulter notre [résumé des changements d'API](https://bit.ly/v8-api-changes). Ce document est régulièrement mis à jour quelques semaines après chaque version majeure.

Les développeurs ayant un [dépôt actif de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.1 -t branch-heads/5.1` pour expérimenter les nouvelles fonctionnalités de V8 v5.1. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et tester bientôt vous-même les nouvelles fonctionnalités.
