---
title: "Schwache Verweise und Finalizer"
author: "Sathya Gunasekaran ([@_gsathya](https://twitter.com/_gsathya)), Mathias Bynens ([@mathias](https://twitter.com/mathias)), Shu-yu Guo ([@_shu](https://twitter.com/_shu)), und Leszek Swirski ([@leszekswirski](https://twitter.com/leszekswirski))"
avatars: 
- "sathya-gunasekaran"
- "mathias-bynens"
- "shu-yu-guo"
- "leszek-swirski"
date: 2019-07-09
updated: 2020-06-19
tags: 
  - ECMAScript
  - ES2021
  - io19
  - Node.js 14
description: "Schwache Verweise und Finalizer kommen zu JavaScript! In diesem Artikel wird die neue Funktionalität erklärt."
tweet: "1148603966848151553"
---
Im Allgemeinen werden Referenzen auf Objekte in JavaScript _stark gehalten_, was bedeutet, dass das Objekt nicht vom Garbage Collector gesammelt wird, solange eine Referenz darauf existiert.

```js
const ref = { x: 42, y: 51 };
// Solange Sie Zugriff auf `ref` (oder eine andere Referenz auf
// dasselbe Objekt) haben, wird das Objekt nicht vom Garbage Collector gesammelt.
```

Momentan sind `WeakMap`s und `WeakSet`s die einzigen Möglichkeiten, ein Objekt in JavaScript schwach zu referenzieren: Das Hinzufügen eines Objekts als Schlüssel zu einer `WeakMap` oder einem `WeakSet` verhindert nicht, dass es vom Garbage Collector gesammelt wird.

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = 'foo';
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// Wir haben in diesem Block keinen Zugriff mehr auf `ref`, daher kann es
// jetzt vom Garbage Collector gesammelt werden, obwohl es ein Schlüssel in `wm` ist, auf den wir noch zugreifen können.

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// Wir haben in diesem Block keinen Zugriff mehr auf `ref`, daher kann es
// jetzt vom Garbage Collector gesammelt werden, obwohl es ein Schlüssel in `ws` ist, auf den wir noch zugreifen können.
```

:::note
**Hinweis:** Sie können `WeakMap.prototype.set(ref, metaData)` als das Hinzufügen einer Eigenschaft mit dem Wert `metaData` zu dem Objekt `ref` betrachten: Solange Sie eine Referenz auf das Objekt haben, können Sie auf die Metadaten zugreifen. Sobald Sie keine Referenz auf das Objekt mehr haben, kann es vom Garbage Collector gesammelt werden, selbst wenn Sie noch eine Referenz auf die `WeakMap`, zu der es hinzugefügt wurde, behalten. Ebenso können Sie `WeakSet` als einen Sonderfall von `WeakMap` betrachten, bei dem alle Werte Booleans sind.

Eine JavaScript `WeakMap` ist eigentlich nicht _schwach_: Sie verweist tatsächlich _stark_ auf ihre Inhalte, solange der Schlüssel existiert. Die `WeakMap` verweist erst dann schwach auf ihre Inhalte, sobald der Schlüssel vom Garbage Collector gesammelt wird. Eine genauere Bezeichnung für diese Art von Beziehung ist [_Ephemeron_](https://en.wikipedia.org/wiki/Ephemeron).
:::

`WeakRef` ist eine fortgeschrittene API, die _echte_ schwache Referenzen bereitstellt und ein Fenster in die Lebensdauer eines Objekts ermöglicht. Schauen wir uns ein Beispiel an.

Nehmen wir an, wir arbeiten an einer Chat-Webanwendung, die Websockets zur Kommunikation mit einem Server verwendet. Stellen Sie sich eine `MovingAvg`-Klasse vor, die aus Leistungsdiagnosegründen eine Menge von Ereignissen eines Websockets speichert, um einen einfachen gleitenden Durchschnitt der Latenz zu berechnen.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  compute(n) {
    // Berechnen des einfachen gleitenden Durchschnitts für die letzten n Ereignisse.
    // …
  }
}
```

