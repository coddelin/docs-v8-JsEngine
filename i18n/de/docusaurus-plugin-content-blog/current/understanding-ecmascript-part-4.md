---
title: "Verstehen der ECMAScript-Spezifikation, Teil 4"
author: "[Marja Hölttä](https://twitter.com/marjakh), spekulativer Spezifikationsbeobachter"
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - ECMAScript verstehen
description: "Anleitung zum Lesen der ECMAScript-Spezifikation"
tweet: "1262815621756014594"
---

[Alle Episoden](/blog/tags/understanding-ecmascript)

## Unterdessen in anderen Teilen des Webs

[Jason Orendorff](https://github.com/jorendorff) von Mozilla veröffentlichte [eine großartige tiefgehende Analyse von JS-syntaktischen Eigenheiten](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme). Auch wenn sich die Implementierungsdetails unterscheiden, sieht sich jede JS-Engine denselben Problemen mit diesen Eigenheiten gegenüber.

<!--truncate-->
## Deckgrammatiken

In dieser Episode werfen wir einen genaueren Blick auf *Deckgrammatiken*. Sie sind eine Methode, die Grammatik für syntaktische Konstrukte festzulegen, die zunächst mehrdeutig erscheinen.

Wir werden erneut die Indizes für `[In, Yield, Await]` der Kürze halber überspringen, da sie für diesen Blogbeitrag nicht wichtig sind. Sehen Sie [Teil 3](/blog/understanding-ecmascript-part-3) für eine Erklärung ihrer Bedeutung und Nutzung.

## Begrenzte Ausblicke

In der Regel entscheiden Parser, welche Produktion verwendet werden soll, basierend auf einem begrenzten Ausblick (eine feste Anzahl von nachfolgenden Token).

In einigen Fällen bestimmt das nächste Token unmissverständlich die zu verwendende Produktion. [Zum Beispiel](https://tc39.es/ecma262/#prod-UpdateExpression):

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

Wenn wir eine `UpdateExpression` analysieren und das nächste Token `++` oder `--` ist, wissen wir sofort, welche Produktion verwendet wird. Wenn das nächste Token keines von beiden ist, ist das auch nicht so schlimm: Wir können eine `LeftHandSideExpression` von der aktuellen Position aus analysieren und später entscheiden, was zu tun ist.

Wenn das Token nach der `LeftHandSideExpression` `++` ist, lautet die zu verwendende Produktion `UpdateExpression : LeftHandSideExpression ++`. Der Fall für `--` ist ähnlich. Und wenn das Token nach der `LeftHandSideExpression` weder `++` noch `--` ist, verwenden wir die Produktion `UpdateExpression : LeftHandSideExpression`.

### Parameterliste einer Pfeilfunktion oder eine geklammerte Ausdruck?

Die Unterscheidung zwischen Parameterlisten von Pfeilfunktionen und geklammerten Ausdrücken ist komplizierter.

Zum Beispiel:

```js
let x = (a,
```

Ist dies der Beginn einer Pfeilfunktion, wie diese?

```js
let x = (a, b) => { return a + b };
```

Oder vielleicht ein geklammerter Ausdruck, wie dieser?

```js
let x = (a, 3);
```

Das geklammerte Was-auch-immer kann beliebig lang sein – wir können nicht wissen, was es anhand einer begrenzten Menge von Token ist.

Stellen wir uns für einen Moment vor, wir hätten die folgenden einfachen Produktionen:

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

Jetzt können wir die zu verwendende Produktion mit einem begrenzten Ausblick nicht wählen. Wenn wir eine `AssignmentExpression` analysieren müssten und das nächste Token `(` wäre, wie würden wir entscheiden, was als nächstes analysiert werden soll? Wir könnten entweder eine `ArrowParameterList` oder einen `ParenthesizedExpression` analysieren, aber unsere Vermutung könnte falsch sein.

### Das sehr permissive neue Symbol: `CPEAAPL`

Die Spezifikation löst dieses Problem, indem sie das Symbol `CoverParenthesizedExpressionAndArrowParameterList` (`CPEAAPL` für kurz) einführt. `CPEAAPL` ist ein Symbol, das eigentlich ein `ParenthesizedExpression` oder eine `ArrowParameterList` im Hintergrund ist, aber wir wissen noch nicht, welches davon.

Die [Produktionen](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList) von `CPEAAPL` sind sehr permissiv und erlauben alle Konstrukte, die in `ParenthesizedExpression`s und in `ArrowParameterList`s vorkommen können:

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

Zum Beispiel sind die folgenden Ausdrücke gültige `CPEAAPL`s:

```js
// Gültige ParenthesizedExpression und ArrowParameterList:
(a, b)
(a, b = 1)

// Gültige ParenthesizedExpression:
(1, 2, 3)
(function foo() { })

// Gültige ArrowParameterList:
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// Das ist zwar nicht gültig, aber immer noch ein CPEAAPL:
(1, ...b)
(1, )
```

Das Abschlusskomma und `...` können nur in `ArrowParameterList` vorkommen. Einige Konstrukte, wie `b = 1`, können in beiden vorkommen, aber sie haben unterschiedliche Bedeutungen: Innerhalb von `ParenthesizedExpression` ist es eine Zuweisung, innerhalb von `ArrowParameterList` ist es ein Parameter mit einem Standardwert. Zahlen und andere `PrimaryExpressions`, die keine gültigen Parameternamen (oder Muster für Parameterverschachtelung) sind, können nur innerhalb von `ParenthesizedExpression` vorkommen. Aber sie alle können innerhalb eines `CPEAAPL` auftreten.

### Nutzung von `CPEAAPL` in Produktionen

Nun können wir den sehr permissiven `CPEAAPL` in [`AssignmentExpression`-Produktionen](https://tc39.es/ecma262/#prod-AssignmentExpression) verwenden. (Hinweis: `ConditionalExpression` führt über eine lange Produktionskette zu `PrimaryExpression`, die hier nicht gezeigt wird.)

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

Angenommen, wir befinden uns wieder in der Situation, dass wir ein `AssignmentExpression` parsen müssen und das nächste Token `(` ist. Jetzt können wir ein `CPEAAPL` parsen und später herausfinden, welche Produktion zu verwenden ist. Es spielt keine Rolle, ob wir ein `ArrowFunction` oder ein `ConditionalExpression` parsen, das nächste zu parsende Symbol ist in jedem Fall `CPEAAPL`!

Nachdem wir das `CPEAAPL` geparst haben, können wir entscheiden, welche Produktion für das ursprüngliche `AssignmentExpression` (dasjenige, das das `CPEAAPL` enthält) verwendet werden soll. Diese Entscheidung basiert auf dem Token, das dem `CPEAAPL` folgt.

Wenn das Token `=>` ist, verwenden wir die Produktion:

```grammar
AssignmentExpression :
  ArrowFunction
```

Wenn das Token etwas anderes ist, verwenden wir die Produktion:

```grammar
AssignmentExpression :
  ConditionalExpression
```

Zum Beispiel:

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             Das Token, das dem CPEAAPL folgt

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            Das Token, das dem CPEAAPL folgt
```

An dieser Stelle können wir das `CPEAAPL` unverändert lassen und mit dem Parsen des restlichen Programms fortfahren. Wenn das `CPEAAPL` beispielsweise innerhalb einer `ArrowFunction` ist, müssen wir noch nicht prüfen, ob es eine gültige Parameterliste für die Pfeilfunktion ist - das kann später erfolgen. (Parser in der realen Welt könnten sich entscheiden, die Gültigkeitsprüfung sofort durchzuführen, aber aus der Sicht der Spezifikation ist dies nicht erforderlich.)

### Einschränkung von CPEAAPLs

Wie wir zuvor gesehen haben, sind die Grammatikproduktionen für `CPEAAPL` sehr permissiv und erlauben Konstruktionen (wie `(1, ...a)`), die niemals gültig sind. Nachdem wir das Programm gemäß der Grammatik geparst haben, müssen wir die entsprechenden illegalen Konstruktionen disallowieren.

Die Spezifikation tut dies, indem sie die folgenden Einschränkungen hinzufügt:

:::ecmascript-algorithm
> [Static Semantics: Early Errors](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> Es ist ein Syntaxfehler, wenn `CPEAAPL` keine `ParenthesizedExpression` abdeckt.

:::ecmascript-algorithm
> [Supplemental Syntax](https://tc39.es/ecma262/#sec-primary-expression)
>
> Beim Verarbeiten einer Instanz der Produktion
>
> `PrimaryExpression : CPEAAPL`
>
> wird die Interpretation des `CPEAAPL` mithilfe der folgenden Grammatik verfeinert:
>
> `ParenthesizedExpression : ( Expression )`

Das bedeutet: Wenn ein `CPEAAPL` an der Stelle von `PrimaryExpression` im Syntaxbaum vorkommt, ist es tatsächlich eine `ParenthesizedExpression` und dies ist ihre einzige gültige Produktion.

`Expression` kann niemals leer sein, daher ist `( )` keine gültige `ParenthesizedExpression`. Durch Komma getrennte Listen wie `(1, 2, 3)` werden vom [Komma-Operator](https://tc39.es/ecma262/#sec-comma-operator) erstellt:

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

Ebenso gelten die folgenden Einschränkungen, wenn ein `CPEAAPL` an der Stelle von `ArrowParameters` vorkommt:

:::ecmascript-algorithm
> [Static Semantics: Early Errors](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> Es ist ein Syntaxfehler, wenn `CPEAAPL` keine `ArrowFormalParameters` abdeckt.

:::ecmascript-algorithm
> [Supplemental Syntax](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> Wenn die Produktion
>
> `ArrowParameters : CPEAAPL`
>
> erkannt wird, wird die folgende Grammatik verwendet, um die Interpretation von `CPEAAPL` zu verfeinern:
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### Andere Cover-Grammatiken

Zusätzlich zu `CPEAAPL` verwendet die Spezifikation Cover-Grammatiken für andere mehrdeutige Konstruktionen.

`ObjectLiteral` wird als Cover-Grammatik für `ObjectAssignmentPattern` verwendet, das innerhalb der Parameterlisten von Pfeilfunktionen vorkommt. Das bedeutet, dass `ObjectLiteral` Konstruktionen erlaubt, die in tatsächlichen Objektliteralen nicht vorkommen können.

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

Zum Beispiel:

```js
let o = { a = 1 }; // Syntaxfehler

// Pfeilfunktion mit einem Destrukturierungsparameter mit einem Standardwert:
// Wert:
let f = ({ a = 1 }) => { return a; };
f({}); // gibt 1 zurück
f({a : 6}); // gibt 6 zurück
```

Asynchrone Pfeilfunktionen sehen auch mit einem begrenzten Lookahead mehrdeutig aus:

```js
let x = async(a,
```

Ist dies ein Aufruf einer Funktion namens `async` oder eine asynchrone Pfeilfunktion?

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

Zu diesem Zweck definiert die Grammatik ein Cover-Grammatik-Symbol `CoverCallExpressionAndAsyncArrowHead`, das ähnlich wie `CPEAAPL` funktioniert.

## Zusammenfassung

In dieser Episode haben wir untersucht, wie die Spezifikation Cover-Grammatiken definiert und diese in Fällen verwendet, in denen wir das aktuelle syntaktische Konstrukt anhand eines begrenzten Vorausblicks nicht identifizieren können.

Insbesondere haben wir betrachtet, wie man Parameterlisten von Pfeilfunktionen von geklammerten Ausdrücken unterscheidet und wie die Spezifikation eine Cover-Grammatik verwendet, um zunächst mehrdeutig erscheinende Konstrukte permissiv zu analysieren und sie anschließend mit statischen semantischen Regeln einzuschränken.
