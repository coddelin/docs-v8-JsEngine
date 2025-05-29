---
title: "Des API d'internationalisation plus rapides et riches en fonctionnalités"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: "2019-04-25 16:45:37"
avatars: 
  - "sathya-gunasekaran"
tags: 
  - ECMAScript
  - Intl
description: "L'API d'internationalisation de JavaScript se développe, et son implémentation dans V8 devient plus rapide !"
tweet: "1121424877142122500"
---
[La spécification de l'API d'internationalisation ECMAScript](https://tc39.es/ecma402/) (ECMA-402, ou `Intl`) fournit des fonctionnalités clés spécifiques à chaque langue, comme le formatage des dates, des nombres, la sélection des formes plurielles et le classement. Les équipes Chrome V8 et Google Internationalization ont collaboré pour ajouter des fonctionnalités à l'implémentation ECMA-402 de V8, tout en nettoyant les dettes techniques et en améliorant les performances ainsi que l'interopérabilité avec d'autres navigateurs.

<!--truncate-->
## Améliorations architecturales fondamentales

Initialement, la spécification ECMA-402 était majoritairement implémentée en JavaScript en utilisant des extensions V8 et était située en dehors du code source de V8. L'utilisation de l'API d'extension externe signifiait que plusieurs des API internes à V8 utilisées pour le contrôle de type, la gestion du cycle de vie des objets C++ externes et le stockage des données privées internes ne pouvaient pas être utilisées. Dans le cadre de l'amélioration des performances de démarrage, cette implémentation a ensuite été déplacée vers le code source de V8 pour permettre [la prise d'instantanés](/blog/custom-startup-snapshots) des fonctionnalités intégrées.

V8 utilise des `JSObject`s spécialisés avec des [formes personnalisées (classes cachées)](https://mathiasbynens.be/notes/shapes-ics) pour décrire les objets JavaScript intégrés spécifiés par ECMAScript (tels que `Promise`, `Map`, `Set`, etc.). Cette approche permet à V8 de pré-allouer le nombre requis d'emplacements internes et de générer des accès rapides à ceux-ci, au lieu de faire croître l'objet une propriété à la fois, ce qui entraînerait des performances plus lentes et une utilisation de la mémoire moins efficace.

L'implémentation de `Intl` n'était pas modélisée selon une telle architecture, en raison de la séparation historique. Ainsi, tous les objets JavaScript intégrés spécifiés par la spécification d'internationalisation (comme `NumberFormat`, `DateTimeFormat`) étaient des `JSObject` génériques qui devaient passer par plusieurs modifications de propriété pour leurs emplacements internes.

Un autre effet du manque de `JSObject`s spécialisés était que le contrôle de type devenait plus complexe. Les informations de type étaient stockées sous un symbole privé et contrôlées à la fois côté JS et C++ à l'aide d'un accès aux propriétés coûteux, plutôt que par une simple recherche de forme.

### Modernisation de la base de code

Avec le mouvement actuel de l'abandon de l'écriture des fonctionnalités intégrées auto-hébergées dans V8, il était logique de profiter de cette opportunité pour moderniser l'implémentation d'ECMA402.

### Abandon de l'auto-hébergement JS

Bien que l'auto-hébergement permette d'écrire un code concis et lisible, l'utilisation fréquente d'appels au runtime lents pour accéder aux API ICU provoquait des problèmes de performances. En conséquence, une grande partie des fonctionnalités ICU étaient dupliquées en JavaScript pour réduire le nombre de ces appels au runtime.

En réécrivant les fonctionnalités intégrées en C++, il est devenu beaucoup plus rapide d'accéder aux API ICU, car il n'y a plus de surcharge d'appel au runtime.

### Amélioration d'ICU

ICU est un ensemble de bibliothèques C/C++ utilisées par un grand nombre d'applications, y compris tous les principaux moteurs JavaScript, pour fournir un support Unicode et de mondialisation. Dans le cadre du passage de `Intl` à ICU dans l'implémentation de V8, nous avons [identifié](https://unicode-org.atlassian.net/browse/ICU-20140) [et](https://unicode-org.atlassian.net/browse/ICU-9562) [corrigé](https://unicode-org.atlassian.net/browse/ICU-20098) plusieurs bogues ICU.

Dans le cadre de l'implémentation de nouvelles propositions telles que [`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat), [`Intl.ListFormat`](/features/intl-listformat) et `Intl.Locale`, nous avons étendu ICU en ajoutant [plusieurs](https://unicode-org.atlassian.net/browse/ICU-13256) [nouvelles](https://unicode-org.atlassian.net/browse/ICU-20121) [API](https://unicode-org.atlassian.net/browse/ICU-20342) pour prendre en charge ces nouvelles propositions ECMAScript.

Toutes ces ajouts aident les autres moteurs JavaScript à implémenter plus rapidement ces propositions, faisant avancer le web ! Par exemple, le développement est en cours dans Firefox pour implémenter plusieurs nouvelles API `Intl` basées sur notre travail avec ICU.

## Performances

En conséquence de ce travail, nous avons amélioré les performances de l'API d'internationalisation en optimisant plusieurs voies rapides et en mettant en cache l'initialisation des différents objets `Intl` et des méthodes `toLocaleString` sur `Number.prototype`, `Date.prototype` et `String.prototype`.

Par exemple, la création d'un nouvel objet `Intl.NumberFormat` est devenue environ 24× plus rapide.

![[Microrésultats](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js) testant les performances de création de divers objets `Intl`](/_img/intl/performance.svg)

Notez qu'il est recommandé, pour une meilleure performance, de créer explicitement *et de réutiliser* un objet `Intl.NumberFormat`, `Intl.DateTimeFormat` ou `Intl.Collator`, plutôt que d'appeler des méthodes comme `toLocaleString` ou `localeCompare`.

## Nouvelles fonctionnalités `Intl`

Tout ce travail a fourni une excellente base pour développer de nouvelles fonctionnalités, et nous continuons à déployer toutes les nouvelles propositions d'internationalisation qui sont au stade 3.

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) a été lancé dans Chrome 71, [`Intl.ListFormat`](/features/intl-listformat) dans Chrome 72, [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale) dans Chrome 74, et les options [`dateStyle` et `timeStyle` pour `Intl.DateTimeFormat`](https://github.com/tc39/proposal-intl-datetime-style) ainsi que le support de [BigInt pour `Intl.DateTimeFormat`](https://github.com/tc39/ecma402/pull/236) sont en cours de déploiement dans Chrome 76. [`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange), [`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/), et [des options supplémentaires pour `Intl.NumberFormat`](https://github.com/tc39/proposal-unified-intl-numberformat/) sont actuellement en développement dans V8 et nous espérons les déployer bientôt !

Bon nombre de ces nouvelles APIs, ainsi que d'autres en cours de développement, sont dues à notre travail de standardisation de nouvelles fonctionnalités pour aider les développeurs en matière d'internationalisation. [`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames) est une proposition de stade 1 qui permet de localiser les noms d'affichage des langues, régions ou scripts. [`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange) est une proposition de stade 3 qui spécifie un moyen de formater les plages de dates de manière concise et locale. [La proposition API unifiée `Intl.NumberFormat`](https://github.com/tc39/proposal-unified-intl-numberformat) est une proposition de stade 3 qui améliore `Intl.NumberFormat` en ajoutant le support des unités de mesure, des politiques d'affichage des devises et des signes, ainsi que des notations scientifique et compacte. Vous pouvez également contribuer à l'avenir de ECMA-402 en participant à [son dépôt GitHub](https://github.com/tc39/ecma402).

## Conclusion

`Intl` offre une API riche en fonctionnalités pour plusieurs opérations nécessaires à l'internationalisation de votre application web, en laissant la charge principale au navigateur, sans transmettre autant de données ou de code. Une réflexion approfondie sur l'utilisation correcte de ces APIs peut améliorer la manière dont votre interface fonctionne dans différents lieux. Grâce au travail des équipes Google V8 et i18n en collaboration avec TC39 et son sous-groupe ECMA-402, vous pouvez désormais accéder à davantage de fonctionnalités avec de meilleures performances, et attendre des améliorations supplémentaires au fil du temps.
