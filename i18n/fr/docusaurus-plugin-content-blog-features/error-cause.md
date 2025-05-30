---
title: "Causes d'erreur"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars: 
  - "victor-gomes"
date: 2021-07-07
tags: 
  - ECMAScript
description: "JavaScript prend désormais en charge les causes d'erreur."
tweet: "1412774651558862850"
---

Imaginez que vous avez une fonction qui appelle deux charges de travail distinctes `doSomeWork` et `doMoreWork`. Les deux fonctions peuvent lancer le même type d'erreurs, mais vous devez les traiter de manière différente.

Attraper l'erreur et la relancer avec des informations contextuelles supplémentaires est une approche courante à ce problème, par exemple :

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError('Échec d'une tâche', err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // Est-ce que |err| vient de |doSomeWork| ou de |doMoreWork| ?
}
```

Malheureusement, la solution ci-dessus est laborieuse, car il faut créer son propre `CustomError`. Et pire encore, aucun outil de développement n'est capable de fournir des messages de diagnostic utiles pour les exceptions inattendues, car il n'y a pas de consensus sur la manière de représenter correctement ces erreurs.

<!--truncate-->
Ce qui manquait jusqu'à présent, c'est une manière standard de chaîner les erreurs. JavaScript prend désormais en charge les causes d'erreur. Un paramètre supplémentaire d'options peut être ajouté au constructeur `Error` avec une propriété `cause`, dont la valeur sera assignée aux instances d'erreur. Les erreurs peuvent alors être facilement chaînées.

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error('Échec d'une tâche', { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error('Échec d'une autre tâche', { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case 'Échec d'une tâche':
      handleSomeWorkFailure(err.cause);
      break;
    case 'Échec d'une autre tâche':
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

Cette fonctionnalité est disponible dans V8 v9.3.

## Prise en charge des causes d'erreur

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
