---
title: "Arm-Debugging mit dem Simulator"
description: "Der Arm-Simulator und Debugger können sehr hilfreich sein, wenn man mit der V8-Codegenerierung arbeitet."
---
Der Simulator und Debugger können sehr hilfreich sein, wenn man mit der V8-Codegenerierung arbeitet.

- Es ist praktisch, da Sie Codegenerierung testen können, ohne Zugriff auf tatsächliche Hardware zu haben.
- Keine [Cross-](/docs/cross-compile-arm) oder native Kompilierung erforderlich.
- Der Simulator unterstützt vollständig das Debuggen von generiertem Code.

Bitte beachten Sie, dass dieser Simulator für V8-Zwecke entwickelt wurde. Nur die von V8 verwendeten Funktionen sind implementiert, und es können nicht implementierte Funktionen oder Anweisungen auftreten. In diesem Fall können Sie diese gerne implementieren und den Code einreichen!

- [Kompilieren](#compiling)
- [Debuggen starten](#start_debug)
- [Debugging-Befehle](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [Zusätzliche Breakpoint-Funktionen](#extra)
    - [32-Bit: `stop()`](#arm32_stop)
    - [64-Bit: `Debug()`](#arm64_debug)

## Kompilieren für Arm mit dem Simulator

Standardmäßig auf einem x86-Host wird das Kompilieren für Arm mit [gm](/docs/build-gn#gm) Ihnen eine Simulator-Build erstellen:

```bash
gm arm64.debug # Für einen 64-Bit-Build oder...
gm arm.debug   # ... für einen 32-Bit-Build.
```

Sie können auch die `optdebug`-Konfiguration erstellen, da `debug` möglicherweise etwas langsam ist, insbesondere wenn Sie die V8-Test-Suite ausführen möchten.

## Debuggen starten

Sie können den Debugger direkt von der Befehlszeile nach `n` Anweisungen starten:

```bash
out/arm64.debug/d8 --stop_sim_at <n> # Oder out/arm.debug/d8 für einen 32-Bit-Build.
```

Alternativ können Sie eine Breakpoint-Anweisung im generierten Code erzeugen:

Nativ führen Breakpoint-Anweisungen dazu, dass das Programm mit einem `SIGTRAP`-Signal anhält, wodurch Sie das Problem mit gdb debuggen können. Wenn Sie jedoch mit einem Simulator ausführen, wird eine Breakpoint-Anweisung im generierten Code Sie stattdessen in den Simulator-Debugger bringen.

Sie können einen Breakpoint auf verschiedene Arten erzeugen, indem Sie `DebugBreak()` aus [Torque](/docs/torque-builtins), aus dem [CodeStubAssembler](/docs/csa-builtins), als Knoten in einer [TurboFan](/docs/turbofan)-Pass oder direkt mit einem Assembler verwenden.

Hier konzentrieren wir uns auf das Debuggen von Low-Level-native Code, daher schauen wir uns die Assembler-Methode an:

```cpp
TurboAssembler::DebugBreak();
```

Angenommen, wir haben eine jittierte Funktion namens `add`, die mit [TurboFan](/docs/turbofan) kompiliert wurde und wir möchten zu Beginn anhalten. Gegeben ein Beispiel `test.js`:



```js
// Unsere optimierte Funktion.
function add(a, b) {
  return a + b;
}

// Typische Cheat-Code aktiviert durch --allow-natives-syntax.
%PrepareFunctionForOptimization(add);

// Geben Sie dem optimierenden Compiler Typ-Feedback, damit er spekuliert, dass `a` und `b`
// Zahlen sind.
add(1, 3);

// Und erzwingen Sie, dass er optimiert.
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

Um dies zu tun, können wir in das TurboFan-[Code-Generator](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode) einhaken und Zugriff auf den Assembler erhalten, um unseren Breakpoint einzufügen:

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // Überprüfen, ob wir optimieren, dann den Namen der aktuellen Funktion suchen und
  // einen Breakpoint einfügen.
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

Und lassen Sie uns das ausführen:

```simulator
$ d8 \
    # Aktivieren von '%' Cheat-Code JS-Funktionen.
    --allow-natives-syntax \
    # Unsere Funktion disassemblieren.
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # Spectre-Mitigierungen für Lesbarkeit deaktivieren.
    --no-untrusted-code-mitigations \
    test.js
--- Rohquelle ---
(a, b) {
  return a + b;
}


--- Optimierter Code ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

Anweisungen (Größe = 504)
0x7f0900082be0     0  d45bd600       Konstantenpoolbeginn (num_const = 6)
0x7f0900082be4     4  00000000       Konstante
0x7f0900082be8     8  00000001       Konstante
0x7f0900082bec     c  75626544       Konstante
0x7f0900082bf0    10  65724267       Konstante
0x7f0900082bf4    14  00006b61       Konstante
0x7f0900082bf8    18  d45bd7e0       Konstante
                  -- Prolog: Code-Start-Register überprüfen --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (addr 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (addr 0x7f0900082c14)
                  Abbruchmeldung:
                  Falscher Wert im übergebenen Code-Start-Register
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- Inline-Trampolin zum Abbruch --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (addr 0x00007f0900082db8)    ;; Off-Heap-Ziel
0x7f0900082c10    30  d63f0200       blr x16
                  -- Prolog: Überprüfung auf Deoptimierung --
                  [ Entpacke markierten Zeiger
0x7f0900082c14    34  b85d0050       ldur w16, [x2, #-48]
0x7f0900082c18    38  8b100350       add x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       ldur w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (addr 0x7f0900082c2c)
                  -- Inline-Trampolin zu CompileLazyDeoptimizedCode --
0x7f0900082c24    44  58000c31       ldr x17, pc+388 (addr 0x00007f0900082da8)    ;; Ziel außerhalb des Heaps
0x7f0900082c28    48  d61f0220       br x17
                  -- B0 Start (Frame erstellen) --
(...)

--- Codeende ---
# Debugger-Haltemarke 0: DebugBreak
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (addr 0x7f0900082be0)
sim>
```

Wir sehen, dass wir am Anfang der optimierten Funktion angehalten haben, und der Simulator hat uns eine Eingabeaufforderung gegeben!

Beachte, dass dies nur ein Beispiel ist und sich V8 schnell ändern kann, daher können die Details variieren. Aber du solltest dies überall tun können, wo ein Assembler verfügbar ist.

## Debugging-Befehle

### Allgemeine Befehle

Gib `help` in der Debugger-Eingabeaufforderung ein, um Einzelheiten zu den verfügbaren Befehlen zu erhalten. Dazu gehören übliche gdb-ähnliche Befehle wie `stepi`, `cont`, `disasm` usw. Wenn der Simulator unter gdb ausgeführt wird, gibt der `gdb`-Debugger-Befehl die Kontrolle an gdb. Du kannst dann `cont` von gdb verwenden, um zum Debugger zurückzukehren.

### Architektur-spezifische Befehle

Jede Zielarchitektur implementiert ihren eigenen Simulator und Debugger, sodass die Erfahrung und Details variieren können.

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $register` (Alias `po`)

Beschreibt ein JS-Objekt, das in einem Register gespeichert ist.

Beispielsweise nehmen wir an, dass wir dieses Mal [unser Beispiel](#test.js) auf einem 32-Bit-Arm-Simulator-Build ausführen. Wir können ankommende Argumente untersuchen, die in Registern übergeben werden:

```simulator
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
Simulator-Haltemarke erreicht, Halten an der nächsten Anweisung:
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> print r1
r1: 0x4b60ffb1 1264648113
# Das aktuelle Funktionsobjekt wird mit r1 übergeben.
sim> printobject r1
r1:
0x4b60ffb1: [Function] in OldSpace
 - map: 0x485801f9 <Map(HOLEY_ELEMENTS)> [Schnelleigenschaften]
 - prototype: 0x4b6010f1 <JSFunction (sfi = 0x42404e99)>
 - elements: 0x5b700661 <FixedArray[0]> [HOLEY_ELEMENTS]
 - function prototype:
 - initial_map:
 - shared_info: 0x4b60fe9d <SharedFunctionInfo add>
 - name: 0x5b701c5d <String[#3]: add>
 - formal_parameter_count: 2
 - kind: NormalFunction
 - context: 0x4b600c65 <NativeContext[261]>
 - code: 0x26842de1 <Code OPTIMIZED_FUNCTION>
 - source code: (a, b) {
  return a + b;
}
(...)

# Jetzt den aktuellen JS-Kontext anzeigen, der in r7 übergeben wird.
sim> printobject r7
r7:
0x449c0c65: [NativeContext] in OldSpace
 - map: 0x561000b9 <Map>
 - length: 261
 - scope_info: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
 - previous: 0
 - native_context: 0x449c0c65 <NativeContext[261]>
           0: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
           1: 0
           2: 0x449cdaf5 <JSObject>
           3: 0x58480c25 <JSGlobal Object>
           4: 0x58485499 <Other heap object (EMBEDDER_DATA_ARRAY_TYPE)>
           5: 0x561018a1 <Map(HOLEY_ELEMENTS)>
           6: 0x3408027d <undefined>
           7: 0x449c75c1 <JSFunction ArrayBuffer (sfi = 0x4be8ade1)>
           8: 0x561010f9 <Map(HOLEY_ELEMENTS)>
           9: 0x449c967d <JSFunction arrayBufferConstructor_DoNotInitialize (sfi = 0x4be8c3ed)>
          10: 0x449c8dbd <JSFunction Array (sfi = 0x4be8be59)>
(...)
```

#### `trace` (Alias `t`)

Aktivieren oder Deaktivieren der Verfolgung ausgeführter Anweisungen.

Wenn aktiviert, gibt der Simulator disassemblierte Anweisungen aus, während er sie ausführt. Wenn du eine 64-Bit-Arm-Build ausführst, kann der Simulator auch Änderungen an Registerwerten verfolgen.

Du kannst dies auch mit dem `--trace-sim`-Flag vom Kommandozeilenstart aktivieren, um die Verfolgung direkt von Anfang an zu starten.

Mit dem gleichen [Beispiel](#test.js):

```simulator
$ out/arm64.debug/d8 --allow-natives-syntax \
    # --debug-sim ist erforderlich auf 64-Bit Arm, um Disassemblierung
    # beim Tracen zu ermöglichen.
    --debug-sim test.js
# Debugger-Haltemarke 0: DebugBreak
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)
sim> trace
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)
Disassemblierung, Register- und Speicherverfolgung aktiviert

# Halte an der Rücksprungadresse, gespeichert im lr-Register.
sim> break lr
Haltepunkt an 0x7f1f880abd28 gesetzt
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)

# Fortfahren wird die Ausführung der Funktion verfolgen, bis wir zurückkehren, sodass
# wir verstehen können, was passiert.
sim> continue
#    x0: 0x00007f1e00082ba1
#    x1: 0x00007f1e08250125
#    x2: 0x00007f1e00082be0
(...)

# Wir laden zuerst die Argumente 'a' und 'b' vom Stack und überprüfen, ob sie
# markierte Zahlen sind. Dies wird durch das niedrigstwertige Bit, das 0 ist, angezeigt.
0x00007f1e00082c90  f9401fe2            ldr x2, [sp, #56]
#    x2: 0x000000000000000a <- 0x00007f1f821f0278
0x00007f1e00082c94  7200005f            tst w2, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082c98  54000ac1            b.ne #+0x158 (Adresse 0x7f1e00082df0)
0x00007f1e00082c9c  f9401be3            ldr x3, [sp, #48]
#    x3: 0x000000000000000e <- 0x00007f1f821f0270
0x00007f1e00082ca0  7200007f            tst w3, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082ca4  54000a81            b.ne #+0x150 (Adresse 0x7f1e00082df4)

# Dann entfernen wir das Tagging und addieren 'a' und 'b' zusammen.
0x00007f1e00082ca8  13017c44            asr w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            adds w4, w4, w3, asr #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# Das ist 5 + 7 == 12, alles in Ordnung!

# Dann überprüfen wir Überläufe und taggen das Ergebnis erneut.
0x00007f1e00082cb0  54000a46            b.vs #+0x148 (Adresse 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            adds w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            b.vs #+0x8c (Adresse 0x7f1e00082d44)


# Und schließlich platzieren wir das Ergebnis in x0.
0x00007f1e00082cbc  aa0203e0            mov x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            ret
Haltepunkt getroffen und deaktiviert bei 0x7f1f880abd28.
0x00007f1f880abd28  f85e83b4            ldur x20, [fp, #-24]
sim>
```

#### `break $address`

Setzt einen Haltepunkt an der angegebenen Adresse.

Beachten Sie, dass Sie bei 32-Bit-ARM nur einen Haltepunkt haben können und den Schreibschutz auf Code-Seiten deaktivieren müssen, um ihn zu setzen. Der 64-Bit-ARM-Simulator unterliegt solchen Einschränkungen nicht.

Hier ist wieder unser [Beispiel](#test.js):

```simulator
$ out/arm.debug/d8 --allow-natives-syntax \
    # Das ist nützlich, um zu wissen, an welcher Adresse angehalten werden soll.
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

Simulator hat Stopp getroffen, Haltepunkt beim nächsten Befehl:
  0x488c2e20  e24fc00c       sub ip, pc, #12

# Haltepunkt auf eine bekannte interessante Adresse setzen, wo wir beginnen
# 'a' und 'b' zu laden.
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]

# Wir können mit 'disasm' einen Blick vorauswerfen.
sim> disasm 10
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]
  0x488c2ea0  e3120001       tst r2, #1
  0x488c2ea4  1a000037       bne +228 -> 0x488c2f88
  0x488c2ea8  e59b3008       ldr r3, [fp, #+8]
  0x488c2eac  e3130001       tst r3, #1
  0x488c2eb0  1a000037       bne +228 -> 0x488c2f94
  0x488c2eb4  e1a040c2       mov r4, r2, asr #1
  0x488c2eb8  e09440c3       adds r4, r4, r3, asr #1
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0
  0x488c2ec0  e0942004       adds r2, r4, r4

# Und versuchen Sie, bei dem Ergebnis der ersten `adds`-Befehle anzuhalten.
sim> break 0x488c2ebc
Setzen des Haltepunkts fehlgeschlagen

# Ah, wir müssen zuerst den Haltepunkt löschen.
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0

sim> print r4
r4: 0x0000000c 12
# Das ist 5 + 7 == 12, alles in Ordnung!
```

### Generierte Haltepunktanweisungen mit einigen zusätzlichen Funktionen

Anstelle von `TurboAssembler::DebugBreak()` können Sie eine niederwertigere Anweisung verwenden, die denselben Effekt hat, jedoch mit zusätzlichen Funktionen.

- [32-Bit: `stop()`](#arm32_stop)
- [64-Bit: `Debug()`](#arm64_debug)

#### `stop()` (32-Bit Arm)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

Das erste Argument ist die Bedingung und das zweite ist der Stop-Code. Wenn ein Code angegeben ist und unter 256 liegt, wird der Stopp als „beobachtet“ bezeichnet und kann deaktiviert/aktiviert werden; ein Zähler verfolgt auch, wie oft der Simulator diesen Code erreicht.

Stellen Sie sich vor, wir arbeiten an diesem V8-C++-Code:

```cpp
__ stop(al, 123);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ stop(al, 0x1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
```

Hier ist eine Beispiel-Debugging-Sitzung:

Wir haben den ersten Stopp erreicht.

```simulator
Simulator hat Stopp 123 getroffen, Haltepunkt beim nächsten Befehl:
  0xb53559e8  e1a00000       mov r0, r0
```

Wir können den nächsten Stopp mit `disasm` anzeigen.

```simulator
sim> disasm
  0xb53559e8  e1a00000       mov r0, r0
  0xb53559ec  e1a00000       mov r0, r0
  0xb53559f0  e1a00000       mov r0, r0
  0xb53559f4  e1a00000       mov r0, r0
  0xb53559f8  e1a00000       mov r0, r0
  0xb53559fc  ef800001       stop 1 - 0x1
  0xb5355a00  e1a00000       mov r1, r1
  0xb5355a04  e1a00000       mov r1, r1
  0xb5355a08  e1a00000       mov r1, r1
```

Information können für alle (beobachteten) Stopps angezeigt werden, die mindestens einmal getroffen wurden.

```simulator
sim> stop info all
Stop-Information:
stop 123 - 0x7b:      Aktiviert,      Zähler = 1
sim> cont
Simulator hat Stopp 1 getroffen, Haltepunkt beim nächsten Befehl:
  0xb5355a04  e1a00000       mov r1, r1
sim> stop info all
Stop-Information:
stop 1 - 0x1:         Aktiviert,      Zähler = 1
stop 123 - 0x7b:      Aktiviert,      Zähler = 1
```

Stopps können deaktiviert oder aktiviert werden. (Nur verfügbar für beobachtete Stopps.)

```simulator
sim> stop disable 1
sim> cont
Simulator trifft Stopp 123, Unterbrechung bei der nächsten Anweisung:
  0xb5356808  e1a00000       mov r0, r0
sim> fortsetzen
Simulator trifft Stopp 123, Unterbrechung bei der nächsten Anweisung:
  0xb5356c28  e1a00000       mov r0, r0
sim> Stoppinfo alle
Stoppinfo:
Stopp 1 - 0x1:         Deaktiviert,   Zähler = 2
Stopp 123 - 0x7b:      Aktiviert,     Zähler = 3
sim> Stopp aktivieren 1
sim> fortsetzen
Simulator trifft Stopp 1, Unterbrechung bei der nächsten Anweisung:
  0xb5356c44  e1a00000       mov r1, r1
sim> Stopp deaktivieren alle
sim> fortfahren
```

#### `Debug()` (64-Bit Arm)

```cpp
MacroAssembler::Debug(const char* Nachricht, uint32_t Code, Instr Parameter = BREAK);
```

Diese Anweisung ist standardmäßig ein Haltepunkt, kann aber auch Tracing aktivieren und deaktivieren, als ob Sie dies mit dem [`trace`](#trace)-Befehl im Debugger getan hätten. Außerdem können Sie eine Nachricht und einen Code als Identifikator angeben.

Stellen Sie sich vor, wir arbeiten an diesem V8-C++-Code, der aus dem nativen Builtin stammt, das den Frame vorbereitet, um eine JS-Funktion aufzurufen.

```cpp
int64_t schlechter_rahmenzeiger = -1L;  // Schlechter Rahmenzeiger, sollte fehlschlagen, wenn er verwendet wird.
__ Mov(x13, schlechter_rahmenzeiger);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

Es könnte nützlich sein, einen Haltepunkt mit `DebugBreak()` einzufügen, damit wir den aktuellen Zustand untersuchen können, wenn wir dies ausführen. Aber wir können weiter gehen und diesen Code verfolgen, wenn wir stattdessen `Debug()` verwenden:

```cpp
// Tracing starten und Disassembly und Registerwerte protokollieren.
__ Debug("tracing starten", 42, TRACE_ENABLE | LOG_ALL);

int64_t schlechter_rahmenzeiger = -1L;  // Schlechter Rahmenzeiger, sollte fehlschlagen, wenn er verwendet wird.
__ Mov(x13, schlechter_rahmenzeiger);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// Tracing stoppen.
__ Debug("tracing stoppen", 42, TRACE_DISABLE);
```

Es ermöglicht uns, Registerwerte __nur__ für den Codeausschnitt zu verfolgen, an dem wir arbeiten:

```simulator
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (Runden auf den nächsten Wert)
#    x0: 0x00007fbf00000000
#    x1: 0x00007fbf0804030d
#    x2: 0x00007fbf082500e1
(...)

0x00007fc039d31cb0  9280000d            movn x13, #0x0
#   x13: 0xffffffffffffffff
0x00007fc039d31cb4  d280004c            movz x12, #0x2
#   x12: 0x0000000000000002
0x00007fc039d31cb8  d2864110            movz x16, #0x3208
#   ip0: 0x0000000000003208
0x00007fc039d31cbc  8b10034b            add x11, x26, x16
#   x11: 0x00007fbf00003208
0x00007fc039d31cc0  f940016a            ldr x10, [x11]
#   x10: 0x0000000000000000 <- 0x00007fbf00003208
0x00007fc039d31cc4  a9be7fea            stp x10, xzr, [sp, #-32]!
#    sp: 0x00007fc033e81340
#   x10: 0x0000000000000000 -> 0x00007fc033e81340
#   xzr: 0x0000000000000000 -> 0x00007fc033e81348
0x00007fc039d31cc8  a90137ec            stp x12, x13, [sp, #16]
#   x12: 0x0000000000000002 -> 0x00007fc033e81350
#   x13: 0xffffffffffffffff -> 0x00007fc033e81358
0x00007fc039d31ccc  910063fd            add fp, sp, #0x18 (24)
#    fp: 0x00007fc033e81358
0x00007fc039d31cd0  d45bd600            hlt #0xdeb0
```
