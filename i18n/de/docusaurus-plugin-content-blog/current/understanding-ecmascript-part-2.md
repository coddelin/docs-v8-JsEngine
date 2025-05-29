---
title: 'Verständnis der ECMAScript-Spezifikation, Teil 2'
author: '[Marja Hölttä](https://twitter.com/marjakh), spekulativer Spezifikationsbeobachter'
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
  - Verständnis von ECMAScript
description: 'Anleitung zum Lesen der ECMAScript-Spezifikation, Teil 2'
tweet: '1234550773629014016'
---

Lass uns unsere fantastischen Fähigkeiten im Lesen der Spezifikation weiter üben. Falls du dir die vorherige Folge noch nicht angeschaut hast, ist jetzt ein guter Zeitpunkt dafür!

[Alle Folgen](/blog/tags/understanding-ecmascript)

## Bereit für Teil 2?

Eine unterhaltsame Möglichkeit, die Spezifikation kennenzulernen, besteht darin, mit einer JavaScript-Funktion zu beginnen, von der wir wissen, dass sie existiert, und herauszufinden, wie sie spezifiziert ist.

> Warnung! Diese Folge enthält kopierte Algorithmen aus der [ECMAScript-Spezifikation](https://tc39.es/ecma262/) von Februar 2020. Sie werden irgendwann veraltet sein.

Wir wissen, dass Eigenschaften in der Prototypenkette nachgeschlagen werden: Wenn ein Objekt die Eigenschaft, die wir lesen möchten, nicht hat, gehen wir die Prototypenkette hinauf, bis wir sie finden (oder ein Objekt finden, das keinen Prototyp mehr hat).

Zum Beispiel:

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## Wo ist der Prototypenlauf definiert?

Lass uns versuchen herauszufinden, wo dieses Verhalten definiert ist. Ein guter Ausgangspunkt ist eine Liste von [Internen Methoden von Objekten](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots).

Es gibt sowohl `[[GetOwnProperty]]` als auch `[[Get]]` — wir sind an der Version interessiert, die sich nicht nur auf _eigene_ Eigenschaften beschränkt, also entscheiden wir uns für `[[Get]]`.

Leider hat der [Spezifikationstyp Property Descriptor](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) ebenfalls ein Feld namens `[[Get]]`, daher müssen wir beim Durchblättern der Spezifikation für `[[Get]]` sorgfältig zwischen den beiden unabhängigen Verwendungen unterscheiden.

<!--truncate-->
`[[Get]]` ist eine **wesentliche interne Methode**. **Normale Objekte** implementieren das Standardverhalten für wesentliche interne Methoden. **Exotische Objekte** können ihre eigene interne Methode `[[Get]]` definieren, die vom Standardverhalten abweicht. In diesem Beitrag konzentrieren wir uns auf normale Objekte.

Die Standardimplementierung von `[[Get]]` delegiert an `OrdinaryGet`:

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> Wenn die interne Methode `[[Get]]` des Objekts `O` mit dem Eigenschaftsschlüssel `P` und dem ECMAScript-Wert `Receiver` aufgerufen wird, werden die folgenden Schritte ausgeführt:
>
> 1. Gib `? OrdinaryGet(O, P, Receiver)` zurück.

Wir werden gleich sehen, dass `Receiver` der Wert ist, der als **dieser Wert** verwendet wird, wenn eine Getter-Funktion einer Accessor-Eigenschaft aufgerufen wird.

`OrdinaryGet` ist folgendermaßen definiert:

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> Wenn die abstrakte Operation `OrdinaryGet` mit dem Objekt `O`, dem Eigenschaftsschlüssel `P` und dem ECMAScript-Wert `Receiver` aufgerufen wird, werden die folgenden Schritte ausgeführt:
>
> 1. Stelle sicher: `IsPropertyKey(P)` ist `true`.
> 1. Lass `desc` `? O.[[GetOwnProperty]](P)` sein.
> 1. Wenn `desc` `undefined` ist, dann
>     1. Lass `parent` `? O.[[GetPrototypeOf]]()` sein.
>     1. Wenn `parent` `null` ist, gib `undefined` zurück.
>     1. Gib `? parent.[[Get]](P, Receiver)` zurück.
> 1. Wenn `IsDataDescriptor(desc)` `true` ist, gib `desc.[[Value]]` zurück.
> 1. Stelle sicher: `IsAccessorDescriptor(desc)` ist `true`.
> 1. Lass `getter` `desc.[[Get]]` sein.
> 1. Wenn `getter` `undefined` ist, gib `undefined` zurück.
> 1. Gib `? Call(getter, Receiver)` zurück.

Der Prototypenkettenlauf ist in Schritt 3 enthalten: Wenn wir die Eigenschaft nicht als eigene Eigenschaft finden, rufen wir die `[[Get]]`-Methode des Prototyps auf, die erneut an `OrdinaryGet` delegiert. Wenn wir die Eigenschaft immer noch nicht finden, rufen wir die `[[Get]]`-Methode ihres Prototyps auf, die erneut an `OrdinaryGet` delegiert, und so weiter, bis wir entweder die Eigenschaft finden oder ein Objekt ohne Prototyp erreichen.

Lass uns ansehen, wie dieser Algorithmus funktioniert, wenn wir `o2.foo` aufrufen. Zuerst rufen wir `OrdinaryGet` mit `O` als `o2` und `P` als `"foo"` auf. `O.[[GetOwnProperty]]("foo")` gibt `undefined` zurück, da `o2` keine eigene Eigenschaft namens `"foo"` hat, also nehmen wir den If-Zweig in Schritt 3. In Schritt 3.a setzen wir `parent` auf den Prototypen von `o2`, der `o1` ist. `parent` ist nicht `null`, also kehren wir in Schritt 3.b nicht zurück. In Schritt 3.c rufen wir die `[[Get]]`-Methode des Elternteils mit dem Eigenschaftsschlüssel `"foo"` auf und geben zurück, was sie zurückgibt.

Das Elternobjekt (`o1`) ist ein normales Objekt, daher ruft seine `[[Get]]`-Methode erneut `OrdinaryGet` auf, diesmal mit `O` als `o1` und `P` als `"foo"`. `o1` hat eine eigene Eigenschaft namens `"foo"`, also gibt in Schritt 2 `O.[[GetOwnProperty]]("foo")` den zugehörigen Eigenschaftsdeskriptor zurück, und wir speichern ihn in `desc`.

[Eigenschaftsbeschreiber](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) ist ein Spezifikationstyp. Daten-Eigenschaftsbeschreiber speichern den Wert der Eigenschaft direkt im `[[Value]]`-Feld. Zugriff-Eigenschaftsbeschreiber speichern die Zugriffsfunktionsfelder in `[[Get]]` und/oder `[[Set]]`. In diesem Fall ist der Eigenschaftsbeschreiber, der `"foo"` zugeordnet ist, ein Daten-Eigenschaftsbeschreiber.

Der Daten-Eigenschaftsbeschreiber, den wir in Schritt 2 in `desc` gespeichert haben, ist nicht `undefined`, daher gehen wir in Schritt 3 nicht in die `if`-Verzweigung. Als Nächstes führen wir Schritt 4 aus. Der Eigenschaftsbeschreiber ist ein Daten-Eigenschaftsbeschreiber, daher geben wir in Schritt 4 sein `[[Value]]`-Feld, `99`, zurück, und das war's.

## Was ist `Receiver` und woher stammt es?

Der `Receiver`-Parameter wird nur im Fall von Zugriffseigenschaften in Schritt 8 verwendet. Es wird als **this-Wert** übergeben, wenn die Getter-Funktion einer Zugriffseigenschaft aufgerufen wird.

`OrdinaryGet` übergibt den ursprünglichen `Receiver` während der Rekursion unverändert (Schritt 3.c). Schauen wir uns an, woher der ursprüngliche `Receiver` stammt!

Wenn wir nach Stellen suchen, an denen `[[Get]]` aufgerufen wird, finden wir eine abstrakte Operation `GetValue`, die auf Referenzen arbeitet. Eine Referenz ist ein Spezifikationstyp, der aus einem Basiswert, dem referenzierten Namen und einer strikten Referenzmarkierung besteht. Im Fall von `o2.foo` ist der Basiswert das Objekt `o2`, der referenzierte Name ist der String `"foo"`, und die strikte Referenzmarkierung ist `false`, da der Beispielcode nachlässig ist.

### Abstecher: Warum ist Referenz kein Record?

Abstecher: Eine Referenz ist kein Record, auch wenn es den Anschein erweckt. Sie besteht aus drei Komponenten, die genauso gut als drei benannte Felder ausgedrückt werden könnten. Eine Referenz ist nur aus historischen Gründen kein Record.

### Zurück zu `GetValue`

Schauen wir uns an, wie `GetValue` definiert ist:

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`.
> 1. Wenn `Type(V)` nicht `Reference` ist, gib `V` zurück.
> 1. Lass `base` gleich `GetBase(V)` sein.
> 1. Wenn `IsUnresolvableReference(V)` gleich `true` ist, löse eine `ReferenceError`-Ausnahme aus.
> 1. Wenn `IsPropertyReference(V)` gleich `true` ist, dann
>     1. Wenn `HasPrimitiveBase(V)` gleich `true` ist, dann
>         1. Stelle sicher: In diesem Fall wird `base` niemals `undefined` oder `null` sein.
>         1. Setze `base` auf `! ToObject(base)`.
>     1. Gib `? base.[[Get]](GetReferencedName(V), GetThisValue(V))` zurück.
> 1. Andernfalls
>     1. Stelle sicher: `base` ist eine Environment Record.
>     1. Gib `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))` zurück.

Die Referenz in unserem Beispiel ist `o2.foo`, was eine Eigenschaftsreferenz ist. Daher nehmen wir den Zweig 5. Wir folgen nicht dem Zweig 5.a, da die Basis (`o2`) [kein primitiver Wert](/blog/react-cliff#javascript-types) ist (eine Zahl, ein String, ein Symbol, ein BigInt, ein Boolean, `undefined` oder `null`).

Dann rufen wir `[[Get]]` in Schritt 5.b auf. Der `Receiver`, den wir übergeben, ist `GetThisValue(V)`. In diesem Fall ist das einfach der Basiswert der Referenz:

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. Stelle sicher: `IsPropertyReference(V)` ist `true`.
> 1. Wenn `IsSuperReference(V)` gleich `true` ist, dann
>     1. Gib den Wert der `thisValue`-Komponente der Referenz `V` zurück.
> 1. Gib `GetBase(V)` zurück.

Für `o2.foo` folgen wir nicht dem Zweig in Schritt 2, da es sich nicht um eine Super-Referenz handelt (zum Beispiel `super.foo`), sondern wir nehmen Schritt 3 und geben den Basiswert der Referenz zurück, der `o2` ist.

Alles zusammen genommen stellen wir fest, dass wir den `Receiver` auf die Basis der ursprünglichen Referenz setzen und ihn dann unverändert während des Durchlaufens der Prototypen-Kette halten. Wenn die gefundene Eigenschaft schließlich eine Zugriffseigenschaft ist, verwenden wir den `Receiver` als **this-Wert**, wenn wir ihn aufrufen.

Insbesondere bezieht sich der **this-Wert** in einem Getter auf das ursprüngliche Objekt, von dem wir versucht haben, die Eigenschaft abzurufen, nicht auf das Objekt, in dem wir die Eigenschaft während des Durchlaufens der Prototypen-Kette gefunden haben.

Probieren wir es aus!

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

In diesem Beispiel haben wir eine Zugriffseigenschaft namens `foo` und definieren einen Getter dafür. Der Getter gibt `this.x` zurück.

Dann greifen wir auf `o2.foo` zu - was gibt der Getter zurück?

Wir haben herausgefunden, dass beim Aufrufen des Getters der **this-Wert** das Objekt ist, von dem wir ursprünglich versucht haben, die Eigenschaft abzurufen, nicht das Objekt, in dem die Eigenschaft gefunden wurde. In diesem Fall ist der **this-Wert** `o2`, nicht `o1`. Wir können dies überprüfen, indem wir sicherstellen, ob der Getter `o2.x` oder `o1.x` zurückgibt. Tatsächlich gibt er `o2.x` zurück.

Es funktioniert! Wir waren in der Lage, das Verhalten dieses Codeausschnitts basierend auf dem, was wir in der Spezifikation gelesen haben, vorherzusehen.

## Zugriff auf Eigenschaften — warum ruft es `[[Get]]` auf?

Wo sagt die Spezifikation, dass die interne Objektmethode `[[Get]]` aufgerufen wird, wenn auf eine Eigenschaft wie `o2.foo` zugegriffen wird? Das muss doch irgendwo definiert sein. Vertrauen Sie nicht einfach meinem Wort!

Wir haben herausgefunden, dass die interne Objektmethode `[[Get]]` von der abstrakten Operation `GetValue` aufgerufen wird, die auf Referenzen arbeitet. Aber von wo aus wird `GetValue` aufgerufen?

### Laufzeitsemantik für `MemberExpression`

Die grammatikalischen Regeln der Spezifikation definieren die Syntax der Sprache. [Laufzeitsemantik](https://tc39.es/ecma262/#sec-runtime-semantics) definieren, was die syntaktischen Konstrukte „bedeuten“ (wie sie zur Laufzeit ausgewertet werden).

Wenn Sie mit [kontextfreien Grammatiken](https://en.wikipedia.org/wiki/Context-free_grammar) nicht vertraut sind, sollten Sie jetzt einen Blick darauf werfen!

Wir werden uns die grammatikalischen Regeln in einer späteren Episode genauer ansehen. Halten wir es jetzt erst einmal einfach! Insbesondere können wir in dieser Episode die Indizes (`Yield`, `Await` usw.) in den Produktionen ignorieren.

Die folgenden Produktionen beschreiben, wie ein [`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression) aussieht:

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

