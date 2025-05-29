---
title: "Building V8 mit GN"
description: "Dieses Dokument erklärt, wie man GN verwendet, um V8 zu bauen."
---
V8 wird mit Hilfe von [GN](https://gn.googlesource.com/gn/+/master/docs/) gebaut. GN ist eine Art Meta-Build-System, da es Build-Dateien für eine Reihe anderer Build-Systeme generiert. Wie Sie bauen, hängt daher davon ab, welches „Back-End“-Build-System und welchen Compiler Sie verwenden.
Die folgenden Anweisungen gehen davon aus, dass Sie bereits eine [Checkout von V8](/docs/source-code) haben und die [Build-Abhängigkeiten installiert](/docs/build) haben.

Weitere Informationen zu GN finden Sie in [Chromiums Dokumentation](https://www.chromium.org/developers/gn-build-configuration) oder [GNs eigenen Dokumentationen](https://gn.googlesource.com/gn/+/master/docs/).

Das Bauen von V8 aus dem Quellcode umfasst drei Schritte:

1. Build-Dateien generieren
1. Kompilieren
1. Tests ausführen

Es gibt zwei Workflows zum Bauen von V8:

- den Komfort-Workflow mit einem Hilfsskript namens `gm`, das alle drei Schritte schön kombiniert
- den einfachen Workflow, bei dem Sie separate Befehle auf einer niedrigeren Ebene für jeden Schritt manuell ausführen

## V8 bauen mit `gm` (der Komfort-Workflow)

`gm` ist ein Komfort-All-in-One-Skript, das Build-Dateien generiert, den Build auslöst und optional auch die Tests ausführt. Es ist in Ihrem V8-Checkout unter `tools/dev/gm.py` zu finden. Wir empfehlen, eine Alias für Ihre Shell-Konfiguration hinzuzufügen:

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

Sie können dann `gm` verwenden, um V8 für bekannte Konfigurationen, wie zum Beispiel `x64.release`, zu bauen:

```bash
gm x64.release
```

Um die Tests direkt nach dem Build auszuführen, führen Sie aus:

```bash
gm x64.release.check
```

`gm` gibt alle ausgeführten Befehle aus, was es einfach macht, sie nachzuverfolgen und bei Bedarf erneut auszuführen.

`gm` ermöglicht das Bauen der erforderlichen Binärdateien und das Ausführen spezifischer Tests mit einem einzigen Befehl:

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## V8 bauen: der einfache, manuelle Workflow

### Schritt 1: Build-Dateien generieren

Es gibt mehrere Möglichkeiten, die Build-Dateien zu generieren:

1. Der einfache, manuelle Workflow beinhaltet die direkte Verwendung von `gn`.
1. Ein Hilfsskript namens `v8gen` vereinfacht den Prozess für gängige Konfigurationen.

#### Build-Dateien mit `gn` generieren

Generieren Sie Build-Dateien für das Verzeichnis `out/foo` mit `gn`:

```bash
gn args out/foo
```

Dies öffnet ein Editorfenster zur Angabe der [`gn`-Argumente](https://gn.googlesource.com/gn/+/master/docs/reference.md). Alternativ können Sie die Argumente auf der Kommandozeile übergeben:

```bash
gn gen out/foo --args='is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true'
```

Dies generiert Build-Dateien für das Kompilieren von V8 mit dem Arm64-Simulator im Release-Modus unter Nutzung von `goma` für die Kompilierung.

Für einen Überblick über alle verfügbaren `gn`-Argumente führen Sie aus:

```bash
gn args out/foo --list
```

#### Build-Dateien mit `v8gen` generieren

Das V8-Repository enthält ein Komfort-Skript `v8gen`, um Build-Dateien für gängige Konfigurationen einfacher zu generieren. Wir empfehlen, eine Alias für Ihre Shell-Konfiguration hinzuzufügen:

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

Rufen Sie `v8gen --help` für weitere Informationen auf.

Listen Sie verfügbare Konfigurationen (oder Bots von einem Master):

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

Bauen Sie wie ein bestimmter Bot vom `client.v8`-Wasserfall im Ordner `foo`:

```bash
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
```

### Schritt 2: V8 kompilieren

Um das gesamte V8 zu bauen (angenommen, dass `gn` in den Ordner `x64.release` generiert wurde), führen Sie aus:

```bash
ninja -C out/x64.release
```

Um spezifische Ziele wie `d8` zu bauen, fügen Sie sie dem Befehl hinzu:

```bash
ninja -C out/x64.release d8
```

### Schritt 3: Tests ausführen

Sie können das Ausgabeverzeichnis an den Testtreiber übergeben. Andere relevante Flags werden aus dem Build abgeleitet:

```bash
tools/run-tests.py --outdir out/foo
```

Sie können auch Ihre zuletzt erstellte Build (in `out.gn`) testen:

```bash
tools/run-tests.py --gn
```

**Build-Probleme? Melden Sie einen Fehler unter [v8.dev/bug](https://v8.dev/bug) oder fragen Sie um Hilfe unter [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com).**
