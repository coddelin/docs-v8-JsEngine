---
title: &apos;Causes d&apos;erreur&apos;
author: &apos;Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))&apos;
avatars:
  - &apos;victor-gomes&apos;
date: 2021-07-07
tags:
  - ECMAScript
description: &apos;JavaScript prend désormais en charge les causes d&apos;erreur.&apos;
tweet: &apos;1412774651558862850&apos;
---

Imaginez que vous avez une fonction qui appelle deux charges de travail distinctes `doSomeWork` et `doMoreWork`. Les deux fonctions peuvent lancer le même type d&apos;erreurs, mais vous devez les traiter de manière différente.

Attraper l&apos;erreur et la relancer avec des informations contextuelles supplémentaires est une approche courante à ce problème, par exemple :

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError(&apos;Échec d&apos;une tâche&apos;, err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // Est-ce que |err| vient de |doSomeWork| ou de |doMoreWork| ?
}
```

Malheureusement, la solution ci-dessus est laborieuse, car il faut créer son propre `CustomError`. Et pire encore, aucun outil de développement n&apos;est capable de fournir des messages de diagnostic utiles pour les exceptions inattendues, car il n&apos;y a pas de consensus sur la manière de représenter correctement ces erreurs.

<!--truncate-->
Ce qui manquait jusqu&apos;à présent, c&apos;est une manière standard de chaîner les erreurs. JavaScript prend désormais en charge les causes d&apos;erreur. Un paramètre supplémentaire d&apos;options peut être ajouté au constructeur `Error` avec une propriété `cause`, dont la valeur sera assignée aux instances d&apos;erreur. Les erreurs peuvent alors être facilement chaînées.

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error(&apos;Échec d&apos;une tâche&apos;, { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error(&apos;Échec d&apos;une autre tâche&apos;, { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case &apos;Échec d&apos;une tâche&apos;:
      handleSomeWorkFailure(err.cause);
      break;
    case &apos;Échec d&apos;une autre tâche&apos;:
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

Cette fonctionnalité est disponible dans V8 v9.3.

## Prise en charge des causes d&apos;erreur

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
