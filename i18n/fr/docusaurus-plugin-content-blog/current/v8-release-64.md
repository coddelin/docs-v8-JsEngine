---
title: "Version V8 v6.4"
author: "l'équipe V8"
date: "2017-12-19 13:33:37"
tags: 
  - version
description: "V8 v6.4 inclut des améliorations de performance, de nouvelles fonctionnalités du langage JavaScript, et plus encore."
tweet: "943057597481082880"
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de version](/docs/release-process). Chaque version est créée à partir de la branche principale de V8 juste avant une étape de Chrome Beta. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4), qui est en version bêta jusqu'à son lancement en coordination avec Chrome 64 Stable dans plusieurs semaines. V8 v6.4 est rempli de toutes sortes d'améliorations pour les développeurs. Ce post présente certains des points forts en attendant la sortie.

<!--truncate-->
## Vitesse

V8 v6.4 [améliore](https://bugs.chromium.org/p/v8/issues/detail?id=6971) les performances de l'opérateur `instanceof` par un facteur de 3,6. En conséquence directe, [uglify-js](http://lisperator.net/uglifyjs/) est maintenant 15 à 20 % plus rapide selon le [Web Tooling Benchmark de V8](https://github.com/v8/web-tooling-benchmark).

Cette version corrige également quelques points de faiblesse dans `Function.prototype.bind`. Par exemple, TurboFan [inline désormais de manière cohérente](https://bugs.chromium.org/p/v8/issues/detail?id=6946) tous les appels monomorphiques à `bind`. En outre, TurboFan prend également en charge le _patron de rappel lié_, ce qui signifie que, au lieu de ceci :

```js
doSomething(callback, someObj);
```

Vous pouvez désormais utiliser :

```js
doSomething(callback.bind(someObj));
```

De cette façon, le code est plus lisible, et vous conservez les mêmes performances.

Grâce aux dernières contributions de [Peter Wong](https://twitter.com/peterwmwong), [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) et [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) sont maintenant implémentés en utilisant le [CodeStubAssembler](/blog/csa), ce qui entraîne des améliorations de performance allant jusqu'à 5× sur toute la ligne.

![](/_img/v8-release-64/weak-collection.svg)

Dans le cadre des [efforts continus](https://bugs.chromium.org/p/v8/issues/detail?id=1956) de V8 pour améliorer les performances des méthodes intégrées des tableaux, nous avons amélioré les performances de `Array.prototype.slice` d'environ 4× en le réimplémentant avec le CodeStubAssembler. En outre, les appels à `Array.prototype.map` et `Array.prototype.filter` sont désormais inlineés dans de nombreux cas, offrant un profil de performance compétitif avec les versions écrites à la main.

Nous avons travaillé pour que les chargements hors limites dans les tableaux, tableaux typés, et chaînes [n'entraînent plus une pénalité de performance de ~10×](https://bugs.chromium.org/p/v8/issues/detail?id=7027) après avoir remarqué [ce modèle de codage](/blog/elements-kinds#avoid-reading-beyond-length) utilisé dans la nature.

## Mémoire

Les objets de code intégrés de V8 et les gestionnaires de bytecode sont désormais désérialisés de manière paresseuse à partir de l'instantané, ce qui peut réduire significativement la mémoire consommée par chaque Isolate. Des benchmarks dans Chrome montrent des économies de plusieurs centaines de kilooctets par onglet lors de la navigation sur des sites courants.

![](/_img/v8-release-64/codespace-consumption.svg)

Attendez-vous à un article de blog dédié sur ce sujet tôt l'année prochaine.

## Fonctionnalités du langage ECMAScript

Cette version de V8 inclut la prise en charge de deux nouvelles fonctionnalités intéressantes des expressions régulières.

Dans les expressions régulières avec l'indicateur `/u`, les [échappements de propriétés Unicode](https://mathiasbynens.be/notes/es-unicode-property-escapes) sont maintenant activés par défaut.

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

La prise en charge des [groupes de capture nommés](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) dans les expressions régulières est maintenant activée par défaut.

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec('2017-12-15');
// result.groups.year === '2017'
// result.groups.month === '12'
// result.groups.day === '15'
```

Plus de détails sur ces fonctionnalités sont disponibles dans notre article de blog intitulé [Fonctionnalités à venir des expressions régulières](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

Grâce à [Groupon](https://twitter.com/GrouponEng), V8 implémente désormais [`import.meta`](https://github.com/tc39/proposal-import-meta), ce qui permet aux intégrateurs d'exposer des métadonnées spécifiques à l'hôte concernant le module actuel. Par exemple, Chrome 64 expose l'URL du module via `import.meta.url`, et Chrome prévoit d'ajouter davantage de propriétés à `import.meta` à l'avenir.

Pour faciliter le formatage localisé des chaînes produites par les formateurs d'internationalisation, les développeurs peuvent désormais utiliser [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts) pour formatter un nombre en une liste de jetons et leur type. Merci à [Igalia](https://twitter.com/igalia) pour avoir implémenté cela dans V8 !

## API V8

Veuillez utiliser `git log branch-heads/6.3..branch-heads/6.4 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs disposant d'un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.4 -t branch-heads/6.4` pour expérimenter les nouvelles fonctionnalités de V8 v6.4. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer prochainement les nouvelles fonctionnalités par vous-même.
