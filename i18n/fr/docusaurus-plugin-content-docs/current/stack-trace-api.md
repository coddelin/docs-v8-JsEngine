---
title: "API de trace de pile"
description: 'Ce document décrit l'API de trace de pile JavaScript de V8.'
---
Toutes les erreurs internes levées dans V8 capturent une trace de pile lorsqu'elles sont créées. Cette trace de pile peut être accédée depuis JavaScript via la propriété non standard `error.stack`. V8 dispose également de divers crochets pour contrôler la manière dont les traces de pile sont collectées et formatées, et pour permettre aux erreurs personnalisées de capturer également des traces de pile. Ce document décrit l'API de trace de pile JavaScript de V8.

## Traces de pile basiques

Par défaut, presque toutes les erreurs levées par V8 ont une propriété `stack` qui contient les 10 cadres de pile les plus hauts, formatés sous forme de chaîne. Voici un exemple de trace de pile entièrement formatée :

```
ReferenceError: FAIL n'est pas défini
   at Constraint.execute (deltablue.js:525:2)
   at Constraint.recalculate (deltablue.js:424:21)
   at Planner.addPropagate (deltablue.js:701:6)
   at Constraint.satisfy (deltablue.js:184:15)
   at Planner.incrementalAdd (deltablue.js:591:21)
   at Constraint.addConstraint (deltablue.js:162:10)
   at Constraint.BinaryConstraint (deltablue.js:346:7)
   at Constraint.EqualityConstraint (deltablue.js:515:38)
   at chainTest (deltablue.js:807:6)
   at deltaBlue (deltablue.js:879:2)
```

La trace de pile est collectée lorsque l'erreur est créée et reste la même, peu importe où ou combien de fois l'erreur est levée. Nous collectons 10 cadres car cela est généralement suffisant pour être utile sans avoir un impact négatif significatif sur les performances. Vous pouvez contrôler le nombre de cadres de pile collectés en définissant la variable

```js
Error.stackTraceLimit
```

La définir à `0` désactive la collecte des traces de pile. Toute valeur entière finie peut être utilisée comme nombre maximum de cadres à collecter. La définir à `Infinity` signifie que tous les cadres sont collectés. Cette variable n'affecte que le contexte actuel ; elle doit être définie explicitement pour chaque contexte qui nécessite une valeur différente. (Notez que ce que l'on appelle un « contexte » dans la terminologie de V8 correspond à une page ou un `<iframe>` dans Google Chrome). Pour définir une valeur par défaut différente qui affecte tous les contextes, utilisez l'option de la ligne de commande de V8 suivante :

```bash
--stack-trace-limit <value>
```

Pour passer cette option à V8 lors de l'exécution de Google Chrome, utilisez :

```bash
--js-flags='--stack-trace-limit <value>'
```

## Traces de pile asynchrones

L'option `--async-stack-traces` (activée par défaut depuis [V8 v7.3](https://v8.dev/blog/v8-release-73#async-stack-traces)) active les nouvelles [traces de pile asynchrones sans coût](https://bit.ly/v8-zero-cost-async-stack-traces), qui enrichissent la propriété `stack` des instances `Error` avec des cadres de pile asynchrones, c'est-à-dire des emplacements `await` dans le code. Ces cadres asynchrones sont marqués avec `async` dans la chaîne `stack` :

```
ReferenceError: FAIL n'est pas défini
    at bar (<anonymous>)
    at async foo (<anonymous>)
```

Au moment de la rédaction, cette fonctionnalité se limite aux emplacements `await`, `Promise.all()` et `Promise.any()`, car dans ces cas, le moteur peut reconstruire les informations nécessaires sans frais supplémentaires (c'est pourquoi c'est sans coût).

## Collecte de traces de pile pour les exceptions personnalisées

Le mécanisme de trace de pile utilisé pour les erreurs intégrées est implémenté à l'aide d'une API générale de collecte de traces de pile qui est également disponible pour les scripts utilisateur. La fonction

```js
Error.captureStackTrace(error, constructorOpt)
```

