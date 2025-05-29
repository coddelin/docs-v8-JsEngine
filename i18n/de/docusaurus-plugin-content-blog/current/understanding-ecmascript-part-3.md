---
title: &apos;Das ECMAScript-Spezifikation verstehen, Teil 3&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh), spekulative Spezifikationsbeobachterin&apos;
avatars:
  - marja-holtta
date: 2020-04-01
tags:
  - ECMAScript
  - ECMAScript verstehen
description: &apos;Tutorial zum Lesen der ECMAScript-Spezifikation&apos;
tweet: &apos;1245400717667577857&apos;
---

[Alle Episoden](/blog/tags/understanding-ecmascript)

In dieser Episode vertiefen wir uns in die Definition der ECMAScript-Sprache und ihrer Syntax. Falls Sie mit kontextfreien Grammatiken nicht vertraut sind, ist jetzt ein guter Zeitpunkt, die Grundlagen zu überprüfen, da die Spezifikation kontextfreie Grammatiken zur Definition der Sprache verwendet. Sehen Sie [das Kapitel über kontextfreie Grammatiken in "Crafting Interpreters"](https://craftinginterpreters.com/representing-code.html#context-free-grammars) für eine zugängliche Einführung oder die [Wikipedia-Seite](https://en.wikipedia.org/wiki/Context-free_grammar) für eine mathematischere Definition.

<!--truncate-->
## ECMAScript-Grammatiken

Die ECMAScript-Spezifikation definiert vier Grammatiken:

Die [lexikalische Grammatik](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar) beschreibt, wie [Unicode-Codepunkte](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology) in eine Sequenz von **Eingabeelementen** (Tokens, Zeilenenden, Kommentare, Leerzeichen) übersetzt werden.

Die [syntaktische Grammatik](https://tc39.es/ecma262/#sec-syntactic-grammar) definiert, wie syntaktisch korrekte Programme aus Tokens zusammengesetzt sind.

Die [RegExp-Grammatik](https://tc39.es/ecma262/#sec-patterns) beschreibt, wie Unicode-Codepunkte in reguläre Ausdrücke übersetzt werden.

Die [numerische Zeichenketten-Grammatik](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type) beschreibt, wie Zeichenketten in numerische Werte übersetzt werden.

Jede Grammatik wird als kontextfreie Grammatik definiert, bestehend aus einer Reihe von Produktionsregeln.

Die Grammatiken verwenden leicht unterschiedliche Notationen: Die syntaktische Grammatik verwendet `LeftHandSideSymbol :`, während die lexikalische Grammatik und die RegExp-Grammatik `LeftHandSideSymbol ::` und die numerische Zeichenketten-Grammatik `LeftHandSideSymbol :::` verwenden.

Als nächstes betrachten wir die lexikalische Grammatik und die syntaktische Grammatik genauer.

## Lexikalische Grammatik

Die Spezifikation definiert ECMAScript-Quelltext als eine Sequenz von Unicode-Codepunkten. Zum Beispiel sind Variablennamen nicht auf ASCII-Zeichen beschränkt, sondern können auch andere Unicode-Zeichen enthalten. Die Spezifikation spricht nicht über die eigentliche Kodierung (z. B. UTF-8 oder UTF-16). Es wird angenommen, dass der Quellcode bereits in eine Sequenz von Unicode-Codepunkten umgewandelt wurde, entsprechend der Kodierung, in der er vorlag.

Es ist nicht möglich, ECMAScript-Quellcode im Voraus zu tokenisieren, was die Definition der lexikalischen Grammatik etwas komplizierter macht.

Zum Beispiel können wir nicht feststellen, ob `/` der Divisionsoperator oder der Anfang eines RegExps ist, ohne den größeren Kontext zu betrachten, in dem es auftritt:

```js
const x = 10 / 5;
```

Hier ist `/` ein `DivPunctuator`.

```js
const r = /foo/;
```

Hier ist das erste `/` der Anfang eines `RegularExpressionLiteral`.

Templates führen eine ähnliche Mehrdeutigkeit ein — die Interpretation von <code>}`</code> hängt vom Kontext ab, in dem es auftritt:

```js
const what1 = &apos;temp&apos;;
const what2 = &apos;late&apos;;
const t = `I am a ${ what1 + what2 }`;
```

Hier ist <code>\`I am a $\{</code> ein `TemplateHead` und <code>\}\`</code> ein `TemplateTail`.

```js
if (0 == 1) {
}`not very useful`;
```

Hier ist `}` ein `RightBracePunctuator` und <code>\`</code> der Anfang eines `NoSubstitutionTemplate`.

Auch wenn die Interpretation von `/` und <code>}`</code> von ihrem „Kontext“ — ihrer Position in der syntaktischen Struktur des Codes — abhängt, sind die Grammatiken, die wir als Nächstes beschreiben, dennoch kontextfrei.

Die lexikalische Grammatik verwendet mehrere Zielsymbole, um zwischen den Kontexten zu unterscheiden, in denen einige Eingabeelemente erlaubt sind und andere nicht. Zum Beispiel wird das Zielsymbol `InputElementDiv` in Kontexten verwendet, in denen `/` eine Division und `/=` eine Divisionszuweisung ist. Die [`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv)-Produktionsregeln listen die möglichen Tokens auf, die in diesem Kontext erzeugt werden können:

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

In diesem Kontext führt das Auftreten von `/` zum Eingabeelement `DivPunctuator`. Hier ist es nicht möglich, ein `RegularExpressionLiteral` zu erzeugen.

Andererseits ist [`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp) das Zielsymbol für die Kontexte, in denen `/` der Anfang eines RegExps ist:

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

Wie wir aus den Produktionen sehen, kann dies das Eingabeelement `RegularExpressionLiteral` erzeugen, aber das Erzeugen eines `DivPunctuator` ist hier nicht möglich.

Ähnlich gibt es ein weiteres Zielsymbol, `InputElementRegExpOrTemplateTail`, für Kontexte, in denen `TemplateMiddle` und `TemplateTail` zusätzlich zu `RegularExpressionLiteral` erlaubt sind. Schließlich ist `InputElementTemplateTail` das Zielsymbol für Kontexte, in denen nur `TemplateMiddle` und `TemplateTail` erlaubt sind, aber `RegularExpressionLiteral` nicht erlaubt ist.

In Implementierungen kann der syntaktische Grammatikanalysator („Parser“) den lexikalischen Grammatikanalysator („Tokenizer“ oder „Lexer“) aufrufen, das Zielsymbol als Parameter übergeben und nach dem nächsten Eingabeelement fragen, das für dieses Zielsymbol geeignet ist.

## Syntaktische Grammatik

Wir haben die lexikalische Grammatik untersucht, die definiert, wie wir Token aus Unicode-Codepunkten konstruieren. Die syntaktische Grammatik baut darauf auf: Sie definiert, wie syntaktisch korrekte Programme aus Token zusammengesetzt sind.

### Beispiel: Zulassen von Legacy-Bezeichnern

Das Einführen eines neuen Schlüsselworts in die Grammatik ist möglicherweise eine Änderung, die zu Kompatibilitätsproblemen führen kann — was passiert, wenn bestehender Code das Schlüsselwort bereits als Bezeichner verwendet?

Zum Beispiel könnte jemand, bevor `await` ein Schlüsselwort war, den folgenden Code geschrieben haben:

```js
function old() {
  var await;
}
```

Die ECMAScript-Grammatik hat das Schlüsselwort `await` so vorsichtig hinzugefügt, dass dieser Code weiterhin funktioniert. Innerhalb von asynchronen Funktionen ist `await` ein Schlüsselwort, sodass dies nicht funktioniert:

```js
async function modern() {
  var await; // Syntaxfehler
}
```

Das Zulassen von `yield` als Bezeichner in Nicht-Generatoren und das Verbot in Generatoren funktioniert ähnlich.

Das Verständnis, wie `await` als Bezeichner erlaubt ist, erfordert das Verständnis der ECMAScript-spezifischen syntaktischen Grammatiknotation. Tauchen wir direkt ein!

### Produktionen und Kurzschreibweise

Schauen wir uns an, wie die Produktionen für [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) definiert sind. Auf den ersten Blick kann die Grammatik etwas einschüchternd wirken:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

Was bedeuten die Indizes (`[Yield, Await]`) und Präfixe (`+` in `+In` und `?` in `?Async`)?

Die Notation wird im Abschnitt [Grammar Notation](https://tc39.es/ecma262/#sec-grammar-notation) erklärt.

Die Indizes sind eine Kurzschreibweise, um eine Gruppe von Produktionen, für eine Gruppe von linken Symbolen, gleichzeitig auszudrücken. Das linke Symbol hat zwei Parameter, die sich in vier „echte“ linke Symbole erweitern: `VariableStatement`, `VariableStatement_Yield`, `VariableStatement_Await` und `VariableStatement_Yield_Await`.

Beachten Sie, dass hier das einfache `VariableStatement` „`VariableStatement` ohne `_Await` und `_Yield`“ bedeutet. Es sollte nicht mit <code>VariableStatement<sub>[Yield, Await]</sub></code> verwechselt werden.

Auf der rechten Seite der Produktion sehen wir die Kurzschreibweise `+In`, was bedeutet „verwende die Version mit `_In`“, und `?Await`, was bedeutet „verwende die Version mit `_Await`, wenn und nur wenn das linke Symbol `_Await` hat“ (ähnlich mit `?Yield`).

Die dritte Kurzschreibweise, `~Foo`, was bedeutet „verwende die Version ohne `_Foo`“, wird in dieser Produktion nicht verwendet.

Mit diesen Informationen können wir die Produktionen wie folgt erweitern:

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

Letztendlich müssen wir zwei Dinge herausfinden:

1. Wo wird entschieden, ob wir uns im Fall mit `_Await` oder ohne `_Await` befinden?
2. Wo macht es einen Unterschied — wo unterscheiden sich die Produktionen für `Something_Await` und `Something` (ohne `_Await`)?

### `_Await` oder kein `_Await`?

Lassen Sie uns zuerst Frage 1 angehen. Es ist einigermaßen leicht zu erraten, dass Nicht-Async-Funktionen und Async-Funktionen sich darin unterscheiden, ob wir den Parameter `_Await` für den Funktionskörper wählen oder nicht. Wenn wir die Produktionen für asynchrone Funktionsdeklarationen lesen, finden wir [dieses](https://tc39.es/ecma262/#prod-AsyncFunctionBody):

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

Beachten Sie, dass `AsyncFunctionBody` keine Parameter hat — diese werden dem `FunctionBody` auf der rechten Seite hinzugefügt.

Wenn wir diese Produktion erweitern, erhalten wir:

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

Mit anderen Worten haben asynchrone Funktionen `FunctionBody_Await`, was bedeutet, dass der Funktionskörper `await` als Schlüsselwort behandelt.

Andererseits, wenn wir uns innerhalb einer Nicht-Async-Funktion befinden, ist [die relevante Produktion](https://tc39.es/ecma262/#prod-FunctionDeclaration):

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

(`FunctionDeclaration` hat eine weitere Produktion, aber diese ist für unser Beispiel nicht relevant.)

Um eine kombinatorische Erweiterung zu vermeiden, lassen Sie uns den Parameter `Default` ignorieren, der in dieser speziellen Produktion nicht verwendet wird.

Die erweiterte Form der Produktion lautet:

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield_Await :
  function BindingIdentifier_Yield_Await ( FormalParameters ) { FunctionBody }
```

In dieser Produktion erhalten wir immer `FunctionBody` und `FormalParameters` (ohne `_Yield` und ohne `_Await`), da sie mit `[~Yield, ~Await]` in der nicht erweiterten Produktion parametriert sind.

Der Funktionsname wird unterschiedlich behandelt: Er erhält die Parameter `_Await` und `_Yield`, wenn das Symbol auf der linken Seite diese hat.

Zusammenfassend: Asynchrone Funktionen haben einen `FunctionBody_Await` und nicht asynchrone Funktionen haben einen `FunctionBody` (ohne `_Await`). Da wir über nicht-generative Funktionen sprechen, sind sowohl unsere asynchrone Beispiel-Funktion als auch unsere nicht asynchrone Beispiel-Funktion ohne `_Yield` parametriert.

Vielleicht ist es schwierig, sich zu merken, welcher `FunctionBody` und welcher `FunctionBody_Await` ist. Ist `FunctionBody_Await` für eine Funktion, bei der `await` ein Bezeichner ist, oder für eine Funktion, bei der `await` ein Schlüsselwort ist?

Man kann den `_Await`-Parameter so denken, dass er "`await` ist ein Schlüsselwort" bedeutet. Dieser Ansatz ist auch zukunftssicher. Stellen Sie sich ein neues Schlüsselwort, `blob`, vor, das hinzugefügt wird, aber nur innerhalb von "blob-artigen" Funktionen. Nicht blob-artige, nicht asynchrone, nicht generatorartige Funktionen hätten noch `FunctionBody` (ohne `_Await`, `_Yield` oder `_Blob`), genau wie jetzt. Blob-artige Funktionen hätten `FunctionBody_Blob`, asynchrone blob-artige Funktionen hätten `FunctionBody_Await_Blob` und so weiter. Wir müssten noch `Blob` zu den Produktionen hinzufügen, aber die erweiterten Formen von `FunctionBody` für bereits existierende Funktionen bleiben gleich.

### `await` als Bezeichner verbieten

Als Nächstes müssen wir herausfinden, wie `await` als Bezeichner ausgeschlossen wird, wenn wir uns innerhalb eines `FunctionBody_Await` befinden.

Wir können die Produktionen weiter verfolgen, um zu sehen, dass der `_Await`-Parameter unverändert von `FunctionBody` bis zur `VariableStatement`-Produktion weitergegeben wird, die wir zuvor untersucht haben.

Folglich haben wir innerhalb einer asynchronen Funktion eine `VariableStatement_Await` und innerhalb einer nicht asynchronen Funktion eine `VariableStatement`.

Wir können die Produktionen weiter verfolgen und die Parameter im Auge behalten. Wir haben bereits die Produktionen für [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) gesehen:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

Alle Produktionen für [`VariableDeclarationList`](https://tc39.es/ecma262/#prod-VariableDeclarationList) geben die Parameter einfach so weiter:

```grammar
VariableDeclarationList[In, Yield, Await] :
  VariableDeclaration[?In, ?Yield, ?Await]
```

(Hier zeigen wir nur die [Produktion](https://tc39.es/ecma262/#prod-VariableDeclaration), die für unser Beispiel relevant ist.)

```grammar
VariableDeclaration[In, Yield, Await] :
  BindingIdentifier[?Yield, ?Await] Initializer[?In, ?Yield, ?Await] opt
```

Die `opt`-Kurzschrift bedeutet, dass das rechte Symbol optional ist; es gibt tatsächlich zwei Produktionen, eine mit dem optionalen Symbol und eine ohne.

Im einfachen Fall, der für unser Beispiel relevant ist, besteht `VariableStatement` aus dem Schlüsselwort `var`, gefolgt von einem einzelnen `BindingIdentifier` ohne Initialisierer und endet mit einem Semikolon.

Um `await` als `BindingIdentifier` zu erlauben oder zu verbieten, hoffen wir auf etwas wie dies:

```grammar
BindingIdentifier_Await :
  Identifier
  yield

BindingIdentifier :
  Identifier
  yield
  await
```

Dies würde `await` als einen Bezeichner innerhalb asynchroner Funktionen verbieten und es innerhalb nicht asynchroner Funktionen erlauben.

Aber die Spezifikation definiert es nicht so; stattdessen finden wir diese [Produktion](https://tc39.es/ecma262/#prod-BindingIdentifier):

```grammar
BindingIdentifier[Yield, Await] :
  Identifier
  yield
  await
```

Expansion bedeutet folgendes Produktionen:

```grammar
BindingIdentifier_Await :
  Identifier
  yield
  await

BindingIdentifier :
  Identifier
  yield
  await
```

(Wir lassen die Produktionen für `BindingIdentifier_Yield` und `BindingIdentifier_Yield_Await` weg, die in unserem Beispiel nicht benötigt werden.)

Dies sieht so aus, als ob `await` und `yield` immer als Bezeichner erlaubt wären. Was ist los damit? Ist der ganze Blogpost umsonst?

### Statische Semantik zur Rettung

Es stellt sich heraus, dass **statische Semantik** benötigt werden, um `await` als Bezeichner innerhalb asynchroner Funktionen zu verbieten.

Statische Semantik beschreiben statische Regeln – das sind Regeln, die vor dem Lauf des Programms geprüft werden.

In diesem Fall definieren die [statische Semantik für `BindingIdentifier`](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors) die folgende syntaxgesteuerte Regel:

> ```grammar
> BindingIdentifier[Yield, Await] : await
> ```
>
> Es ist ein Syntaxfehler, wenn diese Produktion einen <code><sub>[Await]</sub></code>-Parameter hat.

Effektiv verbietet dies die `BindingIdentifier_Await : await` Produktion.

Die Spezifikation erklärt, dass der Grund für diese Produktion, die jedoch durch die statischen Semantiken als Syntaxfehler definiert wird, in der Interferenz mit der automatischen Semikolon-Einfügung (ASI) liegt.

Denken Sie daran, dass ASI einsetzt, wenn wir eine Codezeile anhand der Grammatikproduktionen nicht analysieren können. ASI versucht, Semikola hinzuzufügen, um die Anforderung zu erfüllen, dass Anweisungen und Deklarationen mit einem Semikolon enden müssen. (Wir werden ASI in einer späteren Episode ausführlicher beschreiben.)

Betrachten Sie den folgenden Code (Beispiel aus der Spezifikation):

```js
async function too_few_semicolons() {
  let
  await 0;
}
```

Wenn die Grammatik `await` als Bezeichner verbieten würde, würde ASI eingreifen und den Code in den folgenden grammatikalisch korrekten Code umwandeln, der auch `let` als Bezeichner verwendet:

```js
async function too_few_semicolons() {
  let;
  await 0;
}
```

Diese Art der Interferenz mit ASI wurde als zu verwirrend empfunden, daher wurden statische Semantiken verwendet, um `await` als Bezeichner zu verbieten.

### Verbotene `StringValues` von Bezeichnern

Es gibt auch eine andere verwandte Regel:

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> Es ist ein Syntaxfehler, wenn diese Produktion einen <code><sub>[Await]</sub></code>-Parameter hat und der `StringValue` des `Identifier` `"await"` ist.

Dies könnte anfangs verwirrend sein. [`Identifier`](https://tc39.es/ecma262/#prod-Identifier) ist wie folgt definiert:

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName aber nicht ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await` ist ein `ReservedWord`, wie kann ein `Identifier` jemals `await` sein?

Wie sich herausstellt, kann ein `Identifier` nicht `await` sein, aber es kann etwas anderes sein, dessen `StringValue` `"await"` ist — eine andere Darstellung der Zeichenfolge `await`.

[Statische Semantiken für Bezeichnernamen](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue) definieren, wie der `StringValue` eines Bezeichnernamens berechnet wird. Zum Beispiel ist die Unicode-Escape-Sequenz für `a` `\u0061`, daher hat `\u0061wait` den `StringValue` `"await"`. `\u0061wait` wird von der lexikalischen Grammatik nicht als Schlüsselwort erkannt, sondern stattdessen als `Identifier`. Die statischen Semantiken verbieten dessen Verwendung als Variablenname in asynchronen Funktionen.

Das funktioniert also:

```js
function old() {
  var \u0061wait;
}
```

Und das funktioniert nicht:

```js
async function modern() {
  var \u0061wait; // Syntaxfehler
}
```

## Zusammenfassung

In dieser Episode haben wir uns mit der lexikalischen Grammatik, der syntaktischen Grammatik und den Abkürzungen, die bei der Definition der syntaktischen Grammatik verwendet werden, vertraut gemacht. Als Beispiel haben wir untersucht, wie `await` als Bezeichner in asynchronen Funktionen verboten wird, aber in nicht-asynchronen Funktionen erlaubt bleibt.

Andere interessante Teile der syntaktischen Grammatik, wie die automatische Semikolon-Einfügung und Cover-Grammatiken, werden in einer späteren Episode behandelt. Bleiben Sie dran!
