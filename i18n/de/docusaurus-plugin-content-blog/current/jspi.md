---
title: 'Einführung in die JavaScript Promise Integration API für WebAssembly'
description: 'Dieses Dokument stellt JSPI vor und bietet einige einfache Beispiele, um Ihnen den Einstieg in die Nutzung zu erleichtern'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-07-01
tags:
  - WebAssembly
---
Die JavaScript Promise Integration (JSPI) API ermöglicht es WebAssembly-Anwendungen, die für _synchronen_ Zugriff auf externe Funktionen geschrieben wurden, reibungslos in einer Umgebung zu arbeiten, in der diese Funktionen tatsächlich _asynchron_ sind.

<!--truncate-->
Diese Notiz skizziert, was die zentralen Fähigkeiten der JSPI API sind, wie man darauf zugreift, wie man Software dafür entwickelt und bietet einige Beispiele zum Ausprobieren.

## Wofür ist 'JSPI' gedacht?

Asynchrone APIs arbeiten, indem sie die _Initiierung_ einer Operation von ihrer _Auflösung_ trennen, wobei letztere einige Zeit nach der ersten eintritt. Am wichtigsten ist, dass die Anwendung nach dem Start der Operation weiter ausgeführt wird und benachrichtigt wird, wenn die Operation abgeschlossen ist.

Beispielsweise können Web-Anwendungen mit der `fetch` API auf die Inhalte zugreifen, die mit einer URL verbunden sind. Die Funktion `fetch` gibt jedoch nicht direkt die Ergebnisse des Abrufs zurück, sondern ein `Promise`-Objekt. Die Verbindung zwischen der Abrufantwort und der ursprünglichen Anforderung wird wiederhergestellt, indem diesem `Promise`-Objekt ein _Callback_ zugeordnet wird. Die Callback-Funktion kann die Antwort inspizieren und die Daten sammeln (sofern diese natürlich vorhanden sind).

In vielen Fällen werden Anwendungen in C/C++ (und vielen anderen Sprachen) ursprünglich gegen eine _synchrone_ API geschrieben. Beispielsweise wird die Posix-Funktion `read` erst abgeschlossen, nachdem die E/A-Operation abgeschlossen ist: Die Funktion `read` *blockiert*, bis die Lesung abgeschlossen ist.

Es ist jedoch nicht erlaubt, den Haupt-Thread des Browsers zu blockieren, und viele Umgebungen unterstützen keine synchrone Programmierung. Das Ergebnis ist eine Diskrepanz zwischen dem Wunsch des Anwendungsprogrammierers nach einer einfach zu bedienenden API und dem breiteren Ökosystem, das erfordert, dass E/A mit asynchronem Code entwickelt wird. Dies ist insbesondere ein Problem für bestehende ältere Anwendungen, deren Portierung teuer wäre.

Die JSPI ist eine API, die die Lücke zwischen synchronen Anwendungen und asynchronen Web-APIs überbrückt. Sie funktioniert, indem sie `Promise`-Objekte abfängt, die von asynchronen Web-API-Funktionen zurückgegeben werden, und die WebAssembly-Anwendung _anhalten_. Sobald die asynchrone E/A-Operation abgeschlossen ist, wird die WebAssembly-Anwendung _fortgesetzt_. Dies ermöglicht es der WebAssembly-Anwendung, linearen Code zu verwenden, um asynchrone Operationen auszuführen und deren Ergebnisse zu verarbeiten.

Entscheidend ist, dass die Nutzung von JSPI sehr wenige Änderungen an der WebAssembly-Anwendung selbst erfordert.

### Wie funktioniert JSPI?

JSPI funktioniert, indem es das `Promise`-Objekt abfängt, das von JavaScript-Aufrufen zurückgegeben wird, und die Hauptlogik der WebAssembly-Anwendung anhält. Ein Callback wird diesem `Promise`-Objekt hinzugefügt, das den angehaltenen WebAssembly-Code erneut ausführt, wenn es vom Task-Runner der Ereignisschleife des Browsers aufgerufen wird.

Darüber hinaus wird der WebAssembly-Export umgestaltet, um ein `Promise`-Objekt &mdash; anstelle des ursprünglich vom Export zurückgegebenen Werts &mdash; zurückzugeben. Dieses `Promise`-Objekt wird zum Wert, der von der WebAssembly-Anwendung zurückgegeben wird: Wenn der WebAssembly-Code angehalten wird,[^first] wird das Export-`Promise`-Objekt als der Wert des Aufrufs an WebAssembly zurückgegeben.

