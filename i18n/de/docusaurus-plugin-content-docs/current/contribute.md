---
title: &apos;Beitragen zu V8&apos;
description: &apos;Dieses Dokument erklärt, wie man zu V8 beiträgt.&apos;
---
Die Informationen auf dieser Seite erklären, wie man zu V8 beitragen kann. Stellen Sie sicher, dass Sie alles lesen, bevor Sie uns Ihren Beitrag senden.

## Holen Sie sich den Code

Siehe [Überprüfung des V8-Quellcodes](/docs/source-code).

## Bevor Sie beitragen

### Fragen Sie im V8-Mailverteiler nach Anleitung

Bevor Sie an einem größeren V8-Beitrag arbeiten, sollten Sie sich zuerst über [den V8-Beitrags-Mailverteiler](https://groups.google.com/group/v8-dev) mit uns in Verbindung setzen, damit wir helfen und Sie möglicherweise anleiten können. Eine frühzeitige Abstimmung erleichtert es, später Frustrationen zu vermeiden.

### Unterzeichnen Sie die CLA

Bevor wir Ihren Code verwenden können, müssen Sie das [Google Individual Contributor License Agreement](https://cla.developers.google.com/about/google-individual) unterzeichnen, was Sie online tun können. Dies ist hauptsächlich, weil Sie das Urheberrecht an Ihren Änderungen besitzen, selbst nachdem Ihr Beitrag Teil unserer Codebasis geworden ist. Daher brauchen wir Ihre Erlaubnis, Ihren Code zu nutzen und zu verbreiten. Wir müssen uns auch über verschiedene andere Dinge sicher sein, zum Beispiel, dass Sie uns darüber informieren, wenn Ihr Code Patente anderer verletzt. Sie müssen dies nicht tun, bis nachdem Sie Ihren Code zur Überprüfung eingereicht und ein Mitglied ihn genehmigt hat, aber Sie müssen es tun, bevor wir Ihren Code in unsere Codebasis aufnehmen können.

Beiträge von Unternehmen unterliegen einer anderen Vereinbarung als der oben genannten, der [Software Grant and Corporate Contributor License Agreement](https://cla.developers.google.com/about/google-corporate).

Unterzeichnen Sie sie online [hier](https://cla.developers.google.com/).

## Reichen Sie Ihren Code ein

Der Quellcode von V8 folgt dem [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html), daher sollten Sie sich mit diesen Richtlinien vertraut machen. Bevor Sie Code einreichen, müssen alle unsere [Tests](/docs/test) bestanden werden, und Sie müssen die Presubmit-Checks erfolgreich ausführen:

```bash
git cl presubmit
```

Das Presubmit-Skript verwendet einen Linter von Google, [`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py). Er ist Teil von [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools), und muss in Ihrem `PATH` sein — wenn Sie `depot_tools` in Ihrem `PATH` haben, sollte alles einfach funktionieren.

### Hochladen in das Codereview-Tool von V8

Alle Einsendungen, einschließlich Einsendungen von Projektmitgliedern, erfordern eine Überprüfung. Wir verwenden dieselben Code-Review-Tools und Prozesse wie das Chromium-Projekt. Um einen Patch einzureichen, benötigen Sie die [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools) und folgen diesen Anweisungen zum [Anfordern einer Überprüfung](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md) (unter Verwendung Ihres V8-Arbeitsbereichs anstelle eines Chromium-Arbeitsbereichs).

### Halten Sie Ausschau nach Fehlern oder Rückschritten

Sobald Sie die Codereview-Zustimmung haben, können Sie Ihren Patch mit der Commit-Warteschlange einreichen. Die Warteschlange führt eine Reihe von Tests durch und überträgt Ihren Patch, wenn alle Tests erfolgreich sind. Sobald Ihre Änderung übertragen wurde, ist es eine gute Idee, [die Konsole](https://ci.chromium.org/p/v8/g/main/console) zu überwachen, bis die Bots nach Ihrer Änderung grün werden, da die Konsole einige weitere Tests als die Commit-Warteschlange durchführt.
