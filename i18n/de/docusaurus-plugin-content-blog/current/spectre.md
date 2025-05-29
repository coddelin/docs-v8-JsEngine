---
title: "Ein Jahr mit Spectre: Eine V8-Perspektive"
author: "Ben L. Titzer und Jaroslav Sevcik"
avatars: 
  - "ben-titzer"
  - "jaroslav-sevcik"
date: "2019-04-23 14:15:22"
tags: 
  - sicherheit
tweet: "1120661732836499461"
description: "Das V8-Team beschreibt ihre Analyse- und Minderungstrategie für Spectre, eines der größten Computerschutzprobleme von 2018."
---
Am 3. Januar 2018 veröffentlichten Google Project Zero und andere [die ersten drei Schwachstellen](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) einer neuen Klasse von Sicherheitslücken, die CPUs betreffen, die spekulative Ausführung verwenden. Genannt wurden sie [Spectre](https://spectreattack.com/spectre.pdf) und [Meltdown](https://meltdownattack.com/meltdown.pdf). Mit den Mechanismen der [spekulativen Ausführung](https://de.wikipedia.org/wiki/Speculative_Ausführung) von CPUs kann ein Angreifer sowohl implizite als auch explizite Sicherheitsüberprüfungen im Code vorübergehend umgehen, die verhindern, dass Programme unautorisierte Daten aus dem Speicher lesen. Obwohl die Prozessor-Spekulation als mikroarchitektonisches Detail entworfen wurde, unsichtbar auf architektonischer Ebene, können sorgfältig gestaltete Programme unautorisierte Informationen während der Spekulation lesen und sie durch Seiteneffekte wie die Ausführungszeit eines Programmfragments preisgeben.

<!--truncate-->
Als gezeigt wurde, dass JavaScript für Spectre-Angriffe verwendet werden könnte, war das V8-Team in die Problembewältigung eingebunden. Wir bildeten ein Notfallreaktionsteam und arbeiteten eng mit anderen Teams bei Google, unseren Partnern bei anderen Browserherstellern und unseren Hardwarepartnern zusammen. Gemeinsam führten wir sowohl offensive Forschung (Erstellung von Proof-of-Concept-Gadgets) als auch defensive Forschung durch (Abwehrmaßnahmen für potenzielle Angriffe).

Ein Spectre-Angriff besteht aus zwei Teilen:

1. _Leak von ansonsten unzugänglichen Daten in den versteckten CPU-Zustand._ Alle bekannten Spectre-Angriffe nutzen Spekulation, um Bits von unzugänglichen Daten in CPU-Caches auszulagern.
1. _Extrahieren des versteckten Zustands_, um die unzugänglichen Daten wiederherzustellen. Dafür benötigt der Angreifer eine Uhr mit ausreichend hoher Präzision. (Erstaunlich niedrig auflösende Uhren können ausreichen, insbesondere mit Techniken wie Kantenwertschwellen.)

Theoretisch wäre es ausreichend, einen der beiden Bestandteile eines Angriffs zu besiegen. Da wir jedoch keine Möglichkeit kennen, einen der Bestandteile perfekt auszuschalten, entwarfen und deployten wir Maßnahmen, die die Menge der Informationen, die in CPU-Caches auslaufen, stark reduzieren _und_ Abwehrmaßnahmen, die es schwer machen, den versteckten Zustand wiederherzustellen.

## Hochpräzise Timer

Die winzigen Zustandsänderungen, die die spekulative Ausführung überleben können, führen zu entsprechend winzigen, nahezu unmöglich kleinen Zeitdifferenzen – im Bereich von einer Milliardstel Sekunde. Um einzelne solche Unterschiede direkt zu erkennen, benötigt ein Angreiferprogramm einen hochpräzisen Timer. CPUs bieten solche Timer, aber die Web-Plattform stellt diese nicht zur Verfügung. Der präziseste Timer der Web-Plattform, `performance.now()`, hatte ursprünglich eine Auflösung von einstelligen Mikrosekunden, die ursprünglich als unbrauchbar für diesen Zweck galt. Doch vor zwei Jahren veröffentlichte ein akademisches Forschungsteam, das auf mikroarchitektonische Angriffe spezialisiert ist, [eine Studie](https://gruss.cc/files/fantastictimers.pdf), die die Verfügbarkeit von Timern in der Web-Plattform untersuchte. Sie kamen zu dem Schluss, dass gemeinsam nutzbarer flüchtiger Speicher und verschiedene Methoden zur Auflösungswiederherstellung den Bau von Timern mit noch höherer Auflösung bis in den Nanosekundenbereich ermöglichen könnten. Solche Timer sind präzise genug, um einzelne L1-Cache-Treffer und -Fehler zu erkennen, was normalerweise die Methode ist, mit der Spectre-Gadgets Informationen auslagern.

## Timer-Minderungen

Um die Möglichkeit zu unterbrechen, kleine Zeitdifferenzen zu erkennen, verfolgten Browserhersteller einen mehrgleisigen Ansatz. In allen Browsern wurde die Auflösung von `performance.now()` reduziert (in Chrome von 5 Mikrosekunden auf 100), und es wurde ein zufälliges, einheitliches Jitter eingeführt, um die Wiederherstellung der Auflösung zu verhindern. Nach Konsultationen unter den Anbietern entschieden wir gemeinsam, den beispiellosen Schritt zu unternehmen, die API `SharedArrayBuffer` sofort und rückwirkend in allen Browsern zu deaktivieren, um den Bau eines Nanosekunden-Timers zu verhindern, der für Spectre-Angriffe verwendet werden könnte.

## Verstärkung

Früh in unserer offensiven Forschung wurde klar, dass allein Timer-Maßnahmen nicht ausreichen würden. Ein Grund dafür ist, dass ein Angreifer einfach sein Gadget wiederholt ausführen kann, sodass die kumulative Zeitdifferenz viel größer ist als ein einzelner Cache-Treffer oder -Fehler. Es gelang uns, zuverlässige Gadgets zu entwickeln, die viele Cache-Linien gleichzeitig verwenden, bis zur Cache-Kapazität, und Zeitunterschiede von bis zu 600 Mikrosekunden hervorbrachten. Später entdeckten wir willkürliche Verstärkungstechniken, die nicht durch die Cache-Kapazität begrenzt sind. Solche Verstärkungstechniken beruhen auf mehrfachen Versuchen, die geheimen Daten zu lesen.

## JIT-Minderungen

Um unzugängliche Daten mithilfe von Spectre zu lesen, bringt der Angreifer die CPU dazu, spekulativ Code auszuführen, der normalerweise unzugängliche Daten liest und sie im Cache kodiert. Der Angriff kann auf zwei Arten unterbrochen werden:

1. Verhinderung der spekulativen Codeausführung.
1. Verhinderung der spekulativen Ausführung, die unzugängliche Daten liest.

Wir haben (1) experimentell untersucht, indem wir die empfohlenen Spekulationsbarriere-Anweisungen wie Intels `LFENCE` bei jedem kritischen Bedingungszweig eingefügt und [Retpolines](https://support.google.com/faqs/answer/7625886) für indirekte Zweige verwendet haben. Leider führen derartige drastische Maßnahmen zu einer erheblichen Leistungsminderung (2–3× Verlangsamung im Octane-Benchmark). Stattdessen haben wir uns für Ansatz (2) entschieden und Mitigationssequenzen eingefügt, die verhindern, dass geheime Daten aufgrund von Fehl-Spekulationen gelesen werden. Nachfolgend veranschaulichen wir die Technik anhand des folgenden Code-Snippets:

```js
if (condition) {
  return a[i];
}
```

Der Einfachheit halber nehmen wir an, dass Bedingung `0` oder `1` ist. Der obige Code ist anfällig, wenn die CPU spekulativ von `a[i]` liest, wenn `i` außerhalb des gültigen Bereichs liegt und normalerweise unzugängliche Daten zugreift. Die wichtige Beobachtung ist, dass die Spekulation in einem solchen Fall versucht, `a[i]` zu lesen, wenn `condition` `0` ist. Unsere Mitigation schreibt dieses Programm so um, dass es sich genau wie das ursprüngliche Programm verhält, aber keine spekulativ geladene Daten preisgibt.

Wir reservieren ein CPU-Register, das wir als „Poison“ bezeichnet haben, um zu verfolgen, ob der Code in einem falsch vorhergesagten Zweig ausgeführt wird. Das Poison-Register wird über alle Zweige und Aufrufe im generierten Code hinweg geführt, sodass ein fehlvorhergesagter Zweig das Poison-Register auf `0` setzt. Dann instrumentieren wir alle Speicherzugriffe so, dass sie bedingungslos das Ergebnis aller Ladevorgänge mit dem aktuellen Wert des Poison-Registers maskieren. Dies verhindert nicht, dass der Prozessor Zweige vorher- oder fehlvorhersagt, zerstört aber die Informationen über die (möglicherweise außerhalb des gültigen Bereichs liegenden) geladenen Werte aufgrund fehlvorhergesagter Zweige. Der instrumentierte Code ist unten dargestellt (angenommen, dass `a` ein Zahlenarray ist).

```js/0,3,4
let poison = 1;
// …
if (condition) {
  poison *= condition;
  return a[i] * poison;
}
```

Der zusätzliche Code hat keine Auswirkungen auf das normale (architektonisch definierte) Verhalten des Programms. Er betrifft nur den Mikroarchitekturzustand beim Ausführen auf spekulierenden CPUs. Wenn das Programm auf Quellcodeebene instrumentiert wurde, könnten fortgeschrittene Optimierungen in modernen Compilern solche Instrumentierungen entfernen. Im V8 verhindern wir, dass unser Compiler die Mitigationsmaßnahmen entfernt, indem wir sie in einer sehr späten Kompilierschicht einfügen.

Wir verwenden auch die Poisoning-Technik, um Lecks aus fehlvorhergesagten indirekten Zweigen in der Bytecode-Dispatch-Schleife des Interpreters und in der JavaScript-Funktionsaufrufsequenz zu verhindern. Im Interpreter setzen wir das Poison auf `0`, wenn der Bytecode-Handler (d.h. die Maschinenkode-Sequenz, die einen einzelnen Bytecode interpretiert) nicht dem aktuellen Bytecode entspricht. Für JavaScript-Aufrufe übergeben wir die Zielfunktion als Parameter (in einem Register) und setzen das Poison am Anfang jeder Funktion auf `0`, wenn die eingehende Zielfunktion nicht der aktuellen Funktion entspricht. Mit den Poisoning-Mitigationsmaßnahmen sehen wir eine Verlangsamung von weniger als 20 % im Octane-Benchmark.

Die Mitigationsmaßnahmen für WebAssembly sind einfacher, da der Hauptsicherheitscheck darin besteht, sicherzustellen, dass Speicherzugriffe innerhalb der Grenzen liegen. Für 32-Bit-Plattformen polstern wir zusätzlich zu den normalen Grenzprüfungen alle Speicher auf die nächste Zweierpotenz und maskieren bedingungslos alle oberen Bits eines benutzerseitig bereitgestellten Speicherindexes. 64-Bit-Plattformen benötigen keine derartigen Mitigationsmaßnahmen, da die Implementierung virtuellen Speicher für Grenzprüfungen verwendet. Wir haben experimentiert, Switch/Case-Anweisungen zu Binär-Suchcode zu kompilieren, anstatt eine potenziell anfällige indirekte Verzweigung zu verwenden, aber dies ist in einigen Arbeitslasten zu kostspielig. Indirekte Aufrufe werden mit Retpolines geschützt.

## Software-Mitigationsmaßnahmen sind kein nachhaltiger Weg

Glücklicherweise oder unglücklicherweise hat unsere offensive Forschung viel schneller Fortschritte gemacht als unsere defensive Forschung, und wir haben schnell entdeckt, dass die softwareseitige Minderung aller möglichen Lecks durch Spectre nicht praktikabel war. Dies lag an einer Vielzahl von Gründen. Erstens war der Ingenieuraufwand, der auf die Bekämpfung von Spectre abzielte, im Verhältnis zu dessen Bedrohungslevel unverhältnismäßig hoch. In V8 stehen wir vielen anderen Sicherheitsbedrohungen gegenüber, die deutlich schlimmer sind, wie z. B. direkte Out-of-Bound-Lesezugriffe aufgrund regulärer Fehler (schneller und direkter als Spectre), Out-of-Bound-Schreibzugriffe (mit Spectre unmöglich und schlimmer) sowie potenzielle Remote-Code-Ausführung (mit Spectre unmöglich und wesentlich schlimmer). Zweitens brachten die zunehmend komplizierten Maßnahmen, die wir entworfen und implementiert haben, erhebliche Komplexität mit sich, die technische Schulden darstellt und möglicherweise die Angriffsfläche erhöhen sowie Leistungsüberhänge verursachen könnte. Drittens ist das Testen und Warten von Maßnahmen zur Minderung von mikroarchitektonischen Lecks sogar noch schwieriger als das Entwerfen von Gadgets selbst, da es schwierig ist, sicherzustellen, dass die Maßnahmen weiterhin wie vorgesehen funktionieren. Mindestens einmal wurden wichtige Maßnahmen effektiv durch spätere Compiler-Optimierungen aufgehoben. Viertens stellten wir fest, dass eine effektive Minderung einiger Varianten von Spectre, insbesondere Variante 4, in Software einfach nicht praktikabel ist, selbst nach einem heldenhaften Einsatz unserer Partner bei Apple, die das Problem in ihrem JIT-Compiler bekämpften.

## Website-Isolation

Unsere Forschung kam zu dem Schluss, dass unzuverlässiger Code prinzipiell den gesamten Adressraum eines Prozesses mit Spectre und Seitenkanälen auslesen kann. Softwarebasierte Maßnahmen reduzieren die Effektivität vieler potenzieller Gadgets, sind jedoch nicht effizient oder umfassend. Die einzige effektive Maßnahme besteht darin, sensible Daten aus dem Adressraum des Prozesses zu entfernen. Glücklicherweise hatte Chrome bereits seit vielen Jahren eine Bemühung im Gange, Websites in separate Prozesse zu trennen, um die Angriffsfläche aufgrund konventioneller Schwachstellen zu reduzieren. Diese Investition zahlte sich aus, und wir haben [Website-Isolation](https://developers.google.com/web/updates/2018/07/site-isolation) bis Mai 2018 für so viele Plattformen wie möglich produktionsreif gemacht und implementiert. Damit setzt Chromes Sicherheitsmodell nicht mehr auf sprachbasierte Vertraulichkeit innerhalb eines Renderer-Prozesses.

Spectre war eine lange Reise und hat die besten Formen der Zusammenarbeit zwischen Anbietern in der Industrie und der Wissenschaft hervorgehoben. Bisher scheinen die „White Hats“ den „Black Hats“ voraus zu sein. Wir kennen weiterhin keine Angriffe in freier Wildbahn, abgesehen von neugierigen Bastlern und professionellen Forschern, die Proof-of-Concept-Gadgets entwickeln. Neue Varianten dieser Schwachstellen tauchen weiterhin auf und könnten dies noch eine Zeit lang tun. Wir verfolgen diese Bedrohungen weiterhin genau und nehmen sie ernst.

Wie viele mit einem Hintergrund in Programmiersprachen und deren Implementierungen glauben wir, dass sichere Sprachen eine richtige Abstraktionsgrenze erzwingen und es gut getypten Programmen nicht erlauben, beliebigen Speicher auszulesen — dies war eine Garantie, auf der unsere mentalen Modelle aufgebaut wurden. Es ist ein deprimierendes Fazit, dass unsere Modelle falsch waren — diese Garantie trifft auf heutige Hardware nicht zu. Natürlich glauben wir immer noch, dass sichere Sprachen große technische Vorteile bieten und weiterhin die Grundlage für die Zukunft sein werden, aber … auf heutiger Hardware verlieren sie ein wenig.

Interessierte Leser können weitere Details in [unserem Whitepaper](https://arxiv.org/pdf/1902.05178.pdf) finden.
