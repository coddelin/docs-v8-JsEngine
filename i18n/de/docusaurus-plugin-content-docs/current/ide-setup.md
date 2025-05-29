---
title: 'GUI und IDE-Setup'
description: 'Dieses Dokument enthält GUI- und IDE-spezifische Tipps für die Arbeit am V8-Codebasis.'
---
Der Quellcode von V8 kann online mit [Chromium Code Search](https://cs.chromium.org/chromium/src/v8/) durchsucht werden.

Das Git-Repository dieses Projekts kann mit vielen anderen Client-Programmen und Plug-ins verwendet werden. Siehe die Dokumentation Ihres Clients für weitere Informationen.

## Visual Studio Code und clangd

Anleitungen zum Einrichten von VSCode für V8 finden Sie in diesem [Dokument](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/). Dies ist derzeit (2021) die empfohlene Konfiguration.

## Eclipse

Anleitungen zum Einrichten von Eclipse für V8 finden Sie in diesem [Dokument](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/). Hinweis: Ab 2020 funktioniert die Indizierung von V8 mit Eclipse nicht gut.

## Visual Studio Code und cquery

VSCode und cquery bieten gute Navigationsfähigkeiten innerhalb des Codes. Es bietet „Gehe zu Definition“ sowie „Alle Verweise finden“ für C++-Symbole und funktioniert ziemlich gut. In diesem Abschnitt wird beschrieben, wie man eine grundlegende Konfiguration auf einem *nix-System einrichtet.

### VSCode installieren

Installieren Sie VSCode auf die bevorzugte Weise. Der Rest dieses Leitfadens geht davon aus, dass Sie VSCode über den Befehl `code` in der Kommandozeile ausführen können.

### cquery installieren

Klonen Sie cquery von [cquery](https://github.com/cquery-project/cquery) in ein beliebiges Verzeichnis. Wir verwenden `CQUERY_DIR="$HOME/cquery"` in diesem Guide.

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

Falls irgendetwas schiefläuft, stellen Sie sicher, dass Sie [cquerys Einführungsguide](https://github.com/cquery-project/cquery/wiki) lesen.

Sie können `git pull && git submodule update` verwenden, um cquery zu einem späteren Zeitpunkt zu aktualisieren (vergessen Sie nicht, mit `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8` neu zu erstellen).

### cquery-Plugin für VSCode installieren und konfigurieren

Installieren Sie die cquery-Erweiterung aus dem Marketplace in VSCode. Öffnen Sie VSCode in Ihrem V8-Verzeichnis:

```bash
cd v8
code .
```

Gehen Sie zu den Einstellungen in VSCode, zum Beispiel über die Tastenkombination <kbd>Ctrl</kbd> + <kbd>,</kbd>.

Fügen Sie die folgenden Einstellungen Ihrer Arbeitsbereichskonfiguration hinzu und passen Sie `YOURUSERNAME` und `YOURV8CHECKOUTDIR` entsprechend an.

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### `compile_commands.json` für cquery bereitstellen

Der letzte Schritt besteht darin, eine compile_commands.json für cquery zu erstellen. Diese Datei enthält die spezifischen Compiler-Kommandos, die zum Erstellen von V8 verwendet werden. Führen Sie den folgenden Befehl im V8-Verzeichnis aus:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

Dieser Befehl muss von Zeit zu Zeit erneut ausgeführt werden, um cquery neue Quelldateien beizubringen. Insbesondere sollten Sie den Befehl immer erneut ausführen, nachdem eine `BUILD.gn` geändert wurde.

### Weitere nützliche Einstellungen

Das automatische Schließen von Klammern in Visual Studio Code funktioniert nicht gut. Es kann deaktiviert werden mit

```json
"editor.autoClosingBrackets": false
```

in den Benutzereinstellungen.

Die folgenden Ausschlussmasken helfen dabei, unerwünschte Ergebnisse bei der Verwendung der Suchfunktion (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>) zu vermeiden:

```js
"files.exclude": {
  "**/.vscode": true,  // dies ist ein Standardwert
},
"search.exclude": {
  "**/out*": true,     // dies ist ein Standardwert
  "**/build*": true    // dies ist ein Standardwert
},
```
