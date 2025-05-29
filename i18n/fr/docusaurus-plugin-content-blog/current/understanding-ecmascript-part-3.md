---
title: "Comprendre la spécification ECMAScript, partie 3"
author: "[Marja Hölttä](https://twitter.com/marjakh), observatrice spéculative de la spécification"
avatars:
  - marja-holtta
date: 2020-04-01
tags:
  - ECMAScript
  - Comprendre ECMAScript
description: "Tutoriel sur la lecture de la spécification ECMAScript"
tweet: "1245400717667577857"
---

[Tous les épisodes](/blog/tags/understanding-ecmascript)

Dans cet épisode, nous approfondirons la définition du langage ECMAScript et sa syntaxe. Si vous n'êtes pas familier avec les grammaires libres de contexte, c'est le bon moment pour vérifier les bases, car la spécification utilise des grammaires libres de contexte pour définir le langage. Consultez [le chapitre sur les grammaires libres de contexte dans "Crafting Interpreters"](https://craftinginterpreters.com/representing-code.html#context-free-grammars) pour une introduction accessible ou la [page Wikipédia](https://en.wikipedia.org/wiki/Context-free_grammar) pour une définition plus mathématique.

<!--truncate-->
## Grammaires ECMAScript

La spécification ECMAScript définit quatre grammaires :

La [grammaire lexicale](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar) décrit comment les [points de code Unicode](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology) sont traduits en une séquence d'**éléments d'entrée** (tokens, terminaux de ligne, commentaires, espaces blancs).

La [grammaire syntaxique](https://tc39.es/ecma262/#sec-syntactic-grammar) définit comment les programmes syntaxiquement corrects sont composés de tokens.

La [grammaire RegExp](https://tc39.es/ecma262/#sec-patterns) décrit comment les points de code Unicode sont traduits en expressions régulières.

La [grammaire des chaînes numériques](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type) décrit comment les chaînes de caractères sont traduites en valeurs numériques.

Chaque grammaire est définie comme une grammaire libre de contexte, composée d'un ensemble de productions.

Les grammaires utilisent une notation légèrement différente : la grammaire syntaxique utilise `LeftHandSideSymbol :` alors que la grammaire lexicale et la grammaire RegExp utilisent `LeftHandSideSymbol ::` et la grammaire des chaînes numériques utilise `LeftHandSideSymbol :::`.

Ensuite, nous examinerons plus en détail la grammaire lexicale et la grammaire syntaxique.

## Grammaire Lexicale

La spécification définit le texte source ECMAScript comme une séquence de points de code Unicode. Par exemple, les noms de variables ne sont pas limités aux caractères ASCII, mais peuvent également inclure d'autres caractères Unicode. La spécification ne parle pas de l'encodage réel (par exemple, UTF-8 ou UTF-16). Elle suppose que le code source a déjà été converti en une séquence de points de code Unicode selon l'encodage initial.

Il n'est pas possible de tokeniser le code source ECMAScript à l'avance, ce qui rend la définition de la grammaire lexicale légèrement plus complexe.

Par exemple, nous ne pouvons pas déterminer si `/` est l'opérateur de division ou le début d'une RegExp sans examiner le contexte élargi dans lequel il se trouve :

```js
const x = 10 / 5;
```

Ici `/` est un `DivPunctuator`.

```js
const r = /foo/;
```

Ici le premier `/` est le début d'un `RegularExpressionLiteral`.

Les modèles introduisent une ambiguïté similaire — l'interprétation de <code>}`</code> dépend du contexte dans lequel il se trouve :

```js
const what1 = 'temp';
const what2 = 'late';
const t = `Je suis un ${ what1 + what2 }`;
```

Ici <code>\`Je suis un $\{</code> est `TemplateHead` et <code>\}\`</code> est un `TemplateTail`.

```js
if (0 == 1) {
}`pas très utile`;
```

Ici `}` est un `RightBracePunctuator` et <code>\`</code> est le début d'un `NoSubstitutionTemplate`.

Même si l'interprétation de `/` et <code>}`</code> dépend de leur « contexte » — leur position dans la structure syntaxique du code — les grammaires que nous allons décrire ensuite restent libres de contexte.

La grammaire lexicale utilise plusieurs symboles objectifs pour distinguer les contextes où certains éléments d'entrée sont autorisés et d'autres ne le sont pas. Par exemple, le symbole objectif `InputElementDiv` est utilisé dans les contextes où `/` est une division et `/=` est une affectation-division. Les productions [`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv) listent les tokens possibles pouvant être produits dans ce contexte :

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Commentaire
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

Dans ce contexte, rencontrer `/` produit l'élément d'entrée `DivPunctuator`. Produire un `RegularExpressionLiteral` n'est pas une option ici.

D'un autre côté, [`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp) est le symbole objectif pour les contextes où `/` est le début d'une RegExp :

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Commentaire
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

Comme nous le voyons dans les productions, il est possible que cela produise l'élément d'entrée `RegularExpressionLiteral`, mais produire `DivPunctuator` n'est pas possible.

De même, il existe un autre symbole de but, `InputElementRegExpOrTemplateTail`, pour les contextes où `TemplateMiddle` et `TemplateTail` sont autorisés, en plus de `RegularExpressionLiteral`. Enfin, `InputElementTemplateTail` est le symbole de but pour les contextes où seuls `TemplateMiddle` et `TemplateTail` sont autorisés, mais où `RegularExpressionLiteral` n'est pas autorisé.

Dans les implémentations, l'analyseur de grammaire syntaxique (« parser ») peut appeler l'analyseur de grammaire lexicale (« tokenizer » ou « lexer »), en passant le symbole de but comme paramètre et en demandant le prochain élément d'entrée adapté à ce symbole de but.

## Grammaire syntaxique

Nous avons examiné la grammaire lexicale, qui définit comment nous construisons des tokens à partir de points de code Unicode. La grammaire syntaxique s'appuie sur celle-ci: elle définit comment des programmes syntaxiquement corrects sont composés de tokens.

### Exemple : Autoriser les identificateurs hérités

Introduire un nouveau mot-clé dans la grammaire est un changement potentiellement perturbateur — que se passe-t-il si un code existant utilise déjà ce mot-clé comme identificateur ?

Par exemple, avant que `await` ne soit un mot-clé, quelqu'un pourrait avoir écrit le code suivant :

```js
function old() {
  var await;
}
```

La grammaire ECMAScript a soigneusement ajouté le mot-clé `await` de manière à ce que ce code continue de fonctionner. À l'intérieur des fonctions asynchrones, `await` est un mot-clé, donc cela ne fonctionne pas :

```js
async function modern() {
  var await; // Erreur de syntaxe
}
```

Permettre `yield` comme identificateur dans les fonctions non génératrices et le désactiver dans les générateurs fonctionne de manière similaire.

Comprendre comment `await` est autorisé en tant qu'identificateur nécessite de comprendre la notation de grammaire syntaxique spécifique à ECMAScript. Plongeons directement dedans !

### Productions et raccourcis

Examinons comment les productions pour [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) sont définies. À première vue, la grammaire peut sembler un peu intimidante :

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

Que signifient les indices (`[Yield, Await]`) et les préfixes (`+` dans `+In` et `?` dans `?Async`) ?

La notation est expliquée dans la section [Grammar Notation](https://tc39.es/ecma262/#sec-grammar-notation).

Les indices sont un raccourci pour exprimer un ensemble de productions, pour un ensemble de symboles du côté gauche, tout en même temps. Le symbole du côté gauche a deux paramètres, ce qui s'étend en quatre symboles "réels" du côté gauche : `VariableStatement`, `VariableStatement_Yield`, `VariableStatement_Await`, et `VariableStatement_Yield_Await`.

Notez qu'ici le simple `VariableStatement` signifie « `VariableStatement` sans `_Await` et `_Yield` ». Il ne doit pas être confondu avec <code>VariableStatement<sub>[Yield, Await]</sub></code>.

Du côté droit de la production, nous voyons le raccourci `+In`, signifiant "utiliser la version avec `_In`", et `?Await`, signifiant « utiliser la version avec `_Await` uniquement si le symbole du côté gauche a `_Await` » (similairement avec `?Yield`).

Le troisième raccourci, `~Foo`, signifiant « utiliser la version sans `_Foo` », n'est pas utilisé dans cette production.

Avec cette information, nous pouvons étendre les productions comme ceci :

```grammar
VariableStatement :
  var VariableDeclarationList_In ;

VariableStatement_Yield :
  var VariableDeclarationList_In_Yield ;

VariableStatement_Await :
  var VariableDeclarationList_In_Await ;

VariableStatement_Yield_Await :
  var VariableDeclarationList_In_Yield_Await ;
```

En fin de compte, nous devons résoudre deux choses :

1. Où est-il décidé si nous sommes dans le cas avec `_Await` ou sans `_Await` ?
2. Où cela fait-il une différence — où les productions pour `Something_Await` et `Something` (sans `_Await`) divergent-elles ?

### `_Await` ou pas `_Await` ?

Abordons d'abord la question 1. Il est assez facile de deviner que les fonctions non asynchrones et les fonctions asynchrones diffèrent en fonction de notre choix du paramètre `_Await` pour le corps de la fonction. En lisant les productions des déclarations de fonctions asynchrones, nous trouvons [cela](https://tc39.es/ecma262/#prod-AsyncFunctionBody) :

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

Notez que `AsyncFunctionBody` n'a pas de paramètres — ils sont ajoutés au `FunctionBody` du côté droit.

Si nous étendons cette production, nous obtenons :

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

En d'autres termes, les fonctions asynchrones ont `FunctionBody_Await`, ce qui signifie un corps de fonction où `await` est traité comme un mot-clé.

D'autre part, si nous sommes dans une fonction non asynchrones, [la production pertinente](https://tc39.es/ecma262/#prod-FunctionDeclaration) est :

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

(`FunctionDeclaration` a une autre production, mais elle n'est pas pertinente pour notre exemple de code.)

Pour éviter une expansion combinatoire, ignorons le paramètre `Default` qui n'est pas utilisé dans cette production spécifique.

La forme étendue de la production est :

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

DéclarationFonction_Yield_Await :
  fonction IdentifiantLié_Yield_Await ( ParamètresFormels ) { CorpsFonction }
```

Dans cette production, nous obtenons toujours `CorpsFonction` et `ParamètresFormels` (sans `_Yield` et sans `_Await`), car ils sont paramétrés avec `[~Yield, ~Await]` dans la production non développée.

Le nom de la fonction est traité différemment : il reçoit les paramètres `_Await` et `_Yield` si le symbole du côté gauche les possède.

En résumé : Les fonctions asynchrones ont un `CorpsFonction_Attente` et les fonctions non asynchrones ont un `CorpsFonction` (sans `_Attente`). Puisqu'on parle de fonctions non génératrices, notre fonction exemple asynchrone et notre fonction exemple non asynchrone sont paramétrées sans `_Yield`.

Peut-être est-il difficile de se souvenir lequel est `CorpsFonction` et lequel est `CorpsFonction_Attente`. `CorpsFonction_Attente` est-il destiné à une fonction où `await` est un identifiant, ou à une fonction où `await` est un mot-clé ?

Vous pouvez penser au paramètre `_Await` comme signifiant "`await` est un mot-clé". Cette approche est également évolutive. Imaginez qu'un nouveau mot-clé, `blob`, soit ajouté, mais uniquement dans les fonctions "blobby". Les fonctions non blobby, non asynchrones, non génératrices auraient toujours `CorpsFonction` (sans `_Attente`, `_Yield` ou `_Blob`), exactement comme elles ont maintenant. Les fonctions blobby auraient un `CorpsFonction_Blob`, les fonctions blobby asynchrones auraient un `CorpsFonction_Attente_Blob`, et ainsi de suite. Nous aurions encore besoin d'ajouter l'indice `Blob` aux productions, mais les formes développées de `CorpsFonction` pour les fonctions existantes resteraient les mêmes.

### Interdiction de `await` en tant qu'identifiant

Ensuite, nous devons découvrir comment `await` est interdit en tant qu'identifiant si nous sommes dans un `CorpsFonction_Attente`.

Nous pouvons suivre les productions plus loin pour voir que le paramètre `_Await` est transmis sans changement depuis `CorpsFonction` jusqu'à la production `DéclarationVariable` que nous examinions précédemment.

Ainsi, dans une fonction asynchrone, nous aurons une `DéclarationVariable_Attente` et dans une fonction non asynchrone, nous aurons une `DéclarationVariable`.

Nous pouvons suivre les productions plus loin et suivre les paramètres. Nous avons déjà vu les productions pour [`DéclarationVariable`](https://tc39.es/ecma262/#prod-VariableStatement) :

```grammar
DéclarationVariable[Yield, Await] :
  var ListeDéclarationVariable[+In, ?Yield, ?Await] ;
```

Toutes les productions pour [`ListeDéclarationVariable`](https://tc39.es/ecma262/#prod-VariableDeclarationList) transmettent simplement les paramètres tels quels :

```grammar
ListeDéclarationVariable[In, Yield, Await] :
  DéclarationVariable[?In, ?Yield, ?Await]
```

(Ici nous montrons seulement la [production](https://tc39.es/ecma262/#prod-VariableDeclaration) pertinente à notre exemple.)

```grammar
DéclarationVariable[In, Yield, Await] :
  IdentifiantLié[?Yield, ?Await] Initialiseur[?In, ?Yield, ?Await] opt
```

Le raccourci `opt` signifie que le symbole du côté droit est facultatif ; il existe en fait deux productions, une avec le symbole facultatif et une sans.

Dans le cas simple pertinent pour notre exemple, `DéclarationVariable` se compose du mot-clé `var`, suivi d'un seul `IdentifiantLié` sans initialiseur, et se terminant par un point-virgule.

Pour interdire ou autoriser `await` en tant qu'`IdentifiantLié`, nous espérons aboutir à quelque chose comme ceci :

```grammar
IdentifiantLié_Attente :
  Identifiant
  yield

IdentifiantLié :
  Identifiant
  yield
  await
```

Cela interdirait `await` en tant qu'identifiant dans les fonctions asynchrones et l'autoriserait en tant qu'identifiant dans les fonctions non asynchrones.

Mais la spécification ne le définit pas ainsi, nous trouvons plutôt cette [production](https://tc39.es/ecma262/#prod-BindingIdentifier) :

```grammar
IdentifiantLié[Yield, Await] :
  Identifiant
  yield
  await
```

Développé, cela signifie les productions suivantes :

```grammar
IdentifiantLié_Attente :
  Identifiant
  yield
  await

IdentifiantLié :
  Identifiant
  yield
  await
```

(Nous omettons les productions pour `IdentifiantLié_Yield` et `IdentifiantLié_Yield_Await` qui ne sont pas nécessaires dans notre exemple.)

Cela ressemble à `await` et `yield` qui seraient toujours autorisés comme identifiants. Qu'en est-il de cela ? Est-ce que tout ce post est inutile ?

### Les sémantiques statiques à la rescousse

Il s'avère que **les sémantiques statiques** sont nécessaires pour interdire `await` en tant qu'identifiant dans les fonctions asynchrones.

Les sémantiques statiques décrivent les règles statiques — c'est-à-dire, les règles qui sont vérifiées avant l'exécution du programme.

Dans ce cas, les [sémantiques statiques pour `IdentifiantLié`](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors) définissent la règle dirigée par la syntaxe suivante :

> ```grammar
> IdentifiantLié[Yield, Await] : await
> ```
>
> C'est une Erreur Syntaxe si cette production a un paramètre <code><sub>[Await]</sub></code>.

En effet, cela interdit la production `IdentifiantLié_Attente : await`.

La spécification explique que la raison de cette production, mais la définissant comme une erreur de syntaxe par les sémantiques statiques, est en raison de l'interférence avec l'insertion automatique de point-virgule (ASI).

Rappelez-vous que l'ASI intervient lorsque nous ne pouvons pas analyser une ligne de code selon les productions grammaticales. L'ASI tente d'ajouter des points-virgules pour satisfaire l'exigence que les déclarations et les instructions doivent se terminer par un point-virgule. (Nous décrirons l'ASI plus en détail dans un épisode ultérieur.)

Considérons le code suivant (exemple tiré de la spécification) :

```js
async function trop_peu_de_points_virgules() {
  let
  await 0;
}
```

Si la grammaire interdisait `await` en tant qu'identifiant, l'ASI interviendrait et transformerait le code en le code grammaticalement correct suivant, qui utilise également `let` comme identifiant :

```js
async function trop_peu_de_points_virgules() {
  let;
  await 0;
}
```

Ce genre d'interférence avec l'ASI a été jugée trop confuse, alors des sémantiques statiques ont été utilisées pour interdire `await` en tant qu'identifiant.

### Les `StringValues` d'identifiants désautorisés

Il existe également une autre règle liée :

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> C'est une erreur de syntaxe si cette production a un paramètre <code><sub>[Await]</sub></code> et que la `StringValue` de `Identifier` est `"await"`.

Cela pourrait sembler déroutant au début. [`Identifier`](https://tc39.es/ecma262/#prod-Identifier) est défini comme suit :

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName mais pas ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await` est un `ReservedWord`, donc comment un `Identifier` peut-il jamais être `await` ?

Il s'avère que `Identifier` ne peut pas être `await`, mais il peut être autre chose dont la `StringValue` est `"await"` — une représentation différente de la séquence de caractères `await`.

[Les sémantiques statiques des noms d'identifiants](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue) définissent comment la `StringValue` d'un nom d'identifiant est calculée. Par exemple, la séquence d'échappement Unicode pour `a` est `\u0061`, donc `\u0061wait` a la `StringValue` `"await"`. `\u0061wait` ne sera pas reconnu comme mot-clé par la grammaire lexicale, il sera plutôt un `Identifier`. Les sémantiques statiques interdisent de l'utiliser comme nom de variable dans des fonctions async.

Ainsi, cela fonctionne :

```js
function ancien() {
  var \u0061wait;
}
```

Et ceci ne fonctionne pas :

```js
async function moderne() {
  var \u0061wait; // Erreur de syntaxe
}
```

## Résumé

Dans cet épisode, nous nous sommes familiarisés avec la grammaire lexicale, la grammaire syntaxique, et les raccourcis utilisés pour définir la grammaire syntaxique. En tant qu'exemple, nous avons examiné l'interdiction d'utiliser `await` en tant qu'identifiant dans des fonctions async tout en permettant son utilisation dans des fonctions non-async.

D'autres parties intéressantes de la grammaire syntaxique, telles que l'insertion automatique de point-virgule et les grammaires de couverture, seront abordées dans un épisode ultérieur. Restez à l'écoute !
