---
title: "Ein leichteres V8"
author: "Mythri Alle, Dan Elphick und [Ross McIlroy](https://twitter.com/rossmcilroy), V8-Gewichtsüberwacher"
avatars:
  - "mythri-alle"
  - "dan-elphick"
  - "ross-mcilroy"
date: 2019-09-12 12:44:37
tags:
  - internals
  - speicher
  - präsentationen
description: "Das V8 Lite-Projekt hat den Speicheraufwand von V8 auf typischen Websites erheblich reduziert, so haben wir es gemacht."
tweet: "1172155403343298561"
---
Ende 2018 starteten wir ein Projekt namens V8 Lite, das darauf abzielte, den Speicherverbrauch von V8 drastisch zu reduzieren. Ursprünglich war dieses Projekt als separater *Lite-Modus* von V8 gedacht, der speziell für mobile Geräte mit geringem Speicher oder Embedding-Anwendungsfälle konzipiert wurde, bei denen es mehr auf reduzierten Speicherverbrauch als auf Durchsatzgeschwindigkeit ankommt. Im Verlauf dieser Arbeit stellten wir jedoch fest, dass viele der Speicheroptimierungen, die wir für diesen *Lite-Modus* vorgenommen hatten, auch auf das reguläre V8 übertragen werden konnten, wodurch alle V8-Benutzer profitieren konnten.

<!--truncate-->
In diesem Beitrag heben wir einige der wichtigsten Optimierungen hervor, die wir entwickelt haben, und die Speicherersparnisse, die sie bei realen Workloads erzielt haben.

:::note
**Hinweis:** Wenn Sie es vorziehen, eine Präsentation anzusehen, anstatt Artikel zu lesen, dann genießen Sie das folgende Video! Andernfalls überspringen Sie das Video und lesen Sie weiter.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/56ogP8-eRqA" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=56ogP8-eRqA">“V8 Lite  ⁠— JavaScript-Speicher abspecken”</a>, präsentiert von Ross McIlroy auf der BlinkOn 10.</figcaption>
</figure>

## Lite-Modus