[^first]: Wenn eine WebAssembly-Anwendung mehr als einmal angehalten wird, führen die nachfolgenden Anhaltungen zur Ereignisschleife des Browsers zurück und sind für die Web-Anwendung nicht direkt sichtbar.

Das Export-Promise wird aufgelöst, wenn der ursprüngliche Aufruf abgeschlossen ist: Wenn die ursprüngliche WebAssembly-Funktion einen normalen Wert zurückgibt, wird das Export-`Promise`-Objekt mit diesem Wert (konvertiert in ein JavaScript-Objekt) aufgelöst; wenn eine Ausnahme ausgelöst wird, wird das Export-`Promise`-Objekt abgelehnt.

#### Wrapping von Imports und Exports

Dies wird durch das _Wrapping_ von Imports und Exports während der WebAssembly-Modul-Instantiierungsphase ermöglicht. Die Funktions-Wrapper fügen dem normalen asynchronen Import das anhaltende Verhalten hinzu und leiten die Anhaltungen an `Promise`-Objekt-Callbacks weiter.

Es ist nicht notwendig, alle Exports und Imports eines WebAssembly-Moduls zu wrappen. Einige Exports, deren Ausführungspfade das Aufrufen asynchroner APIs nicht umfassen, sollten besser ungewrappt bleiben. Ebenso sind nicht alle Imports eines WebAssembly-Moduls Funktionen zu asynchronen APIs; diese Imports sollten ebenfalls nicht gewrappt werden.

Natürlich gibt es eine erhebliche Menge an internen Mechanismen, die dies ermöglichen,[^1] aber weder die JavaScript-Sprache noch WebAssembly selbst werden durch JSPI verändert. Seine Operationen sind auf die Grenze zwischen JavaScript und WebAssembly beschränkt.

Aus der Sicht eines Webanwendungsentwicklers ergibt sich ein Codekörper, der in der JavaScript-Welt von asynchronen Funktionen und Promises auf eine analoge Weise wie andere asynchrone Funktionen, die in JavaScript geschrieben sind, teilnimmt. Aus der Sicht des WebAssembly-Entwicklers ermöglicht dies, Anwendungen unter Verwendung synchroner APIs zu erstellen und dennoch am asynchronen Ökosystem des Webs teilzunehmen.

### Erwartete Leistung

Da die Mechanismen zum Anhalten und Fortsetzen von WebAssembly-Modulen im Wesentlichen konstante Zeit benötigen, erwarten wir keine hohen Kosten bei der Verwendung von JSPI &mdash; besonders im Vergleich zu anderen transformationsbasierten Ansätzen.

Es ist eine konstante Menge an Arbeit erforderlich, um das `Promise`-Objekt, das durch den asynchronen API-Aufruf zurückgegeben wird, an WebAssembly weiterzugeben. Ebenso kann die WebAssembly-Anwendung, wenn ein Promise aufgelöst wird, mit konstantem Zeitaufwand fortgesetzt werden.

Wie bei anderen Promise-basierten APIs im Browser gilt jedoch, dass die WebAssembly-Anwendung, sobald sie angehalten wird, nicht erneut 'geweckt' wird, außer durch den Task-Runner des Browsers. Dies erfordert, dass die Ausführung des JavaScript-Codes, der die WebAssembly-Berechnung gestartet hat, selbst an den Browser zurückgegeben wird.

### Kann ich JSPI verwenden, um JavaScript-Programme anzuhalten?

JavaScript verfügt bereits über einen gut entwickelten Mechanismus zur Darstellung asynchroner Berechnungen: das `Promise`-Objekt und die `async`-Funktion-Notation. JSPI ist so konzipiert, dass es gut damit integriert werden kann, aber nicht, um es zu ersetzen.

### Wie kann ich JSPI heute verwenden?

JSPI wird derzeit von der W3C-WebAssembly-Arbeitsgruppe standardisiert. Zum Zeitpunkt dieses Schreibens befindet es sich in Phase 3 des Standardisierungsprozesses, und wir erwarten eine vollständige Standardisierung vor Ende 2024.

