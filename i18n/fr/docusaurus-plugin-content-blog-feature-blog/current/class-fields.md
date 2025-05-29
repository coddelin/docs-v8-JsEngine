---
title: &apos;Champs de classe publics et privés&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: &apos;Plusieurs propositions étendent la syntaxe existante des classes JavaScript avec de nouvelles fonctionnalités. Cet article explique la nouvelle syntaxe des champs de classe publics dans V8 v7.2 et Chrome 72, ainsi que la syntaxe des champs de classe privés à venir.&apos;
tweet: &apos;1121395767170740225&apos;
---
Plusieurs propositions étendent la syntaxe existante des classes JavaScript avec de nouvelles fonctionnalités. Cet article explique la nouvelle syntaxe des champs de classe publics dans V8 v7.2 et Chrome 72, ainsi que la syntaxe des champs de classe privés à venir.

Voici un exemple de code qui crée une instance d'une classe nommée `IncreasingCounter` :

```js
const counter = new IncreasingCounter();
counter.value;
// affiche &apos;Récupération de la valeur actuelle !&apos;
// → 0
counter.increment();
counter.value;
// affiche &apos;Récupération de la valeur actuelle !&apos;
// → 1
```

Notez que l'accès à la propriété `value` exécute du code (c'est-à-dire qu'il affiche un message) avant de retourner le résultat. Maintenant demandez-vous, comment implémenteriez-vous cette classe en JavaScript ? 🤔

## Syntaxe des classes ES2015

Voici comment `IncreasingCounter` pourrait être implémenté en utilisant la syntaxe des classes ES2015 :

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log(&apos;Récupération de la valeur actuelle !&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

La classe installe le getter `value` et une méthode `increment` sur le prototype. Plus intéressant encore, la classe dispose d'un constructeur qui crée une propriété d'instance `_count` et définit sa valeur par défaut à `0`. Nous avons actuellement tendance à utiliser le préfixe de soulignement pour indiquer que `_count` ne doit pas être utilisé directement par les consommateurs de la classe, mais ce n'est qu'une convention ; il ne s'agit pas _vraiment_ d'une propriété « privée » avec des sémantiques spéciales appliquées par le langage.

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// affiche &apos;Récupération de la valeur actuelle !&apos;
// → 0

// Rien n'empêche les gens de lire ou de modifier la
// propriété d'instance `_count`. 😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// affiche &apos;Récupération de la valeur actuelle !&apos;
// → 42
```

## Champs de classe publics

La nouvelle syntaxe des champs de classe publics nous permet de simplifier la définition de la classe :

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log(&apos;Récupération de la valeur actuelle !&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

La propriété `_count` est maintenant joliment déclarée en haut de la classe. Nous n'avons plus besoin d'un constructeur juste pour définir quelques champs. Sympa !

Cependant, le champ `_count` est toujours une propriété publique. Dans cet exemple particulier, nous souhaitons empêcher les gens d'accéder directement à la propriété.

## Champs de classe privés

C'est là que les champs de classe privés interviennent. La nouvelle syntaxe des champs privés est similaire à celle des champs publics, sauf [que vous marquez le champ comme étant privé en utilisant `#`](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md). Vous pouvez considérer le `#` comme faisant partie du nom du champ :

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log(&apos;Récupération de la valeur actuelle !&apos;);
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Les champs privés ne sont pas accessibles en dehors du corps de la classe :

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## Propriétés statiques publiques et privées

La syntaxe des champs de classe peut également être utilisée pour créer des propriétés et des méthodes statiques publiques et privées :

```js
class FakeMath {
  // `PI` est une propriété statique publique.
  static PI = 22 / 7; // Approximatif.

  // `#totallyRandomNumber` est une propriété statique privée.
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber` est une méthode statique privée.
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random` est une méthode statique publique (syntaxe ES2015)
  // qui utilise `#computeRandomNumber`.
  static random() {
    console.log(&apos;J&apos;ai entendu dire que vous aimez les nombres aléatoires…&apos;);
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// affiche &apos;J&apos;ai entendu dire que vous aimez les nombres aléatoires…&apos;
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## Sous-classage simplifié

Les avantages de la syntaxe des champs de classe deviennent encore plus clairs lorsqu'il s'agit de sous-classes qui introduisent des champs supplémentaires. Imaginez la classe de base suivante `Animal` :

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

Pour créer une sous-classe `Cat` qui introduit une propriété d'instance supplémentaire, il faudrait auparavant appeler `super()` pour exécuter le constructeur de la classe de base `Animal` avant de créer la propriété :

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log(&apos;Miaou!&apos;);
  }
}
```

C'est beaucoup de code pour simplement indiquer que les chats n'aiment pas les bains. Heureusement, la syntaxe des champs de classe supprime le besoin de tout le constructeur, y compris l'appel maladroit à `super()` :

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log(&apos;Miaou!&apos;);
  }
}
```

## Support de la fonctionnalité

### Support des champs de classe publics

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="oui https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="oui https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="oui https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Support des champs de classe privés

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="oui"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="oui https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Support des méthodes et accesseurs privés

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="oui https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="oui https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
