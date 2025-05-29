---
title: "Dinge in V8 sortieren"
author: "Simon Zünd ([@nimODota](https://twitter.com/nimODota)), konsistenter Komparator"
avatars: 
  - simon-zuend
date: "2018-09-28 11:20:37"
tags: 
  - ECMAScript
  - Interna
description: "Ab V8 v7.0 / Chrome 70 ist Array.prototype.sort stabil."
tweet: "1045656758700650502"
---
`Array.prototype.sort` gehörte zu den letzten eingebauten Funktionen, die in selbst gehostetem JavaScript in V8 implementiert wurden. Die Portierung bot uns die Möglichkeit, mit verschiedenen Algorithmen und Implementierungsstrategien zu experimentieren und sie schließlich [stabil zu machen](https://mathiasbynens.be/demo/sort-stability) in V8 v7.0 / Chrome 70.

<!--truncate-->
## Hintergrund

Sortieren in JavaScript ist schwierig. Dieser Blogbeitrag beleuchtet einige Eigenheiten in der Interaktion zwischen einem Sortieralgorithmus und der JavaScript-Sprache und beschreibt unsere Reise, V8 auf einen stabilen Algorithmus umzustellen und die Performance vorhersehbarer zu machen.

Beim Vergleich verschiedener Sortieralgorithmen betrachten wir deren schlechteste und durchschnittliche Performance, ausgedrückt als Grenze für das asymptotische Wachstum (d.h. „Big O“-Notation) entweder von Speicheroperationen oder der Anzahl von Vergleichen. Beachten Sie, dass in dynamischen Sprachen wie JavaScript eine Vergleichsoperation in der Regel wesentlich teurer ist als ein Speicherzugriff. Dies liegt daran, dass der Vergleich zweier Werte beim Sortieren normalerweise Aufrufe an Benutzercode beinhaltet.

Schauen wir uns ein einfaches Beispiel an, bei dem einige Zahlen basierend auf einer vom Benutzer bereitgestellten Vergleichsfunktion in aufsteigende Reihenfolge sortiert werden. Eine _konsistente_ Vergleichsfunktion gibt `-1` (oder einen anderen negativen Wert), `0` oder `1` (oder einen anderen positiven Wert) zurück, wenn die beiden bereitgestellten Werte jeweils kleiner, gleich oder größer sind. Eine Vergleichsfunktion, die diese Muster nicht befolgt, ist _inkonsistent_ und kann beliebige Nebenwirkungen haben, wie z. B. das Ändern des Arrays, das sortiert werden soll.

```js
const array = [4, 2, 5, 3, 1];

function compare(a, b) {
  // Beliebiger Code geht hier hin, z. B. `array.push(1);`.
  return a - b;
}

// Ein „typischer“ Sortieraufruf.
array.sort(compare);
```

Selbst im nächsten Beispiel können Aufrufe an Benutzercode stattfinden. Die „Standard“-Vergleichsfunktion ruft `toString` für beide Werte auf und führt einen lexikografischen Vergleich der String-Darstellungen durch.

```js
const array = [4, 2, 5, 3, 1];

array.push({
  toString() {
    // Beliebiger Code geht hier hin, z. B. `array.push(1);`.
    return '42';
  }
});

// Sortieren ohne Vergleichsfunktion.
array.sort();
```

### Mehr Spaß mit Accessoren und Prototyp-Ketten-Interaktionen

Hier verlassen wir die Spezifikation und betreten das Land des „implementierungsdefinierten“ Verhaltens. Die Spezifikation enthält eine ganze Liste von Bedingungen, die, wenn erfüllt, der Engine erlauben, das Objekt/Array so zu sortieren, wie sie es für richtig hält – oder gar nicht. Die Engines müssen sich an einige Grundregeln halten, aber alles andere ist weitgehend offen. Einerseits gibt dies den Entwicklern von Engines die Freiheit, mit verschiedenen Implementierungen zu experimentieren. Andererseits erwarten Benutzer ein vernünftiges Verhalten, auch wenn die Spezifikation keine bestimmten Anforderungen stellt. Dies wird dadurch erschwert, dass „vernünftiges Verhalten“ nicht immer einfach zu bestimmen ist.

Dieser Abschnitt zeigt, dass es bei `Array#sort` noch einige Aspekte gibt, bei denen sich das Engine-Verhalten stark unterscheidet. Dies sind schwierige Edge-Cases, und wie oben erwähnt, ist nicht immer klar, was tatsächlich „das Richtige“ ist. Wir empfehlen _dringend_, keinen Code wie diesen zu schreiben; Engines werden dafür nicht optimieren.

Das erste Beispiel zeigt ein Array mit einigen Accessoren (d.h. Gettern und Settern) und ein „Call-Log“ in verschiedenen JavaScript-Engines. Accessoren sind der erste Fall, bei dem die resultierende Sortierreihenfolge implementierungsdefiniert ist:

```js
const array = [0, 1, 2];

Object.defineProperty(array, '0', {
  get() { console.log('get 0'); return 0; },
  set(v) { console.log('set 0'); }
});

Object.defineProperty(array, '1', {
  get() { console.log('get 1'); return 1; },
  set(v) { console.log('set 1'); }
});

array.sort();
```

Hier ist die Ausgabe dieses Snippets in verschiedenen Engines. Beachten Sie, dass es hier keine „richtigen“ oder „falschen“ Antworten gibt – die Spezifikation überlässt dies der Implementierung!

```
// Chakra
get 0
get 1
set 0
set 1

// JavaScriptCore
get 0
get 1
get 0
get 0
get 1
get 1
set 0
set 1

// V8
get 0
get 0
get 1
get 1
get 1
get 0

#### SpiderMonkey
get 0
get 1
set 0
set 1
```

Das nächste Beispiel zeigt Interaktionen mit der Prototypen-Kette. Aus Gründen der Kürze zeigen wir das Call-Log nicht.

```js
const object = {
 1: 'd1',
 2: 'c1',
 3: 'b1',
 4: undefined,
 __proto__: {
   length: 10000,
   1: 'e2',
   10: 'a2',
   100: 'b2',
   1000: 'c2',
   2000: undefined,
   8000: 'd2',
   12000: 'XX',
   __proto__: {
     0: 'e3',
     1: 'd3',
     2: 'c3',
     3: 'b3',
     4: 'f3',
     5: 'a3',
     6: undefined,
   },
 },
};
Array.prototype.sort.call(object);
```

Die Ausgabe zeigt das `object`, nachdem es sortiert wurde. Wie gesagt, es gibt hier keine richtige Antwort. Dieses Beispiel zeigt nur, wie seltsam die Interaktion zwischen indizierten Eigenschaften und der Prototypenkette werden kann:

```js
// Chakra
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// JavaScriptCore
['a2', 'a2', 'a3', 'b1', 'b2', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined]

// V8
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// SpiderMonkey
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]
```

### Was V8 vor und nach dem Sortieren macht

:::note
**Hinweis:** Dieser Abschnitt wurde im Juni 2019 aktualisiert, um Änderungen an der Vor- und Nachbearbeitung von `Array#sort` in V8 v7.7 zu berücksichtigen.
:::

V8 führt vor dem eigentlichen Sortieren einen Schritt zur Vorbearbeitung und danach einen Schritt zur Nachbearbeitung aus. Die Grundidee besteht darin, alle nicht-`undefined`-Werte in eine temporäre Liste zu sammeln, diese temporäre Liste zu sortieren und dann die sortierten Werte zurück in das ursprüngliche Array oder Objekt zu schreiben. Dadurch wird V8 von der Berücksichtigung von Accessoren oder der Prototypenkette während des Sortierens selbst entlastet.

Die Spezifikation erwartet, dass `Array#sort` eine Sortierreihenfolge erzeugt, die konzeptionell in drei Segmente unterteilt werden kann:

  1. Alle nicht-`undefined`-Werte, die basierend auf der Vergleichsfunktion sortiert sind.
  1. Alle `undefined`-Werte.
  1. Alle Löcher, d.h. nicht vorhandene Eigenschaften.

Der eigentliche Sortieralgorithmus muss nur auf das erste Segment angewendet werden. Um dies zu erreichen, führt V8 einen Vorbearbeitungsschritt durch, der grob wie folgt funktioniert:

  1. Ermitteln Sie den Wert der `”length”`-Eigenschaft des Arrays oder Objekts, das sortiert werden soll.
  1. Setzen Sie `numberOfUndefineds` auf 0.
  1. Für jeden `value` im Bereich `[0, length)`:
    a. Wenn `value` ein Loch ist: nichts tun.
    b. Wenn `value` `undefined` ist: Erhöhen Sie `numberOfUndefineds` um 1.
    c. Andernfalls fügen Sie `value` einer temporären Liste `elements` hinzu.

Nach diesen Schritten sind alle nicht-`undefined`-Werte in der temporären Liste `elements` enthalten. `undefined`-Werte werden einfach gezählt, statt zu `elements` hinzugefügt zu werden. Wie oben erwähnt, verlangt die Spezifikation, dass `undefined`-Werte ans Ende sortiert werden. Aber `undefined`-Werte werden nicht tatsächlich an die benutzerdefinierte Vergleichsfunktion übergeben, sodass wir nur die Anzahl der aufgetretenen `undefined`-Werte zählen können.

Der nächste Schritt besteht darin, `elements` tatsächlich zu sortieren. Siehe [den Abschnitt über TimSort](/blog/array-sort#timsort) für eine detaillierte Beschreibung.

Nachdem das Sortieren abgeschlossen ist, müssen die sortierten Werte wieder in das ursprüngliche Array oder Objekt geschrieben werden. Der Nachbearbeitungsschritt besteht aus drei Phasen, die die konzeptionellen Segmente verarbeiten:

  1. Schreiben Sie alle Werte aus `elements` zurück in das ursprüngliche Objekt im Bereich `[0, elements.length)`.
  1. Legen Sie alle Werte aus `[elements.length, elements.length + numberOfUndefineds)` auf `undefined` fest.
  1. Löschen Sie alle Werte im Bereich `[elements.length + numberOfUndefineds, length)`.

Schritt 3 ist erforderlich, falls das ursprüngliche Objekt Löcher im Sortierbereich enthielt. Werte im Bereich `[elements.length + numberOfUndefineds, length)` wurden bereits nach vorne verschoben, und das Auslassen von Schritt 3 würde zu doppelten Werten führen.

## Geschichte

`Array.prototype.sort` und `TypedArray.prototype.sort` basierten beide auf der gleichen Quicksort-Implementierung, die in JavaScript geschrieben war. Der Sortieralgorithmus selbst ist recht einfach: Die Basis ist ein Quicksort mit einem Insertion-Sort-Backup für kürzere Arrays (Länge < 10). Der Insertion-Sort-Backup wurde auch verwendet, wenn die Quicksort-Rekursion eine Teilarraylänge von 10 erreichte. Insertion Sort ist für kleinere Arrays effizienter. Das liegt daran, dass Quicksort nach der Partitionierung zweimal rekursiv aufgerufen wird. Jeder solche rekursive Aufruf hatte den Overhead, einen Stack-Frame zu erstellen (und zu verwerfen).

Die Auswahl eines geeigneten Pivot-Elements hat einen großen Einfluss auf Quicksort. V8 verwendete zwei Strategien:

- Das Pivot wurde als Median des ersten, letzten und eines dritten Elements des zu sortierenden Teilarrays gewählt. Bei kleineren Arrays ist dieses dritte Element einfach das mittlere Element.
- Bei größeren Arrays wurde eine Stichprobe entnommen, dann sortiert, und der Median der sortierten Stichprobe diente als drittes Element in der obigen Berechnung.

Einer der Vorteile von Quicksort ist, dass es in-place sortiert. Der Speicheraufwand stammt aus der Zuordnung eines kleinen Arrays für die Stichprobe beim Sortieren großer Arrays und log(n)-Stack-Speicher. Der Nachteil ist, dass es kein stabiler Algorithmus ist und die Möglichkeit besteht, dass der Algorithmus in das Worst-Case-Szenario gerät, bei dem QuickSort zu 𝒪(n²) degradiert.

### Einführung von V8 Torque

Als begeisterter Leser des V8-Blogs haben Sie vielleicht von [`CodeStubAssembler`](/blog/csa) oder CSA für Kurz gehört. CSA ist eine V8-Komponente, die es uns ermöglicht, niedrigstufigen TurboFan-IR direkt in C++ zu schreiben, der später mit dem Backend von TurboFan in Maschinencode für die entsprechende Architektur übersetzt wird.

CSA wird stark genutzt, um sogenannte „Fast-Paths“ für JavaScript-Builtins zu schreiben. Eine Fast-Path-Version eines Builtins überprüft normalerweise, ob bestimmte Invarianten gelten (z. B. keine Elemente in der Prototyp-Kette, keine Accessoren usw.), und verwendet dann schnellere, spezifischere Operationen, um die Funktionalität des Builtins umzusetzen. Dies kann zu Ausführungszeiten führen, die um ein Vielfaches schneller sind als bei generischeren Versionen.

Der Nachteil von CSA ist, dass es wirklich als eine Assemblersprache betrachtet werden kann. Der Kontrollfluss wird mithilfe expliziter `labels` und `gotos` modelliert, was die Implementierung komplexerer Algorithmen in CSA schwer lesbar und fehleranfällig macht.

Daher gibt es [V8 Torque](/docs/torque). Torque ist eine domänenspezifische Sprache mit Typescript-ähnlicher Syntax, die derzeit CSA als einziges Kompilierungsziel verwendet. Torque ermöglicht nahezu das gleiche Maß an Kontrolle wie CSA und bietet gleichzeitig höherstufige Konstrukte wie `while`- und `for`-Schleifen. Zusätzlich ist es stark typisiert und wird in Zukunft Sicherheitsprüfungen enthalten, wie automatische Out-of-Bounds-Prüfungen, die den V8-Ingenieuren stärkere Garantien bieten.

Die ersten wichtigen Builtins, die in V8 mittels Torque neu geschrieben wurden, waren [`TypedArray#sort`](/blog/v8-release-68) und [`Dataview`-Operationen](/blog/dataview). Beide dienten zusätzlich dazu, den Torque-Entwicklern Feedback darüber zu geben, welche Sprachfeatures benötigt werden und welche Idiome verwendet werden sollten, um Builtins effizient zu schreiben. Zum Zeitpunkt des Schreibens wurden mehrere `JSArray`-Builtins, die ihre JavaScript-Implementationen als Fallback hatten (z. B. `Array#unshift`) nach Torque übertragen, während andere komplett neu geschrieben wurden (z. B. `Array#splice` und `Array#reverse`).

### Umstellung von `Array#sort` auf Torque

Die erste Torque-Version von `Array#sort` war mehr oder weniger eine direkte Portierung der JavaScript-Implementierung. Der einzige Unterschied war, dass anstelle eines Sampling-Ansatzes für größere Arrays das dritte Element für die Pivot-Berechnung zufällig ausgewählt wurde.

Dies funktionierte recht gut, aber da immer noch Quicksort verwendet wurde, blieb `Array#sort` instabil. [Die Anfrage nach einem stabilen `Array#sort`](https://bugs.chromium.org/p/v8/issues/detail?id=90) ist eines der ältesten Tickets im Bugtracker von V8. Experimente mit Timsort als nächsten Schritt boten uns mehrere Vorteile. Erstens gefällt uns, dass es stabil ist und einige gute algorithmische Garantien bietet (siehe nächsten Abschnitt). Zweitens war Torque noch in Arbeit, und die Implementierung eines komplexeren Builtins wie `Array#sort` mit Timsort führte zu viel verwertbarem Feedback, das Torque als Sprache beeinflusste.

## Timsort

Timsort, ursprünglich 2002 von Tim Peters für Python entwickelt, könnte am besten als eine adaptive stabile Variante von Mergesort beschrieben werden. Auch wenn die Details recht kompliziert und am besten von [dem Mann selbst](https://github.com/python/cpython/blob/master/Objects/listsort.txt) oder der [Wikipedia-Seite](https://en.wikipedia.org/wiki/Timsort) beschrieben werden, sind die Grundlagen leicht zu verstehen. Während Mergesort normalerweise rekursiv funktioniert, arbeitet Timsort iterativ. Es verarbeitet ein Array von links nach rechts und sucht nach sogenannten _Runs_. Ein Run ist einfach eine Sequenz, die bereits sortiert ist. Dies schließt Sequenzen ein, die „falsch herum“ sortiert sind, da diese Sequenzen einfach umgekehrt werden können, um einen Run zu bilden. Zu Beginn des Sortierprozesses wird eine minimale Run-Länge bestimmt, die von der Länge des Inputs abhängt. Wenn Timsort keine natürlichen Runs dieser Mindestlänge finden kann, wird ein Run „künstlich erweitert“ mithilfe von Insertion Sort.

Die gefundenen Runs werden mithilfe eines Stacks verfolgt, der einen Startindex und eine Länge jedes Runs speichert. Von Zeit zu Zeit werden Runs auf dem Stack zusammengeführt, bis nur ein sortierter Run übrig bleibt. Timsort versucht, ein Gleichgewicht zu wahren, wenn entschieden wird, welche Runs zusammengeführt werden sollen. Einerseits möchte man möglichst früh zusammenführen, da die Daten dieser Runs vermutlich bereits im Cache vorhanden sind, andererseits möchte man so spät wie möglich zusammenführen, um Muster in den Daten auszunutzen, die sich möglicherweise herauskristallisieren. Um dies zu erreichen, behält Timsort zwei Invarianten bei. Angenommen `A`, `B` und `C` sind die drei obersten Runs:

- `|C| > |B| + |A|`
- `|B| > |A|`

![Stack von Runs vor und nach dem Zusammenführen von `A` mit `B`](/_img/array-sort/runs-stack.svg)

Das Bild zeigt den Fall, bei dem `|A| > |B|`, sodass `B` mit dem kleineren der beiden Runs zusammengeführt wird.

Beachten Sie, dass Timsort nur aufeinanderfolgende Runs zusammenführt, was erforderlich ist, um Stabilität zu gewährleisten, andernfalls würden gleiche Elemente zwischen Runs übertragen werden. Außerdem stellt die erste Invariante sicher, dass die Run-Längen mindestens so schnell wie die Fibonacci-Zahlen wachsen und gibt somit eine obere Grenze für die Größe des Run-Stacks vor, wenn die maximale Array-Länge bekannt ist.

Man kann jetzt erkennen, dass bereits sortierte Sequenzen in 𝒪(n) sortiert werden, da ein solches Array zu einem einzigen Run führen würde, der nicht zusammengeführt werden muss. Der schlimmste Fall ist 𝒪(n log n). Diese algorithmischen Eigenschaften zusammen mit der stabilen Natur von Timsort waren einige der Gründe, warum wir uns am Ende für Timsort anstelle von Quicksort entschieden haben.

### Implementierung von Timsort in Torque

Builtins haben normalerweise verschiedene Code-Pfade, die zur Laufzeit basierend auf verschiedenen Variablen ausgewählt werden. Die allgemeinste Version kann jede Art von Objekt verarbeiten, unabhängig davon, ob es sich um ein `JSProxy` handelt, Interceptoren hat oder einen Prototyp-Kettennachschlag benötigt, wenn Eigenschaften abgerufen oder gesetzt werden.
Der generische Pfad ist in den meisten Fällen eher langsam, da er alle Eventualitäten berücksichtigen muss. Aber wenn wir im Voraus wissen, dass das zu sortierende Objekt ein einfaches `JSArray` ist, das nur Smis enthält, können all diese teuren `[[Get]]`- und `[[Set]]`-Operationen durch einfache Loads und Stores in einem `FixedArray` ersetzt werden. Der Hauptunterschied liegt im [`ElementsKind`](/blog/elements-kinds).

Das Problem besteht nun darin, wie man einen schnellen Pfad implementiert. Der Kernalgorithmus bleibt für alle der gleiche, aber die Art und Weise, wie wir auf Elemente zugreifen, ändert sich basierend auf dem `ElementsKind`. Eine Möglichkeit, dies zu erreichen, besteht darin, an jeder Einsatzstelle zum richtigen „Accessor“ zu verzweigen. Stellen Sie sich einen Switch für jede „Load“-/„Store“-Operation vor, bei dem wir basierend auf dem gewählten schnellen Pfad einen anderen Zweig auswählen.

Eine andere Lösung (und dies war der erste Versuch) besteht darin, das gesamte Builtin für jeden schnellen Pfad einmal zu kopieren und die korrekte Load-/Store-Zugriffsmethode inline einzufügen. Dieser Ansatz erwies sich für Timsort als unpraktikabel, da es sich um ein großes Builtin handelt und eine Kopie für jeden schnellen Pfad insgesamt 106 KB erfordert, was für ein einzelnes Builtin viel zu viel ist.

Die endgültige Lösung ist etwas anders. Jede Load-/Store-Operation für jeden schnellen Pfad wird in ein eigenes „Mini-Builtin“ eingebettet. Sehen Sie sich das Codebeispiel an, das die „Load“-Operation für `FixedDoubleArray`s zeigt.

```torque
Load<FastDoubleElements>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  try {
    const elems: FixedDoubleArray = UnsafeCast<FixedDoubleArray>(elements);
    const value: float64 =
        LoadDoubleWithHoleCheck(elems, index) otherwise Bailout;
    return AllocateHeapNumberWithValue(value);
  }
  label Bailout {
    // Die Vorverarbeitung hat alle Lücken entfernt, indem alle Elemente
    // am Anfang des Arrays komprimiert wurden. Eine Lücke zu finden bedeutet, dass die cmp-Funktion oder
    // ToString das Array ändert.
    return Failure(sortState);
  }
}
```

Zum Vergleich: Die allgemeinste „Load“-Operation ist einfach ein Aufruf von `GetProperty`. Aber während die obige Version effizienten und schnellen Maschinencode generiert, um eine `Number` zu laden und zu konvertieren, ist `GetProperty` ein Aufruf zu einem anderen Builtin, das möglicherweise eine Prototyp-Kettennachschlag oder das Aufrufen einer Accessor-Funktion erfordert.

```js
builtin Load<ElementsAccessor : type>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  return GetProperty(context, elements, index);
}
```

Ein schneller Pfad wird dann einfach zu einer Sammlung von Funktionszeigern. Das bedeutet, dass wir nur eine Kopie des Kernalgorithmus benötigen, während wir alle relevanten Funktionszeiger einmal im Voraus einrichten. Während dies den benötigten Code-Speicher stark reduziert (bis auf 20k), geht dies auf Kosten eines indirekten Verzweigungspunkts bei jeder Zugriffsstelle. Dies wird durch die kürzliche Änderung zur Nutzung von [eingebetteten Builtins](/blog/embedded-builtins) noch verstärkt.

### Sortierstatus

![](/_img/array-sort/sort-state.svg)

Das obige Bild zeigt den „Sortierstatus“. Es ist ein `FixedArray`, das alle benötigten Dinge während der Sortierung nachverfolgt. Jedes Mal, wenn `Array#sort` aufgerufen wird, wird ein solcher Sortierstatus zugewiesen. Eintrag 4 bis 7 sind die oben besprochenen Funktionszeiger, die einen schnellen Pfad bilden.

Das „Check“-Builtin wird jedes Mal verwendet, wenn wir von benutzerdefiniertem JavaScript-Code zurückkehren, um zu überprüfen, ob wir mit dem aktuellen schnellen Pfad fortfahren können. Es verwendet dafür die „initiale Empfängermap“ und die „initiale Empfängerlänge“. Sollte der Benutzercode das aktuelle Objekt geändert haben, geben wir einfach den Sortiervorgang auf, setzen alle Zeiger auf ihre allgemeinste Version zurück und starten den Sortiervorgang neu. Der „Bailout Status“ in Slot 8 wird verwendet, um diesen Reset anzuzeigen.

Der „Vergleich“-Eintrag kann auf zwei verschiedene Builtins zeigen. Eins ruft eine benutzerdefinierte Vergleichsfunktion auf, während das andere die Standardvergleichslogik implementiert, die `toString` auf beiden Argumenten aufruft und dann eine lexikographische Vergleich ausführt.

Die restlichen Felder (mit Ausnahme der ID des schnellen Pfads) sind Timsort-spezifisch. Der Run-Stack (oben beschrieben) wird mit einer Größe von 85 initialisiert, was ausreicht, um Arrays der Länge 2<sup>64</sup> zu sortieren. Das temporäre Array wird zum Zusammenführen von Runs verwendet. Es wächst bei Bedarf, überschreitet jedoch niemals `n/2`, wobei `n` die Eingabelänge ist.

### Performance-Abwägungen

Das Verschieben der Sortierung von selbst gehostetem JavaScript zu Torque bringt Leistungsabstriche mit sich. Da `Array#sort` in Torque geschrieben ist, handelt es sich jetzt um ein statisch kompiliertes Stück Code, was bedeutet, dass wir immer noch schnelle Wege für bestimmte [`ElementsKind`s](/blog/elements-kinds) erstellen können, aber es niemals so schnell sein wird wie eine hoch optimierte TurboFan-Version, die Typ-Feedback nutzen kann. Andererseits sind wir in Fällen, in denen der Code nicht heiß genug wird, um eine JIT-Kompilierung zu rechtfertigen oder die Aufrufstelle megamorph ist, auf den Interpreter oder eine langsame/generische Version beschränkt. Das Parsen, Kompilieren und mögliche Optimieren der selbst gehosteten JavaScript-Version ist ebenfalls ein Overhead, der mit der Torque-Implementierung nicht erforderlich ist.

Auch wenn der Torque-Ansatz nicht die gleiche Spitzenleistung für die Sortierung ergibt, vermeidet er doch Leistungseinbrüche. Das Ergebnis ist eine Sortierungsleistung, die viel vorhersehbarer ist als zuvor. Denken Sie daran, dass Torque sich stark in Entwicklung befindet und neben der Zielsetzung von CSA möglicherweise in Zukunft auch TurboFan anvisiert wird, was eine JIT-Kompilierung von in Torque geschriebenem Code ermöglichen könnte.

### Mikrobenchmarks

Bevor wir mit `Array#sort` begonnen haben, haben wir viele verschiedene Mikrobenchmarks hinzugefügt, um ein besseres Verständnis der Auswirkungen der Neuimplementierung zu erhalten. Das erste Diagramm zeigt den „normalen“ Anwendungsfall der Sortierung verschiedener ElementsKinds mit einer benutzerdefinierten Vergleichsfunktion.

Denken Sie daran, dass der JIT-Compiler in diesen Fällen viel Arbeit leisten kann, da die Sortierung fast alles ist, was wir tun. Dies ermöglicht es dem optimierenden Compiler auch, die Vergleichsfunktion in der JavaScript-Version einzubetten, während wir im Torque-Fall den Aufruf-Overhead vom Builtin nach JavaScript haben. Trotzdem erzielen wir in fast allen Fällen bessere Leistungen.

![](/_img/array-sort/micro-bench-basic.svg)

Das nächste Diagramm zeigt die Auswirkungen von Timsort beim Verarbeiten von Arrays, die bereits vollständig sortiert sind oder Teilsequenzen enthalten, die auf die eine oder andere Weise bereits sortiert sind. Das Diagramm verwendet Quicksort als Basis und zeigt die Geschwindigkeitssteigerung von Timsort (bis zu 17× im Fall von „DownDown“, bei dem das Array aus zwei umgekehrt sortierten Sequenzen besteht). Wie zu sehen ist, übertrifft Timsort in allen anderen Fällen, außer im Fall von Zufallsdaten, Quicksort, selbst wenn wir `PACKED_SMI_ELEMENTS` sortieren, wo Quicksort im obigen Mikrobenchmark Timsort übertroffen hat.

![](/_img/array-sort/micro-bench-presorted.svg)

### Web-Tooling-Benchmark

Der [Web-Tooling-Benchmark](https://github.com/v8/web-tooling-benchmark) ist eine Sammlung von Workloads für Tools, die üblicherweise von Webentwicklern wie Babel und TypeScript verwendet werden. Das Diagramm verwendet JavaScript Quicksort als Grundlage und vergleicht die Geschwindigkeitssteigerung von Timsort damit. In fast allen Benchmarks behalten wir die gleiche Leistung, mit Ausnahme von Chai.

![](/_img/array-sort/web-tooling-benchmark.svg)

Der Chai-Benchmark verbringt *ein Drittel* seiner Zeit in einer einzigen Vergleichsfunktion (einer Zeichenkettenabstandsberechnung). Der Benchmark ist die Testreihe von Chai selbst. Aufgrund der Daten benötigt Timsort in diesem Fall einige weitere Vergleiche, was sich stärker auf die Gesamtlaufzeit auswirkt, da ein so großer Anteil der Zeit in dieser speziellen Vergleichsfunktion verbracht wird.

### Auswirkung auf den Speicher

Die Analyse von V8-Heapsnapshots beim Besuch von etwa 50 Websites (sowohl auf Mobilgeräten als auch auf Desktops) zeigte keine Speicherregressionen oder -verbesserungen. Einerseits ist dies überraschend: Der Wechsel von Quicksort zu Timsort führte zur Notwendigkeit eines temporären Arrays zum Zusammenführen von Runs, das viel größer werden kann als die temporären Arrays, die für das Sampling verwendet werden. Andererseits sind diese temporären Arrays sehr kurzlebig (nur für die Dauer des `sort`-Aufrufs) und können in V8s neuer Speicherplatz schnell zugewiesen und verworfen werden.

## Fazit

Zusammenfassend fühlen wir uns viel besser bei den algorithmischen Eigenschaften und dem vorhersehbaren Leistungsverhalten einer in Torque implementierten Timsort. Timsort ist ab V8 v7.0 und Chrome 70 verfügbar. Viel Spaß beim Sortieren!
