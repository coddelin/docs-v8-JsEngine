---
title: &apos;V8 Version v9.1&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), teste meine private Marke&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-05-04
tags:
 - Veröffentlichung
description: &apos;V8 Version v9.1 bietet Unterstützung für private Brand-Checks, aktiviert standardmäßig Top-Level-await und Leistungsverbesserungen.&apos;
tweet: &apos;1389613320953532417&apos;
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Meilenstein der Chrome Beta aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unsere neueste Branch, [V8 Version 9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1), anzukündigen, die sich bis zur Veröffentlichung in Zusammenarbeit mit Chrome 91 Stable in einigen Wochen in der Beta-Phase befindet. V8 v9.1 ist vollgestopft mit nützlichen Neuerungen für Entwickler. Dieser Beitrag gibt einen Ausblick auf einige Highlights, bevor die Veröffentlichung erfolgt.

<!--truncate-->
## JavaScript

### Verbesserungen an `FastTemplateCache`

Die v8-API stellt Einbettungen eine `Template`-Schnittstelle zur Verfügung, aus der neue Instanzen erstellt werden können.

Das Erstellen und Konfigurieren neuer Objektinstanzen erfordert mehrere Schritte, weshalb es oft schneller ist, bestehende Objekte zu klonen. V8 verwendet eine zweistufige Cache-Strategie (einen kleinen schnellen Array-Cache und einen großen langsamen Wörterbuch-Cache), um kürzlich erstellte Objekte basierend auf den Vorlagen nachzuschlagen und direkt zu klonen.

Zuvor wurde der Cache-Index für Vorlagen zu dem Zeitpunkt zugewiesen, als die Vorlagen erstellt wurden, anstatt zu dem Zeitpunkt, als sie in den Cache eingefügt wurden. Dies führte dazu, dass der schnelle Array-Cache für Vorlagen reserviert war, die oft überhaupt nicht instanziiert wurden. Diese Änderung brachte eine 4,5-prozentige Verbesserung im Speedometer2-FlightJS-Benchmark.

### Top-Level `await`

[Top-Level `await`](https://v8.dev/features/top-level-await) ist ab V8-Version 9.1 standardmäßig aktiviert und erfordert nicht länger `--harmony-top-level-await`.

Beachten Sie, dass für die [Blink-Rendering-Engine](https://www.chromium.org/blink) Top-Level `await` bereits [standardmäßig aktiviert](https://v8.dev/blog/v8-release-89#top-level-await) war, seit Version 89.

Einbettungen sollten beachten, dass `v8::Module::Evaluate` nach dieser Aktivierung immer ein `v8::Promise`-Objekt anstelle des Fertigstellungswerts zurückgibt. Das `Promise` wird mit dem Fertigstellungswert aufgelöst, wenn die Modulauswertung erfolgreich ist, und mit dem Fehler abgelehnt, wenn die Auswertung fehlschlägt. Wenn das ausgewertete Modul nicht asynchron ist (das heißt, es enthält kein Top-Level `await`) und keine asynchronen Abhängigkeiten hat, wird das zurückgegebene `Promise` entweder erfüllt oder abgelehnt. Andernfalls bleibt das zurückgegebene `Promise` auf ausstehend.

Für weitere Details lesen Sie bitte unsere [Erklärung](https://v8.dev/features/top-level-await).

### Private Brand-Checks (alias `#foo in obj`)

Die Syntax für Private Brand-Checks ist ab v9.1 standardmäßig aktiviert, ohne dass `--harmony-private-brand-checks` erforderlich ist. Diese Funktion erweitert den [`in`-Operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in), sodass er auch mit den `#`-Namen von privaten Feldern funktioniert, wie im folgenden Beispiel gezeigt.

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

Für weitere Informationen werfen Sie einen Blick auf unsere [Erklärung](https://v8.dev/features/private-brand-checks).

### Kurze eingebaute Aufrufe

In dieser Version haben wir vorübergehend unbeeinflusste eingebaute Funktionen (das Rückgängigmachen von [eingebetteten Funktionen](https://v8.dev/blog/embedded-builtins)) auf 64-Bit-Desktop-Rechnern aktiviert. Der Leistungsgewinn durch das Nicht-Einbetten von Funktionen auf diesen Rechnern überwiegt die Speicheranforderungen. Dies liegt an architektonischen sowie mikroarchitektonischen Details.

Wir werden bald einen separaten Blogbeitrag mit weiteren Details veröffentlichen.

## V8-API

Verwenden Sie `git log branch-heads/9.0..branch-heads/9.1 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einer aktiven V8-Checkout-Version können `git checkout -b 9.1 -t branch-heads/9.1` verwenden, um mit den neuen Funktionen in V8 v9.1 zu experimentieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
