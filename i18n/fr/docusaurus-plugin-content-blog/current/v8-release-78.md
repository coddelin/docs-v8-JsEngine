---
title: 'V8 release v7.8'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), le sourcier paresseux'
avatars:
  - 'ingvar-stepanyan'
date: 2019-09-27
tags:
  - release
description: 'V8 v7.8 propose la compilation en streaming lors du préchargement, l'API C pour WebAssembly, un destructuring des objets plus rapide et un meilleur temps de démarrage.'
tweet: '1177600702861971459'
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du Git master de V8 juste avant une étape Chrome Beta. Aujourd'hui, nous sommes heureux d'annoncer notre dernière branche, [V8 version 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8), qui est en bêta jusqu'à sa sortie coordonnée avec Chrome 78 Stable dans plusieurs semaines. V8 v7.8 est rempli de toutes sortes de bonus pour les développeurs. Ce post donne un aperçu de certains des points forts en prévision de la sortie.

<!--truncate-->
## Performance JavaScript (taille & vitesse)

### Streaming de scripts lors du préchargement

Vous vous souvenez peut-être de [nos travaux sur le streaming de script dans V8 v7.5](/blog/v8-release-75#script-streaming-directly-from-network), où nous avons amélioré notre compilation de fond pour lire les données directement depuis le réseau. Dans Chrome 78, nous activons le streaming de script pendant le préchargement.

Auparavant, le streaming de script commençait lorsque une balise `<script>` était rencontrée pendant l'analyse du HTML, et l'analyse soit faisait une pause jusqu'à ce que la compilation soit terminée (pour les scripts normaux), soit le script était exécuté une fois compilé (pour les scripts asynchrones). Cela signifie que pour les scripts normaux et synchrones comme celui-ci :

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

…le pipeline ressemblait auparavant à ceci :

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

Puisque les scripts synchrones peuvent utiliser `document.write()`, nous devons mettre en pause l'analyse du HTML lorsque nous voyons la balise `<script>`. Comme la compilation commence lorsque la balise `<script>` est rencontrée, il y a un grand intervalle entre l'analyse du HTML et l'exécution réelle du script, pendant lequel nous ne pouvons pas continuer à charger la page.

Cependant, nous rencontrons également la balise `<script>` à un stade plus précoce, où nous examinons le HTML à la recherche de ressources à précharger, alors le pipeline ressemblait plutôt à ceci :

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

Il est raisonnablement sûr de supposer que si nous préchargeons un fichier JavaScript, nous voudrons l'exécuter finalement. Donc, depuis Chrome 76, nous avons expérimenté le streaming de préchargement, où le chargement du script commence également sa compilation.

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

Encore mieux, puisque nous pouvons commencer la compilation avant que le script soit complètement chargé, le pipeline avec streaming de préchargement ressemble en réalité plutôt à ceci :

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

Cela signifie que dans certains cas, nous pouvons réduire le temps de compilation perceptible (l'intervalle entre `<script>`-vu et début-d'exécution-du-script) à zéro. Dans nos expériences, ce temps de compilation perceptible a chuté, en moyenne, de 5 à 20 %.

La meilleure nouvelle est que grâce à notre infrastructure d'expérimentation, nous avons pu non seulement activer cela par défaut dans Chrome 78, mais également l'activer pour les utilisateurs de Chrome 76 et plus.

### Déstructuration des objets plus rapide

La déstructuration des objets de la forme…

```js
const {x, y} = object;
```

…est presque équivalente à la forme dé-sucrée...

```js
const x = object.x;
const y = object.y;
```

…sauf qu'elle doit aussi jeter une erreur spéciale si `object` est `undefined` ou `null`...

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Impossible de déstructurer la propriété `x` de 'undefined' ou 'null'.
const object = undefined; const {x, y} = object;
                                 ^
```

…plutôt que l'erreur normale que vous obtiendriez en essayant de déréférencer undefined :

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Impossible de lire la propriété 'x' de undefined
const object = undefined; object.x
                                 ^
```

Cette vérification supplémentaire rendait la déstructuration plus lente que l'affectation de variables simples, comme [nous l'avons rapporté via Twitter](https://twitter.com/mkubilayk/status/1166360933087752197).

À partir de V8 v7.8, la déstructuration des objets est **aussi rapide** que l'affectation de variables dé-sucrées équivalentes (en fait, nous générons le même bytecode pour les deux). Maintenant, au lieu de vérifications explicites de `undefined`/`null`, nous nous reposons sur une exception levée lors du chargement de `object.x`, et nous interceptons l'exception si elle est le résultat d'une déstructuration.

### Positions de source paresseuses

Lors de la compilation du bytecode à partir du JavaScript, des tables de positions de source sont générées, liant les séquences de bytecode aux positions des caractères dans le code source. Cependant, ces informations sont uniquement utilisées lors de la symbolisation des exceptions ou pour effectuer des tâches de développeur telles que le débogage et le profilage, ce qui en fait essentiellement une mémoire inutile.

Pour éviter cela, nous compilons désormais le bytecode sans collecter les positions de source (à condition qu'aucun débogueur ou profileur ne soit attaché). Les positions de source ne sont collectées que lorsqu'une trace de pile est effectivement générée, par exemple lors de l'appel à `Error.stack` ou de l'impression de la trace de pile d'une exception sur la console. Cela entraîne un certain coût, car la génération des positions de source nécessite de réanalyser et de recompiler la fonction, mais la plupart des sites web ne symbolisent pas les traces de pile en production et ne constatent donc aucun impact de performance observable. Dans nos tests en laboratoire, nous avons observé des réductions de l'utilisation de la mémoire de V8 allant de 1 à 2,5 %.

![Économies de mémoire grâce aux positions de source paresseuses sur un appareil AndroidGo](/_img/v8-release-78/memory-savings.svg)

### Échecs de correspondances RegExp plus rapides

En général, une RegExp tente de trouver une correspondance en parcourant la chaîne d'entrée et en vérifiant la correspondance à partir de chaque position. Une fois que cette position devient suffisamment proche de la fin de la chaîne pour qu'aucune correspondance ne soit possible, V8 (dans la plupart des cas) cesse désormais d'essayer de trouver de nouveaux débuts de correspondances et retourne rapidement un échec. Cette optimisation s'applique à la fois aux expressions régulières compilées et interprétées, et offre une accélération dans les cas où les échecs de correspondance sont fréquents et où la longueur minimale de toute correspondance réussie est relativement grande par rapport à la longueur moyenne de la chaîne d'entrée.

Sur le test UniPoker dans JetStream 2, qui a inspiré ce travail, V8 v7.8 apporte une amélioration de 20 % au sous-score moyen de toutes les itérations.

## WebAssembly

### API C/C++ WebAssembly

Depuis la version v7.8, l'implémentation par V8 de l'[API Wasm C/C++](https://github.com/WebAssembly/wasm-c-api) passe du statut expérimental à un statut officiellement pris en charge. Elle vous permet d'utiliser une version spéciale de V8 comme moteur d'exécution WebAssembly dans vos applications C/C++. Pas besoin de JavaScript ! Pour plus de détails et d'instructions, consultez [la documentation](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit).

### Temps de démarrage amélioré

Appeler une fonction JavaScript depuis WebAssembly ou une fonction WebAssembly depuis JavaScript implique l'exécution d'un code wrapper, responsable de la traduction des arguments de la fonction d'une représentation à l'autre. La génération de ces wrappers peut être assez coûteuse : dans la [démo Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html), la compilation des wrappers représente environ 20 % du temps de démarrage du module (compilation + instanciation) sur une machine Xeon à 18 cœurs.

Pour cette version, nous avons amélioré la situation en utilisant mieux les threads en arrière-plan sur des machines multicœurs. Nous nous sommes appuyés sur des efforts récents pour [optimiser la compilation des fonctions](/blog/v8-release-77#wasm-compilation), et avons intégré la compilation des wrappers dans ce nouveau pipeline asynchrone. La compilation des wrappers représente désormais environ 8 % du temps de démarrage de la démo Epic ZenGarden sur la même machine.

## API V8

Veuillez utiliser `git log branch-heads/7.7..branch-heads/7.8 include/v8.h` pour obtenir une liste des changements dans l'API.

Les développeurs avec une [copie active de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.8 -t branch-heads/7.8` pour expérimenter les nouvelles fonctionnalités de V8 v7.8. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités par vous-même bientôt.
