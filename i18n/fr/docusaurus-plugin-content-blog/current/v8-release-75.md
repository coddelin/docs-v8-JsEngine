---
title: "Version V8 v7.5"
author: "Dan Elphick, fléau des fonctionnalités obsolètes"
avatars:
  - "dan-elphick"
date: 2019-05-16 15:00:00
tags:
  - release
description: "V8 v7.5 propose la mise en cache implicite des artefacts de compilation WebAssembly, des opérations de mémoire en bloc, des séparateurs numériques en JavaScript, et bien plus encore !"
tweet: "1129073370623086593"
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est issue du dépôt maître Git de V8 immédiatement avant une étape bêta de Chrome. Aujourd’hui, nous sommes ravis d’annoncer notre nouvelle branche, [version 7.5 de V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.5), qui est en phase bêta jusqu’à sa publication en coordination avec Chrome 75 Stable dans quelques semaines. V8 v7.5 regorge d’éléments intéressants pour les développeurs. Ce billet fournit un aperçu de certains des points forts en prévision de la publication.

<!--truncate-->
## WebAssembly

### Mise en cache implicite

Nous prévoyons de déployer la mise en cache implicite des artefacts de compilation WebAssembly dans Chrome 75. Cela signifie que les utilisateurs qui visitent la même page une seconde fois n’ont pas besoin de compiler à nouveau les modules WebAssembly déjà vus. Ils sont chargés directement depuis le cache. Cela fonctionne de manière similaire à [la mise en cache du code JavaScript de Chromium](/blog/code-caching-for-devs).

Si vous souhaitez utiliser une fonctionnalité similaire dans votre intégration V8, veuillez vous inspirer de l’implémentation de Chromium.

### Opérations de mémoire en bloc

[La proposition de mémoire en bloc](https://github.com/webassembly/bulk-memory-operations) ajoute de nouvelles instructions à WebAssembly pour mettre à jour de grandes régions de mémoire ou de tables.

`memory.copy` copie des données d’une région à une autre, même si les régions se chevauchent (comme `memmove` en C). `memory.fill` remplit une région avec un octet donné (comme `memset` en C). Similaire à `memory.copy`, `table.copy` copie d’une région de table à une autre, même si les régions se chevauchent.

```wasm
;; Copier 500 octets de la source 1000 à la destination 0.
(memory.copy (i32.const 0) (i32.const 1000) (i32.const 500))

;; Remplir 1000 octets à partir de 100 avec la valeur `123`.
(memory.fill (i32.const 100) (i32.const 123) (i32.const 1000))

;; Copier 10 éléments de table de la source 5 à la destination 15.
(table.copy (i32.const 15) (i32.const 5) (i32.const 10))
```

La proposition fournit également un moyen de copier une région constante dans une mémoire linéaire ou une table. Pour ce faire, nous devons d’abord définir un segment « passif ». Contrairement aux segments « actifs », ces segments ne sont pas initialisés lors de l’instanciation du module. Ils peuvent être copiés dans une région de mémoire ou de table en utilisant les instructions `memory.init` et `table.init`.

```wasm
;; Définir un segment de données passif.
(data $hello passive "Hello WebAssembly")

;; Copier "Hello" dans la mémoire à l’adresse 10.
(memory.init (i32.const 10) (i32.const 0) (i32.const 5))

;; Copier "WebAssembly" dans la mémoire à l’adresse 1000.
(memory.init (i32.const 1000) (i32.const 6) (i32.const 11))
```

## Séparateurs numériques en JavaScript

Les littéraux numériques importants sont difficiles à déchiffrer rapidement pour l’œil humain, en particulier lorsque les chiffres se répètent fréquemment :

```js
1000000000000
   1019436871.42
```

Pour améliorer la lisibilité, [une nouvelle fonctionnalité du langage JavaScript](/features/numeric-separators) permet d’utiliser des underscores comme séparateurs dans les littéraux numériques. Ainsi, ce qui précède peut désormais être réécrit pour regrouper les chiffres par milliers, par exemple :

```js
1_000_000_000_000
    1_019_436_871.42
```

Il est maintenant plus facile de voir que le premier nombre est un trillion, et que le second se situe dans l’ordre de milliard.

Pour plus d’exemples et d’informations supplémentaires sur les séparateurs numériques, consultez [notre explicateur](/features/numeric-separators).

## Performance

### Flux de scripts directement depuis le réseau

À partir de Chrome 75, V8 peut diffuser directement les scripts depuis le réseau vers l’analyseur en streaming, sans attendre le thread principal de Chrome.

Alors que les versions précédentes de Chrome proposaient une analyse et une compilation en streaming, les données source des scripts provenant du réseau devaient toujours passer par le thread principal de Chrome avant d’être transmises au streamer, pour des raisons historiques. Cela signifiait souvent que l’analyseur en streaming attendait des données qui étaient déjà arrivées depuis le réseau, mais qui n’avaient pas encore été transmises à la tâche de streaming car elles étaient bloquées par d’autres activités sur le thread principal (comme l’analyse HTML, la mise en page ou l’exécution d’autres scripts JavaScript).

![Tâches d’analyse en arrière-plan bloquées dans Chrome 74 et versions antérieures](/_img/v8-release-75/before.jpg)

Dans Chrome 75, nous connectons directement le « tube de données » réseau à V8, permettant de lire les données réseau directement lors de l’analyse en streaming, en contournant la dépendance au thread principal.

![Dans Chrome 75+, les tâches d’analyse en arrière-plan ne sont plus bloquées par des activités sur le thread principal.](/_img/v8-release-75/after.jpg)

Cela nous permet de terminer les compilations en streaming plus tôt, améliorant ainsi le temps de chargement des pages utilisant la compilation en streaming, tout en réduisant le nombre de tâches de parsing en streaming concurrentes (mais en attente), ce qui diminue la consommation de mémoire.

## API V8

Veuillez utiliser `git log branch-heads/7.4..branch-heads/7.5 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs disposant d'un [checkout actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.5 -t branch-heads/7.5` pour expérimenter les nouvelles fonctionnalités de V8 v7.5. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) pour essayer les nouvelles fonctionnalités prochainement.
