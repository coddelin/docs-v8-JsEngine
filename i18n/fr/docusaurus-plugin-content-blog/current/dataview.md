---
title: "Amélioration des performances de `DataView` dans V8"
author: 'Théotime Grohens, <i lang="fr">le savant de Data-Vue</i>, et Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), professionnel de la performance'
avatars:
  - "benedikt-meurer"
date: 2018-09-18 11:20:37
tags:
  - ECMAScript
  - benchmarks
description: 'V8 v6.9 comble l'écart de performance entre DataView et le code équivalent TypedArray, rendant ainsi DataView utilisable pour des applications réelles critiques en termes de performance.'
tweet: "1041981091727466496"
---
[`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) est l'une des deux manières possibles de réaliser des accès mémoire à bas niveau en JavaScript, l'autre étant [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray). Jusqu'à présent, les `DataView` étaient beaucoup moins optimisés que les `TypedArray` dans V8, ce qui entraînait de moins bonnes performances dans des tâches comme les charges de travail intensives en graphismes ou lors du décodage/encodage de données binaires. Les raisons de cela étaient principalement des choix historiques, comme le fait que [asm.js](http://asmjs.org/) avait opté pour les `TypedArray` au lieu des `DataView`, incitant ainsi les moteurs à se concentrer sur les performances des `TypedArray`.

<!--truncate-->
En raison de cette pénalité de performance, des développeurs JavaScript tels que l'équipe Google Maps ont décidé d'éviter les `DataView` et de se reposer sur les `TypedArray` à la place, au prix d'une complexité accrue du code. Cet article explique comment nous avons amélioré les performances de `DataView` pour correspondre — et même surpasser — celles du code équivalent `TypedArray` dans [V8 v6.9](/blog/v8-release-69), rendant ainsi `DataView` utilisable pour des applications réelles critiques en termes de performance.

## Contexte

Depuis l'introduction de ES2015, JavaScript permet de lire et écrire des données dans des tampons binaires bruts appelés [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer). Les `ArrayBuffer` ne peuvent pas être directement accessibles ; les programmes doivent utiliser ce qu'on appelle un objet *array buffer view* qui peut être soit un `DataView` soit un `TypedArray`.

Les `TypedArray` permettent aux programmes d'accéder au tampon sous forme de tableau de valeurs uniformément typées, comme un `Int16Array` ou un `Float32Array`.

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

D'un autre côté, les `DataView` permettent un accès aux données plus précis. Ils permettent au programmeur de choisir le type de valeurs lues ou écrites dans le tampon en fournissant des getters et setters spécialisés pour chaque type de nombre, les rendant utiles pour la sérialisation des structures de données.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // Résultat attendu : 42
console.log(view.getFloat64(1)); // Résultat attendu : 1.76
```

De plus, les `DataView` permettent aussi de choisir l'endianness du stockage des données, ce qui peut être utile lors de la réception de données provenant de sources externes, telles que le réseau, un fichier ou un GPU.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // Écriture en little-endian.
console.log(view.getInt32(0, false)); // Lecture en big-endian.
// Résultat attendu : 0x0DF0AD8B (233876875)
```

Une implémentation efficace de `DataView` était attendue depuis longtemps (voir [ce rapport de bug](https://bugs.chromium.org/p/chromium/issues/detail?id=225811) datant d'il y a plus de 5 ans), et nous sommes heureux d'annoncer que les performances de DataView sont maintenant à la hauteur !

## Implémentation héritée au runtime

Jusqu'à récemment, les méthodes `DataView` étaient mises en œuvre sous forme de fonctions runtime intégrées en C++ dans V8. Cela est très coûteux, car chaque appel nécessitait une transition coûteuse entre JavaScript et C++ (et retour).

Afin d'étudier le coût réel en termes de performances engendré par cette implémentation, nous avons configuré un benchmark de performance qui compare l'implémentation native getter de `DataView` à un wrapper JavaScript simulant le comportement de `DataView`. Ce wrapper utilise un `Uint8Array` pour lire les données octet par octet à partir du tampon sous-jacent, puis calcule la valeur de retour à partir de ces octets. Voici, par exemple, la fonction pour lire des valeurs entières non signées 32 bits en little-endian :

```js
function LittleEndian(buffer) { // Simule les lectures little-endian de DataView.
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

`TypedArray`s sont déjà fortement optimisés dans V8, donc ils représentent l'objectif de performance que nous voulions atteindre.

![Performance originale de `DataView`](/_img/dataview/dataview-original.svg)

Notre benchmark montre que la performance des accesseurs natifs de `DataView` était jusqu'à **4 fois** plus lente que celle du wrapper basé sur `Uint8Array`, pour les lectures en big-endian et en little-endian.

## Amélioration des performances de base

Notre première étape pour améliorer la performance des objets `DataView` a été de déplacer l'implémentation du runtime C++ vers le [`CodeStubAssembler` (également connu sous le nom de CSA)](/blog/csa). CSA est un langage d'assemblage portable qui nous permet d'écrire du code directement dans la représentation intermédiaire au niveau machine (IR) de TurboFan, et nous l'utilisons pour implémenter des parties optimisées de la bibliothèque standard JavaScript de V8. Réécrire le code en CSA contourne complètement l'appel au C++, et génère également du code machine efficace en exploitant le backend de TurboFan.

Cependant, écrire du code CSA à la main est fastidieux. Le flux de contrôle dans CSA s'exprime de manière similaire à celle de l'assemblage, en utilisant des labels explicites et des `goto`, ce qui rend le code plus difficile à lire et à comprendre rapidement.

Pour faciliter la contribution des développeurs à la bibliothèque standard JavaScript optimisée dans V8, et pour améliorer la lisibilité et la maintenabilité, nous avons commencé à concevoir un nouveau langage appelé V8 *Torque*, qui se compile en CSA. L'objectif de *Torque* est d'abstraire les détails de bas niveau qui rendent le code CSA plus difficile à écrire et à maintenir, tout en conservant le même profil de performance.

Réécrire le code de `DataView` était une excellente occasion de commencer à utiliser Torque pour du nouveau code, et cela a permis aux développeurs de Torque de recevoir de nombreux commentaires sur le langage. Voici à quoi ressemble la méthode `getUint32()` de `DataView`, écrite en Torque :

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

Le passage des méthodes `DataView` à Torque a déjà montré une amélioration de performance de **3×**, mais n'égalait pas encore les performances du wrapper basé sur `Uint8Array`.

![Performance de `DataView` avec Torque](/_img/dataview/dataview-torque.svg)

## Optimisation pour TurboFan

Lorsque le code JavaScript devient critique, nous le compilons en utilisant notre compilateur optimisant TurboFan, afin de générer du code machine hautement optimisé qui s'exécute plus efficacement que le bytecode interprété.

TurboFan fonctionne en traduisant le code JavaScript entrant en une représentation graphique interne (plus précisément, [une « mer de nœuds »](https://darksi.de/d.sea-of-nodes/)). Il commence par des nœuds de haut niveau correspondant aux opérations et à la sémantique de JavaScript, et les affine progressivement en des nœuds de plus en plus bas niveau, jusqu'à ce qu'il génère finalement du code machine.

En particulier, un appel de fonction, comme l'appel à l'une des méthodes de `DataView`, est représenté en interne comme un nœud `JSCall`, qui se traduit finalement par un appel de fonction réel dans le code machine généré.

Cependant, TurboFan nous permet de vérifier si le nœud `JSCall` est réellement un appel à une fonction connue, par exemple l'une des fonctions intégrées, et d'intégrer ce nœud dans l'IR. Cela signifie que le nœud compliqué `JSCall` est remplacé au moment de la compilation par un sous-graphe représentant la fonction. Cela permet à TurboFan d'optimiser l'intérieur de la fonction lors de passes ultérieures dans un contexte plus large, au lieu de l'optimiser de manière isolée, et surtout de se débarrasser de l'appel de fonction coûteux.

![Performance initiale de TurboFan pour `DataView`](/_img/dataview/dataview-turbofan-initial.svg)

La mise en œuvre de l'inlining dans TurboFan nous a finalement permis d'égaler, voire de dépasser, les performances de notre wrapper `Uint8Array`, et d'être **8 fois** plus rapide que l'ancienne implémentation en C++.

## Optimisations supplémentaires avec TurboFan

En examinant le code machine généré par TurboFan après l'inlining des méthodes `DataView`, il y avait encore un potentiel d'amélioration. La première implémentation de ces méthodes essayait de suivre de près la norme, et levait des erreurs lorsque le spéc indique de le faire (par exemple, lorsqu'on tente de lire ou d'écrire hors des limites du `ArrayBuffer` sous-jacent).

Cependant, le code que nous écrivons dans TurboFan est conçu pour être optimisé afin d’être aussi rapide que possible pour les cas courants et fréquents — il n’a pas besoin de gérer tous les cas limites possibles. En retirant tout le traitement complexe de ces erreurs, et en redéveloppant simplement vers l’implémentation Torque de base lorsque nous devons générer une exception, nous avons pu réduire la taille du code généré d'environ 35 %, ce qui génère une accélération assez notable, ainsi qu’un code TurboFan considérablement plus simple.

Dans le prolongement de cette idée de spécialisation maximale dans TurboFan, nous avons également supprimé la prise en charge d’indices ou décalages trop importants (hors de la plage Smi) dans le code optimisé TurboFan. Cela nous a permis de nous débarrasser de la gestion de l’arithmétique float64 nécessaire pour les décalages qui ne tiennent pas dans une valeur 32 bits, et d’éviter le stockage de grands entiers dans le tas.

Comparé à l’implémentation initiale de TurboFan, cela a plus que doublé le score du benchmark `DataView`. Les `DataView` sont maintenant jusqu’à 3 fois plus rapides que le wrapper `Uint8Array`, et environ **16 fois plus rapides** que notre implémentation originale de `DataView` !

![Performance finale de TurboFan `DataView`](/_img/dataview/dataview-turbofan-final.svg)

## Impact

Nous avons évalué l’impact de cette nouvelle implémentation sur des exemples concrets, en plus de notre propre benchmark.

Les `DataView` sont souvent utilisés pour décoder des données encodées dans des formats binaires depuis JavaScript. Un tel format binaire est [FBX](https://en.wikipedia.org/wiki/FBX), un format utilisé pour échanger des animations 3D. Nous avons instrumenté le chargeur FBX de la populaire bibliothèque JavaScript 3D [three.js](https://threejs.org/) et mesuré une réduction de 10% (environ 80 ms) de son temps d’exécution.

Nous avons comparé la performance globale des `DataView` par rapport aux `TypedArray`. Nous avons constaté que notre nouvelle implémentation de `DataView` offre presque les mêmes performances que les `TypedArray` lors de l'accès à des données alignées selon la disposition d'octets native (petit-boutien sur les processeurs Intel), comblant une grande partie de l'écart de performance et rendant les `DataView` un choix pratique dans V8.

![Performance maximale `DataView` vs `TypedArray`](/_img/dataview/dataview-vs-typedarray.svg)

Nous espérons que vous pourrez désormais commencer à utiliser les `DataView` là où cela fait sens, au lieu de vous appuyer sur des adaptations `TypedArray`. Veuillez nous envoyer vos retours sur vos utilisations de `DataView` ! Vous pouvez nous joindre [via notre système de suivi des bugs](https://crbug.com/v8/new), par mail à v8-users@googlegroups.com, ou via [@v8js sur Twitter](https://twitter.com/v8js).
