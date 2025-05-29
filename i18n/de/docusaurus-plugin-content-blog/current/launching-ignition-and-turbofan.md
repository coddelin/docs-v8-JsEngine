---
title: "Einführung von Ignition und TurboFan"
author: "das V8-Team"
date: "2017-05-15 13:33:37"
tags: 
  - internals
description: "V8 v5.9 kommt mit einer brandneuen JavaScript-Ausführungspipeline, die auf dem Ignition-Interpreter und dem TurboFan-optimierenden Compiler basiert."
---
Heute freuen wir uns, die Einführung einer neuen JavaScript-Ausführungspipeline für V8 v5.9 bekannt zu geben, die in Chrome Stable in v59 verfügbar sein wird. Mit der neuen Pipeline erzielen wir große Leistungsverbesserungen und erhebliche Speicherersparnisse bei realen JavaScript-Anwendungen. Wir werden die Zahlen am Ende dieses Beitrags genauer diskutieren, aber zuerst werfen wir einen Blick auf die Pipeline selbst.

<!--truncate-->
Die neue Pipeline basiert auf [Ignition](/docs/ignition), dem Interpreter von V8, und [TurboFan](/docs/turbofan), dem neuesten optimierenden Compiler von V8. Diese Technologien [sollten](/blog/turbofan-jit) [bekannt sein](/blog/ignition-interpreter) [für diejenigen von euch](/blog/test-the-future), die den V8-Blog in den letzten Jahren verfolgt haben, aber der Wechsel zur neuen Pipeline markiert einen großen neuen Meilenstein für beide.

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo für Ignition, den brandneuen Interpreter von V8</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo für TurboFan, den brandneuen optimierenden Compiler von V8</figcaption>
</figure>

Zum ersten Mal werden Ignition und TurboFan universell und ausschließlich für die JavaScript-Ausführung in V8 v5.9 verwendet. Außerdem werden ab v5.9 Full-codegen und Crankshaft, die Technologien, die [V8 seit 2010 gut gedient haben](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), nicht mehr für die JavaScript-Ausführung in V8 verwendet, da sie mit neuen Funktionen der JavaScript-Sprache und den für diese Funktionen erforderlichen Optimierungen nicht mehr mithalten können. Wir planen, sie sehr bald vollständig zu entfernen. Das bedeutet, dass V8 in Zukunft eine insgesamt viel einfachere und wartungsfreundlichere Architektur haben wird.

## Eine lange Reise

Die kombinierte Ignition- und TurboFan-Pipeline ist fast 3½ Jahre in Entwicklung. Sie stellt die Summe der kollektiven Erkenntnisse dar, die das V8-Team durch die Messung der Leistung realer JavaScript-Anwendungen und die sorgfältige Berücksichtigung der Schwächen von Full-codegen und Crankshaft gewonnen hat. Sie ist eine Grundlage, mit der wir die gesamte JavaScript-Sprache auch in den kommenden Jahren weiter optimieren können.

Das TurboFan-Projekt begann ursprünglich Ende 2013, um die Schwächen von Crankshaft zu adressieren. Crankshaft kann nur eine Teilmenge der JavaScript-Sprache optimieren. Beispielsweise wurde es nicht entwickelt, um JavaScript-Code zu optimieren, der strukturierte Ausnahmebehandlung verwendet, d.h. Codeblöcke, die durch die Schlüsselwörter try, catch und finally von JavaScript gekennzeichnet sind. Es ist schwierig, Crankshaft um Unterstützung für neue Sprachfunktionen zu erweitern, da diese Funktionen fast immer erfordern, dass architekturspezifischer Code für neun unterstützte Plattformen geschrieben wird. Darüber hinaus ist die Architektur von Crankshaft in ihrem Umfang begrenzt, wenn es darum geht, optimalen Maschinencode zu generieren. Es kann aus JavaScript nur so viel Leistung herausholen, obwohl das V8-Team mehr als zehntausend Codezeilen pro Chip-Architektur pflegen muss.

TurboFan wurde von Anfang an dazu entwickelt, nicht nur alle Sprachfunktionen zu optimieren, die in der JavaScript-Spezifikation zu der Zeit gefunden wurden, ES5, sondern auch alle zukünftigen Funktionen, die für ES2015 und darüber hinaus geplant waren. Es führt ein geschichtetes Compiler-Design ein, das eine klare Trennung zwischen hoch- und niedrigleveligen Compileroptimierungen ermöglicht, wodurch es einfach wird, neue Sprachfunktionen hinzuzufügen, ohne architekturspezifischen Code zu ändern. TurboFan fügt eine explizite Phase der Instruktionsauswahl in der Kompilierung hinzu, die es ermöglicht, weitaus weniger architekturspezifischen Code für jede unterstützte Plattform überhaupt zu schreiben. Mit dieser neuen Phase wird architekturspezifischer Code einmal geschrieben und muss selten geändert werden. Diese und andere Entscheidungen führen zu einem leichter wartbaren und erweiterbaren optimierenden Compiler für alle Architekturen, die V8 unterstützt.

