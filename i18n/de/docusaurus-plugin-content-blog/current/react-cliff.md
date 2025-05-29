---
title: "Die Geschichte einer V8-Leistungsgrenze in React"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)) und Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "benedikt-meurer"
  - "mathias-bynens"
date: 2019-08-28 16:45:00
tags:
  - internals
  - presentations
description: "Dieser Artikel beschreibt, wie V8 optimale Speicherrepräsentationen für verschiedene JavaScript-Werte auswählt und wie sich dies auf die Shape-Maschine auswirkt – all dies hilft, eine jüngste V8-Leistungsgrenze im React-Kern zu erklären."
tweet: "1166723359696130049"
---
[Zuvor](https://mathiasbynens.be/notes/shapes-ics) haben wir diskutiert, wie JavaScript-Engines Objekt- und Array-Zugriffe durch die Verwendung von Shapes und Inline-Caches optimieren, und wir haben untersucht, [wie Engines den Prototyp-Property-Zugang beschleunigen](https://mathiasbynens.be/notes/prototypes). Dieser Artikel beschreibt, wie V8 optimale Speicherrepräsentationen für verschiedene JavaScript-Werte auswählt und wie sich dies auf die Shape-Maschine auswirkt – all dies hilft, [eine jüngste V8-Leistungsgrenze im React-Kern](https://github.com/facebook/react/issues/14365) zu erklären.

<!--truncate-->
:::note
**Hinweis:** Wenn Sie es vorziehen, eine Präsentation anzusehen, anstatt Artikel zu lesen, genießen Sie das Video unten! Wenn nicht, überspringen Sie das Video und lesen Sie weiter.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">„JavaScript-Engine-Grundlagen: das Gute, das Schlechte und das Hässliche“</a>, präsentiert von Mathias Bynens und Benedikt Meurer auf der AgentConf 2019.</figcaption>
</figure>

## JavaScript-Typen

Jeder JavaScript-Wert hat genau einen der (derzeit) acht verschiedenen Typen: `Number`, `String`, `Symbol`, `BigInt`, `Boolean`, `Undefined`, `Null` und `Object`.

![](/_img/react-cliff/01-javascript-types.svg)

Mit einer bemerkenswerten Ausnahme sind diese Typen in JavaScript über den `typeof`-Operator beobachtbar:

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null` gibt `'object'` zurück und nicht `'null'`, obwohl `Null` ein eigener Typ ist. Um zu verstehen, warum, bedenken Sie, dass die Menge aller JavaScript-Typen in zwei Gruppen unterteilt ist:

- _Objekte_ (d. h. der `Object`-Typ)
- _Primitive_ (d. h. jeder Wert, der kein Objekt ist)

Als solches bedeutet `null` „kein Objektwert“, während `undefined` „kein Wert“ bedeutet.

![](/_img/react-cliff/02-primitives-objects.svg)

Entsprechend diesem Gedankengang hat Brendan Eich JavaScript entworfen, sodass `typeof` für alle Werte auf der rechten Seite, also alle Objekte und `null`-Werte, `'object'` zurückgibt, im Geiste von Java. Daher ist `typeof null === 'object'`, obwohl die Spezifikation einen separaten `Null`-Typ hat.

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## Wertrepräsentation

JavaScript-Engines müssen in der Lage sein, beliebige JavaScript-Werte im Speicher darzustellen. Es ist jedoch wichtig zu beachten, dass der JavaScript-Typ eines Wertes unabhängig davon ist, wie JavaScript-Engines diesen Wert im Speicher darstellen.

Der Wert `42` hat beispielsweise den Typ `number` in JavaScript.

```js
typeof 42;
// → 'number'
```

Es gibt mehrere Möglichkeiten, eine ganze Zahl wie `42` im Speicher darzustellen:

:::table-wrapper
| Darstellung                       | Bits                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Zweierkomplement 8-Bit            | `0010 1010`                                                                       |
| Zweierkomplement 32-Bit           | `0000 0000 0000 0000 0000 0000 0010 1010`                                         |
| Gepackt binär-codierte Dezimalzahl (BCD) | `0100 0010`                                                                       |
| 32-Bit IEEE-754 Gleitkommazahl    | `0100 0010 0010 1000 0000 0000 0000 0000`                                         |
| 64-Bit IEEE-754 Gleitkommazahl    | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

Der ECMAScript-Standard definiert Zahlen als 64-Bit-Gleitkommawerte, auch bekannt als _Double Precision Floating Point_ oder _Float64_. Das bedeutet jedoch nicht, dass JavaScript-Engines Zahlen immer in Float64-Darstellung speichern — dies wäre äußerst ineffizient! Engines können andere interne Darstellungen wählen, solange das beobachtbare Verhalten genau mit Float64 übereinstimmt.

Die meisten Zahlen in realen JavaScript-Anwendungen sind [gültige ECMAScript-Array-Indizes](https://tc39.es/ecma262/#array-index), d. h. Ganzzahlen im Bereich von 0 bis 2³²−2.

```js
array[0]; // Kleinster möglicher Array-Index.
array[42];
array[2**32-2]; // Größter möglicher Array-Index.
```

JavaScript-Engines können eine optimale Speicherrepräsentation für solche Zahlen wählen, um Code zu optimieren, der Array-Elemente über einen Index abruft. Für den Prozessor muss der Array-Index im [Zweierkomplement](https://de.wikipedia.org/wiki/Zweierkomplement) verfügbar sein, um die Speicherzugriffsoperation durchführen zu können. Die Darstellung von Array-Indizes als Float64 wäre verschwenderisch, da die Engine dann bei jedem Zugriff auf ein Array-Element zwischen Float64 und Zweierkomplement hin- und herkonvertieren müsste.

Die 32-Bit-Zweierkomplement-Darstellung ist nicht nur nützlich für Array-Operationen. Im Allgemeinen **führen Prozessoren Ganzzahloperationen viel schneller aus als Gleitkommaoperationen**. Deshalb ist die erste Schleife im nächsten Beispiel leicht doppelt so schnell wie die zweite Schleife.

```js
for (let i = 0; i < 1000; ++i) {
  // schnell 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // langsam 🐌
}
```

Das Gleiche gilt auch für Operationen. Die Leistung des Modulo-Operators im nächsten Codestück hängt davon ab, ob Ganzzahlen verwendet werden oder nicht.

```js
const remainder = value % divisor;
// Schnell 🚀, wenn `value` und `divisor` als Ganzzahlen dargestellt sind,
// langsam 🐌, sonst.
```

Wenn beide Operanden als Ganzzahlen dargestellt sind, kann die CPU das Ergebnis sehr effizient berechnen. V8 hat zusätzliche Schnellpfade für Fälle, in denen der `divisor` eine Potenz von zwei ist. Für Werte, die als Gleitkommazahlen dargestellt sind, ist die Berechnung wesentlich komplexer und dauert viel länger.

Da Ganzzahloperationen im Allgemeinen viel schneller ausgeführt werden als Gleitkommaoperationen, könnte man meinen, dass Engines für alle Ganzzahlen und alle Ergebnisse von Ganzzahloperationen einfach durchgehend Zweierkomplement verwenden könnten. Leider würde das gegen die ECMAScript-Spezifikation verstoßen! ECMAScript standardisiert Float64, und daher **erzeugen bestimmte Ganzzahloperationen tatsächlich Gleitkommazahlen**. Es ist wichtig, dass JS-Engines in solchen Fällen die richtigen Ergebnisse erzeugen.

```js
// Float64 hat einen sicheren Ganzzahlbereich von 53 Bits. Darüber hinaus
// geht die Präzision verloren.
2**53 === 2**53+1;
// → true

// Float64 unterstützt negative Nullen, daher muss -1 * 0 -0 sein, aber
// es gibt keine Möglichkeit, negative Null im Zweierkomplement darzustellen.
-1*0 === -0;
// → true

// Float64 hat Unendlichkeiten, die durch Division
// durch Null erzeugt werden können.
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64 hat auch NaNs.
0/0 === NaN;
```

Obwohl die Werte auf der linken Seite Ganzzahlen sind, sind alle Werte auf der rechten Seite Gleitkommazahlen. Deshalb können die oben genannten Operationen mit einem 32-Bit-Zweierkomplement nicht korrekt ausgeführt werden. JavaScript-Engines müssen besonders darauf achten, dass Ganzzahloperationen angemessen zurückgesetzt werden, um die „fancy Float64“-Ergebnisse zu erzeugen.

Für kleine Ganzzahlen im 31-Bit-Ganzzahlbereich verwendet V8 eine spezielle Darstellung namens `Smi`. Alles, was kein `Smi` ist, wird als `HeapObject` dargestellt, das die Adresse einer Entität im Speicher ist. Für Zahlen verwenden wir eine spezielle Art von `HeapObject`, die sogenannte `HeapNumber`, um Zahlen darzustellen, die nicht im `Smi`-Bereich liegen.

```js
 -Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

Wie das obige Beispiel zeigt, werden einige JavaScript-Zahlen als `Smi`s und andere als `HeapNumber`s dargestellt. V8 ist speziell für `Smi`s optimiert, da kleine Ganzzahlen in realen JavaScript-Programmen so häufig vorkommen. `Smi`s müssen nicht als dedizierte Speicherentitäten zugewiesen werden und ermöglichen im Allgemeinen schnelle Ganzzahloperationen.

Die wichtige Erkenntnis hier ist, dass **sogar Werte mit demselben JavaScript-Typ hinter den Kulissen auf völlig unterschiedliche Weise dargestellt werden können**, als Optimierung.

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

So funktioniert das unter der Haube. Angenommen, Sie haben das folgende Objekt:

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

Der Wert `42` für `x` kann als `Smi` kodiert werden, sodass er direkt im Objekt selbst gespeichert werden kann. Der Wert `4.2` hingegen benötigt eine separate Entität, um den Wert zu speichern, und das Objekt zeigt auf diese Entität.

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

Angenommen, wir führen das folgende JavaScript-Snippet aus:

```js
o.x += 10;
// → o.x ist jetzt 52
o.y += 1;
// → o.y ist jetzt 5.2
```

In diesem Fall kann der Wert von `x` direkt aktualisiert werden, da der neue Wert `52` ebenfalls in den `Smi`-Bereich passt.

![](/_img/react-cliff/05-update-smi.svg)

Die neue Wertsetzung von `y=5.2` passt jedoch nicht in ein `Smi` und unterscheidet sich auch vom vorherigen Wert `4.2`, sodass V8 eine neue `HeapNumber`-Entität für die Zuweisung an `y` erstellen muss.

![](/_img/react-cliff/06-update-heapnumber.svg)

`HeapNumber`s sind nicht veränderbar, was bestimmte Optimierungen ermöglicht. Zum Beispiel, wenn wir `y`s Wert `x` zuweisen:

```js
o.x = o.y;
// → o.x ist jetzt 5.2
```

…können wir jetzt einfach auf das gleiche `HeapNumber` verweisen, anstatt ein neues für den gleichen Wert zu erstellen.

![](/_img/react-cliff/07-heapnumbers.svg)

Ein Nachteil der Unveränderbarkeit von `HeapNumber`s ist, dass es langsam wäre, Felder mit Werten außerhalb des `Smi`-Bereichs häufig zu aktualisieren, wie im folgenden Beispiel:

```js
// Erstelle eine `HeapNumber`-Instanz.
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // Erstelle eine zusätzliche `HeapNumber`-Instanz.
  o.x += 1;
}
```

Die erste Zeile würde eine `HeapNumber`-Instanz mit dem Anfangswert `0.1` erstellen. Der Schleifeninhalt ändert diesen Wert zu `1.1`, `2.1`, `3.1`, `4.1` und schließlich `5.1`, wobei insgesamt sechs `HeapNumber`-Instanzen erstellt werden, von denen fünf Müll sind, sobald die Schleife beendet ist.

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

Um dieses Problem zu vermeiden, bietet V8 eine Möglichkeit, Zahlenfelder außerhalb des `Smi`-Bereichs auch direkt zu aktualisieren, als Optimierung. Wenn ein numerisches Feld Werte außerhalb des `Smi`-Bereichs hält, markiert V8 dieses Feld als `Double`-Feld in der Struktur und erstellt einen sogenannten `MutableHeapNumber`, der den tatsächlichen Wert als Float64 kodiert hält.

![](/_img/react-cliff/09-mutableheapnumber.svg)

Wenn sich der Wert Ihres Feldes ändert, muss V8 keinen neuen `HeapNumber` mehr erstellen, sondern kann stattdessen den `MutableHeapNumber` direkt aktualisieren.

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

Es gibt jedoch auch hier einen Haken. Da sich der Wert eines `MutableHeapNumber` ändern kann, ist es wichtig, dass diese nicht weitergegeben werden.

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

Wenn Sie beispielsweise `o.x` einer anderen Variablen `y` zuweisen, möchten Sie nicht, dass sich der Wert von `y` ändert, wenn `o.x` sich das nächste Mal ändert — das wäre ein Verstoß gegen die JavaScript-Spezifikation! Wenn `o.x` abgerufen wird, muss die Zahl in ein normales `HeapNumber` zurückverpackt werden, bevor sie `y` zugewiesen wird.

Für Fließkommazahlen führt V8 die oben erwähnte „Boxing“-Magie hinter den Kulissen aus. Aber für kleine Ganzzahlen wäre es ineffizient, den Ansatz des `MutableHeapNumber` zu verwenden, da `Smi` eine effizientere Darstellung ist.

```js
const object = { x: 1 };
// → keine „Boxing“-Operation für `x` im Objekt

object.x += 1;
// → aktualisiere den Wert von `x` im Objekt
```

Um die Ineffizienz zu vermeiden, müssen wir für kleine Ganzzahlen lediglich das Feld in der Struktur als `Smi`-Darstellung markieren und einfach den Zahlenwert direkt aktualisieren, solange er in den Bereich der kleinen Ganzzahlen passt.

![](/_img/react-cliff/12-smi-no-boxing.svg)

## Strukturveralterung und Migrationen

Was passiert, wenn ein Feld zunächst ein `Smi` enthält, später jedoch eine Zahl außerhalb des Bereichs für kleine Ganzzahlen hält? Wie in diesem Fall, mit zwei Objekten, die beide die gleiche Struktur verwenden, bei der `x` anfangs als `Smi` dargestellt wird:

```js
const a = { x: 1 };
const b = { x: 2 };
// → Objekte haben `x` jetzt als `Smi`-Feld

b.x = 0.2;
// → `b.x` wird jetzt als `Double` dargestellt

y = a.x;
```

Dies beginnt mit zwei Objekten, die auf die gleiche Struktur zeigen, bei der `x` als `Smi`-Darstellung markiert ist:

![](/_img/react-cliff/13-shape.svg)

Wenn sich `b.x` zu einer `Double`-Darstellung ändert, erstellt V8 eine neue Struktur, bei der `x` als `Double`-Darstellung zugewiesen wird, und die auf die leere Struktur zurückweist. V8 erstellt auch einen `MutableHeapNumber`, um den neuen Wert `0.2` für die `x`-Eigenschaft zu halten. Anschließend aktualisieren wir das Objekt `b`, um auf diese neue Struktur zu zeigen, und ändern den Slot im Objekt, um auf den zuvor erstellten `MutableHeapNumber` bei Offset 0 zu zeigen. Schließlich markieren wir die alte Struktur als veraltet und entkoppeln sie vom Übergangsknoten. Dies wird durch einen neuen Übergang für `'x'` von der leeren Struktur zur neu erstellten Struktur erreicht.

![](/_img/react-cliff/14-shape-transition.svg)

Wir können die alte Struktur zu diesem Zeitpunkt nicht vollständig entfernen, da sie weiterhin von `a` verwendet wird, und es wäre viel zu teuer, den Speicher zu durchsuchen, um alle Objekte zu finden, die auf die alte Struktur zeigen, und sie sofort zu aktualisieren. Stattdessen macht V8 dies nach Bedarf: Jeder Eigenschaftszugriff oder jede Zuweisung an `a` migriert es zunächst auf die neue Struktur. Die Idee ist, die veraltete Struktur schließlich unerreichbar zu machen und sie durch den Garbage Collector entfernen zu lassen.

![](/_img/react-cliff/15-shape-deprecation.svg)

Ein komplizierterer Fall tritt auf, wenn das Feld, das die Darstellung ändert, _nicht_ das letzte in der Kette ist:

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

In diesem Fall muss V8 die sogenannte _Split-Struktur_ finden, die die letzte Struktur in der Kette vor der Einführung der betreffenden Eigenschaft ist. Hier ändern wir `y`, also müssen wir die letzte Struktur finden, die `y` nicht hat, was in unserem Beispiel die Struktur ist, die `x` eingeführt hat.

![](/_img/react-cliff/16-split-shape.svg)

Ausgehend von der geteilten Form erstellen wir eine neue Übergangskette für `y`, die alle vorherigen Übergänge wiedergibt, jedoch mit `'y'`, das nun als `Double`-Darstellung gekennzeichnet ist. Und wir verwenden diese neue Übergangskette für `y`, wobei der alte Teilbaum als veraltet gekennzeichnet wird. Im letzten Schritt migrieren wir die Instanz `o` zur neuen Form und verwenden eine `MutableHeapNumber`, um den Wert von `y` jetzt zu halten. Auf diese Weise nehmen neue Objekte nicht den alten Weg, und sobald alle Verweise auf die alte Form entfernt sind, verschwindet der veraltete Formteil des Baums.

## Erweiterbarkeits- und Integritäts-Stufenübergänge

`Object.preventExtensions()` verhindert, dass einer Objekt jemals neue Eigenschaften hinzugefügt werden. Wenn Sie es versuchen, wird eine Ausnahme ausgelöst. (Wenn Sie sich nicht im strengen Modus befinden, wird keine Ausnahme ausgelöst, sondern es geschieht stillschweigend nichts.)

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: Kann die Eigenschaft y nicht hinzufügen;
//             object ist nicht erweiterbar
```

`Object.seal` tut dasselbe wie `Object.preventExtensions`, aber es kennzeichnet auch alle Eigenschaften als nicht konfigurierbar, was bedeutet, dass Sie sie nicht löschen oder ihre Enumerierbarkeit, Konfigurierbarkeit oder Schreibbarkeit ändern können.

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: Kann die Eigenschaft y nicht hinzufügen;
//             object ist nicht erweiterbar
delete object.x;
// TypeError: Kann die Eigenschaft x nicht löschen
```

`Object.freeze` tut dasselbe wie `Object.seal`, verhindert aber auch, dass die Werte bestehender Eigenschaften geändert werden, indem sie als nicht schreibbar gekennzeichnet werden.

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: Kann die Eigenschaft y nicht hinzufügen;
//             object ist nicht erweiterbar
delete object.x;
// TypeError: Kann die Eigenschaft x nicht löschen
object.x = 3;
// TypeError: Kann nicht einer schreibgeschützten Eigenschaft x zuweisen
```

Betrachten wir dieses konkrete Beispiel mit zwei Objekten, die beide eine einzelne Eigenschaft `x` haben, und dann verhindern wir, dass weitere Erweiterungen am zweiten Objekt vorgenommen werden.

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

Es beginnt wie wir bereits wissen, mit einem Übergang von der leeren Form zu einer neuen Form, die die Eigenschaft `'x'` (dargestellt als `Smi`) enthält. Wenn wir Erweiterungen von `b` verhindern, führen wir einen speziellen Übergang zu einer neuen Form durch, die als nicht erweiterbar gekennzeichnet ist. Dieser spezielle Übergang führt keine neue Eigenschaft ein — es ist wirklich nur eine Markierung.

![](/_img/react-cliff/17-shape-nonextensible.svg)

Beachtest, wie wir die Form mit `x` nicht einfach vor Ort aktualisieren können, da sie von dem anderen Objekt `a` benötigt wird, das noch erweiterbar ist.

## Das React-Leistungsproblem

Lassen Sie uns alles zusammenfügen und verwenden, was wir gelernt haben, um [das kürzlich aufgetretene React-Problem #14365](https://github.com/facebook/react/issues/14365) zu verstehen. Als das React-Team eine echte Anwendung analysierte, entdeckten sie einen seltsamen Leistungseinbruch in V8, der den Kern von React betraf. Hier ist eine vereinfachte Nachstellung des Fehlers:

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

Wir haben ein Objekt mit zwei Feldern, die über die `Smi`-Darstellung verfügen. Wir verhindern weitere Erweiterungen des Objekts und zwingen letztendlich das zweite Feld zur `Double`-Darstellung.

Wie wir zuvor gelernt haben, wird ungefähr folgendes Setup erstellt:

![](/_img/react-cliff/18-repro-shape-setup.svg)

Beide Eigenschaften sind mit der `Smi`-Darstellung gekennzeichnet, und der letzte Übergang ist der Erweiterbarkeitsübergang, um die Form als nicht erweiterbar zu markieren.

Nun müssen wir `y` auf die `Double`-Darstellung ändern, was bedeutet, dass wir erneut beginnen müssen, die geteilte Form zu finden. In diesem Fall ist es die Form, die `x` eingeführt hat. Aber jetzt gerät V8 durcheinander, da die geteilte Form erweiterbar war, während die aktuelle Form als nicht erweiterbar markiert war. Und V8 wusste wirklich nicht, wie es die Übergänge in diesem Fall korrekt wiedergeben sollte. V8 hat im Wesentlichen aufgehört, zu versuchen, dies zu verstehen, und stattdessen eine separate Form erstellt, die nicht mit dem bestehenden Formbaum verbunden ist und nicht mit anderen Objekten geteilt wird. Betrachten Sie es als eine _verwaiste Form_:

![](/_img/react-cliff/19-orphaned-shape.svg)

Man kann sich vorstellen, dass es ziemlich schlecht ist, wenn dies bei vielen Objekten passiert, da dies das gesamte Formsystem nutzlos macht.

Im Fall von React ist Folgendes passiert: Jeder `FiberNode` verfügt über einige Felder, die Zeitstempel speichern sollen, wenn die Profilerstellung aktiviert ist.

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

Diese Felder (wie `actualStartTime`) werden mit `0` oder `-1` initialisiert und beginnen somit mit der `Smi`-Darstellung. Später werden jedoch tatsächliche Gleitpunkt-Zeitstempel von [`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now) in diesen Feldern gespeichert, wodurch sie in die `Double`-Darstellung wechseln, da sie nicht in ein `Smi` passen. Außerdem verhindert React Erweiterungen der `FiberNode`-Instanzen.

