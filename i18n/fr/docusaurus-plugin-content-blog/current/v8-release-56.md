---
title: &apos;Publication V8 version 5.6&apos;
author: &apos;l&apos;équipe V8&apos;
date: 2016-12-02 13:33:37
tags:
  - publication
description: &apos;V8 v5.6 apporte une nouvelle chaîne de compilation, des améliorations de performance, et un soutien accru pour les fonctionnalités du langage ECMAScript.&apos;
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est issue du dépôt Git principal de V8 juste avant une étape bêta de Chrome. Aujourd&apos;hui, nous avons le plaisir d&apos;annoncer notre branche la plus récente, [V8 version 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6), qui sera en bêta jusqu&apos;à sa sortie avec Chrome 56 Stable dans plusieurs semaines. V8 5.6 est rempli de nouveautés destinées aux développeurs, alors nous souhaitons vous donner un aperçu de certaines de ses caractéristiques principales en vue de sa sortie.

<!--truncate-->
## Pipeline Ignition et TurboFan pour ES.next (et plus) livré

À partir de la version 5.6, V8 peut optimiser l&apos;ensemble du langage JavaScript. De plus, de nombreuses fonctionnalités du langage passent par une nouvelle chaîne d&apos;optimisation dans V8. Cette chaîne utilise l&apos;[interpréteur Ignition](/blog/ignition-interpreter) de V8 comme base et optimise les méthodes exécutées fréquemment grâce au [compilateur TurboFan](/docs/turbofan) plus puissant de V8. La nouvelle chaîne s&apos;active pour les nouvelles fonctionnalités du langage (par exemple, de nombreuses nouvelles fonctionnalités des spécifications ES2015 et ES2016) ou lorsque Crankshaft ([le « compilateur optimisant classique » de V8](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)) ne peut pas optimiser une méthode (par exemple, try-catch, with).

Pourquoi ne faisons-nous passer que certaines fonctionnalités de langage JavaScript par la nouvelle chaîne ? Cette chaîne est mieux adaptée pour optimiser tout le spectre du langage JS (passé et présent). Elle constitue une base de code plus saine et moderne, conçue spécifiquement pour des cas d&apos;utilisation réels, y compris l&apos;exécution de V8 sur des appareils à faible mémoire.

Nous avons commencé à utiliser Ignition/TurboFan avec les nouvelles fonctionnalités ES.next ajoutées à V8 (ES.next = fonctionnalités JavaScript spécifiées dans ES2015 et plus tard) et nous ferons passer davantage de fonctionnalités par cette chaîne à mesure que nous poursuivons l&apos;amélioration de ses performances. À moyen terme, l&apos;équipe de V8 vise à convertir toute l&apos;exécution JavaScript dans V8 vers cette nouvelle chaîne. Cependant, tant qu&apos;il existera des cas d&apos;utilisation réels où Crankshaft exécute JavaScript plus rapidement que la nouvelle chaîne Ignition/TurboFan, nous continuerons dans l&apos;immédiat à soutenir les deux chaînes pour garantir que le code JavaScript exécuté dans V8 soit aussi rapide que possible dans toutes les situations.

Alors, pourquoi la nouvelle chaîne utilise-t-elle à la fois l&apos;interpréteur Ignition et le compilateur optimisant TurboFan ? Exécuter JavaScript rapidement et efficacement nécessite plusieurs mécanismes, ou niveaux, sous le capot, dans une machine virtuelle JavaScript pour accomplir les tâches d&apos;exécution basiques. Par exemple, il est utile d&apos;avoir un premier niveau qui commence à exécuter le code rapidement, puis un deuxième niveau optimisant qui prend plus de temps pour compiler les fonctions en usage intensif afin de maximiser les performances pour le code s&apos;exécutant plus longtemps.

