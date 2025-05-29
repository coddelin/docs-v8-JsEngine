---
title: "Prise en charge des fonctionnalités"
permalink: /features/support/
layout: layouts/base.njk
description: 'Ce document explique les listes de prise en charge des fonctionnalités des langages JavaScript et WebAssembly telles qu'utilisées sur le site Web de V8.'
---
# Prise en charge des fonctionnalités JavaScript/Wasm

[Nos explications sur les fonctionnalités des langages JavaScript et WebAssembly](/features) incluent souvent des listes de prise en charge des fonctionnalités comme celle-ci :

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

Une fonctionnalité sans aucune prise en charge ressemblerait à ceci :

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

Pour les fonctionnalités de pointe, il est courant de voir une prise en charge mixte entre les environnements :

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

L'objectif est de fournir une vue d'ensemble rapide de la maturité d'une fonctionnalité, non seulement dans V8 et Chrome, mais aussi dans l'ensemble de l'écosystème JavaScript. Notez que cela ne se limite pas aux implémentations natives dans les machines virtuelles JavaScript activement développées comme V8, mais inclut également la prise en charge des outils, représentée ici par l'icône [Babel](https://babeljs.io/).

<!--truncate-->
L'entrée Babel couvre divers aspects :

- Pour les fonctionnalités syntaxiques du langage, telles que [les champs de classe](/features/class-fields), elle fait référence à la prise en charge de la transpilation.
- Pour les fonctionnalités du langage qui sont de nouvelles API, telles que [`Promise.allSettled`](/features/promise-combinators#promise.allsettled), elle fait référence à la prise en charge des polyfills. (Babel propose des polyfills via [le projet core-js](https://github.com/zloirock/core-js).)

Le logo Chrome représente V8, Chromium et tous les navigateurs basés sur Chromium.
