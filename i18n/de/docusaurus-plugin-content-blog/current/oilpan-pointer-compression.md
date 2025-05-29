---
title: "Zeiger-Komprimierung in Oilpan"
author: "Anton Bikineev und Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), gehende Disassembler"
avatars:
  - anton-bikineev
  - michael-lippautz
date: 2022-11-28
tags:
  - internals
  - speicher
  - cppgc
description: "Die Zeiger-Komprimierung in Oilpan ermöglicht die Komprimierung von C++-Zeigern und eine Reduzierung der Heap-Größe um bis zu 33%."
tweet: "1597274125780893697"
---

> Es ist absolut unsinnig, 64-Bit-Zeiger zu verwenden, wenn ich ein Programm kompiliere, das weniger als 4 Gigabyte RAM benötigt. Wenn solche Zeigerwerte in einer Struktur erscheinen, verschwenden sie nicht nur die Hälfte des Speichers, sondern verbrauchen effektiv die Hälfte des Caches.
>
> – [Donald Knuth (2008)](https://cs.stanford.edu/~knuth/news08.html)

<!--truncate-->

Wahre Worte wurden (fast) nie gesprochen. Wir sehen auch, dass CPU-Hersteller keine tatsächlichen [64-Bit-CPUs](https://en.wikipedia.org/wiki/64-bit_computing#Limits_of_processors) liefern und Android-OEMs [nur 39 Bit Adressraum auswählen](https://www.kernel.org/doc/Documentation/arm64/memory.txt), um das Durchlaufen der Seitentabellen im Kernel zu beschleunigen. V8, das in Chrome läuft, [isoliert Websites in separate Prozesse](https://www.chromium.org/Home/chromium-security/site-isolation/), was die Anforderungen an den tatsächlich benötigten Adressraum für einen einzelnen Tab weiter einschränkt. Nichts davon ist völlig neu, weshalb wir [Zeiger-Komprimierung für V8 im Jahr 2020 eingeführt haben](https://v8.dev/blog/pointer-compression) und großartige Verbesserungen im Speicherbereich im Web erfahren haben. Mit der [Oilpan-Bibliothek](https://v8.dev/blog/oilpan-library) haben wir einen weiteren Baustein des Webs unter Kontrolle. [Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/README.md) ist ein tracing-basierter Garbage Collector für C++, der unter anderem zum Hosten des Document Object Model in Blink verwendet wird und somit ein interessanter Zielpunkt zur Optimierung des Speichers darstellt.

## Hintergrund

Die Zeiger-Komprimierung ist ein Mechanismus zur Reduzierung der Größe von Zeigern auf 64-Bit-Plattformen. Zeiger in Oilpan sind in einem Smart Pointer namens [`Member`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/member.h) gekapselt. In einem unkomprimierten Heap-Layout verweisen `Member` direkt auf Heap-Objekte, d.h. es werden 8 Byte Speicher pro Referenz verwendet. In einem solchen Szenario kann der Heap über den gesamten Adressraum verteilt sein, da jeder Zeiger alle relevanten Informationen enthält, um auf ein Objekt zu verweisen.

![Unkomprimiertes Heap-Layout](/_img/oilpan-pointer-compression/uncompressed-layout.svg)

Mit einem komprimierten Heap-Layout sind `Member`-Referenzen nur Offsets innerhalb eines Heap-Cages, der eine zusammenhängende Speicherregion darstellt. Die Kombination aus einem Basiszeiger (base), der auf den Anfang des Heap-Cages zeigt, und einem `Member` bildet einen vollständigen Zeiger, sehr ähnlich dem [Segmentierten Adressierung](https://en.wikipedia.org/wiki/Memory_segmentation#Segmentation_without_paging). Die Größe eines Heap-Cages ist durch die verfügbaren Bits für das Offset begrenzt. Zum Beispiel erfordert ein 4-GB-Heap-Cage 32-Bit-Offsets.

![Komprimiertes Heap-Layout](/_img/oilpan-pointer-compression/compressed-layout.svg)

Praktischerweise sind Oilpan-Heaps bereits in einem solchen 4-GB-Heap-Cage auf 64-Bit-Plattformen enthalten, um Metadaten zur Speicherbereinigung zu referenzieren, indem jeder gültige Heap-Zeiger einfach an die nächste 4-GB-Grenze ausgerichtet wird.

Oilpan unterstützt auch mehrere Heaps im selben Prozess, um z.B. Web Worker mit eigenen C++-Heaps in Blink zu unterstützen. Das Problem, das sich aus diesem Setup ergibt, ist, wie Heaps möglicherweise vielen Heap-Cages zugeordnet werden können. Da Heaps in Blink an native Threads gebunden sind, besteht die Lösung darin, auf Heap-Cages über einen thread-lokalen Basiszeiger zu verweisen. Abhängig davon, wie V8 und seine Einbettungen kompiliert werden, kann das Modell für thread-lokalen Speicher (TLS) eingeschränkt werden, um zu beschleunigen, wie das Basis aus dem Speicher geladen wird. Letztendlich ist jedoch der generischste TLS-Modus erforderlich, um Android zu unterstützen, da auf dieser Plattform der Renderer (und damit V8) über `dlopen` geladen wird. Solche Einschränkungen machen die Verwendung von TLS aus Leistungsperspektive[^1] unpraktikabel. Um die beste Leistung zu bieten, weist Oilpan, ähnlich wie V8, alle Heaps einem einzigen Heap-Cage zu, wenn Zeiger-Komprimierung verwendet wird. Während dies den insgesamt verfügbaren Speicher einschränkt, denken wir, dass dies derzeit akzeptabel ist, da die Zeiger-Komprimierung bereits darauf abzielt, Speicher zu reduzieren. Sollte sich ein einzelnes 4-GB-Heap-Cage als zu einschränkend erweisen, erlaubt das aktuelle Komprimierungsschema, die Größe des Heap-Cages auf 16 GB zu erhöhen, ohne Leistungseinbußen hinnehmen zu müssen.

## Implementierung in Oilpan

### Anforderungen

Bisher haben wir über ein triviales Kodierungsschema gesprochen, bei dem der vollständige Zeiger durch Hinzufügen einer Basis zu einem Offset gebildet wird, der in einem Member-Zeiger gespeichert ist. Das tatsächlich implementierte Schema ist jedoch leider nicht so einfach, da Oilpan erfordert, dass ein Member einer der folgenden Werte zugewiesen werden kann:

1. Ein gültiger Heap-Zeiger auf ein Objekt;
2. Das C++-Schlüsselwort `nullptr` (oder ähnliches);
3. Ein Sentinelwert, der zur Kompilierungszeit bekannt sein muss. Der Sentinelwert kann z. B. verwendet werden, um gelöschte Werte in Hashtabellen zu signalisieren, die auch `nullptr` als Einträge unterstützen.

Das Problem bei `nullptr` und einem Sentinel liegt in der fehlenden expliziten Typisierung, um diese auf der Aufruferseite abzufangen:

```cpp
void* ptr = member.get();
if (ptr == nullptr) { /* ... */ }
```

Da es keinen expliziten Typ gibt, um möglicherweise komprimierte `nullptr`-Werte zu speichern, ist eine tatsächliche Dekomprimierung erforderlich, um den Vergleich mit der Konstante durchzuführen.

Mit dieser Nutzung im Hinterkopf suchten wir nach einem Schema, das die Fälle 1.-3. transparent behandelt. Da die Komprimierungs- und Dekomprimierungsfolge überall dort inline verwendet wird, wo ein Member verwendet wird, sind die folgenden Eigenschaften ebenfalls wünschenswert:

- Schnelle und kompakte Anweisungssequenz, um icache-Fehlzugriffe zu minimieren.
- Verzweigungslose Anweisungssequenz, um die Verwendung von Sprungvorhersagen zu vermeiden.

Da erwartet wird, dass Lesevorgänge die Schreibvorgänge deutlich übertreffen, erlauben wir ein asymmetrisches Schema, bei dem eine schnelle Dekomprimierung bevorzugt wird.

### Komprimierung und Dekomprimierung

Aus Platzgründen beschreibt diese Beschreibung nur das endgültig verwendete Komprimierungsschema. Weitere Informationen darüber, wie wir zu diesem Schema gekommen sind und welche Alternativen in Betracht gezogen wurden, finden Sie in unserem [Design-Dokument](https://docs.google.com/document/d/1neGN8Jq-1JLrWK3cvwRIfrSjLgE0Srjv-uq7Ze38Iao).

Die Hauptidee des heute umgesetzten Schemas besteht darin, reguläre Heap-Zeiger von `nullptr` und Sentinel zu trennen, indem die Ausrichtung des Heap-Cages genutzt wird. Im Wesentlichen wird der Heap-Cage so ausgerichtet zugeteilt, dass das niederwertigste Bit des oberen Halbworts immer gesetzt ist. Wir bezeichnen die obere und untere Hälfte (jeweils 32 Bits) als U<sub>31</sub>...U<sub>0</sub> und L<sub>31</sub>...L<sub>0</sub>.

::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | obere Hälfte                             | untere Hälfte                              |
| ------------ | ---------------------------------------: | -----------------------------------------: |
| Heap-Zeiger  | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt>                           | <tt>0...000</tt>                           |
| Sentinel     | <tt>0...0</tt>                           | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
::

Die Komprimierung erzeugt einen komprimierten Wert, indem sie einfach um eins nach rechts verschiebt und die obere Hälfte des Wertes abschneidet. Auf diese Weise signalisiert das Ausrichtungs-Bit (das jetzt das höchstwertige Bit des komprimierten Wertes wird) einen gültigen Heap-Zeiger.

::table-wrapper
| C++                                             | x64-Assembler  |
| :---------------------------------------------- | :------------- |
| ```cpp                                          | ```asm         \
| uint32_t Compress(void* ptr) \{                  | mov rax, rdi   \
|   return ((uintptr_t)ptr) >> 1;                 | shr rax        \
| \}                                               | ```            \
| ```                                             |                |
::

Das Kodierungsschema für komprimierte Werte lautet folglich wie folgt:

::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | komprimierter Wert                       |
| ------------ | ---------------------------------------: |
| Heap-Zeiger  | <tt>1L<sub>31</sub>...L<sub>2</sub>00</tt> |
| `nullptr`    | <tt>0...00</tt>                          |
| Sentinel     | <tt>0...01</tt>                          |
<!-- markdownlint-enable no-inline-html -->
::

Beachten Sie, dass dies erlaubt, zu erkennen, ob ein komprimierter Wert einen Heap-Zeiger, `nullptr` oder den Sentinelwert darstellt, was wichtig ist, um unnötige Dekomprimierungen im Benutzercode zu vermeiden (siehe unten).

Die Idee der Dekomprimierung basiert dann auf einem speziell angefertigten Basiszeiger, bei dem die niederwertigen 32 Bits auf 1 gesetzt sind.

::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | obere Hälfte                             | untere Hälfte    |
| ------------ | ---------------------------------------: | --------------: |
| Basis        | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>1...1</tt>   |
<!-- markdownlint-enable no-inline-html -->
::


Die Dekomprimierungsoperation signiert zunächst den komprimierten Wert und verschiebt ihn dann nach links, um die Komprimierungsoperation für das Vorzeichenbit rückgängig zu machen. Der resultierende Zwischenwert wird wie folgt kodiert:

::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | obere Hälfte     | untere Hälfte                             |
| ------------ | ---------------: | ---------------------------------------: |
| Heap-Zeiger  | <tt>1...1</tt>   | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt> | <tt>0...000</tt>                           |
| sentinel     | <tt>0...0</tt> | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

Schließlich ist der dekomprimierte Zeiger lediglich das Ergebnis einer bitweisen UND-Verknüpfung zwischen diesem Zwischenwert und dem Basiszeiger.

:::table-wrapper
| C++                                                    | x64-Assembly       |
| :----------------------------------------------------- | :----------------- |
| ```cpp                                                 | ```asm             \
| void* Decompress(uint32_t compressed) \{                | movsxd rax, edi    \
|   uintptr_t intermediate =                             | add rax, rax       \
|       (uintptr_t)((int32_t)compressed)  &lt;&lt;1;           | and rax, qword ptr \
|   return (void*)(intermediate & base);                 |     [rip + base]   \
| \}                                                      | ```                \
| ```                                                    |                    |
:::

Das resultierende Schema behandelt die Fälle 1.-3. transparent über ein asymmetrisches schema ohne Verzweigungen. Die Kompression verwendet 3 Bytes, ohne die initiale Registerbewegung zu zählen, da der Aufruf ohnehin eingebettet wird. Die Dekompression verwendet 13 Bytes, einschließlich der initialen signverlängernden Registerbewegung.

## Ausgewählte Details

Im vorherigen Abschnitt wurde das verwendete Kompressionsschema erklärt. Ein kompaktes Kompressionsschema ist notwendig, um hohe Leistung zu erzielen. Das oben beschriebene Kompressionsschema führte dennoch zu erkennbaren Rückgängen in Speedometer. Die folgenden Absätze erklären einige weitere Details, die erforderlich sind, um die Leistung von Oilpan auf ein akzeptables Niveau zu steigern.

### Optimierung des Käfigbasisladens

Technisch gesehen kann der globale Basiszeiger in C++-Begriffen keine Konstante sein, da er zur Laufzeit nach `main()` initialisiert wird, wann immer der Einbettende Oilpan initialisiert. Die Tatsache, dass diese globale Variable veränderbar wäre, würde die wichtige Konstanzpropagation-Optimierung behindern; z. B. könnte der Compiler nicht nachweisen, dass ein zufälliger Aufruf die Basis nicht verändert, und müsste sie zweimal laden:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
| C++                        | x64-Assembly                    |
| :------------------------- | :------------------------------ |
| ```cpp                     | ```asm                          \
| void foo(GCed*);           | baz(Member&lt;GCed>):              \
| void bar(GCed*);           |   movsxd rbx, edi               \
|                            |   add rbx, rbx                  \
| void baz(Member&lt;GCed> m) \{ |   mov rdi, qword ptr            \
|   foo(m.get());            |       [rip + base]              \
|   bar(m.get());            |   and rdi, rbx                  \
| }                          |   call foo(GCed*)               \
| ```                        |   and rbx, qword ptr            \
|                            |       [rip + base] # extra load \
|                            |   mov rdi, rbx                  \
|                            |   jmp bar(GCed*)                \
|                            | ```                             |
<!-- markdownlint-enable no-inline-html -->
:::

Mit einigen zusätzlichen Attributen haben wir clang dazu gebracht, die globale Basis als konstant zu behandeln und tatsächlich nur einen einzigen Ladevorgang innerhalb eines Kontextes durchzuführen.

### Vollständiges Vermeiden der Dekompression

Die schnellste Instruktionssequenz ist ein Nop! Mit diesem Gedanken können bei vielen Zeigeroperationen leicht redundante Kompressionen und Dekompressionen vermieden werden. Offensichtlich müssen wir ein Member nicht dekomprimieren, um zu überprüfen, ob es ein nullptr ist. Wir müssen nicht dekomprimieren und komprimieren, wenn wir ein Member aus einem anderen Member konstruieren oder zuweisen. Der Vergleich von Zeigern bleibt durch die Kompression erhalten, sodass wir Transformationen auch für sie vermeiden können. Die Member-Abstraktion dient uns hier als ein schöner Engpass.

Das Hashing kann mit komprimierten Zeigern beschleunigt werden. Die Dekompression zur Hash-Berechnung ist redundant, da die feste Basis die Hash-Entropie nicht erhöht. Stattdessen kann eine einfachere Hash-Funktion für 32-Bit-Ganzzahlen verwendet werden. Blink hat viele Hashtabellen, die Member als Schlüssel verwenden; das 32-Bit-Hashing führte zu schnelleren Sammlungen!

### Clang dabei helfen, wo es bei der Optimierung versagt

Beim Blick auf den generierten Code haben wir einen weiteren interessanten Punkt gefunden, an dem der Compiler nicht genügend Optimierungen durchgeführt hat:

:::table-wrapper
| C++                               | x64-Assembly               |
| :-------------------------------- | :------------------------- |
| ```cpp                            | ```asm                     \
| extern const uint64_t base;       | Assign(unsigned int):      \
| extern std::atomic_bool enabled;  |   mov dword ptr [rdi], esi \
|                                   |   mov rdi, qword ptr       \
| void Assign(uint32_t ptr) \{       |       [rip + base]         \
|   ptr_ = ptr                      |   mov al, byte ptr         \
|   WriteBarrier(Decompress(ptr));  |       [rip + enabled]      \
| }                                 |   test al, 1               \
|                                   |   jne .LBB4_2 # sehr selten  \
| void WriteBarrier(void* ptr) \{    |   ret                      \
|   if (LIKELY(                     | .LBB4_2:                   \
|       !enabled.load(relaxed)))    |   movsxd rax, esi          \
|     return;                       |   add rax, rax             \
|   SlowPath(ptr);                  |   and rdi, rax             \
| }                                 |   jmp SlowPath(void*)      \
| ```                               | ```                        |
:::

Der generierte Code führt den Baseload im heißen Basisblock aus, obwohl die Variable darin nicht verwendet wird und problemlos in den darunterliegenden Basisblock verschoben werden könnte, wo der Aufruf von `SlowPath()` erfolgt und der dekomprimierte Zeiger tatsächlich verwendet wird. Der Compiler hat konservativ entschieden, die nicht-atomare Ladung nicht mit der atomar-relaxierten Ladung neu zu ordnen, obwohl dies gemäß den Sprachregeln vollkommen legal wäre. Wir haben die Dekompression manuell unter die atomare Leseoperation verschoben, um die Zuweisung mit der Schreibschutzbarriere so effizient wie möglich zu machen.


### Verbesserung der Strukturpackung in Blink

Es ist schwierig, die Wirkung der Halbierung der Zeigergröße von Oilpan abzuschätzen. Im Wesentlichen sollte dies die Speicherausnutzung für „gepackte“ Datenstrukturen wie Behälter solcher Zeiger verbessern. Lokale Messungen zeigten eine Verbesserung von etwa 16% des Oilpan-Speichers. Untersuchungen zeigten jedoch, dass wir für einige Typen ihre tatsächliche Größe nicht reduziert, sondern nur das interne Padding zwischen Feldern erhöht haben.

Um solches Padding zu minimieren, haben wir ein Clang-Plugin geschrieben, das automatisch solche garbage-collected Klassen identifizierte, für die das Umordnen der Felder die Gesamtgröße der Klasse reduzieren würde. Da es viele solcher Fälle im Blink-Code gibt, haben wir die Umordnung auf die meistgenutzten angewendet, siehe das [Design-Dokument](https://docs.google.com/document/d/1bE5gZOCg7ipDUOCylsz4_shz1YMYG5-Ycm0911kBKFA).

### Gescheiterter Versuch: Begrenzung der Heap-Cage-Größe

Nicht jede Optimierung hat jedoch gut funktioniert. In dem Versuch, die Kompression weiter zu optimieren, haben wir den Heap-Cage auf 2GB begrenzt. Wir haben sichergestellt, dass das bedeutendste Bit der unteren Hälfte des Cage-Basiswerts 1 ist, was uns erlaubte, die Verschiebung vollständig zu vermeiden. Die Kompression würde zu einer einfachen Abschneidung, und die Dekompression würde zu einer einfachen Ladung und einer bitweisen UND-Operation werden.

Da der Oilpan-Speicher im Blink-Renderer durchschnittlich weniger als 10MB beansprucht, gingen wir davon aus, dass es sicher wäre, mit dem schnelleren Schema fortzufahren und die Cage-Größe einzuschränken. Leider erhielten wir nach der Einführung der Optimierung Speicherfehler bei einigen seltenen Arbeitslasten. Wir entschieden uns, diese Optimierung zurückzunehmen.

## Ergebnisse und Zukunft

Zeigerkompression in Oilpan wurde standardmäßig in **Chrome 106** aktiviert. Wir haben überall große Speicherverbesserungen festgestellt:


<!-- markdownlint-disable no-inline-html -->
| Blink-Speicher | P50                                                 | P99                                               |
| -----------:   | :-------------------------------------------------: | :-----------------------------------------------: |
| Windows        | **<span style={{color:'green'}}>-21% (-1.37MB)</span>** | **<span style={{color:'green'}}>-33% (-59MB)</span>** |
| Android        | **<span style={{color:'green'}}>-6% (-0.1MB)</span>**   | **<span style={{color:'green'}}>-8% (-3.9MB)</span>** |
<!-- markdownlint-enable no-inline-html -->


Die berichteten Zahlen repräsentieren das 50. und 99. Perzentil für den mit Oilpan allokierten Blink-Speicher in der gesamten Flotte[^2]. Die berichteten Daten zeigen die Veränderung zwischen den stabilen Versionen von Chrome 105 und 106. Die absoluten Werte in MB geben eine Indikation der unteren Grenze, die Nutzer erwarten können. Die echten Verbesserungen sind im Allgemeinen etwas höher aufgrund indirekter Effekte auf den gesamten Speicherverbrauch von Chrome. Die größere relative Verbesserung deutet darauf hin, dass das Packen von Daten in solchen Fällen besser ist, was ein Indikator dafür ist, dass mehr Speicher in Sammlungen (z. B. Vektoren) genutzt wird, die gutes Packen haben. Die verbesserte Strukturpackung wurde in Chrome 108 eingeführt und zeigte eine weitere durchschnittliche Verbesserung von 4% des Blink-Speichers.

Da Oilpan in Blink allgegenwärtig ist, können die Leistungskosten mit [Speedometer2](https://browserbench.org/Speedometer2.1/) geschätzt werden. Der [erste Prototyp](https://chromium-review.googlesource.com/c/v8/v8/+/2739979) basierte auf einer thread-lokalen Version und zeigte eine Rückverschlechterung von 15%. Mit all den oben genannten Optimierungen haben wir keine bemerkenswerte Rückverschlechterung festgestellt.

### Konservatives Stack-Scanning

Im Oilpan-Stack wird der Stapel konservativ gescannt, um Zeiger auf den Heap zu finden. Bei komprimierten Zeigern bedeutet dies, dass wir jedes Halbwort als potenziellen Zeiger behandeln müssen. Darüber hinaus kann der Compiler während der Kompression entscheiden, einen Zwischenwert in den Stapel zu überführen, was bedeutet, dass der Scanner alle möglichen Zwischenwerte berücksichtigen muss (in unserem Kompressionsschema ist der einzige mögliche Zwischenwert ein abgeschnittener, aber noch nicht verschobener Wert). Das Scannen von Zwischenwerten erhöhte die Anzahl der Fehlalarme (d.h. Halbworten, die wie komprimierte Zeiger aussehen), was die Speicherverbesserung um etwa 3% reduzierte (die geschätzte Speicherverbesserung würde ansonsten 24% betragen).

### Andere Kompression

Wir haben in der Vergangenheit große Verbesserungen durch die Anwendung von Kompression auf V8 JavaScript und Oilpan gesehen. Wir glauben, dass das Paradigma auf andere Smart-Pointer-Typen in Chrome (z. B. `base::scoped_refptr`) angewendet werden kann, die bereits auf andere Heap-Cages zeigen. Erste Experimente [zeigten](https://docs.google.com/document/d/1Rlr7FT3kulR8O-YadgiZkdmAgiSq0OaB8dOFNqf4cD8/edit) vielversprechende Ergebnisse.

Untersuchungen zeigten auch, dass ein großer Teil des Speichers tatsächlich über V-Tables gehalten wird. In diesem Sinne haben wir daher die relative-vtable-ABI [aktiviert](https://docs.google.com/document/d/1rt6IOEBevCkiVjiARUy8Ib1c5EAxDtW0wdFoTiijy1U/edit?usp=sharing) für Android64, was virtuelle Tabellen komprimiert, sodass wir mehr Speicher sparen und gleichzeitig den Start verbessern können.

[^1]: Interessierte Leser können in Blinks [`ThreadStorage::Current()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/heap/thread_state_storage.cc;drc=603337a74bf04efd536b251a7f2b4eb44fe153a9;l=19) nachsehen, um die Ergebnisse der Kompilierung von TLS-Zugriff mit verschiedenen Modi zu sehen.
[^2]: Die Zahlen werden über das Chrome User Metrics Analysis Framework erfasst.
