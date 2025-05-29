---
title: "Importer des attributs"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2024-01-31
tags:
  - ECMAScript
description: 'Importer des attributs : l'évolution des assertions d'importation'
tweet: ""
---

## Précédemment

V8 a introduit la fonctionnalité [import assertions](https://chromestatus.com/feature/5765269513306112) dans la version 9.1. Cette fonctionnalité permettait aux déclarations d'importation de modules d'inclure des informations supplémentaires en utilisant le mot-clé `assert`. Ces informations supplémentaires sont actuellement utilisées pour importer des modules JSON et CSS à l'intérieur des modules JavaScript.

<!--truncate-->
## Attributs d'importation

Depuis, les assertions d'importation ont évolué pour devenir les [import attributes](https://github.com/tc39/proposal-import-attributes). Le but de cette fonctionnalité reste le même : permettre aux déclarations d'importation de modules d'inclure des informations supplémentaires.

La différence la plus importante est que les assertions d'importation avaient une sémantique strictement axée sur les assertions, alors que les attributs d'importation ont une sémantique plus souple. Une sémantique strictement axée sur les assertions signifie que les informations supplémentaires n'ont aucun effet sur _la manière_ dont un module est chargé, mais uniquement sur _la possibilité_ qu'il soit chargé. Par exemple, un module JSON est toujours chargé en tant que module JSON en vertu de son type MIME, et la clause `assert { type: 'json' }` ne peut qu'entraîner un échec du chargement si le type MIME du module demandé n'est pas `application/json`.

Cependant, la sémantique axée uniquement sur les assertions avait un défaut majeur. Sur le web, la forme des requêtes HTTP varie en fonction du type de ressource demandé. Par exemple, l'en-tête [`Accept`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) affecte le type MIME de la réponse, et l'en-tête de métadonnées [`Sec-Fetch-Dest`](https://web.dev/articles/fetch-metadata) affecte si le serveur web accepte ou rejette la requête. Comme une assertion d'importation ne pouvait pas influencer _la manière_ de charger un module, elle n'était pas en mesure de modifier la forme de la requête HTTP. Le type de ressource demandée influence également les [Content Security Policies](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) utilisées : les assertions d'importation ne pouvaient pas fonctionner correctement avec le modèle de sécurité du web.

Les attributs d'importation assouplissent la sémantique des assertions en permettant aux attributs d'influencer la manière dont un module est chargé. En d'autres termes, les attributs d'importation peuvent générer des requêtes HTTP contenant les en-têtes `Accept` et `Sec-Fetch-Dest` appropriés. Pour aligner la syntaxe sur les nouvelles sémantiques, l'ancien mot-clé `assert` est remplacé par `with` :

```javascript
// main.mjs
//
// Nouvelle syntaxe 'with'.
import json from './foo.json' with { type: 'json' };
console.log(json.answer); // 42
```

## `import()` dynamique

De manière similaire, [`import()` dynamique](https://v8.dev/features/dynamic-import#dynamic) est également mis à jour pour accepter une option `with`.

```javascript
// main.mjs
//
// Nouvelle option 'with'.
const jsonModule = await import('./foo.json', {
  with: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

## Disponibilité de `with`

Les attributs d'importation sont activés par défaut dans V8 v12.3.

## Dépréciation et suppression éventuelle de `assert`

Le mot-clé `assert` est déprécié depuis V8 v12.3 et sera probablement supprimé dans la version v12.6. Veuillez utiliser `with` à la place de `assert` ! L'utilisation de la clause `assert` affichera un avertissement dans la console vous invitant à utiliser `with` à la place.

## Support des attributs d'importation

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="non"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="oui https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
