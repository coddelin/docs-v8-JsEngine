---
title: &apos;Publication de V8 version v4.5&apos;
author: &apos;l&apos;équipe V8&apos;
date: 2015-07-17 13:33:37
tags:
  - publication
description: &apos;V8 v4.5 apporte des améliorations de performance et ajoute la prise en charge de plusieurs fonctionnalités ES2015.&apos;
---
Environ toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du maître de Git V8 juste avant que Chrome ne crée une branche pour une version bêta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre toute dernière branche, [V8 version 4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5), qui sera en version bêta jusqu'à sa sortie en coordination avec Chrome 45 Stable. V8 v4.5 regorge de fonctionnalités utiles pour les développeurs, et nous souhaitons vous donner un aperçu de certains des points forts en attendant la sortie dans quelques semaines.

<!--truncate-->
## Amélioration du support ECMAScript 2015 (ES6)

V8 v4.5 ajoute la prise en charge de plusieurs fonctionnalités [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/).

### Fonctions fléchées

Avec l'aide des [Fonctions fléchées](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Functions/Fonctions_fl%C3%A9ch%C3%A9es), il est possible d'écrire un code plus compact.

```js
const data = [0, 1, 3];
// Code sans Fonctions fléchées
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// Code avec Fonctions fléchées
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

La liaison lexicale de &apos;this&apos; est un autre avantage majeur des fonctions fléchées. Par conséquent, l'utilisation de callbacks dans les méthodes devient beaucoup plus facile.

```js
class MyClass {
  constructor() { this.a = &apos;Bonjour, &apos;; }
  hello() { setInterval(() => console.log(this.a + &apos;le monde!&apos;), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### Fonctions pour tableaux/Tableaux typés

Toutes les nouvelles méthodes sur les [Tableaux et Tableaux typés](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Array#Méthodes) spécifiées dans ES2015 sont désormais prises en charge dans V8 v4.5. Elles rendent le travail avec les tableaux et tableaux typés plus pratique. Parmi les méthodes ajoutées figurent `Array.from` et `Array.of`. Des méthodes qui reflètent la plupart des méthodes `Array` pour chaque type de tableau typé ont également été ajoutées.

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Object/assign) permet aux développeurs de fusionner et cloner rapidement des objets.

```js
const target = { a: &apos;Bonjour, &apos; };
const source = { b: &apos;monde!&apos; };
// Fusion des objets.
Object.assign(target, source);
console.log(target.a + target.b);
```

Cette fonctionnalité peut également être utilisée pour mélanger des fonctionnalités.

## Plus de fonctionnalités JavaScript deviennent “optimisables”

Pendant de nombreuses années, le compilateur optimisant traditionnel de V8, [Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), a fait un excellent travail en optimisant de nombreux motifs JavaScript courants. Cependant, il n'a jamais eu la capacité de prendre en charge l'intégralité du langage JavaScript, et l'utilisation de certaines fonctionnalités linguistiques dans une fonction — telles que `try`/`catch` et `with` — empêchait son optimisation. V8 devait revenir à son compilateur de base plus lent pour cette fonction.

L'un des objectifs de conception du nouveau compilateur optimisant de V8, [TurboFan](/blog/turbofan-jit), est de pouvoir éventuellement optimiser tout JavaScript, y compris les fonctionnalités ECMAScript 2015. Dans V8 v4.5, nous avons commencé à utiliser TurboFan pour optimiser certaines des fonctionnalités linguistiques non prises en charge par Crankshaft : `for`-`of`, `class`, `with`, et les noms de propriétés calculés.

Voici un exemple de code utilisant &apos;for-of&apos;, qui peut maintenant être compilé par TurboFan :

```js
const sequence = [&apos;Premier&apos;, &apos;Deuxième&apos;, &apos;Troisième&apos;];
for (const value of sequence) {
  // Ce scope est maintenant optimisable.
  const object = {a: &apos;Bonjour, &apos;, b: &apos;monde!&apos;, c: value};
  console.log(object.a + object.b + object.c);
}
```

Bien que les fonctions utilisant initialement ces fonctionnalités linguistiques n'atteindront pas les mêmes performances maximales que d'autres codes compilés par Crankshaft, TurboFan peut désormais les accélérer bien au-delà de notre compilateur de base actuel. Encore mieux, les performances continueront à s'améliorer rapidement à mesure que nous développerons plus d'optimisations pour TurboFan.

## API V8

Veuillez consulter notre [résumé des changements d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque version majeure.

Les développeurs avec une [copie locale active de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 4.5 -t branch-heads/4.5` pour expérimenter les nouvelles fonctionnalités de V8 v4.5. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt vous-même les nouvelles fonctionnalités.
