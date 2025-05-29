---
title: "Publication de V8 version v6.9"
author: 'l'équipe V8'
date: 2018-08-07 13:33:37
tags:
  - publication
description: 'V8 v6.9 propose une réduction de l'utilisation de la mémoire grâce aux fonctions intégrées embarquées, un démarrage plus rapide de WebAssembly avec Liftoff, de meilleures performances pour DataView et WeakMap, et bien plus encore !'
tweet: "1026825606003150848"
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est issue de la branche master de V8 juste avant une étape Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [V8 version 6.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9), actuellement en version bêta jusqu’à sa publication en coordination avec Chrome 69 Stable dans quelques semaines. V8 v6.9 propose de nombreuses nouveautés pour les développeurs. Ce post fournit un aperçu de certaines des caractéristiques en prévision de la publication.

<!--truncate-->
## Économies de mémoire grâce aux fonctions intégrées embarquées

V8 est livré avec une vaste bibliothèque de fonctions intégrées. Cela inclut les méthodes sur les objets intégrés comme `Array.prototype.sort` et `RegExp.prototype.exec`, mais aussi une large gamme de fonctionnalités internes. Comme leur génération prend beaucoup de temps, les fonctions intégrées sont compilées au moment de la construction et sérialisées dans un [snapshot](/blog/custom-startup-snapshots), qui est ensuite désérialisé au moment du runtime pour créer l'état initial du tas JavaScript.

Les fonctions intégrées consomment actuellement 700 KB dans chaque Isolate (un Isolate correspond, en gros, à un onglet de navigateur dans Chrome). Cela est assez coûteux, et l'année dernière, nous avons commencé à travailler sur la réduction de cet overhead. Dans la version 6.4 de V8, nous avons introduit la [désérialisation paresseuse](/blog/lazy-deserialization), garantissant que chaque Isolate ne paye que pour les fonctions intégrées dont il a réellement besoin (mais chaque Isolate disposait encore de sa propre copie).

Les [fonctions intégrées embarquées](/blog/embedded-builtins) vont encore plus loin. Une fonction intégrée embarquée est partagée par tous les Isolates, et intégrée directement dans le binaire lui-même au lieu d'être copiée sur le tas JavaScript. Cela signifie que les fonctions intégrées existent en mémoire une seule fois, quel que soit le nombre d'Isolates en cours d'exécution, une propriété particulièrement utile maintenant que [l’isolation de site](https://developers.google.com/web/updates/2018/07/site-isolation) est activée par défaut. Avec les fonctions intégrées embarquées, nous avons constaté une réduction médiane de _9 % de la taille du tas V8_ sur les 10 000 principaux sites web sur x64. Parmi ces sites, 50 % économisent au moins 1,2 MB, 30 % économisent au moins 2,1 MB, et 10 % économisent 3,7 MB ou plus.

La version 6.9 de V8 prend en charge les fonctions intégrées embarquées sur les plateformes x64. D'autres plateformes suivront bientôt dans les prochaines versions. Pour plus de détails, consultez notre [article de blog dédié](/blog/embedded-builtins).

## Performances

### Liftoff, le nouveau compilateur de premier niveau de WebAssembly

WebAssembly a obtenu un nouveau compilateur de base pour un démarrage beaucoup plus rapide des sites Web complexes avec de grands modules WebAssembly (comme Google Earth et AutoCAD). Selon le matériel, nous constatons des accélérations supérieures à 10×. Pour plus de détails, consultez [l'article détaillé sur Liftoff](/blog/liftoff).

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo de Liftoff, le compilateur de base de V8 pour WebAssembly</figcaption>
</figure>

### Opérations `DataView` plus rapides

[`DataView`](https://tc39.es/ecma262/#sec-dataview-objects) méthodes ont été réimplémentées dans V8 Torque, ce qui évite un appel coûteux à C++ par rapport à l'implémentation runtime précédente. De plus, nous intégrons désormais les appels aux méthodes `DataView` lors de la compilation du code JavaScript dans TurboFan, ce qui permet d'obtenir des performances maximales optimales pour les codes fréquemment utilisés. L'utilisation de `DataView` est désormais aussi efficace que celle de `TypedArray`, ce qui rend enfin `DataView` un choix viable dans les situations critiques de performance. Nous couvrirons cela plus en détail dans un prochain article de blog sur `DataView`, alors restez à l'écoute !

### Traitement plus rapide des `WeakMap` lors du garbage collection

V8 v6.9 réduit les temps de pause du garbage collection Mark-Compact en améliorant le traitement des `WeakMap`. Le marquage concurrent et incrémental est désormais capable de traiter les `WeakMap`, alors que précédemment tout ce travail était effectué pendant la pause atomique finale de Mark-Compact GC. Étant donné que tout le travail ne peut pas être déplacé en dehors de la pause, le GC effectue désormais plus de tâches en parallèle pour réduire encore les temps de pause. Ces optimisations ont essentiellement divisé par deux le temps moyen de pause pour les GC Mark-Compact dans [le benchmark Web Tooling](https://github.com/v8/web-tooling-benchmark).

`WeakMap` utilise un algorithme d'itération à point fixe qui peut se dégrader en un comportement de temps d'exécution quadratique dans certains cas. Avec la nouvelle version, V8 peut désormais passer à un autre algorithme qui garantit une fin en temps linéaire si le GC ne se termine pas après un certain nombre d'itérations. Auparavant, des exemples de cas extrêmes pouvaient être construits où le GC mettait quelques secondes à terminer même avec un tas relativement petit, tandis que l'algorithme linéaire termine en quelques millisecondes.

## Fonctionnalités du langage JavaScript

V8 v6.9 prend en charge [`Array.prototype.flat` et `Array.prototype.flatMap`](/features/array-flat-flatmap).

`Array.prototype.flat` aplatie un tableau donné de manière récursive jusqu'à la profondeur spécifiée, qui par défaut est à `1`:

```js
// Aplatir un niveau :
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// Aplatir récursivement jusqu'à ce que le tableau ne contienne plus de tableaux imbriqués :
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap` est similaire à `Array.prototype.map`, sauf qu'il aplatie le résultat dans un nouveau tableau.

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

Pour plus de détails, consultez [notre explicatif sur `Array.prototype.{flat,flatMap}`](/features/array-flat-flatmap).

## API V8

Veuillez utiliser `git log branch-heads/6.8..branch-heads/6.9 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs avec un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.9 -t branch-heads/6.9` pour expérimenter les nouvelles fonctionnalités de V8 v6.9. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités par vous-même prochainement.
