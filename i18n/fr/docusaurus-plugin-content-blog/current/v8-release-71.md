---
title: 'Publication de V8 v7.1'
author: 'Stephan Herhut ([@herhut](https://twitter.com/herhut)), cloneur cloné de clones'
avatars:
  - stephan-herhut
date: 2018-10-31 15:44:37
tags:
  - publication
description: 'V8 v7.1 inclut des gestionnaires de bytecode intégrés, une analyse d’évasion TurboFan améliorée, postMessage(wasmModule), Intl.RelativeTimeFormat, et globalThis!'
tweet: '1057645773465235458'
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du maître Git de V8 juste avant une étape bêta de Chrome. Aujourd’hui, nous sommes heureux d’annoncer notre nouvelle branche, [V8 version 7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1), qui est en version bêta jusqu’à sa publication en coordination avec Chrome 71 Stable dans quelques semaines. V8 v7.1 regorge de toutes sortes de fonctionnalités pour les développeurs. Cet article présente un aperçu de certains points forts en prévision de la publication.

<!--truncate-->
## Mémoire

Suite aux travaux effectués dans v6.9/v7.0 pour [intégrer directement les éléments intégrés dans le binaire](/blog/embedded-builtins), les gestionnaires de bytecode pour l’interpréteur sont maintenant également [intégrés dans le binaire](https://bugs.chromium.org/p/v8/issues/detail?id=8068). Cela économise environ 200 Ko en moyenne par Isolate.

## Performance

L’analyse d’évasion dans TurboFan, qui effectue le remplacement scalaire pour les objets locaux à une unité d’optimisation, a été améliorée pour également [gérer les contextes de fonction locaux pour les fonctions d’ordre supérieur](https://bit.ly/v8-turbofan-context-sensitive-js-operators) lorsque des variables du contexte environnant échappent à une fermeture locale. Considérez l’exemple suivant :

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

Notez que `x` est une variable libre de la fermeture locale `y => y + x`. V8 v7.1 peut désormais totalement éliminer l’allocation de contexte de `x`, entraînant une amélioration allant jusqu’à **40%** dans certains cas.

![Amélioration des performances avec la nouvelle analyse d’évasion (moins est mieux)](/_img/v8-release-71/improved-escape-analysis.svg)

L’analyse d’évasion est maintenant également capable d’éliminer certains cas d’accès à un index de variable vers des tableaux locaux. Voici un exemple :

```js
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; ++i)
    total += args[i];
  return total;
}

function sum2(x, y) {
  return sum(x, y);
}
```

Notez que les `args` sont locaux à `sum2` (en supposant que `sum` soit intégré dans `sum2`). Dans V8 v7.1, TurboFan peut maintenant éliminer complètement l’allocation des `args` et remplacer l’accès à l’index de variable `args[i]` par une opération ternaire de la forme `i === 0 ? x : y`. Cela entraîne une amélioration d’environ ~2% sur le benchmark JetStream/EarleyBoyer. Nous pourrions étendre cette optimisation pour les tableaux contenant plus de deux éléments à l’avenir.

## Clonage structuré des modules Wasm

Enfin, [`postMessage` est pris en charge pour les modules Wasm](https://github.com/WebAssembly/design/pull/1074). Les objets `WebAssembly.Module` peuvent désormais être transférés via `postMessage` aux web workers. Pour clarification, cela se limite aux web workers (même processus, thread différent) et n'est pas étendu aux scénarios inter-processus (comme le `postMessage` inter-origines ou les web workers partagés).

## Fonctionnalités du langage JavaScript

[L’API `Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) permet le formatage localisé des durées relatives (par exemple, “hier”, “il y a 42 secondes” ou “dans 3 mois”) sans sacrifier les performances. Voici un exemple :

```js
// Créez un formateur de temps relatif pour la langue anglaise qui ne
// doit pas toujours utiliser une valeur numérique dans la sortie.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'hier'

rtf.format(0, 'day');
// → 'aujourd’hui'

rtf.format(1, 'day');
// → 'demain'

rtf.format(-1, 'week');
// → 'la semaine dernière'

rtf.format(0, 'week');
// → 'cette semaine'

rtf.format(1, 'week');
// → 'la semaine prochaine'
```

Lisez [notre article explicatif sur `Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) pour plus d’informations.

V8 v7.1 ajoute également la prise en charge de [la proposition `globalThis`](/features/globalthis), permettant un mécanisme universel pour accéder à l’objet global même dans des fonctions strictes ou des modules, quelle que soit la plateforme.

## API V8

Veuillez utiliser `git log branch-heads/7.0..branch-heads/7.1 include/v8.h` pour obtenir une liste des modifications de l’API.

Les développeurs disposant d’un [dépôt actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.1 -t branch-heads/7.1` pour expérimenter les nouvelles fonctionnalités de V8 v7.1. Vous pouvez également [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités vous-même bientôt.
