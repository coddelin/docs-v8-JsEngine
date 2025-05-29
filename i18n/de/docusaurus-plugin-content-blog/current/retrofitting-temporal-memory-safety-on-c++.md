---
title: 'Nachrüstung zeitlicher Speichersicherheit in C++'
author: 'Anton Bikineev, Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), Hannes Payer ([@PayerHannes](https://twitter.com/PayerHannes))'
avatars:
  - anton-bikineev
  - michael-lippautz
  - hannes-payer
date: 2022-06-14
tags:
  - internals
  - speicher
  - sicherheit
description: 'Beseitigung von Use-After-Free-Schwachstellen in Chrome mittels Heap-Scanning.'
---
:::note
**Hinweis:** Dieser Beitrag wurde ursprünglich im [Google Security Blog](https://security.googleblog.com/2022/05/retrofitting-temporal-memory-safety-on-c.html) veröffentlicht.
:::

[Speichersicherheit in Chrome](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) ist eine ständige Bemühung zum Schutz unserer Nutzer. Wir experimentieren ständig mit verschiedenen Technologien, um böswilligen Akteuren einen Schritt voraus zu sein. In diesem Geist handelt dieser Beitrag von unserer Reise der Nutzung von Heap-Scanning-Technologien zur Verbesserung der Speichersicherheit von C++.

<!--truncate-->
Beginnen wir jedoch am Anfang. Während der Lebensdauer einer Anwendung wird ihr Zustand normalerweise im Speicher dargestellt. Zeitliche Speichersicherheit bezieht sich auf das Problem, sicherzustellen, dass Speicher immer mit den aktuellsten Informationen über seine Struktur, seinen Typ, zugegriffen wird. C++ bietet leider keine solchen Garantien. Obwohl es ein Interesse an anderen Sprachen als C++ mit stärkeren Speichersicherheitsgarantien gibt, wird C++ für absehbare Zeit in großen Codebasen wie Chromium verwendet.

```cpp
auto* foo = new Foo();
delete foo;
// Die Speicheradresse, auf die foo verweist, repräsentiert
// kein Foo-Objekt mehr, da das Objekt gelöscht (freigegeben) wurde.
foo->Process();
```

Im obigen Beispiel wird `foo` verwendet, nachdem sein Speicher an das zugrunde liegende System zurückgegeben wurde. Der veraltete Zeiger wird als [dangling pointer](https://en.wikipedia.org/wiki/Dangling_pointer) bezeichnet und jeder Zugriff darauf führt zu einem Use-After-Free (UAF)-Zugriff. Im besten Fall führen solche Fehler zu gut definierten Abstürzen, im schlimmsten Fall verursachen sie subtile Schäden, die von böswilligen Akteuren ausgenutzt werden können.

UAFs sind oft schwer in größeren Codebasen zu erkennen, in denen die Eigentümerschaft von Objekten zwischen verschiedenen Komponenten übertragen wird. Das allgemeine Problem ist so weit verbreitet, dass sowohl in der Industrie als auch in der akademischen Welt regelmäßig Strategien zur Schadensbegrenzung entwickelt werden. Die Beispiele sind endlos: C++ Smart Pointer aller Art werden verwendet, um die Eigentümerschaft auf Anwendungsebene besser zu definieren und zu verwalten; statische Analyse in Compilern wird eingesetzt, um problematischen Code bereits während des Kompilierungsprozesses zu vermeiden; wo die statische Analyse versagt, können dynamische Tools wie [C++ Sanitizers](https://github.com/google/sanitizers) Zugriffe abfangen und Probleme bei spezifischen Ausführungen erkennen.

Chromes Einsatz von C++ ist leider keine Ausnahme, und die Mehrheit der [hochrangigen Sicherheitsprobleme sind UAF-Probleme](https://www.chromium.org/Home/chromium-security/memory-safety/). Um Probleme zu erkennen, bevor sie in die Produktion gelangen, werden alle oben genannten Techniken genutzt. Zusätzlich zu regulären Tests stellen Fuzzer sicher, dass es immer neue Eingaben gibt, mit denen dynamische Tools arbeiten können. Chrome geht sogar noch weiter und setzt einen C++ Garbage Collector namens [Oilpan](https://v8.dev/blog/oilpan-library) ein, der sich von regulären C++-Semantiken unterscheidet, aber zeitliche Speichersicherheit dort bietet, wo er verwendet wird. Wenn solche Abweichungen unvernünftig sind, wurde kürzlich eine neue Art von Smart Pointer namens [MiraclePtr](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) eingeführt, um beim Zugriff auf dangling pointers deterministisch abzustürzen, wenn verwendet. Oilpan, MiraclePtr und Lösungen auf Basis von Smart Pointern erfordern erhebliche Anpassungen des Anwendungscodes.

Im letzten Jahrzehnt hat ein anderer Ansatz einige Erfolge erzielt: Speicherquarantäne. Die Grundidee besteht darin, explizit freigegebenen Speicher unter Quarantäne zu stellen und ihn erst verfügbar zu machen, wenn eine bestimmte Sicherheitsbedingung erreicht ist. Microsoft hat Versionen dieser Schadensbegrenzung in seinen Browsern veröffentlicht: [MemoryProtector](https://securityintelligence.com/understanding-ies-new-exploit-mitigations-the-memory-protector-and-the-isolated-heap/) im Internet Explorer im Jahr 2014 und dessen Nachfolger [MemGC](https://securityintelligence.com/memgc-use-after-free-exploit-mitigation-in-edge-and-ie-on-windows-10/) in (vor-Chromium) Edge im Jahr 2015. Im [Linux-Kernel](https://a13xp0p0v.github.io/2020/11/30/slab-quarantine.html) wurde ein probabilistischer Ansatz verwendet, bei dem Speicher letztendlich einfach recycelt wurde. Und diese Methode hat in den letzten Jahren in der akademischen Welt Aufmerksamkeit erregt, beispielsweise mit dem [MarkUs Paper](https://www.cst.cam.ac.uk/blog/tmj32/addressing-temporal-memory-safety). Der Rest dieses Artikels fasst unsere Reise zusammen, bei der wir Experimente mit Quarantäne und Heap-Scanning in Chrome durchgeführt haben.

(An dieser Stelle könnte man sich fragen, wie Memory Tagging in dieses Bild passt – lesen Sie weiter!)

## Quarantäne und Heap-Scanning, die Grundlagen

Die Hauptidee, die hinter der Gewährleistung der temporalen Sicherheit durch Quarantäne und Heap-Scanning steht, besteht darin, eine Wiederverwendung von Speicher zu vermeiden, bis bewiesen ist, dass keine (herrenlosen) Zeiger mehr darauf verweisen. Um Änderungen an C++-Benutzercode oder seinen Semantiken zu vermeiden, wird der Speicher-Allocator, der `new` und `delete` bereitstellt, abgefangen.

![Abbildung 1: Grundlagen der Quarantäne](/_img/retrofitting-temporal-memory-safety-on-c++/basics.svg)

Beim Aufruf von `delete` wird der Speicher tatsächlich in eine Quarantäne verschoben, in der er für nachfolgende `new`-Aufrufe der Anwendung nicht wiederverwendet werden kann. An einem bestimmten Punkt wird ein Heap-Scan ausgelöst, der den gesamten Heap durchläuft, ähnlich einem Garbage Collector, um Verweise auf Speicherblöcke in Quarantäne zu finden. Blöcke, auf die keine eingehenden Verweise aus dem regulären Anwendungsspeicher bestehen, werden zurück an den Allocator übertragen, wo sie für nachfolgende Zuweisungen wiederverwendet werden können.

Es gibt verschiedene Härtungsoptionen, die mit Leistungskosten verbunden sind:

- Überschreiben des quarantänierten Speichers mit speziellen Werten (z. B. Null);
- Anhalten aller Anwendungsthreads während des Scans oder gleichzeitiges Scannen des Heaps;
- Abfangen von Speicher-Schreibvorgängen (z. B. durch Seitenschutz), um Zeigeraktualisierungen zu erfassen;
- Scan von Speicher Wort für Wort nach möglichen Zeigern (konservative Behandlung) oder Bereitstellung von Objektbeschreibungen (präzise Behandlung);
- Trennung des Anwendungsspeichers in sichere und unsichere Partitionen, um bestimmte Objekte auszuschließen, die entweder leistungssensitiv sind oder statisch als sicher für das Überspringen bewiesen werden können;
- Scannen des Ausführungsstapels zusätzlich zum Scannen des Heapspeichers;

Wir nennen die Sammlung verschiedener Versionen dieser Algorithmen *StarScan* [stɑː skæn], oder kurz *\*Scan*.

## Realitätstest

Wir wenden \*Scan auf die nicht verwalteten Teile des Renderer-Prozesses an und verwenden [Speedometer2](https://browserbench.org/Speedometer2.0/), um die Leistungsauswirkungen zu bewerten.

Wir haben mit verschiedenen Versionen von \*Scan experimentiert. Um den Leistungsoverhead so weit wie möglich zu minimieren, bewerten wir eine Konfiguration, die einen separaten Thread zum Scannen des Heaps verwendet und beim Ausführen von \*Scan quarantänierten Speicher löscht, anstatt dies sofort bei `delete` zu tun. Wir entscheiden uns für alle mit `new` zugewiesenen Speicherbereiche und diskriminieren nicht zwischen Zuweisungsorten und Typen, um in der ersten Implementierung Einfachheit zu gewährleisten.

![Abbildung 2: Scannen in separatem Thread](/_img/retrofitting-temporal-memory-safety-on-c++/separate-thread.svg)

Beachten Sie, dass die vorgeschlagene Version von \*Scan nicht vollständig ist. Konkret könnte ein böswilliger Akteur ein Race-Condition mit dem Scanning-Thread ausnutzen, indem er einen herrenlosen Zeiger von einer nicht gescannten in eine bereits gescannte Speicherregion verschiebt. Die Behebung dieser Race-Condition erfordert das Verfolgen von Schreibvorgängen in bereits gescannten Speicherblöcke, z. B. durch den Einsatz von Speicher-Schutzmechanismen, um diese Zugriffe abzufangen, oder das vollständige Anhalten aller Anwendungsthreads an sicheren Punkten, um das Objektgraf-mutieren komplett zu verhindern. In jedem Fall führt die Lösung dieses Problems zu Leistungskosten und zeigt ein interessantes Leistungs- und Sicherheits-kompromiss. Beachten Sie, dass diese Art von Angriff nicht allgemein ist und nicht für alle UAF funktioniert. Probleme wie die, die in der Einleitung dargestellt werden, wären nicht anfällig für solche Angriffe, da der herrenlose Zeiger nicht herumkopiert wird.

Da die Sicherheitsvorteile wirklich von der Granularität solcher sicheren Punkte abhängen und wir mit der schnellsten möglichen Version experimentieren wollen, haben wir die sicheren Punkte vollständig deaktiviert.

Die Ausführung unserer Basisversion auf Speedometer2 führt zu einem Rückgang der Gesamtpunktzahl um 8 %. Ärgerlich...

Woher kommt all dieser Overhead? Wenig überraschend ist das Heap-Scanning speichergebunden und ziemlich teuer, da der gesamte Benutzerspeicher durchlaufen und vom Scanning-Thread auf Referenzen untersucht werden muss.

Um die Regression zu reduzieren, haben wir verschiedene Optimierungen implementiert, die die rohe Scan-Geschwindigkeit verbessern. Natürlich ist die schnellste Methode zum Scannen von Speicher, ihn überhaupt nicht zu scannen. Daher haben wir den Heap in zwei Klassen partitioniert: Speicher, der Zeiger enthalten kann, und Speicher, von dem wir statisch beweisen können, dass er keine Zeiger enthält, z. B. Strings. Wir vermeiden das Scannen von Speicher, der keine Zeiger enthalten kann. Beachten Sie, dass solcher Speicher weiterhin Teil der Quarantäne ist, er wird nur nicht gescannt.

Wir haben diesen Mechanismus erweitert, um auch Zuweisungen abzudecken, die als Backingspeicher für andere Allocatoren dienen, z. B. Zonen-Speicher, der von V8 für den optimierenden JavaScript-Compiler verwaltet wird. Solche Zonen werden regelmäßig auf einmal verworfen (vgl. regionenbasierte Speicherverwaltung), und die temporale Sicherheit wird in V8 durch andere Mittel hergestellt.

Darüber hinaus haben wir mehrere Mikrooptimierungen angewendet, um Berechnungen zu beschleunigen und zu eliminieren: wir verwenden Hilfstabellen für Zeigerfilterung; wir verlassen uns auf SIMD für die speichergebundene Scanschleife; und minimieren die Anzahl der Fetches und Sperr-präfixierten Instruktionen.

Wir haben auch den ursprünglichen Planungsalgorithmus verbessert, der einfach einen Heap-Scan startet, wenn ein bestimmtes Limit erreicht wird, indem wir anpassen, wie viel Zeit wir mit dem Scannen verbringen im Vergleich zur Ausführung des Anwendungscodes (vgl. Mutator-Nutzung in [Garbage Collection Literatur](https://dl.acm.org/doi/10.1145/604131.604155)).

Am Ende bleibt der Algorithmus weiterhin speichergebunden, und das Scannen bleibt eine spürbar kostspielige Prozedur. Die Optimierungen haben geholfen, die Speedometer2-Regression von 8 % auf 2 % zu reduzieren.

Obwohl wir die Roh-Scan-Zeit verbessert haben, erhöht die Tatsache, dass der Speicher in Quarantäne gehalten wird, die gesamte Arbeitslast eines Prozesses. Um diesen Overhead weiter zu quantifizieren, nutzen wir eine ausgewählte Reihe von [Chromes realen Browser-Benchmarks](https://chromium.googlesource.com/catapult/), um den Speicherverbrauch zu messen. \*Scan im Rendererprozess führt zu einer Regression des Speicherverbrauchs um etwa 12 %. Diese Erhöhung der Arbeitslast führt dazu, dass mehr Speicher ausgelagert wird, was auf schnellen Pfaden der Anwendung spürbar ist.

## Hardware-Speicher-Tagging als Retter

MTE (Memory Tagging Extension) ist eine neue Erweiterung der ARM v8.5A-Architektur, die beim Erkennen von Fehlern in der Nutzung von Software-Speicher hilft. Diese Fehler können räumliche Fehler (z. B. Out-of-Bounds-Zugriffe) oder zeitliche Fehler (Use-after-Free) sein. Die Erweiterung funktioniert wie folgt: Alle 16 Bytes Speicher werden mit einem 4-Bit-Tag versehen. Zeiger erhalten auch ein 4-Bit-Tag. Der Allocator ist dafür verantwortlich, einen Zeiger mit demselben Tag wie der zugewiesene Speicher zurückzugeben. Die Lade- und Speicherinstruktionen überprüfen, ob die Tags des Zeigers und des Speichers übereinstimmen. Falls die Tags der Speicherstelle und des Zeigers nicht übereinstimmen, wird eine Hardware-Ausnahme ausgelöst.

MTE bietet keinen deterministischen Schutz gegen Use-after-Free. Da die Anzahl der Tag-Bits begrenzt ist, besteht die Möglichkeit, dass die Tags von Speicher und Zeiger aufgrund eines Überlaufs übereinstimmen. Mit 4 Bits sind nur 16 Neuverteilungen ausreichend, damit die Tags übereinstimmen. Ein böswilliger Akteur könnte den Tag-Bit-Überlauf ausnutzen, um ein Use-after-Free zu erzielen, indem er einfach wartet, bis das Tag eines schwebenden Zeigers (erneut) dem Speicher entspricht, auf den er zeigt.

\*Scan kann verwendet werden, um diesen problematischen Eckfall zu beheben. Bei jedem `delete`-Aufruf wird das Tag für den zugrunde liegenden Speicherblock durch den MTE-Mechanismus inkrementiert. In den meisten Fällen wird der Block für die Neuverteilung verfügbar sein, da das Tag innerhalb des 4-Bit-Bereichs inkrementiert werden kann. Veraltete Zeiger würden sich auf das alte Tag beziehen und damit zuverlässig bei der Dereferenzierung abstürzen. Beim Überlaufen des Tags wird das Objekt dann in Quarantäne gegeben und von \*Scan verarbeitet. Sobald der Scan bestätigt, dass keine schwebenden Zeiger mehr auf diesen Speicherblock zeigen, wird er an den Allocator zurückgegeben. Dies reduziert die Anzahl der Scans und deren Begleitkosten um ~16x.

Das folgende Bild zeigt diesen Mechanismus. Der Zeiger auf `foo` hat ursprünglich ein Tag von `0x0E`, das es erlaubt, ihn erneut zu inkrementieren, um `bar` zuzuweisen. Beim Aufruf von `delete` für `bar` überläuft das Tag, und der Speicher wird tatsächlich in die Quarantäne von \*Scan gestellt.

![Figure 3: MTE](/_img/retrofitting-temporal-memory-safety-on-c++/mte.svg)

Wir haben Zugriff auf einige tatsächliche Hardware mit MTE-Unterstützung erhalten und die Experimente im Rendererprozess wiederholt. Die Ergebnisse sind vielversprechend, da die Regression bei Speedometer innerhalb des Rauschens lag und wir den Speicherverbrauch bei Chromes realen Browser-Geschichten nur um etwa 1 % regrediert haben.

Ist dies tatsächlich ein [kostenloses Mittagessen](https://en.wikipedia.org/wiki/No_free_lunch_theorem)? Es stellt sich heraus, dass MTE mit einigen Kosten verbunden ist, die bereits bezahlt wurden. Insbesondere führt PartitionAlloc, das die zugrunde liegende Speicherverwaltung von Chrome ist, alle Tag-Verwaltungsoperationen für alle MTE-fähigen Geräte standardmäßig aus. Außerdem sollte aus Sicherheitsgründen Speicher wirklich frühzeitig nullgesetzt werden. Um diese Kosten zu quantifizieren, haben wir Experimente auf einem frühen Hardware-Prototyp durchgeführt, der MTE in mehreren Konfigurationen unterstützt:

 A. MTE deaktiviert und ohne Nullsetzung des Speichers;
 B. MTE deaktiviert, aber mit Nullsetzung des Speichers;
 C. MTE aktiviert ohne \*Scan;
 D. MTE aktiviert mit \*Scan;

(Uns ist auch bewusst, dass es synchrones und asynchrones MTE gibt, das auch Determinismus und Leistung beeinflusst. Für dieses Experiment haben wir weiterhin den asynchronen Modus verwendet.)

![Figure 4: MTE regression](/_img/retrofitting-temporal-memory-safety-on-c++/mte-regression.svg)

Die Ergebnisse zeigen, dass MTE und Speicher-Nullsetzung mit einigen Kosten verbunden sind, die bei Speedometer2 etwa 2 % betragen. Beachten Sie, dass weder PartitionAlloc noch Hardware bisher für diese Szenarien optimiert wurden. Das Experiment zeigt auch, dass das Hinzufügen von \*Scan zu MTE ohne messbare Kosten erfolgt.

## Fazit
