---
title: "Publication de V8 v6.0"
author: "l'équipe de V8"
date: "2017-06-09 13:33:37"
tags: 
  - publication
description: "V8 v6.0 apporte plusieurs améliorations de performance, et introduit la prise en charge des `SharedArrayBuffer` et des propriétés rest/spread pour les objets."
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du dépôt principal Git de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes ravis d’annoncer notre toute dernière branche, [V8 version 6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0), qui sera en version bêta jusqu'à sa sortie coordonnée avec Chrome 60 Stable dans quelques semaines. V8 6.0 regorge de toutes sortes de nouveautés pour les développeurs. Nous aimerions vous donner un aperçu de certaines des fonctionnalités phares en attendant le lancement.

<!--truncate-->
## `SharedArrayBuffer`

V8 v6.0 introduit la prise en charge de [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer), un mécanisme de bas niveau pour partager la mémoire entre les workers JavaScript et synchroniser le flux de contrôle entre les workers. Les SharedArrayBuffer donnent au JavaScript l'accès à une mémoire partagée, aux opérations atomiques et aux futex. Les SharedArrayBuffer ouvrent également la voie au portage des applications multithread sur le web via asm.js ou WebAssembly.

Pour un tutoriel bref et technique, consultez la [page tutorielle](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md) de la spécification ou la [documentation Emscripten](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html) pour porter les pthreads.

## Propriétés rest/spread pour les objets

Cette version introduit les propriétés rest pour l'assignation par déstructuration d'objets et les propriétés spread pour les objets littéraux. Les propriétés rest/spread pour les objets sont des fonctionnalités de l'ES.next au stade 3.

Les propriétés spread offrent également une alternative concise à `Object.assign()` dans de nombreuses situations.

```js
// Propriétés rest pour l'assignation par déstructuration d'objets :
const person = {
  firstName: 'Sebastian',
  lastName: 'Markbåge',
  country: 'USA',
  state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: 'USA', state: 'CA' }

// Propriétés spread pour les objets littéraux :
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

Pour plus d'informations, consultez [notre explication sur les propriétés rest et spread des objets](/features/object-rest-spread).

## Performance de l'ES2015

V8 v6.0 continue d'améliorer les performances des fonctionnalités de l'ES2015. Cette version contient des optimisations des implémentations des fonctionnalités du langage qui, globalement, se traduisent par une amélioration d'environ 10% du score [ARES-6](http://browserbench.org/ARES-6/) de V8.

## API V8

Consultez notre [résumé des changements de l'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque publication majeure.

Les développeurs avec un [dépôt actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.0 -t branch-heads/6.0` pour expérimenter les nouvelles fonctionnalités de V8 6.0. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
