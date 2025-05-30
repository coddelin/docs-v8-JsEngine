---
title: "Aperçu du navigateur WebAssembly"
author: "l'équipe V8"
date: "2016-10-31 13:33:37"
tags: 
  - WebAssembly
description: "WebAssembly ou Wasm est un nouveau runtime et une cible de compilation pour le web, désormais disponible avec un flag dans Chrome Canary !"
---
Aujourd'hui, nous sommes heureux d'annoncer, en tandem avec [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview) et [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/), un aperçu du navigateur WebAssembly. [WebAssembly](http://webassembly.org/) ou Wasm est un nouveau runtime et une cible de compilation pour le web, conçu par des collaborateurs de Google, Mozilla, Microsoft, Apple et du [Groupe Communautaire WebAssembly du W3C](https://www.w3.org/community/webassembly/).

<!--truncate-->
## Que marque cette étape ?

Cette étape est significative car elle marque :

- une version candidate pour notre [MVP](http://webassembly.org/docs/mvp/) (produit minimum viable) design (y compris [sémantique](http://webassembly.org/docs/semantics/), [format binaire](http://webassembly.org/docs/binary-encoding/) et [API JS](http://webassembly.org/docs/js/))
- des implémentations compatibles et stables de WebAssembly avec un flag dans les branches principales de V8 et SpiderMonkey, dans les builds de développement de Chakra, et en cours dans JavaScriptCore
- une [chaîne d'outils fonctionnelle](http://webassembly.org/getting-started/developers-guide/) pour les développeurs qui permet de compiler des modules WebAssembly à partir de fichiers source C/C++
- une [feuille de route](http://webassembly.org/roadmap/) pour livrer WebAssembly activé par défaut, sauf modifications basées sur les retours de la communauté

Vous pouvez en savoir plus sur WebAssembly sur le [site du projet](http://webassembly.org/) ainsi que suivre notre [guide du développeur](http://webassembly.org/getting-started/developers-guide/) pour tester la compilation WebAssembly depuis C & C++ en utilisant Emscripten. Les documents sur le [format binaire](http://webassembly.org/docs/binary-encoding/) et l'[API JS](http://webassembly.org/docs/js/) décrivent respectivement l'encodage binaire de WebAssembly et le mécanisme pour instancier des modules WebAssembly dans le navigateur. Voici un rapide exemple pour montrer à quoi ressemble wasm :

![Une implémentation de la fonction du Plus Grand Commun Diviseur en WebAssembly, montrant les octets bruts, le format texte (WAST) et le code source C.](/_img/webassembly-browser-preview/gcd.svg)

Étant donné que WebAssembly est toujours derrière un flag dans Chrome ([chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)), il n'est pas encore recommandé pour une utilisation en production. Cependant, la période d'aperçu du navigateur marque un moment pendant lequel nous collectons activement des [retours](http://webassembly.org/community/feedback/) sur la conception et l'implémentation de la spécification. Les développeurs sont encouragés à tester la compilation, le portage des applications et leur exécution dans le navigateur.

V8 continue d'optimiser l'implémentation de WebAssembly dans le [compilateur TurboFan](/blog/turbofan-jit). Depuis mars dernier, lorsque nous avons annoncé pour la première fois le support expérimental, nous avons ajouté la prise en charge de la compilation parallèle. De plus, nous approchons de l'achèvement d'un pipeline asm.js alternatif, qui convertit asm.js en WebAssembly [en arrière-plan](https://www.chromestatus.com/feature/5053365658583040), permettant ainsi aux sites asm.js existants de bénéficier de certains avantages de la compilation anticipée de WebAssembly.

## Et après ?

Sauf modifications majeures du design issues des retours de la communauté, le Groupe Communautaire WebAssembly prévoit de produire une spécification officielle au premier trimestre 2017, moment où les navigateurs seront encouragés à activer WebAssembly par défaut. À partir de ce moment, le format binaire sera réinitialisé à la version 1 et WebAssembly deviendra sans version, testé par fonctionnalités, et rétrocompatible. Une [feuille de route](http://webassembly.org/roadmap/) plus détaillée est disponible sur le site du projet WebAssembly.
