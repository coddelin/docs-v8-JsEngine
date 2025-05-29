---
title: &apos;Blink-Webtests (auch bekannt als Layouttests)&apos;
description: &apos;Die Infrastruktur von V8 führt kontinuierlich die Webtests von Blink aus, um Integrationsprobleme mit Chromium zu verhindern. Dieses Dokument beschreibt, was zu tun ist, falls ein solcher Test fehlschlägt.&apos;
---
Wir führen kontinuierlich [Blinks Webtests (früher bekannt als „Layouttests“)](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md) in unserer [Integrationskonsole](https://ci.chromium.org/p/v8/g/integration/console) aus, um Integrationsprobleme mit Chromium zu verhindern.

Bei Testfehlern vergleichen die Bots die Ergebnisse von V8 Tip-of-Tree mit der gepinnten V8-Version von Chromium, um nur neu eingeführte V8-Probleme zu kennzeichnen (mit weniger als 5 % falschen Positiven). Die Schuldzuweisung ist trivial, da der [Linux-Release](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux)-Bot alle Revisionen testet.

Commits mit neu eingeführten Fehlern werden normalerweise zurückgesetzt, um das automatische Rollout in Chromium nicht zu blockieren. Falls Sie feststellen, dass Sie Layouttests brechen oder Ihr Commit aufgrund solcher Fehler zurückgesetzt wird, und wenn die Änderungen erwartet werden, folgen Sie diesem Verfahren, um aktualisierte Baselines zu Chromium hinzuzufügen, bevor Sie Ihren CL (erneut) einreichen:

1. Machen Sie eine Änderung in Chromium, die `[ Failure Pass ]` für die geänderten Tests einstellt ([mehr](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)).
1. Reichen Sie Ihren V8 CL ein und warten Sie 1-2 Tage, bis er in Chromium integriert ist.
1. Folgen Sie [diesen Anweisungen](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests), um die neuen Baselines manuell zu generieren. Beachten Sie, dass, wenn Sie Änderungen nur an Chromium vornehmen, [dieses bevorzugte automatische Verfahren](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline) für Sie funktionieren sollte.
1. Entfernen Sie den `[ Failure Pass ]`-Eintrag aus der Test-Erwartung-Datei und übermitteln Sie ihn zusammen mit den neuen Baselines in Chromium.

Bitte verbinden Sie alle CLs mit einem `Bug: …`-Footer.