Hier haben wir 7 Produktionen für `MemberExpression`. Eine `MemberExpression` kann einfach eine `PrimaryExpression` sein. Alternativ kann eine `MemberExpression` aus einer anderen `MemberExpression` und einer `Expression` zusammengesetzt werden: `MemberExpression [ Expression ]`, z.B. `o2['foo']`. Oder sie kann `MemberExpression . IdentifierName` sein, z.B. `o2.foo` – dies ist die Produktion, die für unser Beispiel relevant ist.

Die Laufzeitsemantik für die Produktion `MemberExpression : MemberExpression . IdentifierName` definiert die Schritte, die bei der Auswertung durchzuführen sind:

:::ecmascript-algorithm
> **[Laufzeitsemantik: Evaluation für `MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)**
>
> 1. Lasse `baseReference` das Ergebnis der Auswertung von `MemberExpression` sein.
> 1. Lasse `baseValue` `? GetValue(baseReference)` sein.
> 1. Wenn der von dieser `MemberExpression` abgedeckte Code strikter Modus-Code ist, setze `strict` auf `true`; andernfalls setze `strict` auf `false`.
> 1. Gib `? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)` zurück.

Der Algorithmus delegiert an die abstrakte Operation `EvaluatePropertyAccessWithIdentifierKey`, also müssen wir diese ebenfalls lesen:

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey( baseValue, identifierName, strict )`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> Die abstrakte Operation `EvaluatePropertyAccessWithIdentifierKey` nimmt als Argumente einen Wert `baseValue`, einen Parse-Knoten `identifierName` und ein boolesches Argument `strict`. Sie führt die folgenden Schritte aus:
>
> 1. Behauptung: `identifierName` ist ein `IdentifierName`.
> 1. Lasse `bv` `? RequireObjectCoercible(baseValue)` sein.
> 1. Lasse `propertyNameString` den `StringValue` von `identifierName` sein.
> 1. Gib einen Wert vom Typ Reference zurück, dessen Basiskomponente `bv`, dessen referenzierter Name `propertyNameString` und dessen Strikt-Referenz-Flag `strict` ist.

