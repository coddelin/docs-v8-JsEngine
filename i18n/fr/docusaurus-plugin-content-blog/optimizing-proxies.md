---
title: "Optimisation des proxies ES2015 dans V8"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), Optimisatrice de proxies"
avatars: 
  - "maya-armyanova"
date: "2017-10-05 13:33:37"
tags: 
  - ECMAScript
  - benchmarks
  - internals
description: "Cet article explique comment V8 a amélioré les performances des proxies JavaScript."
tweet: "915846050447003648"
---
Les proxies sont une partie intégrante de JavaScript depuis ES2015. Ils permettent d'intercepter les opérations fondamentales sur les objets et de personnaliser leur comportement. Les proxies constituent une partie centrale de projets comme [jsdom](https://github.com/tmpvar/jsdom) et la bibliothèque RPC [Comlink](https://github.com/GoogleChrome/comlink). Récemment, nous avons investi beaucoup d'efforts pour améliorer les performances des proxies dans V8. Cet article met en lumière les modèles généraux d'amélioration des performances dans V8 et pour les proxies en particulier.

<!--truncate-->
Les proxies sont des « objets utilisés pour définir un comportement personnalisé pour les opérations fondamentales (par exemple, recherche de propriétés, affectation, énumération, invocation de fonction, etc.) » (définition par [MDN](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy)). Plus d'informations sont disponibles dans la [spécification complète](https://tc39.es/ecma262/#sec-proxy-objects). Par exemple, le code ci-dessous ajoute un journal à chaque accès de propriété sur l'objet :

```js
const target = {};
const callTracer = new Proxy(target, {
  get: (target, name, receiver) => {
    console.log(`get a été appelé pour : ${name}`);
    return target[name];
  }
});

callTracer.property = 'valeur';
console.log(callTracer.property);
// get a été appelé pour : property
// valeur
```

## Construction de proxies

