---
title: 'V8-Version v9.3 veröffentlicht'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-08-09
tags:
 - release
description: 'Die V8-Version v9.3 bietet Unterstützung für Object.hasOwn und Fehlerursachen, verbessert die Kompilierungsperformance und deaktiviert Schutzmaßnahmen gegen untrusted Codegen auf Android.'
tweet: ''
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Release-Prozesses](https://v8.dev/docs/release-process). Jede Version wird unmittelbar vor einem Chrome-Beta-Meilenstein vom Haupt-Git-Branch von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch [V8-Version 9.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3) anzukündigen, der sich bis zu seiner Veröffentlichung in Koordination mit Chrome 93 Stable in einigen Wochen in der Beta-Phase befindet. V8 v9.3 ist vollgepackt mit allerlei Entwickler-Features. Dieser Beitrag bietet eine Vorschau auf einige der Highlights als Vorgeschmack auf die Veröffentlichung.

<!--truncate-->
## JavaScript

### Sparkplug-Batch-Kompilierung

Wir haben unseren super-schnellen neuen Mid-Tier-JIT-Compiler [Sparkplug](https://v8.dev/blog/sparkplug) in Version v9.1 veröffentlicht. Aus Sicherheitsgründen [schreibt V8 Code-Speicher](https://en.wikipedia.org/wiki/W%5EX), den es generiert, und erfordert, die Berechtigungen zwischen beschreibbar (während der Kompilierung) und ausführbar umzuschalten. Dies wird derzeit über `mprotect`-Aufrufe umgesetzt. Da Sparkplug Code jedoch so schnell generiert, wurde der Aufwand des Aufrufs von `mprotect` für jede individuell kompilierte Funktion zu einem erheblichen Engpass in der Kompilierungszeit. In V8 v9.3 führen wir die Batch-Kompilierung für Sparkplug ein: Statt jede Funktion einzeln zu kompilieren, kompilieren wir mehrere Funktionen auf einmal. Dies amortisiert die Kosten des Umschaltens der Seitenberechtigungen, indem dies pro Batch nur einmal durchgeführt wird.

Die Batch-Kompilierung reduziert die Gesamtkompilierungszeit (Ignition + Sparkplug) um bis zu 44 %, ohne die JavaScript-Ausführung zu beeinträchtigen. Wenn wir nur die Kosten der Kompilierung von Sparkplug-Code betrachten, ist die Auswirkung offensichtlich größer, z. B. eine Reduzierung um 82 % für den Benchmark `docs_scrolling` (siehe unten) auf Win 10. Erstaunlicherweise verbesserte die Batch-Kompilierung die Kompilierungsleistung sogar mehr als die Kosten für W^X, da das Zusammenfassen ähnlicher Operationen ohnehin besser für die CPU ist. Im Diagramm unten sehen Sie die Auswirkungen von W^X auf die Kompilierungszeit (Ignition + Sparkplug) und wie gut die Batch-Kompilierung diesen Aufwand gemildert hat.

![Benchmarks](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn` ist eine leichter erreichbare Alternative zu `Object.prototype.hasOwnProperty.call`.

Zum Beispiel:

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

Etwas mehr (aber nicht viel mehr!) Details finden Sie in unserer [Funktionsbeschreibung](https://v8.dev/features/object-has-own).

### Fehlerursachen

Ab Version v9.3 sind die verschiedenen eingebauten `Error`-Konstruktoren erweitert, um eine Options-Tasche mit einer `cause`-Eigenschaft als zweiten Parameter zu akzeptieren. Wenn eine solche Options-Tasche übergeben wird, wird der Wert der `cause`-Eigenschaft als eigene Eigenschaft der `Error`-Instanz installiert. Dies bietet eine standardisierte Möglichkeit, Fehler zu verketten.

Zum Beispiel:

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

Wie immer finden Sie eine ausführlichere [Funktionsbeschreibung](https://v8.dev/features/error-cause).

## Schutzmaßnahmen gegen untrusted Code auf Android deaktiviert

Vor drei Jahren haben wir eine Reihe von [Codegenerierungs-Schutzmaßnahmen](https://v8.dev/blog/spectre) eingeführt, um gegen Spectre-Angriffe zu verteidigen. Uns war immer klar, dass dies eine vorübergehende Notfallmaßnahme war, die nur einen Teilschutz gegen [Spectre](https://spectreattack.com/spectre.pdf)-Angriffe bot. Der einzige wirksame Schutz besteht darin, Websites über die [Site Isolation](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html) zu isolieren. Site Isolation wurde auf Chrome für Desktop-Geräte schon seit einiger Zeit aktiviert, jedoch war es aufgrund von Ressourcenbeschränkungen schwieriger, die vollständige Site Isolation auf Android zu aktivieren. Mit Chrome 92 wurde [Site Isolation auf Android](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html) jedoch auf viele weitere Seiten mit sensiblen Daten aktiviert.

Daher haben wir beschlossen, die Schutzmaßnahmen zur Codegenerierung von V8 gegen Spectre auf Android zu deaktivieren. Diese Maßnahmen sind weniger effektiv als Site Isolation und beeinträchtigen die Leistung. Ihre Deaktivierung bringt Android auf Augenhöhe mit Desktop-Plattformen, wo sie seit V8 v7.0 deaktiviert sind. Durch die Deaktivierung dieser Maßnahmen haben wir erhebliche Verbesserungen der Benchmark-Performance auf Android festgestellt.

![Performance improvements](/_img/v8-release-93/code-mitigations.svg)

## V8-API

Bitte verwenden Sie `git log branch-heads/9.2..branch-heads/9.3 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.
