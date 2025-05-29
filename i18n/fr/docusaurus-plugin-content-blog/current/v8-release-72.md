---
title: "Sortie de V8 v7.2"
author: "Andreas Haas, responsable des pièges"
avatars: 
  - andreas-haas
date: "2018-12-18 11:48:21"
tags: 
  - sortie
description: "V8 v7.2 propose un parsing JavaScript ultra-rapide, une exécution plus rapide des fonctions async-await, une réduction de la consommation de mémoire sur ia32, des champs de classe publics, et bien plus encore !"
tweet: "1074978755934863361"
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](/docs/release-process). Chaque version est dérivée de la branche principale Git de V8 immédiatement avant une version Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre dernière branche, [V8 version 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2), actuellement en beta, en attendant sa sortie en coordination avec la version stable de Chrome 72 dans quelques semaines. V8 v7.2 regorge de fonctionnalités pour les développeurs. Cet article fournit un aperçu de quelques points forts en prévision de la sortie.

<!--truncate-->
## Mémoire

[Les exécutions intégrées](/blog/embedded-builtins) sont désormais prises en charge et activées par défaut sur l'architecture ia32.

## Performance

### Parsing JavaScript

En moyenne, les pages web passent 9,5% du temps de V8 au démarrage sur le parsing JavaScript. Par conséquent, nous nous sommes concentrés sur le déploiement du parser JavaScript le plus rapide jamais vu avec la version 7.2. Nous avons considérablement amélioré la vitesse de parsing sur toute la ligne. Depuis la v7.0, la vitesse de parsing a augmenté d'environ 30% sur les ordinateurs de bureau. Le graphique suivant montre les améliorations impressionnantes sur notre benchmark de chargement réel de Facebook au cours des derniers mois.

![Temps de parsing V8 sur facebook.com (plus bas est mieux)](/_img/v8-release-72/facebook-parse-time.png)

Nous nous sommes concentrés à plusieurs reprises sur le parser. Les graphiques suivants montrent les améliorations relatives à la dernière version v7.2 sur plusieurs sites web populaires.

![Temps de parsing V8 relatifs à V8 v7.2 (plus bas est mieux)](/_img/v8-release-72/relative-parse-times.svg)

Dans l'ensemble, les améliorations récentes ont réduit le pourcentage moyen de parsing de 9,5% à 7,5%, ce qui se traduit par des temps de chargement plus rapides et des pages plus réactives.

### `async`/`await`

V8 v7.2 est livré avec [une implémentation plus rapide de `async`/`await`](/blog/fast-async#await-under-the-hood), activée par défaut. Nous avons fait [une proposition de spécification](https://github.com/tc39/ecma262/pull/1250) et sommes actuellement en train de collecter des données de compatibilité web pour que le changement soit officiellement fusionné dans la spécification ECMAScript.

### Éléments de spread

V8 v7.2 améliore grandement les performances des éléments de spread lorsqu'ils apparaissent au début d'un littéral de tableau, par exemple `[...x]` ou `[...x, 1, 2]`. L'amélioration s'applique au spreading des tableaux, chaînes primitives, ensembles, clés de map, valeurs de map, et — par extension — à `Array.from(x)`. Pour plus de détails, consultez [notre article approfondi sur l'accélération des éléments de spread](/blog/spread-elements).

### WebAssembly

Nous avons analysé un certain nombre de benchmarks WebAssembly et les avons utilisés pour guider une génération de code améliorée dans le niveau d'exécution supérieur. En particulier, la version 7.2 de V8 permet le découpage des nœuds dans le planificateur du compilateur optimisant et la rotation des boucles dans le backend. Nous avons également amélioré la mise en cache des wrappers et introduit des wrappers personnalisés qui réduisent la surcharge lors des appels aux fonctions mathématiques JavaScript importées. De plus, nous avons conçu des modifications pour l'allocation des registres qui améliorent les performances pour de nombreux modèles de code qui seront intégrés dans une version ultérieure.

### Gestionnaires de pièges

Les gestionnaires de pièges améliorent le débit général du code WebAssembly. Ils sont implémentés et disponibles sur Windows, macOS et Linux dans V8 v7.2. Dans Chromium, ils sont activés sur Linux. Windows et macOS suivront lorsque la stabilité sera confirmée. Nous travaillons également à les rendre disponibles sur Android.

## Traces de pile avec async

Comme [mentionné précédemment](/blog/fast-async#improved-developer-experience), nous avons ajouté une nouvelle fonctionnalité appelée [traces de pile asynchrones sans coût](https://bit.ly/v8-zero-cost-async-stack-traces), qui enrichit la propriété `error.stack` avec des cadres d'appel asynchrones. Elle est actuellement disponible derrière l'indicateur de ligne de commande `--async-stack-traces`.

## Fonctionnalités du langage JavaScript

### Champs de classe publics

V8 v7.2 ajoute la prise en charge des [champs de classe publics](/features/class-fields). Au lieu de:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('Meow!');
  }
}
```

…vous pouvez maintenant écrire :

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('Meow!');
  }
}
```

La prise en charge des [champs de classe privés](/features/class-fields#private-class-fields) est prévue dans une future version de V8.

### `Intl.ListFormat`

V8 v7.2 ajoute la prise en charge de [la proposition `Intl.ListFormat`](/features/intl-listformat), permettant le formatage localisé des listes.

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank et Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine et Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora et Harrison'
```

Pour plus d'informations et des exemples d'utilisation, consultez [notre guide sur `Intl.ListFormat`](/features/intl-listformat).

### `JSON.stringify` bien formé

`JSON.stringify` génère désormais des séquences d'échappement pour les substituts isolés, rendant sa sortie en Unicode valide (et représentable en UTF-8) :

```js
// Ancien comportement :
JSON.stringify('\uD800');
// → '"�"'

// Nouveau comportement :
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Pour plus d'informations, consultez [notre guide sur `JSON.stringify` bien formé](/features/well-formed-json-stringify).

### Exportations d'espaces de noms de module

Dans les [modules JavaScript](/features/modules), il était déjà possible d'utiliser la syntaxe suivante :

```js
import * as utils from './utils.mjs';
```

Cependant, aucune syntaxe `export` symétrique n'existait… [jusqu'à maintenant](/features/module-namespace-exports) :

```js
export * as utils from './utils.mjs';
```

Cela équivaut à ce qui suit :

```js
import * as utils from './utils.mjs';
export { utils };
```

## API V8

Veuillez utiliser `git log branch-heads/7.1..branch-heads/7.2 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs disposant d'un [dépôt actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.2 -t branch-heads/7.2` pour expérimenter les nouvelles fonctionnalités de V8 v7.2. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