La première fonctionnalité sur laquelle nous allons nous concentrer est la **construction** des proxies. Notre implémentation originale en C++ suivait ici la spécification ECMAScript étape par étape, ce qui entraînait au moins 4 sauts entre les environnements d'exécution C++ et JS, comme indiqué dans la figure suivante. Nous voulions transposer cette implémentation dans l'[assemblage de stubs de code](/docs/csa-builtins) (CSA) indépendant de la plateforme, qui est exécuté dans l'environnement JS plutôt que C++. Cette transposition minimise le nombre de sauts entre les environnements d'exécution. `CEntryStub` et `JSEntryStub` représentent les environnements d'exécution dans la figure ci-dessous. Les lignes pointillées représentent les frontières entre les environnements d'exécution JS et C++. Heureusement, de nombreux [prédicats d'aide](https://github.com/v8/v8/blob/4e5db9a6c859df7af95a92e7cf4e530faa49a765/src/code-stub-assembler.h) étaient déjà implémentés dans l'assembleur, ce qui rend l'[version initiale](https://github.com/v8/v8/commit/f2af839b1938b55b4d32a2a1eb6704c49c8d877d#diff-ed49371933a938a7c9896878fd4e4919R97) concise et lisible.

La figure ci-dessous montre le flux d'exécution lors de l'appel à un Proxy avec n'importe quel piège de proxy (dans cet exemple `apply`, qui est appelé lorsque le proxy est utilisé comme une fonction) généré par le code suivant :

```js
function foo(…) { … }
const g = new Proxy({ … }, {
  apply: foo,
});
g(1, 2);
```

![](/_img/optimizing-proxies/0.png)

Après avoir transféré l'exécution des pièges au CSA, toute l'exécution a lieu dans l'environnement d'exécution JS, réduisant le nombre de sauts entre les langages de 4 à 0.

Cette modification a entraîné les améliorations de performances suivantes :

![](/_img/optimizing-proxies/1.png)

Notre score de performance JS montre une amélioration comprise entre **49% et 74%**. Ce score mesure approximativement le nombre de fois qu'un micro-benchmark donné peut être exécuté en 1000ms. Pour certains tests, le code est exécuté plusieurs fois afin d'obtenir une mesure suffisamment précise compte tenu de la résolution du chronomètre. Le code de tous les benchmarks suivants peut être trouvé [dans notre répertoire js-perf-test](https://github.com/v8/v8/blob/5a5783e3bff9e5c1c773833fa502f14d9ddec7da/test/js-perf-test/Proxies/proxies.js).

## Pièges d'appel et de construction

La section suivante montre les résultats de l'optimisation des pièges d'appel et de construction (a.k.a. [`"apply"`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/apply)" et [`"construct"`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/construct)).

![](/_img/optimizing-proxies/2.png)

Les améliorations de performances lors de _l'appel_ des proxies sont significatives — jusqu'à **500%** plus rapide ! Cependant, l'amélioration pour la construction des proxies est assez modeste, surtout dans les cas où aucun véritable piège n'est défini — environ **25%** de gain. Nous avons étudié cela en exécutant la commande suivante avec le [shell `d8`](/docs/build) :

```bash
$ out/x64.release/d8 --runtime-call-stats test.js
> run : 120.104000

                      Fonction Runtime / C++ Built-in       Temps             Compte
========================================================================================
                                         NewObject     59.16ms  48.47%    100000  24.94%
                                      JS_Execution     23.83ms  19.53%         1   0.00%
                              RecompileSynchronous     11.68ms   9.57%        20   0.00%
                        AccessorNameGetterCallback     10.86ms   8.90%    100000  24.94%
      AccessorNameGetterCallback_FunctionPrototype      5.79ms   4.74%    100000  24.94%
                                  Map_SetPrototype      4.46ms   3.65%    100203  25.00%
… SNIPPET …
```

Où se trouve le code source de `test.js` :

```js
function MyClass() {}
MyClass.prototype = {};
const P = new Proxy(MyClass, {});
function run() {
  return new P();
}
const N = 1e5;
console.time('run');
for (let i = 0; i < N; ++i) {
  run();
}
console.timeEnd('run');
```

Il s'est avéré que la majeure partie du temps est consacrée à `NewObject` et aux fonctions appelées par celui-ci, nous avons donc commencé à planifier comment accélérer cela dans les futures versions.

## Piège Get

La section suivante décrit comment nous avons optimisé les autres opérations les plus fréquentes — obtenir et définir des propriétés via des proxies. Il s'est avéré que le [`get`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/get) piège est plus complexe en raison du comportement spécifique des caches en ligne de V8. Pour une explication détaillée des caches en ligne, vous pouvez regarder [cette présentation](https://www.youtube.com/watch?v=u7zRSm8jzvA).

Finalement, nous avons réussi à obtenir un port fonctionnel vers CSA avec les résultats suivants :

![](/_img/optimizing-proxies/3.png)

Après avoir intégré le changement, nous avons constaté que la taille de l'`.apk` Android pour Chrome avait augmenté de **~160KB**, ce qui est supérieur à ce que nous attendions pour une fonction d'aide d'environ 20 lignes, mais heureusement nous suivons de telles statistiques. Il s'est avéré que cette fonction est appelée deux fois à partir d'une autre fonction, qui est appelée 3 fois, à partir d'une autre appelée 4 fois. La cause du problème provenait de l'inlining agressif. Nous avons finalement résolu le problème en transformant la fonction inline en un stub de code séparé, économisant ainsi des précieux KB — la version finale n'avait qu'une augmentation de **~19KB** de taille `.apk`.

## Piège Has

La section suivante montre les résultats de l'optimisation du piège [`has`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/has). Bien qu'au départ nous pensions que ce serait plus facile (et que nous pourrions réutiliser la plupart du code du piège `get`), il s'est avéré qu'il avait ses propres particularités. Un problème particulièrement difficile à identifier était la traversée de la chaîne de prototype lors de l'appel de l'opérateur `in`. Les résultats d'amélioration obtenus varient entre **71% et 428%**. Encore une fois, le gain est plus significatif dans les cas où le piège est présent.

![](/_img/optimizing-proxies/4.png)

## Piège Set

La section suivante parle du portage du piège [`set`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/set). Cette fois, nous avons dû faire la distinction entre les propriétés [nommées](/blog/fast-properties) et indexées ([éléments](/blog/elements-kinds)). Ces deux types principaux ne font pas partie du langage JS, mais sont essentiels pour le stockage efficace des propriétés de V8. L'implémentation initiale renvoie encore à l'exécution pour les éléments, ce qui implique à nouveau une traversée des frontières du langage. Néanmoins, nous avons obtenu des améliorations entre **27% et 438%** dans les cas où le piège est défini, au prix d'une diminution allant jusqu'à **23%** lorsqu'il ne l'est pas. Cette régression de performances est due à la surcharge des vérifications supplémentaires pour différencier entre propriétés indexées et nommées. Pour les propriétés indexées, il n'y a pas encore d'amélioration. Voici les résultats complets :

![](/_img/optimizing-proxies/5.png)

## Utilisation dans le monde réel

### Résultats de [jsdom-proxy-benchmark](https://github.com/domenic/jsdom-proxy-benchmark)

Le projet jsdom-proxy-benchmark compile la spécification [ECMAScript](https://github.com/tc39/ecma262) en utilisant l'outil [Ecmarkup](https://github.com/bterlson/ecmarkup). Depuis [v11.2.0](https://github.com/tmpvar/jsdom/blob/master/Changelog.md#1120), le projet jsdom (qui sous-tend Ecmarkup) utilise des proxies pour implémenter les structures de données communes `NodeList` et `HTMLCollection`. Nous avons utilisé ce benchmark pour obtenir un aperçu d'une utilisation plus réaliste que les micro-benchmarks synthétiques, et avons obtenu les résultats suivants, moyenne de 100 exécutions :

- Node v8.4.0 (sans optimisations Proxy) : **14277 ± 159 ms**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz) (avec seulement la moitié des pièges portés) : **11789 ± 308 ms**
- Gain en vitesse d'environ 2,4 secondes, soit **~17% mieux**

![](/_img/optimizing-proxies/6.png)

- [Conversion de `NamedNodeMap` pour utiliser `Proxy`](https://github.com/domenic/jsdom-proxy-benchmark/issues/1#issuecomment-329047990) a augmenté le temps de traitement de
    - **1,9 s** sur V8 6.0 (Node v8.4.0)
    - **0,5 s** sur V8 6.3 (Node v9.0.0-v8-canary-20170910)

![](/_img/optimizing-proxies/7.png)

:::note
**Remarque :** Ces résultats ont été fournis par [Timothy Gu](https://github.com/TimothyGu). Merci !
:::

### Résultats de [Chai.js](https://chaijs.com/)

Chai.js est une bibliothèque d'assertions populaire qui utilise largement les proxies. Nous avons créé une sorte de benchmark du monde réel en exécutant ses tests avec différentes versions de V8, une amélioration d'environ **1s sur plus de 4s**, moyenne de 100 exécutions :

- Node v8.4.0 (sans optimisations Proxy) : **4.2863 ± 0.14 s**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz) (avec seulement la moitié des pièges portés) : **3.1809 ± 0.17 s**

![](/_img/optimizing-proxies/8.png)

## Approche d'optimisation

Nous abordons souvent les problèmes de performance en utilisant un schéma d'optimisation générique. L'approche principale que nous avons suivie pour ce travail particulier comprenait les étapes suivantes :

- Implémenter des tests de performance pour la sous-caractéristique particulière
- Ajouter davantage de tests de conformité à la spécification (ou les écrire à partir de zéro)
- Examiner l'implémentation C++ originale
- Porter la sous-caractéristique sur le CodeStubAssembler indépendant de la plateforme
- Optimiser le code encore davantage en créant manuellement une implémentation [TurboFan](/docs/turbofan)
- Mesurer l'amélioration des performances.

Cette approche peut être appliquée à toute tâche d'optimisation générale que vous pourriez avoir.
