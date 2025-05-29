---
title: &apos;V8-Version v7.6&apos;
author: &apos;Adam Klein&apos;
avatars:
  - &apos;adam-klein&apos;
date: 2019-06-19 16:45:00
tags:
  - release
description: &apos;V8 v7.6 bietet Promise.allSettled, schnelleres JSON.parse, lokalisierte BigInts, schnellere gefrorene/versiegelte Arrays und vieles mehr!&apos;
tweet: &apos;1141356209179516930&apos;
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Release-Prozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome Beta-Meilenstein aus dem Master-Zweig von V8 abgeleitet. Heute freuen wir uns, unseren neuesten Zweig, [V8-Version 7.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6), bekannt zu geben, der bis zu seiner Veröffentlichung in Koordination mit Chrome 76 Stable in einigen Wochen in der Beta ist. V8 v7.6 ist vollgepackt mit allerhand Entwicklerschmankerln. Dieser Beitrag gibt einen Überblick über einige der Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## Leistung (Größe & Geschwindigkeit)

### `JSON.parse`-Verbesserungen

In modernen JavaScript-Anwendungen wird JSON häufig als Format zur Kommunikation strukturierter Daten verwendet. Durch das Beschleunigen der JSON-Analyse können wir die Latenz dieser Kommunikation reduzieren. In V8 v7.6 haben wir unseren JSON-Parser überarbeitet, um das Scannen und Parsen von JSON deutlich zu beschleunigen. Dies führt zu bis zu 2,7× schnellerer Analyse von Daten, die von beliebten Webseiten bereitgestellt werden.

![Diagramm zeigt die verbesserte Leistung von `JSON.parse` auf verschiedenen Websites](/_img/v8-release-76/json-parsing.svg)

Bis V8 v7.5 war der JSON-Parser ein rekursiver Parser, der nativen Stapelspeicher relativ zur Verschachtelungstiefe der eingehenden JSON-Daten verwendete. Dies bedeutete, dass wir bei sehr tief verschachtelten JSON-Daten aus dem Stapelspeicher laufen konnten. V8 v7.6 wechselt zu einem iterativen Parser, der seinen eigenen Stapel verwaltet, der nur durch den verfügbaren Speicher eingeschränkt ist.

Der neue JSON-Parser ist auch speichereffizienter. Durch das Puffern von Eigenschaften, bevor wir das endgültige Objekt erstellen, können wir jetzt entscheiden, wie das Ergebnis optimal zugewiesen wird. Für Objekte mit benannten Eigenschaften weisen wir Objekte mit genau der Menge an Speicherplatz zu, die für die benannten Eigenschaften in den eingehenden JSON-Daten benötigt wird (bis zu 128 benannte Eigenschaften). Falls JSON-Objekte indizierte Eigenschaftsnamen enthalten, weisen wir einen Elementspeicher zu, der die minimale Menge an Speicher verwendet; entweder ein flaches Array oder ein Wörterbuch. JSON-Arrays werden jetzt in ein Array analysiert, das genau die Anzahl der Elemente in den Eingangsdaten enthält.

### Verbesserungen bei gefrorenen/versiegelten Arrays

Die Leistung von Aufrufen von gefrorenen oder versiegelten Arrays (und array-ähnlichen Objekten) hat zahlreiche Verbesserungen erfahren. V8 v7.6 verbessert die folgenden JavaScript-Codierungsmuster, wobei `frozen` ein gefrorenes oder versiegeltes Array oder array-ähnliches Objekt ist:

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- Spread-Aufrufe wie `fn(...frozen)`
- Spread-Aufrufe mit einem verschachtelten Array-Spread wie `fn(...[...frozen])`
- Apply-Aufrufe mit Array-Spread wie `fn.apply(this, [...frozen])`

Das Diagramm unten zeigt die Verbesserungen.

![Diagramm zeigt Leistungsverbesserungen bei verschiedenen Array-Operationen](/_img/v8-release-76/frozen-sealed-elements.svg)

[Lesen Sie das Design-Dokument „Schnelle gefrorene & versiegelte Elemente in V8“](https://bit.ly/fast-frozen-sealed-elements-in-v8) für weitere Einzelheiten.

### Unicode-String-Verarbeitung

Eine Optimierung beim [Konvertieren von Zeichenfolgen zu Unicode](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea) führte zu einer erheblichen Beschleunigung von Aufrufen wie `String#localeCompare`, `String#normalize` und einigen der `Intl`-APIs. Beispielsweise führte diese Änderung zu einer etwa 2× höheren rohen Durchsatzrate von `String#localeCompare` für Ein-Byte-Zeichenfolgen.

## JavaScript-Sprachfeatures

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled) bietet ein Signal, wenn alle Eingabe-Promises _erledigt_ sind, was bedeutet, dass sie entweder _erfüllt_ oder _abgelehnt_ sind. Dies ist nützlich in Fällen, in denen Ihnen der Zustand des Promise egal ist und Sie nur wissen möchten, wann die Arbeit abgeschlossen ist, unabhängig davon, ob sie erfolgreich war. [Unsere Erklärung zu Promise-Kombinatoren](/features/promise-combinators) enthält weitere Details und ein Beispiel.

