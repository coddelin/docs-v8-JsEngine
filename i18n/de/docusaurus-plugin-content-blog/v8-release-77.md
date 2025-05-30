---
title: "V8-Version v7.7"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), entspannter Verfasser von Release-Notes"
avatars: 
  - "mathias-bynens"
date: "2019-08-13 16:45:00"
tags: 
  - freigabe
description: "V8 v7.7 bietet eine verzögerte Feedback-Zuweisung, schnellere WebAssembly-Hintergrundkompilierung, Stacktrace-Verbesserungen und neue Intl.NumberFormat-Funktionalität."
tweet: "1161287541611323397"
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Release-Prozesses](/docs/release-process). Jede Version wird direkt aus dem Git-Master von V8 vor einem Chrome-Beta-Meilenstein abgezweigt. Heute freuen wir uns, unseren neuesten Zweig bekannt zu geben, [V8-Version 7.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7), der bis zur Veröffentlichung in Verbindung mit Chrome 77 Stable in einigen Wochen in der Beta-Version ist. V8 v7.7 ist voller Entwickler-freundlicher Neuerungen. Dieser Beitrag bietet eine Vorschau auf einige der Highlights, die vor der Veröffentlichung erwartet werden.

<!--truncate-->
## Leistung (Größe & Geschwindigkeit)

### Verzögerte Feedback-Zuweisung

Um JavaScript zu optimieren, sammelt V8 Feedback zu den Typen von Operanden, die an verschiedene Operationen übergeben werden (z. B. `+` oder `o.foo`). Dieses Feedback wird verwendet, um diese Operationen durch Anpassen an diese spezifischen Typen zu optimieren. Diese Informationen werden in „Feedback-Vektoren“ gespeichert, und während diese Informationen sehr wichtig sind, um schnellere Ausführungszeiten zu erreichen, zahlen wir auch eine Kosten für den Speicherbedarf, der zur Zuweisung dieser Feedback-Vektoren erforderlich ist.

Um den Speicherbedarf von V8 zu reduzieren, weisen wir die Feedback-Vektoren jetzt nur dann verzögert zu, nachdem die Funktion eine bestimmte Menge an Bytecode ausgeführt hat. Dies verhindert die Zuweisung für kurzlebige Funktionen, die nicht von den gesammelten Feedback-Daten profitieren. Unsere Laborexperimente zeigen, dass die verzögerte Zuweisung von Feedback-Vektoren etwa 2–8 % der V8-Heap-Größe spart.

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

Unsere Messungen aus der freien Wildbahn zeigen, dass dadurch die Heap-Größe von V8 für Chrome-Benutzer auf Desktop-Geräten um 1–2 % und auf mobilen Plattformen um 5–6 % reduziert wird. Es gibt keine Leistungseinbußen auf Desktops, und auf mobilen Plattformen haben wir tatsächlich eine Leistungsverbesserung bei Low-End-Telefonen mit begrenztem Speicher festgestellt. Bitte halten Sie Ausschau nach einem detaillierteren Blog-Beitrag zu unserer jüngsten Arbeit zur Einsparung von Speicher.

### Skalierbare WebAssembly-Hintergrundkompilierung

Über die letzten Meilensteine hinweg haben wir an der Skalierbarkeit der Hintergrundkompilierung von WebAssembly gearbeitet. Je mehr Kerne Ihr Computer hat, desto mehr profitieren Sie von dieser Arbeit. Die unten stehenden Diagramme wurden auf einer 24-Kern-Xeon-Maschine erstellt, die [die Epic ZenGarden-Demo](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html) kompiliert hat. Je nach Anzahl der verwendeten Threads dauert die Kompilierung weniger als die Hälfte der Zeit im Vergleich zu V8 v7.4.

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### Verbesserungen bei Stack-Traces

Fast alle von V8 ausgelösten Fehler erfassen beim Erstellen einen Stack-Trace. Dieser Stack-Trace kann von JavaScript über die nicht standardisierte `error.stack`-Eigenschaft abgerufen werden. Das erste Mal, wenn ein Stack-Trace über `error.stack` abgerufen wird, serialisiert V8 die zugrunde liegende strukturierte Rückverfolgung in eine Zeichenkette. Dieser serialisierte Stack-Trace wird gespeichert, um zukünftige Zugriffe auf `error.stack` zu beschleunigen.

Während der letzten Versionen haben wir an einigen [internen Umstrukturierungen der Stack-Trace-Logik](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit) ([Tracking-Bug](https://bugs.chromium.org/p/v8/issues/detail?id=8742)) gearbeitet, den Code vereinfacht und die Serialisierungsleistung der Stack-Traces um bis zu 30 % verbessert.

## JavaScript-Sprachfunktionen

[Die `Intl.NumberFormat`-API](/features/intl-numberformat) für das lokalisierte Formatieren von Zahlen erhält in dieser Version neue Funktionalitäten! Sie unterstützt jetzt kompakte Notation, wissenschaftliche Notation, technische Notation, Vorzeichenanzeige und Maßeinheiten.

```js
const formatter = new Intl.NumberFormat('de', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299.792.458 m/s'
```

Siehe [unsere Feature-Erklärung](/features/intl-numberformat) für weitere Details.

## V8-API

Bitte verwenden Sie `git log branch-heads/7.6..branch-heads/7.7 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einer [aktiven V8-Auscheckung](/docs/source-code#using-git) können `git checkout -b 7.7 -t branch-heads/7.7` verwenden, um mit den neuen Funktionen in V8 v7.7 zu experimentieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
