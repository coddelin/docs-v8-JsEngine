---
title: &apos;V8-Version v6.5&apos;
author: &apos;das V8-Team&apos;
date: 2018-02-01 13:33:37
tags:
  - Veröffentlichung
description: &apos;V8 v6.5 unterstützt die Streaming-WebAssembly-Kompilierung und umfasst einen neuen “Modus für unzuverlässigen Code”.&apos;
tweet: &apos;959174292406640640&apos;
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen Branch von V8. Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem Git-Master von V8 herausgelöst. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5), anzukündigen, der sich bis zur Veröffentlichung im Einklang mit Chrome 65 Stable in mehreren Wochen in der Beta-Phase befindet. V8 v6.5 ist vollgepackt mit allerlei Entwickler-Extras. Dieser Beitrag bietet eine Vorschau auf einige der Highlights als Vorgeschmack auf die Veröffentlichung.

<!--truncate-->
## Modus für unzuverlässigen Code

Als Reaktion auf die neueste spekulative Nebenkanalangriffsmethode namens Spectre hat V8 einen [Modus für unzuverlässigen Code](/docs/untrusted-code-mitigations) eingeführt. Wenn Sie V8 einbetten, sollten Sie erwägen, diesen Modus zu nutzen, falls Ihre Anwendung benutzererstellten, nicht vertrauenswürdigen Code verarbeitet. Bitte beachten Sie, dass dieser Modus standardmäßig aktiviert ist, auch in Chrome.

## Streaming-Kompilierung für WebAssembly-Code

Die WebAssembly-API stellt eine spezielle Funktion zur Unterstützung der [Streaming-Kompilierung](https://developers.google.com/web/updates/2018/04/loading-wasm) in Kombination mit der `fetch()`-API bereit:

```js
const module = await WebAssembly.compileStreaming(fetch(&apos;foo.wasm&apos;));
```

Diese API ist seit V8 v6.1 und Chrome 61 verfügbar, obwohl die anfängliche Implementierung tatsächlich keine Streaming-Kompilierung genutzt hat. Mit V8 v6.5 und Chrome 65 nutzen wir jedoch diese API und kompilieren WebAssembly-Module bereits, während die Modulbytes noch heruntergeladen werden. Sobald wir alle Bytes einer einzelnen Funktion heruntergeladen haben, übergeben wir die Funktion an einen Hintergrund-Thread zur Kompilierung.

Unsere Messungen zeigen, dass mit dieser API die WebAssembly-Kompilierung in Chrome 65 auf High-End-Maschinen mit einer Download-Geschwindigkeit von bis zu 50 Mbit/s Schritt halten kann. Das bedeutet, dass wenn Sie WebAssembly-Code mit 50 Mbit/s herunterladen, die Kompilierung dieses Codes abgeschlossen ist, sobald der Download abgeschlossen ist.

Für das folgende Diagramm messen wir die Zeit, die benötigt wird, um ein WebAssembly-Modul mit 67 MB und etwa 190.000 Funktionen herunterzuladen und zu kompilieren. Wir führen die Messungen mit 25 Mbit/s, 50 Mbit/s und 100 Mbit/s Download-Geschwindigkeit durch.

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

Wenn die Downloadzeit länger ist als die Kompilierungszeit des WebAssembly-Moduls, z. B. im obigen Diagramm mit 25 Mbit/s und 50 Mbit/s, dann schließt `WebAssembly.compileStreaming()` die Kompilierung fast unmittelbar ab, nachdem die letzten Bytes heruntergeladen wurden.

Wenn die Downloadzeit kürzer ist als die Kompilierungszeit, dauert `WebAssembly.compileStreaming()` etwa so lange, wie es dauern würde, das WebAssembly-Modul ohne vorheriges Herunterladen des Moduls zu kompilieren.

## Geschwindigkeit

Wir haben weiter daran gearbeitet, den Schnellweg für JavaScript-Builtins im Allgemeinen zu erweitern und einen Mechanismus hinzugefügt, um eine ruinöse Situation namens „Deoptimierungsschleife“ zu erkennen und zu verhindern. Diese tritt auf, wenn Ihr optimierter Code deoptimiert wird und _es keine Möglichkeit gibt, herauszufinden, was schiefgelaufen ist_. In solchen Szenarien versucht TurboFan weiterhin zu optimieren und gibt schließlich nach etwa 30 Versuchen auf. Dies würde passieren, wenn Sie etwas tun, um die Form des Arrays in der Callback-Funktion eines unserer Builtins zweiter Ordnung zu ändern. Zum Beispiel das Ändern der `length` des Arrays — in V8 v6.5 bemerken wir, wenn dies geschieht, und unterbrechen das Inline-Caching des an diesem Standort aufgerufenen Builtins bei zukünftigen Optimierungsversuchen.

Wir haben den Schnellweg auch erweitert, indem wir viele Builtins inline gesetzt haben, die vorher ausgeschlossen waren, weil es eine Nebenwirkung zwischen dem Laden der aufzurufenden Funktion und dem eigentlichen Aufruf gab, zum Beispiel bei einem Funktionsaufruf. Und `String.prototype.indexOf` hat eine [10× Leistungsverbesserung bei Funktionsaufrufen](https://bugs.chromium.org/p/v8/issues/detail?id=6270) erhalten.

In V8 v6.4 hatten wir die Unterstützung für `Array.prototype.forEach`, `Array.prototype.map` und `Array.prototype.filter` inline umgesetzt. In V8 v6.5 haben wir die Inline-Unterstützung hinzugefügt für:

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

Darüber hinaus haben wir den Schnellweg für all diese Builtins erweitert. Zunächst hätten wir abgebrochen, wenn wir Arrays mit Gleitkommazahlen gesehen hätten oder (noch häufiger abgebrochen), [wenn Arrays „Löcher“ enthalten hätten](/blog/elements-kinds), z. B. `[3, 4.5, , 6]`. Jetzt behandeln wir löchrige Gleitkomma-Arrays überall, außer in `find` und `findIndex`, wo die Spezifikationsanforderung, Löcher in `undefined` zu konvertieren, unsere Bemühungen (_vorerst …!_) durchkreuzt.

Das folgende Bild zeigt das Verbesserungsdelta im Vergleich zu V8 v6.4 in unseren inlining-Builtins, aufgeschlüsselt in Ganzzahl-Arrays, Gleitkomma-Arrays und Gleitkomma-Arrays mit Lücken. Die Zeit ist in Millisekunden angegeben.

![Leistungsverbesserungen seit V8 v6.4](/_img/v8-release-65/performance-improvements.svg)

## V8 API

Bitte verwenden Sie `git log branch-heads/6.4..branch-heads/6.5 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.5 -t branch-heads/6.5` verwenden, um die neuen Funktionen in V8 v6.5 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