JSPI ist für Chrome unter Linux, MacOS, Windows und ChromeOS auf Intel- und Arm-Plattformen sowohl in 64-Bit als auch 32-Bit verfügbar.[^firefox]

[^firefox]: JSPI ist auch in der Firefox Nightly-Version verfügbar: Aktivieren Sie "`javascript.options.wasm_js_promise_integration`" im about:config-Panel &mdash; und starten Sie den Browser neu.

JSPI kann heute auf zwei Arten verwendet werden: über ein [Origin Trial](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889) und lokal über ein Chrome-Flag. Um es lokal zu testen, gehen Sie in Chrome zu `chrome://flags`, suchen Sie nach „Experimental WebAssembly JavaScript Promise Integration (JSPI)“ und aktivieren Sie das Kontrollkästchen. Starten Sie Chrome neu, damit die Änderung wirksam wird.

Sie sollten mindestens die Version `126.0.6478.26` verwenden, um die neueste Version der API zu erhalten. Wir empfehlen die Verwendung des Dev-Kanals, um sicherzustellen, dass alle Stabilitätsupdates angewendet werden. Zusätzlich, wenn Sie Emscripten verwenden möchten, um WebAssembly zu generieren (was wir empfehlen), sollten Sie eine Version verwenden, die mindestens `3.1.61` ist.

Sobald aktiviert, sollten Sie in der Lage sein, Skripte auszuführen, die JSPI verwenden. Unten zeigen wir, wie Sie Emscripten verwenden können, um ein WebAssembly-Modul in C/C++ zu generieren, das JSPI verwendet. Wenn Ihre Anwendung eine andere Sprache beinhaltet, z. B. nicht Emscripten verwendet, empfehlen wir Ihnen, sich anzusehen, wie die API funktioniert. Dazu sollten Sie sich das [Proposal](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) ansehen.

#### Einschränkungen

Die Chrome-Implementierung von JSPI unterstützt bereits typische Anwendungsfälle. Es wird jedoch immer noch als experimentell betrachtet, daher gibt es einige Einschränkungen, die zu beachten sind:

- Erfordert die Verwendung eines Befehlszeilen-Flags oder die Teilnahme am Origin-Trial.
- Jeder Aufruf eines JSPI-Exports läuft auf einem Stapel fester Größe.
- Die Debugging-Unterstützung ist etwas minimal. Insbesondere kann es schwierig sein, die verschiedenen Ereignisse im Dev-Tools-Panel zu sehen. Eine reichhaltigere Unterstützung für das Debuggen von JSPI-Anwendungen ist in der Roadmap enthalten.

## Eine kleine Demo

