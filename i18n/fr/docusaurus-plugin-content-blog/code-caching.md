---
title: "Mise en cache de code"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), Ingénieur logiciel"
avatars: 
  - "yang-guo"
date: "2015-07-27 13:33:37"
tags: 
  - internals
description: "V8 prend désormais en charge la mise en cache du (byte)code, c'est-à-dire la mise en cache du résultat de l'analyse et de la compilation du code JavaScript."
---
V8 utilise [la compilation juste-à-temps](https://en.wikipedia.org/wiki/Just-in-time_compilation) (JIT) pour exécuter le code JavaScript. Cela signifie que, juste avant d'exécuter un script, celui-ci doit être analysé et compilé — ce qui peut engendrer une surcharge considérable. Comme nous l'avons [annoncé récemment](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html), la mise en cache de code est une technique qui réduit cette surcharge. Lorsqu'un script est compilé pour la première fois, des données de cache sont produites et stockées. La prochaine fois que V8 doit compiler le même script, même dans une instance différente de V8, il peut utiliser les données de cache pour recréer le résultat de compilation au lieu de compiler depuis le début. En conséquence, le script est exécuté beaucoup plus rapidement.

<!--truncate-->
La mise en cache de code est disponible depuis la version 4.2 de V8 et n'est pas limitée à Chrome uniquement. Elle est exposée via l'API de V8, permettant à tout intégrateur de V8 d'en tirer profit. Le [cas de test](https://chromium.googlesource.com/v8/v8.git/+/4.5.56/test/cctest/test-api.cc#21090) utilisé pour évaluer cette fonctionnalité sert d'exemple sur la manière d'utiliser cette API.

Lorsqu'un script est compilé par V8, des données de cache peuvent être produites pour accélérer les compilations ultérieures en passant `v8::ScriptCompiler::kProduceCodeCache` comme option. Si la compilation réussit, les données de cache sont attachées à l'objet source et peuvent être récupérées via `v8::ScriptCompiler::Source::GetCachedData`. Elles peuvent ensuite être conservées pour une utilisation ultérieure, par exemple en les écrivant sur disque.

Lors des compilations ultérieures, les données de cache précédemment produites peuvent être attachées à l'objet source et `v8::ScriptCompiler::kConsumeCodeCache` peut être passé comme option. Cette fois-ci, le code sera produit beaucoup plus rapidement, car V8 contourne la compilation du code et le désérialise à partir des données de cache fournies.

La production de données de cache implique un certain coût en termes de calcul et de mémoire. Pour cette raison, Chrome ne produit des données de cache que si le même script est vu au moins deux fois en quelques jours. Ainsi, Chrome est capable de transformer les fichiers de script en code exécutable deux fois plus rapidement en moyenne, économisant un temps précieux aux utilisateurs lors de chaque chargement de page ultérieur.
