---
title: "Schnelle, parallele Anwendungen mit WebAssembly SIMD"
author: "Deepti Gandluri ([@dptig](https://twitter.com/dptig)), Thomas Lively ([@tlively52](https://twitter.com/tlively52)), Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
date: 2020-01-30
updated: 2022-11-06
tags:
  - WebAssembly
description: "Vektoroperationen in WebAssembly bringen"
tweet: "1222944308183085058"
---
SIMD steht für _Single Instruction, Multiple Data_. SIMD-Anweisungen sind eine spezielle Klasse von Anweisungen, die Datenparallelität in Anwendungen ausnutzen, indem sie gleichzeitig dieselbe Operation auf mehreren Datenelementen ausführen. Rechenintensive Anwendungen wie Audio-/Video-Codecs, Bildverarbeitungsprogramme sind Beispiele für Anwendungen, die SIMD-Anweisungen nutzen, um die Leistung zu verbessern. Die meisten modernen Architekturen unterstützen einige Varianten von SIMD-Anweisungen.

<!--truncate-->
Der WebAssembly SIMD-Vorschlag definiert einen portablen, leistungsfähigen Unterbereich von SIMD-Operationen, die auf den meisten modernen Architekturen verfügbar sind. Dieser Vorschlag hat viele Elemente aus dem [SIMD.js Vorschlag](https://github.com/tc39/ecmascript_simd) übernommen, der ursprünglich aus der [Dart SIMD](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages) Spezifikation abgeleitet wurde. Der SIMD.js-Vorschlag war eine API, die bei TC39 mit neuen Typen und Funktionen für SIMD-Berechnungen vorgeschlagen wurde, jedoch wurde dieser zugunsten einer transparenteren Unterstützung von SIMD-Operationen in WebAssembly archiviert. Der [WebAssembly SIMD Vorschlag](https://github.com/WebAssembly/simd) wurde eingeführt, um Browsern zu ermöglichen, die Datenebenenparallelität mithilfe der zugrunde liegenden Hardware zu nutzen.

## WebAssembly SIMD Vorschlag

Das übergeordnete Ziel des WebAssembly SIMD Vorschlags ist es, Vektoroperationen zur WebAssembly-Spezifikation hinzuzufügen, in einer Weise, die portable Leistung garantiert.

Die Menge der SIMD-Anweisungen ist groß und unterscheidet sich je nach Architektur. Die im WebAssembly SIMD Vorschlag enthaltenen Operationen bestehen aus Operationen, die auf einer Vielzahl von Plattformen gut unterstützt werden und sich als leistungsfähig erwiesen haben. Zu diesem Zweck beschränkt sich der aktuelle Vorschlag auf die Standardisierung von Fixed-Width 128-Bit SIMD-Operationen.

Der aktuelle Vorschlag führt einen neuen `v128` Werttyp hinzu und eine Reihe neuer Operationen, die auf diesem Typ arbeiten. Die Kriterien zur Bestimmung dieser Operationen sind:

- Die Operationen sollten auf mehreren modernen Architekturen gut unterstützt sein.
- Leistungsgewinne sollten in mehreren relevanten Architekturen innerhalb einer Anweisungsgruppe positiv sein.
- Das gewählte Satz von Operationen sollte Leistungseinbrüche, falls vorhanden, minimieren.

Der Vorschlag befindet sich nun im [abgeschlossenen Zustand (Phase 4)](https://github.com/WebAssembly/simd/issues/480), sowohl V8 als auch die Toolchain verfügen über funktionale Implementierungen.

## Aktivieren der SIMD-Unterstützung

### Feature-Erkennung

Zunächst einmal, beachten Sie dass SIMD eine neue Funktion ist und nicht in allen Browsern mit WebAssembly-Unterstützung verfügbar ist. Sie können auf der Website [webassembly.org](https://webassembly.org/roadmap/) herausfinden, welche Browser neue WebAssembly-Funktionen unterstützen.

Um sicherzustellen, dass alle Benutzer Ihre Anwendung laden können, müssen Sie zwei verschiedene Versionen - eine mit SIMD aktiviert und eine ohne - erstellen und die entsprechende Version abhängig von den Ergebnissen der Feature-Erkennung laden. Um SIMD zur Laufzeit zu erkennen, können Sie die [`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect) Bibliothek verwenden und das entsprechende Modul wie folgt laden:

```js
import { simd } from 'wasm-feature-detect';

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import('./module-with-simd.js')
      : import('./module-without-simd.js')
  );
  // …jetzt verwende `module` wie gewohnt
})();
```

Um zu erfahren, wie man Code mit SIMD-Unterstützung erstellt, schauen Sie sich den Abschnitt [unten](#building-with-simd-support) an.

### SIMD-Unterstützung in Browsern

WebAssembly SIMD-Unterstützung ist standardmäßig ab Chrome 91 verfügbar. Stellen Sie sicher, dass Sie die neueste Version der Toolchain wie unten beschrieben nutzen, sowie die neueste wasm-feature-detect, um Engines zu erkennen, die die endgültige Version der Spezifikation unterstützen. Wenn etwas nicht richtig aussieht, bitte [melden Sie einen Fehler](https://crbug.com/v8).

WebAssembly SIMD wird auch in Firefox 89 und höher unterstützt.

## Erstellen mit SIMD-Unterstützung

### Erstellen von C / C++ zum Ziel SIMD

Die SIMD-Unterstützung von WebAssembly hängt von der Verwendung eines aktuellen Builds von clang mit aktiviertem WebAssembly LLVM-Backend ab. Emscripten unterstützt ebenfalls den WebAssembly SIMD Vorschlag. Installieren und aktivieren Sie die `neueste` Verteilung von emscripten mit [emsdk](https://emscripten.org/docs/getting_started/downloads.html), um die SIMD-Funktionen zu nutzen.

```bash
./emsdk install latest
./emsdk activate latest
```

Es gibt mehrere Möglichkeiten, SIMD-Code zu aktivieren, wenn Sie Ihre Anwendung so portieren, dass sie SIMD verwendet. Nachdem die neueste Upstream-Version von Emscripten installiert wurde, kompilieren Sie mit Emscripten und übergeben Sie das `-msimd128`-Flag, um SIMD zu aktivieren.

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

Anwendungen, die bereits auf WebAssembly portiert wurden, können dank der Autovektorisierungs-Optimierungen von LLVM von SIMD profitieren, ohne den Quellcode ändern zu müssen.

Diese Optimierungen können Schleifen, die bei jeder Iteration arithmetische Operationen durchführen, automatisch in äquivalente Schleifen transformieren, die dieselben arithmetischen Operationen mit mehreren Eingaben gleichzeitig unter Verwendung von SIMD-Befehlen ausführen. Die Autovektorisierer von LLVM sind standardmäßig auf den Optimierungsstufen `-O2` und `-O3` aktiviert, wenn das `-msimd128`-Flag angegeben wird.

Betrachten Sie beispielsweise die folgende Funktion, die die Elemente zweier Eingabe-Arrays miteinander multipliziert und die Ergebnisse in einem Ausgabe-Array speichert.

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

Ohne das `-msimd128`-Flag gibt der Compiler diese WebAssembly-Schleife aus:

```wasm
(loop
  (i32.store
    … Adresse in `out` abrufen …
    (i32.mul
      (i32.load … Adresse in `in_a` abrufen …)
      (i32.load … Adresse in `in_b` abrufen …)
  …
)
```

Wird jedoch das `-msimd128`-Flag verwendet, wandelt der Autovektorisierer dies in Code um, der die folgende Schleife enthält:

```wasm
(loop
  (v128.store align=4
    … Adresse in `out` abrufen …
    (i32x4.mul
       (v128.load align=4 … Adresse in `in_a` abrufen …)
       (v128.load align=4 … Adresse in `in_b` abrufen …)
    …
  )
)
```

Die Schleifenkörperstruktur bleibt gleich, jedoch werden SIMD-Befehle verwendet, um vier Elemente gleichzeitig innerhalb des Schleifenkörpers zu laden, zu multiplizieren und zu speichern.

Für eine feinere Steuerung der vom Compiler generierten SIMD-Befehle können Sie die [Kopfzeile `wasm_simd128.h`](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h) einbeziehen, die eine Reihe von Intrinsics definiert. Intrinsics sind spezielle Funktionen, die vom Compiler in die entsprechenden WebAssembly-SIMD-Befehle umgewandelt werden, sofern keine weiteren Optimierungen durchgeführt werden können.

Hier ist ein Beispiel für denselben vorherigen Code, der manuell neu geschrieben wurde, um die SIMD-Intrinsics zu verwenden.

```cpp
#include <wasm_simd128.h>

void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i += 4) {
    v128_t a = wasm_v128_load(&in_a[i]);
    v128_t b = wasm_v128_load(&in_b[i]);
    v128_t prod = wasm_i32x4_mul(a, b);
    wasm_v128_store(&out[i], prod);
  }
}
```

Dieser manuell umgeschriebene Code setzt voraus, dass die Eingabe- und Ausgabearrays ausgerichtet sind, sich nicht überschneiden und die Größe ein Vielfaches von vier ist. Der Autovektorisierer kann diese Annahmen nicht treffen und muss zusätzlichen Code generieren, um die Fälle zu behandeln, in denen diese Annahmen nicht zutreffen. Daher ist handgeschriebener SIMD-Code oft kleiner als autovektorisierter SIMD-Code.

### Bestehende C-/C++-Projekte plattformübergreifend kompilieren

Viele bestehende Projekte unterstützen bereits SIMD, wenn sie andere Plattformen anvisieren, insbesondere [SSE](https://de.wikipedia.org/wiki/Streaming_SIMD_Extensions)- und [AVX](https://de.wikipedia.org/wiki/Advanced_Vector_Extensions)-Instruktionen auf x86/x86-64-Plattformen sowie [NEON](https://de.wikipedia.org/wiki/ARM-Architektur#Advanced_SIMD_(Neon))-Instruktionen auf ARM-Plattformen. Es gibt zwei übliche Ansätze für deren Implementierung.

Der erste Ansatz verwendet Assembly-Dateien, die sich um SIMD-Operationen kümmern und während des Build-Prozesses zusammen mit C-/C++-Code verlinkt werden. Die Assembly-Syntax und -Instruktionen sind stark plattformspezifisch und nicht portabel. Um SIMD zu verwenden, müssen solche Projekte WebAssembly als zusätzlichen unterstützten Zieltyp hinzufügen und die entsprechenden Funktionen unter Verwendung von entweder [WebAssembly-Textformaten](https://webassembly.github.io/spec/core/text/index.html) oder den oben beschriebenen Intrinsics neu implementieren.

Ein anderer üblicher Ansatz besteht darin, SSE-/SSE2-/AVX-/NEON-Intrinsics direkt im C-/C++-Code zu verwenden. Hierbei kann Emscripten helfen. Emscripten [stellt kompatible Headerdateien und eine Emulationsebene bereit](https://emscripten.org/docs/porting/simd.html) für all diese Befehlssätze. Die Emulationsebene übersetzt sie entweder direkt in entsprechende Wasm-Intrinsics oder, falls nicht möglich, in skalaren Code.

Um solche Projekte plattformübergreifend zu kompilieren, aktivieren Sie zunächst SIMD über projektspezifische Konfigurationsflags, z. B. `./configure --enable-simd`, damit das `-msse`, `-msse2`, `-mavx` oder `-mfpu=neon` an den Compiler übergeben wird und die entsprechenden Intrinsics aufgerufen werden. Übergeben Sie anschließend zusätzlich `-msimd128`, um WebAssembly-SIMD zu aktivieren, entweder durch Verwendung von `CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …` oder durch direkte Änderung der Build-Konfiguration beim Anvisieren von Wasm.

### Rust kompilieren, um SIMD anzusteuern

Beim Kompilieren von Rust-Code für WebAssembly-SIMD müssen Sie dieselbe LLVM-Funktion `simd128` wie oben bei Emscripten aktivieren.

Wenn Sie die `rustc`-Flags direkt oder über die Umgebungsvariable `RUSTFLAGS` steuern können, übergeben Sie `-C target-feature=+simd128`:

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

oder

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

Wie in Clang / Emscripten sind die Autovektorisierer von LLVM standardmäßig für optimierten Code aktiviert, wenn das `simd128`-Feature aktiviert ist.

Zum Beispiel das Rust-Äquivalent des obigen Beispiels `multiply_arrays`

```rust
pub fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.iter()
    .zip(in_b)
    .zip(out)
    .for_each(|((a, b), dst)| {
        *dst = a * b;
    });
}
```

würde für den ausgerichteten Teil der Eingaben ähnlichen autovektorisierten Code erzeugen.

Um manuelle Kontrolle über die SIMD-Operationen zu haben, können Sie die Nightly-Toolchain verwenden, das Rust-Feature `wasm_simd` aktivieren und die Intrinsics direkt aus dem [`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd)-Namespace aufrufen:

