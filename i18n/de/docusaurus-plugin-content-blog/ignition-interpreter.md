---
title: "Zündung des Ignition-Interpreters"
author: "Ross McIlroy, V8 Ignition Jump Starter"
avatars: 
  - "ross-mcilroy"
date: "2016-08-23 13:33:37"
tags: 
  - internals
description: "Mit dem Ignition-Interpreter kompiliert V8 JavaScript-Funktionen in einen kompakten Bytecode, der nur 50 % bis 25 % der Größe des entsprechenden Baseline-Maschinencodes beträgt."
---
V8 und andere moderne JavaScript-Engines erzielen ihre Geschwindigkeit durch [Just-in-Time (JIT)-Kompilierung](https://de.wikipedia.org/wiki/Just-in-time-Kompilierung) von Skripten in nativen Maschinencode unmittelbar vor der Ausführung. Der Code wird zunächst von einem Baseline-Compiler kompiliert, der nicht optimierten Maschinencode schnell generieren kann. Der kompilierte Code wird während der Laufzeit analysiert und optional dynamisch mit einem fortschrittlicheren optimierenden Compiler für maximale Leistung erneut kompiliert. In V8 weist diese Skriptausführungspipeline eine Vielzahl von Sonderfällen und Bedingungen auf, die eine komplexe Mechanik erfordern, um zwischen dem Baseline-Compiler und zwei optimierenden Compilern, Crankshaft und TurboFan, zu wechseln.

<!--truncate-->
Ein Problem bei diesem Ansatz (neben der architektonischen Komplexität) ist, dass der JIT-generierte Maschinencode einen erheblichen Speicherplatz verbrauchen kann, auch wenn der Code nur einmal ausgeführt wird. Um diesen Overhead zu minimieren, hat das V8-Team einen neuen JavaScript-Interpreter namens Ignition entwickelt, der den Baseline-Compiler von V8 ersetzen kann, den Code mit weniger Speicherplatz ausführt und den Weg für eine einfachere Skriptausführungspipeline ebnet.

Mit Ignition kompiliert V8 JavaScript-Funktionen in einen kompakten Bytecode, der nur 50 % bis 25 % der Größe des entsprechenden Baseline-Maschinencodes beträgt. Dieser Bytecode wird dann von einem leistungsstarken Interpreter ausgeführt, der Ausführungsgeschwindigkeiten auf realen Websites liefert, die nahe an denen des von V8s bestehendem Baseline-Compiler generierten Codes liegen.

In Chrome 53 wird Ignition für Android-Geräte mit begrenztem RAM (512 MB oder weniger) aktiviert, wo Speicherersparnisse am dringendsten benötigt werden. Ergebnisse aus frühen Experimenten im Feld zeigen, dass Ignition den Speicherverbrauch jedes Chrome-Tabs um etwa 5 % reduziert.

![V8s Kompilierungspipeline mit aktiviertem Ignition](/_img/ignition-interpreter/ignition-pipeline.png)

## Details

Beim Aufbau des Ignition-Bytecode-Interpreters hat das Team eine Reihe von potenziellen Implementierungsansätzen in Betracht gezogen. Ein traditioneller Interpreter, der in C++ geschrieben ist, könnte nicht effizient mit dem restlichen generierten Code von V8 interagieren. Eine Alternative wäre gewesen, den Interpreter in Assemblersprache von Hand zu codieren, jedoch hätte dies angesichts der neun Architekturports, die V8 unterstützt, erheblichen technischen Aufwand bedeutet.

Stattdessen entschieden wir uns für einen Ansatz, der die Stärke von TurboFan, unserem neuen optimierenden Compiler, nutzt, der bereits für eine optimale Interaktion mit der V8-Laufzeit-Umgebung und anderem generierten Code optimiert ist. Der Ignition-Interpreter verwendet TurboFans niedrige, architekturunabhängige Makro-Assembler-Befehle, um Bytecode-Handler für jeden Opcode zu generieren. TurboFan kompiliert diese Befehle für die Zielarchitektur und führt dabei eine Auswahl auf niedriger Ebene und eine Maschinenregister-Allokation durch. Dies führt zu hoch optimiertem Interpreter-Code, der die Bytecode-Befehle mit geringem Overhead ausführen und mit der restlichen virtuellen Maschine von V8 in minimaler Weise interagieren kann, wobei nur eine minimale Menge neuer Mechanik in den Code integriert wird.

Ignition ist eine Registermaschine, bei der jeder Bytecode seine Eingaben und Ausgaben als explizite Register-Operanden angibt, im Gegensatz zu einer Stack-Maschine, bei der jeder Bytecode Eingaben konsumiert und Ausgaben auf einem impliziten Stack ablegt. Ein spezielles Akkumulatorregister fungiert als implizites Eingabe- und Ausgaberegister für viele Bytecodes. Dies reduziert die Größe der Bytecodes, da keine spezifischen Register-Operanden angegeben werden müssen. Da viele JavaScript-Ausdrücke Ketten von Operationen beinhalten, die von links nach rechts ausgewertet werden, können die temporären Ergebnisse dieser Operationen oft im Akkumulator verbleiben, während der Ausdruck ausgewertet wird, wodurch der Bedarf an Operationen, die in expliziten Registern geladen und gespeichert werden, minimiert wird.

Während der Bytecode generiert wird, durchläuft er eine Reihe von Inline-Optimierungsphasen. Diese Phasen führen einfache Analysen des Bytecode-Streams durch, ersetzen häufig vorkommende Muster durch schnellere Sequenzen, entfernen einige überflüssige Operationen und minimieren die Anzahl unnötiger Registerlade- und Transferoperationen. Zusammen reduzieren die Optimierungen die Größe des Bytecodes weiter und verbessern die Leistung.

Weitere Details zur Implementierung von Ignition finden Sie in unserem BlinkOn-Vortrag:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Zukunft

Bisher lag unser Fokus bei Ignition darauf, den Speicherbedarf von V8 zu reduzieren. Das Hinzufügen von Ignition zu unserer Skriptausführungspipeline eröffnet jedoch eine Reihe zukünftiger Möglichkeiten. Die Ignition-Pipeline wurde so entworfen, dass wir klügere Entscheidungen darüber treffen können, wann Code ausgeführt und optimiert werden sollte, um das Laden von Webseiten zu beschleunigen, Ruckler zu reduzieren und den Austausch zwischen den verschiedenen Komponenten von V8 effizienter zu gestalten.

Bleiben Sie dran für zukünftige Entwicklungen in Ignition und V8.
