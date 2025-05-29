---
title: 'Comprendre la spécification ECMAScript, partie 2'
author: '[Marja Hölttä](https://twitter.com/marjakh), spectatrice spéculative des spécifications'
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
  - Comprendre ECMAScript
description: 'Tutoriel sur la lecture de la spécification ECMAScript, partie 2'
tweet: '1234550773629014016'
---

Continuons à pratiquer nos incroyables compétences de lecture des spécifications. Si vous n’avez pas jeté un œil au premier épisode, c’est le moment de le faire !

[Tous les épisodes](/blog/tags/understanding-ecmascript)

## Prêt pour la partie 2 ?

Une manière amusante de se familiariser avec la spécification est de commencer par une fonctionnalité JavaScript que nous connaissons, et de découvrir comment elle est spécifiée.

> Attention ! Cet épisode contient des algorithmes copiés-collés de la [spécification ECMAScript](https://tc39.es/ecma262/) en février 2020. Ils deviendront éventuellement obsolètes.

Nous savons que les propriétés sont recherchées dans la chaîne de prototypes : si un objet n’a pas la propriété que nous essayons de lire, nous remontons la chaîne de prototypes jusqu’à la trouver (ou jusqu’à atteindre un objet qui n’a plus de prototype).

Par exemple :

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## Où est défini le parcours de la chaîne de prototypes ?

Essayons de découvrir où ce comportement est défini. Une bonne entrée en matière est la liste des [Méthodes Interne d'Objet](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots).

Il y a à la fois `[[GetOwnProperty]]` et `[[Get]]` — nous sommes intéressés par la version qui ne se limite pas aux propriétés _propres_, donc nous choisirons `[[Get]]`.

Malheureusement, le [type de spécification des descripteurs de propriété](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) a également un champ appelé `[[Get]]`, donc en parcourant la spécification pour `[[Get]]`, nous devons soigneusement distinguer les deux usages indépendants.

<!--truncate-->
`[[Get]]` est une **méthode interne essentielle**. Les **objets ordinaires** implémentent le comportement par défaut pour les méthodes internes essentielles. Les **objets exotiques** peuvent définir leur propre méthode interne `[[Get]]` qui dévie du comportement par défaut. Dans ce post, nous nous concentrons sur les objets ordinaires.

L’implémentation par défaut pour `[[Get]]` délègue à `OrdinaryGet` :

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> Lorsque la méthode interne `[[Get]]` de `O` est appelée avec la clé de propriété `P` et la valeur de langage ECMAScript `Receiver`, les étapes suivantes sont effectuées :
>
> 1. Retourne `? OrdinaryGet(O, P, Receiver)`.

Nous verrons bientôt que `Receiver` est la valeur qui est utilisée comme **valeur this** lors de l’appel d’une fonction getter d’une propriété d’accès.

`OrdinaryGet` est défini comme ceci :

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> Lorsque l’opération abstraite `OrdinaryGet` est appelée avec l’Objet `O`, la clé de propriété `P`, et la valeur de langage ECMAScript `Receiver`, les étapes suivantes sont effectuées :
>
> 1. Affirmez : `IsPropertyKey(P)` est `true`.
> 1. Laissez `desc` être `? O.[[GetOwnProperty]](P)`.
> 1. Si `desc` est `undefined`, alors
>     1. Laissez `parent` être `? O.[[GetPrototypeOf]]()`.
>     1. Si `parent` est `null`, retournez `undefined`.
>     1. Retournez `? parent.[[Get]](P, Receiver)`.
> 1. Si `IsDataDescriptor(desc)` est `true`, retournez `desc.[[Value]]`.
> 1. Affirmez : `IsAccessorDescriptor(desc)` est `true`.
> 1. Laissez `getter` être `desc.[[Get]]`.
> 1. Si `getter` est `undefined`, retournez `undefined`.
> 1. Retournez `? Call(getter, Receiver)`.

Le parcours de la chaîne de prototypes est à l’intérieur de l’étape 3 : si nous ne trouvons pas la propriété comme une propriété propre, nous appelons la méthode `[[Get]]` du prototype qui délègue à `OrdinaryGet` encore une fois. Si nous ne trouvons toujours pas la propriété, nous appelons la méthode `[[Get]]` de son prototype, qui délègue à `OrdinaryGet` encore une fois, et ainsi de suite, jusqu’à ce que nous trouvions la propriété ou atteignions un objet sans prototype.

Regardons comment cet algorithme fonctionne lorsque nous accédons à `o2.foo`. Tout d’abord, nous invoquons `OrdinaryGet` avec `O` étant `o2` et `P` étant `"foo"`. `O.[[GetOwnProperty]]("foo")` retourne `undefined`, puisque `o2` n’a pas de propriété propre appelée `"foo"`, donc nous prenons la branche de l’étape 3. À l’étape 3.a, nous définissons `parent` au prototype de `o2` qui est `o1`. `parent` n’est pas `null`, donc nous ne retournons pas à l’étape 3.b. À l’étape 3.c, nous appelons la méthode `[[Get]]` du parent avec la clé de propriété `"foo"`, et retournons ce qu’elle retourne.

Le parent (`o1`) est un objet ordinaire, donc sa méthode `[[Get]]` invoque `OrdinaryGet` à nouveau, cette fois avec `O` étant `o1` et `P` étant `"foo"`. `o1` a une propriété propre appelée `"foo"`, donc à l’étape 2, `O.[[GetOwnProperty]]("foo")` retourne le Descripteur de Propriété associé et nous le stockons dans `desc`.

[Descripteur de propriété](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) est un type de spécification. Les descripteurs de propriété de données stockent la valeur de la propriété directement dans le champ `[[Value]]`. Les descripteurs de propriété d'accession stockent les fonctions d'accession dans les champs `[[Get]]` et/ou `[[Set]]`. Dans ce cas, le descripteur de propriété associé à `"foo"` est un descripteur de propriété de données.

Le descripteur de propriété de données que nous avons stocké dans `desc` à l'étape 2 n'est pas `undefined`, donc nous ne prenons pas la branche `if` à l'étape 3. Ensuite, nous exécutons l'étape 4. Le descripteur de propriété est un descripteur de propriété de données, donc nous retournons son champ `[[Value]]`, `99`, à l'étape 4, et nous avons terminé.

## Qu’est-ce que `Receiver` et d’où vient-il ?

Le paramètre `Receiver` est uniquement utilisé dans le cas des propriétés d'accession à l'étape 8. Il est passé comme **valeur this** lors de l'appel à la fonction getter d'une propriété d'accession.

`OrdinaryGet` passe le `Receiver` original à travers la récursion, inchangé (étape 3.c). Découvrons d'où vient le `Receiver` à l'origine !

En recherchant les endroits où `[[Get]]` est appelé, nous trouvons une opération abstraite `GetValue` qui opère sur les Références. Une Référence est un type de spécification, constitué d'une valeur de base, du nom référencé et d'un indicateur de référence stricte. Dans le cas de `o2.foo`, la valeur de base est l'objet `o2`, le nom référencé est la chaîne `"foo"`, et l'indicateur de référence stricte est `false`, car le code d'exemple est en mode non strict.

### Parenthèse : Pourquoi la Référence n'est-elle pas un Record ?

Parenthèse : la Référence n'est pas un Record, bien qu'elle semble pouvoir l'être. Elle contient trois composants, qui pourraient tout aussi bien être exprimés sous forme de trois champs nommés. La Référence n'est pas un Record uniquement pour des raisons historiques.

### Retour à `GetValue`

Voyons comment `GetValue` est défini :

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`.
> 1. Si `Type(V)` n'est pas `Reference`, retourner `V`.
> 1. Laisser `base` être `GetBase(V)`.
> 1. Si `IsUnresolvableReference(V)` est `true`, lancer une exception `ReferenceError`.
> 1. Si `IsPropertyReference(V)` est `true`, alors
>     1. Si `HasPrimitiveBase(V)` est `true`, alors
>         1. Affirmer : Dans ce cas, `base` ne sera jamais `undefined` ou `null`.
>         1. Définir `base` comme `! ToObject(base)`.
>     1. Retourner `? base.[[Get]](GetReferencedName(V), GetThisValue(V))`.
> 1. Sinon,
>     1. Affirmer : `base` est un Record d'environnement.
>     1. Retourner `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))`

La Référence dans notre exemple est `o2.foo`, qui est une référence de propriété. Nous prenons donc la branche 5. Nous ne prenons pas la branche en 5.a, puisque la base (`o2`) n'est pas [une valeur primitive](/blog/react-cliff#javascript-types) (un Nombre, une Chaîne, un Symbole, un BigInt, un Booléen, `undefined` ou `null`).

Puis, nous appelons `[[Get]]` à l'étape 5.b. Le `Receiver` que nous passons est `GetThisValue(V)`.

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. Affirmer : `IsPropertyReference(V)` est `true`.
> 1. Si `IsSuperReference(V)` est `true`, alors
>     1. Retourner la valeur du composant `thisValue` de la référence `V`.
> 1. Retourner `GetBase(V)`.

Pour `o2.foo`, nous ne prenons pas la branche à l'étape 2, car ce n'est pas une Référence Super (comme `super.foo`), mais nous prenons l'étape 3 et retournons la valeur de base de la Référence, qui est `o2`.

En rassemblant toutes les informations, nous découvrons que nous définissons le `Receiver` comme étant la base de la Référence originale, puis nous le maintenons inchangé pendant la traversée de la chaîne de prototypes. Enfin, si la propriété que nous trouvons est une propriété d'accession, nous utilisons le `Receiver` comme la **valeur this** lors de son appel.

En particulier, la **valeur this** à l'intérieur d'un getter désigne l'objet original d'où nous avons essayé d'obtenir la propriété, et non celui où nous avons trouvé la propriété lors de la traversée de la chaîne de prototypes.

Essayons cela !

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

Dans cet exemple, nous avons une propriété d'accession appelée `foo` et nous définissons un getter pour elle. Le getter retourne `this.x`.

Puis nous accédons à `o2.foo` - que retourne le getter ?

Nous avons découvert que lorsque nous appelons le getter, la **valeur this** est l'objet d'où nous avons initialement essayé d'obtenir la propriété, et non l'objet où nous l'avons trouvée. Dans ce cas, la **valeur this** est `o2`, et non `o1`. Nous pouvons le vérifier en regardant si le getter retourne `o2.x` ou `o1.x`, et en effet, il retourne `o2.x`.

Ça marche ! Nous avons été capables de prédire le comportement de ce bout de code en nous basant sur ce que nous avons lu dans les spécifications.

## Accéder aux propriétés — pourquoi cela invoque-t-il `[[Get]]` ?

Où les spécifications disent-elles que la méthode interne de l'Objet `[[Get]]` sera invoquée lorsque nous accédons à une propriété comme `o2.foo` ? Cela doit sûrement être défini quelque part. Ne me croyez pas sur parole !

Nous avons découvert que la méthode interne de l'Objet `[[Get]]` est appelée à partir de l'opération abstraite `GetValue` qui opère sur les Références. Mais où `GetValue` est-elle appelée ?

### Sémantiques d'exécution pour `MemberExpression`

Les règles de grammaire de la spécification définissent la syntaxe du langage. [Les sémantiques d'exécution](https://tc39.es/ecma262/#sec-runtime-semantics) définissent ce que signifient les constructions syntaxiques (comment les évaluer à l'exécution).

Si vous n'êtes pas familier avec les [grammaires hors-contexte](https://en.wikipedia.org/wiki/Context-free_grammar), c'est une bonne idée de les découvrir dès maintenant !

Nous examinerons de manière plus approfondie les règles de grammaire dans un épisode ultérieur, restons simples pour le moment ! En particulier, nous pouvons ignorer les indices (`Yield`, `Await`, etc.) dans les productions pour cet épisode.

Les productions suivantes décrivent à quoi ressemble une [`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression) :

