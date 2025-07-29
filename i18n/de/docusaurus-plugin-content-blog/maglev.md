---
title: "Maglev - Der schnellste optimierende JIT von V8"
author: "[Toon Verwaest](https://twitter.com/tverwaes), [Leszek Swirski](https://twitter.com/leszekswirski), [Victor Gomes](https://twitter.com/VictorBFG), Olivier Flückiger, Darius Mercadier und Camillo Bruni — nicht zu viele Köche, um die Suppe zu verderben"
avatars: 
  - toon-verwaest
  - leszek-swirski
  - victor-gomes
  - olivier-flueckiger
  - darius-mercadier
  - camillo-bruni
date: 2023-12-05
tags: 
  - JavaScript
description: "Der neueste Compiler von V8, Maglev, verbessert die Leistung und senkt gleichzeitig den Energieverbrauch"
tweet: ""
---

In Chrome M117 haben wir einen neuen optimierenden Compiler eingeführt: Maglev. Maglev liegt zwischen unseren bestehenden Sparkplug- und TurboFan-Compilern und übernimmt die Rolle eines schnellen optimierenden Compilers, der schnell genug guten Code generiert.


# Hintergrund

Bis 2021 hatte V8 zwei Hauptausführungsstufen: Ignition, den Interpreter; und [TurboFan](/docs/turbofan), den auf Spitzenleistung fokussierten optimierenden Compiler von V8. Alle JavaScript-Code wird zunächst in Ignition-Bytecode kompiliert und durch Interpretation ausgeführt. Während der Ausführung verfolgt V8, wie sich das Programm verhält, einschließlich der Verfolgung von Objektformen und -typen. Sowohl die Metadaten der Laufzeitausführung als auch der Bytecode werden in den optimierenden Compiler eingespeist, um hochleistungsfähigen, oft spekulativen Maschinencode zu generieren, der deutlich schneller läuft als der Interpreter.