Um den Speicherverbrauch von V8 zu optimieren, mussten wir zunächst verstehen, wie V8 Speicher verwendet und welche Objekttypen einen großen Teil der V8-Heap-Größe ausmachen. Wir nutzten die [Speichervisualisierung](/blog/optimizing-v8-memory#memory-visualization) von V8, um die Heap-Zusammensetzung über eine Reihe von typischen Webseiten hinweg zu analysieren.

<figure>
  <img src="/_img/v8-lite/memory-categorization.svg" width="950" height="440" alt="" loading="lazy"/>
  <figcaption>Prozentsatz des V8-Heaps, der von verschiedenen Objekttypen beim Laden von Times of India verwendet wird.</figcaption>
</figure>

Dabei stellten wir fest, dass ein erheblicher Teil des V8-Heaps für Objekte verwendet wurde, die für die Ausführung von JavaScript nicht unbedingt erforderlich sind, sondern zur Optimierung der JavaScript-Ausführung und zur Behandlung von Ausnahmesituationen eingesetzt werden. Beispiele hierfür sind: optimierter Code; Typ-Feedback, das verwendet wird, um zu bestimmen, wie der Code optimiert werden soll; redundante Metadaten für Bindungen zwischen C++- und JavaScript-Objekten; Metadaten, die nur in Ausnahmefällen wie der Symbolisierung des Stack-Traces benötigt werden; und Bytecode für Funktionen, die während des Seitenladens nur wenige Male ausgeführt werden.

Infolgedessen begannen wir mit der Arbeit an einem *Lite-Modus* für V8, bei dem die Geschwindigkeit der JavaScript-Ausführung gegen verbesserte Speicherersparnisse abgewogen wird, indem die Zuweisung dieser optionalen Objekte stark reduziert wird.

![](/_img/v8-lite/v8-lite.png)

Einige Änderungen für den *Lite-Modus* konnten durch die Konfiguration vorhandener V8-Einstellungen vorgenommen werden, beispielsweise durch Deaktivierung des TurboFan-Optimierungskompilers von V8. Andere hingegen erforderten umfassendere Änderungen an V8.

Insbesondere entschieden wir, dass, da der *Lite-Modus* keinen Code optimiert, wir die Sammlung von Typ-Feedback vermeiden konnten, das vom Optimierungskompiler benötigt wird. Beim Ausführen von Code im Ignition-Interpreter sammelt V8 Feedback über die Typen von Operanden, die bei verschiedenen Operationen übergeben werden (z. B. `+` oder `o.foo`), um spätere Optimierungen an diese Typen anzupassen. Diese Informationen werden in *Feedback-Vektoren* gespeichert, die einen erheblichen Teil des Speicherverbrauchs des V8-Heaps ausmachen. Der *Lite-Modus* konnte die Zuweisung dieser Feedback-Vektoren vermeiden, allerdings erwarteten der Interpreter und Teile der Inline-Cache-Infrastruktur von V8, dass Feedback-Vektoren verfügbar sind, was eine erhebliche Umstrukturierung erforderte, um diese feedbackfreie Ausführung zu unterstützen.

Der *Lite-Modus* wurde in V8 v7.3 eingeführt und bietet eine Reduzierung der typischen Webpage-Heap-Größe um 22 % im Vergleich zu V8 v7.1, indem Code-Optimierungen deaktiviert, Feedback-Vektoren nicht zugewiesen und selten verwendeter Bytecode altern gelassen wurde (wie unten beschrieben). Dies ist ein gutes Ergebnis für Anwendungen, die ausdrücklich Leistungen für einen besseren Speicherverbrauch eintauschen möchten. Während dieser Arbeit stellten wir jedoch fest, dass wir die meisten Speicherersparnisse des *Lite-Modus* ohne Leistungseinbußen erzielen könnten, indem wir V8 träger machen.

## Träge Zuweisung von Feedback

Das vollständige Deaktivieren der Zuweisung von Feedback-Vektoren verhindert nicht nur die Optimierung von Code durch den TurboFan-Compiler von V8, sondern hindert V8 auch daran, [Inline-Caching](https://mathiasbynens.be/notes/shapes-ics#ics) für gängige Operationen wie das Laden von Objekteigenschaften im Ignition-Interpreter durchzuführen. Dies führte zu einem signifikanten Rückgang der Ausführungszeit von V8, reduzierte die Ladezeit von Seiten um 12 % und erhöhte die von V8 verwendete CPU-Zeit in typischen interaktiven Webseitenszenarien um 120 %.

Um den größten Teil dieser Einsparungen in regulärem V8 zu erzielen, ohne solche Rückgänge zu erleben, sind wir stattdessen zu einem Ansatz übergegangen, bei dem wir Feedback-Vektoren nur dann verzögert zuweisen, nachdem die Funktion eine bestimmte Anzahl von Bytecode-Befehlen ausgeführt hat (derzeit 1 KB). Da die meisten Funktionen nicht sehr oft ausgeführt werden, vermeiden wir in den meisten Fällen die Zuweisung von Feedback-Vektoren, weisen sie jedoch schnell zu, wo sie benötigt werden, um Leistungseinbußen zu vermeiden und die Optimierung des Codes weiterhin zu ermöglichen.

Ein zusätzliches Problem bei diesem Ansatz hängt mit der Tatsache zusammen, dass Feedback-Vektoren einen Baum bilden, wobei die Feedback-Vektoren für innere Funktionen als Einträge im Feedback-Vektor ihrer äußeren Funktion gehalten werden. Dies ist notwendig, damit neu erstellte Funktionsclosures dasselbe Feedback-Vektor-Array erhalten wie alle anderen Closures, die für dieselbe Funktion erstellt wurden. Mit der verzögerten Zuweisung von Feedback-Vektoren können wir diesen Baum nicht mit Feedback-Vektoren bilden, da es keine Garantie gibt, dass eine äußere Funktion ihren Feedback-Vektor zugewiesen hat, bevor eine innere Funktion dies tut. Um dies zu lösen, haben wir ein neues `ClosureFeedbackCellArray` erstellt, um diesen Baum aufrechtzuerhalten, und tauschen dann das `ClosureFeedbackCellArray` einer Funktion mit einem vollständigen `FeedbackVector` aus, wenn es heiß wird.

![Feedback-Vektor-Bäume vor und nach der verzögerten Feedback-Zuweisung.](/_img/v8-lite/lazy-feedback.svg)

Unsere Laborexperimente und Telemetrie im Feld zeigten keine Leistungseinbußen für verzögertes Feedback auf Desktop-Systemen, und auf mobilen Plattformen stellten wir tatsächlich eine Leistungsverbesserung bei Geräten mit niedrigen Spezifikationen fest, da die Speicherbereinigung reduziert wurde. Daher haben wir die verzögerte Zuweisung von Feedback in allen Builds von V8 aktiviert, einschließlich des *Lite-Modus*, wobei der leichte Anstieg des Speicherverbrauchs im Vergleich zu unserem ursprünglichen Ansatz ohne Feedback-Zuweisung durch die Verbesserung der tatsächlichen Leistung mehr als ausgeglichen wird.

## Verzögerte Quellpositionsbeschreibung

Beim Kompilieren von Bytecode aus JavaScript werden Tabellen für Quellpositionen erstellt, die Bytecode-Sequenzen mit Zeichenpositionen im JavaScript-Quellcode verbinden. Diese Informationen werden jedoch nur benötigt, wenn Ausnahmen symbolisiert oder Entwickleraufgaben wie Debugging durchgeführt werden, und werden daher selten verwendet.

Um diese Verschwendung zu vermeiden, kompilieren wir jetzt Bytecode, ohne Quellpositionen zu sammeln (unter der Annahme, dass kein Debugger oder Profiler angehängt ist). Die Quellpositionen werden nur gesammelt, wenn tatsächlich ein Stack-Trace generiert wird, beispielsweise beim Aufrufen von `Error.stack` oder beim Drucken eines Stack-Traces einer Ausnahme in die Konsole. Dies hat jedoch einige Kosten, da das Generieren von Quellpositionen erfordert, dass die Funktion erneut geparst und kompiliert wird. Die meisten Websites symbolisieren ihre Stack-Traces jedoch nicht im Produktivbetrieb und verzeichnen daher keine spürbaren Leistungsauswirkungen.

Ein Problem, das wir bei dieser Arbeit lösen mussten, war die Gewährleistung wiederholbarer Bytecode-Generierung, die zuvor nicht garantiert war. Wenn V8 bei der Sammlung von Quellpositionen unterschiedlichen Bytecode im Vergleich zum ursprünglichen Code erzeugt, stimmen die Quellpositionen nicht überein und Stack-Traces könnten auf die falsche Position im Quellcode zeigen.

Unter bestimmten Umständen konnte V8 unterschiedlichen Bytecode erzeugen, abhängig davon, ob eine Funktion [sofort oder verzögert kompiliert](/blog/preparser#skipping-inner-functions) wurde, da einige Parser-Informationen zwischen dem ursprünglichen sofortigen Parsen einer Funktion und der späteren verzögerten Kompilierung verloren gingen. Diese Diskrepanzen waren meist harmlos, z. B. der Verlust der Information, dass eine Variable unveränderlich ist, und sie daher nicht als solche optimiert werden konnte. Einige der durch diese Arbeit aufgedeckten Diskrepanzen konnten jedoch potenziell zu inkorrektem Codeverhalten unter bestimmten Umständen führen. Daher haben wir diese Diskrepanzen behoben und Prüfungen sowie einen Stressmodus hinzugefügt, um sicherzustellen, dass eine Funktion bei sofortiger und verzögerter Kompilierung stets konsistente Ergebnisse liefert. Dies erhöht unser Vertrauen in die Korrektheit und Konsistenz des V8-Parsers und Präparsers.

## Bytecode-Bereinigung

Aus JavaScript-Quellcode kompilierter Bytecode nimmt einen signifikanten Teil des V8-Heap-Speichers ein, typischerweise etwa 15 %, einschließlich zugehöriger Metadaten. Es gibt viele Funktionen, die nur während der Initialisierung ausgeführt oder nach ihrer Kompilierung selten genutzt werden.

Daher haben wir die Unterstützung für das Entfernen von kompiliertem Bytecode aus Funktionen während der Speicherbereinigung hinzugefügt, wenn diese kürzlich nicht ausgeführt wurden. Um dies zu ermöglichen, verfolgen wir das *Alter* des Bytecodes einer Funktion, indem wir das *Alter* bei jeder [größeren (mark-kompakt)](/blog/trash-talk#major-gc) Speicherbereinigung inkrementieren und es auf null zurücksetzen, wenn die Funktion ausgeführt wird. Jeder Bytecode, der einen Altersgrenzwert überschreitet, kann bei der nächsten Speicherbereinigung gesammelt werden. Wenn er gesammelt und später erneut ausgeführt wird, wird er erneut kompiliert.

Es gab technische Herausforderungen, um sicherzustellen, dass Bytecode nur dann entfernt wird, wenn er nicht mehr benötigt wird. Beispielsweise könnte Funktion `A` eine andere lang laufende Funktion `B` aufrufen, und Funktion `A` könnte altern, während sie sich noch im Stack befindet. Wir wollen den Bytecode für Funktion `A` nicht entfernen, auch wenn sie ihre Altersgrenze erreicht, da wir zu ihr zurückkehren müssen, wenn die lang laufende Funktion `B` zurückkehrt. Daher behandeln wir Bytecode als schwach gehalten von einer Funktion, wenn er seine Altersgrenze erreicht, aber stark gehalten durch jede Referenz, die sich im Stack oder anderswo befindet. Wir entfernen den Code nur, wenn keine starken Verbindungen mehr bestehen.

Zusätzlich zum Entfernen von Bytecode entfernen wir auch Feedback-Vektoren, die mit diesen entfernten Funktionen assoziiert sind. Allerdings können wir Feedback-Vektoren nicht im gleichen GC-Zyklus wie den Bytecode entfernen, da sie nicht vom gleichen Objekt gehalten werden – Bytecode wird von einer native-kontextunabhängigen `SharedFunctionInfo` gehalten, während der Feedback-Vektor vom native-kontextabhängigen `JSFunction` gehalten wird. Daher entfernen wir Feedback-Vektoren im nachfolgenden GC-Zyklus.

![Die Objektanordnung für eine gealterte Funktion nach zwei GC-Zyklen.](/_img/v8-lite/bytecode-flushing.svg)

## Zusätzliche Optimierungen

Abgesehen von diesen größeren Projekten haben wir auch ein paar Ineffizienzen aufgedeckt und behoben.

Die erste war die Reduzierung der Größe von `FunctionTemplateInfo`-Objekten. Diese Objekte speichern interne Metadaten über [`FunctionTemplate`s](/docs/embed#templates), die verwendet werden, um Embedders wie Chrome zu ermöglichen, C++-Callback-Implementierungen von Funktionen bereitzustellen, die von JavaScript-Code aufgerufen werden können. Chrome führt viele FunctionTemplates ein, um DOM-Web-APIs zu implementieren, und daher trugen `FunctionTemplateInfo`-Objekte zur Heap-Größe von V8 bei. Nach Analyse der typischen Nutzung von FunctionTemplates fanden wir heraus, dass von den elf Feldern eines `FunctionTemplateInfo`-Objekts nur drei typischerweise auf einen nicht-Standardwert gesetzt waren. Wir haben daher das `FunctionTemplateInfo`-Objekt so umgestaltet, dass die seltenen Felder in einer Seitentabelle gespeichert werden, die nur bei Bedarf angelegt wird.

Die zweite Optimierung betrifft die Art, wie wir von TurboFan-optimiertem Code deoptimieren. Da TurboFan spekulative Optimierungen durchführt, könnte es erforderlich sein, zur Interpreter-Ausführung zurückzukehren (Deoptimierung), wenn bestimmte Bedingungen nicht mehr zutreffen. Jeder Deoptimierungspunkt hat eine ID, die der Laufzeit ermöglicht zu bestimmen, wo im Bytecode die Ausführung im Interpreter fortgesetzt werden soll. Bisher wurde diese ID berechnet, indem der optimierte Code an einen bestimmten Offset innerhalb einer großen Sprungtabelle sprang, die die richtige ID in ein Register lud und dann in die Laufzeit sprang, um die Deoptimierung durchzuführen. Dies hatte den Vorteil, dass im optimierten Code für jeden Deoptimierungspunkt nur eine einzige Sprunganweisung erforderlich war. Allerdings wurde die Sprungtabelle vorab alloziert und musste groß genug sein, um den gesamten Deoptimierungs-ID-Bereich zu unterstützen. Wir haben TurboFan stattdessen so geändert, dass Deoptimierungspunkte im optimierten Code die Deopt-ID direkt laden, bevor sie in die Laufzeit aufrufen. Dadurch konnten wir diese große Sprungtabelle vollständig entfernen, mit dem Nachteil einer leichten Zunahme der Größe des optimierten Codes.

## Ergebnisse

Die oben beschriebenen Optimierungen haben wir über die letzten sieben Releases von V8 veröffentlicht. Typischerweise wurden sie zuerst im *Lite-Modus* eingeführt und später in die Standardkonfiguration von V8 übernommen.

![Durchschnittliche Heap-Größe von V8 für eine Reihe typischer Webseiten auf einem AndroidGo-Gerät.](/_img/v8-lite/savings-by-release.svg)

![Seitenweise Aufschlüsselung der Speicherersparnisse von V8 v7.8 (Chrome 78) im Vergleich zu v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-page.svg)

In diesem Zeitraum haben wir die Heap-Größe von V8 durchschnittlich um 18 % über eine Reihe typischer Websites reduziert, was einer durchschnittlichen Verringerung von 1,5 MB für AndroidGo-Mobilgeräte mit niedriger Ausstattung entspricht. Dies war möglich, ohne dass die JavaScript-Leistung signifikant beeinträchtigt wurde, weder bei Benchmarks noch bei der Interaktion mit realen Webseiten.

*Lite-Modus* kann weitere Speicherersparnisse bieten, wenn auch auf Kosten der Durchsatzleistung der JavaScript-Ausführung durch das Deaktivieren von Funktionsoptimierungen. Im Durchschnitt bietet der *Lite-Modus* 22 % Speicherersparnis, wobei einige Seiten eine Reduktion von bis zu 32 % erreichen. Dies entspricht einer Reduktion der Heap-Größe von V8 um 1,8 MB auf einem AndroidGo-Gerät.

![Aufschlüsselung der Speicherersparnisse von V8 v7.8 (Chrome 78) im Vergleich zu v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-optimization.svg)

Wenn man die Auswirkungen jeder einzelnen Optimierung betrachtet, zeigt sich, dass verschiedene Seiten einen unterschiedlichen Anteil ihres Vorteils aus jeder dieser Optimierungen ziehen. Zukünftige Arbeiten werden weiterhin mögliche Optimierungen identifizieren, die den Speicherverbrauch von V8 weiter reduzieren können, ohne die rasend schnelle JavaScript-Ausführung zu beeinträchtigen.
