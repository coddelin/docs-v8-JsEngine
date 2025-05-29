---
title: 'Indices de correspondance RegExp'
author: 'Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), exprimant régulièrement de nouvelles fonctionnalités'
avatars:
  - 'maya-armyanova'
date: 2019-12-17
tags:
  - ECMAScript
  - Node.js 16
description: 'Les indices de correspondance RegExp fournissent les indices `start` et `end` de chaque groupe de capture correspondant.'
tweet: '1206970814400270338'
---
JavaScript est désormais doté d'une nouvelle amélioration des expressions régulières, appelée "indices de correspondance". Imaginez que vous souhaitez trouver des noms de variables invalides dans des codes JavaScript qui coïncident avec des mots réservés, et afficher un caret et un « soulignement » sous le nom de la variable, comme suit :

<!--truncate-->
```js
const function = foo;
      ^------- Nom de variable invalide
```

Dans l'exemple ci-dessus, `function` est un mot réservé et ne peut pas être utilisé comme nom de variable. Pour cela, nous pourrions écrire la fonction suivante :

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // L'indice `1` correspond au premier groupe de capture.
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // Ajuster la position du caret.
    '^' +
    '-'.repeat(end - start - 1) +   // Ajouter le soulignement.
    ' ' + message;                  // Ajouter le message.
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // code incorrect
displayError(code, 'Nom de variable invalide');
```

:::note
**Note :** Pour simplifier, l'exemple ci-dessus contient seulement quelques-uns des [mots réservés](https://mathiasbynens.be/notes/reserved-keywords) de JavaScript.
:::

En bref, le nouveau tableau `indices` stocke les positions de début et de fin de chaque groupe de capture correspondant. Ce nouveau tableau est disponible lorsque l'expression régulière source utilise le drapeau `/d` pour tous les builtins qui produisent des objets de correspondance d'expressions régulières, y compris `RegExp#exec`, `String#match`, et [`String#matchAll`](https://v8.dev/features/string-matchall).

Continuez votre lecture si vous êtes intéressé par un fonctionnement plus détaillé.

## Motivation

Passons à un exemple plus complexe et réfléchissons à la façon dont vous aborderiez la tâche d'analyser un langage de programmation (par exemple, ce que fait le [compilateur TypeScript](https://github.com/microsoft/TypeScript/tree/master/src/compiler)) — d'abord diviser le code source d'entrée en jetons, puis attribuer une structure syntaxique à ces jetons. Si l'utilisateur a écrit un code syntaxiquement incorrect, vous voudriez lui présenter une erreur significative, idéalement en pointant l'emplacement où le code problématique a été rencontré. Par exemple, étant donné l'extrait de code suivant :

```js
let foo = 42;
// d'autres lignes de code
let foo = 1337;
```

Nous voudrions présenter au programmeur une erreur comme :

```js
let foo = 1337;
    ^
SyntaxError: L'identifiant 'foo' a déjà été déclaré
```

Pour cela, nous avons besoin de quelques blocs de construction, le premier étant la reconnaissance des identifiants TypeScript. Ensuite, nous nous concentrerons sur la localisation exacte de l'erreur. Prenons l'exemple suivant, en utilisant une regex pour déterminer si une chaîne est un identifiant valide :

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**Note :** Un analyseur syntaxique réel pourrait utiliser les [échappements de propriété nouvellement introduits dans les regexs](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples) et utiliser l'expression régulière suivante pour correspondre à tous les noms d'identifiants ECMAScript valides :

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

Pour simplifier, restons-en à notre précédente regex, qui ne correspond qu'aux caractères latins, aux chiffres et aux underscores.
:::

Si nous rencontrons une erreur avec une déclaration de variable comme ci-dessus et que nous voulons imprimer la position exacte pour l'utilisateur, nous pourrions vouloir étendre la regex ci-dessus et utiliser une fonction similaire :

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

On pourrait utiliser la propriété `index` sur l'objet de correspondance retourné par `RegExp.prototype.exec`, qui retourne la position de début de l'ensemble de la correspondance. Pour des cas d'utilisation comme celui décrit ci-dessus, cependant, on voudrait souvent utiliser (possiblement plusieurs) groupes de capture. Jusqu'à récemment, JavaScript n'exposait pas les indices où les sous-chaînes correspondantes des groupes de capture commencent et se terminent.

## Indices de correspondance RegExp expliqués

Idéalement, nous voulons imprimer une erreur à la position du nom de la variable, et non au mot-clé `let`/`const` (comme le fait l'exemple ci-dessus). Mais pour cela, nous aurions besoin de trouver la position du groupe de capture avec l'indice `2`. (L'indice `1` réfère au groupe de capture `(let|const|var)` et `0` réfère à l'ensemble de la correspondance.)

Comme mentionné ci-dessus, [la nouvelle fonctionnalité JavaScript](https://github.com/tc39/proposal-regexp-match-indices) ajoute une propriété `indices` sur le résultat (le tableau de sous-chaînes) de `RegExp.prototype.exec()`. Améliorons notre exemple ci-dessus pour utiliser cette nouvelle propriété :

```js
function getVariablePosition(source) {
  // Remarquez le drapeau `d`, qui active `match.indices`
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition('let foo');
// → [4, 7]
```

Cet exemple retourne le tableau `[4, 7]`, qui correspond à la position `[start, end)` de la sous-chaîne correspondante du groupe avec l'index `2`. Sur la base de cette information, notre compilateur peut désormais afficher l'erreur souhaitée.

## Fonctionnalités supplémentaires

L'objet `indices` contient également une propriété `groups`, qui peut être indexée par les noms des [groupes de capture nommés](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups). En utilisant cela, la fonction ci-dessus peut être réécrite comme suit :

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition('let foo');
```

## Prise en charge des indices de correspondance RegExp

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="non https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="non https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="non"></feature-support>
