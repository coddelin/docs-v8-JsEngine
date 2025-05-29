---
title: &apos;Optimierung von ES2015-Proxys in V8&apos;
author: &apos;Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), Optimierer von Proxys&apos;
avatars:
  - &apos;maya-armyanova&apos;
date: 2017-10-05 13:33:37
tags:
  - ECMAScript
  - Benchmarks
  - Interna
description: &apos;Dieser Artikel erklärt, wie V8 die Leistung von JavaScript-Proxys verbessert hat.&apos;
tweet: &apos;915846050447003648&apos;
---
Proxys sind seit ES2015 ein integraler Bestandteil von JavaScript. Sie ermöglichen das Abfangen grundlegender Operationen an Objekten und die Anpassung ihres Verhaltens. Proxys sind ein Kernbestandteil von Projekten wie [jsdom](https://github.com/tmpvar/jsdom) und der [Comlink RPC-Bibliothek](https://github.com/GoogleChrome/comlink). Kürzlich haben wir viel Aufwand in die Verbesserung der Leistung von Proxys in V8 investiert. Dieser Artikel beleuchtet allgemeine Muster zur Leistungsverbesserung in V8 und speziell für Proxys.

<!--truncate-->
Proxys sind „Objekte, die verwendet werden, um benutzerdefiniertes Verhalten für grundlegende Operationen (z. B. Eigenschaftsabfrage, Zuordnung, Aufzählung, Funktionsaufruf usw.) zu definieren“ (Definition von [MDN](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Proxy)). Weitere Informationen finden Sie in der [vollständigen Spezifikation](https://tc39.es/ecma262/#sec-proxy-objects). Zum Beispiel fügt der folgende Codeausschnitt jeder Eigenschaftsabfrage eines Objekts eine Protokollierung hinzu:

```js
const target = {};
const callTracer = new Proxy(target, {
  get: (target, name, receiver) => {
    console.log(`get wurde aufgerufen für: ${name}`);
    return target[name];
  }
});

callTracer.property = &apos;value&apos;;
console.log(callTracer.property);
// get wurde aufgerufen für: property
// value
```

## Konstruktion von Proxys

Das erste Feature, auf das wir uns konzentrieren, ist die **Konstruktion** von Proxys. Unsere ursprüngliche C++-Implementierung folgte hier der ECMAScript-Spezifikation Schritt für Schritt, was zu mindestens 4 Wechseln zwischen den C++- und JS-Runtimes führte, wie in der folgenden Abbildung gezeigt. Wir wollten diese Implementierung in den plattformunabhängigen [CodeStubAssembler](/docs/csa-builtins) (CSA) portieren, der in der JS-Laufzeit und nicht in der C++-Laufzeit ausgeführt wird. Dieses Portieren minimiert die Anzahl der Wechsel zwischen den Sprachruntimes. `CEntryStub` und `JSEntryStub` repräsentieren die Runtimes in der nachstehenden Abbildung. Die gestrichelten Linien stellen die Grenzen zwischen den JS- und C++-Runtimes dar. Glücklicherweise waren viele [Hilfsprädikate](https://github.com/v8/v8/blob/4e5db9a6c859df7af95a92e7cf4e530faa49a765/src/code-stub-assembler.h) bereits im Assembler implementiert, was die [erste Version](https://github.com/v8/v8/commit/f2af839b1938b55b4d32a2a1eb6704c49c8d877d#diff-ed49371933a938a7c9896878fd4e4919R97) prägnant und lesbar machte.

Die folgende Abbildung zeigt den Ablauf der Ausführung, wenn ein Proxy mit einer beliebigen Proxy-Falle (in diesem Beispiel `apply`, die aufgerufen wird, wenn der Proxy als Funktion verwendet wird) verwendet wird, erzeugt durch den folgenden Beispielcode:

```js
function foo(…) { … }
const g = new Proxy({ … }, {
  apply: foo,
});
g(1, 2);
```

![](/_img/optimizing-proxies/0.png)

Nach dem Portieren der Fallen-Ausführung zu CSA erfolgt die gesamte Ausführung in der JS-Laufzeit, wodurch die Anzahl der Wechsel zwischen den Sprachen von 4 auf 0 reduziert wird.

Diese Änderung führte zu den folgenden Leistungsverbesserungen::

![](/_img/optimizing-proxies/1.png)

Unser JS-Leistungsscore zeigt eine Verbesserung zwischen **49% und 74%**. Dieser Score misst grob, wie oft der gegebene Microbenchmark in 1000ms ausgeführt werden kann. Für einige Tests wird der Code mehrmals ausgeführt, um aufgrund der Timerauflösung eine hinreichend genaue Messung zu erhalten. Der Code für alle folgenden Benchmarks befindet sich in unserem [js-perf-test Verzeichnis](https://github.com/v8/v8/blob/5a5783e3bff9e5c1c773833fa502f14d9ddec7da/test/js-perf-test/Proxies/proxies.js).

## Call- und Construct-Fallen

Der nächste Abschnitt zeigt die Ergebnisse der Optimierung von Call- und Construct-Fallen (alias [`"apply"`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/apply)" und [`"construct"`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/construct)).

![](/_img/optimizing-proxies/2.png)

Die Leistungsverbesserungen beim _Aufrufen_ von Proxys sind signifikant — bis zu **500%** schneller! Dennoch ist die Verbesserung beim Erstellen von Proxys recht bescheiden, insbesondere in Fällen, in denen keine tatsächliche Falle definiert ist — nur etwa **25%** Gewinn. Wir haben dies untersucht, indem wir den folgenden Befehl mit der [`d8`-Shell](/docs/build) ausgeführt haben:

```bash
$ out/x64.release/d8 --runtime-call-stats test.js
> run: 120.104000

                      Runtime Function/C++ Builtin        Time             Count
========================================================================================
                                         NewObject     59.16ms  48.47%    100000  24.94%
                                      JS_Ausführung     23.83ms  19.53%         1   0.00%
                              Neuübersynch_kompilieren     11.68ms   9.57%        20   0.00%
                        AccessorNameGetterCallback     10.86ms   8.90%    100000  24.94%
      AccessorNameGetterCallback_Funktionsprototyp      5.79ms   4.74%    100000  24.94%
                                  Karte_SetPrototype      4.46ms   3.65%    100203  25.00%
… AUSZUG …
```

Die Quelle von `test.js` lautet:

```js
function MeineKlasse() {}
MeineKlasse.prototype = {};
const P = new Proxy(MeineKlasse, {});
function ausführen() {
  return new P();
}
const N = 1e5;
console.time(&apos;ausführen&apos;);
for (let i = 0; i < N; ++i) {
  ausführen();
}
console.timeEnd(&apos;ausführen&apos;);
```

Es stellte sich heraus, dass die meiste Zeit in `NeuesObjekt` sowie in den Funktionen, die dieses aufruft, verbracht wird, daher begannen wir zu planen, wie wir dies in zukünftigen Versionen beschleunigen können.

## Get-Falle

Der nächste Abschnitt beschreibt, wie wir die anderen häufigsten Operationen — das Abrufen und Setzen von Eigenschaften über Proxys — optimiert haben. Es stellte sich heraus, dass die [`get`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/get)-Falle komplizierter ist als die vorhergehenden Fälle, was auf das spezifische Verhalten von V8s Inline-Cache zurückzuführen ist. Für eine detaillierte Erklärung von Inline-Caches können Sie sich [diesem Vortrag](https://www.youtube.com/watch?v=u7zRSm8jzvA) ansehen.

Schließlich gelang uns ein funktionierender Port zu CSA mit den folgenden Ergebnissen:

![](/_img/optimizing-proxies/3.png)

Nach der Einführung der Änderung stellten wir fest, dass die Größe der Android-`.apk` für Chrome um **~160 KB** gewachsen war, was mehr ist als erwartet für eine Hilfsfunktion von etwa 20 Zeilen. Aber zum Glück verfolgen wir solche Statistiken. Es stellte sich heraus, dass diese Funktion zweimal von einer anderen Funktion aufgerufen wurde, die dreimal aufgerufen wird, von einer weiteren, die viermal aufgerufen wird. Die Ursache des Problems war das aggressive Inlining. Schließlich lösten wir das Problem, indem wir die Inline-Funktion in einen separaten Code-Stub verwandelten, wodurch wertvolle KB eingespart wurden — die Endversion hatte nur eine Zunahme von **~19 KB** in der `.apk`-Größe.

## Has-Falle

Der nächste Abschnitt zeigt die Ergebnisse der Optimierung der [`has`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/has)-Falle. Obwohl wir zunächst dachten, dass es einfacher wäre (und den meisten Code der `get`-Falle wiederverwenden würde), hatte sie ihre eigenen Besonderheiten. Ein besonders schwer nachvollziehbares Problem war das Durchlaufen der Prototypkette beim Aufruf des `in`-Operators. Die erzielten Verbesserungen variieren zwischen **71 % und 428 %**. Wiederum sind die Gewinne deutlicher in Fällen, in denen die Falle eingesetzt wird.

![](/_img/optimizing-proxies/4.png)

## Set-Falle

Der nächste Abschnitt behandelt die Portierung der [`set`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/set)-Falle. Dieses Mal mussten wir zwischen [benannten](/blog/fast-properties) und indizierten Eigenschaften ([Elementen](/blog/elements-kinds)) unterscheiden. Diese beiden Haupttypen sind kein Bestandteil der JS-Sprache, sind jedoch entscheidend für die effiziente Eigenschaftsspeicherung von V8. Die erste Implementierung wich beim Umgang mit Elementen immer noch zur Laufzeit aus, was dazu führt, dass Sprachgrenzen überschritten werden. Dennoch erreichten wir Verbesserungen zwischen **27 % und 438 %** in den Fällen, in denen die Falle gesetzt ist, auf Kosten eines bis zu **23 %** Rückgangs, wenn sie nicht gesetzt ist. Diese Leistungsverschlechterung ist auf den Overhead zusätzlicher Prüfungen zur Unterscheidung zwischen indizierten und benannten Eigenschaften zurückzuführen. Für indizierte Eigenschaften gibt es noch keine Verbesserung. Hier sind die vollständigen Ergebnisse:

![](/_img/optimizing-proxies/5.png)

## Verwendung in der realen Welt

### Ergebnisse aus [jsdom-proxy-benchmark](https://github.com/domenic/jsdom-proxy-benchmark)

Das jsdom-proxy-benchmark-Projekt kompiliert die [ECMAScript-Spezifikation](https://github.com/tc39/ecma262) mit dem [Ecmarkup](https://github.com/bterlson/ecmarkup)-Tool. Ab [v11.2.0](https://github.com/tmpvar/jsdom/blob/master/Changelog.md#1120) verwendet das jsdom-Projekt (das Ecmarkup zugrunde liegt) Proxies, um die gemeinsamen Datenstrukturen `NodeList` und `HTMLCollection` zu implementieren. Wir nutzten diesen Benchmark, um einen Überblick über eine realistischere Nutzung im Vergleich zu den synthetischen Mikro-Benchmarks zu erhalten, und erzielten die folgenden Ergebnisse, Durchschnitt von 100 Durchläufen:

- Node v8.4.0 (ohne Proxy-Optimierungen): **14277 ± 159 ms**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz) (mit nur der Hälfte der portierten Fallen): **11789 ± 308 ms**
- Geschwindigkeitsgewinn von rund 2.4 Sekunden, was etwa **~17 % besser** ist

![](/_img/optimizing-proxies/6.png)

- [Umwandlung von `NamedNodeMap` zur Nutzung von `Proxy`](https://github.com/domenic/jsdom-proxy-benchmark/issues/1#issuecomment-329047990) erhöhte die Verarbeitungszeit um
    - **1.9 s** auf V8 6.0 (Node v8.4.0)
    - **0.5 s** auf V8 6.3 (Node v9.0.0-v8-canary-20170910)

![](/_img/optimizing-proxies/7.png)

:::Hinweis
**Hinweis:** Diese Ergebnisse wurden von [Timothy Gu](https://github.com/TimothyGu) bereitgestellt. Danke!
:::

### Ergebnisse von [Chai.js](https://chaijs.com/)

Chai.js ist eine beliebte Assertion-Bibliothek, die intensiv Gebrauch von Proxies macht. Wir haben eine Art realitätsnahen Benchmark erstellt, indem wir die Tests mit verschiedenen Versionen von V8 durchgeführt haben – eine Verbesserung von ungefähr **1s aus mehr als 4s**, Durchschnitt von 100 Durchläufen:

- Node v8.4.0 (ohne Proxy-Optimierungen): **4,2863 ± 0,14 s**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz) (mit nur der Hälfte der portierten Traps): **3,1809 ± 0,17 s**

![](/_img/optimizing-proxies/8.png)

## Optimierungsansatz

Wir gehen Leistungsprobleme oft mit einem generischen Optimierungsschema an. Der Hauptansatz, dem wir bei dieser speziellen Arbeit gefolgt sind, umfasst die folgenden Schritte:

- Implementierung von Leistungstests für das spezifische Teilfeature
- Hinzufügen weiterer Tests für die Spezifikationskonformität (oder sie von Grund auf neu schreiben)
- Untersuchung der ursprünglichen C++-Implementierung
- Portierung des Teilfeatures auf den plattformunabhängigen CodeStubAssembler
- Weitere Optimierung des Codes durch manuell erstellte [TurboFan](/docs/turbofan)-Implementierung
- Messung der Leistungsverbesserung.

Dieser Ansatz kann auf jede allgemeine Optimierungsaufgabe angewendet werden, die Sie haben.
