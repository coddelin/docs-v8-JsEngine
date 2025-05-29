---
title: 'Version V8.6 de V8'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), un testeur de fuzzing pour clavier'
avatars:
 - 'ingvar-stepanyan'
date: 2020-09-21
tags:
 - release
description: 'La version V8.6 de V8 apporte un code respectueux, des améliorations de performance et des changements normatifs.'
tweet: '1308062287731789825'
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est issue directement de la branche principale de V8 sur Git juste avant une étape Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre toute nouvelle branche, [V8 version 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6), qui est en bêta jusqu'à sa publication en coordination avec Chrome 86 stable dans plusieurs semaines. V8 v8.6 regorge de toutes sortes de fonctionnalités destinées aux développeurs. Ce post offre un aperçu des principaux points à l'approche de la sortie.

<!--truncate-->
## Code respectueux

La version 8.6 rend le code de base de V8 [plus respectueux](https://v8.dev/docs/respectful-code). L'équipe a rejoint un effort à l'échelle de Chromium pour respecter les engagements de Google en matière d'équité raciale en remplaçant certains termes insensibles dans le projet. Ce processus est toujours en cours et toute contribution externe est la bienvenue ! Vous pouvez voir la liste des tâches encore disponibles [ici](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit).

## JavaScript

### Fuzzer JS open source

JS-Fuzzer est un fuzzing basé sur la mutation pour JavaScript, initialement développé par Oliver Chang. Il a été une pierre angulaire de la [stabilité](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) et de la [sécurité](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) de V8 par le passé et est maintenant [open source](https://chromium-review.googlesource.com/c/v8/v8/+/2320330).

Le fuzzer modifie les cas de test existants entre moteurs en utilisant des transformations AST [Babel](https://babeljs.io/) configurées par des [classes de mutateurs](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/) extensibles. Nous avons également récemment commencé à exécuter une instance du fuzzer en mode de test différentiel pour détecter les [problèmes de correction](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1) de JavaScript. Les contributions sont les bienvenues ! Voir le [README](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md) pour plus d'informations.

### Optimisation de `Number.prototype.toString`

La conversion d'un nombre JavaScript en chaîne de caractères peut être une opération étonnamment complexe dans le cas général ; il faut prendre en compte la précision du point flottant, la notation scientifique, les NaN, les infinis, l'arrondi, et ainsi de suite. Nous ne savons même pas quelle sera la taille de la chaîne résultante avant de la calculer. Pour cette raison, notre implémentation de `Number.prototype.toString` devait appeler une fonction d'exécution C++.

Mais souvent, vous voulez juste afficher un simple petit entier (un “Smi”). C'est une opération beaucoup plus simple, et les surcoûts d'appeler une fonction d'exécution C++ ne valent plus le coup. Nous avons donc travaillé avec nos amis de Microsoft pour ajouter un chemin rapide simple pour les petits entiers dans `Number.prototype.toString`, écrit en Torque, pour réduire ces surcoûts dans ce cas courant. Cela a amélioré les micro-benchmarks d'impression de nombres d'environ 75%.

### Suppression de `Atomics.wake`

`Atomics.wake` a été renommé en `Atomics.notify` pour correspondre à un changement de spécification [dans la version 7.3](https://v8.dev/blog/v8-release-73#atomics.notify). L'alias obsolète `Atomics.wake` est maintenant supprimé.

### Petits changements normatifs

- Les classes anonymes ont désormais une propriété `.name` dont la valeur est la chaîne vide `''`. [Changement de spécification](https://github.com/tc39/ecma262/pull/1490).
- Les séquences d'échappement `\8` et `\9` sont désormais illégales dans les littéraux de chaînes de modèles en [mode laxiste](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode) et dans tous les littéraux de chaînes en [mode strict](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode). [Changement de spécification](https://github.com/tc39/ecma262/pull/2054).
- L'objet intégré `Reflect` dispose désormais d'une propriété `Symbol.toStringTag` dont la valeur est `'Reflect'`. [Changement de spécification](https://github.com/tc39/ecma262/pull/2057).

## WebAssembly

### SIMD sur Liftoff

Liftoff est le compilateur de base pour WebAssembly, et depuis V8 v8.5 il est disponible sur toutes les plateformes. La [proposition SIMD](https://v8.dev/features/simd) permet à WebAssembly de tirer parti des instructions vectorielles matérielles couramment disponibles pour accélérer les charges de travail intensives en calcul. Elle est actuellement en [essai d'origine](https://v8.dev/blog/v8-release-84#simd-origin-trial), ce qui permet aux développeurs d'expérimenter une fonctionnalité avant qu'elle ne soit normalisée.

Jusqu'à présent, SIMD n'était implémenté que dans TurboFan, le compilateur de premier niveau de V8. Cela est nécessaire pour obtenir des performances maximales avec les instructions SIMD. Les modules WebAssembly utilisant les instructions SIMD auront un démarrage plus rapide, et souvent des performances d'exécution supérieures à leurs équivalents scalaires compilés avec TurboFan. Par exemple, étant donné une fonction qui prend un tableau de flottants et limite ses valeurs à zéro (écrite ici en JavaScript pour plus de clarté) :

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

Comparons deux implémentations différentes de cette fonction, utilisant Liftoff et TurboFan :

1. Une implémentation scalaire, avec la boucle déroulée 4 fois.
2. Une implémentation SIMD, utilisant l'instruction `i32x4.max_s`.

En utilisant l'implémentation scalaire Liftoff comme référence, nous obtenons les résultats suivants :

![Un graphique montrant SIMD Liftoff étant ~2,8× plus rapide que scalaire Liftoff vs. SIMD TurboFan étant ~7,5× plus rapide](/_img/v8-release-86/simd.svg)

### Appels WebAssembly vers JavaScript plus rapides

Si WebAssembly appelle une fonction JavaScript importée, l'appel passe par un « wrapper Wasm-to-JS » (ou « import wrapper »). Ce wrapper [traduit les arguments](https://webassembly.github.io/spec/js-api/index.html#tojsvalue) en objets compréhensibles par JavaScript, et lorsque l'appel à JavaScript retourne, il traduit en retour les valeurs [pour WebAssembly](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue).

Pour garantir que l'objet `arguments` de JavaScript reflète exactement les arguments passés depuis WebAssembly, nous utilisons un « trampoline adaptateur d'arguments » si un écart dans le nombre d'arguments est détecté.

Dans de nombreux cas cependant, cela n'est pas nécessaire, parce que la fonction appelée n'utilise pas l'objet `arguments`. Dans v8.6, nous avons intégré un [correctif](https://crrev.com/c/2317061) développé par nos contributeurs chez Microsoft qui évite l'appel par le trampoline adaptateur d'arguments dans ces cas, ce qui rend les appels concernés nettement plus rapides.

## API V8

### Détecter des tâches en arrière-plan en attente avec `Isolate::HasPendingBackgroundTasks`

La nouvelle fonction API `Isolate::HasPendingBackgroundTasks` permet aux intégrateurs de vérifier s'il y a du travail en arrière-plan en attente qui finira par poster de nouvelles tâches au premier plan, comme la compilation WebAssembly.

Cette API devrait résoudre le problème où un intégrateur arrête V8 alors qu'il reste encore une compilation WebAssembly en attente qui finira par déclencher une nouvelle exécution de script. Avec `Isolate::HasPendingBackgroundTasks`, l'intégrateur peut attendre de nouvelles tâches au premier plan au lieu d'arrêter V8.

Veuillez utiliser `git log branch-heads/8.5..branch-heads/8.6 include/v8.h` pour obtenir une liste des changements de l'API.

Les développeurs avec un dépôt V8 actif peuvent utiliser `git checkout -b 8.6 -t branch-heads/8.6` pour expérimenter les nouvelles fonctionnalités de V8 v8.6. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