Ignition et TurboFan sont les deux nouveaux niveaux d&apos;exécution les plus efficaces lorsque utilisés ensemble dans V8. En raison de considérations d&apos;efficacité, de simplicité et de taille, TurboFan est conçu pour optimiser les méthodes JavaScript à partir du [bytecode](https://fr.wikipedia.org/wiki/Bytecode) produit par l&apos;interpréteur Ignition de V8. En concevant les deux composants pour travailler étroitement ensemble, des optimisations peuvent être réalisées pour chacun grâce à la présence de l&apos;autre. En conséquence, à partir de la version 5.6, toutes les fonctions qui seront optimisées par TurboFan passent d&apos;abord par l&apos;interpréteur Ignition. L&apos;utilisation de cette chaîne unifiée Ignition/TurboFan permet l&apos;optimisation de fonctionnalités qui n&apos;étaient pas optimisables auparavant, puisque ces dernières peuvent maintenant tirer parti des passes d&apos;optimisation de TurboFan. Par exemple, en faisant passer les [générateurs](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/function*) à la fois par Ignition et TurboFan, les performances des générateurs à l&apos;exécution ont presque triplé.

Pour plus d&apos;informations sur l&apos;adoption d&apos;Ignition et de TurboFan par V8, veuillez consulter [l&apos;article de blog dédié de Benedikt](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/).

## Améliorations de performance

V8 v5.6 apporte un certain nombre d&apos;améliorations clés en termes de mémoire et d&apos;empreinte de performance.

### Saccades induites par la mémoire

[Filtrage concurrent des ensembles mémorisés](https://bugs.chromium.org/p/chromium/issues/detail?id=648568) a été introduit : Une étape de plus vers [Orinoco](/blog/orinoco).

### Performance ES2015 grandement améliorée

Les développeurs commencent généralement à utiliser les nouvelles fonctionnalités du langage avec l&apos;aide de transpileurs en raison de deux défis : la compatibilité rétroactive et les préoccupations de performance.

L'objectif de V8 est de réduire l'écart de performance entre les transpileurs et les performances « natives » ES.next de V8 afin d'éliminer ce dernier défi. Nous avons fait de grands progrès pour rapprocher les performances des nouvelles fonctionnalités du langage de leurs équivalents ES5 transpilés. Dans cette version, vous constaterez que les performances des fonctionnalités ES2015 sont significativement plus rapides que dans les versions précédentes de V8, et dans certains cas, les performances des fonctionnalités ES2015 s'approchent de celles des équivalents transpilés ES5.

En particulier, l'opérateur [spread](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator) devrait maintenant être prêt à être utilisé nativement. Au lieu d'écrire…

```js
// Comme Math.max, mais retourne 0 au lieu de -∞ si aucun argument n'est fourni.
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

…vous pouvez maintenant écrire…

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

…et obtenir des résultats de performance similaires. En particulier, V8 v5.6 inclut des accélérations pour les micro-benchmarks suivants :

- [destructuration](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [destructuration-tableau](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [destructuration-chaîne](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [for-of-tableau](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [générateur](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [spread](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [spread-générateur](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [spread-littéral](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

Voir le graphique ci-dessous pour une comparaison entre V8 v5.4 et v5.6.

![Comparaison des performances des fonctionnalités ES2015 entre V8 v5.4 et v5.6 avec [SixSpeed](https://fhinkel.github.io/six-speed/)](/_img/v8-release-56/perf.png)

Ce n'est que le début ; beaucoup plus est à venir dans les versions futures !

## Fonctionnalités du langage

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) et [`String.prototype.padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) sont les derniers ajouts au stade 4 d'ECMAScript. Ces fonctions de bibliothèque sont officiellement incluses dans v5.6.

:::note
**Remarque :** Déjà supprimé.
:::

## Aperçu du navigateur WebAssembly

Chromium 56 (qui inclut V8 v5.6) va inclure l'aperçu du navigateur WebAssembly. Veuillez consulter [l'article dédié sur le blog](/blog/webassembly-browser-preview) pour plus d'informations.

## API V8

Veuillez consulter notre [résumé des changements API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est mis à jour régulièrement quelques semaines après chaque version majeure.

Les développeurs disposant d'un [checkout actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.6 -t branch-heads/5.6` pour expérimenter les nouvelles fonctionnalités de V8 v5.6. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités bientôt par vous-même.
