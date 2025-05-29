---
title: "V8-Version v8.9"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), wartet auf einen Anruf"
avatars:
 - "ingvar-stepanyan"
date: 2021-02-04
tags:
 - veröffentlichung
description: "V8-Version v8.9 bringt Leistungsverbesserungen für Aufrufe mit Argumentgrößenabweichungen."
tweet: "1357358418902802434"
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem V8-Git-Master verzweigt. Heute freuen wir uns, unseren neuesten Zweig [V8-Version 8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9) bekanntzugeben, der sich bis zu seiner Veröffentlichung in Zusammenarbeit mit Chrome 89 Stable in einigen Wochen in der Beta-Phase befindet. V8 v8.9 ist vollgepackt mit allerlei Entwicklerfreundlichen Neuerungen. Dieser Beitrag bietet einen Vorgeschmack auf einige der Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## JavaScript

### Top-Level `await`

[Top-Level `await`](https://v8.dev/features/top-level-await) ist verfügbar im [Blink-Rendering-Engine](https://www.chromium.org/blink) 89, einem primären Embedder von V8.

In der eigenständigen V8 bleibt Top-Level `await` hinter der `--harmony-top-level-await`-Flag verborgen.

Siehe [unsere Erklärung](https://v8.dev/features/top-level-await) für weitere Details.

## Leistung

### Schnellere Aufrufe mit Argumentgrößenabweichung

JavaScript erlaubt das Aufrufen einer Funktion mit einer unterschiedlichen Anzahl von Argumenten als der erwarteten Anzahl von Parametern, d.h., man kann entweder weniger oder mehr Argumente als die deklarierten formalen Parameter übergeben. Der erstgenannte Fall wird als Unteranwendung und der letztere als Überanwendung bezeichnet.

Im Fall der Unteranwendung werden die verbleibenden Parameter dem Wert `undefined` zugewiesen. Im Fall der Überanwendung können die verbleibenden Argumente entweder durch die Verwendung des Restparameters und der `Function.prototype.arguments`-Eigenschaft abgerufen werden, oder sie sind einfach überflüssig und werden ignoriert. Viele Web- und Node.js-Frameworks nutzen heutzutage diese JS-Funktion, um optionale Parameter zu akzeptieren und eine flexiblere API zu erstellen.

Bis vor kurzem hatte V8 eine spezielle Mechanik, um mit Argumentgrößenabweichungen umzugehen: Den Argumentadapterrahmen. Leider bringt die Argumentanpassung Leistungseinbußen mit sich und wird häufig in modernen Frontend- und Middleware-Frameworks benötigt. Es stellt sich heraus, dass wir mit einem cleveren Design (z.B. durch Umdrehen der Reihenfolge der Argumente im Stapel) diesen zusätzlichen Rahmen entfernen, die V8-Codebasis vereinfachen und den Overhead fast vollständig beseitigen können.

![Leistungseinfluss durch das Entfernen des Argumentadapterrahmens, gemessen durch einen Mikro-Benchmark.](/_img/v8-release-89/perf.svg)

Das Diagramm zeigt, dass es keinen Overhead mehr gibt, wenn der [JIT-lose Modus](https://v8.dev/blog/jitless) (Ignition) verwendet wird, mit einer Leistungsverbesserung von 11,2 %. Beim Einsatz von TurboFan erzielen wir bis zu 40 % Geschwindigkeitssteigerung. Der Overhead im Vergleich zum Fall ohne Abweichung ist auf eine kleine Optimierung im [Funktionsabschluss](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052) zurückzuführen. Weitere Einzelheiten finden Sie im [Design-Dokument](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit).

Wenn Sie mehr über die Details hinter diesen Verbesserungen erfahren möchten, werfen Sie einen Blick auf den [dedizierten Blog-Beitrag](https://v8.dev/blog/adaptor-frame).

## V8-API

Bitte verwenden Sie `git log branch-heads/8.8..branch-heads/8.9 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 8.9 -t branch-heads/8.9` verwenden, um die neuen Funktionen in V8 v8.9 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen selbst bald ausprobieren.
