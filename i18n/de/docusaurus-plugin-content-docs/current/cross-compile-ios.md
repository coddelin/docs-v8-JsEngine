---
title: "Cross-Compiling für iOS"
description: "Dieses Dokument erklärt, wie man V8 für iOS cross-kompiliert."
---
Diese Seite dient als kurze Einführung in den Aufbau von V8 für iOS-Ziele.

## Anforderungen

- Ein macOS (OS X) Host-Rechner mit installiertem Xcode.
- Ein 64-Bit-Ziel-iOS-Gerät (ältere 32-Bit-iOS-Geräte werden nicht unterstützt).
- V8 v7.5 oder neuer.
- jitless ist eine strenge Anforderung für iOS (Stand Dezember 2020). Bitte verwenden Sie daher die Flags '--expose_gc --jitless'

## Ersteinrichtung

Befolgen Sie [die Anweisungen zum Erstellen von V8](/docs/build).

Holen Sie zusätzliche Tools für die iOS-Cross-Kompilierung, indem Sie `target_os` in Ihrer `.gclient`-Konfigurationsdatei hinzufügen, die sich im übergeordneten Verzeichnis des `v8`-Quellverzeichnisses befindet:

```python
# [... andere Inhalte von .gclient, wie die Variable 'solutions' ...]
target_os = ['ios']
```

Nach der Aktualisierung von `.gclient` führen Sie `gclient sync` aus, um die zusätzlichen Tools herunterzuladen.

## Manueller Aufbau

Dieser Abschnitt zeigt, wie eine monolithische V8-Version für die Verwendung auf einem physischen iOS-Gerät oder dem Xcode-iOS-Simulator erstellt wird. Das Ergebnis des Aufbaus ist eine Datei `libv8_monolith.a`, die alle V8-Bibliotheken sowie den V8-Snapshot enthält.

Richten Sie die GN-Build-Dateien ein, indem Sie `gn args out/release-ios` ausführen und die folgenden Schlüssel einfügen:

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # "x64" für einen Simulator-Build.
target_os = "ios"
use_custom_libcxx = false             # Verwenden Sie Xcode's libcxx.
v8_enable_i18n_support = false        # Produziert eine kleinere Binärdatei.
v8_monolithic = true                  # Aktivieren Sie das v8_monolith-Ziel.
v8_use_external_startup_data = false  # Der Snapshot ist in der Binärdatei enthalten.
v8_enable_pointer_compression = false # Nicht auf iOS unterstützt.
```

Baue jetzt:

```bash
ninja -C out/release-ios v8_monolith
```

Fügen Sie schließlich die generierte Datei `libv8_monolith.a` als statische Bibliothek zu Ihrem Xcode-Projekt hinzu. Weitere Dokumentation zur Einbettung von V8 in Ihre Anwendung finden Sie unter [Erste Schritte mit der Einbettung von V8](/docs/embed).
