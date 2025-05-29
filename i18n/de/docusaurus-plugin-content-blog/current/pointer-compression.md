---
title: "Pointer-Komprimierung in V8"
author: "Igor Sheludko und Santiago Aboy Solanes, *die* Pointer-Komprimierer"
avatars:
  - "igor-sheludko"
  - "santiago-aboy-solanes"
date: 2020-03-30
tags:
  - internals
  - memory
description: "V8 hat seine Heap-Größe um bis zu 43 % reduziert! Erfahren Sie, wie dies in „Pointer-Komprimierung in V8“ gelingt!"
tweet: "1244653541379182596"
---
Es gibt einen ständigen Kampf zwischen Speicher und Leistung. Als Nutzer wünschen wir uns, dass Dinge sowohl schnell sind als auch möglichst wenig Speicher verbrauchen. Leider geht eine Leistungssteigerung gewöhnlich mit einem höheren Speicherverbrauch einher (und umgekehrt).

<!--truncate-->
Im Jahr 2014 wechselte Chrome von einem 32-Bit-Prozess zu einem 64-Bit-Prozess. Dies brachte Chrome bessere [Sicherheit, Stabilität und Leistung](https://blog.chromium.org/2014/08/64-bits-of-awesome-64-bit-windows_26.html), allerdings auf Kosten des Speicherverbrauchs, da jeder Pointer nun acht Bytes anstelle von vier belegt. Wir nahmen die Herausforderung an, diesen Overhead in V8 zu reduzieren, um so viele verschwendete 4 Bytes wie möglich zurückzugewinnen.

Bevor wir in die Implementierung eintauchen, müssen wir wissen, wo wir stehen, um die Situation korrekt einschätzen zu können. Um unseren Speicher- und Leistungsbedarf zu messen, verwenden wir eine Reihe von [Webseiten](https://v8.dev/blog/optimizing-v8-memory), die populäre reale Websites widerspiegeln. Die Daten zeigten, dass V8 bis zu 60 % des Speicherverbrauchs des [Renderer-Prozesses](https://www.chromium.org/developers/design-documents/multi-process-architecture) von Chrome auf Desktop-PCs ausmacht, mit einem Durchschnitt von 40 %.

![Speicherverbrauchsanteil von V8 im Renderer-Speicher von Chrome](/_img/pointer-compression/memory-chrome.svg)

Pointer-Komprimierung ist eine von mehreren laufenden Bemühungen in V8 zur Reduzierung des Speicherverbrauchs. Die Idee ist sehr einfach: Anstatt 64-Bit-Pointer zu speichern, können wir 32-Bit-Offsets von einer „Basis“-Adresse speichern. Wie viel können wir mit einer solch einfachen Idee in V8 durch Komprimierung gewinnen?

Der V8-Heap enthält eine Vielzahl von Elementen, wie Fließkommazahlen, Zeichenkettencharaktere, Interpreter-Bytecode und getaggte Werte (Details dazu im nächsten Abschnitt). Bei der Inspektion des Heap fanden wir heraus, dass diese getaggten Werte auf realen Websites etwa 70 % des V8-Heaps ausmachen!

Werfen wir einen genaueren Blick darauf, was getaggte Werte sind.

## Value-Tagging in V8

JavaScript-Werte in V8 werden als Objekte dargestellt und im V8-Heap zugewiesen, egal ob es sich um Objekte, Arrays, Zahlen oder Zeichenketten handelt. Dadurch können wir jeden Wert als Pointer zu einem Objekt darstellen.

Viele JavaScript-Programme führen Berechnungen mit Integer-Werten durch, wie das Inkrementieren eines Indexes in einer Schleife. Um zu vermeiden, jedes Mal ein neues Zahlenobjekt zuzuweisen, wenn ein Integer inkrementiert wird, verwendet V8 die bekannte [Pointer-Tagging](https://en.wikipedia.org/wiki/Tagged_pointer)-Technik, um zusätzliche oder alternative Daten in V8-Heap-Pointern zu speichern.

Die Tag-Bits haben eine doppelte Funktion: Sie signalisieren entweder starke/schwache Pointer zu Objekten im V8-Heap oder einen kleinen Integer. Daher kann der Wert eines Integers direkt in dem getaggten Wert gespeichert werden, ohne zusätzlichen Speicher dafür zuzuweisen.

V8 weist immer Objekte im Heap an wortausgerichteten Adressen zu, was ihm erlaubt, die 2 (oder 3, je nach Größe des Maschinenworts) am wenigsten signifikanten Bits zum Tagging zu verwenden. Auf 32-Bit-Architekturen verwendet V8 das am wenigsten signifikante Bit, um Smis von Heap-Objekt-Pointern zu unterscheiden. Für Heap-Pointer wird das zweitwenigste signifikante Bit verwendet, um starke Referenzen von schwachen zu unterscheiden:

<pre>
                        |----- 32 Bits -----|
Pointer:                |_____adresse_____<b>w1</b>|
Smi:                    |___int31_wert____<b>0</b>|
</pre>

wobei *w* ein Bit ist, das verwendet wird, um starke Pointer von schwachen zu unterscheiden.

Beachten Sie, dass ein Smi-Wert nur eine 31-Bit-Nutzlast tragen kann, einschließlich des Vorzeichens. Im Fall von Pointern haben wir 30 Bits, die als Heap-Objektadressen-Nutzlast verwendet werden können. Aufgrund der Wortausrichtung beträgt die Zuweisungsgranularität 4 Bytes, was uns 4 GB adressierbaren Speicher gibt.

Auf 64-Bit-Architekturen sehen V8-Werte so aus:

<pre>
            |----- 32 Bits -----|----- 32 Bits -----|
Pointer:    |________________adresse______________<b>w1</b>|
Smi:        |____int32_wert____|000000000000000000<b>0</b>|
</pre>

Sie werden feststellen, dass V8 anders als bei 32-Bit-Architekturen auf 64-Bit-Architekturen 32 Bits für die Smi-Wert-Nutzlast verwenden kann. Die Auswirkungen von 32-Bit-Smis auf die Pointer-Komprimierung werden in den folgenden Abschnitten diskutiert.

## Komprimierte getaggte Werte und neues Heap-Layout

Mit der Pointer-Komprimierung ist es unser Ziel, beide Arten von getaggten Werten irgendwie auf 32 Bits auf 64-Bit-Architekturen zu reduzieren. Wir können Pointer auf 32 Bits reduzieren, indem wir:

- sicherstellen, dass alle V8-Objekte innerhalb eines 4-GB-Speicherbereichs zugewiesen werden
- Pointer als Offsets innerhalb dieses Bereichs darstellen

Ein solches hartes Limit ist bedauerlich, aber V8 in Chrome hat bereits eine Grenze von 2 GB oder 4 GB für die Größe des V8-Heaps (je nachdem, wie leistungsstark das zugrunde liegende Gerät ist), selbst auf 64-Bit-Architekturen. Andere V8-Einbettungen wie Node.js könnten größere Heaps benötigen. Wenn wir ein Maximum von 4 GB auferlegen, würde dies bedeuten, dass diese Einbettungen keine Zeigerkomprimierung nutzen können.

Die Frage ist nun, wie man das Heap-Layout aktualisieren kann, um sicherzustellen, dass 32-Bit-Pointer V8-Objekte eindeutig identifizieren.

### Triviales Heap-Layout

Das triviale Komprimierungsschema wäre, Objekte in den ersten 4 GB des Adressraums zuzuweisen.

![Triviales Heap-Layout](/_img/pointer-compression/heap-layout-0.svg)

Leider ist dies keine Option für V8, da der Renderer-Prozess von Chrome möglicherweise mehrere V8-Instanzen im selben Renderer-Prozess erstellen muss, beispielsweise für Web-/Service-Worker. Andernfalls würden bei diesem Schema alle diese V8-Instanzen um denselben 4-GB-Adressraum konkurrieren, wodurch eine gemeinsame Speicherbegrenzung von 4 GB für alle V8-Instanzen eingeführt wird.

### Heap-Layout, Version 1

Wenn wir den Heap von V8 in einen zusammenhängenden 4-GB-Bereich des Adressraums irgendwo anders anordnen, kann ein **unsigned** 32-Bit-Offset von der Basis den Zeiger eindeutig identifizieren.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Heap-Layout, Basis am Anfang ausgerichtet</figcaption>
</figure>

Wenn wir auch sicherstellen, dass die Basis 4-GB-ausgerichtet ist, sind die oberen 32 Bits für alle Zeiger gleich:

```
            |----- 32 Bits -----|----- 32 Bits -----|
Zeiger:     |________Basis_______|______Offset_____w1|
```

Wir können auch Smis komprimierbar machen, indem wir die Smi-Nutzlast auf 31 Bits beschränken und sie in die unteren 32 Bits platzieren. Grundsätzlich machen wir sie ähnlich wie Smis auf 32-Bit-Architekturen.

```
         |----- 32 Bits -----|----- 32 Bits -----|
Smi:     |sssssssssssssssssss|____int31_wert___0|
```

wobei *s* der Vorzeichenwert der Smi-Nutzlast ist. Wenn wir eine vorzeichen-erweiterte Darstellung haben, können wir Smis mit nur einer einstelligen arithmetischen Verschiebung des 64-Bit-Wortes komprimieren und dekomprimieren.

Jetzt können wir sehen, dass das obere Halbwort sowohl von Zeigern als auch von Smis vollständig durch das untere Halbwort definiert ist. Dann können wir nur letzteres im Speicher speichern, wodurch der für das Speichern von markierten Werten erforderliche Speicher um die Hälfte reduziert wird:

```
                    |----- 32 Bits -----|----- 32 Bits -----|
Komp. Zeiger:                          |______Offset_____w1|
Komp. Smi:                             |____int31_wert___0|
```

Da die Basis 4-GB-ausgerichtet ist, erfolgt die Komprimierung einfach durch Trunkierung:

```cpp
uint64_t unkompr_markiert;
uint32_t kompr_markiert = uint32_t(unkompr_markiert);
```

Der Dekomprimierungscode ist jedoch etwas komplizierter. Wir müssen unterscheiden, ob der Smi erweitert oder der Zeiger null-erweitert wird, sowie ob der Basis hinzugefügt wird.

```cpp
uint32_t kompr_markiert;

uint64_t unkompr_markiert;
if (kompr_markiert & 1) {
  // Zeigerfall
  unkompr_markiert = Basis + uint64_t(kompr_markiert);
} else {
  // Smi-Fall
  unkompr_markiert = int64_t(kompr_markiert);
}
```

Versuchen wir, das Komprimierungsschema zu ändern, um den Dekomprimierungscode zu vereinfachen.

### Heap-Layout, Version 2

Wenn wir die Basis anstelle am Anfang der 4 GB in die _Mitte_ stellen, können wir den komprimierten Wert als einen **signed** 32-Bit-Offset von der Basis behandeln. Beachten Sie, dass die gesamte Reservierung nicht mehr 4-GB-ausgerichtet ist, jedoch die Basis ist.

![Heap-Layout, Basis in der Mitte ausgerichtet](/_img/pointer-compression/heap-layout-2.svg)

In diesem neuen Layout bleibt der Komprimierungscode derselbe.

Der Dekodierungscode wird jedoch freundlicher. Die Vorzeichen-Erweiterung ist jetzt für sowohl Smi- als auch Zeigerfälle allgemein und der einzige Zweig ist, ob die Basis im Zeigerfall hinzugefügt wird.

```cpp
int32_t kompr_markiert;

// Gemeinsamer Code für sowohl Zeiger- als auch Smi-Fälle
int64_t unkompr_markiert = int64_t(kompr_markiert);
if (unkompr_markiert & 1) {
  // Zeigerfall
  unkompr_markiert += Basis;
}
```

Die Leistung von Zweigen im Code hängt von der Branch-Prediction-Einheit der CPU ab. Wir dachten, dass bei einer branchlosen Dekodierung eine bessere Leistung erzielt werden könnte. Mit etwas Bitzauber können wir eine branchlose Version des obigen Codes schreiben:

```cpp
int32_t kompr_markiert;

// Gleicher Code für sowohl Zeiger- als auch Smi-Fälle
int64_t vorzeichen_erweitert = int64_t(kompr_markiert);
int64_t Auswahlmaske = -(vorzeichen_erweitert & 1);
// Maske ist 0 im Falle von Smi oder komplett 1 im Fall von Zeiger
int64_t unkompr_markiert =
    vorzeichen_erweitert + (Basis & Auswahlmaske);
```

Dann haben wir uns entschieden, mit der branchlosen Implementierung zu beginnen.

## Leistungsentwicklung

### Ursprüngliche Leistung

Wir haben die Leistung mit [Octane](https://v8.dev/blog/retiring-octane#the-genesis-of-octane) gemessen – einem Peak-Performance-Benchmark, den wir in der Vergangenheit verwendet haben. Obwohl wir uns nicht mehr darauf konzentrieren, Peak-Performance in unserer täglichen Arbeit zu verbessern, möchten wir keine Peak-Performance verschlechtern, insbesondere bei etwas so sensiblen wie _allen Zeigern_. Octane bleibt ein guter Benchmark für diese Aufgabe.

Dieser Graph zeigt das Octane-Ergebnis auf der x64-Architektur, während wir die Implementierung der Zeigerkomprimierung optimierten und verfeinerten. Im Diagramm gilt: Je höher, desto besser. Die rote Linie zeigt den bestehenden x64-Build mit vollständigen Zeigern, während die grüne Linie die komprimierte Zeigerversion darstellt.

![Erste Runde der Verbesserungen von Octane](/_img/pointer-compression/perf-octane-1.svg)

Mit der ersten funktionierenden Implementierung hatten wir eine Regression von etwa 35 %.

#### Schub (1), +7%

Zuerst überprüften wir unsere Hypothese „branchless ist schneller“, indem wir die zeigefreie Dekompression mit der zeigeabhängigen verglichen. Es stellte sich heraus, dass unsere Hypothese falsch war, und die zeigeabhängige Version war auf x64 um 7% schneller. Das war ein ziemlich signifikanter Unterschied!

Werfen wir einen Blick auf die x64-Assembly.

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Dekompression | Branchless              | Branchful                    |
|---------------|-------------------------|------------------------------|
| Code          | ```asm                  | ```asm                       \
|               | movsxlq r11,[…]         | movsxlq r11,[…]              \
|               | movl r10,r11            | testb r11,0x1                \
|               | andl r10,0x1            | jz done                      \
|               | negq r10                | addq r11,r13                 \
|               | andq r10,r13            | done:                        \
|               | addq r11,r10            |                              | \
|               | ```                     | ```                          |
| Zusammenfassung | 20 Bytes                | 13 Bytes                     |
| ^^            | 6 Anweisungen ausgeführt | 3 oder 4 Anweisungen ausgeführt |
| ^^            | keine Verzweigungen     | 1 Verzweigung                |
| ^^            | 1 zusätzliches Register |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

**r13** dient hier als dediziertes Register für den Basiswert. Beachten Sie, dass der zeigefreie Code sowohl größer ist als auch mehr Register benötigt.

Auf Arm64 beobachteten wir dasselbe - die zeigeabhängige Version war auf leistungsstarken CPUs eindeutig schneller (obwohl die Codegröße in beiden Fällen gleich war).

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Dekompression | Branchless              | Branchful                    |
|---------------|-------------------------|------------------------------|
| Code          | ```asm                  | ```asm                       \
|               | ldur w6, […]            | ldur w6, […]                 \
|               | sbfx x16, x6, #0, #1    | sxtw x6, w6                  \
|               | and x16, x16, x26       | tbz w6, #0, #done            \
|               | add x6, x16, w6, sxtw   | add x6, x26, x6              \
|               |                         | done:                        \
|               | ```                     | ```                          |
| Zusammenfassung | 16 Bytes                | 16 Bytes                     |
| ^^            | 4 Anweisungen ausgeführt | 3 oder 4 Anweisungen ausgeführt |
| ^^            | keine Verzweigungen     | 1 Verzweigung                |
| ^^            | 1 zusätzliches Register |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

Auf schwächeren Arm64-Geräten beobachteten wir nahezu keine Leistungsunterschiede in irgendeine Richtung.

Unser Fazit: Verzweigungsvoraussagen in modernen CPUs sind sehr gut, und die Codegröße (insbesondere die Länge des Ausführungspfades) beeinflusste die Leistung stärker.

#### Schub (2), +2%

[TurboFan](https://v8.dev/docs/turbofan) ist der Optimierungskompilator von V8, der auf einem Konzept namens „Sea of Nodes“ basiert. Kurz gesagt, jede Operation wird als Knoten in einem Graphen dargestellt (eine detailliertere Version finden Sie [in diesem Blogbeitrag](https://v8.dev/blog/turbofan-jit)). Diese Knoten haben verschiedene Abhängigkeiten, einschließlich Datenfluss und Kontrollfluss.

Zwei Operationen sind entscheidend für die Zeigerkomprimierung: Laden und Speichern, da sie den V8-Heap mit dem Rest der Pipeline verbinden. Wenn wir bei jedem Laden eines komprimierten Wertes aus dem Heap dekomprimieren und vor dem Speichern erneut komprimieren, könnte die Pipeline einfach weiterarbeiten wie im Vollzeigermodus. Daher haben wir neue explizite Wertoperationen im Knotengraphen hinzugefügt - Dekomprimieren und Komprimieren.

Es gibt Fälle, in denen die Dekomprimierung tatsächlich nicht erforderlich ist. Zum Beispiel, wenn ein komprimierter Wert nur von einer Quelle geladen und dann an einem neuen Ort gespeichert wird.

Um unnötige Operationen zu optimieren, haben wir in TurboFan eine neue Phase der „Dekomprimierungsbeseitigung“ implementiert. Dabei werden Dekomprimierungen eliminiert, die direkt auf Komprimierungen folgen. Da diese Knoten möglicherweise nicht direkt nebeneinander liegen, versucht der Algorithmus auch, Dekomprimierungen durch den Graphen zu propagieren, in der Hoffnung, eine Komprimierung weiter unten zu treffen und beide zu eliminieren. Dies brachte uns eine Verbesserung von 2% im Octane-Ergebnis.

#### Schub (3), +2%

Als wir uns den erzeugten Code ansahen, bemerkten wir, dass die Dekomprimierung eines gerade geladenen Wertes zu Code führte, der etwas zu ausführlich war:

```asm
movl rax, <mem>   // laden
movlsxlq rax, rax // Vorzeichen erweitern
```

Sobald wir dies korrigiert haben, um den aus dem Speicher geladenen Wert direkt zu erweitern:

```asm
movlsxlq rax, <mem>
```

haben wir noch einmal 2% Verbesserung erzielt.

#### Verbesserung (4), +11%

TurboFan-Optimierungsphasen funktionieren durch Musterabgleich auf dem Graphen: Sobald ein Teilgraph einem bestimmten Muster entspricht, wird er durch einen semantisch äquivalenten (aber besseren) Teilgraphen oder Befehl ersetzt.

Erfolgloses Suchen nach einem Treffer wird nicht als explizites Scheitern betrachtet. Das Vorhandensein von expliziten Dekomprimierungs-/Komprimierungsoperationen im Graphen führte dazu, dass zuvor erfolgreiche Musterabgleichversuche nicht mehr erfolgreich waren, was zu einem stillschweigenden Scheitern der Optimierungen führte.

Ein Beispiel einer „kaputten“ Optimierung war [Allokationsvorverzeitung](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf). Nachdem wir die Mustererkennung aktualisiert hatten, um die neuen Komprimierungs-/Dekomprimierungs-Knoten zu berücksichtigen, erzielten wir eine weitere Verbesserung von 11%.

### Weitere Verbesserungen

![Zweite Runde von Octane’s Verbesserungen](/_img/pointer-compression/perf-octane-2.svg)

#### Verbesserung (5), +0,5%

Bei der Implementierung der Dekomprimierungseliminierung in TurboFan haben wir viel gelernt. Der Ansatz mit expliziten Dekomprimierungs-/Komprimierungs-Knoten hatte folgende Eigenschaften:

Vorteile:

- Die Explizitheit solcher Operationen ermöglichte es uns, unnötige Dekomprimierungen zu optimieren, indem wir kanonische Musterabgleiche von Teilgraphen durchführten.

Aber während der Implementierung entdeckten wir Nachteile:

- Eine kombinatorische Explosion möglicher Umwandlungsoperationen aufgrund neuer interner Wertdarstellungen wurde unüberschaubar. Wir hatten jetzt komprimierte Zeiger, komprimierte Smi und komprimierte Alles (komprimierte Werte, die entweder Zeiger oder Smi sein konnten), zusätzlich zu den vorhandenen Darstellungssätzen (markierte Smi, markierte Zeiger, markierte Alles, word8, word16, word32, word64, float32, float64, simd128).
- Einige bestehende Optimierungen auf Basis von Graph-Musterabgleich lösten stillschweigend nicht aus, was hier und da zu Rückschritten führte. Obwohl wir einige davon fanden und korrigierten, nahm die Komplexität von TurboFan weiter zu.
- Der Register-Allokator war zunehmend unzufrieden über die Anzahl der Knoten im Graphen und erzeugte oft schlechten Code.
- Die größeren Knoten-Graphen verlangsamten die TurboFan-Optimierungsphasen und erhöhten den Speicherverbrauch während der Kompilierung.

Wir entschieden uns, einen Schritt zurückzugehen und eine einfachere Methode zur Unterstützung von Zeigerkomprimierung in TurboFan zu entwickeln. Der neue Ansatz besteht darin, die Darstellung „komprimierter Zeiger / Smi / Alles“ fallen zu lassen und alle expliziten Komprimierungs-/Dekomprimierungs-Knoten implizit innerhalb von Speicher- und Ladeoperationen zu machen, wobei davon ausgegangen wird, dass wir immer vor dem Laden dekomprimieren und vor dem Speichern komprimieren.

Wir haben auch eine neue Phase in TurboFan hinzugefügt, die die „Dekomprimierungseliminierung“ ersetzen sollte. Diese neue Phase erkannte, wann wir tatsächlich nicht komprimieren oder dekomprimieren müssen, und aktualisierte die Speicher- und Ladeoperationen entsprechend. Ein solcher Ansatz reduzierte die Komplexität der Unterstützung von Zeigerkomprimierung in TurboFan erheblich und verbesserte die Qualität des generierten Codes.

Die neue Implementierung war genauso effektiv wie die ursprüngliche Version und ergab eine weitere Verbesserung von 0,5%.

#### Verbesserung (6), +2,5%

Wir kamen der Leistungsparität immer näher, aber die Lücke war noch da. Wir mussten neue Ideen entwickeln. Eine davon war: Was wäre, wenn wir sicherstellen, dass jeder Code, der mit Smi-Werten arbeitet, niemals auf die oberen 32 Bits „schaut“?

Lassen Sie uns die Implementierung der Dekomprimierung in Erinnerung rufen:

```cpp
// Alte Dekomprimierungsimplementierung
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // Zeigerfall
  uncompressed_tagged += base;
}
```

Wenn die oberen 32 Bits eines Smi ignoriert werden, können wir sie als undefiniert annehmen. Dann können wir die Sonderbehandlung zwischen Zeiger- und Smi-Fällen vermeiden und die Basis beim Dekomprimieren bedingungslos hinzufügen, sogar für Smis! Wir nennen diesen Ansatz „Smi-Schädigung“.

```cpp
// Neue Dekomprimierungsimplementierung
int64_t uncompressed_tagged = base + int64_t(compressed_tagged);
```

Außerdem, da wir uns nicht mehr um die Vorzeichenerweiterung des Smi kümmern, ermöglicht uns diese Änderung, zum Heap-Layout v1 zurückzukehren. Dies ist dasjenige, bei dem die Basis auf den Beginn der 4GB-Reservierung zeigt.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Heap-Layout, Basis an den Anfang ausgerichtet</figcaption>
</figure>

Bezüglich des Dekomprimierungscodes ändert sich eine Vorzeichenerweiterungsoperation in eine Nullerweiterung, die genauso günstig ist. Allerdings vereinfacht dies Dinge auf der Laufzeitseite (C++), z.B. der Code zur Reservierung des Adressraumbereichs (siehe Abschnitt [Einige Implementierungsdetails](#some-implementation-details)).

Hier ist der Assemblecode zum Vergleich:

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Dekompression | Branchvoll                   | Smi-beschädigend             |
|---------------|------------------------------|------------------------------|
| Code          | ```asm                       | ```asm                       \
|               | movsxlq r11,[…]              | movl r11,[rax+0x13]          \
|               | testb r11,0x1                | addq r11,r13                 \
|               | jz done                      |                              | \
|               | addq r11,r13                 |                              | \
|               | done:                        |                              | \
|               | ```                          | ```                          |
| Zusammenfassung| 13 Bytes                     | 7 Bytes                      |
| ^^            | 3 oder 4 ausgeführte Anweisungen | 2 ausgeführte Anweisungen      |
| ^^            | 1 Abzweigung                 | keine Abzweigungen           |
<!-- markdownlint-enable no-space-in-code -->
:::

Also haben wir alle Smi-verwendenden Codestücke in V8 an das neue Komprimierungsschema angepasst, was uns eine weitere Verbesserung um 2,5 % brachte.

### Verbleibende Lücke

Die verbleibende Leistungslücke wird durch zwei Optimierungen für 64-Bit-Builds erklärt, die wir aufgrund grundlegender Inkompatibilität mit Pointer Compression deaktivieren mussten.

![Letzte Runde der Octane-Verbesserungen](/_img/pointer-compression/perf-octane-3.svg)

#### 32-Bit-Smi-Optimierung (7), -1%

Erinnern wir uns daran, wie Smis im vollständigen Zeiger-Modus auf 64-Bit-Architekturen aussehen.

```
        |----- 32 bits -----|----- 32 bits -----|
Smi:    |____int32_Wert____|0000000000000000000|
```

32-Bit-Smies bieten folgende Vorteile:

- sie können einen größeren Bereich von Ganzzahlen darstellen, ohne sie in Zahlenobjekte umzuwandeln; und
- eine solche Struktur ermöglicht einen direkten Zugriff auf den 32-Bit-Wert beim Lesen/Schreiben.

Diese Optimierung kann mit Pointer Compression nicht durchgeführt werden, da im 32-Bit-komprimierten Zeiger kein Platz vorhanden ist, da dort das Bit liegt, das Zeiger von Smis unterscheidet. Wenn wir 32-Bit-Smis in der vollständigen 64-Bit-Zeigerversion deaktivieren, sehen wir einen Leistungsrückgang von 1 % im Octane-Score.

#### Entpackung von Double-Feldern (8), -3%

Diese Optimierung versucht, Gleitkommawerte direkt in den Feldern des Objekts zu speichern, unter bestimmten Annahmen. Ziel ist es, die Anzahl der Zahlenobjektzuweisungen noch stärker zu reduzieren als es Smis allein tun.

Stellen wir uns folgenden JavaScript-Code vor:

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = new Point(3.1, 5.3);
```

Im Allgemeinen, wenn wir schauen, wie das Objekt p im Speicher aussieht, sehen wir so etwas wie:

![Objekt `p` im Speicher](/_img/pointer-compression/heap-point-1.svg)

Mehr über versteckte Klassen und Eigenschafts- und Element-Backing-Stores können Sie in [diesem Artikel](https://v8.dev/blog/fast-properties) lesen.

Auf 64-Bit-Architekturen sind Double-Werte genauso groß wie Zeiger. Wenn wir also annehmen, dass die Felder von Point immer Zahlenwerte enthalten, können wir sie direkt in den Objektfeldern speichern.

![](/_img/pointer-compression/heap-point-2.svg)

Wenn die Annahme für ein Feld bricht, sagen wir nach Ausführung dieser Zeile:

```js
const q = new Point(2, 'ab');
```

müssen Zahlenwerte für die y-Eigenschaft stattdessen verpackt gespeichert werden. Zusätzlich, wenn es spekulativ optimierten Code gibt, der irgendwo darauf basiert, darf er nicht mehr verwendet werden und muss entfernt werden (deoptimiert werden). Der Grund für eine solche „Feldtyp“-Verallgemeinerung ist es, die Anzahl der Formen von Objekten zu minimieren, die aus derselben Konstruktorfunktion erstellt werden, was wiederum für eine stabilere Leistung erforderlich ist.

![Objekte `p` und `q` im Speicher](/_img/pointer-compression/heap-point-3.svg)

Wenn angewendet, bietet die Entpackung von Double-Feldern folgende Vorteile:

- ermöglicht direkten Zugriff auf die Gleitpunktdaten durch den Objektzeiger, wodurch das zusätzliche Dereferenzieren über Zahlenobjekte vermieden wird; und
- erlaubt uns, kompakteren und schnelleren optimierten Code für enge Schleifen zu erzeugen, die zahlreiche Double-Feldzugriffe durchführen (zum Beispiel in Anwendungen zur Zahlenberechnung)

Mit aktivierter Pointer Compression passen die Double-Werte einfach nicht mehr in die komprimierten Felder. In der Zukunft könnten wir jedoch diese Optimierung an die Pointer Compression anpassen.

Beachten Sie, dass Code zur Zahlenberechnung, der eine hohe Durchsatzrate erfordert, auf eine optimierbare Weise umgeschrieben werden könnte, auch ohne diese Optimierung der Double-Feld-Entpackung (auf eine mit Pointer Compression kompatible Weise), indem Daten in Float64 TypedArrays gespeichert werden oder sogar [Wasm](https://webassembly.github.io/spec/core/) verwendet wird.

#### Weitere Verbesserungen (9), 1%

Schließlich führte eine Feinabstimmung der Optimierung zur Eliminierung der Dekomprimierung in TurboFan zu einer weiteren 1 % Leistungsverbesserung.

## Einige Implementierungsdetails

Um die Integration von Pointer Compression in bestehende Codebasen zu vereinfachen, haben wir entschieden, Werte bei jedem Ladevorgang zu dekomprimieren und sie bei jedem Speichervorgang zu komprimieren. Dadurch ändern wir lediglich das Speicherformat getaggter Werte, während das Ausführungsformat unverändert bleibt.

### Seite des nativen Codes

Um effizienten Code generieren zu können, wenn eine Dekompression erforderlich ist, muss der Basiswert immer verfügbar sein. Glücklicherweise hatte V8 bereits ein dediziertes Register, das immer auf eine „Root-Tabelle“ zeigt, die Referenzen auf JavaScript- und V8-interne Objekte enthält, die stets verfügbar sein müssen (zum Beispiel undefined, null, true, false und viele mehr). Dieses Register wird „Root-Register“ genannt und es wird zur Generierung kleineren und [teilbaren Builtin-Codes](https://v8.dev/blog/embedded-builtins) verwendet.

Also haben wir die Root-Tabelle in den heap-reservierten Bereich von V8 gelegt, wodurch das Root-Register für beide Zwecke nutzbar wurde – als Root-Pointer und als Basiswert für die Dekompression.

### C++ Seite

Der V8-Laufzeitcode greift über C++-Klassen, die eine praktische Ansicht auf die im Heap gespeicherten Daten bieten, auf Objekte im V8-Heap zu. Beachten Sie, dass V8-Objekte eher [POD](https://de.wikipedia.org/wiki/Plain_Old_Data)-ähnliche Strukturen als C++-Objekte sind. Die Hilfsklassen für die Ansicht enthalten nur ein uintptr_t-Feld mit einem entsprechenden getaggten Wert. Da die Ansichtsklassen wortgroß sind, können wir sie mit null Kosten per Wertübergabe herumreichen (vielen Dank an die modernen C++-Compiler).

Hier ist ein Pseudo-Beispiel einer Hilfsklasse:

```cpp
// Verborgene Klasse
class Map {
 public:
  …
  inline DescriptorArray instance_descriptors() const;
  …
  // Der tatsächliche getaggte Pointer-Wert, der im Map-Ansichtsobjekt gespeichert ist.
  const uintptr_t ptr_;
};

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uintptr_t da = *reinterpret_cast<uintptr_t*>(field_address);
  return DescriptorArray(da);
}
```

Um die Anzahl der Änderungen zu minimieren, die für einen ersten Lauf der Version mit Pointer-Komprimierung erforderlich sind, haben wir die Berechnung des für die Dekompression erforderlichen Basiswerts in die Getter integriert.

```cpp
inline uintptr_t GetBaseForPointerCompression(uintptr_t address) {
  // Adresse auf 4 GB abrunden
  const uintptr_t kBaseAlignment = 1 << 32;
  return address & -kBaseAlignment;
}

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  uintptr_t base = GetBaseForPointerCompression(ptr_);
  uintptr_t da = base + compressed_da;
  return DescriptorArray(da);
}
```

Performance-Messungen haben bestätigt, dass die Berechnung des Basiswertes bei jedem Ladevorgang die Leistung beeinträchtigt. Der Grund dafür ist, dass C++-Compiler nicht wissen, dass das Ergebnis des Aufrufs von GetBaseForPointerCompression() für jede Adresse aus dem V8-Heap gleich ist, und daher ist der Compiler nicht in der Lage, die Berechnung der Basiswerte zusammenzuführen. Angesichts der Tatsache, dass der Code aus mehreren Anweisungen und einer 64-Bit-Konstante besteht, führt dies zu einer erheblichen Codeaufblähung.

Um dieses Problem zu beheben, haben wir den V8-Instanz-Pointer als Basis für die Dekompression wiederverwendet (denken Sie an die V8-Instanzdaten im Heap-Layout). Dieser Pointer ist normalerweise in Laufzeitfunktionen verfügbar, sodass wir den Getter-Code durch die Anforderung eines V8-Instanz-Pointers vereinfachten und damit die Regressionen behoben haben:

```cpp
DescriptorArray Map::instance_descriptors(const Isolate* isolate) const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  // Es ist keine Rundung erforderlich, da der Isolate-Pointer bereits die Basis ist.
  uintptr_t base = reinterpret_cast<uintptr_t>(isolate);
  uintptr_t da = DecompressTagged(base, compressed_value);
  return DescriptorArray(da);
}
```

## Ergebnisse

Schauen wir uns die endgültigen Zahlen der Pointer-Komprimierung an! Für diese Ergebnisse verwenden wir dieselben Browsing-Tests, die wir zu Beginn dieses Blogposts eingeführt haben. Zur Erinnerung: Es handelt sich um Browsing-Benutzererlebnisse, die wir als repräsentativ für die Nutzung echter Websites empfanden.

Dabei haben wir beobachtet, dass die Pointer-Komprimierung die **V8-Heap-Größe um bis zu 43 %** reduziert! Dadurch wird der **Speicher des Chrome-Renderer-Prozesses auf Desktop um bis zu 20 %** reduziert.

![Speicherersparnis beim Browsen unter Windows 10](/_img/pointer-compression/v8-heap-memory.svg)

Es ist auch wichtig zu beachten, dass nicht jede Website dieselbe Menge verbessert. Zum Beispiel war der V8-Heap-Speicher auf Facebook früher größer als auf der New York Times, aber mit Pointer-Komprimierung ist tatsächlich das Gegenteil der Fall. Dieser Unterschied lässt sich dadurch erklären, dass einige Websites mehr getaggte Werte als andere haben.

Zusätzlich zu diesen Speicherverbesserungen haben wir auch Leistungsverbesserungen in der realen Welt gesehen. Auf echten Websites nutzen wir weniger CPU- und Garbage Collector-Zeit!

![Verbesserungen der CPU- und Garbage-Collector-Zeit](/_img/pointer-compression/performance-improvements.svg)

## Fazit

Der Weg bis hierher war alles andere als ein Spaziergang, aber es hat sich gelohnt. Nach [300+ Commits](https://github.com/v8/v8/search?o=desc&q=repo%3Av8%2Fv8+%22%5Bptr-compr%5D%22&s=committer-date&type=Commits) verwendet V8 mit Pointer-Komprimierung genauso viel Speicher, als würden wir eine 32-Bit-Anwendung ausführen, während die Leistung einer 64-Bit-Anwendung erhalten bleibt.

Wir freuen uns immer darauf, Dinge zu verbessern, und haben die folgenden verwandten Aufgaben in unserer Pipeline:

- Die Qualität des generierten Assemblierungscodes verbessern. Wir wissen, dass wir in einigen Fällen weniger Code generieren können, was die Leistung verbessern sollte.
- Leistungsregressionen beheben, einschließlich eines Mechanismus, der das erneute Entboxen von Double-Feldern auf eine pointer-komprimierungsfreundliche Weise ermöglicht.
- Die Idee unterstützen, größere Heaps im Bereich von 8 bis 16 GB zu ermöglichen.
