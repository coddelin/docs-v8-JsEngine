---
title: "Einblicke in den TurboFan JIT"
author: "Ben L. Titzer, Software-Ingenieur und TurboFan-Mechaniker"
avatars: 
  - "ben-titzer"
date: "2015-07-13 13:33:37"
tags: 
  - internals
description: "Ein tiefgehender Blick auf das Design des neuen TurboFan-Optimierungskompilers von V8."
---
[Letzte Woche haben wir angekündigt](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html), dass TurboFan für bestimmte Arten von JavaScript aktiviert wurde. In diesem Beitrag möchten wir tiefer in das Design von TurboFan eintauchen.

<!--truncate-->
Performance steht schon immer im Mittelpunkt der Strategie von V8. TurboFan kombiniert eine hochmoderne Zwischenrepräsentation mit einer mehrschichtigen Übersetzungs- und Optimierungspipeline, um qualitativ besseren Maschinencode zu erzeugen, als es zuvor mit dem CrankShaft JIT möglich war. Die Optimierungen in TurboFan sind zahlreicher, fortschrittlicher und gründlicher als in CrankShaft und ermöglichen fluide Code-Bewegung, Kontrollflussoptimierungen und präzise numerische Bereichsanalysen, die zuvor unerreichbar waren.

## Eine geschichtete Architektur

Compiler neigen dazu, über die Zeit komplexer zu werden, da neue Sprachmerkmale unterstützt, neue Optimierungen hinzugefügt und neue Computerarchitekturen angesprochen werden. Mit TurboFan haben wir aus vielen Compilern gelernt und eine geschichtete Architektur entwickelt, die es dem Compiler ermöglicht, diese Anforderungen im Laufe der Zeit zu bewältigen. Eine klarere Trennung zwischen der Quellsprachenebene (JavaScript), den Fähigkeiten der VM (V8) und den Komplexitäten der Architektur (von x86 bis ARM bis MIPS) führt zu saubererem und robusterem Code. Die Schichtung ermöglicht es Entwicklern, lokal zu denken, wenn sie Optimierungen und Features implementieren, und effektivere Unit-Tests zu schreiben. Es spart auch Code. Jede der 7 von TurboFan unterstützten Zielarchitekturen benötigt weniger als 3000 Zeilen plattformspezifischen Code im Vergleich zu 13.000-16.000 in CrankShaft. Dies ermöglichte Ingenieuren bei ARM, Intel, MIPS und IBM, viel effektiver zu TurboFan beizutragen. TurboFan ist besser in der Lage, alle kommenden Funktionen von ES6 zu unterstützen, da sein flexibles Design die JavaScript-Frontend von den architekturabhängigen Backends trennt.

## Fortschrittlichere Optimierungen

Der TurboFan JIT implementiert aggressivere Optimierungen als CrankShaft durch eine Reihe fortschrittlicher Techniken. JavaScript durchläuft die Compiler-Pipeline in einer größtenteils unoptimierten Form und wird nach und nach in immer niedrigere Formen übersetzt und optimiert, bis Maschinencode erzeugt wird. Das Herzstück des Designs ist eine entspanntere „Sea-of-Nodes“-Interne Repräsentation (IR) des Codes, die effektivere Umordnungen und Optimierungen ermöglicht.

![Beispiel TurboFan-Diagramm](/_img/turbofan-jit/example-graph.png)

Die numerische Bereichsanalyse hilft TurboFan, Code zum Umgang mit Zahlen viel besser zu verstehen. Die graphenbasierte IR ermöglicht es, die meisten Optimierungen als einfache lokale Reduktionen auszudrücken, die einfacher zu schreiben und unabhängig zu testen sind. Eine Optimierungs-Engine wendet diese lokalen Regeln systematisch und gründlich an. Der Übergang aus der graphischen Darstellung erfolgt durch einen innovativen Planungsalgorithmus, der die Umordnungsfreiheit nutzt, um Code aus Schleifen heraus und in weniger häufig ausführbare Pfade zu verschieben. Schließlich nutzen architekturspezifische Optimierungen wie komplexe Instruktionsauswahl die Eigenschaften jeder Zielplattform aus, um die bestmögliche Codequalität zu erzielen.

## Eine neue Leistungsebene liefern

Wir [sehen bereits deutliche Geschwindigkeitssteigerungen](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html) mit TurboFan, aber es gibt noch eine Menge zu tun. Bleiben Sie dran, während wir weitere Optimierungen aktivieren und TurboFan für weitere Arten von Code einschalten!
