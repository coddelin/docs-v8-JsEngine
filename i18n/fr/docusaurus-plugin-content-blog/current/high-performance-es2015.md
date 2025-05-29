---
title: &apos;Performances élevées ES2015 et au-delà&apos;
author: &apos;Benedikt Meurer [@bmeurer](https://twitter.com/bmeurer), Ingénieur Performances ECMAScript&apos;
avatars:
  - &apos;benedikt-meurer&apos;
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: &apos;Les performances des fonctionnalités de langage ES2015+ dans V8 sont désormais comparables à celles de leurs homologues transpilés en ES5.&apos;
---
Au cours des derniers mois, l'équipe V8 s'est concentrée sur l'amélioration des performances des nouvelles fonctionnalités JavaScript [ES2015](https://www.ecma-international.org/ecma-262/6.0/) et autres encore plus récentes à un niveau comparable à celui de leurs homologues transpilés en [ES5](https://www.ecma-international.org/ecma-262/5.1/).

<!--truncate-->
## Motivation

Avant d'entrer dans les détails des différentes améliorations, il est important de comprendre pourquoi les performances des fonctionnalités ES2015+ sont cruciales malgré l'utilisation répandue de [Babel](http://babeljs.io/) dans le développement web moderne :

1. Tout d'abord, certaines nouvelles fonctionnalités ES2015 ne sont que polyremplies à la demande, comme par exemple le builtin [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign). Lorsque Babel transpile les [propriétés d'étalement d'objet](https://github.com/sebmarkbage/ecmascript-rest-spread) (qui sont largement utilisées par de nombreuses applications [React](https://facebook.github.io/react) et [Redux](http://redux.js.org/)), il s'appuie sur [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) plutôt que sur un équivalent ES5 si la VM le prend en charge.
1. L'ajout de polyfill pour les fonctionnalités ES2015 augmente généralement la taille du code, ce qui contribue de manière significative à la [crise de performances du web](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis) actuelle, en particulier sur les appareils mobiles courants dans les marchés émergents. Le coût lié à la livraison, l'analyse et la compilation du code peut donc être assez élevé, avant même d'atteindre le coût d'exécution.
1. Enfin, le JavaScript côté client n'est qu'un des environnements qui repose sur le moteur V8. Il y a également [Node.js](https://nodejs.org/) pour les applications et outils côté serveur, où les développeurs n'ont pas besoin de transpiler en code ES5, mais peuvent directement utiliser les fonctionnalités prises en charge par la [version V8 pertinente](https://nodejs.org/en/download/releases/) dans la version cible de Node.js.

Considérons l'extrait de code suivant tiré de la [documentation de Redux](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html) :

```js
function todoApp(state = initialState, action) {
  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return { ...state, visibilityFilter: action.filter };
    default:
      return state;
  }
}
```

Il y a deux éléments dans ce code qui nécessitent une transpilation : le paramètre par défaut pour state et l'étalement de state dans le littéral d'objet. Babel génère le code ES5 suivant :

```js
&apos;use strict&apos;;

var _extends = Object.assign || function(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

function todoApp() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
  var action = arguments[1];

  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return _extends({}, state, { visibilityFilter: action.filter });
    default:
      return state;
  }
}
```

Imaginez maintenant que [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) soit plusieurs fois plus lent que le polyrempli `_extends` généré par Babel. Dans ce cas, passer d'un navigateur qui ne prend pas en charge [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) à une version compatible ES2015 du navigateur entraînerait une régression sérieuse des performances et pourrait freiner l'adoption d'ES2015 dans la pratique.

Cet exemple met également en évidence un autre inconvénient majeur de la transpilation : le code généré qui est livré à l'utilisateur est généralement beaucoup plus volumineux que le code ES2015+ que le développeur a initialement écrit. Dans l'exemple ci-dessus, le code original fait 203 caractères (176 octets gzippés) tandis que le code généré fait 588 caractères (367 octets gzippés). Cela représente déjà un facteur deux d'augmentation de taille. Examinons un autre exemple tiré de la proposition [async iterators](https://github.com/tc39/proposal-async-iteration) :

```js
async function* readLines(path) {
  let file = await fileOpen(path);
  try {
    while (!file.EOF) {
      yield await file.readLine();
    }
  } finally {
    await file.close();
  }
}
```

Babel traduit ces 187 caractères (150 octets compressés) en un impressionnant code ES5 de 2987 caractères (971 octets compressés), sans même compter le [runtime regenerator](https://babeljs.io/docs/plugins/transform-regenerator/) qui est requis comme dépendance supplémentaire :

```js
&apos;use strict&apos;;

var _asyncGenerator = function() {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };
        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function(arg) {
            resume(&apos;next&apos;, arg);
          }, function(arg) {
            resume(&apos;throw&apos;, arg);
          });
        } else {
          settle(result.done ? &apos;return&apos; : &apos;normal&apos;, result.value);
        }
      } catch (err) {
        settle(&apos;throw&apos;, err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case &apos;return&apos;:
          front.resolve({
            value: value,
            done: true
          });
          break;
        case &apos;throw&apos;:
          front.reject(value);
          break;
        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== &apos;function&apos;) {
      this.return = undefined;
    }
  }
  if (typeof Symbol === &apos;function&apos; && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
      return this;
    };
  }
  AsyncGenerator.prototype.next = function(arg) {
    return this._invoke(&apos;next&apos;, arg);
  };
  AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke(&apos;throw&apos;, arg);
  };
  AsyncGenerator.prototype.return = function(arg) {
    return this._invoke(&apos;return&apos;, arg);
  };
  return {
    wrap: function wrap(fn) {
      return function() {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function await (value) {
      return new AwaitValue(value);
    }
  };
}();

var readLines = function () {
  var _ref = _asyncGenerator.wrap(regeneratorRuntime.mark(function _callee(path) {
    var file;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _asyncGenerator.await(fileOpen(path));

          case 2:
            file = _context.sent;
            _context.prev = 3;

          case 4:
            if (file.EOF) {
              _context.next = 11;
              break;
            }

            _context.next = 7;
            return _asyncGenerator.await(file.readLine());

          case 7:
            _context.next = 9;
            return _context.sent;

          case 9:
            _context.next = 4;
            break;

          case 11:
            _context.prev = 11;
            _context.next = 14;
            return _asyncGenerator.await(file.close());

          case 14:
            return _context.finish(11);

          case 15:
          case &apos;end&apos;:
            return _context.stop();
        }
      }
    }, _callee, this, [[3,, 11, 15]]);
  }));

  return function readLines(_x) {
    return _ref.apply(this, arguments);
  };
}();
```

C'est une augmentation de **650%** de la taille (la fonction générique `_asyncGenerator` pourrait être partagée en fonction de la façon dont vous regroupez votre code, ce qui permettrait d'amortir une partie de ce coût sur plusieurs utilisations des itérateurs asynchrones). Nous pensons que ce n'est pas viable à long terme de ne fournir que du code transpilé vers ES5, car l'augmentation de la taille affectera non seulement le temps/le coût de téléchargement, mais ajoutera également un surcoût au moment de l'analyse et de la compilation. Si nous voulons vraiment améliorer drastiquement le chargement des pages et la réactivité des applications web modernes, en particulier sur les appareils mobiles, nous devons encourager les développeurs non seulement à utiliser ES2015+ lors de l'écriture de leur code, mais également à fournir ce code sans transpilation vers ES5. Fournir uniquement des bundles entièrement transpillés aux navigateurs anciens qui ne supportent pas ES2015. Pour les implémenteurs de machines virtuelles, cette vision signifie que nous devons prendre en charge les fonctionnalités ES2015+ de manière native **et** offrir des performances raisonnables.

## Méthodologie de mesure

Comme décrit ci-dessus, la performance absolue des fonctionnalités ES2015+ n'est pas vraiment un problème à ce stade. Au contraire, la priorité la plus haute actuellement est de garantir que la performance des fonctionnalités ES2015+ soit au même niveau que leur version simpliste en ES5 et, plus important encore, que celle générée par Babel. Heureusement, il existait déjà un projet appelé [SixSpeed](https://github.com/kpdecker/six-speed) par [Kevin Decker](http://www.incaseofstairs.com/), qui accomplit à peu près exactement ce dont nous avions besoin : une comparaison de performance entre les fonctionnalités ES2015, du code simpliste en ES5 et du code généré par des transpileurs.

![Le benchmark SixSpeed](/_img/high-performance-es2015/sixspeed.png)

Nous avons donc décidé de prendre cela comme base pour notre travail initial de performance ES2015+. Nous avons [forké SixSpeed](https://fhinkel.github.io/six-speed/) et ajouté quelques benchmarks. Nous nous sommes concentrés sur les régressions les plus importantes en premier lieu, c'est-à-dire les éléments où le ralentissement entre le ES5 simpliste et la version recommandée ES2015+ était supérieur à 2x, car notre hypothèse fondamentale est que la version simpliste en ES5 sera au moins aussi rapide que la version relativement conforme aux spécifications générée par Babel.

## Une architecture moderne pour un langage moderne

Dans le passé, V8 avait des difficultés à optimiser les types de fonctionnalités de langage présents dans ES2015+. Par exemple, il n'a jamais été faisable d'ajouter une prise en charge de la gestion des exceptions (c'est-à-dire try/catch/finally) à Crankshaft, le compilateur classique optimisé de V8. Cela signifiait que la capacité de V8 à optimiser une fonctionnalité ES6 comme for...of, qui a essentiellement une clause finally implicite, était limitée. Les limitations de Crankshaft et la complexité générale d'ajouter de nouvelles fonctionnalités de langage au compilateur de base full-codegen de V8 rendaient intrinsèquement difficile de s'assurer que les nouvelles fonctionnalités ES étaient ajoutées et optimisées dans V8 aussi rapidement qu'elles étaient standardisées.

Heureusement, Ignition et TurboFan ([le nouvel interpréteur et pipeline de compilation de V8](/blog/test-the-future)), ont été conçus pour prendre en charge l'intégralité du langage JavaScript dès le départ, y compris les flux de contrôle avancés, la gestion des exceptions et, plus récemment, les boucles `for`-`of` et le déstructuration d'ES2015. L'intégration étroite de l'architecture d'Ignition et de TurboFan permet d'ajouter rapidement de nouvelles fonctionnalités, de les optimiser rapidement et de manière incrémentielle.

Nombre des améliorations que nous avons réalisées pour les fonctionnalités modernes du langage n'ont été possibles qu'avec le nouveau pipeline Ignition/TurboFan. Ignition et TurboFan se sont avérés particulièrement critiques pour optimiser les générateurs et les fonctions asynchrones. Les générateurs ont longtemps été pris en charge par V8, mais n'étaient pas optimisables en raison des limitations des flux de contrôle dans Crankshaft. Les fonctions asynchrones sont essentiellement du sucre ajouté sur les générateurs, donc elles tombent dans la même catégorie. Le nouveau pipeline de compilation exploite Ignition pour comprendre l'AST et générer des bytecodes qui simplifient les flux de contrôle complexes des générateurs en bytecodes de flux de contrôle locaux plus simples. TurboFan peut plus facilement optimiser les bytecodes résultants puisqu'il n'a pas besoin de connaître quoi que ce soit de spécifique au flux de contrôle des générateurs, juste comment sauvegarder et restaurer l'état d'une fonction sur les pauses (yields).

![Comment les générateurs JavaScript sont représentés dans Ignition et TurboFan](/_img/high-performance-es2015/generators.svg)

## État des lieux

Notre objectif à court terme était d'atteindre une moyenne de ralentissement inférieure à 2× dès que possible. Nous avons commencé par examiner le pire test en premier, et de Chrome 54 à Chrome 58 (Canary), nous avons réussi à réduire le nombre de tests avec un ralentissement supérieur à 2× de 16 à 8, tout en réduisant le pire ralentissement de 19× dans Chrome 54 à seulement 6× dans Chrome 58 (Canary). Nous avons également réduit de manière significative le ralentissement moyen et médian pendant cette période :

![Ralentissement des fonctionnalités ES2015+ par rapport à l'équivalent natif ES5](/_img/high-performance-es2015/slowdown.svg)

Vous pouvez constater une tendance claire vers la parité entre ES2015+ et ES5. En moyenne, nous avons amélioré les performances par rapport à ES5 de plus de 47 %. Voici quelques points forts que nous avons abordés depuis Chrome 54.

![Performance des fonctionnalités ES2015+ par rapport à l'équivalent naïf ES5](/_img/high-performance-es2015/comparison.svg)

Nous avons notamment amélioré les performances des nouveaux constructeurs de langage basés sur l'itération, comme l'opérateur de propagation (spread operator), la déstructuration et les boucles `for`-`of`. Par exemple, en utilisant la déstructuration de tableau :

```js
function fn() {
  var [c] = data;
  return c;
}
```

…est désormais aussi rapide que la version simpliste en ES5 :

```js
function fn() {
  var c = data[0];
  return c;
}
```

…et beaucoup plus rapide (et plus court) que le code généré par Babel :

```js
&apos;use strict&apos;;

var _slicedToArray = function() {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i[&apos;return&apos;]) _i[&apos;return&apos;]();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function(arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError(&apos;Invalid attempt to destructure non-iterable instance&apos;);
    }
  };
}();

function fn() {
  var _data = data,
      _data2 = _slicedToArray(_data, 1),
      c = _data2[0];

  return c;
}
```

Vous pouvez consulter la présentation [High-Speed ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk) que nous avons donnée lors de la dernière rencontre du [Munich NodeJS User Group](http://www.mnug.de/) pour des détails supplémentaires :

Nous sommes engagés à continuer d'améliorer la performance des fonctionnalités ES2015+. Si vous êtes intéressé par les détails techniques, veuillez consulter le plan de performances du V8 pour [ES2015 et au-delà](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY).