Um all dies in Aktion zu sehen, probieren wir ein einfaches Beispiel aus. Dieses C-Programm berechnet Fibonacci auf spektakulär schlechte Weise: Es bittet JavaScript, die Addition durchzuführen, und macht es noch schlimmer, indem es JavaScript-`Promise`-Objekte verwendet, um dies zu tun:[^2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// promise ein Addition
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

Die Funktion `promiseFib` selbst ist eine einfache rekursive Version der Fibonacci-Funktion. Der interessante Teil (aus unserer Sicht) ist die Definition von `promiseAdd`, die die Addition der beiden Fibonacci-Hälften durchführt — unter Verwendung von JSPI!.

Wir verwenden das `EM_ASYNC_JS`-Makro von Emscripten, um die Funktion `promiseFib` als JavaScript-Funktion innerhalb des Körpers unseres C-Programms zu schreiben. Da Addition normalerweise keine Promises in JavaScript beinhaltet, müssen wir dies erzwingen, indem wir ein `Promise` erstellen.

Das `EM_ASYNC_JS`-Makro generiert den gesamten erforderlichen Verknüpfungscode, sodass wir JSPI verwenden können, um auf das Ergebnis des Promises zuzugreifen, als wäre es eine normale Funktion.

Um unsere kleine Demo zu kompilieren, verwenden wir den `emcc`-Compiler von Emscripten:[^4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

Dies kompiliert unser Programm und erstellt eine ladbare HTML-Datei (`b.html`). Die wichtigste Befehlszeilenoption hier ist `-s JSPI`. Dies aktiviert die Option, Code zu generieren, der JSPI verwendet, um mit JavaScript-Importen zu interagieren, die Promises zurückgeben.

Wenn Sie die generierte Datei `b.html` in Chrome laden, sollten Sie eine Ausgabe sehen, die ungefähr aussieht wie:

```
fib(0) 0μs 0μs 0μs
fib(1) 0μs 0μs 0μs
fib(2) 0μs 0μs 3μs
fib(3) 0μs 0μs 4μs
…
fib(15) 0μs 13μs 1225μs
```

Dies ist einfach eine Liste der ersten 15 Fibonacci-Zahlen, gefolgt von der durchschnittlichen Zeit in Mikrosekunden, die benötigt wurde, um eine einzelne Fibonacci-Zahl zu berechnen. Die drei Zeitwerte in jeder Zeile beziehen sich auf die Zeit für eine reine WebAssembly-Berechnung, für eine gemischte JavaScript/WebAssembly-Berechnung und die dritte Zahl gibt die Zeit für eine aussetzende Version der Berechnung an.

Beachten Sie, dass `fib(2)` die kleinste Berechnung ist, die den Zugriff auf ein Promise beinhaltet, und bis `fib(15)` berechnet ist, wurden etwa 1000 Aufrufe an `promiseAdd` durchgeführt. Dies deutet darauf hin, dass die tatsächlichen Kosten einer JSPI-Funktion etwa 1μs betragen – deutlich höher als das bloße Addieren zweier Ganzzahlen, aber wesentlich geringer als die Millisekunden, die typischerweise für den Zugriff auf eine externe I/O-Funktion erforderlich sind.

## Verwendung von JSPI für das Lazy-Loading von Code

Im nächsten Beispiel betrachten wir eine möglicherweise überraschende Verwendung von JSPI: das dynamische Laden von Code. Die Idee ist, ein Modul zu `fetch`, das benötigten Code enthält, dies aber zu verzögern, bis die benötigte Funktion erstmals aufgerufen wird.

Wir müssen JSPI verwenden, da APIs wie `fetch` von Natur aus asynchron sind, wir sie jedoch von beliebigen Stellen in unserer Anwendung aus aufrufen möchten – insbesondere aus der Mitte eines Aufrufs einer Funktion, die noch nicht existiert.

Die Kernidee besteht darin, eine dynamisch geladene Funktion durch eine Platzhalter-Funktion zu ersetzen; dieser Platzhalter lädt zunächst den fehlenden Funktionscode, ersetzt sich selbst durch den geladenen Code und ruft dann den neu geladenen Code mit den ursprünglichen Argumenten auf. Jeder nachfolgende Aufruf der Funktion geht direkt an die geladene Funktion. Diese Strategie ermöglicht eine im Wesentlichen transparente Herangehensweise an das dynamische Laden von Code.

Das Modul, das wir laden werden, ist ziemlich einfach, es enthält eine Funktion, die `42` zurückgibt:

```c
// Dies ist ein einfacher Anbieter für zweiundvierzig
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

Das befindet sich in einer Datei namens `p42.c` und wird mit Emscripten kompiliert, ohne jegliche „Extras“ zu bauen:

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

Das Präfix `EMSCRIPTEN_KEEPALIVE` ist ein Emscripten-Makro, das sicherstellt, dass die Funktion `provide42` nicht entfernt wird, selbst wenn sie im Code nicht verwendet wird. Dies führt zu einem WebAssembly-Modul, das die Funktion enthält, die wir dynamisch laden möchten.

Die in den Build von `p42.c` hinzugefügte Option `-Wl,--import-memory` stellt sicher, dass es Zugriff auf denselben Speicher hat wie das Hauptmodul.[^3]

Um Code dynamisch zu laden, verwenden wir die Standard-API `WebAssembly.instantiateStreaming`:

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

Dieser Ausdruck verwendet `fetch`, um das kompiliierte Wasm-Modul zu lokalisieren, `WebAssembly.instantiateStreaming`, um das Ergebnis des Fetch zu kompilieren und ein instanziiertes Modul daraus zu erstellen. Sowohl `fetch` als auch `WebAssembly.instantiateStreaming` geben Promises zurück; daher können wir nicht einfach auf das Ergebnis zugreifen und unsere benötigte Funktion extrahieren. Stattdessen packen wir dies in einen JSPI-Import im Stil vom `EM_ASYNC_JS`-Makro:

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('lade promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

Beachten Sie den Aufruf von `console.log`, den wir verwenden, um sicherzustellen, dass unsere Logik korrekt ist.

`addFunction` ist Teil der Emscripten-API, aber um sicherzustellen, dass sie zur Laufzeit für uns verfügbar ist, müssen wir `emcc` informieren, dass sie eine erforderliche Abhängigkeit ist. Dies tun wir mit der folgenden Zeile:

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

In einer Situation, in der wir Code dynamisch laden möchten, möchten wir sicherstellen, dass wir keinen Code unnötig laden; in diesem Fall möchten wir sicherstellen, dass nachfolgende Aufrufe von `provide42` keine erneuten Ladevorgänge auslösen. C hat eine einfache Funktion, die wir dafür nutzen können: Wir rufen `provide42` nicht direkt auf, sondern tun dies über ein Trampolin, das bewirkt, dass die Funktion geladen wird, und dann, kurz bevor die Funktion tatsächlich aufgerufen wird, das Trampolin ändert, sodass es sich selbst umgeht. Wir können dies mit einem geeigneten Funktionszeiger tun:

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

Aus der Perspektive des restlichen Programms wird die Funktion, die wir aufrufen möchten, `get42` genannt. Ihre anfängliche Implementierung erfolgt über `stub`, das `resolveFun` aufruft, um die Funktion tatsächlich zu laden. Nach erfolgreichem Laden ändern wir `get42`, sodass es auf die neu geladene Funktion zeigt – und rufen sie auf.

Unsere Hauptfunktion ruft `get42` zweimal auf:[^6]

```c
int main() {
  printf("erster Aufruf p42() = %ld\n", get42());
  printf("zweiter Aufruf = %ld\n", get42());
}
```

Das Ergebnis der Ausführung im Browser ist ein Protokoll, das wie folgt aussieht:

```
Lade Versprechen42
Erster Aufruf p42() = 42
Zweiter Aufruf = 42
```

Beachten Sie, dass die Zeile `Lade Versprechen42` nur einmal erscheint, während `get42` tatsächlich zweimal aufgerufen wird.

Dieses Beispiel zeigt, dass JSPI auf unerwartete Weise verwendet werden kann: das dynamische Laden von Code scheint weit entfernt vom Erstellen von Versprechen zu sein. Darüber hinaus gibt es andere Möglichkeiten, WebAssembly-Module dynamisch miteinander zu verknüpfen; dies soll keine endgültige Lösung für dieses Problem darstellen.

Wir freuen uns darauf zu sehen, was Sie mit dieser neuen Fähigkeit machen können! Nehmen Sie an der Diskussion in der W3C-WebAssembly-Community-Gruppe [Repo](https://github.com/WebAssembly/js-promise-integration) teil.

## Anhang A: Vollständige Auflistung von `badfib`


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define Mikrosekunden (1000000)

long add(long x, long y) {
  return x + y;
}

// JS bitten, die Addition auszuführen
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// Ein Versprechen für eine Addition
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * Mikrosekunden;
    double jsTime = (runTest(runJs, ix, count) / count) * Mikrosekunden;
    double promiseTime = (runTest(runPromise, ix, count) / count) * Mikrosekunden;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## Anhang B: Auflistung von `u42.c` und `p42.c`

Der `u42.c`-C-Code stellt den Hauptteil unseres Beispiels für dynamisches Laden dar:

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// Ein Versprechen für eine Funktion
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('Lade Versprechen42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("Erster Aufruf p42() = %ld\n", get42());
  printf("Zweiter Aufruf = %ld\n", get42());
}
```

Der `p42.c`-Code ist das dynamisch geladene Modul.

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- Fußnoten selbst am Ende. -->
## Anmerkungen

[^1]: Für technisch Interessierte siehe [den WebAssembly-Vorschlag für JSPI](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) und [das V8-Stapelumschaltungs-Designportfolio](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y).

[^2]: Hinweis: Wir fügen das vollständige Programm unten in Anhang A ein.

[^3]: Wir benötigen dieses Flag für unser spezifisches Beispiel nicht, aber Sie würden es wahrscheinlich für größere Projekte benötigen.

[^4]: Hinweis: Sie benötigen eine Version von Emscripten, die ≥ 3.1.61 ist.

[^6]: Das vollständige Programm wird im Anhang B gezeigt.
