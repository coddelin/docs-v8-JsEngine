---
title: "Sortie de V8 v7.0"
author: "Michael Hablich"
avatars:
  - michael-hablich
date: 2018-10-15 17:17:00
tags:
  - sortie
description: "V8 v7.0 inclut les threads WebAssembly, Symbol.prototype.description, et des built-ins intégrés sur davantage de plateformes !"
tweet: "1051857446279532544"
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du dépôt principal de V8 juste avant une étape Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre toute nouvelle branche, [V8 version 7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0), qui est en phase Beta jusqu'à sa sortie en coordination avec Chrome 70 Stable dans plusieurs semaines. V8 v7.0 est remplie de nouveautés orientées développeurs. Ce billet offre un aperçu de certains des points forts en vue de la sortie prochaine.

<!--truncate-->
## Built-ins intégrés

[Les built-ins intégrés](/blog/embedded-builtins) permettent de réduire l'utilisation de mémoire en partageant le code généré entre plusieurs Isolates V8. Depuis V8 v6.9, nous avons activé les built-ins intégrés sur x64. V8 v7.0 étend ces économies de mémoire à toutes les plateformes restantes sauf ia32.

## Un aperçu des threads WebAssembly

WebAssembly (Wasm) permet la compilation de code écrit en C++ et d'autres langages pour une exécution sur le web. Une fonctionnalité très utile des applications natives est la capacité d'utiliser des threads — un mécanisme pour le calcul parallèle. La plupart des développeurs en C et C++ connaissent probablement pthreads, une API standardisée pour la gestion des threads d'application.

Le [WebAssembly Community Group](https://www.w3.org/community/webassembly/) travaille à l'introduction de threads sur le web afin de permettre de véritables applications multi-threadées. Dans le cadre de cet effort, V8 a implémenté le support nécessaire pour les threads dans le moteur WebAssembly. Pour utiliser cette fonctionnalité dans Chrome, vous pouvez l'activer via `chrome://flags/#enable-webassembly-threads`, ou votre site peut s'inscrire à un [Origin Trial](https://github.com/GoogleChrome/OriginTrials). Les Origin Trials permettent aux développeurs d'expérimenter de nouvelles fonctionnalités web avant qu'elles ne soient entièrement standardisées, ce qui nous aide à recueillir des retours du monde réel, essentiels pour valider et améliorer les nouvelles fonctionnalités.

## Fonctionnalités du langage JavaScript

[Une propriété `description`](https://tc39.es/proposal-Symbol-description/) est ajoutée à `Symbol.prototype`. Cela offre un moyen plus ergonomique d'accéder à la description d'un `Symbol`. Auparavant, la description ne pouvait être accessible qu'indirectement via `Symbol.prototype.toString()`. Merci à Igalia d'avoir contribué à cette implémentation !

`Array.prototype.sort` est désormais stable dans V8 v7.0. Auparavant, V8 utilisait un QuickSort instable pour les tableaux comportant plus de 10 éléments. Nous utilisons maintenant l'algorithme stable TimSort. Consultez [notre billet de blog](/blog/array-sort) pour plus de détails.

## API de V8

Veuillez utiliser `git log branch-heads/6.9..branch-heads/7.0 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs ayant une [copie active de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.0 -t branch-heads/7.0` pour expérimenter les nouvelles fonctionnalités de V8 v7.0. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités très prochainement.
