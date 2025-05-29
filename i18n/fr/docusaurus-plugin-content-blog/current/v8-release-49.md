---
title: "Publication de V8 v4.9"
author: 'l'équipe V8'
date: 2016-01-26 13:33:37
tags:
  - publication
description: "V8 v4.9 offre une meilleure implémentation de `Math.random` et ajoute la prise en charge de plusieurs nouvelles fonctionnalités du langage ES2015."
---
Environ toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du master Git de V8 juste avant que Chrome ne branche pour une étape de la version Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre dernière branche, [V8 version 4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9), qui sera en version beta jusqu'à sa publication en tandem avec la version Stable de Chrome 49. V8 4.9 est rempli de nombreuses nouveautés pour les développeurs, alors nous souhaitons vous présenter un aperçu des points forts en vue de la sortie dans quelques semaines.

<!--truncate-->
## 91% de prise en charge ECMAScript 2015 (ES6)

Dans la version V8 4.9, nous avons expédié plus de fonctionnalités JavaScript ES2015 que dans toutes les versions précédentes, atteignant ainsi 91% de finalisation selon le tableau de compatibilité [Kangax](https://kangax.github.io/compat-table/es6/) (au 26 janvier). V8 prend désormais en charge la déstructuration, les paramètres par défaut, les objets Proxy et l'API Reflect. La version 4.9 permet également aux constructions de niveau bloc telles que `class` et `let` d'être disponibles en dehors du mode strict et ajoute la prise en charge du drapeau sticky pour les expressions régulières ainsi que la personnalisation de la sortie de `Object.prototype.toString`.

### Déstructuration

Les déclarations de variables, paramètres et affectations prennent désormais en charge la [déstructuration](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) des objets et tableaux via des motifs. Par exemple:

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

Les motifs de tableau peuvent contenir des motifs restants qui sont attribués au reste du tableau:

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

De plus, les éléments de motif peuvent avoir des valeurs par défaut, utilisées lorsque la propriété correspondante ne trouve pas de correspondance:

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// ou…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

La déstructuration peut être utilisée pour rendre l'accès aux données des objets et tableaux plus concis.

### Proxies & Reflect

Après des années de développement, V8 propose maintenant une implémentation complète des [proxies](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy), conforme à la spécification ES2015. Les proxies sont un mécanisme puissant pour virtualiser les objets et fonctions grâce à un ensemble de hooks fournis par le développeur pour personnaliser les accès aux propriétés. En plus de la virtualisation des objets, les proxies peuvent être utilisés pour implémenter l'interception, ajouter une validation de définition des propriétés, simplifier le débogage et le profilage, et débloquer des abstractions avancées telles que les [membranes](http://tvcutsem.github.io/js-membranes/).

Pour proxifier un objet, il faut créer un objet de gestionnaire qui définit divers pièges et l’appliquer à l’objet cible que le proxy virtualise:

```js
const target = {};
const handler = {
  get(target, name='world') {
    return `Bonjour, ${name}!`;
  }
};

const foo = new Proxy(target, handler);
foo.bar;
// → 'Bonjour, bar!'
```

L'objet Proxy est accompagné du module Reflect, qui définit des valeurs par défaut appropriées pour tous les pièges des proxies:

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`Débogage: appel de get pour le champ: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`Débogage: appel de set pour le champ: ${name}, et valeur: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = 'John Doe';
// Débogage: appel de set pour le champ: name, et valeur: John Doe
const title = `Monsieur ${debugMe.name}`; // → 'Monsieur John Doe'
// Débogage: appel de get pour le champ: name
```

Pour plus d'informations sur l'utilisation des Proxies et de l'API Reflect, consultez la section d'exemples de la [page Proxy de MDN](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Exemples).

### Paramètres par défaut

En ES5 et versions antérieures, les paramètres optionnels dans les définitions de fonctions nécessitaient un code standard pour vérifier si les paramètres étaient indéfinis:

```js
function sublist(list, start, end) {
  if (typeof start === 'undefined') start = 0;
  if (typeof end === 'undefined') end = list.length;
  ...
}
```

ES2015 permet désormais aux paramètres de fonction d'avoir des [valeurs par défaut](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Functions/Default_parameters), offrant des définitions de fonction plus claires et plus succinctes:

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

Les paramètres par défaut et la déstructuration peuvent bien sûr être combinés :

```js
function vector([x, y, z] = []) { … }
```

### Classes et déclarations lexicales en mode non strict

V8 prend en charge les déclarations lexicales (`let`, `const`, `function` locale au bloc) et les classes depuis les versions 4.1 et 4.2 respectivement, mais jusqu'à présent, le mode strict était requis pour les utiliser. À partir de la version 4.9 de V8, toutes ces fonctionnalités sont désormais activées en dehors du mode strict également, conformément à la spécification ES2015. Cela rend le prototypage dans la console DevTools beaucoup plus facile, même si nous encourageons les développeurs à adopter le mode strict pour du nouveau code.

### Expressions régulières

V8 prend désormais en charge le nouveau [drapeau sticky](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/RegExp/sticky) sur les expressions régulières. Le drapeau 'sticky' active ou désactive le démarrage de la recherche dans les chaînes à partir du début de la chaîne (normal) ou à partir de la propriété `lastIndex` (sticky). Ce comportement est utile pour analyser efficacement de longues chaînes d'entrée avec de nombreuses expressions régulières différentes. Pour activer la recherche sticky, ajoutez le drapeau `y` à une regex : (par ex. `const regex = /foo/y;`).

### Sortie personnalisable de `Object.prototype.toString`

À l'aide de `Symbol.toStringTag`, les types définis par l'utilisateur peuvent désormais retourner une sortie personnalisée lorsqu'ils sont passés à `Object.prototype.toString` (soit directement, soit en résultat d'une coercition de chaîne) :

```js
class Custom {
  get [Symbol.toStringTag]() {
    return 'Personnalisé';
  }
}
Object.prototype.toString.call(new Custom);
// → '[object Personnalisé]'
String(new Custom);
// → '[object Personnalisé]'
```

## Amélioration de `Math.random()`

V8 v4.9 inclut une amélioration dans l'implémentation de `Math.random()`. [Comme annoncé le mois dernier](/blog/math-random), nous avons remplacé l'algorithme PRNG de V8 par [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) pour fournir une pseudo-aléatoire de meilleure qualité.

## API V8

Veuillez consulter notre [résumé des changements de l'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque mise à jour majeure.

Les développeurs disposant d'une [version active de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 4.9 -t branch-heads/4.9` pour expérimenter les nouvelles fonctionnalités de V8 v4.9. Alternativement, vous pouvez vous abonner au [canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
