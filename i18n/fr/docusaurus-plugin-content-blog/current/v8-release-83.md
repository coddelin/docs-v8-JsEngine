---
title: 'Sortie de V8 v8.3'
author: '[Victor Gomes](https://twitter.com/VictorBFG), travaillant en toute sécurité depuis chez lui'
avatars:
 - 'victor-gomes'
date: 2020-05-04
tags:
 - sortie
description: 'V8 v8.3 inclut des ArrayBuffers plus rapides, des mémoires Wasm plus grandes et des API obsolètes.'
tweet: '1257333120115847171'
---

Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](https://v8.dev/docs/release-process). Chaque version est dérivée du master Git de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes heureux d’annoncer notre nouvelle branche, [V8 version 8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3), qui est en version bêta jusqu’à sa sortie en coordination avec Chrome 83 Stable dans quelques semaines. V8 v8.3 regorge de toutes sortes de fonctionnalités destinées aux développeurs. Cet article propose un aperçu de certains points forts en prévision de la sortie.

<!--truncate-->
## Performances

### Suivi des `ArrayBuffer` plus rapide dans le collecteur de déchets

Les magasins de sauvegarde des `ArrayBuffer` sont alloués hors du tas de V8 en utilisant `ArrayBuffer::Allocator` fourni par l’embedder. Ces magasins de sauvegarde doivent être libérés lorsque leur objet `ArrayBuffer` est récupéré par le collecteur de déchets. V8 v8.3 introduit un nouveau mécanisme de suivi des `ArrayBuffer` et de leurs magasins de sauvegarde, permettant au collecteur de déchets de les parcourir et de les libérer parallèlement à l’application. Plus de détails sont disponibles dans [ce document de conception](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e). Cela a réduit le temps total de pause GC dans les charges de travail lourdes de `ArrayBuffer` de 50 %.

### Mémoires Wasm plus grandes

Conformément à une mise à jour de la [spécification WebAssembly](https://webassembly.github.io/spec/js-api/index.html#limits), V8 v8.3 permet désormais aux modules de demander des mémoires jusqu’à 4 Go, permettant ainsi d’utiliser des cas plus gourmands en mémoire sur les plateformes alimentées par V8. Veuillez garder à l’esprit que cette quantité de mémoire peut ne pas toujours être disponible sur le système de l’utilisateur ; nous recommandons de créer des mémoires de tailles plus petites, de les agrandir au besoin, et de gérer gracieusement les échecs d’agrandissement.

## Corrections

### Stockages dans des objets ayant des matrices typées dans la chaîne de prototype

Selon la spécification JavaScript, lorsque vous stockez une valeur pour une clé spécifiée, nous devons vérifier la chaîne de prototype pour voir si la clé existe déjà sur le prototype. Bien souvent, ces clés n’existent pas sur la chaîne de prototype, et V8 installe des gestionnaires de recherche rapide pour éviter ces parcours de la chaîne de prototype lorsque cela est sûr à faire.

Cependant, nous avons récemment identifié un scénario particulier dans lequel V8 a installé incorrectement ce gestionnaire de recherche rapide, entraînant un comportement incorrect. Lorsque des `TypedArray` sont dans la chaîne de prototype, tous les stockages aux clés qui sont hors limites (`OOB`) du `TypedArray` doivent être ignorés. Par exemple, dans le cas ci-dessous, `v[2]` ne devrait pas ajouter une propriété à `v` et les lectures suivantes devraient retourner undefined.

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // Devrait retourner undefined
```

Les gestionnaires de recherche rapide de V8 ne gèrent pas ce cas, et nous retournerions plutôt `123` dans l’exemple ci-dessus. V8 v8.3 corrige ce problème en n’utilisant pas de gestionnaires de recherche rapide lorsque des `TypedArray` sont dans la chaîne de prototype. Étant donné que ce n’est pas un cas courant, nous n’avons constaté aucune régression de performance dans nos benchmarks.

## API V8

### API expérimentales WeakRefs et FinalizationRegistry obsolètes

Les API expérimentales suivantes liées aux WeakRefs sont obsolètes :

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry` (renommé à partir de `FinalizationGroup`) fait partie de la [proposition de JavaScript pour les références faibles](https://v8.dev/features/weak-references) et fournit un moyen aux programmeurs JavaScript d’enregistrer des finaliseurs. Ces API permettent à l’embedder de planifier et d’exécuter les tâches de nettoyage de `FinalizationRegistry`, où les finaliseurs enregistrés sont invoqués ; elles sont obsolètes parce qu’elles ne sont plus nécessaires. Les tâches de nettoyage de `FinalizationRegistry` sont désormais planifiées automatiquement par V8 en utilisant le gestionnaire de tâches au premier plan fourni par la `v8::Platform` de l’embedder et ne nécessitent aucun code supplémentaire de l’embedder.

### Autres changements d’API

Veuillez utiliser `git log branch-heads/8.1..branch-heads/8.3 include/v8.h` pour obtenir une liste des modifications d’API.

Les développeurs ayant un checkout actif de V8 peuvent utiliser `git checkout -b 8.3 -t branch-heads/8.3` pour expérimenter les nouvelles fonctionnalités de V8 v8.3. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et bientôt essayer les nouvelles fonctionnalités par vous-même.
