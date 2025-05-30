---
title: "Verstehen der ECMAScript-Spezifikation, Teil 1"
author: "[Marja Hölttä](https://twitter.com/marjakh), spekulative Spezifikationsbeobachterin"
avatars: 
  - marja-holtta
date: "2020-02-03 13:33:37"
tags: 
  - ECMAScript
  - Verstehen von ECMAScript
description: "Tutorial zum Lesen der ECMAScript-Spezifikation"
tweet: "1224363301146189824"
---

[Alle Episoden](/blog/tags/understanding-ecmascript)

In diesem Artikel nehmen wir eine einfache Funktion in der Spezifikation und versuchen, die Notation zu verstehen. Los geht's!

## Vorwort

Auch wenn Sie JavaScript kennen, kann das Lesen der Sprachspezifikation, der [ECMAScript-Sprachspezifikation, kurz ECMAScript-Spezifikation](https://tc39.es/ecma262/), ziemlich einschüchternd sein. Zumindest so habe ich mich gefühlt, als ich sie das erste Mal gelesen habe.

<!--truncate-->
Beginnen wir mit einem konkreten Beispiel und gehen durch die Spezifikation, um es zu verstehen. Der folgende Code zeigt die Verwendung von `Object.prototype.hasOwnProperty`:

```js
const o = { foo: 1 };
o.hasOwnProperty('foo'); // true
o.hasOwnProperty('bar'); // false
```

Im Beispiel hat `o` keine Eigenschaft namens `hasOwnProperty`, also gehen wir die Prototypkette entlang und suchen danach. Wir finden sie im Prototyp von `o`, der `Object.prototype` ist.

Um zu beschreiben, wie `Object.prototype.hasOwnProperty` funktioniert, verwendet die Spezifikation Pseudo-Code-ähnliche Beschreibungen:

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> Wenn die Methode `hasOwnProperty` mit dem Argument `V` aufgerufen wird, werden die folgenden Schritte ausgeführt:
>
> 1. Setze `P` auf `? ToPropertyKey(V)`.
> 2. Setze `O` auf `? ToObject(this value)`.
> 3. Gib `? HasOwnProperty(O, P)` zurück.
:::

…und…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> Die abstrakte Operation `HasOwnProperty` dient dazu zu bestimmen, ob ein Objekt eine eigene Eigenschaft mit dem angegebenen Eigenschaftsschlüssel hat. Ein Boolescher Wert wird zurückgegeben. Die Operation wird mit den Argumenten `O` und `P` aufgerufen, wobei `O` das Objekt und `P` der Eigenschaftsschlüssel ist. Diese abstrakte Operation führt die folgenden Schritte aus:
>
> 1. Behauptung: `Type(O)` ist `Object`.
> 2. Behauptung: `IsPropertyKey(P)` ist `true`.
> 3. Setze `desc` auf `? O.[[GetOwnProperty]](P)`.
> 4. Wenn `desc` `undefined` ist, gib `false` zurück.
> 5. Gib `true` zurück.
:::

Aber was ist eine „abstrakte Operation“? Was sind die Dinge in `[[ ]]`? Warum steht ein `?` vor einer Funktion? Was bedeuten die Behauptungen?

Finden wir es heraus!

## Sprachtypen und Spezifikationstypen

Fangen wir mit etwas Vertrautem an. Die Spezifikation verwendet Werte wie `undefined`, `true` und `false`, die wir bereits aus JavaScript kennen. Sie sind alle [**Sprachwerte**](https://tc39.es/ecma262/#sec-ecmascript-language-types), Werte von **Sprachtypen**, die in der Spezifikation ebenfalls definiert sind.

Die Spezifikation verwendet Sprachwerte auch intern, zum Beispiel könnte ein interner Datentyp ein Feld enthalten, dessen mögliche Werte `true` und `false` sind. Im Gegensatz dazu verwenden JavaScript-Engines normalerweise keine Sprachwerte intern. Wenn die JavaScript-Engine beispielsweise in C++ geschrieben ist, würde sie normalerweise die C++-Werte `true` und `false` verwenden (und nicht ihre internen Darstellungen von JavaScript-`true` und -`false`).

Zusätzlich zu den Sprachtypen verwendet die Spezifikation auch [**Spezifikationstypen**](https://tc39.es/ecma262/#sec-ecmascript-specification-types), die nur in der Spezifikation vorkommen, nicht jedoch in der JavaScript-Sprache. Die JavaScript-Engine muss diese nicht implementieren (kann dies aber). In diesem Blogbeitrag werden wir den Spezifikationstyp Record (und seinen Untertyp Completion Record) kennenlernen.

## Abstrakte Operationen

[**Abstrakte Operationen**](https://tc39.es/ecma262/#sec-abstract-operations) sind Funktionen, die in der ECMAScript-Spezifikation definiert sind; sie dienen der Zweckmäßigkeit beim Verfassen der Spezifikation. Eine JavaScript-Engine muss sie nicht als separate Funktionen innerhalb der Engine implementieren. Sie können nicht direkt aus JavaScript aufgerufen werden.

## Interne Slots und interne Methoden

[**Interne Slots** und **interne Methoden**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots) verwenden Namen, die in `[[ ]]` eingeschlossen sind.

Interne Slots sind Datenmitglieder eines JavaScript-Objekts oder eines Spezifikationstyps. Sie werden zur Speicherung des Zustands des Objekts verwendet. Interne Methoden sind Mitgliederfunktionen eines JavaScript-Objekts.

Zum Beispiel hat jedes JavaScript-Objekt einen internen Slot `[[Prototype]]` und eine interne Methode `[[GetOwnProperty]]`.

Interne Slots und Methoden sind aus JavaScript nicht zugänglich. Zum Beispiel können Sie nicht auf `o.[[Prototype]]` zugreifen oder `o.[[GetOwnProperty]]()` aufrufen. Eine JavaScript-Engine kann sie für den eigenen internen Gebrauch implementieren, muss dies aber nicht.

Manchmal delegieren interne Methoden an ähnlich benannte abstrakte Operationen, wie im Fall der `[[GetOwnProperty]]`-Methode gewöhnlicher Objekte:

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> Wenn die interne Methode `[[GetOwnProperty]]` von `O` mit dem Eigenschaftsschlüssel `P` aufgerufen wird, werden die folgenden Schritte ausgeführt:
>
> 1. Rückgabe von `! OrdinaryGetOwnProperty(O, P)`.
:::

(Wir werden im nächsten Kapitel herausfinden, was das Ausrufezeichen bedeutet.)

`OrdinaryGetOwnProperty` ist keine interne Methode, da sie nicht mit einem Objekt verknüpft ist; stattdessen wird das Objekt, auf dem sie arbeitet, als Parameter übergeben.

`OrdinaryGetOwnProperty` wird „ordinary“ (gewöhnlich) genannt, da sie auf gewöhnlichen Objekten arbeitet. ECMAScript-Objekte können entweder **ordinary** (gewöhnlich) oder **exotic** (exotisch) sein. Gewöhnliche Objekte müssen das Standardverhalten für eine Reihe von Methoden namens **essential internal methods** (wesentliche interne Methoden) aufweisen. Wenn ein Objekt vom Standardverhalten abweicht, ist es exotisch.

Das bekannteste exotische Objekt ist das `Array`, da seine Eigenschaft `length` auf nicht standardmäßige Weise funktioniert: Das Festlegen der Eigenschaft `length` kann Elemente aus dem `Array` entfernen.

Wesentliche interne Methoden sind die hier aufgeführten Methoden [hier](https://tc39.es/ecma262/#table-5).

## Completion Records

Was ist mit den Fragezeichen und Ausrufezeichen? Um sie zu verstehen, müssen wir uns mit [**Completion Records**](https://tc39.es/ecma262/#sec-completion-record-specification-type) befassen!

Ein Completion Record ist ein Spezifikationstyp (nur für Spezifikationszwecke definiert). Eine JavaScript-Engine muss keinen entsprechenden internen Datentyp haben.

Ein Completion Record ist ein „record“ — ein Datentyp mit einer festen Reihe benannter Felder. Ein Completion Record hat drei Felder:

:::table-wrapper
| Name         | Beschreibung                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `[[Type]]`   | Eines von: `normal`, `break`, `continue`, `return`, oder `throw`. Alle anderen Typen außer `normal` sind **abrupt completions** (abrupte Abschlüsse). |
| `[[Value]]`  | Der Wert, der erzeugt wurde, als der Abschluss eingetreten ist, z. B. der Rückgabewert einer Funktion oder die Ausnahme (falls eine ausgelöst wurde). |
| `[[Target]]` | Wird für gerichtete Kontrollübertragungen verwendet (nicht relevant für diesen Blog-Post).                                                 |
:::

Jede abstrakte Operation gibt implizit einen Completion Record zurück. Selbst wenn es so aussieht, als würde eine abstrakte Operation einen einfachen Typ wie Boolean zurückgeben, wird dieser implizit in einen Completion Record mit dem Typ `normal` eingebettet (siehe [Implicit Completion Values](https://tc39.es/ecma262/#sec-implicit-completion-values)).

Hinweis 1: Die Spezifikation ist in dieser Hinsicht nicht vollständig konsistent; es gibt einige Hilfsfunktionen, die reine Werte zurückgeben und deren Rückgabewerte unverändert verwendet werden, ohne den Wert aus dem Completion Record zu extrahieren. Dies ist meist aus dem Kontext ersichtlich.

Hinweis 2: Die Spezifikationsbearbeiter untersuchen, ob der Umgang mit Completion Records expliziter gestaltet werden kann.

Wenn ein Algorithmus eine Ausnahme auslöst, bedeutet das, dass ein Completion Record mit `[[Type]]` `throw` zurückgegeben wird, dessen `[[Value]]` das Ausnahmeobjekt ist. Wir ignorieren vorerst die Typen `break`, `continue` und `return`.

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt) bedeutet, dass die folgenden Schritte ausgeführt werden:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Wenn `argument` abrupt ist, geben Sie `argument` zurück.
> 2. Setzen Sie `argument` auf `argument.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Das heißt, wir prüfen einen Completion Record; wenn es ein abrupter Abschluss ist, geben wir sofort zurück. Andernfalls extrahieren wir den Wert aus dem Completion Record.

`ReturnIfAbrupt` sieht möglicherweise wie ein Funktionsaufruf aus, ist es aber nicht. Es bewirkt, dass die Funktion, in der `ReturnIfAbrupt()` vorkommt, zurückgegeben wird, nicht die Funktion `ReturnIfAbrupt` selbst. Es verhält sich eher wie ein Makro in C-ähnlichen Sprachen.

`ReturnIfAbrupt` kann wie folgt verwendet werden:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Lassen Sie `obj` `Foo()` sein. (`obj` ist ein Completion Record.)
> 2. `ReturnIfAbrupt(obj)`.
> 3. `Bar(obj)`. (Falls wir noch hier sind, ist `obj` der extrahierte Wert aus dem Completion Record.)
<!-- markdownlint-enable blanks-around-lists -->
:::

Und jetzt kommt [das Fragezeichen](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands) ins Spiel: `? Foo()` ist gleichbedeutend mit `ReturnIfAbrupt(Foo())`. Die Verwendung einer Abkürzung ist praktisch: Wir müssen den Fehlerbehandlungscode nicht jedes Mal explizit schreiben.

Ebenso ist `Lassen Sie val ! Foo()` gleichbedeutend mit:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Lassen Sie `val` `Foo()` sein.
> 2. Behauptung: `val` ist kein abrupter Abschluss.
> 3. Setzen Sie `val` auf `val.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Mit diesem Wissen können wir `Object.prototype.hasOwnProperty` wie folgt neu schreiben:

:::ecmascript-algorithm
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. Lass `P` den Wert von `ToPropertyKey(V)` sein.
> 2. Wenn `P` eine abrupte Beendigung ist, gib `P` zurück.
> 3. Setze `P` auf `P.[[Value]]`.
> 4. Lass `O` den Wert von `ToObject(this value)` sein.
> 5. Wenn `O` eine abrupte Beendigung ist, gib `O` zurück.
> 6. Setze `O` auf `O.[[Value]]`.
> 7. Lass `temp` den Wert von `HasOwnProperty(O, P)` sein.
> 8. Wenn `temp` eine abrupte Beendigung ist, gib `temp` zurück.
> 9. Setze `temp` auf `temp.[[Value]]`.
> 10. Gib `NormalCompletion(temp)` zurück.
:::

…und wir können `HasOwnProperty` so umschreiben:

:::ecmascript-algorithm
> **`HasOwnProperty(O, P)`**
>
> 1. Stelle sicher: `Type(O)` ist `Object`.
> 2. Stelle sicher: `IsPropertyKey(P)` ist `true`.
> 3. Lass `desc` den Wert von `O.[[GetOwnProperty]](P)` sein.
> 4. Wenn `desc` eine abrupte Beendigung ist, gib `desc` zurück.
> 5. Setze `desc` auf `desc.[[Value]]`.
> 6. Wenn `desc` `undefined` ist, gib `NormalCompletion(false)` zurück.
> 7. Gib `NormalCompletion(true)` zurück.
:::

Wir können auch die interne Methode `[[GetOwnProperty]]` ohne das Ausrufezeichen umschreiben:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. Lass `temp` den Wert von `OrdinaryGetOwnProperty(O, P)` sein.
> 2. Stelle sicher: `temp` ist keine abrupte Beendigung.
> 3. Setze `temp` auf `temp.[[Value]]`.
> 4. Gib `NormalCompletion(temp)` zurück.
<!-- markdownlint-enable blanks-around-lists -->
:::

Hier nehmen wir an, dass `temp` eine brandneue temporäre Variable ist, die mit nichts anderem kollidiert.

Wir haben auch das Wissen genutzt, dass wenn eine Return-Anweisung etwas anderes als einen Completion Record zurückgibt, es implizit in einen `NormalCompletion` eingeschlossen wird.

### Nebenschauplatz: `Return ? Foo()`

Die Spezifikation verwendet die Notation `Return ? Foo()` — warum das Fragezeichen?

`Return ? Foo()` erweitert sich zu:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Lass `temp` den Wert von `Foo()` sein.
> 2. Wenn `temp` eine abrupte Beendigung ist, gib `temp` zurück.
> 3. Setze `temp` auf `temp.[[Value]]`.
> 4. Gib `NormalCompletion(temp)` zurück.
<!-- markdownlint-enable blanks-around-lists -->
:::

Was dasselbe ist wie `Return Foo()`; es verhält sich auf die gleiche Weise sowohl für abrupte als auch normale Beendigungen.

`Return ? Foo()` wird nur aus redaktionellen Gründen verwendet, um deutlicher zu machen, dass `Foo` einen Completion Record zurückgibt.

## Assertions

Assertions in der Spezifikation stellen die Invarianzbedingungen der Algorithmen sicher. Sie sind zur Klarstellung hinzugefügt, fügen jedoch keine Anforderungen an die Implementierung hinzu — die Implementierung muss sie nicht prüfen.

## Weiter geht's

Die abstrakten Operationen delegieren an andere abstrakte Operationen (siehe Bild unten), aber basierend auf diesem Blogbeitrag sollten wir in der Lage sein, herauszufinden, was sie tun. Wir werden auf Property Descriptors stoßen, die einfach ein weiterer Spezifikationstyp sind.

![Funktionsaufrufdiagramm, ausgehend von `Object.prototype.hasOwnProperty`](/_img/understanding-ecmascript-part-1/call-graph.svg)

## Zusammenfassung

Wir haben eine einfache Methode — `Object.prototype.hasOwnProperty` — und die **abstrakten Operationen** gelesen, die sie aufruft. Wir haben uns mit den Abkürzungen `?` und `!`, die sich auf die Fehlerbehandlung beziehen, vertraut gemacht. Wir sind auf **Spezifikationstypen**, **interne Slots** und **interne Methoden** gestoßen.

## Nützliche Links

[Wie man die ECMAScript-Spezifikation liest](https://timothygu.me/es-howto/): ein Tutorial, das einen Großteil des in diesem Beitrag behandelten Materials aus einem etwas anderen Blickwinkel abdeckt.