```grammar
MemberExpression :
  PrimaryExpression
  MemberExpression [ Expression ]
  MemberExpression . IdentifierName
  MemberExpression TemplateLiteral
  SuperProperty
  MetaProperty
  new MemberExpression Arguments
```

Ici, nous avons 7 productions pour `MemberExpression`. Une `MemberExpression` peut être simplement une `PrimaryExpression`. Alternativement, une `MemberExpression` peut être construite à partir d'une autre `MemberExpression` et d'une `Expression` en les assemblant : `MemberExpression [ Expression ]`, par exemple `o2['foo']`. Ou cela peut être `MemberExpression . IdentifierName`, par exemple `o2.foo` — c'est la production pertinente pour notre exemple.

Les sémantiques d'exécution pour la production `MemberExpression : MemberExpression . IdentifierName` définissent l'ensemble des étapes à suivre pour l'évaluer :

:::ecmascript-algorithm
> **[Sémantiques d'exécution : Évaluation pour `MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)**
>
> 1. Que `baseReference` soit le résultat de l'évaluation de `MemberExpression`.
> 1. Que `baseValue` soit `? GetValue(baseReference)`.
> 1. Si le code correspondant à cette `MemberExpression` est du code en mode strict, que `strict` soit `true`; sinon `strict` est `false`.
> 1. Retourner `? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)`.

L'algorithme délègue à l'opération abstraite `EvaluatePropertyAccessWithIdentifierKey`, donc nous devons également la consulter :

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey( baseValue, identifierName, strict )`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> L'opération abstraite `EvaluatePropertyAccessWithIdentifierKey` prend en arguments une valeur `baseValue`, un nœud d'analyse `identifierName` et un argument booléen `strict`. Elle effectue les étapes suivantes :
>
> 1. Assurer : `identifierName` est un `IdentifierName`.
> 1. Que `bv` soit `? RequireObjectCoercible(baseValue)`.
> 1. Que `propertyNameString` soit la `StringValue` de `identifierName`.
> 1. Retourner une valeur de type Référence dont la composante de valeur de base est `bv`, dont la composante de nom référencé est `propertyNameString`, et dont le drapeau de référence stricte est `strict`.

C'est-à-dire : `EvaluatePropertyAccessWithIdentifierKey` construit une Référence qui utilise la `baseValue` fournie comme base, la valeur en chaîne de caractères de `identifierName` comme nom de propriété, et `strict` comme drapeau de mode strict.

Finalement, cette Référence est transmise à `GetValue`. Cela est défini à plusieurs endroits dans la spécification, en fonction de la manière dont la Référence est utilisée.

### `MemberExpression` comme paramètre

Dans notre exemple, nous utilisons l'accès à la propriété comme paramètre :

```js
console.log(o2.foo);
```

Dans ce cas, le comportement est défini dans les sémantiques d'exécution de la production `ArgumentList` qui appelle `GetValue` sur l'argument :

:::ecmascript-algorithm
> **[Sémantiques d'exécution : `ArgumentListEvaluation`](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)**
>
> `ArgumentList : AssignmentExpression`
>
> 1. Que `ref` soit le résultat de l'évaluation de `AssignmentExpression`.
> 1. Que `arg` soit `? GetValue(ref)`.
> 1. Retourner une Liste dont le seul élément est `arg`.

`o2.foo` ne ressemble pas à une `AssignmentExpression`, mais cela en est une, donc cette production s'applique. Pour savoir pourquoi, vous pouvez consulter ce [contenu supplémentaire](/blog/extras/understanding-ecmascript-part-2-extra), mais ce n'est pas strictement nécessaire pour l'instant.

L'`AssignmentExpression` à l'étape 1 est `o2.foo`. `ref`, le résultat de l'évaluation de `o2.foo`, est la Référence mentionnée ci-dessus. À l'étape 2, nous appelons `GetValue` dessus. Ainsi, nous savons que la méthode interne de l'Objet `[[Get]]` sera appelée, et la chaîne de prototypes sera parcourue.

## Résumé

Dans cet épisode, nous avons vu comment la spécification définit une fonctionnalité du langage, dans ce cas la recherche dans le prototype, à travers toutes les différentes couches : les constructions syntaxiques qui déclenchent la fonctionnalité et les algorithmes qui la définissent.
