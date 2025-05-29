---
title: 'V8-Version v7.4 veröffentlicht'
author: 'Georg Neis'
date: 2019-03-22 16:30:42
tags:
  - Veröffentlichung
description: 'V8 v7.4 bietet WebAssembly-Threads/Atomics, private Klassenfelder, Verbesserungen bei Leistung und Speicher sowie vieles mehr!'
tweet: '1109094755936489472'
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Release-Prozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8s Git-Master abgezweigt. Heute freuen wir uns, unseren neuesten Zweig, [V8-Version 7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4), anzukündigen. Dieser befindet sich mehrere Wochen lang in der Beta-Phase bis zur Veröffentlichung in Abstimmung mit Chrome 74 Stable. V8 v7.4 ist voller Entwickler-Features. Dieser Beitrag bietet eine Vorschau auf einige der Highlights als Vorfreude auf die Veröffentlichung.

<!--truncate-->
## JIT-freies V8

V8 unterstützt jetzt die *JavaScript*-Ausführung ohne die Zuordnung von ausführbaren Speicher zur Laufzeit. Ausführliche Informationen zu dieser Funktion finden Sie im [dedizierten Blogbeitrag](/blog/jitless).

## WebAssembly Threads/Atomics veröffentlicht

WebAssembly Threads/Atomics sind nun auf Betriebssystemen außer Android aktiv. Dies schließt die [Origin-Test-/Preview-Phase ab, die wir in V8 v7.0 aktiviert haben](/blog/v8-release-70#a-preview-of-webassembly-threads). Ein Artikel der Web Fundamentals erklärt, [wie man WebAssembly Atomics mit Emscripten nutzt](https://developers.google.com/web/updates/2018/10/wasm-threads).

Dies ermöglicht die Nutzung von mehreren Kernen auf der Maschine eines Benutzers über WebAssembly und eröffnet neue, rechnerlastige Anwendungsmöglichkeiten im Web.

## Leistung

### Schnellere Aufrufe bei Argument-Mismatches

Im JavaScript ist es vollkommen legitim, Funktionen mit zu wenigen oder zu vielen Parametern aufzurufen (d.h. weniger oder mehr als die deklarativen formalen Parameter zu übergeben). Ersteres wird als _Unteranwendung_ bezeichnet, Letzteres als _Überanwendung_. Im Fall der Unteranwendung werden die verbleibenden formalen Parameter mit `undefined` zugewiesen, während im Fall der Überanwendung die überflüssigen Parameter ignoriert werden.

JavaScript-Funktionen können jedoch weiterhin auf die tatsächlichen Parameter zugreifen, sei es durch das [`arguments`-Objekt](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Functions/arguments), durch [Rest-Parameter](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Functions/rest_parameters) oder sogar durch die nicht standardisierte [`Function.prototype.arguments`-Eigenschaft](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments) bei Funktionen im [Sloppy-Modus](https://developer.mozilla.org/de/docs/Glossary/Sloppy_mode). Deshalb müssen JavaScript-Engines eine Möglichkeit bieten, auf die tatsächlichen Parameter zuzugreifen. Bei V8 geschieht dies mittels einer Technik namens _arguments adaption_, die die tatsächlichen Parameter im Fall von Unter- oder Überanwendung bereitstellt. Leider verursacht die arguments adaption Leistungseinbußen und ist in modernen Frontend- und Middleware-Frameworks üblich (d.h. viele APIs mit optionalen Parametern oder variablen Parameterlisten).

Es gibt Szenarien, in denen die Engine weiß, dass arguments adaption nicht notwendig ist, da die tatsächlichen Parameter nicht beobachtet werden können, nämlich wenn der Aufruf eine Strict-Mode-Funktion betrifft und weder `arguments` noch Rest-Parameter verwendet werden. In diesen Fällen überspringt V8 jetzt vollständig die arguments adaption, wodurch der Aufruf-Overhead um bis zu **60 %** reduziert wird.

![Leistungseinfluss des Überspringens der arguments adaption, gemessen durch [einen Micro-Benchmark](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js).](/_img/v8-release-74/argument-mismatch-performance.svg)

Die Grafiken zeigen, dass es keinen Overhead mehr gibt, selbst bei einem Argument-Mismatch (vorausgesetzt, dass die tatsächlichen Argumente vom Aufrufer nicht beobachtet werden können). Weitere Einzelheiten finden Sie im [Design-Dokument](https://bit.ly/v8-faster-calls-with-arguments-mismatch).

### Verbesserte native Accessor-Leistung

Das Angular-Team [entdeckte](https://mhevery.github.io/perf-tests/DOM-megamorphic.html), dass das direkte Aufrufen von nativen Accessoren (z.B. DOM-Property-Accessor) über ihre jeweiligen `get`-Funktionen in Chrome deutlich langsamer war als der [monomorphe](https://de.wikipedia.org/wiki/Inline_Caching#Monomorphes_Inline_Caching) oder sogar der [megamorphe](https://de.wikipedia.org/wiki/Inline_Caching#Megamorphes_Inline_Caching) Property-Zugriff. Dies lag daran, dass die langsame Methode in V8 für Aufrufe von DOM-Accessoren über [`Function#call()`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Function/call) verwendet wurde, anstelle der bereits vorhandenen schnellen Methode für Property-Zugriffe.

![](/_img/v8-release-74/native-accessor-performance.svg)

Wir haben die Leistung beim Aufruf nativer Accessoren verbessert, wodurch dies erheblich schneller wurde als der megamorphe Eigenschaftszugriff. Weitere Informationen finden Sie unter [V8 Issue #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820).

### Parser-Leistung

In Chrome werden große Skripte auf Arbeitsthreads während des Herunterladens "streaming"-geparst. In dieser Version haben wir ein Leistungsproblem mit der benutzerdefinierten UTF-8-Dekodierung des Quellstroms identifiziert und behoben, was zu einer durchschnittlich 8 % schnelleren Streaming-Analyse führte.

Wir haben ein weiteres Problem im V8-Preparser gefunden, das meistens in einem Arbeitsthread läuft: Eigenschaftsnamen wurden unnötig dedupliziert. Das Entfernen dieser Deduplizierung verbesserte die Streaming-Parser-Leistung um weitere 10,5 %. Dies verbessert auch die Parsing-Zeit von Skripten im Hauptthread, die nicht gestreamt werden, wie kleine Skripte und Inline-Skripte.

![Jeder Rückgang im obigen Diagramm repräsentiert eine der Leistungsverbesserungen im Streaming-Parser.](/_img/v8-release-74/parser-performance.jpg)

## Speicher

### Bytecode-Flushing

Aus JavaScript-Quellcode kompilierter Bytecode nimmt einen erheblichen Teil des V8-Heap-Speichers ein, typischerweise etwa 15 %, einschließlich zugehöriger Metadaten. Es gibt viele Funktionen, die nur während der Initialisierung ausgeführt oder nach der Kompilierung selten genutzt werden.

Um die Speicherbelastung von V8 zu reduzieren, haben wir die Unterstützung für das Flushing von kompiliertem Bytecode aus Funktionen während der Garbage Collection implementiert, wenn sie in letzter Zeit nicht ausgeführt wurden. Um dies zu ermöglichen, verfolgen wir das Alter des Bytecodes einer Funktion, indem wir es während der Garbage Collections erhöhen und zurücksetzen, wenn die Funktion ausgeführt wird. Jeder Bytecode, der eine Altersgrenze überschreitet, kann von der nächsten Garbage Collection gesammelt werden, und die Funktion wird auf eine lazy-Rekompilierung ihres Bytecodes zurückgesetzt, falls sie in Zukunft erneut ausgeführt wird.

Unsere Experimente mit Bytecode-Flushing zeigen, dass dies signifikante Speichereinsparungen für Chrome-Benutzer bietet, indem die Menge des im V8-Heap belegten Speichers um 5–15 % reduziert wird, ohne die Leistung zu beeinträchtigen oder die CPU-Zeit für die Kompilierung von JavaScript-Code signifikant zu erhöhen.

![](/_img/v8-release-74/bytecode-flushing.svg)

### Eliminierung von toten Basisblöcken im Bytecode

Der Ignition-Bytecode-Compiler versucht, die Generierung von Code zu vermeiden, der als tot bekannt ist, z. B. Code nach einem `return`- oder `break`-Statement:

```js
return;
deadCall(); // übersprungen
```

Vorher wurde dies jedoch opportunistisch für abschließende Statements in einer Statement-Liste durchgeführt, sodass keine weiteren Optimierungen, wie das Abkürzen von Bedingungen, die als wahr bekannt sind, berücksichtigt wurden:

```js
if (2.2) return;
deadCall(); // nicht übersprungen
```

Wir haben versucht, dies in V8 v7.3 zu lösen, jedoch immer noch auf einer Per-Statement-Ebene, was nicht funktionierte, wenn der Kontrollfluss komplizierter wurde, z. B.

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // nicht übersprungen
```

Das obige `deadCall()` wäre der Anfang eines neuen Basisblocks, der auf einer Per-Statement-Ebene als Ziel für `break`-Anweisungen in der Schleife erreichbar ist.

In V8 v7.4 erlauben wir es, dass gesamte Basisblöcke tot werden, wenn kein `Jump`-Bytecode (die Hauptsteuerflusseinheit von Ignition) auf sie verweist. Im obigen Beispiel wird das `break` nicht emittiert, was bedeutet, dass die Schleife keine `break`-Anweisungen hat. Der Basisblock, der mit `deadCall()` beginnt, hat keinen referenzierenden Sprung und wird daher ebenfalls als tot betrachtet. Obwohl wir nicht erwarten, dass dies großen Einfluss auf Benutzer-Code hat, ist es besonders nützlich zur Vereinfachung verschiedener Entzuckerungen, wie Generatoren, `for-of` und `try-catch`, und entfernt insbesondere eine Klasse von Fehlern, bei denen Basisblöcke „wiederbelebt“ werden konnten, während komplexe Anweisungen teilweise implementiert wurden.

## JavaScript-Sprachfunktionen

### Private Klassenfelder

V8 v7.2 fügte Unterstützung für die Syntax öffentlicher Klassenfelder hinzu. Klassenfelder vereinfachen die Klassensyntax, indem sie Konstruktorfunktionen überflüssig machen, nur um Instanz-Eigenschaften zu definieren. Ab V8 v7.4 können Sie ein Feld als privat markieren, indem Sie ihm ein `#`-Präfix voranstellen.

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('Den aktuellen Wert abrufen!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Im Gegensatz zu öffentlichen Feldern sind private Felder außerhalb des Klassenkörpers nicht zugänglich:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

Weitere Informationen finden Sie in unserem [Erklärartikel zu öffentlichen und privaten Klassenfeldern](/features/class-fields).

### `Intl.Locale`

JavaScript-Anwendungen verwenden in der Regel Zeichenfolgen wie `'en-US'` oder `'de-CH'`, um Sprachen zu identifizieren. `Intl.Locale` bietet einen leistungsfähigeren Mechanismus, um mit Sprachen umzugehen, und ermöglicht die einfache Extraktion von sprachspezifischen Einstellungen wie Sprache, Kalender, Nummerierungssystem, Stundenzyklus und mehr.

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → 'es-419-u-ca-gregory-hc-h12'
```

### Hashbang-Syntax

JavaScript-Programme können jetzt mit `#!` beginnen, einem sogenannten [Hashbang](https://github.com/tc39/proposal-hashbang). Der Rest der Zeile nach dem Hashbang wird als einzeiliger Kommentar behandelt. Dies entspricht der de facto Nutzung in JavaScript-Hosts für die Befehlszeile, wie z. B. Node.js. Das folgende ist jetzt ein syntaktisch gültiges JavaScript-Programm:

```js
#!/usr/bin/env node
console.log(42);
```

## V8-API

Bitte verwenden Sie `git log branch-heads/7.3..branch-heads/7.4 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 7.4 -t branch-heads/7.4` verwenden, um mit den neuen Funktionen in V8 v7.4 zu experimentieren. Alternativ können Sie sich für den [Beta-Kanal von Chrome](https://www.google.com/chrome/browser/beta.html) anmelden und die neuen Funktionen bald selbst ausprobieren.
