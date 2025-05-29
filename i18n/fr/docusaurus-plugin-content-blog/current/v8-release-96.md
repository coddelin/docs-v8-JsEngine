---
title: 'Sortie de V8 version v9.6'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-10-13
tags:
 - sortie
description: 'La sortie de V8 version v9.6 apporte la prise en charge des types de référence pour WebAssembly.'
tweet: '1448262079476076548'
---
Toutes les quatre semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du master Git de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [V8 version 9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6), qui est en bêta jusqu'à sa sortie en coordination avec Chrome 96 Stable dans plusieurs semaines. V8 v9.6 regorge de nouvelles fonctionnalités pour les développeurs. Ce message offre un aperçu de certains des points forts en prévision de la sortie.

<!--truncate-->
## WebAssembly

### Types de Référence

La [proposition des types de référence](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md), publiée dans V8 v9.6, permet d'utiliser des références externes depuis JavaScript de manière opaque dans les modules WebAssembly. Le type de données `externref` (anciennement connu sous le nom `anyref`) offre un moyen sécurisé de conserver une référence à un objet JavaScript et est entièrement intégré au ramasse-miettes de V8.

Quelques chaînes d'outils qui ont déjà une prise en charge optionnelle des types de référence sont [wasm-bindgen pour Rust](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html) et [AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options).

## API V8

Veuillez utiliser `git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h` pour obtenir une liste des modifications de l'API.

Les développeurs ayant un dépôt actif V8 peuvent utiliser `git checkout -b 9.6 -t branch-heads/9.6` pour expérimenter les nouvelles fonctionnalités de V8 v9.6. Sinon, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités vous-même.