<!--truncate-->
Diese Verbesserungen sind in Benchmarks wie [JetStream](https://browserbench.org/JetStream2.1/) klar sichtbar, einer Sammlung traditioneller reiner JavaScript-Benchmarks, die Startzeit, Latenz und Spitzenleistung messen. TurboFan hilft V8, die Suite 4,35-mal so schnell auszuführen! Im Vergleich zu früheren Benchmarks (wie der [eingestellten Octane-Benchmark](/blog/retiring-octane)) legt JetStream weniger Wert auf den stabilen Zustand der Leistung, aber aufgrund der Einfachheit vieler einzelner Elemente wird optimierter Code dennoch für die meiste Zeit verwendet.

[Speedometer](https://browserbench.org/Speedometer2.1/) ist eine andere Art von Benchmark-Suite als JetStream. Sie wurde entwickelt, um die Reaktionsfähigkeit von Webanwendungen zu messen, indem simulierte Benutzerinteraktionen zeitlich erfasst werden. Statt kleiner statischer eigenständiger JavaScript-Apps besteht die Suite aus vollständigen Webseiten, von denen die meisten mit beliebten Frameworks erstellt sind. Wie bei den meisten Ladevorgängen von Webseiten verbringen Speedometer-Einzelposten viel weniger Zeit in engen JavaScript-Schleifen und viel mehr Zeit mit der Ausführung von Code, der mit anderen Teilen des Browsers interagiert.

TurboFan hat immer noch eine große Auswirkung auf Speedometer: Es läuft über 1,5-mal so schnell! Aber der Einfluss ist deutlich gedämpfter als bei JetStream. Ein Teil dieses Unterschieds resultiert aus der Tatsache, dass vollständige Seiten [weniger Zeit in purem JavaScript verbringen](/blog/real-world-performance#making-a-real-difference). Aber teilweise liegt das auch daran, dass der Benchmark viel Zeit in Funktionen verbringt, die nicht heiß genug werden, um von TurboFan optimiert zu werden.

![Webleistungsbenchmarks im Vergleich von nicht optimierter und optimierter Ausführung](/_img/maglev/I-IT.svg)

:::note
Alle Benchmark-Ergebnisse in diesem Beitrag wurden mit Chrome 117.0.5897.3 auf einem 13” M2 Macbook Air gemessen.
:::

Da der Unterschied in Ausführungsgeschwindigkeit und Kompilierungszeit zwischen Ignition und TurboFan so groß ist, haben wir im Jahr 2021 einen neuen Basis-JIT namens [Sparkplug](/blog/sparkplug) eingeführt. Es wurde entwickelt, um Bytecode nahezu augenblicklich in entsprechenden Maschinencode zu kompilieren.

Bei JetStream verbessert Sparkplug die Leistung im Vergleich zu Ignition erheblich (+45%). Auch wenn TurboFan ebenfalls im Spiel ist, sehen wir immer noch eine solide Leistungsverbesserung (+8%). Bei Speedometer sehen wir eine Verbesserung von 41 % gegenüber Ignition, die nahe an die Leistung von TurboFan heranreicht, und eine Verbesserung von 22 % gegenüber Ignition + TurboFan! Da Sparkplug so schnell ist, können wir es problemlos sehr breit einsetzen und eine konsistente Leistungssteigerung erzielen. Wenn Code nicht ausschließlich auf leicht optimierbare, lang laufende, enge JavaScript-Schleifen angewiesen ist, ist es eine großartige Ergänzung.

![Webleistungsbenchmarks mit hinzugefügtem Sparkplug](/_img/maglev/I-IS-IT-IST.svg)

Die Einfachheit von Sparkplug setzt jedoch eine relativ niedrige Obergrenze für die Leistungssteigerung, die es bieten kann. Dies wird durch die große Lücke zwischen Ignition + Sparkplug und Ignition + TurboFan deutlich demonstriert.

Hier kommt Maglev ins Spiel, unser neuer optimierender JIT, der Code generiert, der viel schneller ist als Sparkplug-Code, aber viel schneller generiert wird, als TurboFan es kann.


# Maglev: Ein einfacher SSA-basierter JIT-Compiler

Als wir dieses Projekt gestartet haben, sahen wir zwei Wege, um die Lücke zwischen Sparkplug und TurboFan zu schließen: Entweder versuchen wir, mit dem Ansatz von Sparkplug besseren Code im Ein-Durchgang zu generieren, oder wir bauen einen JIT mit einer Zwischenrepräsentation (IR). Da wir der Meinung waren, dass das vollständige Fehlen einer IR während der Kompilierung den Compiler stark einschränken würde, entschieden wir uns für einen etwas traditionellen Ansatz, der auf statischer Einzelzuweisung (SSA) basiert und ein CFG (Control Flow Graph) verwendet, anstelle der flexibleren, aber Cache-unfreundlichen „Sea-of-Nodes“-Repräsentation von TurboFan.

Der Compiler selbst ist darauf ausgelegt, schnell und einfach bearbeitbar zu sein. Er verfügt über eine minimale Anzahl von Verarbeitungsschritten und eine einfache, einzige IR, die spezialisierte JavaScript-Semantiken kodiert.


## Vorverarbeitung

Zunächst führt Maglev eine Vorverarbeitung des Bytecodes durch, um Sprungziele, einschließlich Schleifen, und Zuweisungen an Variablen in Schleifen zu finden. Dieser Schritt sammelt auch Informationen zur Lebensdauer von Variablen und kodiert, welche Werte in welchen Variablen über welche Ausdrücke hinweg noch benötigt werden. Diese Informationen können die Menge an Status, die später vom Compiler verfolgt werden muss, reduzieren.


## SSA

![Eine Ausgabe des Maglev-SSA-Diagramms auf der Kommandozeile](/_img/maglev/graph.svg)

Maglev führt eine abstrakte Interpretation des Frame-Zustands durch und erstellt SSA-Knoten, die die Ergebnisse der Ausdrucksbewertung darstellen. Variablenzuweisungen werden simuliert, indem diese SSA-Knoten in den jeweiligen Registern des abstrakten Interpreters gespeichert werden. Im Fall von Verzweigungen und Switches werden alle Pfade ausgewertet.

Wenn sich mehrere Pfade vereinen, werden Werte in den abstrakten Interpreter-Registern durch das Einfügen sogenannter Phi-Knoten zusammengeführt: Wertknoten, die wissen, welchen Wert sie auswählen müssen, abhängig davon, welcher Pfad zur Laufzeit genommen wurde.

Schleifen können Variablenwerte „zurück in die Zeit“ zusammenführen, wobei die Daten rückwärts vom Schleifenende zum Schleifenkopf fließen, wenn Variablen im Schleifenkörper zugewiesen werden. Hier kommen die Daten aus der Vorverarbeitung ins Spiel: Da wir bereits wissen, welche Variablen innerhalb von Schleifen zugewiesen werden, können wir Schleifen-Phi-Knoten vorab erstellen, bevor wir überhaupt mit der Verarbeitung des Schleifenkörpers beginnen. Am Ende der Schleife können wir den Eingangs-Phi-Knoten mit dem richtigen SSA-Knoten füllen. Dies ermöglicht eine SSA-Diagrammerstellung in einem einzigen Durchlauf nach vorne, ohne Schleifenvariablen „reparieren“ zu müssen, und minimiert gleichzeitig die Anzahl der zugewiesenen Phi-Knoten.


## Informationen zu bekannten Knoten

Um so schnell wie möglich zu sein, erledigt Maglev so viel wie möglich auf einmal. Anstatt ein generisches JavaScript-Diagramm zu erstellen und dieses erst in späteren Optimierungsphasen zu reduzieren, was ein theoretisch sauberer, aber rechnerisch teurer Ansatz ist, erledigt Maglev so viel wie möglich direkt während der Diagrammerstellung.

Während der Diagrammerstellung schaut sich Maglev die Laufzeit-Feedback-Metadaten an, die während der unoptimierten Ausführung gesammelt wurden, und generiert spezialisierte SSA-Knoten für die beobachteten Typen. Wenn Maglev `o.x` sieht und aus dem Laufzeit-Feedback weiß, dass `o` immer eine bestimmte Struktur hat, erzeugt es einen SSA-Knoten, der zur Laufzeit prüft, ob `o` immer noch die erwartete Struktur hat, gefolgt von einem günstigen `LoadField`-Knoten, der einfachen Zugriff per Offset macht.

Außerdem erstellt Maglev einen zusätzlichen Knoten, der angibt, dass die Struktur von `o` bekannt ist, wodurch später keine erneute Prüfung der Struktur erforderlich ist. Wenn Maglev später auf eine Operation mit `o` stößt, die aus irgendeinem Grund kein Feedback hat, können solche während der Kompilierung gewonnenen Informationen als zweite Feedback-Quelle genutzt werden.

Laufzeitinformationen können unterschiedliche Formen haben. Einige Informationen müssen zur Laufzeit überprüft werden, wie die zuvor beschriebene Strukturprüfung. Andere Informationen können ohne Laufzeitprüfungen verwendet werden, indem Abhängigkeiten zur Laufzeit registriert werden. Globale Variablen, die de facto konstant sind (nicht zwischen Initialisierung und dem Zeitpunkt geändert werden, an dem ihr Wert von Maglev gesehen wird), fallen in diese Kategorie: Maglev muss keinen Code generieren, um diese dynamisch zu laden und zu überprüfen. Maglev kann den Wert während der Kompilierung laden und direkt in den Maschinen-Code einbetten; wenn die Laufzeit diese globale Variable jemals ändert, wird sie sicherstellen, diesen Maschinen-Code zu invalidieren und zu deoptimieren.

Einige Formen von Informationen sind „instabil“. Solche Informationen können nur insoweit verwendet werden, wie der Compiler sicher weiß, dass sie sich nicht ändern können. Zum Beispiel wissen wir, dass ein gerade zugewiesenes Objekt neu ist und können teure Schreibbarrieren vollständig überspringen. Sobald eine andere mögliche Zuweisung erfolgt ist, könnte der Garbage-Collector das Objekt verschoben haben, und wir müssen solche Prüfungen jetzt emittieren. Andere sind „stabil“: Wenn wir nie gesehen haben, dass ein Objekt von einer bestimmten Struktur abweicht, können wir eine Abhängigkeit von diesem Ereignis registrieren (jedes Objekt, das von dieser speziellen Struktur abweicht) und müssen die Struktur des Objekts nicht neu überprüfen, selbst nach einem Aufruf einer unbekannten Funktion mit unbekannten Nebenwirkungen.


## Deoptimierung

Da Maglev spekulative Informationen verwenden kann, die zur Laufzeit überprüft werden, muss Maglev-Code in der Lage sein, zu deoptimieren. Um dies zu ermöglichen, hängt Maglev abstrakte Interpreter-Frame-Status an Knoten an, die deoptimieren können. Dieser Status ordnet Interpreterregister SSA-Werten zu. Während der Codegenerierung verwandelt sich dieser Status in Metadaten, die eine Zuordnung vom optimierten zum nicht optimierten Zustand bieten. Der Deoptimizer interpretiert diese Daten, liest Werte aus dem Interpreter-Frame und den Maschinenregistern und setzt sie an die erforderlichen Stellen für die Interpretation ein. Dies basiert auf demselben Deoptimierungsmechanismus wie bei TurboFan, wodurch wir den größten Teil der Logik teilen und von den Tests des vorhandenen Systems profitieren können.


## Repräsentationsauswahl

JavaScript-Zahlen repräsentieren gemäß [der Spezifikation](https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type) einen 64-Bit-Gleitkommawert. Das bedeutet jedoch nicht, dass die Engine sie immer als 64-Bit-Gleitkommazahlen speichern muss, insbesondere da in der Praxis viele Zahlen kleine Ganzzahlen sind (z. B. Array-Indizes). V8 versucht, Zahlen als 31-Bit markierte Ganzzahlen (intern „Small Integers" oder "Smi" genannt) zu codieren, um sowohl Speicher zu sparen (32 Bit dank [Pointer-Komprimierung](/blog/pointer-compression)) als auch die Leistung zu verbessern (Ganzzahloperationen sind schneller als Gleitkommaoperationen).

Um numeriklastigen JavaScript-Code zu beschleunigen, ist es wichtig, dass für Werte-Knoten optimale Repräsentationen gewählt werden. Im Gegensatz zum Interpreter und Sparkplug kann der Optimierungskompiler Werte entpacken, sobald er ihren Typ kennt, und auf Rohzahlen statt auf JavaScript-Werte operieren, die Zahlen darstellen. Das erneute Verpacken der Werte erfolgt nur, wenn es unbedingt erforderlich ist. Gleitkommazahlen können direkt in Gleitkommaregistern übergeben werden, anstatt ein Heap-Objekt zuzuweisen, das die Gleitkommazahl enthält.

Maglev lernt über die Repräsentation von SSA-Knoten hauptsächlich durch Betrachtung von Laufzeit-Feedback, z. B. bei binären Operationen, und propagiert diese Informationen durch den Mechanismus der bekannten Knoteninformationsweitergabe weiter. Wenn SSA-Werte mit spezifischen Repräsentationen in Phis fließen, muss eine korrekte Repräsentation gewählt werden, die alle Eingaben unterstützt. Schleifen-Phis sind erneut schwierig, da Eingaben aus der Schleife erst nach der Auswahl einer Repräsentation für das Phi gesehen werden — dasselbe „Zurück in der Zeit"-Problem wie beim Graphaufbau. Aus diesem Grund hat Maglev eine separate Phase nach dem Graphaufbau, um die Repräsentationsauswahl bei Schleifen-Phis durchzuführen.


## Register-Allokation

Nach dem Aufbau des Graphen und der Repräsentationsauswahl weiß Maglev größtenteils, welche Art von Code es generieren möchte, und ist aus klassischer Optimierungssicht „fertig". Um jedoch Code generieren zu können, müssen wir entscheiden, wo SSA-Werte tatsächlich während der Ausführung des Maschinencodes gespeichert werden: ob sie sich in Maschinenregistern oder auf dem Stack befinden. Dies erfolgt durch die Register-Allokation.

Jeder Maglev-Knoten hat Eingabe- und Ausgabebedürfnisse, einschließlich Anforderungen an benötigte temporäre Register. Der Register-Allokator durchläuft den Graphen einmal vorwärts und führt einen abstrakten Registerzustand der Maschine, der dem während des Graphaufbaus gepflegten abstrakten Interpretationszustand nicht unähnlich ist. Dabei werden diese Anforderungen erfüllt und durch tatsächliche Speicherorte ersetzt. Diese Speicherorte können dann zur Codegenerierung verwendet werden.

Zuerst wird ein Vorabdurchlauf über den Graphen ausgeführt, um lineare Lebensdauerbereiche von Knoten zu finden, sodass Register freigegeben werden können, sobald ein SSA-Knoten nicht mehr benötigt wird. Dieser Vorabdurchlauf verfolgt auch die Nutzungskette. Zu wissen, wie weit in der Zukunft ein Wert benötigt wird, kann nützlich sein, um zu entscheiden, welche Werte priorisiert und welche verworfen werden, wenn die Register knapp werden.

Nach dem Vorabdurchlauf läuft die Register-Allokation. Die Registervergabe folgt einigen einfachen, lokalen Regeln: Wenn ein Wert bereits in einem Register ist, wird dieses Register nach Möglichkeit verwendet. Knoten verfolgen, in welchen Registern sie bei der Graphdurchquerung gespeichert sind. Hat der Knoten noch kein Register, aber ein Register ist frei, wird es ausgewählt. Der Knoten wird aktualisiert, um anzuzeigen, dass er sich im Register befindet, und der abstrakte Registerzustand wird aktualisiert, um zu wissen, dass es den Knoten enthält. Gibt es kein freies Register, aber ein Register wird benötigt, wird ein anderer Wert aus dem Register verzichtet. Idealerweise haben wir einen Knoten, der bereits in einem anderen Register ist, und können diesen „kostenlos" verwerfen; andernfalls wählen wir einen Wert, der lange nicht benötigt wird, und speichern ihn auf den Stack aus.

Bei Verzweigungszusammenführungen werden die abstrakten Registerzustände der eingehenden Verzweigungen zusammengeführt. Wir versuchen, so viele Werte wie möglich in Registern zu halten. Das kann bedeuten, dass wir Register-zu-Register-Bewegungen einführen oder Werte aus dem Stack neu laden müssen, wobei Bewegungen namens „Gap Moves" verwendet werden. Wenn eine Verzweigungszusammenführung ein Phi-Knoten hat, wird die Register-Allokation Ausgaberegister an die Phis zuweisen. Maglev bevorzugt es, Phis in denselben Registern auszugeben wie ihre Eingaben, um Bewegungen zu minimieren.

Wenn mehr SSA-Werte aktiv sind, als wir Register haben, müssen wir einige Werte auf dem Stapel sichern und später wiederherstellen. Im Sinne von Maglev halten wir es einfach: Wenn ein Wert gesichert werden muss, wird ihm rückwirkend mitgeteilt, dass er sofort bei der Definition (direkt nach seiner Erzeugung) gesichert wird, und die Codegenerierung wird die Sicherungscode-Emission übernehmen. Die Definition ist garantiert so positioniert, dass sie alle Verwendungen des Wertes 'dominiert' (um die Verwendung zu erreichen, müssen wir die Definition und damit den Sicherungscode durchlaufen haben). Dies bedeutet auch, dass ein gesicherter Wert während der gesamten Dauer des Codes genau einen Sicherungsslot hat; Werte mit überlappenden Lebensdauern haben daher nicht überlappende zugewiesene Sicherungsslots.

Aufgrund der Auswahl der Darstellung werden einige Werte im Maglev-Frame getaggte Zeiger sein, Zeiger, die vom GC von V8 verstanden und berücksichtigt werden müssen; und einige werden nicht getaggt sein, Werte, die der GC nicht berücksichtigen sollte. TurboFan handhabt dies, indem es genau verfolgt, welche Stapelplätze getaggte Werte enthalten, und welche nicht getaggte Werte enthalten, was sich während der Ausführung ändert, wenn Plätze für unterschiedliche Werte wiederverwendet werden. Bei Maglev haben wir uns dafür entschieden, die Dinge einfacher zu halten, um den erforderlichen Speicher für die Verfolgung zu reduzieren: Wir teilen den Stapelrahmen in einen getaggten und einen ungetaggten Bereich und speichern nur diesen Trennungspunkt.


## Codeerzeugung

Sobald wir wissen, für welche Ausdrücke wir Code generieren möchten und wo wir deren Ausgaben und Eingaben platzieren möchten, ist Maglev bereit, Code zu generieren.

Maglev-Knoten wissen direkt, wie sie Assembly-Code mit einem 'Makro-Assembler' generieren können. Beispielsweise weiß ein `CheckMap`-Knoten, wie er Assembler-Befehle ausgeben kann, die die Form (intern als 'Map' bezeichnet) eines Eingabeobjekts mit einem bekannten Wert vergleichen und den Code deoptimieren, wenn das Objekt die falsche Form hat.

Ein etwas kniffliger Teil des Codes behandelt Lückenverschiebungen: Die vom Register-Allocator erstellten Verschiebungen wissen, dass ein Wert an einem Ort lebt und woandershin verschoben werden muss. Wenn es jedoch eine Sequenz solcher Verschiebungen gibt, könnte eine vorhergehende Verschiebung die Eingabe zerstören, die von einer nachfolgenden Verschiebung benötigt wird. Der Parallel Move Resolver berechnet, wie die Verschiebungen sicher durchgeführt werden können, sodass alle Werte an ihrem richtigen Platz landen.


# Ergebnisse

Der Compiler, den wir hier vorgestellt haben, ist eindeutig sowohl erheblich komplexer als Sparkplug als auch wesentlich einfacher als TurboFan. Wie schlägt er sich?

In Bezug auf die Kompilierungsgeschwindigkeit haben wir es geschafft, einen JIT zu bauen, der etwa 10-mal langsamer als Sparkplug und 10-mal schneller als TurboFan ist.

![Vergleich der Kompilierungszeiten der Kompilierungsstufen für alle in JetStream kompilierten Funktionen](/_img/maglev/compile-time.svg)

Dies ermöglicht es uns, Maglev viel früher einzusetzen, als wir TurboFan implementieren würden. Wenn das Feedback, auf das es angewiesen ist, noch nicht sehr stabil ist, entstehen keine hohen Kosten für Deoptimierung und erneute Kompilierung zu einem späteren Zeitpunkt. Es erlaubt uns auch, TurboFan etwas später einzusetzen: Wir laufen viel schneller, als wir es mit Sparkplug tun würden.

Der Einsatz von Maglev zwischen Sparkplug und TurboFan führt zu spürbaren Verbesserungen bei Benchmarks:

![Web-Performance-Benchmarks mit Maglev](/_img/maglev/I-IS-IT-IST-ISTM.svg)

Wir haben Maglev auch mit realen Daten validiert und sehen gute Verbesserungen bei den [Core Web Vitals](https://web.dev/vitals/).

Da Maglev viel schneller kompiliert und wir uns nun leisten können, länger zu warten, bevor wir Funktionen mit TurboFan kompilieren, ergibt sich ein sekundärer Vorteil, der an der Oberfläche weniger sichtbar ist. Die Benchmarks konzentrieren sich auf die Latenz des Hauptthreads, aber Maglev reduziert auch V8s gesamten Ressourcenverbrauch erheblich, indem weniger CPU-Zeit außerhalb des Hauptthreads verwendet wird. Der Energieverbrauch eines Prozesses lässt sich leicht auf einem MacBook mit M1- oder M2-Basis mithilfe von `taskinfo` messen.

:::table-wrapper
| Benchmark   | Energieverbrauch   |
| :---------: | :----------------: |
| JetStream   | -3,5%              |
| Speedometer | -10%               |
:::

Maglev ist keineswegs vollständig. Wir haben noch viel Arbeit vor uns, viele Ideen, die wir ausprobieren können, und viele leicht zugängliche Optimierungen, die wir vornehmen können – mit zunehmender Vollständigkeit von Maglev erwarten wir höhere Werte und eine weitere Reduzierung des Energieverbrauchs.

Maglev ist jetzt für den Desktop-Chrome verfügbar und wird bald auf Mobilgeräte ausgerollt.
