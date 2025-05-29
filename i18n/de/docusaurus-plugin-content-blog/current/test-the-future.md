---
title: "Helfen Sie uns, die Zukunft von V8 zu testen!"
author: "Daniel Clifford ([@expatdanno](https://twitter.com/expatdanno)), Originaler Münchner V8-Brauer"
date: "2017-02-14 13:33:37"
tags: 
  - internals
description: "Testen Sie die neue Compiler-Pipeline von V8 mit Ignition und TurboFan in Chrome Canary schon heute!"
---
Das V8-Team arbeitet derzeit an einer neuen Standard-Compiler-Pipeline, die uns helfen wird, zukünftige Geschwindigkeitssteigerungen für [realistische JavaScript-Anwendungen](/blog/real-world-performance) zu erreichen. Sie können die neue Pipeline schon heute in Chrome Canary testen, um uns zu helfen sicherzustellen, dass es keine Überraschungen gibt, wenn wir die neue Konfiguration auf allen Chrome-Kanälen einführen.

<!--truncate-->
Die neue Compiler-Pipeline verwendet den [Ignition Interpreter](/blog/ignition-interpreter) und den [TurboFan Compiler](/docs/turbofan), um sämtliches JavaScript auszuführen (anstelle der klassischen Pipeline, die aus den Full-codegen- und Crankshaft-Compilern bestand). Ein zufällig ausgewählter Teil der Benutzer von Chrome Canary und Chrome Developer Channel testet die neue Konfiguration bereits. Jeder kann jedoch die neue Pipeline aktivieren (oder zur alten zurückkehren), indem er eine Einstellung unter about:flags ändert.

Sie können helfen, die neue Pipeline zu testen, indem Sie sich dafür entscheiden und sie mit Chrome auf Ihren bevorzugten Websites verwenden. Wenn Sie ein Webentwickler sind, testen Sie bitte Ihre Webanwendungen mit der neuen Compiler-Pipeline. Sollten Sie eine Verschlechterung in Stabilität, Korrektheit oder Leistung feststellen, melden Sie bitte [das Problem im V8-Bug-Tracker](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).

## Wie man die neue Pipeline aktiviert

### In Chrome 58

1. Installieren Sie die neueste [Beta](https://www.google.com/chrome/browser/beta.html).
2. Öffnen Sie die URL `about:flags` in Chrome.
3. Suchen Sie nach "**Experimentelle JavaScript-Compiler-Pipeline**" und setzen Sie diese auf "**Aktiviert**".

![](/_img/test-the-future/58.png)

### In Chrome 59.0.3056 und höher

1. Installieren Sie die neueste Canary-Version [Canary](https://www.google.com/chrome/browser/canary.html) oder [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel).
2. Öffnen Sie die URL `about:flags` in Chrome.
3. Suchen Sie nach "**Klassische JavaScript-Compiler-Pipeline**" und setzen Sie diese auf "**Deaktiviert**".

![](/_img/test-the-future/59.png)

Der Standardwert ist "**Standard**", was bedeutet, dass entweder die neue **oder** die klassische Pipeline je nach A/B-Test-Konfiguration aktiv ist.

## Wie man Probleme meldet

Bitte teilen Sie uns mit, wenn sich Ihr Browserlebnis signifikant verändert, wenn Sie die neue Pipeline gegenüber der Standard-Pipeline verwenden. Wenn Sie ein Webentwickler sind, testen Sie bitte die Leistung der neuen Pipeline mit Ihrer (mobilen) Webanwendung, um festzustellen, wie sie davon betroffen ist. Wenn Sie feststellen, dass Ihre Webanwendung seltsam reagiert (oder Tests fehlschlagen), lassen Sie es uns wissen:

1. Stellen Sie sicher, dass Sie die neue Pipeline korrekt aktiviert haben, wie im vorherigen Abschnitt beschrieben.
2. [Erstellen Sie einen Bug im V8-Bug-Tracker](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).
3. Hängen Sie Beispielcode an, mit dem wir das Problem reproduzieren können.
