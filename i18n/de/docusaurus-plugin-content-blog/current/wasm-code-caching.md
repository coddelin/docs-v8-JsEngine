---
title: "Code-Caching für WebAssembly-Entwickler"
author: "[Bill Budge](https://twitter.com/billb), der das Katsching ins Caching bringt"
avatars:
  - bill-budge
date: 2019-06-17
tags:
  - WebAssembly
  - Interna
description: "Dieser Artikel erklärt Chrome’s WebAssembly-Code-Cache und wie Entwickler davon profitieren können, um das Laden von Anwendungen mit großen WebAssembly-Modulen zu beschleunigen."
tweet: "1140631433532334081"
---
Es gibt ein Sprichwort unter Entwicklern, dass der schnellste Code derjenige ist, der gar nicht ausgeführt wird. Ebenso ist der schnellste kompilierte Code derjenige, der nicht kompiliert werden muss. Das WebAssembly-Code-Caching ist eine neue Optimierung in Chrome und V8, die versucht, die Code-Kompilierung zu vermeiden, indem der vom Compiler erzeugte native Code zwischengespeichert wird. Wir haben [geschrieben](/blog/code-caching) [über](/blog/improved-code-caching) [wie](/blog/code-caching-for-devs) Chrome und V8 in der Vergangenheit JavaScript-Code cachen und beste Praktiken, um von dieser Optimierung zu profitieren. In diesem Blog-Beitrag beschreiben wir die Funktionsweise des WebAssembly-Code-Caches in Chrome und wie Entwickler ihn nutzen können, um das Laden von Anwendungen mit großen WebAssembly-Modulen zu beschleunigen.

<!--truncate-->
## Rückblick auf die WebAssembly-Kompilierung

WebAssembly ist eine Möglichkeit, nicht-JavaScript-Code im Web auszuführen. Eine Web-App kann WebAssembly verwenden, indem sie eine `.wasm`-Ressource lädt, die teilweise kompilierten Code aus einer anderen Sprache wie C, C++ oder Rust (und weiteren) enthält. Die Aufgabe des WebAssembly-Compilers besteht darin, die `.wasm`-Ressource zu dekodieren, zu validieren, dass sie gut geformt ist, und sie dann in nativen Maschinencode zu kompilieren, der auf dem Rechner des Benutzers ausgeführt werden kann.

V8 hat zwei Compiler für WebAssembly: Liftoff und TurboFan. [Liftoff](/blog/liftoff) ist der Baseline-Compiler, der Module so schnell wie möglich kompiliert, damit die Ausführung so schnell wie möglich beginnen kann. TurboFan ist der Optimierungs-Compiler von V8 für sowohl JavaScript als auch WebAssembly. Er läuft im Hintergrund, um hochwertigen nativen Code zu generieren, damit eine Web-App langfristig optimale Leistung erzielen kann. Für große WebAssembly-Module kann TurboFan beträchtliche Zeit in Anspruch nehmen — 30 Sekunden bis eine Minute oder mehr —, um ein WebAssembly-Modul vollständig zu nativen Code zu kompilieren.

Hier kommt das Code-Caching ins Spiel. Sobald TurboFan das Kompilieren eines großen WebAssembly-Moduls abgeschlossen hat, kann Chrome den Code in seinem Cache speichern, sodass beim nächsten Laden des Moduls sowohl die Liftoff- als auch die TurboFan-Kompilierung übersprungen werden können, was zu einem schnelleren Start und geringerer Stromverbrauch führt — das Kompilieren von Code ist sehr CPU-intensiv.

