---
title: "Chromium mit V8 profilen"
description: "Dieses Dokument erklärt, wie man die CPU- und Heap-Profiler von V8 mit Chromium verwendet."
---
[V8’s CPU- und Heap-Profiler](/docs/profile) sind einfach aus den V8-Shells heraus zu verwenden, aber es könnte verwirrend erscheinen, wie man sie mit Chromium nutzt. Diese Seite sollte Ihnen dabei helfen.

## Warum ist die Verwendung der V8-Profiler mit Chromium anders als mit den V8-Shells?

Chromium ist eine komplexe Anwendung, im Gegensatz zu den V8-Shells. Unten finden Sie eine Liste von Chromium-Funktionen, die die Profiler-Nutzung beeinflussen:

- Jeder Renderer ist ein separater Prozess (okay, nicht tatsächlich jeder, aber lassen wir dieses Detail aus), daher können sie keine gemeinsamen Logdateien verwenden;
- Die Sandbox rund um den Renderer-Prozess verhindert, dass dieser auf eine Festplatte schreiben kann;
- Die Developer Tools konfigurieren die Profiler für ihre eigenen Zwecke;
- Der Logging-Code von V8 enthält einige Optimierungen, um die Überprüfung des Logging-Status zu vereinfachen.

## Wie startet man Chromium, um ein CPU-Profil zu erhalten?

So können Sie Chromium starten, um ein CPU-Profil ab dem Start des Prozesses zu erhalten:

```bash
./Chromium --no-sandbox --user-data-dir=`mktemp -d` --incognito --js-flags='--prof'
```

Bitte beachten Sie, dass Sie keine Profile in den Developer Tools sehen werden, da alle Daten in einer Datei und nicht in den Developer Tools protokolliert werden.

### Beschreibung der Flags

`--no-sandbox` deaktiviert die Renderer-Sandbox, sodass Chrome in die Logdatei schreiben kann.

`--user-data-dir` wird verwendet, um ein frisches Profil zu erstellen. Nutzen Sie dies, um Caches und potenzielle Nebeneffekte von installierten Erweiterungen zu vermeiden (optional).

`--incognito` wird verwendet, um zusätzliche Verschmutzungen Ihrer Ergebnisse zu verhindern (optional).

`--js-flags` enthält die an V8 übergebenen Flags:

- `--logfile=%t.log` legt ein Namensmuster für Logdateien fest. `%t` wird in die aktuelle Zeit in Millisekunden umgewandelt, sodass jeder Prozess seine eigene Logdatei erhält. Sie können Präfixe und Suffixe verwenden, wenn Sie möchten, wie z. B.: `prefix-%t-suffix.log`. Standardmäßig erhält jedes Isolat eine separate Logdatei.
- `--prof` weist V8 an, statistische Profildaten in die Logdatei zu schreiben.

## Android

Chrome auf Android hat einige einzigartige Aspekte, die das Profiling etwas komplexer machen.

- Die Befehlszeile muss über `adb` geschrieben werden, bevor Chrome auf dem Gerät gestartet wird. Dadurch gehen manchmal Anführungszeichen in der Befehlszeile verloren, und es ist am besten, Argumente in `--js-flags` mit einem Komma zu trennen, anstatt Leerzeichen und Anführungszeichen zu verwenden.
- Der Pfad für die Logdatei muss als absoluter Pfad angegeben werden, der auf dem Android-Dateisystem beschreibbar ist.
- Aufgrund der Sandbox für Renderer-Prozesse auf Android kann der Renderer-Prozess selbst mit `--no-sandbox` nicht auf das Dateisystem schreiben. Daher muss `--single-process` angegeben werden, um den Renderer im selben Prozess wie den Browser-Prozess auszuführen.
- Die `.so`-Datei ist in der APK von Chrome eingebettet, was bedeutet, dass die Symbolisierung von APK-Speicheradressen in die nicht entkleidete `.so`-Datei in den Builds umgewandelt werden muss.

Die folgenden Befehle aktivieren das Profiling auf Android:

```bash
./build/android/adb_chrome_public_command_line --no-sandbox --single-process --js-flags='--logfile=/storage/emulated/0/Download/%t.log,--prof'
<Schließen und Neustarten von Chrome auf dem Android-Gerät>
adb pull /storage/emulated/0/Download/<logfile>
./src/v8/tools/linux-tick-processor --apk-embedded-library=out/Release/lib.unstripped/libchrome.so --preprocess <logfile>
```

## Hinweise

Unter Windows sollten Sie sicherstellen, dass die Erstellung der `.MAP`-Datei für `chrome.dll` aktiviert ist, jedoch nicht für `chrome.exe`.
