---
title: 'Emscripten und der LLVM WebAssembly-Backend'
author: 'Alon Zakai'
avatars:
  - 'alon-zakai'
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - Werkzeuge
description: 'Emscripten wechselt zum LLVM WebAssembly-Backend, was zu deutlich kürzeren Linkzeiten und vielen weiteren Vorteilen führt.'
tweet: '1145704863377981445'
---
WebAssembly wird normalerweise aus einer Quellsprache kompiliert, was bedeutet, dass Entwickler *Werkzeuge* benötigen, um es zu nutzen. Aus diesem Grund arbeitet das V8-Team an entsprechenden Open-Source-Projekten wie [LLVM](http://llvm.org/), [Emscripten](https://emscripten.org/), [Binaryen](https://github.com/WebAssembly/binaryen/) und [WABT](https://github.com/WebAssembly/wabt). Dieser Beitrag beschreibt einige der Arbeiten, die wir an Emscripten und LLVM durchgeführt haben, was es Emscripten bald ermöglichen wird, standardmäßig zum [LLVM WebAssembly-Backend](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly) zu wechseln — bitte testen Sie es und melden Sie eventuelle Probleme!

<!--truncate-->
Das LLVM WebAssembly-Backend ist seit einiger Zeit eine Option in Emscripten, da wir parallel an der Integration des Backends in Emscripten und in Zusammenarbeit mit anderen in der Open-Source-WebAssembly-Tools-Community daran gearbeitet haben. Es hat inzwischen einen Punkt erreicht, an dem das WebAssembly-Backend den alten “[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)”-Backend in den meisten Metriken übertrifft; daher möchten wir den Standard darauf umstellen. Diese Ankündigung erfolgt vor der Umstellung, um so viele Tests wie möglich im Vorfeld zu erhalten.

Dies ist ein wichtiges Upgrade aus mehreren spannenden Gründen:

- **Viel schnellere Verlinkung**: Das LLVM WebAssembly-Backend zusammen mit [`wasm-ld`](https://lld.llvm.org/WebAssembly.html) unterstützt die inkrementelle Kompilierung mit WebAssembly-Objektdateien vollständig. Fastcomp nutzte LLVM IR in Bitcodedateien, was bedeutete, dass zur Linkzeit der gesamte IR von LLVM kompiliert werden musste. Dies war der Hauptgrund für langsame Linkzeiten. Mit WebAssembly-Objektdateien hingegen enthalten `.o`-Dateien bereits kompiliertes WebAssembly (in einer relokalisierbaren Form, die verlinkt werden kann, ähnlich wie beim nativen Verlinken). Dadurch kann der Verlinkungsschritt viel, viel schneller erfolgen als mit Fastcomp — wir werden unten eine reale Messung mit einer 7-fachen Geschwindigkeitssteigerung sehen!
- **Schnellerer und kleinerer Code**: Wir haben intensiv am LLVM WebAssembly-Backend sowie am Binaryen-Optimizer gearbeitet, der von Emscripten danach ausgeführt wird. Das Ergebnis ist, dass der LLVM WebAssembly-Backend-Pfad Fastcomp in Bezug auf Geschwindigkeit und Größe in den meisten unserer verfolgten Benchmarks übertrifft.
- **Unterstützung für alle LLVM IR**: Fastcomp konnte den von `clang` erzeugten LLVM IR verarbeiten, scheiterte jedoch aufgrund seiner Architektur oft bei anderen Quellen, insbesondere bei der „Legalisierung“ des IR zu Typen, die Fastcomp verarbeiten konnte. Das LLVM WebAssembly-Backend hingegen verwendet die gemeinsame LLVM-Backend-Infrastruktur und kann daher alles verarbeiten.
- **Neue WebAssembly-Funktionen**: Fastcomp kompiliert zu asm.js, bevor es `asm2wasm` ausführt, was bedeutet, dass es schwierig ist, neue WebAssembly-Funktionen wie Tail Calls, Ausnahmen, SIMD und so weiter zu unterstützen. Das WebAssembly-Backend ist der natürliche Ort, um an diesen Funktionen zu arbeiten, und wir arbeiten tatsächlich an all den genannten Funktionen!
- **Schnellere allgemeine Updates aus dem Upstream**: In Bezug auf den letzten Punkt bedeutet die Verwendung des Upstream-WebAssembly-Backends, dass wir jederzeit die neueste LLVM-Version nutzen können, wodurch neue C++-Sprachfunktionen in `clang`, neue LLVM IR-Optimierungen usw. sofort verfügbar werden, sobald sie bereitgestellt werden.

## Testen

Um das WebAssembly-Backend zu testen, verwenden Sie einfach den [neuesten `emsdk`](https://github.com/emscripten-core/emsdk) und führen Sie aus:

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

„Upstream“ bezieht sich hier darauf, dass sich das LLVM WebAssembly-Backend im Upstream-LLVM befindet, im Gegensatz zu Fastcomp. Tatsächlich benötigen Sie nicht einmal den `emsdk`, wenn Sie selbst ein einfaches LLVM+`clang` bauen! (Um ein solches Build mit Emscripten zu verwenden, fügen Sie einfach den Pfad dazu in Ihrer `.emscripten`-Datei hinzu.)

Derzeit verwendet `emsdk [install|activate] latest` weiterhin Fastcomp. Es gibt auch „latest-fastcomp“, das dasselbe tut. Wenn wir den Standard-Backend umstellen, wird „latest“ dasselbe wie „latest-upstream“ tun, und zu diesem Zeitpunkt wird „latest-fastcomp“ der einzige Weg sein, Fastcomp zu erhalten. Fastcomp bleibt eine Option, solange es noch nützlich ist; siehe dazu weitere Anmerkungen am Ende.

## Geschichte

Dies wird das **dritte** Backend in Emscripten sein und die **zweite** Migration. Das erste Backend wurde in JavaScript geschrieben und verarbeitete LLVM IR in Textform. Dies war 2010 nützlich für Experimente, hatte jedoch offensichtliche Nachteile, einschließlich Änderungen im Textformat von LLVM und einer nicht so schnellen Kompilierungsgeschwindigkeit wie gewünscht. Im Jahr 2013 wurde ein neues Backend in einer Abspaltung von LLVM geschrieben, genannt 'fastcomp'. Es wurde entwickelt, um [asm.js](https://de.wikipedia.org/wiki/Asm.js) auszugeben, was das frühere JS-Backend zwar auch tat, aber nicht gut. Dadurch war es eine große Verbesserung in Codequalität und Kompilierzeiten.

Es war auch eine relativ geringfügige Änderung in Emscripten. Während Emscripten ein Compiler ist, waren das ursprüngliche Backend und fastcomp immer ein relativ kleiner Teil des Projekts – deutlich mehr Code wird in Systembibliotheken, Toolchain-Integration, Sprachbindungen und so weiter investiert. Obwohl der Wechsel des Compiler-Backends eine dramatische Änderung darstellt, betrifft er nur einen Teil des Gesamtprojekts.

## Benchmarks

### Codegröße

![Messungen der Codegröße (niedriger ist besser)](/_img/emscripten-llvm-wasm/size.svg)

(Alle Größen hier sind normalisiert zu fastcomp.) Wie Sie sehen können, sind die Größen des WebAssembly-Backends fast immer kleiner! Der Unterschied ist auf den kleineren Mikrobenchmarks auf der linken Seite (Namen in Kleinbuchstaben) deutlicher sichtbar, wo neue Verbesserungen in den Systembibliotheken mehr zählen. Aber es gibt auch eine Reduzierung der Codegröße bei den meisten der Makrobenchmarks auf der rechten Seite (Namen in GROSSBUCHSTABEN), die reale Codebasen darstellen. Der einzige Rückschritt bei den Makrobenchmarks betrifft LZMA, wo das neuere LLVM eine andere Inlining-Entscheidung trifft, die letztlich ungünstig ausfällt.

Insgesamt schrumpfen die Makrobenchmarks im Durchschnitt um **3,7%**. Nicht schlecht für ein Compiler-Upgrade! Wir sehen ähnliche Dinge bei realen Codebasen, die nicht im Testsatz enthalten sind, zum Beispiel bei [BananaBread](https://github.com/kripken/BananaBread/), ein Port der [Cube 2 Game Engine](http://cubeengine.com/) ins Web, das um über **6%** schrumpft, und [Doom 3 schrumpft um](http://www.continuation-labs.com/projects/d3wasm/) **15%**!

Diese Verbesserungen der Größe (und die Geschwindigkeitsverbesserungen, die wir gleich besprechen) sind aus mehreren Gründen möglich:

- LLVMs Backend-Codegenerierung ist intelligent und kann Dinge tun, die einfache Backends wie fastcomp nicht können, wie [GVN](https://en.wikipedia.org/wiki/Value_numbering).
- Neueres LLVM hat bessere IR-Optimierungen.
- Wir haben viel Arbeit in das Feintuning des Binaryen-Optimierers für die Ausgaben des WebAssembly-Backends gesteckt, wie zuvor erwähnt.

### Geschwindigkeit

![Geschwindigkeitsmessungen (niedriger ist besser)](/_img/emscripten-llvm-wasm/speed.svg)

(Messungen erfolgen über V8.) Unter den Mikrobenchmarks ist die Geschwindigkeit ein gemischtes Bild – was nicht überraschend ist, da die meisten von ihnen von einer einzigen Funktion oder einer einzigen Schleife dominiert werden. Jede Änderung am von Emscripten ausgestrahlten Code kann eine glückliche oder unglückliche Optimierungsentscheidung durch die VM zur Folge haben. Insgesamt bleiben etwa gleich viele Mikrobenchmarks konstant wie solche, die sich verbessern oder verschlechtern. Bei den realistischeren Makrobenchmarks ist LZMA erneut ein Ausreißer, wieder wegen der unglücklichen Inlining-Entscheidung, aber ansonsten verbessern sich alle Makrobenchmarks!

Die durchschnittliche Änderung bei den Makrobenchmarks ist eine Geschwindigkeitssteigerung von **3,2%**.

### Bauzeit

![Kompilier- und Linkzeitmessungen auf BananaBread (niedriger ist besser)](/_img/emscripten-llvm-wasm/build.svg)

Die Änderungszeiten beim Bauen werden je nach Projekt variieren, aber hier sind einige Beispielzahlen von BananaBread, das eine vollständige, aber kompakte Spiele-Engine mit 112 Dateien und 95.287 Codezeilen ist. Links sehen wir Bauzeiten für den Kompilierschritt, das heißt, das Kompilieren von Quelldateien zu Objektdateien, mit dem Standard-`-O3` des Projekts (alle Zeiten sind normalisiert zu fastcomp). Wie Sie sehen können, dauert der Kompilierschritt mit dem WebAssembly-Backend etwas länger, was Sinn macht, da wir in diesem Stadium mehr Arbeit leisten — anstatt einfach nur Quellcode in Bitcode, wie fastcomp es macht, kompilieren wir auch den Bitcode in WebAssembly.

Rechts sehen wir die Zahlen für den Link-Schritt (ebenfalls normalisiert zu fastcomp), das heißt, die endgültige ausführbare Datei wird hier mit `-O0` erzeugt, was für ein inkrementelles Build geeignet ist (für ein vollständig optimiertes Build würde man wahrscheinlich auch `-O3` verwenden, siehe unten). Es stellt sich heraus, dass der geringfügige Anstieg während des Kompilierschritts es wert ist, da das Linken **über 7× schneller** ist! Das ist der eigentliche Vorteil der inkrementellen Kompilierung: Der größte Teil des Link-Schritts ist nur ein schnelles Zusammenfügen von Objektdateien. Und wenn Sie nur eine Quelldatei ändern und neu bauen, dann benötigen Sie fast ausschließlich diesen schnellen Link-Schritt, sodass man diese Geschwindigkeitssteigerung die ganze Zeit während der realen Entwicklung sieht.

Wie oben erwähnt, variieren die Änderungen der Build-Zeit je nach Projekt. In einem kleineren Projekt als BananaBread könnte die Beschleunigung der Verlinkungszeit geringer sein, während sie in einem größeren Projekt größer sein könnte. Ein weiterer Faktor sind Optimierungen: Wie oben erwähnt, wurde der Test mit `-O0` verlinkt, aber für einen Release-Build möchten Sie wahrscheinlich `-O3` verwenden, und in diesem Fall ruft Emscripten den Binaryen-Optimierer für das finale WebAssembly auf, führt [meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/) aus und andere nützliche Maßnahmen zur Reduzierung von Codegröße und Geschwindigkeit. Dies kostet natürlich zusätzliche Zeit und lohnt sich für einen Release-Build — bei BananaBread schrumpft das WebAssembly von 2.65 MB auf 1.84 MB, eine Verbesserung von über **30%** — aber für einen schnellen inkrementellen Build können Sie dies mit `-O0` überspringen.

## Bekannte Probleme

Während das LLVM-WebAssembly-Backend generell sowohl bei der Codegröße als auch bei der Geschwindigkeit gewinnt, haben wir einige Ausnahmen gesehen:

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp) verschlechtert sich ohne [nicht-trappende Gleitkomma-zu-Integer-Konvertierungen](https://github.com/WebAssembly/nontrapping-float-to-int-conversions), eine neue WebAssembly-Funktion, die nicht im WebAssembly-MVP enthalten war. Das zugrunde liegende Problem ist, dass im MVP eine Gleitkomma-zu-Integer-Konvertierung aus dem Bereich gültiger Ganzzahlen herausfallen und eine Falle auslösen kann. Die Begründung war, dass dies im C sowieso undefiniertes Verhalten ist und einfach von VMs implementiert werden kann. Es stellte sich jedoch heraus, dass dies schlecht mit der Art und Weise übereinstimmt, wie LLVM Gleitkomma-zu-Integer-Konvertierungen kompiliert, mit dem Ergebnis, dass zusätzliche Schutzmaßnahmen notwendig sind, die die Codegröße und den Overhead erhöhen. Die neueren nicht-trappenden Operationen vermeiden dies, sind jedoch möglicherweise noch nicht in allen Browsern verfügbar. Sie können sie verwenden, indem Sie Quelldateien mit `-mnontrapping-fptoint` kompilieren.
- Das LLVM-WebAssembly-Backend ist nicht nur ein anderes Backend als Fastcomp, sondern verwendet auch eine viel neuere LLVM-Version. Eine neuere LLVM-Version kann andere Entscheidungen hinsichtlich Inlining treffen, die (wie alle Entscheidungen zum Inlining ohne profilgeleitete Optimierung) heuristisch gesteuert sind und somit sowohl hilfreich als auch schädlich sein können. Ein spezifisches Beispiel, das wir bereits erwähnt haben, ist im LZMA-Benchmark, bei dem die neuere LLVM-Version eine Funktion fünfmal inline setzt, was letztendlich nur schädlich ist. Wenn Sie dies in Ihren eigenen Projekten bemerken, können Sie bestimmte Quelldateien gezielt mit `-Os` kompilieren, um sich auf die Codegröße zu konzentrieren, `__attribute__((noinline))` verwenden usw.

Es kann weitere Probleme geben, von denen wir noch nichts wissen und die optimiert werden sollten – bitte teilen Sie uns mit, wenn Sie etwas finden!

## Weitere Änderungen

Es gibt eine kleine Anzahl von Emscripten-Funktionen, die an Fastcomp und/oder asm.js gebunden sind. Das bedeutet, dass sie nicht direkt mit dem WebAssembly-Backend funktionieren können, und wir haben an Alternativen gearbeitet.

### JavaScript-Ausgabe

Eine Option für eine nicht-WebAssembly-Ausgabe ist immer noch in einigen Fällen wichtig – obwohl alle großen Browser seit einiger Zeit WebAssembly-Unterstützung besitzen, gibt es immer noch eine lange Liste alter Geräte, alter Telefone usw., die keine WebAssembly-Unterstützung haben. Außerdem wird dieses Problem relevant bleiben, wenn neue Funktionen zu WebAssembly hinzugefügt werden. Das Kompilieren zu JS ist eine Möglichkeit, sicherzustellen, dass Sie jeden erreichen können, auch wenn der Build nicht so klein oder schnell wie WebAssembly ist. Mit Fastcomp haben wir einfach die asm.js-Ausgabe direkt genutzt, aber mit dem WebAssembly-Backend ist offensichtlich etwas anderes notwendig. Wir verwenden Binaryens [`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js) dafür, das, wie der Name schon sagt, WebAssembly in JS kompiliert.

Dies verdient wahrscheinlich einen vollständigen Blogbeitrag, aber kurz gesagt, eine wichtige Designentscheidung hier ist, dass es keinen Sinn mehr macht, asm.js zu unterstützen. asm.js kann viel schneller laufen als allgemeines JS, aber es stellt sich heraus, dass praktisch alle Browser, die asm.js-AOT-Optimierungen unterstützen, ohnehin auch WebAssembly unterstützen (tatsächlich optimiert Chrome asm.js, indem es es intern in WebAssembly umwandelt!). Wenn wir also über eine JS-Fallback-Option sprechen, brauchen wir asm.js nicht zu verwenden; tatsächlich ist es einfacher und ermöglicht es uns, mehr Funktionen in WebAssembly zu unterstützen, und führt auch zu deutlich kleinerem JS! Daher zielt `wasm2js` nicht auf asm.js ab.

Ein Nebeneffekt dieses Designs ist jedoch, dass, wenn Sie einen asm.js-Build von Fastcomp mit einem JS-Build mit dem WebAssembly-Backend vergleichen, asm.js möglicherweise viel schneller ist – wenn Sie in einem modernen Browser mit asm.js-AOT-Optimierungen testen. Das ist wahrscheinlich der Fall für Ihren eigenen Browser, aber nicht für die Browser, die die nicht-WebAssembly-Option tatsächlich benötigen würden! Für einen ordentlichen Vergleich sollten Sie einen Browser ohne asm.js-Optimierungen oder mit deaktivierten optimierungen verwenden. Wenn die `wasm2js`-Ausgabe immer noch langsamer ist, teilen Sie uns dies bitte mit!

`wasm2js` fehlt einige weniger genutzte Funktionen wie dynamisches Linking und Threads, aber die meisten Codes sollten bereits funktionieren, und es wurde gründlich getestet. Um die JS-Ausgabe zu testen, bauen Sie einfach mit `-s WASM=0`, um WebAssembly zu deaktivieren. `emcc` führt dann `wasm2js` für Sie aus, und wenn dies ein optimierter Build ist, führt es auch verschiedene nützliche Optimierungen aus.

### Andere Dinge, die Sie bemerken könnten

- Die Optionen [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify) und [Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter) funktionieren nur in Fastcomp. Ein Ersatz [wird](https://github.com/WebAssembly/binaryen/pull/2172) [entwickelt](https://github.com/WebAssembly/binaryen/pull/2173) [und](https://github.com/emscripten-core/emscripten/pull/8808) [bearbeitet](https://github.com/emscripten-core/emscripten/issues/8561). Wir erwarten, dass dies letztendlich eine Verbesserung gegenüber den vorherigen Optionen darstellt.
- Vorgefertigte Bibliotheken müssen neu erstellt werden: Wenn Sie eine `library.bc` haben, die mit fastcomp erstellt wurde, müssen Sie diese aus dem Quellcode mit neuerer Emscripten erneut erstellen. Dies war immer der Fall, wenn fastcomp LLVM auf eine neue Version aktualisierte, die das Bitcode-Format änderte. Die aktuelle Änderung (zu WebAssembly-Objektdateien anstelle von Bitcode) hat denselben Effekt.

## Fazit

Unser Hauptziel ist es derzeit, alle Fehler im Zusammenhang mit dieser Änderung zu beheben. Bitte testen Sie und melden Sie Probleme!

Sobald alles stabil ist, werden wir den Standard-Compiler-Backend auf das aktuelle WebAssembly-Backend umstellen. Fastcomp bleibt wie zuvor eine Option.

Wir möchten fastcomp schließlich komplett entfernen. Dies würde eine erhebliche Wartungsbelastung beseitigen, es uns ermöglichen, uns stärker auf neue Funktionen im WebAssembly-Backend zu konzentrieren, die allgemeinen Verbesserungen in Emscripten voranzutreiben und andere gute Dinge. Bitte teilen Sie uns mit, wie das Testen in Ihren Codebasen verläuft, damit wir beginnen können, einen Zeitplan für die Entfernung von fastcomp zu planen.

### Vielen Dank

Vielen Dank an alle, die an der Entwicklung des LLVM-WebAssembly-Backends, `wasm-ld`, Binaryen, Emscripten und den anderen in diesem Beitrag erwähnten Dingen beteiligt sind! Eine teilweise Liste dieser großartigen Personen umfasst: aardappel, aheejin, alexcrichton, dschuff, jfbastien, jgravelle, nwilson, sbc100, sunfish, tlively, yurydelendik.
