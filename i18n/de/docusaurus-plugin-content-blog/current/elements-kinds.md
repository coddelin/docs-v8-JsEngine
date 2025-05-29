---
title: "Elementarten in V8"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-09-12 13:33:37
tags:
  - internals
  - präsentationen
description: "Dieser technische Deep-Dive erklärt, wie V8 Operationen auf Arrays im Hintergrund optimiert und was das für JavaScript-Entwickler bedeutet."
tweet: "907608362191376384"
---
:::note
**Hinweis:** Wenn Sie es bevorzugen, eine Präsentation anzusehen, anstatt Artikel zu lesen, genießen Sie das folgende Video!
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

JavaScript-Objekte können beliebige Eigenschaften haben, die ihnen zugeordnet sind. Die Namen von Objekteigenschaften können jedes Zeichen enthalten. Einer der interessanten Fälle, die eine JavaScript-Engine optimieren kann, sind Eigenschaften, deren Namen rein numerisch sind, insbesondere [Array-Indizes](https://tc39.es/ecma262/#array-index).

<!--truncate-->
In V8 werden Eigenschaften mit ganzzahligen Namen – die häufigste Form davon sind durch den `Array`-Konstruktor erzeugte Objekte – speziell behandelt. Obwohl diese nummerisch indizierten Eigenschaften in vielen Fällen genauso wie andere Eigenschaften funktionieren, entscheidet sich V8 dafür, sie aus Optimierungsgründen getrennt von nicht-numerischen Eigenschaften zu speichern. Intern nennt V8 diese Eigenschaften sogar anders: _Elemente_. Objekte haben [Eigenschaften](/blog/fast-properties), die auf Werte abbilden, während Arrays Indizes haben, die auf Elemente abbilden.

Obwohl diese Interna JavaScript-Entwicklern nie direkt zugänglich gemacht werden, erklären sie, warum bestimmte Code-Muster schneller sind als andere.

## Häufige Elementarten

Während der Ausführung von JavaScript-Code verfolgt V8, welche Art von Elementen jedes Array enthält. Diese Informationen ermöglichen es V8, alle Operationen auf das Array speziell für diesen Elementtyp zu optimieren. Wenn Sie beispielsweise `reduce`, `map` oder `forEach` für ein Array aufrufen, kann V8 diese Operationen basierend auf dem Elementtyp des Arrays optimieren.

Betrachten wir beispielsweise dieses Array:

```js
const array = [1, 2, 3];
```

Welche Art von Elementen enthält es? Wenn Sie den `typeof`-Operator fragen würden, würde er Ihnen sagen, dass das Array `number` enthält. Auf Sprachebene erhalten Sie nur diese Information: JavaScript unterscheidet nicht zwischen Ganzzahlen, Fließkommazahlen und Double-Werten – sie sind alle einfach nur `number`. Auf Engine-Ebene können wir jedoch präzisere Unterscheidungen treffen. Der Elementtyp für dieses Array ist `PACKED_SMI_ELEMENTS`. In V8 bezieht sich der Begriff Smi auf das spezielle Format, das zur Speicherung kleiner Ganzzahlen verwendet wird. (Den Teil `PACKED` werden wir gleich erklären.)

Wenn später eine Fließkommazahl zu demselben Array hinzugefügt wird, wechselt es zu einer allgemeineren Elementart:

```js
const array = [1, 2, 3];
// Elementtyp: PACKED_SMI_ELEMENTS
array.push(4.56);
// Elementtyp: PACKED_DOUBLE_ELEMENTS
```

Das Hinzufügen eines String-Literals zum Array ändert seinen Elementtyp erneut.

```js
const array = [1, 2, 3];
// Elementtyp: PACKED_SMI_ELEMENTS
array.push(4.56);
// Elementtyp: PACKED_DOUBLE_ELEMENTS
array.push('x');
// Elementtyp: PACKED_ELEMENTS
```

Wir haben bisher drei unterschiedliche Elementarten gesehen, mit den folgenden Grundtypen:

- <b>Sm</b>all <b>i</b>ntegers, bekannt als Smi.
- Double-Werte, für Fließkommazahlen und Ganzzahlen, die nicht als Smi dargestellt werden können.
- Reguläre Elemente, für Werte, die nicht als Smi oder Double dargestellt werden können.

Beachten Sie, dass Double-Werte eine allgemeinere Variante von Smi darstellen und reguläre Elemente eine weitere Verallgemeinerung auf Basis von Double-Werten sind. Die Menge der Zahlen, die als Smi dargestellt werden können, ist eine Teilmenge der Zahlen, die als Double dargestellt werden können.

Wichtig ist hier, dass Übergänge von Elementarten nur in eine Richtung erfolgen: von spezifisch (z. B. `PACKED_SMI_ELEMENTS`) zu allgemeiner (z. B. `PACKED_ELEMENTS`). Sobald ein Array als `PACKED_ELEMENTS` markiert ist, kann es beispielsweise nicht wieder zu `PACKED_DOUBLE_ELEMENTS` zurückkehren.

Bis hierher haben wir Folgendes gelernt:

- V8 weist jedem Array eine Elementart zu.
- Die Elementart eines Arrays ist nicht festgelegt – sie kann zur Laufzeit geändert werden. Im früheren Beispiel haben wir die Übergänge von `PACKED_SMI_ELEMENTS` zu `PACKED_ELEMENTS` gesehen.
- Übergänge von Elementarten können nur von spezifischen Arten zu allgemeineren Arten erfolgen.

## `PACKED` vs. `HOLEY` Arten

Bisher haben wir uns nur mit dichten oder gepackten Arrays beschäftigt. Das Erzeugen von Lücken im Array (d. h. das Array wird spärlich) wertet die Elementart auf ihre „löchrige“ Variante ab:

```js
const array = [1, 2, 3, 4.56, 'x'];
// Elementtyp: PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5] bis array[8] sind jetzt Lücken
// Elementtyp: HOLEY_ELEMENTS
```

V8 macht diesen Unterschied, weil Operationen auf kompakten Arrays aggressiver optimiert werden können als Operationen auf löchrigen Arrays. Bei kompakten Arrays können die meisten Operationen effizient durchgeführt werden. Im Vergleich dazu erfordern Operationen auf löchrigen Arrays zusätzliche Prüfungen und teure Nachschläge in der Prototypen-Kette.

Jede der grundlegenden Elementarten, die wir bisher gesehen haben (d.h. Smis, Doubles und reguläre Elemente), kommt in zwei Varianten: der kompakten und der löchrigen Version. Nicht nur können wir von, sagen wir, `PACKED_SMI_ELEMENTS` zu `PACKED_DOUBLE_ELEMENTS` wechseln, sondern auch von jeder `PACKED` Art zu ihrem löchrigen Gegenstück.

Zusammenfassung:

- Die häufigsten Elementarten gibt es in den Varianten `PACKED` und `HOLEY`.
- Operationen auf kompakten Arrays sind effizienter als Operationen auf löchrigen Arrays.
- Elementarten können von der `PACKED`-Version zur `HOLEY`-Version wechseln.

## Das Elementarten-Gitter

V8 implementiert dieses Tag-Übergangssystem als ein [Gitter](https://de.wikipedia.org/wiki/Gitter_(Ordnungstheorie)). Hier eine vereinfachte Visualisierung mit nur den häufigsten Elementarten:

![](/_img/elements-kinds/lattice.svg)

Es ist nur möglich, im Gitter nach unten zu wechseln. Sobald eine einzige Gleitkommazahl zu einem Array von Smis hinzugefügt wird, wird es als DOUBLE markiert, auch wenn die Gleitkommazahl später durch ein Smi überschrieben wird. Ebenso bleibt ein Array dauerhaft als löchrig markiert, wenn einmal eine Lücke geschaffen wurde, auch wenn diese später wieder gefüllt wird.

:::note
**Aktualisierung @ 28.02.2025:** Es gibt jetzt eine Ausnahme [speziell für `Array.prototype.fill`](https://chromium-review.googlesource.com/c/v8/v8/+/6285929).
:::

V8 unterscheidet derzeit [21 verschiedene Elementarten](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d), von denen jede eigene Optimierungsmöglichkeiten bietet.

Im Allgemeinen ermöglichen spezifischere Elementarten feinere Optimierungen. Je weiter unten die Elementart im Gitter ist, desto langsamer könnten Manipulationen des Objekts sein. Für optimale Leistung sollten unnötige Übergänge zu weniger spezifischen Typen vermieden werden – bleiben Sie bei der spezifischsten, die für Ihre Situation zutrifft.

## Leistungstipps

In den meisten Fällen funktioniert das Tracking der Elementarten unsichtbar im Hintergrund, und Sie müssen sich nicht darum kümmern. Aber hier sind einige Dinge, die Sie tun können, um den größtmöglichen Nutzen aus dem System zu ziehen.

### Vermeiden Sie das Lesen jenseits der Länge des Arrays

Etwas unerwartet (angesichts des Titels dieses Beitrags) ist unser wichtigster Leistungstipp nicht direkt mit dem Tracking der Elementarten verbunden (obwohl das, was im Hintergrund passiert, etwas ähnlich ist). Das Lesen über die Länge eines Arrays hinaus kann überraschende Auswirkungen auf die Leistung haben, z.B. das Lesen von `array[42]`, wenn `array.length === 5`. In diesem Fall liegt der Array-Index `42` außerhalb des Bereichs, die Eigenschaft ist nicht im Array selbst vorhanden, und die JavaScript-Engine muss teure Prototypen-Ketten-Nachschläge durchführen. Sobald ein Ladevorgang auf eine solche Situation trifft, merkt sich V8, dass „dieser Ladevorgang Sonderfälle behandeln muss“, und er wird nie wieder so schnell sein wie vor dem Lesen außerhalb des Bereichs.

Schreiben Sie keine Schleifen wie diese:

```js
// Tun Sie das nicht!
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

Dieser Code liest alle Elemente des Arrays und dann noch eines mehr. Er endet erst, wenn er ein `undefined`- oder `null`-Element findet. (jQuery verwendet dieses Muster an einigen Stellen.)

Stattdessen schreiben Sie Ihre Schleifen lieber auf altmodische Weise und fahren einfach fort, bis Sie das letzte Element erreichen.

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

Wenn die Sammlung, über die Sie iterieren, iterierbar ist (wie es bei Arrays und `NodeList`s der Fall ist), ist das noch besser: Verwenden Sie einfach `for-of`.

```js
for (const item of items) {
  doSomething(item);
}
```

Speziell für Arrays könnten Sie den eingebauten `forEach` verwenden:

```js
items.forEach((item) => {
  doSomething(item);
});
```

Heutzutage ist die Leistung von `for-of` und `forEach` auf Augenhöhe mit der altmodischen `for`-Schleife.

Vermeiden Sie das Lesen jenseits der Länge des Arrays! In diesem Fall schlägt V8's Bereichsprüfung fehl, die Prüfung, ob die Eigenschaft vorhanden ist, schlägt fehl, und dann muss V8 die Prototypen-Kette nachschlagen. Die Auswirkungen sind noch schlimmer, wenn Sie dann versehentlich den Wert in Berechnungen verwenden, z.B.:

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // SCHLECHTER VERGLEICH!
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

Hier liest die letzte Iteration über die Länge des Arrays hinaus, was `undefined` zurückgibt, das nicht nur den Ladevorgang sondern auch den Vergleich verfälscht: Statt nur Zahlen zu vergleichen, muss es jetzt Sonderfälle behandeln. Die Behebung der Abbruchbedingung zum korrekten `i < array.length` führt zu einer **6-fachen** Leistungsverbesserung für dieses Beispiel (gemessen an Arrays mit 10.000 Elementen, sodass die Anzahl der Iterationen nur um 0,01% abnimmt).

### Vermeiden Sie Übergänge der Elementarten

Im Allgemeinen, wenn Sie viele Operationen mit einem Array durchführen müssen, versuchen Sie, bei einer möglichst spezifischen Art von Elementen zu bleiben, damit V8 diese Operationen so gut wie möglich optimieren kann.

Das ist schwieriger als es scheint. Zum Beispiel reicht es aus, '-0' zu einem Array von kleinen Ganzzahlen hinzuzufügen, um es in 'PACKED_DOUBLE_ELEMENTS' zu überführen.

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

Infolgedessen werden alle zukünftigen Operationen auf diesem Array völlig anders optimiert, als sie es bei Smis wären.

Vermeiden Sie '-0', es sei denn, Sie müssen in Ihrem Code ausdrücklich '-0' und '+0' unterscheiden. (Wahrscheinlich müssen Sie das nicht.)

Das Gleiche gilt für 'NaN' und 'Infinity'. Sie werden als 'double' dargestellt, daher führt das Hinzufügen eines einzigen 'NaN' oder 'Infinity' zu einem Array von 'SMI_ELEMENTS' dazu, dass es in 'DOUBLE_ELEMENTS' übergeht.

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

Wenn Sie vorhaben, viele Operationen auf einem Array von Ganzzahlen durchzuführen, sollten Sie '-0' normalisieren und 'NaN' und 'Infinity' blockieren, wenn Sie die Werte initialisieren. So bleibt das Array bei der Art 'PACKED_SMI_ELEMENTS'. Dieser einmalige Aufwand zur Normalisierung kann sich aufgrund späterer Optimierungen lohnen.

Wenn Sie mathematische Operationen mit einem Array von Zahlen durchführen, sollten Sie in Betracht ziehen, ein TypedArray zu verwenden. Wir haben auch spezielle Arten von Elementen für diese.

### Bevorzugen Sie Arrays gegenüber array-ähnlichen Objekten

Einige Objekte in JavaScript — insbesondere im DOM — sehen aus wie Arrays, sind aber keine echten Arrays. Es ist möglich, array-ähnliche Objekte selbst zu erstellen:

```js
const arrayLike = {};
arrayLike[0] = 'a';
arrayLike[1] = 'b';
arrayLike[2] = 'c';
arrayLike.length = 3;
```

Dieses Objekt hat eine `length` und unterstützt den Zugriff auf Elemente über Indizes (genau wie ein Array!), aber es fehlen Methoden wie `forEach` in seinem Prototyp. Dennoch ist es möglich, Array-generische Methoden darauf aufzurufen:

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Dies gibt '0: a', dann '1: b' und schließlich '2: c' aus.
```

Dieser Code ruft die eingebaute `Array.prototype.forEach`-Methode auf das array-ähnliche Objekt auf, und es funktioniert wie erwartet. Jedoch ist dies langsamer, als `forEach` auf einem richtigen Array aufzurufen, das von V8 hoch optimiert wird. Wenn Sie vorhaben, eingebaute Array-Methoden mehr als einmal auf diesem Objekt zu verwenden, sollten Sie darüber nachdenken, es vorher in ein tatsächliches Array umzuwandeln:

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Dies gibt '0: a', dann '1: b' und schließlich '2: c' aus.
```

Die einmalige Umwandlungskosten können sich aufgrund späterer Optimierungen lohnen, insbesondere wenn Sie planen, viele Operationen auf diesem Array durchzuführen.

Das `arguments`-Objekt zum Beispiel ist ein array-ähnliches Objekt. Es ist möglich, eingebaute Array-Methoden darauf aufzurufen, aber solche Operationen werden nicht vollständig optimiert wie bei einem echten Array.

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// Dies gibt '0: a', dann '1: b' und schließlich '2: c' aus.
```

ES2015 Rest-Parameter können hierbei helfen. Sie erzeugen echte Arrays, die anstelle der array-ähnlichen `arguments`-Objekte auf elegante Weise verwendet werden können.

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// Dies gibt '0: a', dann '1: b' und schließlich '2: c' aus.
```

Heutzutage gibt es keinen guten Grund, das `arguments`-Objekt direkt zu verwenden.

Vermeiden Sie im Allgemeinen array-ähnliche Objekte, wann immer möglich, und verwenden Sie stattdessen echte Arrays.

### Vermeiden Sie Polymorphismus

Wenn Sie Code haben, der Arrays mit vielen verschiedenen Arten von Elementen behandelt, kann dies zu polymorphen Operationen führen, die langsamer sind als eine Version des Codes, die nur mit einer einzigen Art von Elementen arbeitet.

Betrachten Sie folgendes Beispiel, bei dem eine Bibliotheksfunktion mit verschiedenen Arten von Elementen aufgerufen wird. (Beachten Sie, dass dies nicht das native `Array.prototype.forEach` ist, das seine eigenen Optimierungen zusätzlich zu den in diesem Artikel diskutierten optimierungsart-spezifischen Optimierungen hat.)

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each(['a', 'b', 'c'], doSomething);
// `each` wird mit `PACKED_ELEMENTS` aufgerufen. V8 verwendet einen Inline-Cache
// (oder „IC“), um sich daran zu erinnern, dass `each` mit dieser bestimmten
// Art von Elementen aufgerufen wird. V8 ist optimistisch und nimmt an, dass die
// Zugriffe auf `array.length` und `array[index]` innerhalb der `each`-Funktion
// monomorph (d. h. nur eine einzige Art von Elementen) sind, bis das Gegenteil bewiesen wird.
// Für jeden zukünftigen Aufruf von `each` überprüft V8, ob die Art der Elemente
// `PACKED_ELEMENTS` ist. Wenn ja, kann V8 den zuvor erzeugten Code wiederverwenden.
// Wenn nicht, wird mehr Arbeit benötigt.

each([1.1, 2.2, 3.3], doSomething);
// `each` wird mit `PACKED_DOUBLE_ELEMENTS` aufgerufen. Da V8
// nun unterschiedliche Typen von Elementen in seinem IC für `each`
// gesehen hat, werden die Zugriffe auf `array.length` und `array[index]`
// innerhalb der Funktion `each` als polymorph markiert. V8 muss jetzt bei
// jedem Aufruf von `each` eine zusätzliche Prüfung durchführen: eine
// für `PACKED_ELEMENTS` (wie zuvor), eine neue für `PACKED_DOUBLE_ELEMENTS`
// und eine für alle anderen Typen von Elementen (wie zuvor). Dies führt
// zu einem Leistungseinbruch.

each([1, 2, 3], doSomething);
// `each` wird mit `PACKED_SMI_ELEMENTS` aufgerufen. Dies löst einen weiteren
// Grad an Polymorphie aus. Es gibt jetzt drei unterschiedliche Typen
// von Elementen im IC für `each`. Bei jedem weiteren Aufruf von `each`
// wird eine zusätzliche Prüfung des Elemententyps benötigt, um den
// generierten Code für `PACKED_SMI_ELEMENTS` wiederzuverwenden. Dies geht
// mit Leistungseinbußen einher.
```

Eingebaute Methoden (wie `Array.prototype.forEach`) können mit dieser Art von Polymorphie deutlich effizienter umgehen. Daher sollten sie in performancekritischen Situationen anstelle von benutzerdefinierten Bibliotheksfunktionen verwendet werden.

Ein weiteres Beispiel für Monomorphie vs. Polymorphie in V8 betrifft Objektformen, auch bekannt als die versteckte Klasse eines Objekts. Um mehr über diesen Fall zu erfahren, lesen Sie [Vyacheslavs Artikel](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html).

### Vermeiden Sie das Erstellen von Lücken

Bei realen Programmiermustern ist der Leistungsunterschied zwischen dem Zugriff auf holey oder volle Arrays in der Regel zu gering, um eine Rolle zu spielen oder messbar zu sein. Wenn (und das ist ein großes "Wenn"!) Ihre Leistungsbewertungen ergeben, dass es sich lohnt, jede letzte Maschinenanweisung im optimierten Code zu sparen, können Sie versuchen, Ihre Arrays im Modus für volle Elemente zu halten. Angenommen, wir versuchen, ein Array zu erstellen, zum Beispiel:

```js
const array = new Array(3);
// Das Array ist zu diesem Zeitpunkt spärlich, daher wird es als
// `HOLEY_SMI_ELEMENTS` markiert, also die spezifischste Möglichkeit
// basierend auf den aktuellen Informationen.
array[0] = 'a';
// Moment, das ist ein String anstelle eines kleinen ganzen Werts …
// Daher erfolgt ein Übergang zu `HOLEY_ELEMENTS`.
array[1] = 'b';
array[2] = 'c';
// Zu diesem Zeitpunkt sind alle drei Positionen im Array belegt,
// sodass das Array vollständig ist (d.h. nicht mehr spärlich).
// Wir können jedoch nicht zu einer spezifischeren Art wie `PACKED_ELEMENTS`
// wechseln. Die Art der Elemente bleibt `HOLEY_ELEMENTS`.
```

Einmal als holey markiert, bleibt das Array für immer holey – selbst wenn später alle seine Elemente vorhanden sind!

Eine bessere Möglichkeit, ein Array zu erstellen, ist die Verwendung eines Literals:

```js
const array = ['a', 'b', 'c'];
// Elemente-Art: PACKED_ELEMENTS
```

Wenn Sie nicht alle Werte im Voraus kennen, erstellen Sie ein leeres Array und fügen Sie die Werte später mit `push` hinzu.

```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```

Dieser Ansatz stellt sicher, dass das Array niemals zur Art der holey-Elemente übergeht. Dadurch kann V8 möglicherweise geringfügig schneller optimierten Code für einige Operationen mit diesem Array generieren.

## Debugging von Elementtypen

Um den „Elementtyp“ eines bestimmten Objekts herauszufinden, erstellen Sie eine Debug-Build-Version von `d8` (entweder durch [Builden aus dem Quellcode](/docs/build) im Debug-Modus oder durch Herunterladen eines vorkompilierten Binärformats mittels [`jsvu`](https://github.com/GoogleChromeLabs/jsvu)) und führen Sie aus:

```bash
out/x64.debug/d8 --allow-natives-syntax
```

Dies öffnet eine `d8`-REPL, in der [spezielle Funktionen](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime.h?l=20&rcl=05720af2b09a18be5c41bbf224a58f3f0618f6be) wie `%DebugPrint(object)` verfügbar sind. Das „elements“-Feld in dessen Ausgabe zeigt den „Elementtyp“ jedes Objekts an, das Sie übergeben.

```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```

Beachten Sie, dass „COW“ für [Copy-on-Write](https://en.wikipedia.org/wiki/Copy-on-write) steht, was eine weitere interne Optimierung ist. Lassen Sie sich davon vorerst nicht beirren – das ist ein Thema für einen anderen Blogbeitrag!

Ein weiteres nützliches Flag, das in Debug-Builds verfügbar ist, ist `--trace-elements-transitions`. Aktivieren Sie es, um V8 darüber zu informieren, wann immer ein Übergang des Elemententyps stattfindet.

```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
elements transition [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] in ~+34 at x.js:2 for 0x1df87228c911 <JSArray[3]> from 0x1df87228c889 <FixedArray[3]> to 0x1df87228c941 <FixedDoubleArray[22]>
```
