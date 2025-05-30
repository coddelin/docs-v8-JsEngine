---
title: "WebAssembly-Integration mit JavaScript-BigInt"
author: "Alon Zakai"
avatars: 
  - "alon-zakai"
date: 2020-11-12
tags: 
  - WebAssembly
  - ECMAScript
description: "BigInts machen es einfach, 64-Bit-Ganzzahlen zwischen JavaScript und WebAssembly zu übertragen. Dieser Beitrag erklärt, was das bedeutet und warum es nützlich ist, einschließlich der Vereinfachung für Entwickler, der Beschleunigung des Codes und auch der Verkürzung der Build-Zeiten."
tweet: "1331966281571037186"
---
Das [JS-BigInt-Integration](https://github.com/WebAssembly/JS-BigInt-integration)-Feature macht es einfach, 64-Bit-Ganzzahlen zwischen JavaScript und WebAssembly zu übertragen. Dieser Beitrag erklärt, was das bedeutet und warum es nützlich ist, einschließlich der Vereinfachung für Entwickler, der Beschleunigung des Codes und auch der Verkürzung der Build-Zeiten.

<!--truncate-->
## 64-Bit-Ganzzahlen

JavaScript-Zahlen sind Doubles, das heißt 64-Bit-Gleitkommawerte. Solche Werte können jede 32-Bit-Ganzzahl mit voller Präzision enthalten, aber nicht alle 64-Bit-Werte. WebAssembly hingegen unterstützt 64-Bit-Ganzzahlen vollständig, den Typ `i64`. Ein Problem tritt auf, wenn die beiden verbunden werden: Wenn beispielsweise eine Wasm-Funktion ein i64 zurückgibt, wirft die VM eine Ausnahme, wenn sie aus JavaScript aufgerufen wird, und zwar etwa so:

```
TypeError: Wasm-Funktionssignatur enthält einen illegalen Typ
```

Wie der Fehler besagt, ist `i64` kein gültiger Typ für JavaScript.

Historisch gesehen war die beste Lösung hierfür die „Legalisierung“ des Wasm. Legalisierung bedeutet, dass Wasm-Imports und -Exports so umgewandelt werden, dass sie gültige Typen für JavaScript verwenden. In der Praxis wurden dadurch zwei Dinge erreicht:

1. Ersetzen eines 64-Bit-Ganzzahlenparameters durch zwei 32-Bit-Werte, die die niedrigen bzw. hohen Bits darstellen.
2. Ersetzen eines 64-Bit-Ganzzahlenrückgabewertes durch einen 32-Bit-Wert, der die niedrigen Bits darstellt, und Verwendung eines weiteren 32-Bit-Wertes für die hohen Bits.

Betrachten Sie beispielsweise dieses Wasm-Modul:

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

Legalisierung würde das in Folgendes umwandeln:

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; der tatsächliche Wert, den der restliche Code verwenden wird
    ;; Code zum Kombinieren von $x_low und $x_high in $x
    ..))
