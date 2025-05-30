---
title: "Assignation logique"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2020-05-07
tags: 
  - ECMAScript
  - ES2021
  - Node.js 16
description: "JavaScript prend désormais en charge l'assignation combinée avec des opérations logiques."
tweet: "1258387483823345665"
---
JavaScript prend en charge une gamme d'[opérateurs d'assignation combinés](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators) permettant aux programmeurs d'exprimer succinctement une opération binaire avec assignation. Actuellement, seules les opérations mathématiques ou binaires sont prises en charge.

<!--truncate-->
Ce qui manquait jusqu'à présent, c'était la capacité de combiner les opérations logiques avec l'assignation. Mais plus maintenant ! JavaScript prend désormais en charge l'assignation logique avec les nouveaux opérateurs `&&=`, `||=` et `??=`.

## Opérateurs d'assignation logique

Avant de nous plonger dans les nouveaux opérateurs, faisons un rappel sur les opérateurs d'assignation combinés existants. Par exemple, la signification de `lhs += rhs` est à peu près équivalente à `lhs = lhs + rhs`. Cette équivalence approximative s'applique à tous les opérateurs existants `@=` où `@` représente un opérateur binaire comme `+` ou `|`. Il convient de noter que cela est strictement correct uniquement lorsque `lhs` est une variable. Pour les parties gauches plus complexes dans des expressions comme `obj[computedPropertyName()] += rhs`, la partie gauche n'est évaluée qu'une seule fois.

Plongeons maintenant dans les nouveaux opérateurs. Contrairement aux opérateurs existants, `lhs @= rhs` ne signifie pas à peu près `lhs = lhs @ rhs` lorsque `@` est une opération logique : `&&`, `||` ou `??`.

```js
// Comme rappel supplémentaire, voici la sémantique du et logique :
x && y
// → y si x est véridique
// → x si x n'est pas véridique

// Tout d'abord, l'assignation du et logique. Les deux lignes suivantes
// sont équivalentes.
// Notez que, comme pour les opérateurs d'assignation combinés existants,
// les parties gauches plus complexes ne sont évaluées qu'une fois.
x &&= y;
x && (x = y);

// La sémantique du ou logique :
x || y
// → x si x est véridique
// → y si x n'est pas véridique

// De même, l'assignation du ou logique :
x ||= y;
x || (x = y);

// La sémantique de l'opérateur de coalescence nullish :
x ?? y
// → y si x est nullish (null ou undefined)
// → x si x n'est pas nullish

// Enfin, assignation avec coalescence nullish :
x ??= y;
x ?? (x = y);
```

## Sémantique de court-circuit

Contrairement à leurs homologues mathématiques et binaires, les assignations logiques suivent le comportement de court-circuit de leurs opérations logiques respectives. Elles _effectuent uniquement_ une assignation si l'opération logique évalue le côté droit.

Au départ, cela peut sembler déroutant. Pourquoi ne pas affecter de manière inconditionnelle la partie gauche comme dans les autres assignations combinées ?

Il existe une raison pratique importante à cette différence. Lors de la combinaison des opérations logiques avec l'assignation, l'assignation peut provoquer un effet secondaire qui doit se produire de manière conditionnelle en fonction du résultat de cette opération logique. Provoquer l'effet secondaire de manière inconditionnelle peut nuire aux performances ou même à la correction du programme.

Rendons cela concret avec un exemple de deux versions d'une fonction qui définit un message par défaut dans un élément.

```js
// Afficher un message par défaut s'il ne remplace rien.
// Affecte uniquement innerHTML s'il est vide. Ne provoque pas
// la perte de focus des éléments internes de msgElement.
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>Pas de messages<p>';
}

// Afficher un message par défaut s'il ne remplace rien.
// Bogue ! Peut provoquer la perte de focus des éléments
// internes de msgElement à chaque appel.
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>Pas de messages<p>';
}
```

:::note
**Remarque:** Étant donné que la propriété `innerHTML` est [spécifiée](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml) pour renvoyer une chaîne vide plutôt que `null` ou `undefined`, `||=` doit être utilisé à la place de `??=`. Lorsque vous écrivez du code, gardez à l'esprit que de nombreuses API Web n'utilisent pas `null` ou `undefined` pour signifier vide ou absent.
:::

En HTML, l'affectation à la propriété `.innerHTML` d'un élément est destructive. Les enfants internes sont supprimés et de nouveaux enfants, analysés à partir de la chaîne nouvellement assignée, sont insérés. Même lorsque la nouvelle chaîne est identique à l'ancienne, cela provoque à la fois un travail supplémentaire et une perte de focus des éléments internes. Pour cette raison pratique visant à éviter des effets secondaires indésirables, la sémantique des opérateurs d'assignation logique court-circuite l'assignation.

Il peut être utile de réfléchir à la symétrie avec d'autres opérateurs d'assignation combinés de la manière suivante. Les opérateurs mathématiques et binaires sont inconditionnels, donc l'assignation est également inconditionnelle. Les opérateurs logiques sont conditionnels, donc l'assignation est également conditionnelle.

## Prise en charge de l'assignation logique

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#New-Features:~:text=Added%20logical%20assignment%20operator%20support."
                 nodejs="16"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