Es wird von einer `MovingAvgComponent`-Klasse verwendet, die Ihnen ermöglicht, zu kontrollieren, wann die Überwachung des einfachen gleitenden Durchschnitts der Latenz gestartet und gestoppt werden soll.

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // Erlauben, dass der Garbage Collector den Speicher zurückgewinnt.
    this.movingAvg = null;
  }

  render() {
    // Rendering durchführen.
    // …
  }
}
```

Wir wissen, dass das Speichern aller Servernachrichten innerhalb einer Instanz von `MovingAvg` viel Speicher benötigt. Daher achten wir darauf, `this.movingAvg` auf null zu setzen, wenn die Überwachung gestoppt wird, um dem Garbage Collector zu ermöglichen, den Speicher zurückzugewinnen.

Allerdings stellten wir nach Überprüfung des Speichermoduls in DevTools fest, dass der Speicher überhaupt nicht zurückgewonnen wurde! Der erfahrene Webentwickler hat den Fehler möglicherweise bereits erkannt: Ereignislistener sind starke Referenzen und müssen explizit entfernt werden.

Lassen Sie uns dies mit Reichweiten-Diagrammen verdeutlichen. Nachdem `start()` aufgerufen wurde, sieht unser Objektgraph wie folgt aus, wobei ein durchgehender Pfeil eine starke Referenz bedeutet. Alles, was über durchgehende Pfeile von der `MovingAvgComponent`-Instanz erreichbar ist, kann nicht vom Garbage Collector gesammelt werden.

![](/_img/weakrefs/after-start.svg)

Nach dem Aufruf von `stop()` haben wir die starke Referenz von der `MovingAvgComponent`-Instanz zur `MovingAvg`-Instanz entfernt, aber nicht über den Listener des Sockets.

![](/_img/weakrefs/after-stop.svg)

Folglich hält der Listener in `MovingAvg`-Instanzen durch die Referenzierung von `this` die gesamte Instanz am Leben, solange der Ereignislistener nicht entfernt wurde.

Bis jetzt besteht die Lösung darin, den Ereignislistener manuell über eine `dispose`-Methode abzumelden.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  dispose() {
    this.socket.removeEventListener('message', this.listener);
  }

  // …
}
```

Der Nachteil dieses Ansatzes ist, dass es sich um manuelle Speicherverwaltung handelt. `MovingAvgComponent` und alle anderen Nutzer der `MovingAvg`-Klasse müssen daran denken, `dispose` aufzurufen, andernfalls treten Speicherlecks auf. Noch schlimmer ist, dass die manuelle Speicherverwaltung kaskadiert: Nutzer von `MovingAvgComponent` müssen daran denken, `stop` aufzurufen, um Speicherlecks zu vermeiden, und so weiter. Das Verhalten der Anwendung hängt nicht von dem Ereignislistener dieser Diagnoseklasse ab, und der Listener ist in Bezug auf Speicherverbrauch teuer, aber nicht in der Berechnung. Was wir wirklich wollen, ist, dass die Lebensdauer des Listeners logisch an die `MovingAvg`-Instanz gebunden ist, sodass `MovingAvg` wie jedes andere JavaScript-Objekt verwendet werden kann, dessen Speicher automatisch vom Garbage Collector freigegeben wird.

`WeakRef`s ermöglichen es, das Dilemma zu lösen, indem eine _schwache Referenz_ auf den tatsächlichen Ereignislistener erstellt und dieser `WeakRef` dann in einen äußeren Ereignislistener eingebettet wird. Auf diese Weise kann der Garbage Collector den tatsächlichen Ereignislistener und den von ihm gespeicherten Speicher bereinigen, wie zum Beispiel die `MovingAvg`-Instanz und deren `events`-Array.

