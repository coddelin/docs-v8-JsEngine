---
title: "WebAssembly Dynamic Tiering bereit zum Ausprobieren in Chrome 96"
author: "Andreas Haas — Tierisch Spaß"
avatars:
  - andreas-haas
date: 2021-10-29
tags:
  - WebAssembly
description: "WebAssembly Dynamic Tiering ist bereit zum Ausprobieren in V8 v9.6 und Chrome 96, entweder über ein Kommandozeilen-Flag oder über ein Origin-Trial"
tweet: "1454158971674271760"
---

V8 hat zwei Compiler, um WebAssembly-Code in Maschinen-Code zu übersetzen, der dann ausgeführt werden kann: den Baseline-Compiler __Liftoff__ und den optimierenden Compiler __TurboFan__. Liftoff kann Code viel schneller generieren als TurboFan, was schnelle Startzeiten ermöglicht. TurboFan hingegen kann schnelleren Code generieren, was hohe Spitzenleistung ermöglicht.

<!--truncate-->
In der aktuellen Konfiguration von Chrome wird ein WebAssembly-Modul zunächst vollständig von Liftoff kompiliert. Nachdem die Liftoff-Kompilierung abgeschlossen ist, wird das gesamte Modul sofort im Hintergrund erneut von TurboFan kompiliert. Mit der Streaming-Kompilierung kann die TurboFan-Kompilierung früher beginnen, wenn Liftoff WebAssembly-Code schneller kompiliert, als der WebAssembly-Code heruntergeladen wird. Die initiale Liftoff-Kompilierung ermöglicht schnelle Startzeiten, während die TurboFan-Kompilierung im Hintergrund hohe Spitzenleistung so schnell wie möglich bereitstellt. Weitere Details über Liftoff, TurboFan und den gesamten Kompilierungsprozess finden Sie in einem [separaten Dokument](https://v8.dev/docs/wasm-compilation-pipeline).

Das vollständige Kompilieren des WebAssembly-Moduls mit TurboFan bietet die bestmögliche Leistung, sobald die Kompilierung abgeschlossen ist, kommt jedoch zu einem Preis:

- Die CPU-Kerne, die die TurboFan-Kompilierung im Hintergrund ausführen, können andere Aufgaben blockieren, die die CPU benötigen, z. B. Worker der Webanwendung.
- Die TurboFan-Kompilierung von unwichtigen Funktionen kann die TurboFan-Kompilierung von wichtigeren Funktionen verzögern, was die Webanwendung daran hindern kann, volle Leistung zu erreichen.
- Einige WebAssembly-Funktionen werden möglicherweise nie ausgeführt, und Ressourcen für deren Kompilierung mit TurboFan aufzuwenden, wäre nicht sinnvoll.

## Dynamisches Tiering

Das dynamische Tiering sollte diese Probleme lindern, indem mit TurboFan nur jene Funktionen kompiliert werden, die tatsächlich mehrmals ausgeführt werden. Dadurch kann das dynamische Tiering die Leistung von Webanwendungen auf verschiedene Weise beeinflussen: Das dynamische Tiering kann die Startzeit beschleunigen, indem die Belastung der CPUs reduziert wird und damit Startaufgaben, die nichts mit der WebAssembly-Kompilierung zu tun haben, die CPU stärker nutzen können. Das dynamische Tiering kann auch die Leistung verlangsamen, indem es die TurboFan-Kompilierung für wichtige Funktionen verzögert. Da V8 keine On-Stack-Replacement für WebAssembly-Code verwendet, kann die Ausführung beispielsweise in einer Schleife im Liftoff-Code feststecken. Auch das Caching von Code wird beeinflusst, da Chrome nur TurboFan-Code cached, und alle Funktionen, die nie für die TurboFan-Kompilierung infrage kommen, auch bei vorhandenen Cache beim Start mit Liftoff kompiliert werden.

## Wie man es ausprobiert

Wir ermutigen interessierte Entwickler dazu, mit den Auswirkungen des dynamischen Tiering auf die Leistung ihrer Webanwendungen zu experimentieren. Dadurch können wir frühzeitig reagieren und mögliche Leistungsrückschritte vermeiden. Dynamisches Tiering kann lokal aktiviert werden, indem Chrome mit dem Kommandozeilen-Flag `--enable-blink-features=WebAssemblyDynamicTiering` gestartet wird.

V8-Embedder, die das dynamische Tiering aktivieren möchten, können dies tun, indem sie das V8-Flag `--wasm-dynamic-tiering` setzen.

### Testen im Feld mit einem Origin Trial

Das Ausführen von Chrome mit einem Kommandozeilen-Flag ist etwas, das ein Entwickler tun kann, aber von einem Endbenutzer sollte dies nicht erwartet werden. Um mit Ihrer Anwendung im Feld zu experimentieren, ist es möglich, an einem sogenannten [Origin Trial](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md) teilzunehmen. Origin Trials ermöglichen es Ihnen, experimentelle Funktionen mit Endbenutzern über einen speziellen Token auszuprobieren, der an eine Domain gebunden ist. Dieser spezielle Token aktiviert dynamisches Tiering für WebAssembly für den Endbenutzer auf spezifischen Seiten, die den Token enthalten. Um Ihren eigenen Token zu erhalten, um ein Origin Trial durchzuführen, [verwenden Sie das Antragsformular](https://developer.chrome.com/origintrials/#/view_trial/3716595592487501825).

## Geben Sie uns Feedback

Wir suchen Feedback von Entwicklern, die diese Funktion ausprobieren, da es uns hilft, die Heuristik zu verbessern, um zu entscheiden, wann die TurboFan-Kompilierung sinnvoll ist und wann sie vermieden werden kann, weil sie sich nicht lohnt. Der beste Weg, Feedback zu geben, ist, [Probleme zu melden](https://bugs.chromium.org/p/chromium/issues/detail?id=1260322).
