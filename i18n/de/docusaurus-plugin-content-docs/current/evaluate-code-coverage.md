---
title: "Bewertung der Codeabdeckung"
description: "Dieses Dokument erklärt, was zu tun ist, wenn Sie an einer Änderung in V8 arbeiten und deren Codeabdeckung bewerten möchten."
---
Sie arbeiten an einer Änderung. Sie möchten die Codeabdeckung für Ihren neuen Code bewerten.

V8 bietet zwei Tools dafür an: lokal auf Ihrem Rechner und Unterstützung durch die Build-Infrastruktur.

## Lokal

Im Stammverzeichnis des V8-Repos verwenden Sie `./tools/gcov.sh` (getestet auf Linux). Dies nutzt die Codeabdeckungstools von GNU und einige Skripte, um einen HTML-Bericht zu erstellen, in dem Sie die Abdeckungsinformationen nach Verzeichnis, Datei und bis hin zu Codezeilen detailiert ansehen können.

Das Skript baut V8 in einem separaten `out`-Verzeichnis mit `gcov`-Einstellungen. Wir verwenden ein separates Verzeichnis, um Ihre normalen Build-Einstellungen nicht zu überschreiben. Dieses separate Verzeichnis heißt `cov` und wird direkt im Stammverzeichnis des Repos erstellt. Anschließend führt `gcov.sh` die Testsuite aus und erstellt den Bericht. Der Pfad zum Bericht wird bereitgestellt, sobald das Skript abgeschlossen ist.

Falls Ihre Änderung architekturspezifische Komponenten hat, können Sie die Abdeckung kumulativ aus architekturspezifischen Ausführungen sammeln.

```bash
./tools/gcov.sh x64 arm
```

Dabei wird für jede Architektur vor Ort neu erstellt, die Binärdateien des vorherigen Durchlaufs werden überschrieben, aber die Abdeckungsergebnisse bleiben erhalten und werden kumuliert.

Das Skript sammelt standardmäßig aus `Release`-Läufen. Wenn Sie `Debug` möchten, können Sie dies angeben:

```bash
BUILD_TYPE=Debug ./tools/gcov.sh x64 arm arm64
```

Wenn Sie das Skript ohne Optionen ausführen, erhalten Sie eine Übersicht über die verfügbaren Optionen.

## Codeabdeckungs-Bot

Für jede gelandete Änderung führen wir eine X64-Abdeckungsanalyse durch — siehe den [Abdeckungs-Bot](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20gcov%20coverage). Wir führen keine Bots für die Abdeckung anderer Architekturen aus.

Um den Bericht für einen bestimmten Durchlauf zu erhalten, sollten Sie die Build-Schritte auflisten, den “gsutil coverage report” (gegen Ende) finden und unter diesem den “Bericht” öffnen.