```js
function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener);
  const wrapper = (ev) => { weakRef.deref()?.(ev); };
  socket.addEventListener('message', wrapper);
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); };
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**Hinweis:** `WeakRef`s für Funktionen müssen mit Vorsicht verwendet werden. JavaScript-Funktionen sind [Closures](https://en.wikipedia.org/wiki/Closure_(computer_programming)) und haben starke Referenzen auf die äußeren Umgebungen, welche die Werte der freien Variablen enthalten, die innerhalb der Funktionen referenziert werden. Diese äußeren Umgebungen können Variablen enthalten, die auch _von anderen_ Closures referenziert werden. Das bedeutet, dass bei Closures deren Speicher oft von anderen Closures auf subtile Weise stark referenziert wird. Aus diesem Grund ist `addWeakListener` eine separate Funktion und `wrapper` nicht lokal zum Konstruktor von `MovingAvg`. In V8, wenn `wrapper` lokal zum Konstruktor von `MovingAvg` wäre und den lexikalischen Scope mit dem Listener teilt, der in `WeakRef` eingewickelt ist, wird die `MovingAvg`-Instanz und alle ihre Eigenschaften über die gemeinsam genutzte Umgebung vom Wrapper-Listener aus erreichbar, was dazu führt, dass die Instanz nicht gesammelt werden kann. Denken Sie daran, wenn Sie Code schreiben.
:::

Zuerst erstellen wir den Ereignislistener und weisen ihn `this.listener` zu, damit er stark von der `MovingAvg`-Instanz referenziert wird. Mit anderen Worten: Solange die `MovingAvg`-Instanz lebensfähig ist, gilt dies auch für den Ereignislistener.

Dann erstellen wir in `addWeakListener` einen `WeakRef`, dessen _Ziel_ der tatsächliche Ereignislistener ist. In `wrapper` dereferenzieren wir ihn. Da `WeakRef`s die Garbage Collection ihrer Ziele nicht verhindern, falls die Ziele keine weiteren starken Referenzen haben, müssen wir sie manuell dereferenzieren, um das Ziel zu erhalten. Wenn das Ziel zwischenzeitlich durch die Garbage Collection gesammelt wurde, gibt `deref` `undefined` zurück. Andernfalls wird das ursprüngliche Ziel zurückgegeben, welches die `listener`-Funktion ist, die wir dann mit [optional chaining](/features/optional-chaining) aufrufen.

Da der Ereignislistener in einem `WeakRef` eingebettet ist, ist die _einzige_ starke Referenz darauf die `listener`-Eigenschaft auf der `MovingAvg`-Instanz. Das heißt, wir haben erfolgreich die Lebensdauer des Ereignislisteners an die Lebensdauer der `MovingAvg`-Instanz gebunden.

Zurück zu Erreichbarkeitsdiagrammen: Nach dem Aufruf von `start()` mit der `WeakRef`-Implementierung sieht unser Objektgraph wie folgt aus, wobei ein gestrichelter Pfeil eine schwache Referenz bedeutet.

![](/_img/weakrefs/weak-after-start.svg)

Nach dem Aufruf von `stop()` haben wir die einzige starke Referenz auf den Listener entfernt:

![](/_img/weakrefs/weak-after-stop.svg)

Schließlich, nachdem eine Garbage Collection stattgefunden hat, werden die `MovingAvg`-Instanz und der Listener gesammelt:

![](/_img/weakrefs/weak-after-gc.svg)

Aber hier gibt es immer noch ein Problem: Wir haben eine Ebene der Indirektion zu `listener` hinzugefügt, indem wir ihn in einen `WeakRef` eingebettet haben, aber der Wrapper in `addWeakListener` leckt weiterhin aus demselben Grund, aus dem `listener` ursprünglich geleckt hat. Zugegeben, das ist ein kleineres Leck, da nur der Wrapper leckt und nicht die ganze `MovingAvg`-Instanz, aber es ist immer noch ein Leck. Die Lösung hierfür ist das Begleitfeature zu `WeakRef`, `FinalizationRegistry`. Mit der neuen `FinalizationRegistry`-API können wir einen Callback registrieren, der ausgeführt wird, wenn der Garbage Collector ein registriertes Objekt löscht. Solche Callbacks sind als _Finalizer_ bekannt.

:::note
**Hinweis:** Der Rückruf zur Finalisierung wird nicht sofort nach der Garbage-Collection des Ereignislisteners ausgeführt. Verwenden Sie ihn daher nicht für wichtige Logik oder Metriken. Der Zeitpunkt der Garbage-Collection und der Finalisierungsrückrufe ist undefiniert. Tatsächlich würde eine Engine, die niemals eine Garbage-Collection durchführt, vollständig konform sein. Es ist jedoch sicher anzunehmen, dass Engines _eine_ Garbage-Collection durchführen und Finalisierungsrückrufe zu einem späteren Zeitpunkt aufgerufen werden, es sei denn, die Umgebung wird verworfen (z. B. wenn der Tab geschlossen oder der Worker beendet wird). Beachten Sie diese Unsicherheit beim Schreiben von Code.
:::

Wir können einen Rückruf mit einem `FinalizationRegistry` registrieren, um `wrapper` aus dem Socket zu entfernen, wenn der innere Ereignislistener durch die Garbage-Collection bereinigt wird. Unsere endgültige Implementierung sieht wie folgt aus:

```js
const gListenersRegistry = new FinalizationRegistry(({ socket, wrapper }) => {
  socket.removeEventListener('message', wrapper); // 6
});

