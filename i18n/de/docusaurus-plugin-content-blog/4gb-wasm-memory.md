---
title: "Bis zu 4 GB Speicher in WebAssembly"
author: "Andreas Haas, Jakob Kummerow und Alon Zakai"
avatars: 
  - "andreas-haas"
  - "jakob-kummerow"
  - "alon-zakai"
date: 2020-05-14
tags: 
  - WebAssembly
  - JavaScript
  - Werkzeuge
tweet: "1260944314441633793"
---

## Einführung

Dank der jüngsten Arbeit in Chrome und Emscripten können Sie jetzt bis zu 4 GB Speicher in WebAssembly-Anwendungen nutzen. Das ist eine Steigerung gegenüber dem vorherigen Limit von 2 GB. Es mag seltsam erscheinen, dass es jemals ein Limit gab – schließlich war keine Arbeit notwendig, damit Menschen 512 MB oder 1 GB Speicher nutzen konnten! – aber es stellt sich heraus, dass beim Sprung von 2 GB auf 4 GB sowohl im Browser als auch in der Werkzeugkette einige besondere Dinge geschehen, die wir in diesem Beitrag beschreiben werden.

<!--truncate-->
## 32 Bits

Einige Hintergrundinformationen, bevor wir auf die Details eingehen: Das neue 4-GB-Limit ist die größte Menge an Speicher, die mit 32-Bit-Zeigern möglich ist, was WebAssembly derzeit unterstützt und was als „wasm32“ in LLVM und anderen Bereichen bekannt ist. Es wird an „wasm64“ ([„memory64“](https://github.com/WebAssembly/memory64/blob/master/proposals/memory64/Overview.md) in der wasm-Spezifikation) gearbeitet, bei dem Zeiger 64-Bit haben können und wir über 16 Millionen Terabyte Speicher nutzen könnten (!), aber bis dahin sind 4 GB das Maximum, das wir möglicherweise zugreifen können.

Es scheint, als hätten wir immer in der Lage sein sollen, auf 4 GB zuzugreifen, da dies das ist, was 32-Bit-Zeiger ermöglichen. Warum waren wir dann auf die Hälfte, nur 2 GB, beschränkt? Es gibt mehrere Gründe dafür, sowohl auf der Browserseite als auch auf der Seite der Werkzeugkette. Beginnen wir mit dem Browser.

## Arbeit in Chrome/V8

Grundsätzlich klingen die Änderungen in V8 einfach: Man muss nur sicherstellen, dass der gesamte für WebAssembly-Funktionen generierte Code sowie der gesamte Speichermanagement-Code unsignierte 32-Bit-Ganzzahlen für Speicherindizes und -längen verwenden, und wir sollten fertig sein. In der Praxis steckt jedoch mehr dahinter! Da WebAssembly-Speicher in JavaScript als ArrayBuffer exportiert werden kann, mussten wir auch die Implementierung von JavaScript-ArrayBuffers, TypedArrays und allen Web-APIs, die ArrayBuffers und TypedArrays verwenden, wie Web Audio, WebGPU und WebUSB, ändern.

Das erste Problem, das wir lösen mussten, war, dass V8 [Smis](https://v8.dev/blog/pointer-compression#value-tagging-in-v8) (d. h. 31-Bit-Ganzzahlen) für TypedArray-Indizes und -Längen verwendet, sodass die maximale Größe tatsächlich 2<sup>30</sup>-1 oder etwa 1 GB betrug. Außerdem stellt sich heraus, dass das Umschalten auf 32-Bit-Ganzzahlen nicht ausreicht, da die Länge eines 4-GB-Speichers tatsächlich nicht in eine 32-Bit-Ganzzahl passt. Zur Veranschaulichung: In Dezimal gibt es 100 Zahlen mit zwei Ziffern (0 bis 99), aber „100“ selbst ist eine dreistellige Zahl. Analog dazu können 4 GB mit 32-Bit-Adressen adressiert werden, aber 4 GB selbst sind eine 33-Bit-Zahl. Wir hätten uns mit einem etwas niedrigeren Limit zufrieden geben können, aber da wir ohnehin den gesamten TypedArray-Code anpassen mussten, wollten wir ihn gleichzeitig auf noch größere zukünftige Limits vorbereiten. Daher haben wir den gesamten Code geändert, der mit TypedArray-Indizes oder -Längen arbeitet, um 64-Bit-Breiten Integer-Typen oder JavaScript-Zahlen zu verwenden, wo Schnittstellen mit JavaScript erforderlich sind. Ein zusätzlicher Vorteil ist, dass die Unterstützung noch größerer Speicher für wasm64 jetzt relativ einfach sein sollte!

Eine zweite Herausforderung bestand darin, mit der Sonderbehandlung von Array-Elementen in JavaScript im Vergleich zu regulären benannten Eigenschaften umzugehen, die sich in unserer Implementierung von Objekten widerspiegelt. (Dies ist ein technisches Problem in Bezug auf die JavaScript-Spezifikation, also machen Sie sich keine Sorgen, wenn Sie nicht alle Details verstehen.) Betrachten Sie dieses Beispiel:

```js
console.log(array[5_000_000_000]);
```

Wenn `array` ein einfaches JavaScript-Objekt oder Array ist, wird `array[5_000_000_000]` als stringbasierter Eigenschaften-Lookup behandelt. Die Laufzeit würde nach einer string-basierten Eigenschaft „5000000000“ suchen. Wenn eine solche Eigenschaft nicht gefunden werden kann, würde die Prototypkette hochgegangen, um diese Eigenschaft zu finden, oder schließlich `undefined` am Ende der Kette zurückgeben. Wenn `array` selbst oder ein Objekt in seiner Prototypkette jedoch ein TypedArray ist, muss die Laufzeit nach einem indizierten Element an Index 5.000.000.000 suchen oder sofort `undefined` zurückgeben, wenn dieser Index außerhalb des Bereichs liegt.

Mit anderen Worten, die Regeln für TypedArrays unterscheiden sich erheblich von normalen Arrays, und der Unterschied äußert sich größtenteils bei riesigen Indizes. Solange wir nur kleinere TypedArrays erlaubten, konnte unsere Implementierung relativ einfach sein; insbesondere war es ausreichend, den Eigenschaftsschlüssel nur einmal zu betrachten, um zu entscheiden, ob der „indizierte“ oder der „benannte“ Lookup-Pfad eingeschlagen werden soll. Um größere TypedArrays zu ermöglichen, müssen wir diese Unterscheidung jetzt wiederholt treffen, während wir die Prototypkette hochgehen, was eine sorgfältige Zwischenspeicherung erfordert, um zu vermeiden, dass bestehender JavaScript-Code durch wiederholte Arbeiten und Overhead verlangsamt wird.

## Arbeit in der Werkzeugkette

Auf der Toolchain-Seite mussten wir ebenfalls Arbeit leisten, hauptsächlich am JavaScript-Unterstützungscode, nicht am in WebAssembly kompilierten Code. Das Hauptproblem war, dass Emscripten Speicherzugriffe immer in dieser Form geschrieben hat:

```js
HEAP32[(ptr + offset) >> 2]
```

Dies liest 32 Bits (4 Bytes) als vorzeichenbehaftete Ganzzahl von der Adresse `ptr + offset`. Wie das funktioniert: `HEAP32` ist ein Int32Array, was bedeutet, dass jeder Index im Array 4 Bytes hat. Daher müssen wir die Byte-Adresse (`ptr + offset`) durch 4 teilen, um den Index zu erhalten, was die Operation `>> 2` bewirkt.

Das Problem ist, dass `>>` eine *vorzeichenbehaftete* Operation ist! Wenn die Adresse die 2GB-Marke oder höher erreicht, wird der Eingabewert in eine negative Zahl überlaufen:

```js
// Knapp unter 2GB ist okay, dies gibt 536870911 aus
console.log((2 * 1024 * 1024 * 1024 - 4) >> 2);
// 2GB führt zu Überlauf, und wir erhalten -536870912 :(
console.log((2 * 1024 * 1024 * 1024) >> 2);
```

Die Lösung ist, einen *vorzeichenlosen* Shift, `>>>`, zu verwenden:

```js
// Dies gibt uns 536870912, wie wir es wollen!
console.log((2 * 1024 * 1024 * 1024) >>> 2);
```

Emscripten weiß zur Kompilierungszeit, ob Sie möglicherweise 2GB oder mehr Speicher verwenden (abhängig von den verwendeten Flags; Details folgen später). Wenn Ihre Flags Adressen von 2GB und mehr ermöglichen, schreibt der Compiler alle Speicherzugriffe automatisch so um, dass `>>>` statt `>>` verwendet wird. Das schließt nicht nur Zugriffe wie `HEAP32` usw. ein, wie in den obigen Beispielen, sondern auch Operationen wie `.subarray()` und `.copyWithin()`. Mit anderen Worten: Der Compiler schaltet auf die Verwendung vorzeichenloser Zeiger statt vorzeichenbehafteter um.

Diese Transformation erhöht die Codegröße ein wenig - um ein zusätzliches Zeichen bei jedem Shift - weshalb wir dies nicht durchführen, wenn Sie keine 2GB+-Adressen verwenden. Während der Unterschied typischerweise weniger als 1% beträgt, ist es einfach unnötig und leicht zu vermeiden - und viele kleine Optimierungen summieren sich!

Andere seltene Probleme können im JavaScript-Unterstützungscode auftreten. Während normale Speicherzugriffe automatisch wie zuvor beschrieben behandelt werden, führt das manuelle Vergleichen eines vorzeichenbehafteten Zeigers mit einem vorzeichenlosen (bei Adressen ab 2GB und höher) zu `false`. Um solche Probleme zu finden, haben wir den JavaScript-Code von Emscripten überprüft und die Testsuite in einem speziellen Modus ausgeführt, bei dem alles bei Adressen von 2GB oder höher platziert wird. (Beachten Sie, dass Sie, falls Sie eigenen JavaScript-Unterstützungscode schreiben, diese Probleme ebenfalls beheben müssen, wenn Sie manuelle Operationen mit Zeigern jenseits normaler Speicherzugriffe durchführen.)

## Ausprobieren

Um dies zu testen, [holen Sie sich die neueste Emscripten-Version](https://emscripten.org/docs/getting_started/downloads.html), oder mindestens Version 1.39.15. Kompilieren Sie dann mit Flags wie

```
emcc -s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB
```

Diese aktivieren das Speicherwachstum und ermöglichen es dem Programm, bis zu 4GB Speicher zuzuweisen. Beachten Sie, dass Sie standardmäßig nur bis zu 2GB zuweisen können - Sie müssen ausdrücklich die Verwendung von 2-4GB auswählen (was es uns ermöglicht, kompakteren Code auszugeben, indem `>>` statt `>>>` verwendet wird, wie oben erwähnt).

Testen Sie unbedingt auf Chrome M83 (derzeit in Beta) oder neuer. Bitte melden Sie Probleme, falls Sie etwas Unregelmäßiges feststellen!

## Fazit

Die Unterstützung von bis zu 4GB Speicher ist ein weiterer Schritt, das Web ebenso leistungsfähig wie native Plattformen zu machen, und ermöglicht 32-Bit-Programmen, genauso viel Speicher zu verwenden wie gewöhnlich. Dies allein ermöglicht nicht eine völlig neue Klasse von Anwendungen, aber es macht hochentwickelte Erlebnisse möglich, wie z. B. ein sehr großes Level in einem Spiel oder das Bearbeiten großer Inhalte in einem Grafikeditor.

Wie bereits erwähnt, ist auch die Unterstützung für 64-Bit-Speicher geplant, was den Zugriff auf mehr als 4GB ermöglichen wird. Allerdings hat wasm64 denselben Nachteil wie 64-Bit auf nativen Plattformen: Zeiger benötigen doppelt so viel Speicher. Deshalb ist die Unterstützung von 4GB in wasm32 so wichtig: Wir können doppelt so viel Speicher wie zuvor nutzen, während die Codegröße so kompakt bleibt, wie es bei wasm immer der Fall war!

Wie immer, testen Sie Ihren Code in mehreren Browsern und bedenken Sie auch: 2-4GB ist eine Menge Speicher! Wenn Sie so viel benötigen, sollten Sie ihn nutzen, aber nicht unnötig, da viele Benutzergeräte nicht über ausreichend freien Speicher verfügen werden. Wir empfehlen, mit einem anfänglichen Speicher zu starten, der so klein wie möglich ist, und bei Bedarf zu wachsen; und falls Sie Wachstum erlauben, gehen Sie auch mit einem `malloc()`-Fehler auf elegante Weise um.