### Verbesserte `BigInt`-Unterstützung

[`BigInt`](/features/bigint) bietet jetzt bessere API-Unterstützung in der Sprache. Sie können jetzt ein `BigInt` in einer lokalisierten Weise formatieren, indem Sie die `toLocaleString`-Methode verwenden. Dies funktioniert genauso wie bei regulären Zahlen:

```js
12345678901234567890n.toLocaleString(&apos;en&apos;); // 🐌
// → &apos;12,345,678,901,234,567,890&apos;
12345678901234567890n.toLocaleString(&apos;de&apos;); // 🐌
// → &apos;12.345.678.901.234.567.890&apos;
```

Wenn Sie planen, mehrere Zahlen oder `BigInt`s mit demselben Gebietsschema zu formatieren, ist es effizienter, die `Intl.NumberFormat`-API zu verwenden, die `BigInt`s jetzt in ihren `format`- und `formatToParts`-Methoden unterstützt. So können Sie eine einzelne wiederverwendbare Formatierungsinstanz erstellen.

```js
const nf = new Intl.NumberFormat(&apos;fr&apos;);
nf.format(12345678901234567890n); // 🚀
// → &apos;12 345 678 901 234 567 890&apos;
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: &apos;integer&apos;, value: &apos;123&apos; },
// →   { type: &apos;group&apos;, value: &apos; &apos; },
// →   { type: &apos;integer&apos;, value: &apos;456&apos; }
// → ]
```

### Verbesserungen von `Intl.DateTimeFormat`

Apps zeigen häufig Zeitspannen oder Zeitbereiche an, um die Dauer eines Ereignisses darzustellen, wie z. B. eine Hotelreservierung, den Abrechnungszeitraum eines Dienstes oder ein Musikfestival. Die `Intl.DateTimeFormat`-API unterstützt jetzt die Methoden `formatRange` und `formatRangeToParts`, um Zeitbereiche bequem und lokalspezifisch zu formatieren.

```js
const start = new Date(&apos;2019-05-07T09:20:00&apos;);
// → &apos;7. Mai 2019&apos;
const end = new Date(&apos;2019-05-09T16:00:00&apos;);
// → &apos;9. Mai 2019&apos;
const fmt = new Intl.DateTimeFormat(&apos;de&apos;, {
  year: &apos;numeric&apos;,
  month: &apos;long&apos;,
  day: &apos;numeric&apos;,
});
const output = fmt.formatRange(start, end);
// → &apos;7.–9. Mai 2019&apos;
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { &apos;type&apos;: &apos;month&apos;,   &apos;value&apos;: &apos;Mai&apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; &apos;,    &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;7&apos;,    &apos;source&apos;: &apos;startRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; – &apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;9&apos;,    &apos;source&apos;: &apos;endRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos;, &apos;,   &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;year&apos;,    &apos;value&apos;: &apos;2019&apos;, &apos;source&apos;: &apos;shared&apos; },
// → ]
```

Zusätzlich unterstützen die Methoden `format`, `formatToParts` und `formatRangeToParts` jetzt die neuen Optionen `timeStyle` und `dateStyle`:

```js
const dtf = new Intl.DateTimeFormat(&apos;de&apos;, {
  timeStyle: &apos;medium&apos;,
  dateStyle: &apos;short&apos;
});
dtf.format(Date.now());
// → &apos;19.06.19, 13:33:37&apos;
```

## Nativer Stack-Walk

Während V8 seinen eigenen Aufruf-Stack durchlaufen kann (z. B. beim Debuggen oder Profilieren in den DevTools), konnte das Windows-Betriebssystem keinen Aufruf-Stack durchlaufen, der Code enthält, der von TurboFan auf der x64-Architektur generiert wurde. Dies konnte zu _defekten Stacks_ führen, wenn native Debugger oder ETW-Sampling verwendet werden, um Prozesse zu analysieren, die V8 verwenden. Eine kürzliche Änderung erlaubt es V8, [die notwendigen Metadaten zu registrieren](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0), damit Windows diese Stacks auf x64 durchlaufen kann, und in v7.6 ist dies standardmäßig aktiviert.

## V8-API

Bitte verwenden Sie `git log branch-heads/7.5..branch-heads/7.6 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einer [aktiven V8-Prüfung](/docs/source-code#using-git) können `git checkout -b 7.6 -t branch-heads/7.6` verwenden, um die neuen Funktionen in V8 v7.6 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html), um die neuen Funktionen bald selbst auszuprobieren.
