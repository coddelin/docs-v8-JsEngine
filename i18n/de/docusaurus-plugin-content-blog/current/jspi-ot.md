---
title: "WebAssembly JSPI geht in den Origin Trial"
description: "Wir erklären den Beginn des Origin Trials für JSPI"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-03-06
tags: 
  - WebAssembly
---
Die JavaScript Promise Integration (JSPI) API von WebAssembly tritt mit der Chrome-Version M123 in einen Origin Trial ein. Das bedeutet, dass Sie testen können, ob Sie und Ihre Nutzer von dieser neuen API profitieren können.

JSPI ist eine API, die es ermöglicht, sogenannten sequenziellen Code – der in WebAssembly kompiliert wurde – auf Web-APIs zuzugreifen, die _asynchron_ sind. Viele Web-APIs sind in Bezug auf JavaScript `Promise`s gestaltet: Anstatt die angeforderte Operation sofort auszuführen, geben sie ein `Promise` zurück, das dies tun wird. Wenn die Aktion schließlich ausgeführt wird, ruft der Task-Runner des Browsers alle Callbacks mit dem Promise auf. JSPI bindet sich in diese Architektur ein und ermöglicht einer WebAssembly-Anwendung, angehalten zu werden, wenn das `Promise` zurückgegeben wird, und wieder aufgenommen zu werden, wenn das `Promise` erfüllt wird.

<!--truncate-->
Weitere Informationen über JSPI und wie Sie es verwenden können, finden Sie [hier](https://v8.dev/blog/jspi), und die Spezifikation selbst ist [hier](https://github.com/WebAssembly/js-promise-integration).

## Anforderungen

Abgesehen von der Registrierung für einen Origin Trial müssen Sie auch das entsprechende WebAssembly und JavaScript generieren. Wenn Sie Emscripten verwenden, ist dies unkompliziert. Sie sollten sicherstellen, dass Sie mindestens Version 3.1.47 verwenden.

## Registrierung für den Origin Trial

JSPI ist noch in der Vorveröffentlichungsphase; es durchläuft derzeit einen Standardisierungsprozess und wird erst vollständig veröffentlicht, wenn Phase 4 dieses Prozesses erreicht ist. Um es heute zu verwenden, können Sie eine Flagge im Chrome-Browser setzen; oder Sie können sich für ein Origin Trial Token bewerben, das Ihren Nutzern Zugang dazu ermöglicht, ohne die Flagge selbst setzen zu müssen.

Um sich zu registrieren, können Sie [hier](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889) gehen. Achten Sie darauf, den Registrierungsprozess zu befolgen. Um mehr über Origin Trials im Allgemeinen zu erfahren, ist [dies](https://developer.chrome.com/docs/web-platform/origin-trials) ein guter Ausgangspunkt.

## Einige potenzielle Einschränkungen

Es gab einige [Diskussionen](https://github.com/WebAssembly/js-promise-integration/issues) in der WebAssembly-Community über einige Aspekte der JSPI-API. Infolgedessen sind einige Änderungen vorgesehen, die Zeit benötigen, um vollständig implementiert zu werden. Wir erwarten, dass diese Änderungen *soft gelauncht* werden: Wir werden die Änderungen teilen, sobald sie verfügbar sind, jedoch wird die bestehende API mindestens bis zum Ende des Origin Trials beibehalten.

Zusätzlich gibt es einige bekannte Probleme, die während des Origin Trial Zeitraums wahrscheinlich nicht vollständig gelöst werden:

Bei Anwendungen, die intensiv ausgelagerte Berechnungen erstellen, kann die Leistung einer umwickelten Sequenz (d. h. die Nutzung von JSPI, um auf eine asynchrone API zuzugreifen) leiden. Dies liegt daran, dass die Ressourcen, die beim Erstellen des umwickelten Aufrufs verwendet werden, nicht zwischen Aufrufen zwischengespeichert werden; wir verlassen uns auf die Garbage Collection, um die erstellten Stacks zu bereinigen.
Wir weisen jedem umwickelten Aufruf derzeit einen Stapelspeicher mit fester Größe zu. Dieser Stapel muss groß genug sein, um komplexe Anwendungen zu unterstützen. Allerdings kann dies dazu führen, dass eine Anwendung, die eine große Anzahl einfacher umwickelter Aufrufe _in Bearbeitung_ hat, einem Speicherengpass ausgesetzt ist.

Keines dieser Probleme wird wahrscheinlich die Experimentation mit JSPI behindern; wir erwarten, dass sie vor der offiziellen Veröffentlichung von JSPI adressiert werden.

## Feedback

Da JSPI ein standardisiertes Projekt ist, bevorzugen wir, dass alle Probleme und Rückmeldungen [hier](https://github.com/WebAssembly/js-promise-integration/issues) geteilt werden. Fehlerberichte können jedoch auch auf der standardmäßigen Chrome-Bug-Meldeseite [hier](https://issues.chromium.org/new) gemeldet werden. Wenn Sie ein Problem mit der Code-Generierung vermuten, nutzen Sie [diesen Link](https://github.com/emscripten-core/emscripten/issues), um ein Problem zu melden.

Abschließend würden wir gerne von Ihnen über jegliche Vorteile hören, die Sie entdeckt haben. Verwenden Sie den [Issue Tracker](https://github.com/WebAssembly/js-promise-integration/issues), um Ihre Erfahrungen zu teilen.
