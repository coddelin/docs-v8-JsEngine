---
title: 'V8-Version v6.6'
author: 'das V8-Team'
date: 2018-03-27 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v6.6 umfasst eine optionale Catch-Bindung, erweitertes String-Trimming, mehrere Verbesserungen bei der Parse-/Kompilierungs-/Laufzeitleistung und vieles mehr!'
tweet: '978534399938584576'
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen Branch von V8. Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem V8-Git-Master separiert. Heute freuen wir uns, unseren neuesten Branch anzukündigen, [V8-Version 6.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.6), der sich bis zur Veröffentlichung in Zusammenarbeit mit Chrome 66 Stable in einigen Wochen in der Beta-Phase befindet. V8 v6.6 bietet Entwicklern allerlei Neuerungen. Dieser Beitrag gibt einen Vorgeschmack auf einige Highlights vor der Veröffentlichung.

<!--truncate-->
## JavaScript-Sprachfeatures

### `Function.prototype.toString` Überarbeitung  #function-tostring

[`Function.prototype.toString()`](/features/function-tostring) gibt jetzt exakte Ausschnitte des Quelltextes zurück, einschließlich Leerzeichen und Kommentare. Hier ein Beispiel, das das alte und das neue Verhalten vergleicht:

```js
// Beachte den Kommentar zwischen dem Schlüsselwort `function`
// und dem Funktionsnamen sowie das Leerzeichen danach.
function /* ein Kommentar */ foo () {}

// Bisher:
foo.toString();
// → 'function foo() {}'
//             ^ kein Kommentar
//                ^ kein Leerzeichen

// Jetzt:
foo.toString();
// → 'function /* Kommentar */ foo () {}'
```

### JSON ⊂ ECMAScript

Linien- (U+2028) und Absatztrenner (U+2029) sind nun in String-Literalen erlaubt und [entsprechen JSON](/features/subsume-json). Früher wurden diese Symbole innerhalb von String-Literalen als Zeilenabschlüsse behandelt, was zu einem `SyntaxError` führte.

### Optionale `catch`-Bindung

Die `catch`-Klausel von `try`-Anweisungen kann jetzt [ohne Parameter verwendet werden](/features/optional-catch-binding). Dies ist nützlich, wenn das `exception`-Objekt im Code zur Ausnahmebehandlung nicht benötigt wird.

```js
try {
  doSomethingThatMightThrow();
} catch { // → Schau mal, Mama, keine Bindung!
  handleException();
}
```

### Einseitiges String-Trimming

Zusätzlich zu `String.prototype.trim()` implementiert V8 nun [`String.prototype.trimStart()` und `String.prototype.trimEnd()`](/features/string-trimming). Diese Funktionalität war zuvor über die nicht standardmäßigen Methoden `trimLeft()` und `trimRight()` verfügbar, die aus Gründen der Abwärtskompatibilität weiterhin als Aliase der neuen Methoden erhalten bleiben.

```js
const string = '  hallo welt  ';
string.trimStart();
// → 'hallo welt  '
string.trimEnd();
// → '  hallo welt'
string.trim();
// → 'hallo welt'
```

### `Array.prototype.values`