ajoute une propriété stack à l'objet `error` donné qui fournit la trace de pile au moment où `captureStackTrace` a été appelé. Les traces de pile collectées via `Error.captureStackTrace` sont immédiatement collectées, formatées et attachées à l'objet `error` donné.

Le paramètre optionnel `constructorOpt` vous permet de passer une valeur de fonction. Lors de la collecte de la trace de pile, tous les cadres au-dessus du premier appel à cette fonction, y compris cet appel, sont laissés hors de la trace de pile. Cela peut être utile pour masquer les détails d'implémentation qui ne seront pas utiles à l'utilisateur. La façon habituelle de définir une erreur personnalisée qui capture une trace de pile serait :

```js
function MyError() {
  Error.captureStackTrace(this, MyError);
  // Toute autre initialisation se fait ici.
}
```

Passer MyError comme deuxième argument signifie que l'appel du constructeur à MyError ne s'affichera pas dans la trace de pile.

## Personnalisation des traces de pile

Contrairement à Java où la trace de pile d'une exception est une valeur structurée qui permet d'examiner l'état de la pile, la propriété stack dans V8 contient simplement une chaîne plate contenant la trace de pile formatée. Cela n'est dû à rien d'autre qu'à la compatibilité avec d'autres navigateurs. Cependant, cela n'est pas codé en dur, mais seulement le comportement par défaut et peut être remplacé par des scripts utilisateur.

Pour des raisons d'efficacité, les traces de pile ne sont pas formatées lorsqu'elles sont capturées mais à la demande, la première fois que la propriété stack est accédée. Une trace de pile est formatée en appelant

```js
Error.prepareStackTrace(error, structuredStackTrace)
```

et en utilisant ce que cette fonction retourne comme valeur de la propriété `stack`. Si vous assignez une autre valeur fonction à `Error.prepareStackTrace`, cette fonction est utilisée pour formater les traces de la pile. Elle reçoit l'objet erreur préparant une trace de pile, ainsi qu'une représentation structurée de la pile. Les formateurs de trace de pile utilisateur sont libres de formater la trace de pile comme bon leur semble et peuvent même retourner des valeurs non textuelles. Il est sûr de conserver des références à l'objet de trace de pile structuré après que l'appel à `prepareStackTrace` ait été complété, ce qui en fait également une valeur de retour valide. Notez que la fonction personnalisée `prepareStackTrace` n'est appelée que lorsque la propriété `stack` de l'objet `Error` est accédée.

La trace de pile structurée est un tableau d'objets `CallSite`, chacun représentant une trame de pile. Un objet `CallSite` définit les méthodes suivantes

