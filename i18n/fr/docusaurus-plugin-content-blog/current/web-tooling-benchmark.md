---
title: 'Annonce du Web Tooling Benchmark'
author: 'Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), Jongleur de performance JavaScript'
avatars:
  - 'benedikt-meurer'
date: 2017-11-06 13:33:37
tags:
  - benchmarks
  - Node.js
description: 'Le tout nouveau Web Tooling Benchmark aide à identifier et corriger les goulots d'étranglement de performance de V8 dans Babel, TypeScript, et d'autres projets réels.'
tweet: '927572065598824448'
---
La performance du JavaScript a toujours été importante pour l'équipe V8, et dans cet article, nous souhaitons discuter d'un nouveau [Web Tooling Benchmark](https://v8.github.io/web-tooling-benchmark) que nous avons récemment utilisé pour identifier et corriger certains goulots d'étranglement en termes de performance dans V8. Vous connaissez peut-être déjà l'[engagement fort de V8 envers Node.js](/blog/v8-nodejs), et ce benchmark prolonge cet engagement en exécutant spécifiquement des tests de performance basés sur des outils courants de développement construits sur Node.js. Les outils du Web Tooling Benchmark sont les mêmes que ceux utilisés aujourd'hui par les développeurs et concepteurs pour créer des sites web modernes et des applications basées sur le cloud. Dans le prolongement de nos efforts continus pour nous concentrer sur la [performance réelle](/blog/real-world-performance/) plutôt que sur des benchmarks artificiels, nous avons créé le benchmark en utilisant le code réel que les développeurs exécutent quotidiennement.

<!--truncate-->
La suite de benchmarks Web Tooling a été conçue dès le départ pour couvrir des [cas d'utilisation importants d'outils de développement](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling) pour Node.js. Comme l'équipe V8 se concentre sur la performance fondamentale de JavaScript, nous avons construit le benchmark de manière à se concentrer sur les charges de travail JavaScript et à exclure la mesure des E/S spécifiques à Node.js ou des interactions externes. Cela permet d'exécuter le benchmark dans Node.js, dans tous les navigateurs, et dans toutes les principales interfaces des moteurs JavaScript, y compris `ch` (ChakraCore), `d8` (V8), `jsc` (JavaScriptCore) et `jsshell` (SpiderMonkey). Bien que le benchmark ne soit pas limité à Node.js, nous sommes ravis que le [groupe de travail sur les benchmarks Node.js](https://github.com/nodejs/benchmarking) envisage d'utiliser le benchmark comme standard pour la performance de Node ([nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138)).

Les tests individuels dans le benchmark outil couvrent une variété d'outils que les développeurs utilisent couramment pour construire des applications basées sur JavaScript, par exemple :

- Le transpileur [Babel](https://github.com/babel/babel) utilisant le preset `es2015`.
- Le parseur utilisé par Babel — nommé [Babylon](https://github.com/babel/babylon) — fonctionnant sur plusieurs entrées populaires (y compris les bundles de [lodash](https://lodash.com/) et [Preact](https://github.com/developit/preact)).
- Le parseur [acorn](https://github.com/ternjs/acorn) utilisé par [webpack](http://webpack.js.org/).
- Le compilateur [TypeScript](http://www.typescriptlang.org/) fonctionnant sur le projet exemple [typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular) du projet [TodoMVC](https://github.com/tastejs/todomvc).

Voir l'[analyse approfondie](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md) pour les détails sur tous les tests inclus.

Sur la base de l'expérience passée avec d'autres benchmarks comme [Speedometer](http://browserbench.org/Speedometer), où les tests deviennent rapidement obsolètes à mesure que de nouvelles versions des frameworks deviennent disponibles, nous nous sommes assurés qu'il est facile de mettre à jour chacun des outils des benchmarks vers des versions plus récentes lorsqu'elles sont publiées. En basant la suite de benchmarks sur l'infrastructure npm, nous pouvons facilement la mettre à jour pour garantir qu'elle teste toujours l'état de l'art des outils de développement JavaScript. Mettre à jour un cas de test consiste simplement à changer la version dans le manifeste `package.json`.

Nous avons créé un [bug de suivi](http://crbug.com/v8/6936) et une [feuille de calcul](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw) pour contenir toutes les informations pertinentes que nous avons collectées sur les performances de V8 sur le nouveau benchmark jusqu'à présent. Nos investigations ont déjà donné certains résultats intéressants. Par exemple, nous avons découvert que V8 rencontrait souvent le chemin lent pour `instanceof` ([v8:6971](http://crbug.com/v8/6971)), entraînant un ralentissement de 3–4×. Nous avons également trouvé et corrigé des goulots d'étranglement dans certains cas d'attribution de propriétés sous la forme de `obj[name] = val` où `obj` était créé via `Object.create(null)`. Dans ces cas-là, V8 tombait hors du chemin rapide malgré la possibilité d'utiliser le fait que `obj` avait un prototype `null` ([v8:6985](http://crbug.com/v8/6985)). Ces découvertes et d'autres faites grâce à ce benchmark améliorent V8, non seulement dans Node.js, mais également dans Chrome.

Nous ne nous sommes pas contentés de rendre V8 plus rapide, mais nous avons également corrigé et intégré des bugs de performance dans les outils et bibliothèques du benchmark dès que nous les avons trouvés. Par exemple, nous avons découvert un certain nombre de bugs de performance dans [Babel](https://github.com/babel/babel) où des motifs de code comme

```js
value = items[items.length - 1];
```

conduisent à des accès à la propriété `"-1"`, car le code ne vérifie pas si `items` est vide au préalable. Ce motif de code entraîne une exécution lente dans V8 en raison de la recherche de `"-1"`, alors qu'une version légèrement modifiée et équivalente en JavaScript est nettement plus rapide. Nous avons contribué à corriger ces problèmes dans Babel ([babel/babel#6582](https://github.com/babel/babel/pull/6582), [babel/babel#6581](https://github.com/babel/babel/pull/6581) et [babel/babel#6580](https://github.com/babel/babel/pull/6580)). Nous avons également découvert et corrigé un bug où Babel accédait au-delà de la longueur d'une chaîne ([babel/babel#6589](https://github.com/babel/babel/pull/6589)), ce qui déclenchait un autre chemin lent dans V8. En plus, nous avons [optimisé les lectures en dehors des limites d'arrays et de chaînes](https://twitter.com/bmeurer/status/926357262318305280) dans V8. Nous sommes impatients de continuer à [travailler avec la communauté](https://twitter.com/rauchg/status/924349334346276864) pour améliorer les performances de cet cas d'utilisation important, non seulement sur V8, mais aussi sur d'autres moteurs JavaScript comme ChakraCore.

Notre concentration sur les performances réelles, et en particulier sur l'amélioration des charges de travail populaires de Node.js, se manifeste par les améliorations constantes du score de V8 sur le benchmark au cours des dernières versions :

![](/_img/web-tooling-benchmark/chart.svg)

Depuis V8 v5.8, qui est la dernière version de V8 avant [passer à l'architecture Ignition+TurboFan](/blog/launching-ignition-and-turbofan), le score de V8 sur le benchmark des outils a augmenté d'environ **60 %**.

Au cours des dernières années, l'équipe V8 a pris conscience qu'aucun benchmark JavaScript - même bien intentionné et soigneusement conçu - ne devrait être utilisé comme proxy unique pour mesurer les performances globales d'un moteur JavaScript. Cependant, nous pensons que le nouveau **Web Tooling Benchmark** met en lumière des aspects des performances JavaScript qui méritent une attention particulière. En dépit du nom et de la motivation initiale, nous avons constaté que la suite du Web Tooling Benchmark n'est pas seulement représentative des charges de travail des outils, mais représente également un large éventail d'applications JavaScript plus sophistiquées qui ne sont pas bien testées par des benchmarks centrés sur le front-end comme Speedometer. Ce n'est en aucun cas un remplacement de Speedometer, mais plutôt un ensemble de tests complémentaires.

La meilleure nouvelle est que, étant donné que le Web Tooling Benchmark est basé sur des charges de travail réelles, nous nous attendons à ce que nos récentes améliorations des scores de benchmark se traduisent directement par une productivité accrue des développeurs grâce à [moins de temps à attendre que les choses se construisent](https://xkcd.com/303/). Bon nombre de ces améliorations sont déjà disponibles dans Node.js : au moment de la rédaction, Node 8 LTS utilise V8 v6.1 et Node 9 utilise V8 v6.2.

La dernière version du benchmark est hébergée sur [https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/).