Das bedeutet: `EvaluatePropertyAccessWithIdentifierKey` erstellt eine Reference, die den bereitgestellten `baseValue` als Basis, den Zeichenkettenwert von `identifierName` als Eigenschaftsnamen und `strict` als strikten Modus-Flag verwendet.

Letztendlich wird diese Reference an `GetValue` übergeben. Dies wird an mehreren Stellen in der Spezifikation definiert, abhängig davon, wie die Reference verwendet wird.

### `MemberExpression` als Parameter

In unserem Beispiel verwenden wir den Eigenschaftszugriff als Parameter:

```js
console.log(o2.foo);
```

In diesem Fall ist das Verhalten in der Laufzeitsemantik der `ArgumentList`-Produktion definiert, die `GetValue` für das Argument aufruft:

:::ecmascript-algorithm
> **[Laufzeitsemantik: `ArgumentListEvaluation`](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)**
>
> `ArgumentList : AssignmentExpression`
>
> 1. Lasse `ref` das Ergebnis der Auswertung von `AssignmentExpression` sein.
> 1. Lasse `arg` `? GetValue(ref)` sein.
> 1. Gib eine Liste zurück, deren einziges Element `arg` ist.

`o2.foo` sieht nicht wie eine `AssignmentExpression` aus, aber es ist eine, also ist diese Produktion anwendbar. Um herauszufinden, warum, können Sie sich diesen [zusätzlichen Inhalt](/blog/extras/understanding-ecmascript-part-2-extra) ansehen, aber es ist an dieser Stelle nicht unbedingt erforderlich.

Die `AssignmentExpression` in Schritt 1 ist `o2.foo`. `ref`, das Ergebnis der Auswertung von `o2.foo`, ist die oben erwähnte Reference. In Schritt 2 rufen wir `GetValue` darauf auf. Somit wissen wir, dass die interne Objekt-Methode `[[Get]]` aufgerufen wird und der Prototype-Chain-Walk durchgeführt wird.

## Zusammenfassung

In dieser Episode haben wir untersucht, wie die Spezifikation ein Sprachmerkmal definiert, in diesem Fall die Prototype-Suche, über alle verschiedenen Ebenen hinweg: die syntaktischen Konstrukte, die das Merkmal auslösen, und die es definierenden Algorithmen.
