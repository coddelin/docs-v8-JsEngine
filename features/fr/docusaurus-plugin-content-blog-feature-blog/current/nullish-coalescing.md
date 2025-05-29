---
title: &apos;Coalescence nulle&apos;
author: &apos;Justin Ridgewell&apos;
avatars:
  - &apos;justin-ridgewell&apos;
date: 2019-09-17
tags:
  - ECMAScript
  - ES2020
description: &apos;L&apos;opérateur de coalescence nulle en JavaScript permet des expressions par défaut plus sûres.&apos;
tweet: &apos;1173971116865523714&apos;
---
La [proposition de coalescence nulle](https://github.com/tc39/proposal-nullish-coalescing/) (`??`) ajoute un nouvel opérateur de court-circuit destiné à gérer les valeurs par défaut.

Vous connaissez peut-être déjà les autres opérateurs de court-circuit `&&` et `||`. Ces deux opérateurs traitent les valeurs « vraies » (truthy) et « fausses » (falsy). Imaginez l'exemple de code `lhs && rhs`. Si `lhs` (lire, _côté gauche_) est falsy, l'expression est évaluée à `lhs`. Sinon, elle est évaluée à `rhs` (lire, _côté droit_). L'inverse est vrai pour l'exemple de code `lhs || rhs`. Si `lhs` est truthy, l'expression est évaluée à `lhs`. Sinon, elle est évaluée à `rhs`.

<!--truncate-->
Mais que signifient exactement « truthy » et « falsy » ? En termes de spécification, cela équivaut à l'opération abstraite [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean). Pour nous, développeurs JavaScript ordinaires, **tout** est truthy sauf les valeurs falsy `undefined`, `null`, `false`, `0`, `NaN` et la chaîne vide `&apos;&apos;`. (Techniquement, la valeur associée à `document.all` est également falsy, mais nous y reviendrons plus tard.)

Alors, quel est le problème avec `&&` et `||` ? Et pourquoi avons-nous besoin d'un nouvel opérateur de coalescence nulle ? C'est parce que cette définition de truthy et falsy ne convient pas à tous les scénarios, ce qui entraîne des bugs. Imaginez le cas suivant :

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

Dans cet exemple, traitons la propriété `enabled` comme une propriété booléenne optionnelle qui contrôle si une fonctionnalité du composant est activée. Autrement dit, nous pouvons définir explicitement `enabled` sur `true` ou `false`. Mais, étant donné qu'il s'agit d'une propriété _optionnelle_, nous pouvons implicitement la définir sur `undefined` en ne la définissant pas du tout. Si elle est `undefined`, nous voulons la traiter comme si le composant était `enabled = true` (sa valeur par défaut).

À ce stade, vous remarquez probablement le bug dans l'exemple de code. Si nous définissons explicitement `enabled = true`, alors la variable `enable` est `true`. Si nous définissons implicitement `enabled = undefined`, alors la variable `enable` est `true`. Et si nous définissons explicitement `enabled = false`, alors la variable `enable` est toujours `true` ! Notre intention était de _définir par défaut_ la valeur à `true`, mais nous avons en fait forcé la valeur à `true`. La solution dans ce cas est d'être très explicite sur les valeurs attendues :

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

Nous voyons ce genre de bug apparaître avec chaque valeur falsy. Cela aurait pu très facilement être une chaîne optionnelle (où la chaîne vide `&apos;&apos;` est considérée comme une entrée valide) ou un numéro optionnel (où `0` est considéré comme une entrée valide). Ce problème est si courant que nous introduisons désormais l'opérateur de coalescence nulle pour gérer ce genre d'affectation de valeur par défaut :

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

L'opérateur de coalescence nulle (`??`) agit de manière très similaire à l'opérateur `||`, sauf que nous n'utilisons pas « truthy » pour évaluer l'opérateur. À la place, nous utilisons la définition de « nul » (nullish), signifiant « la valeur est-elle strictement égale à `null` ou `undefined` ». Donc, imaginez l'expression `lhs ?? rhs` : si `lhs` n'est pas nul, l'expression est évaluée à `lhs`. Sinon, elle est évaluée à `rhs`.

Explicitement, cela signifie que les valeurs `false`, `0`, `NaN` et la chaîne vide `&apos;&apos;` sont toutes des valeurs falsy qui ne sont pas nulles. Lorsque ces valeurs falsy-mais-non-nulles sont le côté gauche de `lhs ?? rhs`, l'expression est évaluée à elles au lieu du côté droit. Finis les bugs !

```js
false ?? true;   // => false
0 ?? 1;          // => 0
&apos;&apos; ?? &apos;default&apos;; // => &apos;&apos;

null ?? [];      // => []
undefined ?? []; // => []
```

## Et qu'en est-il de l'affectation par défaut lors de la déstructuration ?

Vous avez peut-être remarqué que le dernier exemple de code pourrait également être corrigé en utilisant l'affectation par défaut dans une déstructuration d'objet :

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

C'est un peu verbeux, mais toujours entièrement valable en JavaScript. Cela utilise cependant une sémantique légèrement différente. L'affectation par défaut dans les déstructurations d'objets vérifie si la propriété est strictement égale à `undefined`, et si c'est le cas, assigne la valeur par défaut.

Mais ces tests d'égalité stricte pour seulement `undefined` ne sont pas toujours souhaitables, et un objet à déstructurer n'est pas toujours disponible. Par exemple, peut-être voulez-vous une valeur par défaut sur les valeurs de retour d'une fonction (aucun objet à déstructurer). Ou peut-être que la fonction renvoie `null` (ce qui est courant pour les API DOM). Ce sont les moments où vous voulez utiliser la coalescence nulle :

```js
// Coalescence nulle concise
const link = document.querySelector(&apos;link&apos;) ?? document.createElement(&apos;link&apos;);

// Affectation par défaut avec déstructuration de base
const {
  link = document.createElement(&apos;link&apos;),
} = {
  link: document.querySelector(&apos;link&apos;) || undefined
};
```

De plus, certaines nouvelles fonctionnalités comme [l'opérateur d'enchaînement optionnel](/features/optional-chaining) ne fonctionnent pas parfaitement avec la déstructuration. Étant donné que la déstructuration nécessite un objet, il faut protéger l'opération de déstructuration au cas où l'enchaînement optionnel retournerait `undefined` au lieu d'un objet. Avec la coalescence des nulls, nous n'avons pas de tel problème :

```js
// Enchaînement optionnel et coalescence des nulls conjointement
const link = obj.deep?.container.link ?? document.createElement(&apos;link&apos;);

// Affectation par défaut avec déstructuration et enchaînement optionnel
const {
  link = document.createElement(&apos;link&apos;),
} = (obj.deep?.container || {});
```

## Mélanger et associer les opérateurs

La conception d'un langage est complexe, et nous ne sommes pas toujours capables de créer de nouveaux opérateurs sans introduire une certaine ambiguïté dans les intentions du développeur. Si vous avez déjà mélangé les opérateurs `&&` et `||`, vous avez probablement rencontré cette ambiguïté. Imaginez l'expression `lhs && middle || rhs`. En JavaScript, cela est en fait analysé de la même manière que l'expression `(lhs && middle) || rhs`. Maintenant, imaginez l'expression `lhs || middle && rhs`. Celle-ci est en fait analysée de la même manière que `lhs || (middle && rhs)`.

Vous pouvez probablement constater que l'opérateur `&&` a une priorité plus élevée pour ses côtés gauche et droit que l'opérateur `||`, ce qui signifie que les parenthèses implicites entourent le `&&` au lieu du `||`. Lors de la conception de l'opérateur `??`, nous avons dû décider de la priorité qu'il aurait. Cela pourrait être :

1. une priorité inférieure à `&&` et `||`
1. inférieure à `&&` mais supérieure à `||`
1. une priorité supérieure à `&&` et `||`

Pour chacune de ces définitions de priorité, nous avons ensuite dû les tester avec les quatre cas possibles :

1. `lhs && middle ?? rhs`
1. `lhs ?? middle && rhs`
1. `lhs || middle ?? rhs`
1. `lhs ?? middle || rhs`

Dans chaque expression test, nous avons dû décider où placer les parenthèses implicites. Et si elles n'entouraient pas l'expression exactement comme prévu par le développeur, alors nous aurions un code mal écrit. Malheureusement, peu importe le niveau de priorité choisi, l'une des expressions de test pourrait violer les intentions du développeur.

En fin de compte, nous avons décidé de nécessiter des parenthèses explicites lors du mélange de `??` avec (`&&` ou `||`) (notez que j'ai été explicite dans mon regroupement entre parenthèses ! blague meta !). Si vous mélangez, vous devez entourer l'un des groupes d'opérateurs avec des parenthèses, sous peine de générer une erreur de syntaxe.

```js
// Des regroupements explicites entre parenthèses sont requis pour mélanger
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

Ainsi, l'analyseur syntaxique du langage correspond toujours aux intentions du développeur. Et toute personne lisant le code par la suite peut également le comprendre immédiatement. Super !

## Parlez-moi de `document.all`

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all) est une valeur spéciale que vous ne devriez jamais jamais utiliser. Mais si vous l'utilisez, il vaut mieux savoir comment elle interagit avec les valeurs « truthy » et « nullish ».

`document.all` est un objet de type tableau, ce qui signifie qu'il a des propriétés indexées comme un tableau et une propriété length. Les objets sont habituellement évalués comme « truthy » — mais étonnamment, `document.all` prétend être une valeur « falsy » ! En fait, il est faiblement égal à `null` et `undefined` (ce qui signifierait normalement qu'il ne peut pas avoir de propriétés du tout).

Lorsqu'on utilise `document.all` avec soit `&&` soit `||`, il prétend être « falsy ». Cependant, il n'est pas strictement égal à `null` ou `undefined`, donc il n'est pas nullish. Ainsi, lorsqu'on utilise `document.all` avec `??`, il se comporte comme tout autre objet.

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## Prise en charge de la coalescence des nulls

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
