---
title: "Version V8 v9.0"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), en ligne immédiatement"
avatars: 
 - "ingvar-stepanyan"
date: 2021-03-17
tags: 
 - release
description: "Version V8 v9.0 apporte la prise en charge des indices de correspondance RegExp et diverses améliorations de performance."
tweet: "1372227274712494084"
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du maître Git de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [Version V8 9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0), qui est en version bêta jusqu'à sa publication en coordination avec Chrome 90 Stable dans plusieurs semaines. V8 v9.0 regorge de toutes sortes de fonctionnalités intéressantes pour les développeurs. Ce post fournit un aperçu de certains des points forts en prévision de la sortie.

<!--truncate-->
## JavaScript

### Indices de correspondance RegExp

À partir de la version 9.0, les développeurs peuvent choisir de recevoir un tableau des positions de début et de fin des groupes captifs correspondants dans les correspondances d'expressions régulières. Ce tableau est disponible via la propriété `.indices` sur les objets de correspondance lorsque l'expression régulière possède le drapeau `/d`.

```javascript
const re = /(a)(b)/d;      // Notez le drapeau /d.
const m = re.exec('ab');
console.log(m.indices[0]); // Index 0 est la correspondance entière.
// → [0, 2]
console.log(m.indices[1]); // Index 1 est le 1er groupe captif.
// → [0, 1]
console.log(m.indices[2]); // Index 2 est le 2ème groupe captif.
// → [1, 2]
```

Veuillez consulter [notre explicatif](https://v8.dev/features/regexp-match-indices) pour une plongée approfondie.

### Accès plus rapide aux propriétés via `super`

L'accès aux propriétés via `super` (par exemple, `super.x`) a été optimisé en utilisant le système de cache en ligne de V8 et la génération de code optimisée dans TurboFan. Avec ces changements, l'accès aux propriétés via `super` est désormais plus proche de celui des propriétés régulières, comme on peut le voir sur les graphiques ci-dessous.

![Comparer l'accès aux propriétés via super aux propriétés régulières optimisées](/_img/fast-super/super-opt.svg)

Veuillez consulter [le post de blog dédié](https://v8.dev/blog/fast-super) pour plus de détails.

### `for ( async of` interdit

Une [ambiguïté dans la grammaire](https://github.com/tc39/ecma262/issues/2034) a récemment été découverte et [corrigée](https://chromium-review.googlesource.com/c/v8/v8/+/2683221) dans V8 v9.0.

La séquence de jetons `for ( async of` ne sera désormais plus analysée.

## WebAssembly

### Appels JS-vers-Wasm plus rapides

V8 utilise différentes représentations pour les paramètres des fonctions WebAssembly et JavaScript. Pour cette raison, lorsque JavaScript appelle une fonction exportée WebAssembly, l'appel passe par un *wrapper JS-vers-Wasm*, chargé d'adapter les paramètres du côté JavaScript au côté WebAssembly ainsi que d'adapter les résultats dans la direction opposée.

Malheureusement, cela engendre un coût en termes de performances, ce qui signifiait que les appels de JavaScript vers WebAssembly n'étaient pas aussi rapides que les appels de JavaScript vers JavaScript. Pour minimiser cet overhead, le wrapper JS-vers-Wasm peut désormais être intégré sur le site d'appel, simplifiant le code et supprimant ce cadre supplémentaire.

Prenons l'exemple d'une fonction WebAssembly pour ajouter deux nombres à virgule flottante double précision, comme ceci :

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

et supposons que nous appelons cela depuis JavaScript pour additionner des vecteurs (représentés sous forme de tableaux typés) :

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// Échauffement.
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// Mesure.
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

Sur ce micro-benchmark simplifié, nous observons les améliorations suivantes :

![Comparaison de micro-benchmarks](/_img/v8-release-90/js-to-wasm.svg)

La fonctionnalité est encore expérimentale et peut être activée via le drapeau `--turbo-inline-js-wasm-calls`.

Pour plus de détails, voir le [document de conception](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit).

## API V8

Veuillez utiliser `git log branch-heads/8.9..branch-heads/9.0 include/v8.h` pour obtenir une liste des changements d'API.

Les développeurs disposant d'un checkout actif de V8 peuvent utiliser `git checkout -b 9.0 -t branch-heads/9.0` pour expérimenter les nouvelles fonctionnalités de V8 v9.0. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
