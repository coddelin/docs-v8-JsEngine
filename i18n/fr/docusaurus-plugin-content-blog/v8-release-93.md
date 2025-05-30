---
title: "Lancement de V8 v9.3"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-08-09
tags: 
 - release
description: "La version v9.3 de V8 apporte le support de Object.hasOwn et des causes d'erreurs, améliore les performances de compilation et désactive les atténuations de génération de code non fiable sur Android."
tweet: ""
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée de la branche principale de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre toute nouvelle branche, [V8 version 9.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3), qui est en bêta jusqu'à sa publication en coordination avec Chrome 93 Stable dans plusieurs semaines. V8 v9.3 est remplie de nouveautés intéressantes pour les développeurs. Cet article offre un aperçu de certaines des principales nouveautés en prévision de la sortie.

<!--truncate-->
## JavaScript

### Compilation par lots Sparkplug

Nous avons lancé notre nouveau compilateur JIT de milieu de gamme ultra rapide [Sparkplug](https://v8.dev/blog/sparkplug) dans la version 9.1. Pour des raisons de sécurité, V8 [protège en écriture](https://en.wikipedia.org/wiki/W%5EX) la mémoire du code qu'il génère, nécessitant de basculer les permissions entre écriture (pendant la compilation) et exécution. Cela est actuellement implémenté via des appels `mprotect`. Cependant, comme Sparkplug génère du code très rapidement, le coût d'appel de `mprotect` pour chaque fonction compilée individuellement est devenu un goulet d'étranglement majeur dans le temps de compilation. Dans V8 v9.3, nous introduisons la compilation par lots pour Sparkplug : au lieu de compiler chaque fonction individuellement, nous compilons plusieurs fonctions en lot. Cela amortit le coût du basculement des permissions des pages mémoire en ne le faisant qu'une seule fois par lot.

La compilation par lots réduit le temps global de compilation (Ignition + Sparkplug) jusqu'à 44 % sans régresser l'exécution du JavaScript. Si nous ne considérons que le coût de compilation du code Sparkplug, l'impact est évidemment plus important, par exemple une réduction de 82 % pour le benchmark `docs_scrolling` (voir ci-dessous) sur Windows 10. Étonnamment, la compilation par lots a amélioré les performances de compilation encore plus que le coût de W^X, puisque regrouper des opérations similaires est généralement mieux pour le CPU. Sur le graphique ci-dessous, vous pouvez voir l'impact de W^X sur le temps de compilation (Ignition + Sparkplug), et comment la compilation par lots a bien atténué cet overhead.

![Benchmarks](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn` est un alias plus accessible pour `Object.prototype.hasOwnProperty.call`.

Par exemple :

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

Un petit peu plus de détails (mais pas beaucoup !) sont disponibles dans notre [explication de la fonctionnalité](https://v8.dev/features/object-has-own).

### Cause d'erreur

À partir de la version 9.3, les différents constructeurs d'erreurs intégrés acceptent une structure d'options avec une propriété `cause` pour le deuxième paramètre. Si une telle structure d'options est passée, la valeur de la propriété `cause` est installée comme une propriété propre sur l'instance d'Error. Cela fournit un moyen standardisé d'enchaîner les erreurs.

Par exemple :

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

Comme toujours, veuillez consulter notre [explication plus approfondie de la fonctionnalité](https://v8.dev/features/error-cause).

## Atténuations du code non fiable désactivées sur Android

Il y a trois ans, nous avons introduit un ensemble d'[atténuations de génération de code](https://v8.dev/blog/spectre) pour nous défendre contre les attaques Spectre. Nous avons toujours su qu'il s'agissait d'une solution provisoire qui ne fournissait qu'une protection partielle contre les attaques [Spectre](https://spectreattack.com/spectre.pdf). La seule protection efficace est d'isoler les sites Web via l'[isolement des sites](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html). L'isolement des sites a été activé sur Chrome sur les appareils de bureau depuis un certain temps, mais activer l'isolement complet des sites sur Android a été plus difficile en raison des contraintes de ressources. Cependant, à partir de Chrome 92, [l'Isolement des sites sur Android](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html) a été activé sur de nombreux sites contenant des données sensibles.

Ainsi, nous avons décidé de désactiver les atténuations de génération de code de V8 pour Spectre sur Android. Ces atténuations sont moins efficaces que l'Isolement des sites et entraînent un coût de performance. Les désactiver met Android sur un pied d'égalité avec les plateformes de bureau, où elles ont été désactivées depuis V8 v7.0. En désactivant ces atténuations, nous avons observé des améliorations significatives des performances lors des benchmarks sur Android.

![Améliorations des performances](/_img/v8-release-93/code-mitigations.svg)

## API V8

Veuillez utiliser `git log branch-heads/9.2..branch-heads/9.3 include/v8.h` pour obtenir une liste des changements d'API.