function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener); // 2
  const wrapper = (ev) => { weakRef.deref()?.(ev); }; // 3
  gListenersRegistry.register(listener, { socket, wrapper }); // 4
  socket.addEventListener('message', wrapper); // 5
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); }; // 1
    addWeakListener(socket, this.listener);
  }
}
```

:::hinweis
**Hinweis:** `gListenersRegistry` ist eine globale Variable, um sicherzustellen, dass die Finalizer ausgeführt werden. Ein `FinalizationRegistry` wird nicht durch Objekte am Leben gehalten, die darauf registriert sind. Wenn eine Registry selbst durch die Garbage-Collection bereinigt wird, kann ihr Finalizer möglicherweise nicht ausgeführt werden.
:::

Wir erstellen einen Ereignislistener und weisen ihn `this.listener` zu, damit er stark vom `MovingAvg`-Objekt referenziert wird (1). Wir ummanteln den Ereignislistener, der die Arbeit verrichtet, mit einem `WeakRef`, um ihn sammelbar zu machen und seine Referenzierung auf das `MovingAvg`-Objekt über `this` nicht zu leaken (2). Wir erstellen eine Wrapper-Funktion, die `deref` auf dem `WeakRef` ausführt, um zu prüfen, ob sie noch lebt, und sie dann aufruft (3). Wir registrieren den inneren Listener bei `FinalizationRegistry`, wobei ein _Speicherobjekt_ `{ socket, wrapper }` übergeben wird (4). Anschließend fügen wir den zurückgegebenen Wrapper als Ereignislistener auf `socket` hinzu (5). Irgendwann nach der Bereinigung des `MovingAvg`-Objekts und des inneren Listeners durch die Garbage-Collection kann der Finalizer ausgeführt werden, wobei das Speicherobjekt übergeben wird. Im Finalizer entfernen wir auch den Wrapper, wodurch jeglicher Speicherplatz im Zusammenhang mit der Verwendung eines `MovingAvg`-Objekts durch die Garbage-Collection befreit wird (6).

Mit all dem leckt unsere ursprüngliche Implementierung von `MovingAvgComponent` weder Speicher, noch erfordert sie eine manuelle Entsorgung.

## Übertreiben Sie es nicht

Nach dem Kennenlernen dieser neuen Möglichkeiten könnte es verlockend sein, `WeakRef` für alles zu verwenden™. Das ist jedoch wahrscheinlich keine gute Idee. Einige Dinge sind ausdrücklich _keine_ guten Anwendungsfälle für `WeakRef`s und Finalizer.

Im Allgemeinen sollten Sie keinen Code schreiben, der darauf angewiesen ist, dass der Garbage-Collector ein `WeakRef` bereinigt oder einen Finalizer zu einem vorhersehbaren Zeitpunkt aufruft — [es ist nicht möglich](https://github.com/tc39/proposal-weakrefs#a-note-of-caution)! Darüber hinaus kann es von Implementierungsdetails abhängen, ob ein Objekt überhaupt sammelbar ist, etwa von der Darstellung von Closures, die sowohl subtil sind als auch zwischen JavaScript-Engines und sogar zwischen verschiedenen Versionen derselben Engine variieren können. Insbesondere:

- Finalisierungsrückrufe könnten nicht sofort nach der Garbage-Collection auftreten.
- Finalisierungsrückrufe könnten nicht in derselben Reihenfolge wie die tatsächliche Garbage-Collection auftreten.
- Finalisierungsrückrufe könnten überhaupt nicht auftreten, z. B. wenn das Browserfenster geschlossen wird.

Platzieren Sie daher keine wichtige Logik in den Codepfad eines Finalizers. Sie sind nützlich, um Bereinigungen als Reaktion auf eine Garbage-Collection durchzuführen, aber Sie können sie nicht zuverlässig verwenden, um beispielsweise sinnvolle Metriken über die Speichernutzung zu erstellen. Für diesen Anwendungsfall sehen Sie [`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/).

`WeakRef`s und Finalizer können Ihnen helfen, Speicher zu sparen, und funktionieren am besten, wenn sie sparsam als Mittel zur progressiven Verbesserung verwendet werden. Da sie Power-User-Features sind, erwarten wir, dass die meisten Anwendungen innerhalb von Frameworks oder Bibliotheken stattfinden.

## Unterstützung für `WeakRef`

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="nein"
                 nodejs="14.6.0"
                 babel="nein"></feature-support>