Anfangs sah das obige vereinfachte Beispiel so aus:

![](/_img/react-cliff/20-fibernode-shape.svg)

Es gibt zwei Instanzen, die einen Formbaum gemeinsam nutzen, alles funktioniert wie vorgesehen. Aber dann, als Sie den eigentlichen Zeitstempel speichern, gerät V8 durcheinander, wenn es die geteilte Form findet:

![](/_img/react-cliff/21-orphan-islands.svg)

V8 weist `node1` eine neue verwaiste Shape zu, und das gleiche passiert `node2` später, was zu zwei _verwaisten Inseln_ führt, jede mit ihren eigenen disjunkten Shapes. Viele React-Apps aus der realen Welt haben nicht nur zwei, sondern Zehntausende solcher `FiberNode`s. Wie man sich vorstellen kann, war diese Situation nicht besonders förderlich für die Leistung von V8.

Glücklicherweise [haben wir diesen Leistungseinbruch behoben](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/) in [V8 v7.4](/blog/v8-release-74), und wir untersuchen Wege, [um Veränderungen der Feldrepräsentation günstiger zu machen](https://bit.ly/v8-in-place-field-representation-changes), um verbleibende Leistungseinbrüche zu beseitigen. Mit der Korrektur macht V8 jetzt das Richtige:

![](/_img/react-cliff/22-fix.svg)

Die beiden `FiberNode`-Instanzen verweisen auf die nicht erweiterbare Shape, in der `'actualStartTime'` ein `Smi`-Feld ist. Wenn die erste Zuweisung zu `node1.actualStartTime` stattfindet, wird eine neue Übergangskette erstellt und die vorherige Kette wird als veraltet markiert:

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

Beachten Sie, wie der Erweiterbarkeitstransition jetzt ordnungsgemäß in der neuen Kette wiedergegeben wird.

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

Nach der Zuweisung zu `node2.actualStartTime` verweisen beide Knoten auf die neue Shape, und der veraltete Teil des Übergangsbaums kann vom Garbage Collector bereinigt werden.

:::note
**Hinweis:** Sie könnten denken, dass all diese Shape-Veraltung/Migration komplex ist, und Sie hätten recht. Tatsächlich haben wir den Verdacht, dass auf Websites aus der realen Welt mehr Probleme (hinsichtlich Leistung, Speicherverbrauch und Komplexität) verursacht werden, als es hilft, insbesondere da wir mit [Pointer-Komprimierung](https://bugs.chromium.org/p/v8/issues/detail?id=7703) nicht mehr in der Lage sein werden, Double-Wert-Felder in-line im Objekt zu speichern. Daher hoffen wir, [den Shape-Veraltungsmechanismus bei V8 vollständig zu entfernen](https://bugs.chromium.org/p/v8/issues/detail?id=9606). Man könnte sagen, er ist _\*setzt die Sonnenbrille auf\*_ veraltet. _YEEEAAAHHH…_
:::

Das React-Team [hat das Problem auf seiner Seite entschärft](https://github.com/facebook/react/pull/14383), indem sichergestellt wurde, dass alle Zeit- und Dauerfelder auf `FiberNode`s von Anfang an eine `Double`-Repräsentation verwenden:

```js
class FiberNode {
  constructor() {
    // Erzwinge `Double`-Repräsentation von Anfang an.
    this.actualStartTime = Number.NaN;
    // Später können Sie den gewünschten Wert trotzdem initialisieren:
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

Anstatt `Number.NaN` könnte jeder Fließkommawert verwendet werden, der nicht in den `Smi`-Bereich passt. Beispiele sind `0.000001`, `Number.MIN_VALUE`, `-0` und `Infinity`.

Es ist erwähnenswert, dass der konkrete React-Bug V8-spezifisch war und dass Entwickler im Allgemeinen nicht für eine spezifische Version einer JavaScript-Engine optimieren sollten. Dennoch ist es hilfreich, einen Hinweis zu haben, wenn Dinge nicht funktionieren.

Denken Sie daran, dass die JavaScript-Engine ein wenig Magie im Hintergrund ausführt, und Sie können ihr helfen, indem Sie nicht wie möglich Typen mischen. Zum Beispiel initialisieren Sie Ihre numerischen Felder nicht mit `null`, da dies alle Vorteile der Feldrepräsentierungsverfolgung deaktiviert und Ihren Code lesbarer macht:

```js
// Mach das nicht!
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

Mit anderen Worten: **Schreiben Sie lesbaren Code, und die Leistung wird folgen!**

## Fazit

In diesem Deep-Dive haben wir Folgendes behandelt:

- JavaScript unterscheidet zwischen „Primitiven“ und „Objekten“, und `typeof` ist ein Lügner.
- Selbst Werte mit demselben JavaScript-Typ können im Hintergrund unterschiedliche Repräsentationen haben.
- V8 versucht, die optimale Repräsentation für jede Eigenschaft in Ihren JavaScript-Programmen zu finden.
- Wir haben besprochen, wie V8 mit Shape-Veraltungen und -Migrationen umgeht, einschließlich Erweiterbarkeitstransitionen.

Basierend auf diesen Erkenntnissen haben wir einige praktische JavaScript-Codierungstipps identifiziert, die die Leistung verbessern können:

- Initialisieren Sie Ihre Objekte immer auf die gleiche Weise, damit Shapes effektiv sein können.
- Wählen Sie sinnvolle Anfangswerte für Ihre Felder aus, um JavaScript-Engines bei der Auswahl von Repräsentationen zu unterstützen.
