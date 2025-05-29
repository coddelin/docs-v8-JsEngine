---
title: "Publication de V8 v6.1"
author: "l'équipe V8"
date: "2017-08-03 13:33:37"
tags: 
  - publication
description: "V8 v6.1 arrive avec une taille de binaire réduite et inclut des améliorations de performance. De plus, asm.js est maintenant validé et compilé en WebAssembly."
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est branchée depuis le dépôt maître de V8 juste avant une étape de Chrome Beta. Aujourd'hui, nous sommes ravis d'annoncer notre dernière branche, [V8 version 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1), qui est en version bêta jusqu'à sa publication en coordination avec la version stable de Chrome 61 dans quelques semaines. V8 v6.1 est rempli de toutes sortes de fonctionnalités intéressantes pour les développeurs. Nous souhaitons vous donner un aperçu de certains des points forts en prévision de la publication.

<!--truncate-->
## Améliorations de performances

La visite de tous les éléments des Maps et Sets — soit via [itération](http://exploringjs.com/es6/ch_iteration.html) soit via les méthodes [`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) — est devenue significativement plus rapide, avec une amélioration brute des performances allant jusqu'à 11× depuis la version 6.0 de V8. Consultez [l'article dédié](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/) pour plus d'informations.

![](/_img/v8-release-61/iterating-collections.svg)

En outre, le travail sur les performances d'autres fonctionnalités du langage s'est poursuivi. Par exemple, la méthode [`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf), qui est importante pour le code sans constructeur utilisant principalement des littéraux d'objets et `Object.create` au lieu des classes et des fonctions constructrices, est désormais toujours aussi rapide et souvent plus rapide que l'utilisation de [l'opérateur `instanceof`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof).

![](/_img/v8-release-61/checking-prototype.svg)

Les appels de fonctions et les invocations de constructeurs avec un nombre variable d'arguments sont également devenus significativement plus rapides. Les appels effectués avec [`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) et [`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct) ont reçu une amélioration des performances allant jusqu'à 17× dans la dernière version.

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach` est maintenant en ligne dans TurboFan et optimisé pour tous les principaux [types d'éléments](/blog/elements-kinds) non percés.

## Réduction de la taille binaire

L'équipe V8 a complètement supprimé le compilateur Crankshaft obsolète, ce qui donne une réduction significative de la taille binaire. En parallèle de la suppression du générateur de fonctions intégrées, cela réduit la taille binaire déployée de V8 de plus de 700 KB, en fonction de la plateforme exacte.

## asm.js est maintenant validé et compilé en WebAssembly

Si V8 rencontre du code asm.js, il tente désormais de le valider. Le code asm.js valide est ensuite transpilé en WebAssembly. Selon les évaluations de performance de V8, cela améliore généralement le débit des performances. En raison de l'étape de validation ajoutée, des régressions isolées des performances de démarrage peuvent survenir.

Veuillez noter que cette fonctionnalité a été activée par défaut uniquement sur le côté Chromium. Si vous êtes un intégrateur et souhaitez utiliser le validateur asm.js, activez l'option `--validate-asm`.

## WebAssembly

Lors du débogage de WebAssembly, il est désormais possible d'afficher les variables locales dans DevTools lorsqu'un point d'arrêt dans le code WebAssembly est atteint.

## API V8

Veuillez consulter notre [résumé des changements d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque publication majeure.

Les développeurs disposant d'un [extrait V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.1 -t branch-heads/6.1` pour expérimenter les nouvelles fonctionnalités de V8 v6.1. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités vous-même.
