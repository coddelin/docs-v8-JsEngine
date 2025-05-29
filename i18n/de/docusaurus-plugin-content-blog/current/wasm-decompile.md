---
title: "Was steckt in dieser `.wasm`? Einführung: `wasm-decompile`"
author: "Wouter van Oortmerssen ([@wvo](https://twitter.com/wvo))"
avatars:
  - "wouter-van-oortmerssen"
date: 2020-04-27
tags:
  - WebAssembly
  - Tools
description: "WABT erhält ein neues Dekompilierungswerkzeug, das das Lesen der Inhalte von Wasm-Modulen erleichtern kann."
tweet: "1254829913561014272"
---
Wir haben eine wachsende Anzahl von Compilern und anderen Werkzeugen, die `.wasm`-Dateien erzeugen oder bearbeiten, und manchmal möchte man hineinschauen. Vielleicht sind Sie Entwickler eines solchen Werkzeugs oder direkt Programmierer, der auf Wasm abzielt und darüber nachdenkt, wie der erzeugte Code aussieht - aus Leistungsgründen oder anderen Gründen.

<!--truncate-->
Das Problem ist, dass Wasm ziemlich niedrigstufig ist, ähnlich wie tatsächlicher Assemblercode. Insbesondere wurden alle Datenstrukturen im Gegensatz beispielsweise zur JVM in Lade-/Speicheroperationen kompiliert, anstatt bequem benannte Klassen und Felder zu verwenden. Compiler wie LLVM können beeindruckende Transformationen durchführen, die den erzeugten Code völlig anders aussehen lassen als den ursprünglich eingegebenen Code.

## Disassemblieren oder... dekompilieren?

