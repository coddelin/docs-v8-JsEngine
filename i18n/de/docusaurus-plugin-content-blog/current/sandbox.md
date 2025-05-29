---
title: &apos;Die V8 Sandbox&apos;
description: &apos;V8 bietet eine leichtgewichtige, prozessinterne Sandbox, um die Auswirkungen von Speicherbeschädigungsfehlern zu begrenzen&apos;
author: &apos;Samuel Groß&apos;
avatars:
  - samuel-gross
date: 2024-04-04
tags:
 - sicherheit
---

Nach fast drei Jahren seit dem [ersten Entwurfsdokument](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) und [hunderten von CLs](https://github.com/search?q=repo%3Av8%2Fv8+%5Bsandbox%5D&type=commits&s=committer-date&o=desc) in der Zwischenzeit hat die V8 Sandbox — eine leichtgewichtige, prozessinterne Sandbox für V8 — nun einen Punkt erreicht, an dem sie nicht mehr als experimentelles Sicherheitsfeature betrachtet wird. Ab heute ist die [V8 Sandbox im Chrome Vulnerability Reward Program](https://g.co/chrome/vrp/#v8-sandbox-bypass-rewards) (VRP) enthalten. Während es noch einige Probleme gibt, die gelöst werden müssen, bevor sie zu einer starken Sicherheitsgrenze wird, ist die Aufnahme in das VRP ein wichtiger Schritt in diese Richtung. Chrome 123 könnte daher als eine Art "Beta"-Release für die Sandbox angesehen werden. Dieser Blog-Beitrag nutzt die Gelegenheit, um die Motivation hinter der Sandbox zu erläutern, zeigt, wie sie verhindert, dass Speicherbeschädigungen in V8 sich innerhalb des Host-Prozesses ausbreiten, und erklärt letztlich, warum sie ein notwendiger Schritt zur Speichersicherheit ist.

<!--truncate-->

# Motivation

Speichersicherheit bleibt ein relevantes Problem: Alle Chrome-Exploits [die in den letzten drei Jahren in freier Wildbahn entdeckt wurden](https://docs.google.com/spreadsheets/d/1lkNJ0uQwbeC1ZTRrxdtuPLCIl7mlUreoKfSIgajnSyY/edit?usp=sharing) (2021 – 2023) begannen mit einer Speicherbeschädigungs-Schwachstelle in einem Chrome-Renderer-Prozess, die für Remote-Code-Ausführung (RCE) ausgenutzt wurde. Von diesen waren 60 % Schwachstellen in V8. Es gibt jedoch einen Haken: V8-Schwachstellen sind selten „klassische“ Speicherbeschädigungsfehler (Use-after-free, Out-of-bounds-Zugriffe usw.), sondern vielmehr subtile Logikprobleme, die wiederum genutzt werden können, um Speicher zu beschädigen. Daher sind bestehende Lösungsansätze zur Speichersicherheit größtenteils nicht auf V8 anwendbar. Insbesondere können weder [die Umstellung auf eine speichersichere Programmiersprache](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps), wie Rust, noch die Nutzung aktueller oder zukünftiger Hardware-Speichersicherheitsfunktionen, wie [Memory-Tagging](https://newsroom.arm.com/memory-safety-arm-memory-tagging-extension), bei den Sicherheitsherausforderungen helfen, denen V8 heute gegenübersteht.

Um zu verstehen, warum das so ist, betrachten Sie eine stark vereinfachte, hypothetische Schwachstelle in einer JavaScript-Engine: die Implementation von `JSArray::fizzbuzz()`, die Werte im Array ersetzt, die durch 3 teilbar sind, mit "fizz", durch 5 teilbar mit "buzz" und durch sowohl 3 als auch 5 teilbar mit "fizzbuzz". Unten finden Sie eine Implementation dieser Funktion in C++. `JSArray::buffer_` kann als `JSValue*` betrachtet werden, also als Zeiger auf ein Array von JavaScript-Werten, und `JSArray::length_` enthält die aktuelle Größe dieses Buffers.

```cpp
 1. for (int index = 0; index < length_; index++) {
 2.     JSValue js_value = buffer_[index];
 3.     int value = ToNumber(js_value).int_value();
 4.     if (value % 15 == 0)
 5.         buffer_[index] = JSString("fizzbuzz");
 6.     else if (value % 5 == 0)
 7.         buffer_[index] = JSString("buzz");
 8.     else if (value % 3 == 0)
 9.         buffer_[index] = JSString("fizz");
10. }
```

Sieht einfach aus? Jedoch gibt es hier einen etwas subtilen Fehler: Die `ToNumber` Konvertierung in Zeile 3 kann Nebenwirkungen haben, da sie benutzerdefinierte JavaScript-Callbacks aufrufen kann. Ein solcher Callback könnte das Array verkleinern, wodurch anschließend ein Out-of-Bounds-Schreiben passiert. Der folgende JavaScript-Code würde wahrscheinlich eine Speicherbeschädigung verursachen:

```js
let array = new Array(100);
let evil = { [Symbol.toPrimitive]() { array.length = 1; return 15; } };
array.push(evil);
// Am Index 100 wird der @@toPrimitive Callback von |evil| in
// Zeile 3 oben aufgerufen, wodurch das Array auf Länge 1 verkleinert
// und sein unterstützender Buffer neu zugewiesen wird. Das anschließend
// erfolgende Schreiben (Zeile 5) geht Out-of-Bounds.
array.fizzbuzz();
```


Obwohl dies ein künstlich einfaches Problem ist (dieses spezifische Fehlermuster ist inzwischen aufgrund von Verbesserungen in Fuzzern, dem Bewusstsein der Entwickler und der Aufmerksamkeit der Forscher weitgehend ausgestorben), ist es dennoch nützlich zu verstehen, warum Schwachstellen in modernen JavaScript-Engines schwierig allgemein zu beheben sind. Betrachten Sie den Ansatz, eine speichersichere Sprache wie Rust zu verwenden, bei der es die Verantwortung des Compilers ist, Speicherintegrität zu gewährleisten. Im obigen Beispiel würde eine speichersichere Sprache wahrscheinlich diesen Fehler im handgeschriebenen Laufzeitcode des Interpreters verhindern. Sie würde jedoch *nicht* den Fehler in einem Just-in-Time-Compiler verhindern, da dort das Problem ein Logikfehler wäre und keine "klassische" Speicherbeschädigungs-Schwachstelle. Die Speicherbeschädigung würde tatsächlich nur durch den vom Compiler generierten Code verursacht werden. Grundsätzlich ist das Problem, dass *Speichersicherheit nicht vom Compiler garantiert werden kann, wenn der Compiler direkt Teil der Angriffsfläche ist*.

Ebenso wäre das Deaktivieren der JIT-Compiler auch nur eine teilweise Lösung: Historisch betrafen etwa die Hälfte der in V8 entdeckten und ausgenutzten Fehler einen seiner Compiler, während die anderen in Komponenten wie Laufzeitfunktionen, dem Interpreter, dem Garbage Collector oder dem Parser auftraten. Die Verwendung einer speichersicheren Sprache für diese Komponenten und das Entfernen von JIT-Compilern könnte funktionieren, würde jedoch die Leistung der Engine erheblich reduzieren (je nach Art der Arbeitslast zwischen 1,5–10× oder mehr bei rechenintensiven Aufgaben).

Betrachten Sie stattdessen beliebte Hardware-Sicherheitsmechanismen, insbesondere [Speicher-Tagging](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-1.html). Es gibt eine Reihe von Gründen, warum Speicher-Tagging ebenfalls keine wirkungsvolle Lösung darstellt. Beispielsweise könnten CPU-Seitenkanäle, die [leicht aus JavaScript ausgenutzt werden können](https://security.googleblog.com/2021/03/a-spectre-proof-of-concept-for-spectre.html), verwendet werden, um Tag-Werte zu leaken und dadurch einem Angreifer ermöglichen, die Schutzmaßnahmen zu umgehen. Darüber hinaus gibt es aufgrund der [Pointer-Kompression](https://v8.dev/blog/pointer-compression) derzeit keinen Platz für die Tag-Bits in den Zeigern von V8. Die gesamte Heap-Region müsste daher mit dem gleichen Tag versehen werden, wodurch es unmöglich wäre, Zwischen-Objekt-Beschädigungen zu erkennen. Daher ist es unwahrscheinlich, dass Speicher-Tagging, obwohl es [auf bestimmten Angriffsflächen sehr effektiv sein kann](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-2-mitigation.html), für Angreifer im Fall von JavaScript-Engines eine erhebliche Hürde darstellt.

Zusammengefasst neigen moderne JavaScript-Engines dazu, komplexe Logikfehler zweiter Ordnung zu enthalten, die mächtige Angriffsprimitiven bieten. Diese können nicht effektiv durch die gleichen Techniken geschützt werden, die bei typischen Speicher-Beschädigungs-Schwachstellen angewendet werden. Fast alle heute in V8 gefundenen und ausgenutzten Schwachstellen haben jedoch eines gemeinsam: Die letztendliche Speicherbeschädigung tritt zwangsläufig innerhalb des V8-Heaps auf, da der Compiler und die Laufzeit (fast) ausschließlich auf `HeapObject`-Instanzen von V8 arbeiten. Hier kommt der Sandbox ins Spiel.


# Der V8 (Heap) Sandbox

Die grundlegende Idee hinter der Sandbox besteht darin, den (Heap-)Speicher von V8 zu isolieren, sodass jede Speicherbeschädigung dort sich nicht auf andere Teile des Prozessspeichers "ausbreiten" kann.

Betrachten Sie als motivierendes Beispiel für das Sandbox-Design die [Trennung von Benutzer- und Kernel-Space](https://en.wikipedia.org/wiki/User_space_and_kernel_space) in modernen Betriebssystemen. Historisch gesehen teilten alle Anwendungen und der Kernel des Betriebssystems denselben (physischen) Speicheradressenraum. Eine Speicherbeschädigung in einer Benutzeranwendung könnte das gesamte System lahmlegen, indem sie beispielsweise Kernel-Speicher beschädigt. In einem modernen Betriebssystem hingegen hat jede Benutzeranwendung ihren eigenen dedizierten (virtuellen) Adressenraum. So ist jede Speicherbeschädigung auf die Anwendung selbst beschränkt, und der Rest des Systems ist geschützt. Anders ausgedrückt: Eine fehlerhafte Anwendung kann sich selbst zum Absturz bringen, aber den Rest des Systems nicht beeinflussen. Ähnlich versucht die V8-Sandbox, den nicht vertrauenswürdigen JavaScript-/WebAssembly-Code, der von V8 ausgeführt wird, zu isolieren, sodass ein Fehler in V8 den Rest des Hostprozesses nicht beeinträchtigt.

Im Prinzip könnte [die Sandbox mit Hardware-Unterstützung implementiert werden](https://docs.google.com/document/d/12MsaG6BYRB-jQWNkZiuM3bY8X2B2cAsCMLLdgErvK4c/edit?usp=sharing): Ähnlich wie bei der Trennung von Benutzer- und Kernel-Space würde V8 eine Moduswechselanweisung ausführen, wenn sandboxierter Code betreten oder verlassen wird, wodurch die CPU keinen Zugriff auf Speicherdaten außerhalb der Sandbox hätte. Tatsächlich steht heute jedoch keine geeignete Hardware-Funktion zur Verfügung, und die aktuelle Sandbox wird daher rein softwarebasiert implementiert.

Die grundlegende Idee hinter der [softwarebasierten Sandbox](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) besteht darin, alle Datentypen, die auf Speicher außerhalb der Sandbox zugreifen können, durch "sandbox-kompatible" Alternativen zu ersetzen. Insbesondere müssen alle Zeiger (sowohl auf Objekte im V8-Heap als auch anderswo im Speicher) und 64-Bit-Größen entfernt werden, da ein Angreifer sie beschädigen könnte, um anschließend auf anderen Speicher im Prozess zuzugreifen. Dies bedeutet, dass Speicherbereiche wie der Stapelspeicher sich nicht innerhalb der Sandbox befinden können, da sie aus Hardware- und Betriebssystemeinschränkungen Zeiger (zum Beispiel Rücksprungadressen) enthalten müssen. Daher befindet sich in der softwarebasierten Sandbox nur der V8-Heap, und die Gesamtkonstruktion ist daher der [Sandboxing-Modell von WebAssembly](https://webassembly.org/docs/security/) nicht unähnlich.

Um zu verstehen, wie dies in der Praxis funktioniert, ist es hilfreich, sich die Schritte anzusehen, die ein Exploit nach der Speicherbeschädigung ausführen muss. Das Ziel eines RCE-Exploits wäre typischerweise, einen Privilegienerhöhungsangriff durchzuführen, beispielsweise durch Ausführung von Shellcode oder einen Angriff im Stil der Rücksprungorientierten Programmierung (ROP). Für eine dieser Methoden möchte der Exploit zunächst die Fähigkeit haben, beliebigen Speicher im Prozess zu lesen und zu schreiben, beispielsweise um dann einen Funktionszeiger zu beschädigen oder eine ROP-Nutzlast irgendwo im Speicher zu platzieren und darauf umzuschwenken. Angesichts eines Fehlers, der Speicher im V8-Heapspeicher beschädigt, würde ein Angreifer daher nach einem Objekt wie dem folgenden suchen:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    byte* buffer_;
    size_t size_;
};
```

Damit würde der Angreifer entweder den Buffer-Pointer oder den Größenwert beschädigen, um eine beliebige Lese-/Schreibprimitive zu konstruieren. Dies ist der Schritt, den die Sandbox zu verhindern versucht. Insbesondere würde mit aktivierter Sandbox und unter der Annahme, dass der referenzierte Buffer innerhalb der Sandbox liegt, das oben genannte Objekt nun zu:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    sandbox_ptr_t buffer_;
    sandbox_size_t size_;
};
```

Dabei ist `sandbox_ptr_t` ein 40-Bit-Offset (im Falle einer 1TB-Sandbox) vom Beginn der Sandbox. Ebenso ist `sandbox_size_t` eine „sandbox-kompatible“ Größe, die [derzeit auf 32GB begrenzt ist](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-internal.h;l=231;drc=5bdda7d5edcac16b698026b78c0eec6d179d3573).
Alternativ, wenn der referenzierte Buffer außerhalb der Sandbox lokalisiert war, würde das Objekt stattdessen zu:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    external_ptr_t buffer_;
};
```

Hier referenziert ein `external_ptr_t` den Buffer (und dessen Größe) durch eine Zeigertabellen-Indirektion (vergleichbar mit der [Dateideskriptortabelle eines Unix-Kernels](https://en.wikipedia.org/wiki/File_descriptor) oder einer [WebAssembly.Table](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Table)), die Speichersicherheitsgarantien bietet.

In beiden Fällen wäre ein Angreifer nicht in der Lage, „aus der Sandbox herauszugreifen“ und in andere Teile des Adressraums zu gelangen. Stattdessen bräuchte er zunächst eine zusätzliche Schwachstelle: eine Umgehung der V8-Sandbox. Das folgende Bild fasst das Design auf hoher Ebene zusammen, und interessierte Leser finden weitere technische Details zur Sandbox in den Designdokumenten verlinkt von [`src/sandbox/README.md`](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/sandbox/README.md).

![Ein Diagramm der Sandbox-Design auf hoher Ebene](/_img/sandbox/sandbox.svg)

Das alleinige Konvertieren von Pointern und Größen in eine andere Darstellung ist in einer Anwendung so komplex wie V8 nicht ganz ausreichend, und es gibt [eine Reihe weiterer Probleme](https://issues.chromium.org/hotlists/4802478), die behoben werden müssen. Zum Beispiel wird mit der Einführung der Sandbox Code wie der folgende plötzlich problematisch:

```cpp
std::vector<std::string> JSObject::GetPropertyNames() {
    int num_properties = TotalNumberOfProperties();
    std::vector<std::string> properties(num_properties);

    for (int i = 0; i < NumberOfInObjectProperties(); i++) {
        properties[i] = GetNameOfInObjectProperty(i);
    }

    // Bearbeitung anderer Typen von Properties
    // ...
```

Dieser Code macht die (vernünftige) Annahme, dass die Anzahl der direkt in einem JSObject gespeicherten Eigenschaften kleiner sein muss als die Gesamtzahl der Eigenschaften dieses Objekts. Wenn diese Zahlen jedoch einfach irgendwo im JSObject als Ganzzahlen gespeichert werden, könnte ein Angreifer eine davon korrumpieren, um dieses Invariante zu brechen. Anschließend würde der Zugriff auf die (Außerhalb-Sandbox-) `std::vector` aus den Grenzen laufen. Das Hinzufügen einer expliziten Grenzprüfung, beispielsweise mit einem [`SBXCHECK`](https://chromium.googlesource.com/v8/v8.git/+/0deeaf5f593b98d6a6a2bb64e3f71d39314c727c), würde dies beheben.

Erfreulicherweise sind die bisher entdeckten „Sandbox-Verletzungen“ nahezu alle wie diese: triviale (1. Ordnung) Speicherbeschädigungsfehler wie Use-After-Free oder Out-of-Bounds-Zugriffe aufgrund fehlender Grenzprüfung. Im Gegensatz zu den Schwachstellen 2. Ordnung, die typischerweise in V8 zu finden sind, könnten diese Sandbox-Fehler tatsächlich durch die zuvor diskutierten Ansätze verhindert oder abgeschwächt werden. Tatsächlich wäre der obige spezielle Fehler bereits heute abgeschwächt aufgrund der [Hardening von Chrome&apos;s libc++](http://issues.chromium.org/issues/40228527). Daher besteht die Hoffnung, dass die Sandbox langfristig eine **besser verteidigbare Sicherheitsgrenze** wird als V8 selbst. Obwohl die derzeit verfügbare Datensatz von Sandbox-Fehlern sehr begrenzt ist, wird die heute gestartete VRP-Integration hoffentlich ein klareres Bild der Art von Schwachstellen liefern, die auf der Angriffsfläche der Sandbox auftreten.

## Leistung

Ein großer Vorteil dieses Ansatzes ist, dass er grundsätzlich günstig ist: Der durch die Sandbox verursachte Overhead entsteht hauptsächlich durch die Zeigertabellen-Indirektion für externe Objekte (etwa ein zusätzlicher Speicherladevorgang) und in geringerem Maße durch die Verwendung von Offsets anstelle von rohen Pointern (was hauptsächlich einen Schiebe-+Addition-Vorgang kostet, der sehr günstig ist). Der derzeitige Overhead der Sandbox beträgt daher nur etwa 1% oder weniger bei typischen Arbeitslasten (gemessen mit den Benchmark-Suites [Speedometer](https://browserbench.org/Speedometer3.0/) und [JetStream](https://browserbench.org/JetStream/)). Dies ermöglicht es, die V8-Sandbox standardmäßig auf kompatiblen Plattformen zu aktivieren.

## Test

Ein wünschenswertes Merkmal für jede Sicherheitsgrenze ist die Testbarkeit: die Fähigkeit, manuell und automatisch zu testen, ob die zugesicherten Sicherheitsgarantien tatsächlich in der Praxis bestehen. Dies erfordert ein klares Angreifermodell, eine Möglichkeit, einen Angreifer zu "emulieren", und idealerweise eine Methode, um automatisch festzustellen, wann die Sicherheitsgrenze versagt. Der V8-Sandbox erfüllt alle diese Anforderungen:

1. **Ein klares Angreifermodell:** Es wird davon ausgegangen, dass ein Angreifer innerhalb der V8-Sandbox beliebig lesen und schreiben kann. Ziel ist es, Speicherbeschädigungen außerhalb der Sandbox zu verhindern.
2. **Eine Möglichkeit, einen Angreifer zu emulieren:** V8 bietet eine "Memory Corruption API", wenn es mit dem `v8_enable_memory_corruption_api = true`-Flag gebaut wird. Diese emuliert die Primitive, die typischen V8-Schwachstellen entnommen werden, und bietet insbesondere vollständigen Lese- und Schreibzugriff innerhalb der Sandbox.
3. **Eine Methode zum Erkennen von "Sandbox-Verletzungen":** V8 bietet einen "Sandbox-Testmodus" (aktiviert über entweder `--sandbox-testing` oder `--sandbox-fuzzing`), der einen [Signal-Handler](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/sandbox/testing.cc;l=425;drc=97b7d0066254778f766214d247b65d01f8a81ebb) installiert, um festzustellen, ob ein Signal wie `SIGSEGV` eine Verletzung der Sicherheitsgarantien der Sandbox darstellt.

Letztendlich ermöglicht dies, die Sandbox in das VRP-Programm von Chrome zu integrieren und sie von spezialisierten Fuzzern testen zu lassen.

## Nutzung

Die V8-Sandbox muss zur Build-Zeit mittels des `v8_enable_sandbox`-Build-Flags aktiviert/deaktiviert werden. Aus technischen Gründen ist es nicht möglich, die Sandbox zur Laufzeit zu aktivieren oder zu deaktivieren. Die V8-Sandbox erfordert ein 64-Bit-System, da sie eine große Menge an virtuellem Adressraum reservieren muss, derzeit ein Terabyte.

Die V8-Sandbox wurde bereits seit etwa zwei Jahren standardmäßig auf 64-Bit-Versionen (insbesondere x64 und arm64) von Chrome für Android, ChromeOS, Linux, macOS und Windows aktiviert. Obwohl die Sandbox (und ist es noch) nicht funktionskomplett war, wurde dies hauptsächlich durchgeführt, um sicherzustellen, dass sie keine Stabilitätsprobleme verursacht, und um reale Leistungsstatistiken zu sammeln. Folglich mussten neuere V8-Exploits bereits die Sandbox umgehen, was hilfreiches frühes Feedback zu ihren Sicherheitseigenschaften bietet.


# Fazit

Die V8-Sandbox ist ein neuer Sicherheitsmechanismus, der entworfen wurde, um Speicherbeschädigungen in V8 daran zu hindern, andere Speicher im Prozess zu beeinträchtigen. Die Sandbox ergibt sich aus der Tatsache, dass aktuelle Speichersicherheitstechnologien größtenteils auf optimierende JavaScript-Engines nicht anwendbar sind. Während diese Technologien Speicherbeschädigungen in V8 selbst nicht verhindern können, können sie tatsächlich die Angriffsfläche der V8-Sandbox schützen. Die Sandbox ist daher ein notwendiger Schritt in Richtung Speichersicherheit.
