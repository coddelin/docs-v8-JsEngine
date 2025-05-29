---
title: "Debugging eingebettete Funktionen mit GDB"
description: "Ab V8 v6.9 ist es möglich, mit GDB Haltepunkte zu erstellen, um CSA / ASM / Torque eingebettete Funktionen zu debuggen."
---
Ab V8 v6.9 ist es möglich, mit GDB (und möglicherweise anderen Debuggern) Haltepunkte zu setzen, um CSA / ASM / Torque eingebettete Funktionen zu debuggen.

```
(gdb) tb i::Isolate::Init
Temporärer Haltepunkt 1 bei 0x7ffff706742b: i::Isolate::Init. (2 Orte)
(gdb) r
Thread 1 "d8" hat Temporären Haltepunkt 1 erreicht, 0x00007ffff7c55bc0 in Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
Haltepunkt 2 bei 0x7ffff7ac8784
(gdb) c
Thread 1 "d8" hat Haltepunkt 2 erreicht, 0x00007ffff7ac8784 in Builtins_RegExpPrototypeExec ()
```

Es ist hilfreich, für diesen Zweck einen temporären Haltepunkt (Shortcut `tb` in GDB) statt eines regulären Haltepunkts (`br`) zu verwenden, da Sie ihn nur beim Prozessstart benötigen.

Eingebettete Funktionen sind auch in Stack-Traces sichtbar:

```
(gdb) bt
#0  0x00007ffff7ac8784 in Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066 in Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1 in ?? ()
#3  0x000037ef23a0fa59 in ?? ()
#4  0x0000000000000000 in ?? ()
```

Hinweise:

- Funktioniert nur mit eingebetteten Funktionen.
- Haltepunkte können nur am Anfang der eingebetteten Funktion gesetzt werden.
- Der anfängliche Haltepunkt in `Isolate::Init` ist erforderlich, bevor der Haltepunkt für die eingebettete Funktion gesetzt werden kann, da GDB die Binärdatei modifiziert und wir einen Hash des eingebetteten Abschnitts der Binärdatei beim Start überprüfen. Andernfalls gibt V8 einen Hash-Mismatch-Fehler aus:

    ```
    # Schwerwiegender Fehler in ../../src/isolate.cc, Zeile 117
    # Überprüfung fehlgeschlagen: d.Hash() == d.CreateHash() (11095509419988753467 vs. 3539781814546519144).
    ```
