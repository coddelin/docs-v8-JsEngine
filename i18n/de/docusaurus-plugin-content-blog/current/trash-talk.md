---
title: &apos;Trash talk: der Orinoco Müllsammler&apos;
author: &apos;Peter ‘der Garbo’ Marshall ([@hooraybuffer](https://twitter.com/hooraybuffer))&apos;
avatars:
  - &apos;peter-marshall&apos;
date: 2019-01-03 17:45:34
tags:
  - internals
  - speicher
  - präsentationen
description: &apos;Orinoco, V8s Müllsammler, entwickelte sich von einer sequentiellen Stop-the-World-Implementierung zu einem überwiegend parallelen und gleichzeitigen Sammler mit inkrementellem Fallback.&apos;
tweet: &apos;1080867305532416000&apos;
---
Im Laufe der letzten Jahre hat sich der V8-Müllsammler (GC) stark verändert. Das Orinoco-Projekt hat einen sequentiellen Stop-the-World-Müllsammler in einen überwiegend parallelen und gleichzeitigen Sammler mit inkrementellem Fallback verwandelt.

<!--truncate-->
:::note
**Hinweis:** Wenn Sie lieber eine Präsentation ansehen als Artikel lesen, genießen Sie das unten stehende Video! Andernfalls überspringen Sie das Video und lesen weiter.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/Scxz6jVS4Ls" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Jeder Müllsammler hat einige wesentliche Aufgaben, die er regelmäßig durchführen muss:

1. Lebende/tote Objekte identifizieren
1. Den Speicher von toten Objekten recyceln/wiederverwenden
1. Speicher komprimieren/defragmentieren (optional)

Diese Aufgaben können nacheinander ausgeführt werden oder willkürlich ineinander übergehen. Ein einfacher Ansatz besteht darin, die JavaScript-Ausführung anzuhalten und jede dieser Aufgaben nacheinander im Hauptthread auszuführen. Dies kann zu Ruckeln und Latenzproblemen im Hauptthread führen, wie wir [in früheren](/blog/jank-busters) [Blogposts](/blog/orinoco) besprochen haben, sowie zu einer geringeren Programmdurchsatzrate.

## Großes GC (Vollständige Markierungs-Kompaktierung)

Das große GC sammelt Müll aus dem gesamten Speicherbereich.

![Das große GC erfolgt in drei Phasen: Markieren, Kehren und Kompaktieren.](/_img/trash-talk/01.svg)

### Markieren

Das Feststellen, welche Objekte gesammelt werden können, ist ein wesentlicher Bestandteil der Müllsammlung. Müllsammler tun dies, indem sie die Erreichbarkeit als Proxy für die „Lebendigkeit“ verwenden. Dies bedeutet, dass jedes Objekt, das derzeit im Laufzeitumfeld erreichbar ist, behalten werden muss, und alle unerreichbaren Objekte gesammelt werden können.

Markieren ist der Prozess, durch den erreichbare Objekte gefunden werden. Der GC beginnt mit einer Menge bekannter Objektzeiger, dem sogenannten Wurzelset. Dazu gehören der Ausführungsstapel und das globale Objekt. Von dort aus folgt er jedem Zeiger zu einem JavaScript-Objekt und markiert dieses Objekt als erreichbar. Der GC folgt jedem Zeiger in diesem Objekt und setzt diesen Prozess rekursiv fort, bis jedes Objekt, das im Laufzeitumfeld erreichbar ist, gefunden und markiert worden ist.

### Kehren

Kehren ist ein Prozess, bei dem Lücken im Speicher, die von toten Objekten hinterlassen wurden, zu einer Datenstruktur namens Freiliste hinzugefügt werden. Sobald das Markieren abgeschlossen ist, findet der GC zusammenhängende Lücken, die von unerreichbaren Objekten hinterlassen wurden, und fügt sie der entsprechenden Freiliste hinzu. Freilisten sind nach der Größe des Speicherblocks getrennt, um eine schnelle Suche zu ermöglichen. In der Zukunft, wenn wir Speicher zuweisen wollen, schauen wir einfach in die Freiliste und finden einen Block mit der passenden Größe.

### Kompaktierung

Das große GC entscheidet auch, einige Seiten zu evakuieren/kompaktieren, basierend auf einem Fragmentierungsheuristik. Sie können Kompaktierung wie die Festplatten-Defragmentierung eines alten PCs betrachten. Wir kopieren überlebende Objekte in andere Seiten, die momentan nicht kompaktiert werden (unter Verwendung der Freiliste für diese Seite). Auf diese Weise können wir die kleinen und verstreuten Lücken im Speicher nutzen, die von toten Objekten hinterlassen wurden.

Eine mögliche Schwäche eines Müllsammlers, der überlebende Objekte kopiert, besteht darin, dass wir bei der Zuweisung vieler langlebiger Objekte hohe Kosten für das Kopieren dieser Objekte zahlen. Deshalb entscheiden wir uns, nur einige stark fragmentierte Seiten zu komprimieren, während wir bei anderen einfach nur das Kehren durchführen, das keine überlebenden Objekte kopiert.

## Generationslayout

Der Speicherbereich in V8 ist in verschiedene Regionen unterteilt, die [Generationen](/blog/orinoco-parallel-scavenger) genannt werden. Es gibt eine junge Generation (weiter unterteilt in ‚Kinderstube‘ und ‚Zwischen‘-Untergenerationen) und eine alte Generation. Objekte werden zuerst in der Kinderstube zugewiesen. Wenn sie das nächste GC überleben, verbleiben sie in der jungen Generation, gelten jedoch als ‚Zwischen‘. Wenn sie ein weiteres GC überleben, werden sie in die alte Generation verschoben.

![Der V8-Speicherbereich ist in Generationen unterteilt. Objekte werden durch Generationen bewegt, wenn sie ein GC überleben.](/_img/trash-talk/02.svg)

In der Müllsammlung gibt es einen wichtigen Begriff: „Die Generationen-Hypothese“. Diese besagt im Wesentlichen, dass die meisten Objekte jung sterben. Mit anderen Worten: die meisten Objekte werden zugewiesen und werden dann aus Sicht des GC fast sofort wieder unerreichbar. Dies gilt nicht nur für V8 oder JavaScript, sondern auch für die meisten dynamischen Sprachen.

Das generative Heap-Layout von V8 ist darauf ausgelegt, diese Tatsache über die Lebensdauer von Objekten zu nutzen. Der GC ist ein kompaktierender/verlagernder GC, was bedeutet, dass er Objekte kopiert, die die Müllsammlung überleben. Das erscheint kontraintuitiv: Das Kopieren von Objekten ist zur GC-Zeit teuer. Aber wir wissen, dass nur ein sehr kleiner Prozentsatz von Objekten tatsächlich eine Müllsammlung übersteht, gemäß der generativen Hypothese. Indem wir nur die Objekte verschieben, die überleben, wird jede andere Zuordnung zu ‚implizitem‘ Müll. Das bedeutet, dass wir nur Kosten (für das Kopieren) proportional zur Anzahl der überlebenden Objekte zahlen, nicht zur Anzahl der Zuordnungen.

## Minor GC (Scavenger)

Es gibt zwei Müllsammler in V8. Der [**Major GC (Mark-Compact)**](#major-gc) sammelt Müll aus dem gesamten Heap ein. Der **Minor GC (Scavenger)** sammelt Müll in der jungen Generation ein. Der Major-GC ist effektiv beim Einsammeln von Müll aus dem gesamten Heap, aber die generative Hypothese sagt uns, dass neu zugewiesene Objekte sehr wahrscheinlich eine Müllsammlung benötigen.

Im Scavenger, der nur innerhalb der jungen Generation sammelt, werden überlebende Objekte immer auf eine neue Seite evakuiert. V8 verwendet ein ‚Halbraum‘-Design für die junge Generation. Das bedeutet, dass die Hälfte des gesamten Raums immer leer ist, um diesen Evakuierungsschritt zu ermöglichen. Während einer Scavenge wird dieser anfänglich leere Bereich als ‚To-Space‘ bezeichnet. Der Bereich, von dem wir kopieren, wird als ‚From-Space‘ bezeichnet. Im schlimmsten Fall könnte jedes Objekt die Scavenge überleben und wir müssten jedes Objekt kopieren.

Für die Scavenge haben wir ein zusätzliches Set von Wurzeln, die die old-to-new Referenzen darstellen. Dies sind Zeiger im alten Raum, die auf Objekte in der jungen Generation verweisen. Anstatt den gesamten Heap-Graph für jede Scavenge zu verfolgen, verwenden wir [Write-Barrieren](https://www.memorymanagement.org/glossary/w.html#term-write-barrier), um eine Liste von old-to-new Referenzen zu führen. In Kombination mit dem Stapel und den globalen Variablen kennen wir jede Referenz in die junge Generation, ohne den gesamten alten Raum durchqueren zu müssen.

Der Evakuierungsschritt verschiebt alle überlebenden Objekte in einen zusammenhängenden Speicherblock (innerhalb einer Seite). Dies hat den Vorteil, dass die Fragmentierung – durch tote Objekte verursachte Lücken – vollständig entfernt wird. Anschließend tauschen wir die beiden Räume aus, d. h. To-Space wird zu From-Space und umgekehrt. Sobald die GC abgeschlossen ist, erfolgen neue Zuordnungen an der nächsten freien Adresse im From-Space.

![Der Scavenger evakuiert lebende Objekte auf eine frische Seite.](/_img/trash-talk/03.svg)

Mit dieser Strategie allein läuft uns der Platz in der jungen Generation schnell aus. Objekte, die eine zweite GC überleben, werden in die alte Generation evakuiert, anstatt in die To-Space.

Der letzte Schritt der Scavenge besteht darin, die Zeiger zu aktualisieren, die auf die ursprünglichen Objekte verweisen, die verschoben wurden. Jedes kopierte Objekt hinterlässt eine Weiterleitungsadresse, die verwendet wird, um den ursprünglichen Zeiger so zu aktualisieren, dass er auf den neuen Speicherort zeigt.

![Der Scavenger evakuiert ‚Zwischenobjekte‘ in die alte Generation und ‚Kinderstubenobjekte‘ auf eine frische Seite.](/_img/trash-talk/04.svg)

Beim Scavenge führen wir tatsächlich diese drei Schritte – Markieren, Evakuieren und Aktualisieren der Zeiger – alle verschachtelt aus, anstatt sie in getrennten Phasen auszuführen.

## Orinoco

Die meisten dieser Algorithmen und Optimierungen sind in der Müllsammelliteratur üblich und finden sich in vielen Programmiersprachen mit Müllsammlung. Aber die Müllsammlung auf dem neuesten Stand der Technik ist weit fortgeschritten. Eine wichtige Metrik zur Messung der in der Müllsammlung verbrachten Zeit ist die Zeit, die der Hauptthread im Pausenmodus verbringt, während die GC durchgeführt wird. Bei traditionellen ‚Stop-the-World‘-Müllsammlern kann sich diese Zeit wirklich summieren, und die Zeit, die für die GC aufgewendet wird, wirkt sich direkt negativ auf das Benutzererlebnis aus, in Form von ruckeligen Seiten sowie schlechter Grafikdarstellung und Latenz.

<figure>
  <img src="/_img/v8-orinoco.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo für Orinoco, den Müllsammler von V8</figcaption>
</figure>

Orinoco ist der Codename des GC-Projekts, um die neuesten und besten parallelen, inkrementellen und gleichzeitigen Techniken für die Müllsammlung zu nutzen, um den Hauptthread zu entlasten. Es gibt einige Begriffe, die im Kontext der GC eine spezifische Bedeutung haben und es wert sind, im Detail definiert zu werden.

### Parallel

Parallel bedeutet, dass der Hauptthread und die Hilfsthreads ungefähr die gleiche Menge Arbeit gleichzeitig erledigen. Dies ist immer noch ein ‚Stop-the-World‘-Ansatz, aber die Gesamtpausenzeit wird nun durch die Anzahl der teilnehmenden Threads geteilt (plus etwas Synchronisationsaufwand). Dies ist die einfachste der drei Techniken. Der JavaScript-Heap ist pausiert, da kein JavaScript ausgeführt wird, sodass jeder Hilfsthread lediglich sicherstellen muss, dass der Zugriff auf Objekte, die ein anderer Helfer möglicherweise ebenfalls verwenden möchte, synchronisiert wird.

![Der Hauptthread und die Hilfsthreads arbeiten gleichzeitig an derselben Aufgabe.](/_img/trash-talk/05.svg)

### Inkremental

Incremental bedeutet, dass der Haupt-Thread intermittierend eine kleine Menge Arbeit erledigt. Wir führen während einer inkrementellen Pause keinen vollständigen GC durch, sondern nur einen kleinen Teil der insgesamt für den GC erforderlichen Arbeit. Dies ist schwieriger, da JavaScript zwischen jedem inkrementellen Arbeitsschritt ausgeführt wird, was bedeutet, dass sich der Zustand des Heaps geändert hat, was möglicherweise vorherige inkrementell durchgeführte Arbeiten ungültig macht. Wie Sie im Diagramm sehen können, reduziert dies nicht die Zeit, die auf dem Haupt-Thread verbracht wird (tatsächlich erhöht es diese in der Regel leicht), sondern verteilt sie nur über die Zeit. Dies ist dennoch eine gute Technik, um eines unserer ursprünglichen Probleme zu lösen: die Latenz des Haupt-Threads. Indem JavaScript intermittierend ausgeführt werden kann, jedoch auch weiterhin Aufgaben der Speicherbereinigung durchgeführt werden können, kann die Anwendung weiterhin auf Benutzereingaben reagieren und bei Animationen Fortschritte machen.

![Kleine Teile der GC-Aufgaben werden in die Ausführung des Haupt-Threads eingefügt.](/_img/trash-talk/06.svg)

### Gleichzeitig

Parallel bedeutet, dass der Haupt-Thread JavaScript konstant ausführt, während Helfer-Threads die GC-Arbeit vollständig im Hintergrund erledigen. Dies ist die schwierigste der drei Techniken: Alles im JavaScript-Heap kann sich jederzeit ändern, was die zuvor geleistete Arbeit ungültig macht. Dazu kommen jetzt Lese-/Schreibkonflikte, da Helfer-Threads und der Haupt-Thread gleichzeitig dieselben Objekte lesen oder ändern können. Der Vorteil hierbei ist, dass der Haupt-Thread völlig frei ist, JavaScript auszuführen — wenngleich es aufgrund einiger Synchronisationen mit den Helfer-Threads zu geringfügigem Overhead kommt.

![GC-Aufgaben erfolgen vollständig im Hintergrund. Der Haupt-Thread kann frei JavaScript ausführen.](/_img/trash-talk/07.svg)

## Zustand des GC in V8

### Scavenging

Heute nutzt V8 paralleles Scavenging, um Arbeit während der GC der jungen Generation auf Helfer-Threads zu verteilen. Jeder Thread erhält eine Anzahl von Zeigern, denen er folgt, und evakuiert eifrig alle lebenden Objekte in den To-Space. Die Scavenging-Aufgaben müssen sich über atomare Lese-/Schreib-/Vergleichs-und-Tausch-Operationen synchronisieren, wenn sie versuchen, ein Objekt zu evakuieren; eine andere Scavenging-Aufgabe könnte dasselbe Objekt über einen anderen Pfad gefunden haben und ebenfalls versuchen, es zu verschieben. Der Helfer, der das Objekt erfolgreich verschoben hat, geht dann zurück und aktualisiert den Zeiger. Er hinterlässt einen Weiterleitungszeiger, damit andere Arbeiter, die das Objekt erreichen, andere Zeiger aktualisieren können, wenn sie diese finden. Für eine schnelle, synchronisationsfreie Zuweisung überlebender Objekte verwenden die Scavenging-Aufgaben thread-lokale Zuweisungspufferspeicher.

![Parallel Scavenging verteilt die Scavenging-Arbeit auf mehrere Helfer-Threads und den Haupt-Thread.](/_img/trash-talk/08.svg)

### Major GC

Der Major-GC in V8 beginnt mit der gleichzeitigen Markierung. Wenn sich der Heap einer dynamisch berechneten Grenze nähert, werden gleichzeitige Markierungsaufgaben gestartet. Die Helfer erhalten jeweils eine Anzahl von Zeigern, denen sie folgen sollen, und markieren jedes Objekt, das sie finden, indem sie alle Referenzen aus gefundenen Objekten verfolgen. Das gleichzeitige Markieren erfolgt vollständig im Hintergrund, während JavaScript auf dem Haupt-Thread ausgeführt wird. [Write Barriers](https://dl.acm.org/citation.cfm?id=2025255) werden verwendet, um neue Referenzen zwischen Objekten nachzuverfolgen, die JavaScript während der gleichzeitigen Markierung erstellt.

![Der Major-GC verwendet gleichzeitiges Markieren und Sweepen sowie paralleles Verdichten und Zeigeraktualisieren.](/_img/trash-talk/09.svg)

Wenn die gleichzeitige Markierung abgeschlossen ist oder wir die dynamische Zuweisungsgrenze erreichen, führt der Haupt-Thread einen schnellen Markierungsabschluss durch. Die Pause des Haupt-Threads beginnt während dieser Phase. Dies stellt die gesamte Pausenzeit des Major-GC dar. Der Haupt-Thread scannt die Wurzeln erneut, um sicherzustellen, dass alle lebenden Objekte markiert sind, und startet dann zusammen mit einer Anzahl von Helfern paralleles Verdichten und Zeigeraktualisieren. Nicht alle Seiten im Old-Space sind für das Verdichten geeignet — diejenigen, die es nicht sind, werden mithilfe der zuvor erwähnten Free-Lists gesweeped. Während der Pause startet der Haupt-Thread gleichzeitige Sweepen-Aufgaben. Diese laufen parallel zu den Verdichtungsaufgaben und zum Haupt-Thread selbst — sie können sogar fortgesetzt werden, während JavaScript auf dem Haupt-Thread ausgeführt wird.

## Idle-Time GC

Benutzer von JavaScript haben keinen direkten Zugriff auf den Garbage Collector; er ist vollständig implementierungsdefiniert. V8 bietet jedoch eine Mechanismus für den Embedded-System, Garbage Collection zu triggern, auch wenn das JavaScript-Programm selbst dies nicht kann. Der GC kann 'Idle Tasks' posten, die optionale Arbeiten sind, die schließlich ohnehin ausgelöst würden. Embedded-Systeme wie Chrome könnten eine Vorstellung von freier oder untätiger Zeit haben. Zum Beispiel hat Chrome bei 60 Frames pro Sekunde ungefähr 16,6 ms Zeit, um jedes Frame einer Animation zu rendern. Wenn die Animationsarbeit früh abgeschlossen wird, kann Chrome einige dieser Idle Tasks ausführen, die der GC erstellt hat, in der freien Zeit vor dem nächsten Frame.

![Idle GC nutzt freie Zeit auf dem Haupt-Thread, um die GC-Arbeit proaktiv auszuführen.](/_img/trash-talk/10.svg)

Weitere Details finden Sie in [unserer ausführlichen Veröffentlichung über Idle-Time GC](https://queue.acm.org/detail.cfm?id=2977741).

## Erkenntnisse

Seit seiner Einführung hat sich der Garbage Collector in V8 erheblich weiterentwickelt. Die Hinzufügung von parallelen, inkrementellen und nebenläufigen Techniken zum bestehenden GC war eine mehrjährige Anstrengung, hat sich jedoch ausgezahlt, indem viele Arbeiten auf Hintergrundaufgaben verlagert wurden. Dies hat die Pausenzeiten, Latenz und Seitenladezeiten drastisch verbessert und Animationen, Scrollen und Benutzerinteraktionen wesentlich flüssiger gemacht. Der [parallele Scavenger](/blog/orinoco-parallel-scavenger) hat die Gesamtzeit der Müllsammlung der jungen Generation im Hauptthread je nach Arbeitslast um etwa 20 %–50 % reduziert. [Idle-time GC](/blog/free-garbage-collection) kann den JavaScript-Heap-Speicher von Gmail im Ruhezustand um 45 % reduzieren. [Nebenläufiges Markieren und Aufräumen](/blog/jank-busters) hat die Pausenzeiten in intensiven WebGL-Spielen um bis zu 50 % reduziert.

Aber die Arbeit hier ist noch nicht abgeschlossen. Die Reduzierung der Müllsammlungspausenzeiten ist weiterhin wichtig, um den Nutzern die beste Erfahrung im Web zu bieten, und wir untersuchen noch fortschrittlichere Techniken. Darüber hinaus verfügt auch Blink (der Renderer in Chrome) über einen Garbage Collector (genannt Oilpan), und wir arbeiten daran, die [Kooperation](https://dl.acm.org/citation.cfm?doid=3288538.3276521) zwischen den beiden Sammlern zu verbessern und einige der neuen Techniken von Orinoco nach Oilpan zu portieren.

Die meisten Entwickler müssen beim Entwickeln von JavaScript-Programmen nicht an den GC denken, aber das Verständnis einiger interner Aspekte kann Ihnen helfen, über Speicherverbrauch und nützliche Programmiermuster nachzudenken. Zum Beispiel sind durch die generationenbasierte Struktur des V8-Heaps kurzlebige Objekte tatsächlich sehr kostengünstig aus Sicht des Garbage Collectors, da wir nur für Objekte bezahlen, die die Sammlung überleben. Solche Muster funktionieren gut für viele Sprache mit Müllsammlern, nicht nur JavaScript.
