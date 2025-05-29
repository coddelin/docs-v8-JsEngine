---
title: "Publication de V8 v5.5"
author: 'l'équipe V8'
date: 2016-10-24 13:33:37
tags:
  - publication
description: "V8 v5.5 réduit la consommation de mémoire et améliore la prise en charge des fonctionnalités du langage ECMAScript."
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée de la branche principale Git de V8 juste avant une étape bêta de Chrome. Aujourd’hui, nous sommes ravis d’annoncer notre nouvelle branche, [V8 version 5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5), qui sera en version bêta jusqu’à sa sortie en coordination avec Chrome 55 Stable dans quelques semaines. V8 v5.5 est rempli de toutes sortes de fonctionnalités pour les développeurs, nous aimerions donc vous donner un aperçu de quelques-uns des points forts en prévision de sa sortie.

<!--truncate-->
## Fonctionnalités du langage

### Fonctions asynchrones

Dans la version 5.5, V8 prend en charge les [fonctions asynchrones](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) de JavaScript ES2017, ce qui simplifie l’écriture de code qui utilise et crée des Promises. Avec les fonctions async, attendre qu’une Promise soit résolue est aussi simple que de taper await devant elle et de continuer comme si la valeur était disponible de manière synchrone - sans avoir besoin de callbacks. Consultez [cet article](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) pour une introduction.

Voici une fonction exemple qui récupère une URL et renvoie le texte de la réponse, écrite dans un style asynchrone typique basé sur les Promises.

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('échec du fetch', err);
    });
}
```

Voici le même code réécrit pour supprimer les callbacks, en utilisant les fonctions async.

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('échec du fetch', err);
  }
}
```

## Améliorations des performances

V8 v5.5 offre un certain nombre d’améliorations clés de l’empreinte mémoire.

### Mémoire

La consommation de mémoire est une dimension importante dans l’espace des compromis de performance des machines virtuelles JavaScript. Au cours des dernières versions, l’équipe de V8 a analysé et réduit de manière significative l’empreinte mémoire de plusieurs sites Web identifiés comme représentatifs des modèles modernes de développement Web. V8 5.5 réduit la consommation de mémoire globale de Chrome jusqu’à 35 % sur les **appareils à faible mémoire** (par rapport à V8 5.3 dans Chrome 53) grâce à des réductions de la taille du tas V8 et de l’utilisation de la mémoire de zone. D’autres segments d’appareils bénéficient également des réductions de la mémoire de zone. Consultez [le billet de blog dédié](/blog/optimizing-v8-memory) pour une vue détaillée.

## API de V8

Veuillez consulter notre [résumé des modifications de l’API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque publication majeure.

### Migration de l’inspecteur V8

L’inspecteur V8 a été migré de Chromium vers V8. Le code de l’inspecteur réside désormais entièrement dans le [répertoire V8](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/).

Les développeurs disposant d’un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.5 -t branch-heads/5.5` pour expérimenter les nouvelles fonctionnalités de V8 5.5. Vous pouvez également [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) pour essayer les nouvelles fonctionnalités prochainement.
