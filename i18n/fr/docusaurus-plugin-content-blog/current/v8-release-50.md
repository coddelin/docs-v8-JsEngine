---
title: "V8 release v5.0"
author: 'l'équipe V8'
date: 2016-03-15 13:33:37
tags:
  - sortie
description: "V8 v5.0 offre des améliorations de performance et ajoute la prise en charge de plusieurs nouvelles fonctionnalités du langage ES2015."
---
La première étape du [processus de publication](/docs/release-process) de V8 est une nouvelle branche créée depuis le master Git juste avant que Chromium ne ramifie pour un jalon Beta Chrome (environ toutes les six semaines). Notre dernière branche de publication est [V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0), qui restera en version beta jusqu'à la publication d'une version stable avec Chrome 50 Stable. Voici un aperçu des nouvelles fonctionnalités pour les développeurs dans cette version de V8.

<!--truncate-->
:::note
**Remarque :** Le numéro de version 5.0 n'a pas de signification sémantique et ne marque pas une publication majeure (par opposition à une publication mineure).
:::

## Amélioration de la prise en charge des fonctionnalités ECMAScript 2015 (ES6)

V8 v5.0 contient plusieurs fonctionnalités ES2015 liées à la correspondance des expressions régulières (regex).

### Drapeau Unicode dans RegExp

Le [drapeau Unicode de RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters), `u`, active un nouveau mode Unicode pour la correspondance des expressions régulières. Le drapeau Unicode considère les modèles et les chaînes regex comme une série de points de code Unicode. Il expose également une nouvelle syntaxe pour les échappements de points de code Unicode.

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

Le drapeau `u` fait également en sorte que l'atome `.` (également appelé le correspondant de caractère unique) corresponde à n'importe quel symbole Unicode plutôt qu'aux seuls caractères du Plan Multilingue de Base (BMP).

```js
const string = 'le train 🅛';

/le\s.\strain/.test(string);
// false

/le\s.\strain/u.test(string);
// true
```

### Crochets de personnalisation RegExp

ES2015 inclut des crochets pour les sous-classes de RegExp afin de modifier la sémantique de la correspondance. Les sous-classes peuvent surcharger les méthodes nommées `Symbol.match`, `Symbol.replace`, `Symbol.search` et `Symbol.split` afin de modifier le comportement des sous-classes de RegExp par rapport à `String.prototype.match` et des méthodes similaires.

## Améliorations des performances des fonctionnalités ES2015 et ES5

La version 5.0 apporte également quelques améliorations notables des performances aux fonctionnalités ES2015 et ES5 déjà implémentées.

L'implémentation des paramètres de reste est 8 à 10 fois plus rapide que celle de la version précédente, rendant plus efficace la collecte d'un grand nombre d'arguments dans un seul tableau après un appel de fonction. `Object.keys`, utile pour itérer sur les propriétés énumérables d'un objet dans le même ordre retourné par `for -in`, est désormais environ 2 fois plus rapide.

## API V8

Veuillez consulter notre [résumé des modifications de l'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque publication majeure.

Les développeurs ayant un [checkout actif de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 5.0 -t branch-heads/5.0` pour expérimenter les nouvelles fonctionnalités de V8 5.0. Alternativement, vous pouvez [vous abonner au canal Beta Chrome](https://www.google.com/chrome/browser/beta.html) et essayer vous-même bientôt les nouvelles fonctionnalités.