- `getThis`: retourne la valeur de `this`
- `getTypeName`: retourne le type de `this` en tant que chaîne. Il s'agit du nom de la fonction stockée dans le champ constructeur de `this`, si disponible, sinon de la propriété interne `[[Class]]` de l'objet.
- `getFunction`: retourne la fonction actuelle
- `getFunctionName`: retourne le nom de la fonction actuelle, généralement sa propriété `name`. Si une propriété `name` n'est pas disponible, une tentative est faite pour en inférer un à partir du contexte de la fonction.
- `getMethodName`: retourne le nom de la propriété de `this` ou de l'un de ses prototypes qui détient la fonction actuelle
- `getFileName`: si cette fonction a été définie dans un script, retourne le nom du script
- `getLineNumber`: si cette fonction a été définie dans un script, retourne le numéro de ligne actuel
- `getColumnNumber`: si cette fonction a été définie dans un script, retourne le numéro de colonne actuel
- `getEvalOrigin`: si cette fonction a été créée en utilisant un appel à `eval`, retourne une chaîne représentant l'emplacement où `eval` a été appelé
- `isToplevel`: s'agit-il d'une invocation de niveau supérieur, c'est-à-dire l'objet global?
- `isEval`: cet appel se produit-il dans du code défini par un appel à `eval`?
- `isNative`: cet appel est-il dans du code natif V8?
- `isConstructor`: s'agit-il d'un appel de constructeur?
- `isAsync`: s'agit-il d'un appel asynchrone (c'est-à-dire `await`, `Promise.all()`, ou `Promise.any()`)?
- `isPromiseAll`: s'agit-il d'un appel asynchrone à `Promise.all()`?
- `getPromiseIndex`: retourne l'index de l'élément de promesse suivi dans `Promise.all()` ou `Promise.any()` pour les traces de pile asynchrones, ou `null` si le `CallSite` n'est pas un appel asynchrone `Promise.all()` ou `Promise.any()`.

La trace de pile par défaut est créée en utilisant l'API CallSite, donc toute information disponible ici est aussi accessible via cette API.

Pour maintenir les restrictions imposées aux fonctions en mode strict, les trames ayant une fonction en mode strict et toutes les trames en dessous (son appelant etc.) ne sont pas autorisées à accéder à leurs objets de réception et fonction. Pour ces trames, `getFunction()` et `getThis()` retourne `undefined`.

## Compatibilité

L'API décrite ici est spécifique à V8 et n'est pas supportée par d'autres mises en œuvre JavaScript. La plupart des implémentations fournissent une propriété `error.stack`, mais le format de la trace de pile est susceptible d'être différent de celui décrit ici. L'utilisation recommandée de cette API est la suivante :

- Ne comptez sur la mise en page de la trace de pile formatée que si vous savez que votre code s'exécute dans V8.
- Il est sûr de définir `Error.stackTraceLimit` et `Error.prepareStackTrace` quel que soit l'implémentation exécutant votre code, mais soyez conscient que cela n'a d'effet que si votre code s'exécute dans V8.

## Annexe : Format de trace de pile

Le format de trace de pile par défaut utilisé par V8 peut pour chaque trame fournir les informations suivantes :

- Si l'appel est un appel de construction.
- Le type de la valeur `this` (`Type`).
- Le nom de la fonction appelée (`functionName`).
- Le nom de la propriété de this ou de l'un de ses prototypes qui détient la fonction (`methodName`).
- L'emplacement actuel dans le code source (`location`)

Tout cela peut être indisponible et différents formats pour les trames de pile sont utilisés selon la quantité de ces informations disponibles. Si toutes les informations ci-dessus sont accessibles, une trame de pile formatée ressemble à ceci :

```
at Type.functionName [as methodName] (location)
```

Ou, dans le cas d'un appel de construction :

```
at new functionName (location)
```

Ou, en cas d'un appel asynchrone :

```
at async functionName (location)
```

Si seulement l'un de `functionName` et `methodName` est accessible, ou si les deux sont disponibles mais identiques, le format est :

```
at Type.name (location)
```

Si aucun des deux n'est accessible, `<anonymous>` est utilisé comme nom.

La valeur `Type` est le nom de la fonction stockée dans le champ constructeur de `this`. Dans V8, tous les appels de construction définissent cette propriété à la fonction constructeur, donc sauf si ce champ a été activement modifié après la création de l'objet, il contient le nom de la fonction par laquelle il a été créé. Si elle est indisponible, la propriété `[[Class]]` de l'objet est utilisée.

Un cas particulier est l'objet global où le `Type` n'est pas affiché. Dans ce cas, la trame de pile est formatée comme suit :

```
at functionName [as methodName] (location)
```

L'emplacement lui-même a plusieurs formats possibles. Le plus courant est le nom du fichier, le numéro de ligne et de colonne dans le script qui a défini la fonction actuelle :

```
fileName:lineNumber:columnNumber
```

Si la fonction actuelle a été créée en utilisant `eval`, le format est :

```
eval at position
```

...où `position` est la position complète où l'appel à `eval` a eu lieu. Notez que cela signifie que les positions peuvent être imbriquées s'il y a des appels imbriqués à `eval`, par exemple :

```
évaluation à Foo.a (évaluation à Bar.z (myscript.js:10:3))
```

Si une trame de pile se trouve dans les bibliothèques de V8, l'emplacement est :

```
natif
```

…et si elle est indisponible, c'est :

```
emplacement inconnu
```