```

Legalisierung wird auf der Werkzeugseite durchgeführt, bevor sie die VM erreicht, die sie ausführt. Beispielsweise enthält die [Binaryen](https://github.com/WebAssembly/binaryen)-Toolchain-Bibliothek einen Pass namens [LegalizeJSInterface](https://github.com/WebAssembly/binaryen/blob/fd7e53fe0ae99bd27179cb35d537e4ce5ec1fe11/src/passes/LegalizeJSInterface.cpp), der diese Transformation durchführt, und wird in [Emscripten](https://emscripten.org/) automatisch ausgeführt, wenn es erforderlich ist.

## Nachteile der Legalisierung

Die Legalisierung funktioniert für viele Dinge gut genug, hat aber Nachteile, wie den zusätzlichen Arbeitsaufwand zum Kombinieren oder Aufteilen von 32-Bit-Teilen in 64-Bit-Werte. Es ist selten, dass dies in einem entscheidenden Pfad geschieht, aber wenn es der Fall ist, kann die Verlangsamung bemerkbar sein - wir werden später einige Zahlen sehen.

Ein weiterer Nachteil ist, dass die Legalisierung für Benutzer sichtbar ist, da sie die Schnittstelle zwischen JavaScript und Wasm verändert. Hier ist ein Beispiel:

```c
// beispiel.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// beispiel.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JS empfangen: 0x" + value.toString(16));
  }
});
```

Dies ist ein kleines C-Programm, das eine Funktion einer [JavaScript-Bibliothek](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-c-in-javascript) aufruft (das heißt, wir definieren eine externe C-Funktion in C und implementieren sie in JavaScript als einfachen und direkten Weg, zwischen Wasm und JavaScript zu kommunizieren). Alles, was dieses Programm tut, ist, ein `i64` an JavaScript zu senden, wo wir versuchen, es auszugeben.

Wir können das mit

```
emcc beispiel.c --js-library beispiel.js -o out.js
```

Wenn wir es ausführen, erhalten wir nicht das erwartete Ergebnis:

```
node out.js
JS empfangen: 0x12345678
```

Wir haben `0xABCD12345678` gesendet, aber nur `0x12345678` erhalten 😔. Was hier passiert, ist, dass die Legalisierung dieses `i64` in zwei `i32`s aufgeteilt hat, und der Code hat nur die niedrigen 32 Bits erhalten und einen weiteren übergebenen Parameter ignoriert. Um die Dinge richtig zu behandeln, müssten wir etwa Folgendes tun:

```javascript
  // Das i64 wird in zwei 32-Bit-Parameter „low“ und „high“ aufgeteilt.
  send_i64_to_js: function(low, high) {
    console.log("JS empfangen: 0x" + high.toString(16) + low.toString(16));
  }
```

Wenn wir das nun ausführen, erhalten wir

```
JS empfangen: 0xabcd12345678
```

Wie Sie sehen können, ist es möglich, mit der Legalisierung zu leben. Aber es kann ziemlich nervig sein!

## Die Lösung: JavaScript-BigInts

JavaScript hat jetzt [BigInt](/features/bigint)-Werte, die Ganzzahlen beliebiger Größe darstellen können, sodass sie 64-Bit-Ganzzahlen korrekt darstellen können. Es ist naheliegend, diese zu verwenden, um `i64`s aus Wasm darzustellen. Genau das macht die JS-BigInt-Integrationsfunktion!

Emscripten unterstützt die Wasm-BigInt-Integration, die wir verwenden können, um das ursprüngliche Beispiel (ohne Hacks zur Legalisierung) einfach durch Hinzufügen von `-s WASM_BIGINT` zu kompilieren:

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

Anschließend können wir es ausführen (beachten Sie, dass wir Node.js derzeit ein Flag übergeben müssen, um die BigInt-Integration zu aktivieren):

```
node --experimental-wasm-bigint a.out.js
JS erhielt: 0xabcd12345678
```

Perfekt, genau das, was wir wollten!

Und nicht nur ist dies einfacher, sondern auch schneller. Wie bereits erwähnt, ist es in der Praxis selten, dass `i64`-Konvertierungen auf einem heißen Pfad stattfinden, aber wenn dies der Fall ist, kann die Verlangsamung spürbar sein. Wenn wir das obige Beispiel in einen Benchmark umwandeln und viele Aufrufe von `send_i64_to_js` ausführen, ist die BigInt-Version 18 % schneller.

Ein weiterer Vorteil der BigInt-Integration besteht darin, dass die Toolchain die Legalisierung vermeiden kann. Wenn Emscripten nicht legalisieren muss, hat es möglicherweise keine Arbeit am Wasm, das LLVM ausgibt, was die Build-Zeiten beschleunigt. Sie können diese Geschwindigkeitssteigerung erzielen, wenn Sie mit `-s WASM_BIGINT` bauen und keine anderen Flags bereitstellen, die Änderungen erfordern. Zum Beispiel funktioniert `-O0 -s WASM_BIGINT` (aber optimierte Builds [führen den Binaryen-Optimizer aus](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times), der für die Größe wichtig ist).

## Fazit

Die WebAssembly-BigInt-Integration wurde in [mehreren Browsern](https://webassembly.org/roadmap/) implementiert, darunter Chrome 85 (veröffentlicht am 25.08.2020), sodass Sie es heute ausprobieren können!