Das WebAssembly-Code-Caching verwendet dieselben Mechanismen in Chrome wie das Caching von JavaScript-Code. Wir verwenden denselben Typ von Speicher und dieselbe doppelt-schlüssige Caching-Technik, die Code, der von verschiedenen Ursprüngen kompiliert wurde, getrennt hält, gemäß der [Seitenisolierung](https://developers.google.com/web/updates/2018/07/site-isolation), einer wichtigen Sicherheitsfunktion von Chrome.

## Algorithmus für das WebAssembly-Code-Caching

Derzeit ist das WebAssembly-Caching nur für die Streaming-API-Aufrufe `compileStreaming` und `instantiateStreaming` implementiert. Diese arbeiten mit einem HTTP-Fetch einer `.wasm`-Ressource, was es einfacher macht, die Ressourcenabruf- und Caching-Mechanismen von Chrome zu nutzen und eine praktische Resource-URL als Schlüssel zur Identifizierung des WebAssembly-Moduls bereitzustellen. Der Caching-Algorithmus funktioniert wie folgt:

1. Wenn eine `.wasm`-Ressource erstmals angefordert wird (d. h. ein _kalter Lauf_), lädt Chrome sie aus dem Netzwerk herunter und streamt sie zu V8, um sie zu kompilieren. Chrome speichert die `.wasm`-Ressource auch im Ressourcen-Cache des Browsers, der im Dateisystem des Geräts des Benutzers gespeichert ist. Dieser Ressourcen-Cache ermöglicht es, die Ressource beim nächsten Bedarf schneller zu laden.
1. Sobald TurboFan das Modul vollständig kompiliert hat und wenn die `.wasm`-Ressource groß genug ist (derzeit ab 128 kB), schreibt Chrome den kompilierten Code in den WebAssembly-Code-Cache. Dieser Code-Cache ist physisch getrennt vom Ressourcen-Cache aus Schritt 1.
1. Wenn eine `.wasm`-Ressource ein zweites Mal angefordert wird (d. h. ein _heißer Lauf_), lädt Chrome die `.wasm`-Ressource aus dem Ressourcen-Cache und führt gleichzeitig eine Abfrage des Code-Caches durch. Wenn ein Cache-Treffer vorliegt, werden die kompilierten Moduldaten an den Renderer-Prozess gesendet und an V8 übergeben, das den Code deserialisiert, anstatt das Modul zu kompilieren. Deserialisieren ist schneller und weniger CPU-intensiv als Kompilieren.
1. Es kann sein, dass der zwischengespeicherte Code nicht mehr gültig ist. Dies kann passieren, weil sich die `.wasm`-Ressource geändert hat oder weil sich V8 geändert hat — etwas, das aufgrund des schnellen Release-Zyklus von Chrome mindestens alle sechs Wochen erwartet wird. In diesem Fall wird der zwischengespeicherte native Code aus dem Cache gelöscht, und die Kompilierung erfolgt wie in Schritt 1.

Basierend auf dieser Beschreibung können wir einige Empfehlungen geben, um die Nutzung des WebAssembly-Code-Caches Ihrer Website zu verbessern.

## Tipp 1: Verwenden Sie die WebAssembly-Streaming-API

Da Code-Caching nur mit der Streaming-API funktioniert, kompilieren oder instanziieren Sie Ihr WebAssembly-Modul mit `compileStreaming` oder `instantiateStreaming`, wie in diesem JavaScript-Ausschnitt:

```js
(async () => {
  const fetchPromise = fetch('fibonacci.wasm');
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();
```

Dieser [Artikel](https://developers.google.com/web/updates/2018/04/loading-wasm) beschreibt ausführlich die Vorteile der Verwendung der WebAssembly-Streaming-API. Emscripten versucht standardmäßig, diese API zu verwenden, wenn es Ladecode für Ihre App generiert. Beachten Sie, dass Streaming voraussetzt, dass die `.wasm`-Ressource den richtigen MIME-Typ hat, sodass der Server den `Content-Type: application/wasm`-Header in seiner Antwort senden muss.

## Tipp 2: Cache-freundlich sein

Da Code-Caching von der Ressourcen-URL und davon abhängt, ob die `.wasm`-Ressource aktuell ist, sollten Entwickler versuchen, diese beiden stabil zu halten. Wenn die `.wasm`-Ressource von einer anderen URL abgerufen wird, wird sie als unterschiedlich betrachtet und V8 muss das Modul erneut kompilieren. Ebenso, wenn die `.wasm`-Ressource im Ressourcen-Cache nicht mehr gültig ist, muss Chrome den zwischengespeicherten Code verwerfen.

### Halten Sie Ihren Code stabil

Wann immer Sie ein neues WebAssembly-Modul herausgeben, muss es vollständig neu kompiliert werden. Geben Sie neue Versionen Ihres Codes nur heraus, wenn es notwendig ist, neue Funktionen zu liefern oder Fehler zu beheben. Wenn sich Ihr Code nicht geändert hat, teilen Sie dies Chrome mit. Wenn der Browser eine HTTP-Anfrage für eine Ressourcen-URL, wie ein WebAssembly-Modul, stellt, enthält er das Datum und die Uhrzeit des letzten Abrufs dieser URL. Wenn der Server weiß, dass sich die Datei nicht geändert hat, kann er eine `304 Not Modified`-Antwort zurücksenden, die Chrome und V8 mitteilt, dass die zwischengespeicherte Ressource und damit der zwischengespeicherte Code weiterhin gültig sind. Andererseits aktualisiert eine `200 OK`-Antwort die zwischengespeicherte `.wasm`-Ressource und macht den Code-Cache ungültig, wodurch WebAssembly zurück zu einem Kaltstart zurückkehrt. Befolgen Sie die [besten Praktiken für Webressourcen](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching), indem Sie die Antwort verwenden, um den Browser darüber zu informieren, ob die `.wasm`-Ressource zwischenspeicherbar ist, wie lange sie voraussichtlich gültig ist oder wann sie zuletzt geändert wurde.

### Ändern Sie nicht die URL Ihres Codes

Zwischengespeicherter kompilierter Code ist mit der URL der `.wasm`-Ressource verbunden, was es einfach macht, ihn nachzuschlagen, ohne die tatsächliche Ressource scannen zu müssen. Das bedeutet, dass das Ändern der URL einer Ressource (einschließlich aller Abfrageparameter!) einen neuen Eintrag in unserem Ressourcen-Cache erstellt, was auch eine vollständige Neukompilierung erfordert und einen neuen Code-Cache-Eintrag erstellt.

### Machen Sie es groß (aber nicht zu groß!)

Das Hauptkriterium für das WebAssembly-Code-Caching ist die Größe der `.wasm`-Ressource. Wenn die `.wasm`-Ressource kleiner als eine bestimmte Schwellenwertgröße ist, speichern wir die kompilierten Modulbytes nicht im Cache. Der Grund hierfür ist, dass V8 kleine Module möglicherweise schneller kompilieren kann, als den kompilierten Code aus dem Cache zu laden. Im Moment liegt die Grenze bei `.wasm`-Ressourcen von 128 kB oder mehr.

Aber größer ist nur bis zu einem gewissen Punkt besser. Da Caches Platz auf dem Rechner des Benutzers einnehmen, achtet Chrome darauf, nicht zu viel Platz zu verbrauchen. Derzeit halten die Code-Caches auf Desktop-Geräten typischerweise einige hundert Megabyte an Daten. Da die Chrome-Caches die größten Einträge im Cache auch auf einen Bruchteil der Gesamtcachegröße beschränken, gibt es eine weitere Begrenzung von etwa 150 MB für den kompilierten WebAssembly-Code (die Hälfte der Gesamtcachegröße). Es ist wichtig zu beachten, dass kompilierte Module auf einem typischen Desktop-Rechner oft 5–7 Mal größer sind als die entsprechende `.wasm`-Ressource.

Diese Größenheuristik, wie das gesamte Caching-Verhalten, kann sich ändern, wenn wir herausfinden, was für Benutzer und Entwickler am besten funktioniert.

### Verwenden Sie einen Service Worker

WebAssembly-Code-Caching ist für Worker und Service Worker aktiviert, sodass es möglich ist, sie zu verwenden, um eine neue Code-Version zu laden, zu kompilieren und zu cachen, sodass sie beim nächsten Start Ihrer App verfügbar ist. Jede Website muss mindestens eine vollständige Kompilierung eines WebAssembly-Moduls durchführen – verwenden Sie Worker, um dies vor Ihren Benutzern zu verbergen.

## Tracing

Als Entwickler möchten Sie vielleicht prüfen, ob Ihr kompiliertes Modul von Chrome zwischengespeichert wird. WebAssembly-Code-Caching-Ereignisse werden standardmäßig nicht in den Chrome-Entwicklertools angezeigt, daher ist die beste Möglichkeit, herauszufinden, ob Ihre Module zwischengespeichert werden, die Verwendung der etwas tiefergehenden `chrome://tracing`-Funktion.

`chrome://tracing` zeichnet instrumentierte Spuren von Chrome über einen bestimmten Zeitraum auf. Tracing zeichnet das Verhalten des gesamten Browsers auf, einschließlich anderer Tabs, Fenster und Erweiterungen, sodass es am besten funktioniert, wenn es in einem sauberen Benutzerprofil, mit deaktivierten Erweiterungen und ohne andere offene Browser-Tabs durchgeführt wird:

```bash
# Starten Sie eine neue Chrome-Browsersitzung mit einem sauberen Benutzerprofil und deaktivierten Erweiterungen
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Navigieren Sie zu `chrome://tracing` und klicken Sie auf „Aufzeichnen“, um eine Tracing-Sitzung zu starten. In dem erscheinenden Dialogfenster klicken Sie auf „Kategorien bearbeiten“ und aktivieren die Kategorie `devtools.timeline` auf der rechten Seite unter „Disabled by Default Categories“ (Sie können andere vorgewählte Kategorien deaktivieren, um die gesammelte Datenmenge zu reduzieren). Klicken Sie dann im Dialogfenster auf „Aufzeichnen“, um mit der Nachverfolgung zu beginnen.

Laden oder aktualisieren Sie Ihre App in einem anderen Tab. Lassen Sie sie lange genug laufen, mindestens 10 Sekunden, um sicherzustellen, dass die TurboFan-Kompilierung abgeschlossen ist. Wenn Sie fertig sind, klicken Sie auf „Stop“, um die Nachverfolgung zu beenden. Eine Zeitachsenansicht der Ereignisse erscheint. Oben rechts im Tracing-Fenster befindet sich ein Textfeld, direkt rechts neben „Ansichtsoptionen“. Geben Sie `v8.wasm` ein, um Nicht-WebAssembly-Ereignisse herauszufiltern. Sie sollten eines oder mehrere der folgenden Ereignisse sehen:

- `v8.wasm.streamFromResponseCallback` — Der Ressourcenabruf, der an instantiateStreaming übergeben wurde, hat eine Antwort erhalten.
- `v8.wasm.compiledModule` — TurboFan hat die Kompilierung der `.wasm`-Ressource abgeschlossen.
- `v8.wasm.cachedModule` — Chrome hat das kompilierte Modul in den Code-Cache geschrieben.
- `v8.wasm.moduleCacheHit` — Chrome hat den Code im Cache gefunden, während die `.wasm`-Ressource geladen wurde.
- `v8.wasm.moduleCacheInvalid` — V8 konnte den zwischengespeicherten Code nicht deserialisieren, da er veraltet war.

Bei einem ersten Durchlauf erwarten wir die Ereignisse `v8.wasm.streamFromResponseCallback` und `v8.wasm.compiledModule`. Das deutet darauf hin, dass das WebAssembly-Modul empfangen und erfolgreich kompiliert wurde. Falls keines der Ereignisse beobachtet wird, prüfen Sie, ob Ihre WebAssembly-Streaming-API-Aufrufe korrekt funktionieren.

Nach einem ersten Durchlauf, wenn die Größenschwelle überschritten wurde, erwarten wir ebenfalls ein Ereignis `v8.wasm.cachedModule`, was bedeutet, dass der kompilierte Code in den Cache geschrieben wurde. Es ist möglich, dass dieses Ereignis auftritt, aber das Schreiben aus irgendeinem Grund nicht erfolgreich ist. Derzeit gibt es keine Möglichkeit, dies zu beobachten, aber Metadaten zu den Ereignissen können die Größe des Codes anzeigen. Sehr große Module passen möglicherweise nicht in den Cache.

Wenn das Caching korrekt funktioniert, produziert ein nachfolgender Durchlauf zwei Ereignisse: `v8.wasm.streamFromResponseCallback` und `v8.wasm.moduleCacheHit`. Die Metadaten zu diesen Ereignissen ermöglichen es Ihnen, die Größe des kompilierten Codes zu sehen.

Weitere Informationen zur Verwendung von `chrome://tracing` finden Sie in [unserem Artikel über JavaScript-(Byte)code-Caching für Entwickler](/blog/code-caching-for-devs).

## Fazit

Für die meisten Entwickler sollte Code-Caching einfach „funktionieren“. Es funktioniert am besten, wie jeder Cache, wenn alles stabil ist. Chromes Caching-Heuristik kann sich zwischen Versionen ändern, aber Code-Caching hat Verhaltensweisen, die genutzt werden können, und Einschränkungen, die vermieden werden sollten. Eine sorgfältige Analyse mit `chrome://tracing` kann Ihnen helfen, die Verwendung des WebAssembly-Code-Caches durch Ihre Web-App zu optimieren.
