---
title: &apos;Sortie de V8 version v5.2&apos;
author: &apos;l&apos;équipe V8&apos;
date: 2016-06-04 13:33:37
tags:
  - sortie
description: &apos;V8 v5.2 inclut la prise en charge des fonctionnalités linguistiques ES2016.&apos;
---
Environ toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du dépôt Git principal de V8 immédiatement avant que Chrome ne crée une branche pour une étape de Chrome Beta. Aujourd&apos;hui, nous sommes ravis d&apos;annoncer notre nouvelle branche, [V8 version 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2), qui sera en version bêta jusqu&apos;à sa sortie en coordination avec Chrome 52 Stable. V8 5.2 est rempli de toutes sortes de nouveautés destinées aux développeurs, nous aimerions donc vous donner un aperçu de certains des points forts en prévision de la sortie dans plusieurs semaines.

<!--truncate-->
## Support d&apos;ES2015 et ES2016

V8 v5.2 contient la prise en charge d&apos;ES2015 (alias ES6) et ES2016 (alias ES7).

### Opérateur d&apos;exponentiation

Cette version prend en charge l&apos;opérateur d&apos;exponentiation ES2016, une notation infixe qui remplace `Math.pow`.

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### Spécification évolutive

Pour plus d&apos;informations sur la complexité liée au support des spécifications évolutives et aux discussions continues sur les normes concernant les bugs de compatibilité Web et les appels en queue, consultez l&apos;article de blog V8 [ES2015, ES2016, et au-delà](/blog/modern-javascript).

## Performance

V8 v5.2 contient d&apos;autres optimisations pour améliorer les performances des fonctionnalités intégrées de JavaScript, y compris des améliorations pour les opérations sur les tableaux comme la méthode isArray, l&apos;opérateur in et Function.prototype.bind. Ceci fait partie d&apos;un travail continu pour accélérer les fonctionnalités intégrées basé sur une nouvelle analyse des statistiques d&apos;appels d&apos;exécution sur des pages Web populaires. Pour plus d&apos;informations, consultez [la présentation V8 de Google I/O 2016](https://www.youtube.com/watch?v=N1swY14jiKc) et surveillez un prochain article de blog sur les optimisations de performance tirées des sites Web réels.

## API V8

Veuillez consulter notre [résumé des modifications de l&apos;API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque version majeure.

Les développeurs ayant une [version active de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.2 -t branch-heads/5.2` pour expérimenter les nouvelles fonctionnalités de V8 v5.2. Vous pouvez également [vous abonner au canal beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités par vous-même prochainement.
