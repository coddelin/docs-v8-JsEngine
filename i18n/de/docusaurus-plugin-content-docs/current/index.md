---
title: &apos;Dokumentation&apos;
description: &apos;Dokumentation für das V8-Projekt.&apos;
slug: /
---
V8 ist Googles quelloffene, hochleistungsfähige JavaScript- und WebAssembly-Engine, geschrieben in C++. Sie wird unter anderem in Chrome und Node.js verwendet.

Diese Dokumentation richtet sich an C++-Entwickler, die V8 in ihren Anwendungen verwenden möchten, sowie an alle, die an Design und Leistung von V8 interessiert sind. Dieses Dokument bietet eine Einführung in V8, während die übrige Dokumentation zeigt, wie man V8 in Code verwendet, einige Details zum Design beschreibt und eine Reihe von JavaScript-Benchmarks zur Messung der Leistung von V8 bereitstellt.

## Über V8

V8 implementiert <a href="https://tc39.es/ecma262/">ECMAScript</a> und <a href="https://webassembly.github.io/spec/core/">WebAssembly</a> und läuft auf Windows-, macOS- und Linux-Systemen, die x64-, IA-32- oder ARM-Prozessoren verwenden. Zusätzliche Systeme (IBM i, AIX) und Prozessoren (MIPS, ppcle64, s390x) werden extern gewartet, siehe [Ports](/ports). V8 kann in jede C++-Anwendung eingebettet werden.

V8 kompiliert und führt JavaScript-Quellcode aus, verwaltet Speicherzuteilung für Objekte und führt eine Garbage Collection durch, um Objekte zu entfernen, die nicht mehr benötigt werden. Der stop-the-world, generative und genaue Garbage Collector von V8 ist einer der Schlüssel zu seiner Leistung.

JavaScript wird häufig für clientseitiges Scripting in einem Browser verwendet, beispielsweise zur Manipulation von Document Object Model (DOM)-Objekten. Das DOM wird jedoch normalerweise nicht von der JavaScript-Engine bereitgestellt, sondern von einem Browser. Gleiches gilt für V8 — Google Chrome stellt das DOM bereit. V8 bietet jedoch alle Datentypen, Operatoren, Objekte und Funktionen, die im ECMA-Standard angegeben sind.

V8 ermöglicht es jeder C++-Anwendung, ihre eigenen Objekte und Funktionen für JavaScript-Code verfügbar zu machen. Es liegt an Ihnen, zu entscheiden, welche Objekte und Funktionen Sie JavaScript bereitstellen möchten.

## Übersicht über die Dokumentation

- [V8 aus dem Quellcode bauen](/build)
    - [Den V8-Quellcode auschecken](/source-code)
    - [Mit GN bauen](/build-gn)
    - [Cross-Compiling und Debugging für ARM/Android](/cross-compile-arm)
    - [Cross-Compiling für iOS](/cross-compile-ios)
    - [GUI- und IDE-Setup](/ide-setup)
    - [Kompilierung auf Arm64](/compile-arm64)
- [Beitrag leisten](/contribute)
    - [Respektvoller Code](/respectful-code)
    - [V8’s öffentliche API und deren Stabilität](/api)
    - [V8-Committer werden](/become-committer)
    - [Verantwortung des Committers](/committer-responsibility)
    - [Blink-Webtests (alias Layout-Tests)](/blink-layout-tests)
    - [Codeabdeckung bewerten](/evaluate-code-coverage)
    - [Freigabeprozess](/release-process)
    - [Design-Überprüfungsrichtlinien](/design-review-guidelines)
    - [Implementierung und Versand von JavaScript-/WebAssembly-Sprachfunktionen](/feature-launch-process)
    - [Checkliste für die Staging- und Versandbereitschaft von WebAssembly-Funktionen](/wasm-shipping-checklist)
    - [Flake Bisect](/flake-bisect)
    - [Handhabung von Ports](/ports)
    - [Offizieller Support](/official-support)
    - [Zusammenführen & Patchen](/merge-patch)
    - [Node.js-Integrationsbuild](/node-integration)
    - [Meldung von Sicherheitslücken](/security-bugs)
    - [Benchmarks lokal ausführen](/benchmarks)
    - [Testen](/test)
    - [Probleme triagieren](/triage-issues)
- Debugging
    - [Arm-Debugging mit dem Simulator](/debug-arm)
    - [Cross-Compiling und Debugging für ARM/Android](/cross-compile-arm)
    - [Debugging von Builtins mit GDB](/gdb)
    - [Debugging über das V8 Inspector Protokoll](/inspector)
    - [GDB JIT Compilation Interface-Integration](/gdb-jit)
    - [Untersuchung von Speicherlecks](/memory-leaks)
    - [Stack Trace API](/stack-trace-api)
    - [Verwendung von D8](/d8)
    - [V8 Tools](https://v8.dev/tools)
- Einbettung von V8
    - [Leitfaden zur Einbettung von V8](/embed)
    - [Versionsnummern](/version-numbers)
    - [Eingebaute Funktionen](/builtin-functions)
    - [i18n-Unterstützung](/i18n)
    - [Maßnahmen gegen unvertrauten Code](/untrusted-code-mitigations)
- Unter der Haube
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Torque-Benutzerhandbuch](/torque)
    - [Schreiben von Torque Built-ins](/torque-builtins)
    - [Schreiben von CSA Built-ins](/csa-builtins)
    - [Hinzufügen eines neuen WebAssembly-Opcode](/webassembly-opcode)
    - [Maps, alias "Versteckte Klassen"](/hidden-classes)
    - [Slack-Tracking – was ist das?](/blog/slack-tracking)
    - [WebAssembly-Kompilierungs-Pipeline](/wasm-compilation-pipeline)
- Schreibweise optimierbaren JavaScripts
    - [Verwendung von V8’s Sampling-Profiler](/profile)
    - [Profiling von Chromium mit V8](/profile-chromium)
    - [Verwendung von Linux `perf` mit V8](/linux-perf)
    - [Tracing V8](/trace)
    - [Verwendung von Runtime Call Stats](/rcs)