Die ursprüngliche Motivation hinter dem Ignition-Interpreter von V8 war, den Speicherverbrauch auf Mobilgeräten zu reduzieren. Vor Ignition nahm der Code, der vom Full-codegen-Basiskompiler von V8 generiert wurde, typischerweise fast ein Drittel des gesamten JavaScript-Heaps in Chrome ein. Das ließ weniger Platz für die tatsächlichen Daten einer Webanwendung. Als Ignition für Chrome M53 auf Android-Geräten mit begrenztem RAM aktiviert wurde, schrumpfte der Speicherbedarf für Basis-JavaScript-Code ohne Optimierung auf ARM64-basierten Mobilgeräten um den Faktor neun.

Später nutzte das V8-Team die Tatsache, dass Ignitions Bytecode verwendet werden kann, um direkt optimierten Maschinencode mit TurboFan zu generieren, anstatt wie Crankshaft erneut aus dem Quellcode zu kompilieren. Der Bytecode von Ignition bietet ein saubereres und weniger fehleranfälliges Ausgangs-Ausführungsmodell in V8, was den Deoptimierungsmechanismus vereinfacht, der eine Schlüsselkomponente von V8s [adaptiver Optimierung](https://en.wikipedia.org/wiki/Adaptive_optimization) ist. Schließlich verbessert das Aktivieren von Ignition im Allgemeinen die Startzeit von Skripten und damit die Ladezeiten von Webseiten, da die Generierung von Bytecode schneller ist als die Generierung des Basiscodes von Full-codegen.

Durch die enge Verbindung des Designs von Ignition und TurboFan ergeben sich noch mehr Vorteile für die gesamte Architektur. Zum Beispiel schreibt das V8-Team anstelle von handgeschriebener Assemblercode für die Hochleistungs-Bytecode-Handler von Ignition stattdessen TurboFans [intermediate representation](https://en.wikipedia.org/wiki/Intermediate_representation), um die Funktionalität der Handler auszudrücken, und lässt TurboFan die Optimierung und endgültige Codegenerierung für die zahlreichen unterstützten Plattformen von V8 übernehmen. Dies stellt sicher, dass Ignition auf allen von V8 unterstützten Chip-Architekturen gut funktioniert, während gleichzeitig die Belastung durch die Wartung von neun separaten Plattform-Portierungen entfällt.

## Die Zahlen überprüfen

Abgesehen von der Geschichte werfen wir nun einen Blick auf die reale Leistung und den Speicherverbrauch der neuen Pipeline.

Das V8-Team überwacht kontinuierlich die Leistung von Anwendungsfällen aus der realen Welt mithilfe des [Telemetry - Catapult](https://catapult.gsrc.io/telemetry) Frameworks. [Früher](/blog/real-world-performance) haben wir in diesem Blog darüber gesprochen, warum es so wichtig ist, die Daten aus Tests der realen Welt zu verwenden, um unsere Arbeit zur Leistungsoptimierung voranzutreiben, und wie wir [WebPageReplay](https://github.com/chromium/web-page-replay) zusammen mit Telemetry dafür nutzen. Der Wechsel zu Ignition und TurboFan zeigt Leistungsverbesserungen in diesen realen Testfällen. Insbesondere führt die neue Pipeline zu deutlichen Beschleunigungen bei Benutzerinteraktions-Story-Tests für bekannte Websites:

![Reduzierung der in V8 verbrachten Zeit bei Benutzerinteraktions-Benchmarks](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

Obwohl Speedometer ein synthetischer Benchmark ist, haben wir zuvor festgestellt, dass es die realen Arbeitslasten moderner JavaScript-Anwendungen besser nachahmt als andere synthetische Benchmarks. Der Wechsel zu Ignition und TurboFan verbessert den Speedometer-Wert von V8 um 5%-10%, je nach Plattform und Gerät.

Die neue Pipeline beschleunigt auch serverseitiges JavaScript. [AcmeAir](https://github.com/acmeair/acmeair-nodejs), ein Benchmark für Node.js, der die Server-Backend-Implementierung einer fiktiven Fluggesellschaft simuliert, läuft mit V8 v5.9 mehr als 10% schneller.

![Verbesserungen bei Web- und Node.js-Benchmarks](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

Ignition und TurboFan reduzieren auch den gesamten Speicherbedarf von V8. In Chrome M59 reduziert die neue Pipeline den Speicherbedarf von V8 auf Desktop- und High-End-Mobilgeräten um 5-10%. Diese Reduktion ist das Ergebnis der Übertragung der Ignition-Speichereinsparungen, die zuvor in diesem Blog [erwähnt wurden](/blog/ignition-interpreter), auf alle von V8 unterstützten Geräte und Plattformen.

Diese Verbesserungen sind erst der Anfang. Die neue Ignition- und TurboFan-Pipeline ebnet den Weg für weitere Optimierungen, die die JavaScript-Leistung steigern und den Fußabdruck von V8 sowohl in Chrome als auch in Node.js in den kommenden Jahren verringern werden. Wir freuen uns darauf, diese Verbesserungen mit Ihnen zu teilen, wenn wir sie für Entwickler und Benutzer einführen. Bleiben Sie dran.
