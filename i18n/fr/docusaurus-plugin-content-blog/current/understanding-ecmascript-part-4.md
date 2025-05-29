---
title: 'Comprendre la spécification ECMAScript, partie 4'
author: '[Marja Hölttä](https://twitter.com/marjakh), spectatrice spéculative des spécifications'
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - Comprendre ECMAScript
description: 'Tutoriel pour lire la spécification ECMAScript'
tweet: '1262815621756014594'
---

[Tous les épisodes](/blog/tags/understanding-ecmascript)

## Pendant ce temps dans d'autres parties du Web

[Jason Orendorff](https://github.com/jorendorff) de Mozilla a publié [une excellente analyse approfondie des particularités syntaxiques du JavaScript](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme). Bien que les détails de l'implémentation diffèrent, chaque moteur JS fait face aux mêmes problèmes avec ces particularités.

<!--truncate-->
## Grammaires de couverture

Dans cet épisode, nous examinons plus en détail les *grammaires de couverture*. Elles sont une manière de spécifier la grammaire pour les constructions syntaxiques qui semblent ambiguës au premier abord.

Encore une fois, nous sauterons les indices pour `[In, Yield, Await]` pour plus de concision, car ils ne sont pas importants pour cet article de blog. Voir [partie 3](/blog/understanding-ecmascript-part-3) pour une explication de leur signification et utilisation.

## Anticipations finies

En général, les analyseurs syntaxiques décident quelle production utiliser en se basant sur une anticipation finie (une quantité fixe de jetons suivants).

Dans certains cas, le prochain jeton détermine sans ambiguïté la production à utiliser. [Par exemple](https://tc39.es/ecma262/#prod-UpdateExpression) :

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

Si nous analysons une `UpdateExpression` et que le prochain jeton est `++` ou `--`, nous connaissons immédiatement la production à utiliser. Si le prochain jeton n'est ni l'un ni l'autre, ce n'est pas si mauvais : nous pouvons analyser une `LeftHandSideExpression` à partir de la position actuelle, et déterminer quoi faire une fois que nous l'avons analysée.

Si le jeton suivant la `LeftHandSideExpression` est `++`, la production à utiliser est `UpdateExpression : LeftHandSideExpression ++`. Le cas pour `--` est similaire. Et si le jeton suivant la `LeftHandSideExpression` n'est ni `++` ni `--`, nous utilisons la production `UpdateExpression : LeftHandSideExpression`.

### Liste de paramètres de fonction fléchée ou expression entre parenthèses ?

Distinguer les listes de paramètres de fonction fléchée des expressions entre parenthèses est plus compliqué.

Par exemple :

```js
let x = (a,
```

Est-ce le début d'une fonction fléchée, comme ceci ?

```js
let x = (a, b) => { return a + b };
```

Ou est-ce peut-être une expression entre parenthèses, comme ceci ?

```js
let x = (a, 3);
```

Le quelque chose entre parenthèses peut être arbitrairement long - nous ne pouvons pas savoir ce que c'est en fonction d'une quantité finie de jetons.

Imaginons un instant que nous ayons les productions suivantes simples :

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

Nous ne pouvons maintenant pas choisir la production à utiliser avec une anticipation finie. Si nous devions analyser une `AssignmentExpression` et que le prochain jeton était `(`, comment décider quoi analyser ensuite ? Nous pourrions soit analyser une `ArrowParameterList`, soit une `ParenthesizedExpression`, mais notre choix pourrait se tromper.

### Le nouveau symbole très permissif : `CPEAAPL`

La spécification résout ce problème en introduisant le symbole `CoverParenthesizedExpressionAndArrowParameterList` (`CPEAAPL` en abrégé). `CPEAAPL` est un symbole qui est en réalité une `ParenthesizedExpression` ou une `ArrowParameterList` en arrière-plan, mais nous ne savons pas encore laquelle.

Les [productions](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList) pour `CPEAAPL` sont très permissives, permettant toutes les constructions qui peuvent apparaître dans des `ParenthesizedExpression`s et dans des `ArrowParameterList`s :

```grammar
CPEAAPL :
  ( Expression )
  ( Expression , )
  ( )
  ( ... BindingIdentifier )
  ( ... BindingPattern )
  ( Expression , ... BindingIdentifier )
  ( Expression , ... BindingPattern )
```

Par exemple, les expressions suivantes sont des `CPEAAPL` valides :

```js
// `ParenthesizedExpression` et `ArrowParameterList` valides :
(a, b)
(a, b = 1)

// `ParenthesizedExpression` valide :
(1, 2, 3)
(function foo() {})

// `ArrowParameterList` valide :
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// Pas valide, mais toujours un `CPEAAPL` :
(1, ...b)
(1, )
```

La virgule finale et le `...` ne peuvent apparaître que dans une `ArrowParameterList`. Certaines constructions, comme `b = 1`, peuvent apparaître dans les deux, mais elles ont des significations différentes : à l'intérieur de `ParenthesizedExpression`, c'est une affectation, à l'intérieur de `ArrowParameterList`, c'est un paramètre avec une valeur par défaut. Les nombres et autres `PrimaryExpressions` qui ne sont pas des noms de paramètres valides (ou des modèles de déstructuration de paramètres) ne peuvent apparaître que dans `ParenthesizedExpression`. Mais ils peuvent tous apparaître à l'intérieur d'un `CPEAAPL`.

### Utiliser `CPEAAPL` dans les productions

Nous pouvons maintenant utiliser le très permissif `CPEAAPL` dans les [productions `AssignmentExpression`](https://tc39.es/ecma262/#prod-AssignmentExpression). (Note : `ConditionalExpression` conduit à `PrimaryExpression` via une longue chaîne de production qui n'est pas affichée ici.)

```grammar
AssignmentExpression :
  ConditionalExpression
  ArrowFunction
  ...

ArrowFunction :
  ArrowParameters => ConciseBody

ArrowParameters :
  BindingIdentifier
  CPEAAPL

PrimaryExpression :
  ...
  CPEAAPL

```

Imaginez que nous sommes à nouveau dans la situation où nous devons analyser un `AssignmentExpression` et que le prochain jeton est `(`. Nous pouvons maintenant analyser un `CPEAAPL` et décider plus tard quelle production utiliser. Peu importe si nous analysons un `ArrowFunction` ou un `ConditionalExpression`, le prochain symbole à analyser est `CPEAAPL` dans tous les cas !

Après avoir analysé le `CPEAAPL`, nous pouvons décider quelle production utiliser pour le `AssignmentExpression` original (celui contenant le `CPEAAPL`). Cette décision est prise en fonction du jeton suivant le `CPEAAPL`.

Si le jeton est `=>`, nous utilisons la production :

```grammar
AssignmentExpression :
  ArrowFunction
```

Si le jeton est autre chose, nous utilisons la production :

```grammar
AssignmentExpression :
  ConditionalExpression
```

Par exemple :

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             Le jeton suivant le CPEAAPL

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            Le jeton suivant le CPEAAPL
```

À ce stade, nous pouvons garder le `CPEAAPL` tel quel et continuer à analyser le reste du programme. Par exemple, si le `CPEAAPL` se trouve à l'intérieur d'un `ArrowFunction`, nous n'avons pas encore besoin de vérifier s'il s'agit d'une liste valide de paramètres de fonction fléchée - cette vérification peut être effectuée plus tard. (Les analyseurs réels pourraient choisir de vérifier la validité immédiatement, mais du point de vue de la spécification, nous n'avons pas besoin de le faire.)

### Restriction des CPEAAPLs

Comme nous l'avons vu précédemment, les productions grammaticales pour `CPEAAPL` sont très permissives et permettent des constructions (telles que `(1, ...a)`) qui ne sont jamais valides. Une fois l'analyse du programme effectuée selon la grammaire, nous devons interdire les constructions illégales correspondantes.

La spécification le fait en ajoutant les restrictions suivantes :

:::ecmascript-algorithm
> [Sémantique Statique : Erreurs Anticipées](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> Il s'agit d'une erreur de syntaxe si `CPEAAPL` ne couvre pas une `ParenthesizedExpression`.

:::ecmascript-algorithm
> [Syntaxe Supplémentaire](https://tc39.es/ecma262/#sec-primary-expression)
>
> Lors du traitement d'une instance de la production
>
> `PrimaryExpression : CPEAAPL`
>
> l'interprétation du `CPEAAPL` est affinée en utilisant la grammaire suivante :
>
> `ParenthesizedExpression : ( Expression )`

Cela signifie : si un `CPEAAPL` apparaît à la place de `PrimaryExpression` dans l'arbre syntaxique, il s'agit en fait d'une `ParenthesizedExpression` et c'est sa seule production valide.

`Expression` ne peut jamais être vide, donc `( )` n'est pas une `ParenthesizedExpression` valide. Les listes séparées par des virgules comme `(1, 2, 3)` sont créées par [l'opérateur virgule](https://tc39.es/ecma262/#sec-comma-operator) :

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

De même, si un `CPEAAPL` apparaît à la place de `ArrowParameters`, les restrictions suivantes s'appliquent :

:::ecmascript-algorithm
> [Sémantique Statique : Erreurs Anticipées](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> Il s'agit d'une erreur de syntaxe si `CPEAAPL` ne couvre pas une `ArrowFormalParameters`.

:::ecmascript-algorithm
> [Syntaxe Supplémentaire](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> Lorsqu'une production
>
> `ArrowParameters` : `CPEAAPL`
>
> est reconnue, la grammaire suivante est utilisée pour affiner l'interprétation de `CPEAAPL` :
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### Autres grammaires de couverture

En plus de `CPEAAPL`, la spécification utilise des grammaires de couverture pour d'autres constructions apparemment ambiguës.

`ObjectLiteral` est utilisé comme une grammaire de couverture pour `ObjectAssignmentPattern` qui apparaît dans les listes de paramètres de fonctions fléchées. Cela signifie que `ObjectLiteral` permet des constructions qui ne peuvent pas apparaître dans de véritables littéraux d'objets.

```grammar
ObjectLiteral :
  ...
  { PropertyDefinitionList }

PropertyDefinition :
  ...
  CoverInitializedName

CoverInitializedName :
  IdentifierReference Initializer

Initializer :
  = AssignmentExpression
```

Par exemple :

```js
let o = { a = 1 }; // erreur de syntaxe

// Fonction fléchée avec un paramètre destructuré avec une valeur par défaut :
// valeur :
let f = ({ a = 1 }) => { return a; };
f({}); // retourne 1
f({a : 6}); // retourne 6
```

Les fonctions fléchées asynchrones semblent également ambiguës avec une anticipation finie :

```js
let x = async(a,
```

S'agit-il d'un appel à une fonction appelée `async` ou d'une fonction fléchée asynchrone ?

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

À cette fin, la grammaire définit un symbole de grammaire de couverture `CoverCallExpressionAndAsyncArrowHead` qui fonctionne de manière similaire à `CPEAAPL`.

## Résumé

Dans cet épisode, nous avons examiné comment la spécification définit les grammaires de couverture et les utilise dans les cas où nous ne pouvons pas identifier la construction syntaxique actuelle en nous basant sur un regard limité.

En particulier, nous avons étudié la distinction entre les listes de paramètres des fonctions fléchées et les expressions parenthésées, ainsi que la manière dont la spécification utilise une grammaire de couverture pour analyser d'abord de manière permissive les constructions à l'apparence ambiguë avant de les restreindre avec des règles sémantiques statiques ultérieurement.
