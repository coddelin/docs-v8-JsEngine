---
title: "Extras V8"
author: "Domenic Denicola ([@domenic](https://twitter.com/domenic)), Sorcier des flux"
avatars: 
  - "domenic-denicola"
date: "2016-02-04 13:33:37"
tags: 
  - internals
description: "La version 4.8 de V8 inclut les “extras V8”, une interface simple conçue dans le but de permettre aux utilisateurs d'intégrer des APIs performantes et auto hébergées."
---
V8 implémente une grande partie des objets et fonctions intégrés du langage JavaScript directement en JavaScript. Par exemple, vous pouvez voir notre [implémentation des promesses](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js) qui est écrite en JavaScript. Ces objets intégrés sont appelés _auto hébergés_. Ces implémentations sont incluses dans notre [instantané de démarrage](/blog/custom-startup-snapshots) afin que de nouveaux contextes puissent être rapidement créés sans avoir besoin de configurer et d'initialiser les objets auto hébergés durant l'exécution.

<!--truncate-->
Les utilisateurs de V8, tels que Chromium, ont parfois besoin de rédiger des APIs en JavaScript également. Cela fonctionne particulièrement bien pour les fonctionnalités de plateforme qui sont autonomes, comme [streams](https://streams.spec.whatwg.org/), ou pour les fonctionnalités qui font partie d'une plateforme “en couches” de capacités de niveau supérieur construites sur des bases déjà existantes. Bien qu'il soit toujours possible d'exécuter un code supplémentaire au démarrage pour initialiser les APIs utilisateurs (comme cela se fait dans Node.js, par exemple), idéalement les utilisateurs devraient pouvoir bénéficier des mêmes avantages de vitesse pour leurs APIs auto hébergées que ceux de V8.

Les extras V8 sont une nouvelle fonctionnalité de V8, depuis notre [version 4.8](/blog/v8-release-48), conçue dans le but de permettre aux utilisateurs d'écrire des APIs auto hébergées performantes via une interface simple. Les extras sont des fichiers JavaScript fournis par l'intégrateur qui sont directement compilés dans l'instantané V8. Ils ont également accès à quelques outils auxiliaires qui facilitent l'écriture d'APIs sécurisées en JavaScript.

## Un exemple

Un fichier extra V8 est simplement un fichier JavaScript avec une certaine structure :

```js
(function(global, binding, v8) {
  'use strict';
  const Object = global.Object;
  const x = v8.createPrivateSymbol('x');
  const y = v8.createPrivateSymbol('y');

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, 'Vec2', {
    value: Vec2,
    enumerable: false,
    configurable: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

Quelques points à remarquer ici :

- L'objet `global` n'est pas présent dans la chaîne de portée, donc tout accès à celui-ci (comme celui pour `Object`) doit être fait explicitement via l'argument fourni `global`.
- L'objet `binding` est un endroit où stocker des valeurs ou récupérer des valeurs de la part de l'intégrateur. Une API C++ `v8::Context::GetExtrasBindingObject()` donne accès à l'objet `binding` depuis l'intégrateur. Dans notre exemple simple, nous laissons l'intégrateur effectuer le calcul de la norme ; dans un exemple réel, vous pourriez déléguer à l'intégrateur quelque chose de plus complexe, comme la résolution d'URL. Nous ajoutons également le constructeur `Vec2` à l'objet `binding`, afin que le code de l'intégrateur puisse créer des instances de `Vec2` sans passer par l'objet `global` potentiellement modifiable.
- L'objet `v8` fournit un petit nombre d'APIs pour vous permettre d'écrire un code sécurisé. Ici, nous créons des symboles privés pour stocker notre état interne d'une manière qui ne peut pas être manipulée de l'extérieur. (Les symboles privés sont un concept interne à V8 et n'ont pas de sens dans le code JavaScript standard.) Les objets intégrés de V8 utilisent souvent des “appels de fonctions %” pour ce genre de choses, mais les extras V8 ne peuvent pas utiliser les fonctions % car elles sont un détail d'implémentation interne de V8 et ne conviennent pas aux intégrateurs.

Vous vous demandez peut-être d'où viennent ces objets. Les trois sont initialisés dans [le bootstrapper de V8](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc), qui installe quelques propriétés de base mais laisse principalement l'initialisation au JavaScript auto hébergé de V8. Par exemple, presque tous les fichiers .js de V8 installent quelque chose sur `global`; voir par exemple [promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439) ou [uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371). Et nous installons des APIs sur l'objet `v8` à [plusieurs endroits](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs). (L'objet `binding` est vide jusqu'à ce qu'il soit manipulé par un extra ou un intégrateur, donc le seul code pertinent dans V8 lui-même est lorsque le bootstrapper le crée.)

Enfin, pour indiquer à V8 que nous allons compiler un extra, nous ajoutons une ligne au fichier gyp de notre projet :

```js
'v8_extra_library_files': ['./Vec2.js']
```

(Vous pouvez voir un exemple réel de cela [dans le gypfile de V8](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170).)

## Pratique des extras V8

Les extras V8 offrent aux intégrateurs une nouvelle manière légère d’implémenter des fonctionnalités. Le code JavaScript peut plus facilement manipuler les éléments intégrés de JavaScript comme les tableaux, les maps ou les promesses ; il peut appeler d’autres fonctions JavaScript sans formalité ; et il peut gérer les exceptions de manière idiomatique. Contrairement aux implémentations en C++, les fonctionnalités implémentées en JavaScript via les extras V8 peuvent bénéficier de l'inlining, et leur appel ne génère aucun coût de franchissement de frontière. Ces avantages sont particulièrement marqués par rapport à un système de liaison traditionnel comme les liaisons Web IDL de Chromium.

Les extras V8 ont été introduits et perfectionnés au cours de l'année dernière, et Chromium les utilise actuellement pour [implémenter des flux](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js). Chromium envisage également d’utiliser les extras V8 pour implémenter [la personnalisation du défilement](https://codereview.chromium.org/1333323003) et [les API de géométrie efficaces](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ).

Les extras V8 sont encore en cours de développement, et l'interface présente certaines aspérités et inconvénients que nous espérons résoudre avec le temps. Le principal domaine à améliorer est le processus de débogage : les erreurs ne sont pas faciles à localiser, et le débogage au moment de l'exécution se fait le plus souvent avec des instructions d'impression. À l'avenir, nous espérons intégrer les extras V8 dans les outils de développement et le cadre de traçage de Chromium, à la fois pour Chromium lui-même et pour tous les intégrateurs utilisant le même protocole.

Un autre point de prudence lors de l'utilisation des extras V8 est l'effort supplémentaire requis pour écrire un code sécurisé et robuste. Le code des extras V8 fonctionne directement sur le snapshot, tout comme le code des éléments intégrés auto-hébergés de V8. Il accède aux mêmes objets que le JavaScript utilisateur, sans couche de liaison ni contexte séparé pour empêcher un tel accès. Par exemple, quelque chose d’aussi simple en apparence que `global.Object.prototype.hasOwnProperty.call(obj, 5)` peut échouer de six manières potentielles en raison de la modification des éléments intégrés par le code utilisateur (comptez-les !). Les intégrateurs comme Chromium doivent être robustes face à tout code utilisateur, quelle que soit sa nature, et dans de tels environnements, une plus grande prudence est nécessaire lors de l'écriture des extras par rapport à l'écriture des fonctionnalités traditionnelles implémentées en C++.

Si vous souhaitez en savoir plus sur les extras V8, consultez notre [document de conception](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz) qui entre dans beaucoup plus de détails. Nous sommes impatients d'améliorer les extras V8 et d’ajouter davantage de fonctionnalités permettant aux développeurs et aux intégrateurs d’écrire des ajouts expressifs et hautes performances au runtime V8.
