---
title: "Version V8 v4.8"
author: "l'équipe V8"
date: "2015-11-25 13:33:37"
tags: 
  - version
description: "V8 v4.8 ajoute la prise en charge de plusieurs nouvelles fonctionnalités du langage ES2015."
---
Environ toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est issue de la branche principale Git de V8 juste avant que Chrome ne crée une branche pour une étape Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [V8 version 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8), qui sera en beta jusqu'à sa publication en coordination avec Chrome 48 Stable. V8 4.8 contient un petit ensemble de fonctionnalités destinées aux développeurs, et nous aimerions vous donner un aperçu de certains points forts en prévision de la publication dans plusieurs semaines.

<!--truncate-->
## Amélioration de la prise en charge d'ECMAScript 2015 (ES6)

Cette version de V8 prend en charge deux [symboles bien connus](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols), symboles intégrés de la spécification ES2015 permettant aux développeurs d'exploiter plusieurs constructions de langage bas-niveau auparavant cachées.

### `@@isConcatSpreadable`

Le nom d'une propriété de type booléen qui, si elle est `true`, indique qu'un objet doit être aplati en ses éléments de tableau par `Array.prototype.concat`.

```js
(function() {
  'use strict';
  class AutomaticallySpreadingArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const first = [1];
  const second = new AutomaticallySpreadingArray();
  second[0] = 2;
  second[1] = 3;
  const all = first.concat(second);
  // Produit [1, 2, 3]
  console.log(all);
}());
```

### `@@toPrimitive`

Le nom d'une méthode à invoquer sur un objet pour des conversions implicites en valeurs primitives.

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('string');
        return 'V8';
      } else if (hint === 'number') {
        console.log('number');
        return 8;
      } else {
        console.log('default:' + hint);
        return 8;
      }
    }
  }

  const engine = new V8();
  console.log(Number(engine));
  console.log(String(engine));
}());
```

### `ToLength`

La spécification ES2015 ajuste l'opération abstraite de conversion de type pour convertir un argument en un entier adapté à son utilisation comme longueur d'un objet semblable à un tableau. (Bien que non directement observable, ce changement pourrait être visible indirectement lors de la manipulation d'objets similaires à des tableaux avec une longueur négative.)

## API V8

Veuillez consulter notre [résumé des changements d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est mis à jour régulièrement quelques semaines après chaque version majeure.

Les développeurs ayant une [validation active de V8](https://v8.dev/docs/source-code#using-git) peuvent utiliser `git checkout -b 4.8 -t branch-heads/4.8` pour expérimenter les nouvelles fonctionnalités de V8 v4.8. Sinon, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités bientôt.