[Die Methode `Array.prototype.values()`](https://tc39.es/ecma262/#sec-array.prototype.values) verleiht Arrays dieselbe Iterationsschnittstelle wie den ES2015 `Map`- und `Set`-Sammlungen: Alle können nun durch `keys`, `values` oder `entries` iteriert werden, indem die gleichnamige Methode aufgerufen wird. Diese Änderung könnte potenziell inkompatibel mit bestehendem JavaScript-Code sein. Sollten Sie auf merkwürdiges oder fehlerhaftes Verhalten einer Webseite stoßen, versuchen Sie bitte, dieses Feature über `chrome://flags/#enable-array-prototype-values` zu deaktivieren und [melden Sie ein Problem](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user).

## Code-Caching nach der Ausführung

Die Begriffe _Cold Load_ und _Warm Load_ dürften Menschen bekannt sein, die sich mit Ladeleistung beschäftigen. In V8 gibt es auch das Konzept eines _Hot Load_. Lassen Sie uns die verschiedenen Ebenen am Beispiel von Chrome, das V8 einbettet, erklären:

- **Cold Load:** Chrome sieht die besuchte Webseite zum ersten Mal und hat überhaupt keine Daten im Cache.
- **Warm Load**: Chrome erinnert sich daran, dass die Webseite bereits besucht wurde, und kann bestimmte Ressourcen (z. B. Bilder und Script-Quelldateien) aus dem Cache abrufen. V8 erkennt, dass die Seite bereits dieselbe Skriptdatei ausgeliefert hat, und speichert daher den kompilierten Code zusammen mit der Skriptdatei im Disk-Cache.
- **Hot Load**: Beim dritten Mal, wenn Chrome die Webseite besucht und die Skriptdatei aus dem Disk-Cache bereitgestellt wird, übermittelt es auch den während des vorherigen Ladevorgangs zwischengespeicherten Code an V8. V8 kann diesen zwischengespeicherten Code verwenden, um sich das Parsen und Kompilieren des Skripts von Grund auf zu sparen.

Vor V8 v6.6 haben wir den generierten Code direkt nach der obersten Kompilierungsphase zwischengespeichert. V8 kompiliert nur die Funktionen, die bei der obersten Kompilierungsphase sofort ausgeführt werden sollen, und markiert andere Funktionen für die spätere Kompilierung. Das bedeutete, dass der zwischengespeicherte Code nur den übergeordneten Code enthielt, während alle anderen Funktionen bei jedem Seitenaufruf von Grund auf neu kompiliert werden mussten. Ab Version 6.6 speichert V8 den Code, der nach der obersten Skriptausführung generiert wurde. Während wir das Skript ausführen, werden mehr Funktionen nach und nach kompiliert und können im Cache enthalten sein. Infolgedessen müssen diese Funktionen bei zukünftigen Seitenaufrufen nicht erneut kompiliert werden, was die Kompilierungs- und Analysezeit in Szenarien mit stark genutzten Seiten um 20–60 % reduziert. Die sichtbare Änderung für den Benutzer ist ein weniger überlasteter Hauptthread, was zu einer reibungsloseren und schnelleren Ladeerfahrung führt.

Halten Sie Ausschau nach einem ausführlichen Blogpost zu diesem Thema, der bald erscheinen wird.

## Hintergrundkompilierung

V8 war schon seit einiger Zeit in der Lage [JavaScript-Code in einem Hintergrund-Thread zu analysieren](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html). Mit V8s neuem [Ignition-Bytecode-Interpreter, der letztes Jahr eingeführt wurde](/blog/launching-ignition-and-turbofan), konnten wir diese Unterstützung erweitern und auch die Kompilierung von JavaScript-Quellcode zu Bytecode in einem Hintergrund-Thread ermöglichen. Dies erlaubt Embedders (Einbettungen), mehr Arbeit außerhalb des Hauptthreads auszuführen, sodass dieser mehr JavaScript ausführen kann und Verzögerungen reduziert werden. Wir haben diese Funktion in Chrome 66 aktiviert, wo wir eine Reduzierung der Kompilierungszeit auf dem Hauptthread um 5 % bis 20 % auf typischen Websites sehen. Weitere Details finden Sie in [dem kürzlich erschienenen Blogpost zu dieser Funktion](/blog/background-compilation).

## Entfernung der AST-Nummerierung

Wir profitieren weiterhin davon, unsere Kompilierungspipeline nach der [Einführung von Ignition und TurboFan im letzten Jahr](/blog/launching-ignition-and-turbofan) zu vereinfachen. Unsere bisherige Pipeline erforderte eine nachgelagerte Analysephase namens "AST-Nummerierung", bei der Knoten im generierten abstrakten Syntaxbaum nummeriert wurden, damit die verschiedenen Compiler, die ihn verwenden, eine gemeinsame Referenz hatten.

Im Laufe der Zeit hatte diese Nachbearbeitungsphase zusätzliche Funktionalitäten umfasst: Nummerierung von Haltepunkten für Generatoren und asynchrone Funktionen, Sammlung von inneren Funktionen für die proaktive Kompilierung, Initialisierung von Literalen oder Erkennung von nicht optimierbaren Code-Mustern.

Mit der neuen Pipeline wurde der Ignition-Bytecode zur gemeinsamen Referenzierungsgrundlage, und die Nummerierung selbst war nicht mehr erforderlich — jedoch war die verbleibende Funktionalität weiterhin notwendig, und die AST-Nummerierungsphase blieb bestehen.

In V8 v6.6 haben wir es schließlich geschafft, [diese verbleibende Funktionalität in andere Phasen zu übertragen oder abzulehnen](https://bugs.chromium.org/p/v8/issues/detail?id=7178), sodass wir diesen Baumdurchlauf entfernen konnten. Dies führte zu einer Verbesserung der Kompilierungszeit um 3-5 % in realen Szenarien.

## Asynchrone Leistungsverbesserungen

Uns ist es gelungen, einige schöne Leistungsverbesserungen für Versprechen und asynchrone Funktionen herauszuholen und insbesondere die Lücke zwischen asynchronen Funktionen und zurückgeführten Versprechenketten zu schließen.

![Leistungsverbesserungen für Versprechen](/_img/v8-release-66/promise.svg)

Außerdem wurde die Leistung von asynchronen Generatoren und asynchronen Iterationen erheblich verbessert, wodurch sie eine praktikable Option für die kommende Node 10 LTS-Version sind, die V8 v6.6 beinhalten soll. Betrachten Sie beispielsweise die folgende Fibonacci-Sequenz-Implementierung:

```js
async function* fibonacciSequence() {
  for (let a = 0, b = 1;;) {
    yield a;
    const c = a + b;
    a = b;
    b = c;
  }
}

async function fibonacci(id, n) {
  for await (const value of fibonacciSequence()) {
    if (n-- === 0) return value;
  }
}
```

Wir haben die folgenden Verbesserungen für dieses Muster gemessen, vor und nach der Babel-Transpilation:

![Leistungsverbesserungen bei asynchronen Generatoren](/_img/v8-release-66/async-generator.svg)

Schließlich haben [Bytecode-Verbesserungen](https://chromium-review.googlesource.com/c/v8/v8/+/866734) für „aussetzbare Funktionen“ wie Generatoren, asynchrone Funktionen und Module die Leistung dieser Funktionen im Interpreter verbessert und ihre kompilierten Größen reduziert. Wir planen weitere Leistungserhöhungen für asynchrone Funktionen und Generatoren in zukünftigen Veröffentlichungen, bleiben Sie dran.

## Verbesserungen der Array-Leistung

Die Durchsatzleistung von `Array#reduce` wurde um mehr als das 10-fache für „holey double“-Arrays erhöht ([siehe unseren Blogpost für eine Erklärung zu „holey“ und „packed“-Arrays](/blog/elements-kinds)). Dies erweitert den Fast-Path für Fälle, in denen `Array#reduce` auf „holey“ und „packed double“-Arrays angewendet wird.

![Leistungsverbesserungen bei `Array.prototype.reduce`](/_img/v8-release-66/array-reduce.svg)

## Minderung von nicht vertrauenswürdigem Code

In V8 v6.6 haben wir [weitere Maßnahmen gegen Seitenkanal-Sicherheitslücken](/docs/untrusted-code-mitigations) eingeführt, um Informationslecks an nicht vertrauenswürdigen JavaScript- und WebAssembly-Code zu verhindern.

## GYP ist weg

Dies ist die erste V8-Version, die offiziell ohne GYP-Dateien ausgeliefert wird. Wenn Ihr Produkt die gelöschten GYP-Dateien benötigt, müssen Sie diese in Ihr eigenes Quellenrepository kopieren.

## Speicherprofilierung

Die Chrome-DevTools können jetzt C++-DOM-Objekte nachverfolgen und aufnehmen und alle erreichbaren DOM-Objekte von JavaScript aus mit ihren Referenzen anzeigen. Diese Funktion ist einer der Vorteile des neuen C++-Tracing-Mechanismus des V8-Garbage-Collectors. Weitere Informationen finden Sie in [dem speziellen Blogpost](/blog/tracing-js-dom).

## V8 API

Bitte verwenden Sie `git log branch-heads/6.5..branch-heads/6.6 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.
