---
title: "V8 ist schneller und sicherer als je zuvor!"
author: "[Victor Gomes](https://twitter.com/VictorBFG), der Glühwein-Experte"
avatars: 
  - victor-gomes
date: 2023-12-14
tags: 
  - JavaScript
  - WebAssembly
  - Sicherheit
  - Benchmarks
description: "V8's beeindruckende Errungenschaften im Jahr 2023"
tweet: ""
---

Willkommen in der spannenden Welt von V8, wo Geschwindigkeit nicht nur ein Feature, sondern eine Lebensweise ist. Während wir uns von 2023 verabschieden, ist es Zeit, die beeindruckenden Errungenschaften zu feiern, die V8 in diesem Jahr erreicht hat.

Durch innovative Leistungsoptimierungen erweitert V8 weiterhin die Grenzen des Möglichen in der sich ständig weiterentwickelnden Weblandschaft. Wir haben einen neuen Mitteltier-Compiler eingeführt und mehrere Verbesserungen an der Top-Tier-Compiler-Infrastruktur, der Laufzeitumgebung und dem Garbage Collector implementiert, was zu signifikanten Geschwindigkeitsgewinnen auf allen Ebenen geführt hat.

<!--truncate-->
Neben Leistungsverbesserungen haben wir spannende neue Features für JavaScript und WebAssembly eingeführt. Wir haben auch einen neuen Ansatz ausgeliefert, um Garbage-Collection-Programmiersprachen effizient ins Web zu bringen, mit [WebAssembly Garbage Collection (WasmGC)](https://v8.dev/blog/wasm-gc-porting).

Aber unser Engagement für Exzellenz endet nicht dort – wir haben auch der Sicherheit Priorität eingeräumt. Wir haben unsere Sandbox-Infrastruktur verbessert und [Control-flow Integrity (CFI)](https://en.wikipedia.org/wiki/Control-flow_integrity) in V8 eingeführt, um eine sicherere Umgebung für Nutzer zu schaffen.

Im Folgenden haben wir einige Highlights des Jahres zusammengefasst.

# Maglev: Neuer Mitteltier-optimierender Compiler

Wir haben einen neuen optimierenden Compiler namens [Maglev](https://v8.dev/blog/maglev) eingeführt, der strategisch zwischen unseren bestehenden Compilern [Sparkplug](https://v8.dev/blog/sparkplug) und [TurboFan](https://v8.dev/docs/turbofan) positioniert ist. Maglev fungiert als schneller optimierender Compiler, der optimierten Code effizient und in beeindruckender Geschwindigkeit generiert. Es generiert Code etwa 20-mal langsamer als unser Basis-Non-Optimierungs-Compiler Sparkplug, jedoch 10- bis 100-mal schneller als der Top-Tier-Compiler TurboFan. Wir haben signifikante Leistungsverbesserungen mit Maglev beobachtet, mit [JetStream](https://browserbench.org/JetStream2.1/) Steigerungen von 8,2 % und [Speedometer](https://browserbench.org/Speedometer2.1/) um 6 %. Die schnellere Kompilierungsgeschwindigkeit von Maglev und die reduzierte Abhängigkeit von TurboFan führten zu einer Energieeinsparung von 10 % im Gesamtverbrauch von V8 während Speedometer-Durchläufen. [Obwohl noch nicht vollständig abgeschlossen](https://en.m.wikipedia.org/wiki/Full-employment_theorem), rechtfertigt Maglevs aktueller Stand seine Einführung in Chrome 117. Weitere Details finden Sie in unserem [Blogbeitrag](https://v8.dev/blog/maglev).

# Turboshaft: Neue Architektur für den Top-Tier-optimierenden Compiler

Maglev war nicht unsere einzige Investition in verbesserte Compiler-Technologie. Wir haben auch Turboshaft eingeführt, eine neue interne Architektur für unseren Top-Tier-optimierenden Compiler TurboFan, die ihn einfacher erweiterbar mit neuen Optimierungen und schneller in der Kompilierung macht. Seit Chrome 120 verwenden alle CPU-unabhängigen Backend-Phasen Turboshaft anstelle von TurboFan und kompilieren etwa doppelt so schnell wie zuvor. Dies spart Energie und ebnet den Weg für noch aufregendere Leistungsgewinne im nächsten Jahr und darüber hinaus. Bleiben Sie dran für Updates!

# Schnellerer HTML-Parser

Wir haben festgestellt, dass ein signifikanter Teil unserer Benchmark-Zeit durch das Parsen von HTML verbraucht wird. Obwohl dies keine direkte Verbesserung von V8 darstellt, haben wir die Initiative ergriffen und unsere Expertise in der Leistungsoptimierung genutzt, um einen schnelleren HTML-Parser zu Blink hinzuzufügen. Diese Änderungen führten zu einer bemerkenswerten 3,4%-igen Steigerung der Speedometer-Werte. Die Auswirkungen auf Chrome waren so positiv, dass das WebKit-Projekt diese Änderungen umgehend in [ihrem Repository](https://github.com/WebKit/WebKit/pull/9926) integrierte. Wir sind stolz darauf, zum gemeinsamen Ziel eines schnelleren Webs beizutragen!

# Schnellere DOM-Allokationen

Wir haben auch aktiv in die DOM-Seite investiert. Signifikante Optimierungen wurden an den Speicherallokierungsstrategien in [Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md) vorgenommen - dem Allocator für DOM-Objekte. Es wurde ein Seitenpool hinzugefügt, der die Kosten für die Round-Trips zum Kernel deutlich reduziert hat. Oilpan unterstützt jetzt sowohl komprimierte als auch unkomprimierte Zeiger, und wir vermeiden die Komprimierung von Hochfrequenz-Feldern in Blink. Angesichts der Häufigkeit der Dekomprimierung hatte dies einen weitreichenden Einfluss auf die Leistung. Darüber hinaus, angesichts der Geschwindigkeit des Allocators, wurden häufig allozierte Klassen oilpanisiert, was Allokations-Arbeitslasten dreimal schneller machte und deutliche Verbesserungen bei DOM-lastigen Benchmarks wie Speedometer zeigte.

# Neue JavaScript-Funktionen

JavaScript entwickelt sich weiterhin mit neu standardisierten Funktionen, und dieses Jahr war keine Ausnahme. Wir haben [resizable ArrayBuffers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers) und [ArrayBuffer transfer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer), String [`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) und [`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed), [RegExp `v` flag](https://v8.dev/features/regexp-v-flag) (alias Unicode-Set-Notation), [`JSON.parse` with source](https://github.com/tc39/proposal-json-parse-with-source), [Array grouping](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy), [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) und [`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync) ausgeliefert. Leider mussten wir [iterator helpers](https://github.com/tc39/proposal-iterator-helpers) zurücknehmen, nachdem wir eine Web-Inkompatibilität entdeckt hatten, aber wir haben mit TC39 zusammengearbeitet, um das Problem zu beheben und werden sie bald erneut ausliefern. Schließlich haben wir ES6+ JS-Code schneller gemacht, indem wir einige redundante Überprüfungen der temporalen Todesszone für `let`- und `const`-Bindings [eliminiert haben](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing).

# WebAssembly-Updates

Viele neue Funktionen und Leistungsverbesserungen wurden dieses Jahr für Wasm eingeführt. Wir haben Unterstützung für [multi-memory](https://github.com/WebAssembly/multi-memory), [tail-calls](https://github.com/WebAssembly/tail-call) (siehe unseren [Blogpost](https://v8.dev/blog/wasm-tail-call) für mehr Details) und [relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) aktiviert, um eine Leistung auf neuer Ebene freizusetzen. Wir haben die Implementierung von [memory64](https://github.com/WebAssembly/memory64) für speicherintensive Anwendungen abgeschlossen und warten nur noch darauf, dass der Vorschlag die [Phase 4 erreicht](https://github.com/WebAssembly/memory64/issues/43), damit wir ihn ausliefern können! Wir haben die neuesten Updates des [Exception Handling Proposal](https://github.com/WebAssembly/exception-handling) einbezogen und gleichzeitig das vorherige Format unterstützt. Außerdem haben wir weiterhin in [JSPI](https://v8.dev/blog/jspi) investiert, um [eine weitere große Klasse von Anwendungen im Web zu ermöglichen](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m). Bleiben Sie dran für das nächste Jahr!

# WebAssembly-Garbage Collection

Im Zusammenhang mit der Einführung neuer Anwendungsklassen ins Web haben wir auch endlich WebAssembly Garbage Collection (WasmGC) ausgeliefert, nachdem wir mehrere Jahre an der [Standardisierung des Vorschlags](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md) und [Implementierung](https://bugs.chromium.org/p/v8/issues/detail?id=7748) gearbeitet haben. Wasm besitzt jetzt eine eingebaute Methode, um Objekte und Arrays zuzuweisen, die von V8's bestehender Garbage Collection verwaltet werden. Das ermöglicht die Kompilierung von Anwendungen, die in Java, Kotlin, Dart und ähnlichen sprachen mit Garbage Collection geschrieben sind, zu Wasm – wo sie typischerweise etwa doppelt so schnell laufen wie wenn sie in JavaScript kompiliert werden. Weitere Details finden Sie in [unserem Blogpost](https://v8.dev/blog/wasm-gc-porting).

# Sicherheit

Im Bereich der Sicherheit waren unsere drei Hauptthemen des Jahres Sandboxen, Fuzzing und CFI. Im Bereich [Sandboxen](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) konzentrierten wir uns darauf, die fehlende Infrastruktur wie die Code- und Trusted Pointer-Tabellen aufzubauen. Im Bereich Fuzzing investierten wir in alles, von Fuzzing-Infrastruktur bis hin zu speziellen Fuzzern und besserer Sprachabdeckung. Einige unserer Arbeiten wurden in [dieser Präsentation](https://www.youtube.com/watch?v=Yd9m7e9-pG0) behandelt. Schließlich legten wir im Bereich CFI die Grundlage für unsere [CFI-Architektur](https://v8.dev/blog/control-flow-integrity), damit sie auf so vielen Plattformen wie möglich umgesetzt werden kann. Neben diesen Bemühungen umfassen einige kleinere, aber bemerkenswerte Arbeiten die Abwehr einer [beliebten Exploit-Technik](https://crbug.com/1445008) rund um `the_hole` sowie die Einführung eines neuen Exploit-Belohnungsprogramms in Form des [V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md). 

# Fazit

Im Laufe des Jahres haben wir uns zahlreichen inkrementellen Leistungsverbesserungen gewidmet. Der kombinierte Einfluss dieser kleinen Projekte, zusammen mit den im Blogpost beschriebenen, ist beträchtlich! Nachfolgend sind Benchmark-Ergebnisse aufgeführt, die die Leistungsverbesserungen von V8 im Jahr 2023 zeigen, mit einem Gesamtwachstum von `14%` für JetStream und beeindruckenden `34%` für Speedometer.

![Web-Leistungsbenchmarks, gemessen auf einem 13-Zoll M1 MacBook Pro.](/_img/holiday-season-2023/scores.svg)

Diese Ergebnisse zeigen, dass V8 schneller und sicherer ist als je zuvor. Schnallen Sie sich an, liebe Entwickler, denn mit V8 hat die Reise ins schnelle und furiose Web gerade erst begonnen! Wir sind entschlossen, V8 zum besten JavaScript- und WebAssembly-Engine des Planeten zu machen!

Von allen bei V8 wünschen wir Ihnen eine frohe Feiertagssaison voller schneller, sicherer und fantastischer Erlebnisse beim Surfen im Web!
