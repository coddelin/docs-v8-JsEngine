---
title: "V8-Version v8.7-Veröffentlichung"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), ein V8-Fahnenträger"
avatars: 
 - "ingvar-stepanyan"
date: 2020-10-23
tags: 
 - Veröffentlichung
description: "Die V8-Version v8.7 bringt neue APIs für native Aufrufe, Atomics.waitAsync, Fehlerbehebungen und Leistungsverbesserungen."
tweet: "1319654229863182338"
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird unmittelbar vor einem Chrome-Beta-Meilenstein vom V8-Git-Master abgezweigt. Heute freuen wir uns, unseren neuesten Zweig [V8-Version 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7) anzukündigen, der sich bis zur Veröffentlichung in Zusammenarbeit mit Chrome 87 Stable in mehreren Wochen in der Beta-Phase befindet. V8 v8.7 ist vollgepackt mit allerlei Entwickler-Features. Dieser Beitrag bietet eine Vorschau auf einige Highlights im Hinblick auf die Veröffentlichung.

<!--truncate-->
## JavaScript

### Unsichere schnelle JS-Aufrufe

V8 v8.7 bietet eine erweiterte API für native Aufrufe aus JavaScript.

Das Feature ist noch experimentell und kann über die `--turbo-fast-api-calls`-Flagge in V8 oder die entsprechende `--enable-unsafe-fast-js-calls`-Flagge in Chrome aktiviert werden. Es wurde entwickelt, um die Leistung einiger nativer Grafik-APIs in Chrome zu verbessern, kann aber auch von anderen Einbettungsanwendungen genutzt werden. Es bietet Entwicklern neue Möglichkeiten, Instanzen von `v8::FunctionTemplate` zu erstellen, wie in dieser [Header-Datei](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h) dokumentiert. Funktionen, die mit der ursprünglichen API erstellt wurden, bleiben unverändert.

Für weitere Informationen und eine Liste der verfügbaren Funktionen lesen Sie bitte [diese Erläuterung](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing).

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) ist jetzt in V8 v8.7 verfügbar.

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) und [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) sind Synchronisationsprimitive auf niedrigerer Ebene, die nützlich sind, um Mutex und andere Synchronisationsmechanismen zu implementieren. Da `Atomics.wait` jedoch blockierend ist, ist es nicht möglich, es im Hauptthread aufzurufen (ein Versuch führt zu einer TypeError-Ausnahme). Die nicht blockierende Version, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), ist auch im Hauptthread nutzbar.

Sehen Sie sich [unsere Erläuterung zu den `Atomics`-APIs](https://v8.dev/features/atomics) für weitere Details an.

## V8-API

Bitte verwenden Sie `git log branch-heads/8.6..branch-heads/8.7 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 8.7 -t branch-heads/8.7` verwenden, um die neuen Funktionen in V8 v8.7 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und bald die neuen Funktionen selbst ausprobieren.