```rust
#![feature(wasm_simd)]

use std::arch::wasm32::*;

pub unsafe fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.chunks(4)
    .zip(in_b.chunks(4))
    .zip(out.chunks_mut(4))
    .for_each(|((a, b), dst)| {
      let a = v128_load(a.as_ptr() as *const v128);
      let b = v128_load(b.as_ptr() as *const v128);
      let prod = i32x4_mul(a, b);
      v128_store(dst.as_mut_ptr() as *mut v128, prod);
    });
}
```

Alternativ können Sie ein Hilfs-Crate wie [`packed_simd`](https://crates.io/crates/packed_simd_2) verwenden, das über SIMD-Implementierungen auf verschiedenen Plattformen abstrahiert.

## Überzeugende Anwendungsfälle

Der WebAssembly-SIMD-Vorschlag zielt darauf ab, rechenintensive Anwendungen wie Audio-/Videocodecs, Bildverarbeitungsanwendungen, kryptografische Anwendungen usw. zu beschleunigen. Derzeit wird WebAssembly SIMD experimentell in weit verbreiteten Open-Source-Projekten wie [Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md), [OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html) und [XNNPACK](https://github.com/google/XNNPACK) unterstützt.

Einige interessante Demos stammen aus dem [MediaPipe-Projekt](https://github.com/google/mediapipe) des Google-Forschungsteams.

Laut ihrer Beschreibung ist MediaPipe ein Framework zum Erstellen multimodaler (z. B. Video, Audio, beliebige Zeitreihen-Daten) angewandter maschineller Lernpipelines. Es gibt auch eine [Webversion](https://developers.googleblog.com/2020/01/mediapipe-on-web.html)!

Eines der optisch ansprechendsten Demos, bei denen es einfach ist, den Performanceunterschied durch SIMD zu beobachten, ist ein reines CPU (nicht GPU) Build eines Handverfolgungssystems. [Ohne SIMD](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html) erreicht man auf einem modernen Laptop nur etwa 14-15 FPS (Bilder pro Sekunde), während man [mit SIMD, aktiviert in Chrome Canary](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html), eine viel flüssigere Erfahrung mit 38-40 FPS erhält.

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

Ein weiteres interessantes Set von Demos, das SIMD für eine flüssige Erfahrung nutzt, stammt von OpenCV - einer beliebten Computer-Vision-Bibliothek, die ebenfalls zu WebAssembly kompiliert werden kann. Sie sind verfügbar über [Link](https://bit.ly/opencv-camera-demos) oder Sie können sich die vorab aufgezeichneten Versionen unten ansehen:

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>Kartenerkennung</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>Unsichtbarkeitsumhang</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>Emoji-Ersatz</figcaption>
</figure>

## Zukünftige Arbeiten

Der aktuelle Fixed-Width-SIMD-Vorschlag befindet sich in [Phase 4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group), daher wird er als abgeschlossen betrachtet.

Einige Untersuchungen zu zukünftigen SIMD-Erweiterungen sind in den Vorschlägen [Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) und [Flexible Vectors](https://github.com/WebAssembly/flexible-vectors) begonnen worden, die sich zum Zeitpunkt des Schreibens in Phase 1 befinden.