Sie könnten Werkzeuge wie `wasm2wat` (Teil des [WABT](https://github.com/WebAssembly/wabt)-Werkzeugsets) verwenden, um eine `.wasm` in Wasms Standardtextformat `.wat` umzuwandeln, das eine sehr genaue, aber nicht besonders lesbare Darstellung ist.

Zum Beispiel eine einfache C-Funktion wie ein Skalarprodukt:

```c
typedef struct { float x, y, z; } vec3;

float dot(const vec3 *a, const vec3 *b) {
    return a->x * b->x +
           a->y * b->y +
           a->z * b->z;
}
```

Wir verwenden `clang dot.c -c -target wasm32 -O2` gefolgt von `wasm2wat -f dot.o`, um dies in folgende `.wat` umzuwandeln:

```wasm
(func $dot (type 0) (param i32 i32) (result f32)
  (f32.add
    (f32.add
      (f32.mul
        (f32.load
          (local.get 0))
        (f32.load
          (local.get 1)))
      (f32.mul
        (f32.load offset=4
          (local.get 0))
        (f32.load offset=4
          (local.get 1))))
    (f32.mul
      (f32.load offset=8
        (local.get 0))
      (f32.load offset=8
        (local.get 1))))))
```

Das ist schon eine winzige Menge an Code, aber aus vielen Gründen nicht leicht lesbar. Neben dem Mangel an ausdrucksbasierter Syntax und allgemeiner Wortfülle ist es nicht einfach, Datenstrukturen als Speicherladeoperationen zu verstehen. Stellen Sie sich nun vor, Sie schauen sich die Ausgabe eines großen Programms an, und die Dinge werden schnell unverständlich.

Anstelle von `wasm2wat` führen Sie `wasm-decompile dot.o` aus, und Sie erhalten:

```c
function dot(a:{ a:float, b:float, c:float },
             b:{ a:float, b:float, c:float }):float {
  return a.a * b.a + a.b * b.b + a.c * b.c
}
```

Das sieht viel vertrauter aus. Neben einer ausdrucksbasierten Syntax, die Programmiersprachen nachahmt, mit denen Sie vertraut sein könnten, betrachtet der Dekomplier alle Lade- und Speicheroperationen in einer Funktion und versucht, ihre Struktur zu erkennen. Er annotiert dann jede Variable, die als Zeiger verwendet wird, mit einer „Inline“-Strukturerklärung. Er erstellt keine benannten Strukturerklärungen, da er nicht unbedingt weiß, welche Verwendungen von 3 Floats dasselbe Konzept darstellen.

## Dekompilieren zu was?

`wasm-decompile` erzeugt eine Ausgabe, die versucht, wie eine „sehr durchschnittliche Programmiersprache“ auszusehen, während sie dennoch nah an dem Wasm bleibt, das sie darstellt.

Sein Ziel #1 ist Lesbarkeit: den Lesern helfen zu verstehen, was in einer `.wasm` steckt, mit so leicht zu verfolgendem Code wie möglich. Sein Ziel #2 ist, Wasm dennoch so nah wie möglich zu 1:1 darzustellen, damit es nicht seine Nützlichkeit als Disassembler verliert. Offensichtlich sind diese beiden Ziele nicht immer vereinbar.

Diese Ausgabe soll keine tatsächliche Programmiersprache sein, und es gibt derzeit keine Möglichkeit, sie zurück in Wasm zu kompilieren.

### Lade- und Speicheroperationen

Wie oben gezeigt, betrachtet `wasm-decompile` alle Lade- und Speicheroperationen über einen bestimmten Zeiger. Wenn sie ein kontinuierliches Set von Zugriffen bilden, wird er eine dieser „Inline“-Strukturerklärungen ausgeben.

Wenn nicht alle „Felder“ angegriffen werden, kann er nicht sicher sagen, ob dies eine Struktur darstellen soll oder eine andere Form von unabhängigen Speicherzugriffen. In diesem Fall greift er auf einfachere Typen wie `float_ptr` zurück (wenn die Typen dieselben sind) oder gibt im schlimmsten Fall einen Array-Zugriff wie `o[2]:int` aus, was bedeutet: `o` zeigt auf `int`-Werte, und wir greifen auf den dritten zu.

Dieser letzte Fall tritt häufiger auf, als man denken könnte, da Wasm-Lokale mehr wie Register als Variablen funktionieren, sodass optimierter Code denselben Zeiger für unabhängige Objekte teilen kann.

Der Dekomplier versucht, bei der Indizierung intelligent zu sein, und erkennt Muster wie `(base + (index << 2))[0]:int`, die aus regulären C-Array-Indizierungsoperationen wie `base[index]` resultieren, wobei `base` auf einen 4-Byte-Typ zeigt. Diese sind im Code sehr häufig, da Wasm nur konstante Offsets bei Lade- und Speicheroperationen hat. Der Output von `wasm-decompile` transformiert sie zurück in `base[index]:int`.

Darüber hinaus weiß er, wann absolute Adressen sich auf den Datenabschnitt beziehen.

### Kontrollfluss

Am bekanntesten ist die If-Then-Konstruktion von Wasm, die in eine vertraute `if (cond) { A } else { B }`-Syntax übersetzt wird. Mit der Besonderheit, dass sie in Wasm tatsächlich einen Wert zurückgeben kann, sodass sie auch die ternäre Syntax `cond ? A : B` darstellen kann, die in manchen Sprachen verfügbar ist.

Der Rest des Kontrollflusses von Wasm basiert auf den `block`- und `loop`-Blöcken sowie den Sprüngen `br`, `br_if` und `br_table`. Der Decompiler bleibt relativ nah an diesen Konstruktionen, anstatt die möglichen ursprünglichen while-/for-/switch-Konstrukte zu erraten, da dies besser mit optimiertem Output funktioniert. Ein typischer Loop im `wasm-decompile`-Output könnte beispielsweise so aussehen:

```c
loop A {
  // Rumpf der Schleife hier.
  if (cond) continue A;
}
```

Hier ist `A` ein Label, das das Verschachteln mehrerer solcher Schleifen ermöglicht. Ein `if` und `continue` zur Steuerung der Schleife mag im Vergleich zu einer while-Schleife etwas fremd wirken, entspricht jedoch direkt dem `br_if` von Wasm.

Blöcke sind ähnlich, aber anstatt rückwärts zu verzweigen, verzweigen sie vorwärts:

```c
block {
  if (cond) break;
  // Der Rumpf kommt hierhin.
}
```

Dies implementiert tatsächlich ein If-Then. Zukünftige Versionen des Decompilers könnten diese, wenn möglich, in tatsächliche If-Then-Ausdrücke übersetzen.

Die überraschendste Kontrollkonstruktion von Wasm ist `br_table`, das etwas wie ein `switch` implementiert, jedoch mit verschachtelten `block`s, was oft schwer zu lesen ist. Der Decompiler flacht diese ab, um sie etwas
einfacher nachvollziehbar zu machen, zum Beispiel:

```c
br_table[A, B, C, ..D](a);
label A:
return 0;
label B:
return 1;
label C:
return 2;
label D:
```

Dies ist ähnlich wie ein `switch` auf `a`, wobei `D` der Standardfall ist.

### Weitere interessante Funktionen

Der Decompiler:

- Kann Namen aus Debug- oder Verknüpfungsinformationen entnehmen oder selbst Namen generieren. Bei der Verwendung vorhandener Namen gibt es speziellen Code, um die Namensmangling-Symbole von C++ zu vereinfachen.
- Unterstützt bereits den Vorschlag für Mehrfachwerte, was das Umwandeln von Dingen in Ausdrücke und Anweisungen etwas schwieriger macht. Zusätzliche Variablen werden verwendet, wenn mehrere Werte zurückgegeben werden.
- Er kann sogar Namen aus den _Inhalten_ von Datensektionen generieren.
- Gibt schöne Deklarationen für alle Wasm-Sektionstypen aus, nicht nur für Code. Beispielsweise versucht er, Datensektionen lesbar zu machen, indem er sie, wenn möglich, als Text ausgibt.
- Unterstützt Operatorpräzedenz (üblich in den meisten C-ähnlichen Sprachen), um die Anzahl der `()` in häufigen Ausdrücken zu reduzieren.

### Einschränkungen

Das Decompilieren von Wasm ist grundsätzlich schwieriger als beispielsweise JVM-Bytecode.

Letzteres ist unoptimiert, also relativ treu zur Struktur des ursprünglichen Codes, und verweist, selbst wenn Namen fehlen, auf einzigartige Klassen anstatt nur auf Speicherorte.

Im Gegensatz dazu wurde die meiste `.wasm`-Ausgabe stark von LLVM optimiert und hat daher oft den größten Teil ihrer ursprünglichen Struktur verloren. Der Ausgabecode ist sehr unähnlich dem, was ein Programmierer schreiben würde. Das macht es zu einer größeren Herausforderung, einen nützlichen Decompiler für Wasm zu erstellen. Das bedeutet jedoch nicht, dass wir es nicht versuchen sollten!

## Mehr

Die beste Möglichkeit, mehr zu erfahren, ist natürlich, Ihr eigenes Wasm-Projekt zu dekompilieren!

Zusätzlich finden Sie eine detailliertere Anleitung zu `wasm-decompile` [hier](https://github.com/WebAssembly/wabt/blob/master/docs/decompiler.md). Die Implementierung befindet sich in den Quellcodedateien, die mit `decompiler` beginnen [hier](https://github.com/WebAssembly/wabt/tree/master/src) (gerne können Sie einen PR einreichen, um sie zu verbessern!). Einige Testfälle, die weitere Beispiele für Unterschiede zwischen `.wat` und dem Decompiler zeigen, finden Sie [hier](https://github.com/WebAssembly/wabt/tree/master/test/decompile).
