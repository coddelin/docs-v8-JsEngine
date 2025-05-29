---
title: &apos;Assertions d'importation&apos;
author: &apos;Dan Clark ([@dandclark1](https://twitter.com/dandclark1)), importateur assertif d&apos;assertions d&apos;importation&apos;
avatars:
  - &apos;dan-clark&apos;
date: 2021-06-15
tags:
  - ECMAScript
description: &apos;Les assertions d&apos;importation permettent aux instructions d&apos;importation de module d&apos;inclure des informations supplémentaires en plus du spécificateur de module&apos;
tweet: &apos;&apos;
---

La nouvelle fonctionnalité [assertions d'importation](https://github.com/tc39/proposal-import-assertions) permet aux instructions d'importation de module d'inclure des informations supplémentaires en plus du spécificateur de module. Une utilisation initiale de cette fonctionnalité est de permettre l'importation de documents JSON sous forme de [modules JSON](https://github.com/tc39/proposal-json-modules) :

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from &apos;./foo.json&apos; assert { type: &apos;json&apos; };
console.log(json.answer); // 42
```

## Contexte : Modules JSON et type MIME

Une question naturelle à poser est pourquoi un module JSON ne pourrait pas simplement être importé comme suit :

```javascript
import json from &apos;./foo.json&apos;;
```

La plateforme web vérifie le type MIME d'une ressource de module pour sa validité avant de l'exécuter, et en théorie ce type MIME pourrait également être utilisé pour déterminer s'il faut traiter la ressource comme un module JSON ou JavaScript.

Cependant, il existe un [problème de sécurité](https://github.com/w3c/webcomponents/issues/839) en se basant uniquement sur le type MIME.

Les modules peuvent être importés de manière inter-origin, et un développeur pourrait importer un module JSON d'une source tierce. Il pourrait considérer cela comme fondamentalement sûr même venant d'une source non fiable tant que le JSON est correctement désinfecté, puisque l'importation de JSON n'exécutera pas de script.

Cependant, un script tiers peut en réalité être exécuté dans ce scénario car le serveur tiers pourrait répondre de manière inattendue avec un type MIME JavaScript et une charge utile JavaScript malveillante, exécutant du code dans le domaine de l'importateur.

```javascript
// Exécute JS si evil.com répond avec un
// type MIME JavaScript (par exemple `text/javascript`) !
import data from &apos;https://evil.com/data.json&apos;;
```

Les extensions de fichier ne peuvent pas être utilisées pour déterminer le type de module car elles [ne sont pas un indicateur fiable du type de contenu sur le web](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md). Nous utilisons donc des assertions d'importation pour indiquer le type de module attendu et prévenir ce piège d'escalade de privilèges.

Lorsqu'un développeur souhaite importer un module JSON, il doit utiliser une assertion d'importation pour spécifier qu'il s'agit de JSON. L'importation échouera si le type MIME reçu du réseau ne correspond pas au type attendu :

```javascript
// Échoue si evil.com répond avec un type MIME non-JSON.
import data from &apos;https://evil.com/data.json&apos; assert { type: &apos;json&apos; };
```

## `import()` dynamique

Les assertions d'importation peuvent également être passées à [`import()` dynamique](https://v8.dev/features/dynamic-import#dynamic) avec un nouveau deuxième paramètre :

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import(&apos;./foo.json&apos;, {
  assert: { type: &apos;json&apos; }
});
console.log(jsonModule.default.answer); // 42
```

Le contenu JSON est l'exportation par défaut du module, il est donc référencé via la propriété `default` sur l'objet retourné par `import()`.

## Conclusion

Actuellement, la seule utilisation spécifiée des assertions d'importation est pour la spécification du type de module. Cependant, la fonctionnalité a été conçue pour permettre des paires clé/valeur d'assertions arbitraires, de sorte que des utilisations supplémentaires pourraient être ajoutées à l'avenir si cela devient utile pour restreindre les importations de modules d'autres manières.

En attendant, les modules JSON avec la nouvelle syntaxe d'assertions d'importation sont disponibles par défaut dans Chromium 91. [Les scripts de modules CSS](https://chromestatus.com/feature/5948572598009856) arrivent bientôt également, utilisant la même syntaxe d'assertion de type de module.

## Prise en charge des assertions d'importation

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="non"
                 safari="non"
                 nodejs="non"
                 babel="oui https://github.com/babel/babel/pull/12139"></feature-support>
