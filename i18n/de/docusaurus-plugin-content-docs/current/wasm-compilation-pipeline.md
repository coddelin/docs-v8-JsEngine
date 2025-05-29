---
title: "WebAssembly-Kompilierungspipeline"
description: "Dieser Artikel erklärt die WebAssembly-Compiler von V8 und wann sie WebAssembly-Code kompilieren."
---

WebAssembly ist ein Binärformat, das es ermöglicht, Code aus anderen Programmiersprachen als JavaScript effizient und sicher im Web auszuführen. In diesem Dokument tauchen wir in die WebAssembly-Kompilierungspipeline in V8 ein und erklären, wie wir die verschiedenen Compiler verwenden, um eine gute Leistung zu erzielen.

## Liftoff

Zu Beginn kompiliert V8 keine Funktionen in einem WebAssembly-Modul. Stattdessen werden Funktionen vom Basiscompiler [Liftoff](/blog/liftoff) lazy kompiliert, wenn die Funktion zum ersten Mal aufgerufen wird. Liftoff ist ein [One-Pass-Compiler](https://de.wikipedia.org/wiki/Ein-Pass-Compiler), das heißt, er durchläuft den WebAssembly-Code einmal und erzeugt sofort Maschinencode für jede WebAssembly-Anweisung. One-Pass-Compiler sind hervorragend in der schnellen Code-Generierung, können jedoch nur eine kleine Menge an Optimierungen anwenden. Tatsächlich kann Liftoff WebAssembly-Code sehr schnell kompilieren, mehrere Megabyte pro Sekunde.

Sobald die Liftoff-Kompilierung abgeschlossen ist, wird der resultierende Maschinencode mit dem WebAssembly-Modul registriert, sodass für zukünftige Funktionsaufrufe der kompilierte Code sofort verwendet werden kann.

## TurboFan

Liftoff erzeugt ziemlich schnellen Maschinencode in sehr kurzer Zeit. Da er jedoch Code für jede WebAssembly-Anweisung unabhängig voneinander generiert, gibt es nur sehr begrenzte Möglichkeiten für Optimierungen, wie etwa die Verbesserung der Registerzuweisungen oder übliche Compiler-Optimierungen wie redundante Lade-Eliminierung, Stärke-Reduktion oder Funktions-Inlining.

Aus diesem Grund werden _heiße_ Funktionen, also Funktionen, die häufig ausgeführt werden, mit [TurboFan](/docs/turbofan), dem Optimierungscompiler in V8 für WebAssembly und JavaScript, neu kompiliert. TurboFan ist ein [Multi-Pass-Compiler](https://de.wikipedia.org/wiki/Mehr-Pass-Compiler), das heißt, er erstellt mehrere interne Darstellungen des kompilierten Codes, bevor er Maschinencode erzeugt. Diese zusätzlichen internen Darstellungen ermöglichen Optimierungen und bessere Registerzuweisungen, was zu erheblich schnellerem Code führt.

V8 überwacht, wie oft WebAssembly-Funktionen aufgerufen werden. Sobald eine Funktion eine bestimmte Schwelle erreicht, wird sie als _heiß_ betrachtet und die Neukompilierung wird in einem Hintergrund-Thread ausgelöst. Sobald die Kompilierung abgeschlossen ist, wird der neue Code mit dem WebAssembly-Modul registriert und ersetzt den vorhandenen Liftoff-Code. Alle neuen Aufrufe dieser Funktion verwenden dann den neuen, von TurboFan produzierten optimierten Code und nicht mehr den Liftoff-Code. Es ist jedoch zu beachten, dass wir keine On-Stack-Replacement durchführen. Das bedeutet, wenn TurboFan-Code verfügbar wird, nachdem die Funktion aufgerufen wurde, wird der Funktionsaufruf seine Ausführung mit Liftoff-Code abschließen.

## Code-Caching

Wenn das WebAssembly-Modul mit `WebAssembly.compileStreaming` kompiliert wurde, wird der von TurboFan erzeugte Maschinencode ebenfalls zwischengespeichert. Wenn dasselbe WebAssembly-Modul erneut von derselben URL abgerufen wird, kann der zwischengespeicherte Code sofort ohne zusätzliche Kompilierung verwendet werden. Weitere Informationen zum Code-Caching sind [in einem separaten Blog-Post](/blog/wasm-code-caching) verfügbar.

Das Code-Caching wird immer dann ausgelöst, wenn die Menge des erzeugten TurboFan-Codes eine bestimmte Schwelle erreicht. Das bedeutet, dass für große WebAssembly-Module der TurboFan-Code inkrementell zwischengespeichert wird, während er für kleine WebAssembly-Module möglicherweise nie zwischengespeichert wird. Liftoff-Code wird nicht zwischengespeichert, da die Liftoff-Kompilierung fast genauso schnell ist wie das Laden von Code aus dem Cache.

## Debugging

Wie bereits erwähnt, wendet TurboFan Optimierungen an, von denen viele das Umordnen von Code, das Eliminieren von Variablen oder sogar das Überspringen ganzer Codeabschnitte umfassen. Das bedeutet, dass es unklar sein könnte, wo die Programmausführung tatsächlich stoppen sollte, wenn Sie einen Haltepunkt bei einer bestimmten Anweisung setzen wollen. Mit anderen Worten: TurboFan-Code ist nicht gut zum Debugging geeignet. Daher wird beim Start des Debuggings durch Öffnen der DevTools aller TurboFan-Code wieder durch Liftoff-Code ersetzt ("heruntergestuft"), da jede WebAssembly-Anweisung genau einem Abschnitt des Maschinencodes entspricht und alle lokalen und globalen Variablen intakt sind.

## Profiling

Um die Sache etwas verwirrender zu machen, wird innerhalb der DevTools aller Code wieder aufgestuft (mit TurboFan neu kompiliert), wenn die Registerkarte "Leistung" geöffnet und die Schaltfläche "Aufzeichnen" geklickt wird. Die Schaltfläche "Aufzeichnen" startet das Leistungsprofiling. Das Profiling des Liftoff-Codes wäre nicht repräsentativ, da er nur verwendet wird, während TurboFan noch nicht abgeschlossen ist, und erheblich langsamer als die Ausgabe von TurboFan sein kann, die die meiste Zeit läuft.

## Flags für Experimente

Für Experimente können V8 und Chrome so konfiguriert werden, dass WebAssembly-Code ausschließlich mit Liftoff oder ausschließlich mit TurboFan kompiliert wird. Es ist sogar möglich, mit Lazy-Kompilierung zu experimentieren, bei der Funktionen erst kompiliert werden, wenn sie zum ersten Mal aufgerufen werden. Die folgenden Flags aktivieren diese experimentellen Modi:

- Nur Liftoff:
    - In V8 die Flags `--liftoff --no-wasm-tier-up` setzen.
    - In Chrome WebAssembly-Tiering deaktivieren (`chrome://flags/#enable-webassembly-tiering`) und den WebAssembly-Baseline-Compiler aktivieren (`chrome://flags/#enable-webassembly-baseline`).

- Nur TurboFan:
    - In V8 die Flags `--no-liftoff --no-wasm-tier-up` setzen.
    - In Chrome WebAssembly-Tiering deaktivieren (`chrome://flags/#enable-webassembly-tiering`) und den WebAssembly-Baseline-Compiler deaktivieren (`chrome://flags/#enable-webassembly-baseline`).

- Lazy-Kompilierung:
    - Lazy-Kompilierung ist ein Modus, bei dem eine Funktion erst kompiliert wird, wenn sie zum ersten Mal aufgerufen wird. Ähnlich wie in der Produktionskonfiguration wird die Funktion zuerst mit Liftoff kompiliert (blockierende Ausführung). Nachdem die Liftoff-Kompilierung abgeschlossen ist, wird die Funktion im Hintergrund mit TurboFan neu kompiliert.
    - In V8 das Flag `--wasm-lazy-compilation` setzen.
    - In Chrome WebAssembly-Lazy-Kompilierung aktivieren (`chrome://flags/#enable-webassembly-lazy-compilation`).

## Kompilierungszeit

Es gibt verschiedene Möglichkeiten, die Kompilierungszeit von Liftoff und TurboFan zu messen. In der Produktionskonfiguration von V8 kann die Kompilierungszeit von Liftoff über JavaScript gemessen werden, indem die Zeit gemessen wird, die `new WebAssembly.Module()` benötigt, um abgeschlossen zu werden, oder die Zeit, die `WebAssembly.compile()` benötigt, um das Versprechen aufzulösen. Um die Kompilierungszeit von TurboFan zu messen, kann dies in einer reinen TurboFan-Konfiguration auf die gleiche Weise erfolgen.

![Der Trace für die WebAssembly-Kompilierung in [Google Earth](https://earth.google.com/web).](/_img/wasm-compilation-pipeline/trace.svg)

Die Kompilierung kann auch detaillierter in `chrome://tracing/` gemessen werden, indem die Kategorie `v8.wasm` aktiviert wird. Liftoff-Kompilierung ist dann die Zeitspanne vom Beginn der Kompilierung bis zum Ereignis `wasm.BaselineFinished`, TurboFan-Kompilierung endet beim Ereignis `wasm.TopTierFinished`. Die Kompilierung selbst beginnt beim Ereignis `wasm.StartStreamingCompilation` für `WebAssembly.compileStreaming()`, beim Ereignis `wasm.SyncCompile` für `new WebAssembly.Module()`, und beim Ereignis `wasm.AsyncCompile` für `WebAssembly.compile()`. Liftoff-Kompilierung wird durch `wasm.BaselineCompilation`-Ereignisse angezeigt, TurboFan-Kompilierung durch `wasm.TopTierCompilation`-Ereignisse. Die obige Abbildung zeigt den für Google Earth aufgezeichneten Trace, wobei die Schlüsselevents hervorgehoben sind.

Detailliertere Trace-Daten sind mit der Kategorie `v8.wasm.detailed` verfügbar, die unter anderem die Kompilierungszeit einzelner Funktionen bereitstellt.
