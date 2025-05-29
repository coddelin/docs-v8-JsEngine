---
title: 'L'enchaînement optionnel'
author: 'Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), briseuse d'enchaînements optionnels'
avatars:
  - "maya-armyanova"
date: 2019-08-27
tags:
  - ECMAScript
  - ES2020
description: 'L'enchaînement optionnel permet une expression lisible et concise des accès aux propriétés avec une vérification intégrée des valeurs nulles.'
tweet: "1166360971914481669"
---
Les longues chaînes d'accès aux propriétés en JavaScript peuvent être sujettes à des erreurs, car chacune d'entre elles peut s'évaluer à `null` ou `undefined` (aussi connues sous le nom de valeurs nulles). Vérifier l'existence des propriétés à chaque étape peut facilement se transformer en une structure profondément imbriquée avec des déclarations `if` ou une condition `if` longue répliquant la chaîne d'accès aux propriétés :

<!--truncate-->
```js
// Version sujette aux erreurs, peut générer une exception.
const nameLength = db.user.name.length;

// Moins sujette aux erreurs, mais plus difficile à lire.
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

Ce qui précède peut également être exprimé en utilisant l'opérateur ternaire, ce qui n'aide pas vraiment à la lisibilité :

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## Introduction de l'opérateur d'enchaînement optionnel

Vous ne voulez certainement pas écrire du code comme ça, donc il est souhaitable d'avoir une alternative. Certains autres langages offrent une solution élégante à ce problème en utilisant une fonctionnalité appelée « enchaînement optionnel ». Selon [une proposition de spécification récente](https://github.com/tc39/proposal-optional-chaining), « une chaîne optionnelle est une chaîne d'un ou plusieurs accès à des propriétés et appels de fonctions, dont le premier commence par le token `?.` ».

En utilisant le nouvel opérateur d'enchaînement optionnel, nous pouvons réécrire l'exemple ci-dessus comme suit :

```js
// Vérifie toujours les erreurs et est beaucoup plus lisible.
const nameLength = db?.user?.name?.length;
```

Que se passe-t-il lorsque `db`, `user`, ou `name` est `undefined` ou `null` ? Avec l'opérateur d'enchaînement optionnel, JavaScript initialise `nameLength` à `undefined` au lieu de générer une exception.

Notez que ce comportement est également plus robuste que notre vérification avec `if (db && db.user && db.user.name)`. Par exemple, que se passe-t-il si `name` est toujours garanti d'être une chaîne ? Nous pourrions changer `name?.length` en `name.length`. Ensuite, si `name` est une chaîne vide, nous obtiendrions toujours la longueur correcte de `0`. Cela est dû au fait que la chaîne vide est une valeur falsy : elle se comporte comme `false` dans une clause `if`. L'opérateur d'enchaînement optionnel corrige cette source courante de bogues.

## Formes syntaxiques supplémentaires : appels et propriétés dynamiques

Il existe également une version de l'opérateur pour appeler des méthodes optionnelles :

```js
// Étend l'interface avec une méthode optionnelle, présente
// uniquement pour les utilisateurs administrateurs.
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

La syntaxe peut sembler inattendue, car `?.()` est réellement l'opérateur, qui s'applique à l'expression _avant_ lui.

Il existe une troisième utilisation de l'opérateur, à savoir l'accès dynamique aux propriétés optionnelles, qui est effectué via `?.[]`. Il retourne soit la valeur référencée par l'argument dans les crochets, soit `undefined` s'il n'y a aucun objet à partir duquel récupérer la valeur. Voici un cas d'utilisation possible, suivant l'exemple ci-dessus :

```js
// Étend les capacités de l'accès aux propriétés statiques
// avec un nom de propriété généré dynamiquement.
const optionName = 'réglage optionnel';
const optionLength = db?.user?.preferences?.[optionName].length;
```

Cette dernière forme est également disponible pour indexer optionnellement des tableaux, par ex. :

```js
// Si `usersArray` est `null` ou `undefined`,
// alors `userName` s'évalue gracieusement à `undefined`.
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

L'opérateur d'enchaînement optionnel peut être combiné avec l'[opérateur de coalescence des valeurs nulles `??`](/features/nullish-coalescing) lorsqu'une valeur par défaut non-`undefined` est nécessaire. Cela permet un accès sûr et profond aux propriétés avec une valeur par défaut spécifiée, répondant à un cas d'utilisation courant qui nécessitait auparavant des bibliothèques tierces comme [`_.get` de lodash](https://lodash.dev/docs/4.17.15#get) :

```js
const object = { id: 123, names: { first: 'Alice', last: 'Smith' }};

{ // Avec lodash :
  const firstName = _.get(object, 'names.first');
  // → 'Alice'

  const middleName = _.get(object, 'names.middle', '(aucun deuxième prénom)');
  // → '(aucun deuxième prénom)'
}

{ // Avec l'enchaînement optionnel et la coalescence des valeurs nulles :
  const firstName = object?.names?.first ?? '(aucun prénom)';
  // → 'Alice'

  const middleName = object?.names?.middle ?? '(aucun deuxième prénom)';
  // → '(aucun deuxième prénom)'
}
```

## Propriétés de l'opérateur d'enchaînement optionnel

L'opérateur d'enchaînement optionnel possède plusieurs propriétés intéressantes : _court-circuitage_, _empilage_ et _suppression optionnelle_. Examinons chacune de ces propriétés avec un exemple.

_Court-circuitage_ signifie qu'on n'évalue pas le reste de l'expression si un opérateur d'enchaînement optionnel renvoie prématurément :

```js
// `age` est incrémenté uniquement si `db` et `user` sont définis.
db?.user?.grow(++age);
```

_Empiler_ signifie que plusieurs opérateurs de chaînage optionnel peuvent être appliqués sur une séquence d'accès aux propriétés :

```js
// Une chaîne optionnelle peut être suivie d'une autre chaîne optionnelle.
const firstNameLength = db.users?.[42]?.names.first.length;
```

Cependant, soyez attentif à l'utilisation de plus d'un opérateur de chaînage optionnel dans une seule chaîne. Si une valeur est garantie de ne pas être nulle ou indéfinie, l'utilisation de `?.` pour accéder à ses propriétés est déconseillée. Dans l'exemple ci-dessus, on considère que `db` est toujours défini, mais que `db.users` et `db.users[42]` ne le sont peut-être pas. Si un tel utilisateur existe dans la base de données, alors `names.first.length` est supposé être toujours défini.

_Suppression optionnelle_ signifie que l'opérateur `delete` peut être combiné avec une chaîne optionnelle :

```js
// `db.user` est supprimé uniquement si `db` est défini.
delete db?.user;
```

Vous trouverez plus de détails dans [la section _Sémantique_ de la proposition](https://github.com/tc39/proposal-optional-chaining#semantics).

## Support du chaînage optionnel

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="oui https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
