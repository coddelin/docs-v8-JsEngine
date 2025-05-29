---
title: &apos;Integration der GDB JIT-Kompilierungsschnittstelle&apos;
description: &apos;Die Integration der GDB JIT-Kompilierungsschnittstelle ermöglicht es V8, GDB mit Symbolen und Debugging-Informationen für nativen Code zu versorgen, der aus der V8-Laufzeitumgebung stammt.&apos;
---
Die Integration der GDB JIT-Kompilierungsschnittstelle ermöglicht es V8, GDB mit Symbolen und Debugging-Informationen für nativen Code zu versorgen, der aus der V8-Laufzeitumgebung stammt.

Wenn die GDB JIT-Kompilierungsschnittstelle deaktiviert ist, enthält ein typischer Stacktrace in GDB Frames, die mit `??` gekennzeichnet sind. Diese Frames entsprechen dynamisch generiertem Code:

```
#8  0x08281674 in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#9  0xf5cae28e in ?? ()
#10 0xf5cc3a0a in ?? ()
#11 0xf5cc38f4 in ?? ()
#12 0xf5cbef19 in ?? ()
#13 0xf5cb09a2 in ?? ()
#14 0x0809e0a5 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd46f) at src/execution.cc:97
```

Das Aktivieren der GDB JIT-Kompilierungsschnittstelle ermöglicht es GDB jedoch, einen informativeren Stacktrace zu erzeugen:

```
#6  0x082857fc in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#7  0xf5cae28e in ?? ()
#8  0xf5cc3a0a in loop () at test.js:6
#9  0xf5cc38f4 in test.js () at test.js:13
#10 0xf5cbef19 in ?? ()
#11 0xf5cb09a2 in ?? ()
#12 0x0809e1f9 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd44f) at src/execution.cc:97
```

Frames, die GDB weiterhin unbekannt sind, entsprechen nativem Code ohne Quellinformationen. Weitere Details finden Sie unter [Bekannte Einschränkungen](#known-limitations).

Die GDB JIT-Kompilierungsschnittstelle ist in der GDB-Dokumentation beschrieben: https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## Voraussetzungen

- V8 v3.0.9 oder neuer
- GDB 7.0 oder neuer
- Linux-Betriebssystem
- CPU mit Intel-kompatibler Architektur (ia32 oder x64)

## Aktivieren der GDB JIT-Kompilierungsschnittstelle

Die GDB JIT-Kompilierungsschnittstelle ist derzeit standardmäßig vom Kompilierungsprozess ausgeschlossen und zur Laufzeit deaktiviert. Um sie zu aktivieren:

1. Bauen Sie die V8-Bibliothek mit definiertem `ENABLE_GDB_JIT_INTERFACE`. Wenn Sie Scons verwenden, um V8 zu bauen, führen Sie es mit `gdbjit=on` aus.
1. Übergeben Sie beim Starten von V8 das Flag `--gdbjit`.

Um zu überprüfen, ob Sie die GDB JIT-Integration korrekt aktiviert haben, versuchen Sie einen Breakpoint bei `__jit_debug_register_code` zu setzen. Diese Funktion wird aufgerufen, um GDB über neue Codeobjekte zu informieren.

## Bekannte Einschränkungen

- Die GDB-Seite der JIT-Schnittstelle verarbeitet die Registrierung von Codeobjekten derzeit (Stand: GDB 7.2) nicht sehr effizient. Jede nächste Registrierung dauert länger: Bei 500 registrierten Objekten dauert jede Registrierung mehr als 50 ms, bei 1000 registrierten Codeobjekten - mehr als 300 ms. Dieses Problem wurde [den GDB-Entwicklern gemeldet](https://sourceware.org/ml/gdb/2011-01/msg00002.html), aber derzeit ist keine Lösung verfügbar. Um die Belastung von GDB zu reduzieren, arbeitet die aktuelle Implementierung der GDB JIT-Integration in zwei Modi: _Standard_ und _Vollständig_ (aktiviert durch das Flag `--gdbjit-full`). Im _Standard_-Modus informiert V8 GDB nur über Codeobjekte, die mit Quellinformationen versehen sind (dazu gehören normalerweise alle Benutzerskripte). Im _Vollständig_-Modus über alle generierten Codeobjekte (Stubs, ICs, Trampolins).

- Unter x64 kann GDB den Stack ohne `.eh_frame`-Abschnitt nicht richtig entwirren ([Problem 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053)).

- GDB wird nicht über Code informiert, der aus dem Snapshot deserialisiert wurde ([Problem 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054)).

- Es wird nur das Linux-Betriebssystem auf Intel-kompatiblen CPUs unterstützt. Für andere Betriebssysteme müsste entweder ein anderer ELF-Header generiert oder ein komplett anderes Objektformat verwendet werden.

- Das Aktivieren der GDB JIT-Schnittstelle deaktiviert die kompakte GC. Dies geschieht, um die Belastung von GDB zu reduzieren, da das Abmelden und erneute Anmelden jedes verschobenen Codeobjekts erhebliche Überkopfkosten verursachen würde.

- Die GDB JIT-Integration liefert nur _ungefähre_ Quellinformationen. Sie bietet keine Informationen über lokale Variablen, Funktionsargumente, Stapelaufbau usw. Sie ermöglicht kein Durchgehen von JavaScript-Code oder das Setzen von Breakpoints in der angegebenen Zeile. Es ist jedoch möglich, einen Breakpoint auf eine Funktion nach ihrem Namen zu setzen.
