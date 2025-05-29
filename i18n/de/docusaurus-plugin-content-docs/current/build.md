---
title: 'V8-Quellcode aus den Quellen bauen'
description: 'Dieses Dokument erklärt, wie man V8 aus den Quellen baut.'
---
Um in der Lage zu sein, V8 von Grund auf unter Windows/Linux/macOS für x64 zu bauen, folgen Sie bitte den folgenden Schritten.

## Den V8-Quellcode erhalten

Befolgen Sie die Anweisungen in unserem Leitfaden zum [Abrufen des V8-Quellcodes](/docs/source-code).

## Bau-Abhängigkeiten installieren

1. Für macOS: Installieren Sie Xcode und akzeptieren Sie die Lizenzvereinbarung. (Wenn Sie die Kommandozeilen-Tools separat installiert haben, [entfernen Sie diese zuerst](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1).)

1. Stellen Sie sicher, dass Sie sich im V8-Quellverzeichnis befinden. Wenn Sie alle Schritte im vorherigen Abschnitt befolgt haben, befinden Sie sich bereits am richtigen Ort.

1. Laden Sie alle Bau-Abhängigkeiten herunter:

   ```bash
   gclient sync
   ```

   Für Googler - Wenn Sie beim Ausführen der Hooks die Fehler „Failed to fetch file“ oder „Login required“ sehen, versuchen Sie zuerst, sich mit Google Storage zu authentifizieren, indem Sie Folgendes ausführen:

   ```bash
   gsutil.py config
   ```

   Melden Sie sich mit Ihrem @google.com-Account an und geben Sie `0` ein, wenn Sie nach einer Projekt-ID gefragt werden.

1. Dieser Schritt ist nur unter Linux erforderlich. Installieren Sie zusätzliche Bau-Abhängigkeiten:

    ```bash
    ./build/install-build-deps.sh
    ```

## V8 bauen

1. Stellen Sie sicher, dass Sie sich im V8-Quellverzeichnis im Branch `main` befinden.

    ```bash
    cd /path/to/v8
    ```

1. Ziehen Sie die neuesten Änderungen und installieren Sie neue Bau-Abhängigkeiten:

    ```bash
    git pull && gclient sync
    ```

1. Kompilieren Sie den Quellcode:

    ```bash
    tools/dev/gm.py x64.release
    ```

    Oder um den Quellcode zu kompilieren und sofort die Tests durchzuführen:

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    Weitere Informationen zum `gm.py`-Hilfsskript und den von ihm ausgelösten Befehlen finden Sie unter [Bauen mit GN](/docs/build-gn).
