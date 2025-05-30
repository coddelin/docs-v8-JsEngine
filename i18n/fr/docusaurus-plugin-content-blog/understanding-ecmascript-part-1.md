---
title: "Comprendre la spécification ECMAScript, partie 1"
author: "[Marja Hölttä](https://twitter.com/marjakh), spectateur spéculatif de la spécification"
avatars: 
  - marja-holtta
date: "2020-02-03 13:33:37"
tags: 
  - ECMAScript
  - Comprendre ECMAScript
description: "Tutoriel pour lire la spécification ECMAScript"
tweet: "1224363301146189824"
---

[Tous les épisodes](/blog/tags/understanding-ecmascript)

Dans cet article, nous prenons une fonction simple de la spécification et essayons de comprendre la notation. Allons-y !

## Préface

Même si vous connaissez JavaScript, lire sa spécification de langage, [Spécification du langage ECMAScript, ou la spécification ECMAScript en abrégé](https://tc39.es/ecma262/), peut être assez intimidant. C’est au moins ce que j’ai ressenti lorsque je l’ai lue pour la première fois.

<!--truncate-->
Commençons par un exemple concret et parcourons la spécification pour la comprendre. Le code suivant illustre l’utilisation de `Object.prototype.hasOwnProperty` :

```js
const o = { foo: 1 };
o.hasOwnProperty('foo'); // true
o.hasOwnProperty('bar'); // false
```

Dans cet exemple, `o` n’a pas de propriété appelée `hasOwnProperty`, donc nous remontons la chaîne de prototypes pour la chercher. Nous la trouvons dans le prototype de `o`, qui est `Object.prototype`.

Pour décrire comment fonctionne `Object.prototype.hasOwnProperty`, la spécification utilise des descriptions de type pseudocode :

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> Lorsque la méthode `hasOwnProperty` est appelée avec l’argument `V`, les étapes suivantes sont effectuées :
>
> 1. Laissez `P` être `? ToPropertyKey(V)`.
> 2. Laissez `O` être `? ToObject(this value)`.
> 3. Retournez `? HasOwnProperty(O, P)`.
:::

…et…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> L’opération abstraite `HasOwnProperty` est utilisée pour déterminer si un objet possède une propriété propre avec la clé de propriété spécifiée. Une valeur booléenne est renvoyée. L’opération est appelée avec les arguments `O` et `P`, où `O` est l’objet et `P` est la clé de propriété. Cette opération abstraite effectue les étapes suivantes :
>
> 1. Affirmez : `Type(O)` est `Object`.
> 2. Affirmez : `IsPropertyKey(P)` est `true`.
> 3. Laissez `desc` être `? O.[[GetOwnProperty]](P)`.
> 4. Si `desc` est `undefined`, retournez `false`.
> 5. Retournez `true`.
:::

Mais qu’est-ce qu’une « opération abstraite » ? Que sont les choses à l’intérieur de `[[ ]]` ? Pourquoi y a-t-il un `?` devant une fonction ? Que signifient les assertions ?

Découvrons-le !

## Types de langage et types de spécification

Commençons par quelque chose qui semble familier. La spécification utilise des valeurs telles que `undefined`, `true` et `false`, que nous connaissons déjà en JavaScript. Ce sont toutes des [**valeurs de langage**](https://tc39.es/ecma262/#sec-ecmascript-language-types), des valeurs de **types de langage** que la spécification définit également.

La spécification utilise également des valeurs de langage en interne, par exemple, un type de données interne pourrait contenir un champ dont les valeurs possibles sont `true` et `false`. En revanche, les moteurs JavaScript n’utilisent généralement pas les valeurs de langage en interne. Par exemple, si le moteur JavaScript est écrit en C++, il utiliserait généralement les valeurs `true` et `false` de C++ (et non ses représentations internes des valeurs `true` et `false` de JavaScript).

En plus des types de langage, la spécification utilise également des [**types de spécification**](https://tc39.es/ecma262/#sec-ecmascript-specification-types), qui sont des types qui ne se trouvent que dans la spécification, mais pas dans le langage JavaScript. Le moteur JavaScript n’a pas besoin de les implémenter (mais il peut le faire). Dans cet article de blog, nous nous familiariserons avec le type de spécification Record (et son sous-type Completion Record).

## Opérations abstraites

[**Les opérations abstraites**](https://tc39.es/ecma262/#sec-abstract-operations) sont des fonctions définies dans la spécification ECMAScript ; elles sont définies dans le but d’écrire la spécification de manière concise. Un moteur JavaScript n’a pas besoin de les implémenter comme des fonctions distinctes à l’intérieur du moteur. Elles ne peuvent pas être appelées directement depuis JavaScript.

## Slots internes et méthodes internes

[**Les slots internes** et **méthodes internes**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots) utilisent des noms entourés de `[[ ]]`.

Les slots internes sont des membres de données d’un objet JavaScript ou d’un type de spécification. Ils sont utilisés pour stocker l’état de l’objet. Les méthodes internes sont des fonctions membres d’un objet JavaScript.

Par exemple, chaque objet JavaScript possède un slot interne `[[Prototype]]` et une méthode interne `[[GetOwnProperty]]`.

Les slots et méthodes internes ne sont pas accessibles depuis JavaScript. Par exemple, vous ne pouvez pas accéder à `o.[[Prototype]]` ou appeler `o.[[GetOwnProperty]]()`. Un moteur JavaScript peut les implémenter pour sa propre utilisation interne, mais il n’y est pas obligé.

Parfois, les méthodes internes délèguent à des opérations abstraites portant des noms similaires, comme dans le cas des `[[GetOwnProperty]]` des objets ordinaires :

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> Lorsque la méthode interne `[[GetOwnProperty]]` de `O` est appelée avec la clé de propriété `P`, les étapes suivantes sont effectuées :
>
> 1. Retourne `! OrdinaryGetOwnProperty(O, P)`.
:::

(Nous découvrirons ce que signifie le point d'exclamation dans le prochain chapitre.)

`OrdinaryGetOwnProperty` n'est pas une méthode interne, car elle n'est pas associée à un objet. Au lieu de cela, l'objet sur lequel elle opère est passé en tant que paramètre.

`OrdinaryGetOwnProperty` est appelée “ordinaire” car elle opère sur des objets ordinaires. Les objets ECMAScript peuvent être soit **ordinaires** soit **exotiques**. Les objets ordinaires doivent avoir le comportement par défaut pour un ensemble de méthodes appelées **méthodes internes essentielles**. Si un objet dévie de ce comportement par défaut, il est exotique.

L'objet exotique le plus connu est l'`Array`, car sa propriété `length` se comporte de manière non par défaut : définir la propriété `length` peut supprimer des éléments de l'`Array`.

Les méthodes internes essentielles sont les méthodes listées [ici](https://tc39.es/ecma262/#table-5).

## Enregistrements de complétion

Qu'en est-il des points d'interrogation et des points d'exclamation ? Pour les comprendre, nous devons examiner les [**Enregistrements de complétion**](https://tc39.es/ecma262/#sec-completion-record-specification-type) !

Un enregistrement de complétion est un type de spécification (défini uniquement à des fins de spécification). Un moteur JavaScript n'a pas besoin d'avoir un type de données interne correspondant.

Un enregistrement de complétion est un “enregistrement” — un type de données qui possède un ensemble fixe de champs nommés. Un enregistrement de complétion contient trois champs :

:::table-wrapper
| Nom          | Description                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `[[Type]]`   | L’un des suivants : `normal`, `break`, `continue`, `return` ou `throw`. Tous les autres types sauf `normal` sont **complétions abruptes**. |
| `[[Value]]`  | La valeur produite lors de la complétion, par exemple, la valeur de retour d'une fonction ou l'exception (si une exception est levée).     |
| `[[Target]]` | Utilisé pour les transferts de contrôle dirigés (non pertinent pour cet article de blog).                                                  |
:::

Chaque opération abstraite retourne implicitement un enregistrement de complétion. Même si l’opération abstraite semble retourner un type simple tel que Boolean, elle est implicitement enveloppée dans un enregistrement de complétion avec le type `normal` (voir [Valeurs de complétion implicites](https://tc39.es/ecma262/#sec-implicit-completion-values)).

Note 1 : La spécification n’est pas entièrement cohérente à cet égard ; il existe des fonctions d’aide qui retournent des valeurs brutes dont les valeurs de retour sont utilisées telles quelles, sans extraire la valeur de l'enregistrement de complétion. Cela est habituellement clair selon le contexte.

Note 2 : Les éditeurs de la spécification cherchent à rendre le traitement des enregistrements de complétion plus explicite.

Si un algorithme lève une exception, cela signifie retourner un enregistrement de complétion avec `[[Type]]` `throw` dont `[[Value]]` est l'objet exception. Nous ignorons pour l'instant les types `break`, `continue` et `return`.

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt) signifie effectuer les étapes suivantes :

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Si `argument` est abrupt, retourne `argument`
> 2. Assigne `argument` à `argument.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Cela signifie que nous inspectons un enregistrement de complétion ; s’il s’agit d'une complétion abrupte, nous retournons immédiatement. Sinon, nous extrayons la valeur de l'enregistrement de complétion.

`ReturnIfAbrupt` pourrait ressembler à un appel de fonction, mais ce n'est pas le cas. Cela provoque le retour de la fonction où `ReturnIfAbrupt()` est utilisé, et non de la fonction `ReturnIfAbrupt` elle-même. Cela ressemble davantage à un macro dans les langages de type C.

`ReturnIfAbrupt` peut être utilisé ainsi :

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Assigne `obj` à `Foo()`. (`obj` est un enregistrement de complétion.)
> 2. `ReturnIfAbrupt(obj)`.
> 3. `Bar(obj)`. (Si nous sommes toujours ici, `obj` est la valeur extraite de l’enregistrement de complétion.)
<!-- markdownlint-enable blanks-around-lists -->
:::

Et maintenant [le point d'interrogation](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands) entre en jeu : `? Foo()` est équivalent à `ReturnIfAbrupt(Foo())`. Utiliser une forme abrégée est pratique : nous n'avons pas besoin d'écrire le code de gestion des erreurs explicitement à chaque fois.

De même, `Let val be ! Foo()` est équivalent à :

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Assigne `val` à `Foo()`.
> 2. Vérifie : `val` n'est pas une complétion abrupte.
> 3. Assigne `val` à `val.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Grâce à cette connaissance, nous pouvons réécrire `Object.prototype.hasOwnProperty` ainsi :

:::ecmascript-algorithm
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. Laissez `P` être `ToPropertyKey(V)`.
> 2. Si `P` est une terminaison abrupte, retournez `P`
> 3. Définir `P` comme `P.[[Value]]`
> 4. Laissez `O` être `ToObject(this value)`.
> 5. Si `O` est une terminaison abrupte, retournez `O`
> 6. Définir `O` comme `O.[[Value]]`
> 7. Laissez `temp` être `HasOwnProperty(O, P)`.
> 8. Si `temp` est une terminaison abrupte, retournez `temp`
> 9. Définir `temp` comme `temp.[[Value]]`
> 10. Retournez `NormalCompletion(temp)`
:::

…et nous pouvons réécrire `HasOwnProperty` ainsi :

:::ecmascript-algorithm
> **`HasOwnProperty(O, P)`**
>
> 1. Affirmez: `Type(O)` est `Object`.
> 2. Affirmez: `IsPropertyKey(P)` est `true`.
> 3. Laissez `desc` être `O.[[GetOwnProperty]](P)`.
> 4. Si `desc` est une terminaison abrupte, retournez `desc`
> 5. Définir `desc` comme `desc.[[Value]]`
> 6. Si `desc` est `undefined`, retournez `NormalCompletion(false)`.
> 7. Retournez `NormalCompletion(true)`.
:::

Nous pouvons également réécrire la méthode interne `[[GetOwnProperty]]` sans le point d'exclamation :

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. Laissez `temp` être `OrdinaryGetOwnProperty(O, P)`.
> 2. Affirmez: `temp` n'est pas une terminaison abrupte.
> 3. Définir `temp` comme `temp.[[Value]]`.
> 4. Retournez `NormalCompletion(temp)`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Ici, nous supposons que `temp` est une toute nouvelle variable temporaire qui ne se heurte à rien d'autre.

Nous avons également utilisé la connaissance que lorsqu'une instruction return renvoie autre chose qu'un Completion Record, elle est implicitement enveloppée dans un `NormalCompletion`.

### Piste secondaire : `Return ? Foo()`

La spécification utilise la notation `Return ? Foo()` — pourquoi le point d'interrogation ?

`Return ? Foo()` se développe comme suit :

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Laissez `temp` être `Foo()`.
> 2. Si `temp` est une terminaison abrupte, retournez `temp`.
> 3. Définir `temp` comme `temp.[[Value]]`.
> 4. Retournez `NormalCompletion(temp)`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Ce qui est identique à `Return Foo()`; cela fonctionne de manière identique pour les terminaisons abruptes et normales.

`Return ? Foo()` est uniquement utilisé pour des raisons éditoriales, afin de rendre plus explicite que `Foo` renvoie un Completion Record.

## Assertions

Les assertions dans la spécification affirment des conditions invariantes des algorithmes. Elles sont ajoutées pour la clarté, mais n'ajoutent aucune exigence à l'implémentation — l'implémentation n'a pas besoin de les vérifier.

## Continuons

Les opérations abstraites délèguent à d'autres opérations abstraites (voir l'image ci-dessous), mais sur la base de ce blog, nous devrions être en mesure de comprendre ce qu'elles font. Nous rencontrerons des descripteurs de propriété, qui sont juste un autre type de spécification.

![Graphique d'appel fonctionnel à partir de `Object.prototype.hasOwnProperty`](/_img/understanding-ecmascript-part-1/call-graph.svg)

## Résumé

Nous avons parcouru une méthode simple — `Object.prototype.hasOwnProperty` — et les **opérations abstraites** qu'elle invoque. Nous nous sommes familiarisés avec les raccourcis `?` et `!` liés à la gestion des erreurs. Nous avons rencontré les **types de langage**, les **types de spécification**, les **slots internes**, et les **méthodes internes**.

## Liens utiles

[Comment lire la spécification ECMAScript](https://timothygu.me/es-howto/): un tutoriel qui couvre une grande partie du matériel abordé dans cet article, sous un angle légèrement différent.
