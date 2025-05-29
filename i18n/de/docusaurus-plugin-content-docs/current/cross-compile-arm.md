---
title: &apos;Cross-Kompilierung und Debuggen für ARM/Android&apos;
description: &apos;Dieses Dokument erklärt, wie man V8 für ARM/Android cross-kompiliert und wie man es debuggt.&apos;
---
Zuerst stellen Sie sicher, dass Sie mit [GN bauen können](/docs/build-gn).

Fügen Sie dann `android` zu Ihrer `.gclient`-Konfigurationsdatei hinzu.

```python
target_os = [&apos;android&apos;]  # Fügen Sie dies hinzu, um die Android-Komponenten auszuchecken.
```

Das `target_os`-Feld ist eine Liste, daher sieht es so aus, wenn Sie auch unter Unix bauen:

```python
target_os = [&apos;android&apos;, &apos;unix&apos;]  # Mehrere Zielbetriebssysteme.
```

Führen Sie `gclient sync` aus, und Sie erhalten ein großes Checkout-Verzeichnis unter `./third_party/android_tools`.

Aktivieren Sie den Entwicklermodus auf Ihrem Telefon oder Tablet und schalten Sie USB-Debugging ein, indem Sie den Anweisungen [hier](https://developer.android.com/studio/run/device.html) folgen. Besorgen Sie sich außerdem das praktische [`adb`](https://developer.android.com/studio/command-line/adb.html)-Tool für Ihren Pfad. Es befindet sich in Ihrem Checkout unter `./third_party/android_sdk/public/platform-tools`.

## Verwendung von `gm`

Verwenden Sie [das Skript `tools/dev/gm.py`](/docs/build-gn#gm), um V8-Tests automatisch zu bauen und auf dem Gerät auszuführen.

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

Dieser Befehl überträgt die Binärdateien und Tests in das Verzeichnis `/data/local/tmp/v8` auf dem Gerät.

## Manueller Build

Verwenden Sie `v8gen.py`, um ein ARM-Release oder Debug-Build zu generieren:

```bash
tools/dev/v8gen.py arm.release
```

Führen Sie anschließend `gn args out.gn/arm.release` aus und stellen Sie sicher, dass Sie die folgenden Schlüssel haben:

```python
target_os = "android"      # Diese Zeilen müssen manuell geändert werden
target_cpu = "arm"         # da v8gen.py von einem Simulator-Build ausgeht.
v8_target_cpu = "arm"
is_component_build = false
```

Die Schlüssel sollten für Debug-Builds gleich sein. Wenn Sie für ein arm64-Gerät wie das Pixel C bauen, das 32-Bit- und 64-Bit-Binärdateien unterstützt, sollten die Schlüssel so aussehen:

```python
target_os = "android"      # Diese Zeilen müssen manuell geändert werden
target_cpu = "arm64"       # da v8gen.py von einem Simulator-Build ausgeht.
v8_target_cpu = "arm64"
is_component_build = false
```

Jetzt bauen:

```bash
ninja -C out.gn/arm.release d8
```

Verwenden Sie `adb`, um die Binärdatei und Snapshot-Dateien auf das Telefon zu kopieren:

```bash
adb shell &apos;mkdir -p /data/local/tmp/v8/bin&apos;
adb push out.gn/arm.release/d8 /data/local/tmp/v8/bin
adb push out.gn/arm.release/icudtl.dat /data/local/tmp/v8/bin
adb push out.gn/arm.release/snapshot_blob.bin /data/local/tmp/v8/bin
```

```bash
rebuffat:~/src/v8$ adb shell
bullhead:/ $ cd /data/local/tmp/v8/bin
bullhead:/data/local/tmp/v8/bin $ ls
v8 icudtl.dat snapshot_blob.bin
bullhead:/data/local/tmp/v8/bin $ ./d8
V8 version 5.8.0 (candidate)
d8> &apos;w00t!&apos;
"w00t!"
d8>
```

## Debugging

### d8

Das Remote-Debugging von `d8` auf einem Android-Gerät ist relativ einfach. Starten Sie zuerst `gdbserver` auf dem Android-Gerät:

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

Verbinden Sie sich dann mit dem Server auf Ihrem Host-Gerät.

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb` und `gdbserver` müssen kompatibel zueinander sein; im Zweifelsfall verwenden Sie die Binärdateien aus dem [Android NDK](https://developer.android.com/ndk). Beachten Sie, dass die `d8`-Binärdatei standardmäßig gestrippt ist (Debugging-Infos entfernt), aber `$OUT_DIR/exe.unstripped/d8` die ungestrippte Binärdatei enthält.

### Logging

Standardmäßig landet ein Teil der Debugging-Ausgabe von `d8` im Android-Systemprotokoll, das mit [`logcat`](https://developer.android.com/studio/command-line/logcat) abgerufen werden kann. Leider wird manchmal ein Teil einer bestimmten Debugging-Ausgabe zwischen dem Systemprotokoll und `adb` aufgeteilt, und manchmal scheint ein Teil vollständig zu fehlen. Um diese Probleme zu vermeiden, wird empfohlen, die folgende Einstellung zu den `gn args` hinzuzufügen:

```python
v8_android_log_stdout = true
```

### Gleitkomma-Probleme

Die `gn args`-Einstellung `arm_float_abi = "hard"`, die vom V8 Arm GC Stress Bot verwendet wird, kann auf anderer Hardware als der des GC Stress Bot (z. B. auf Nexus 7) zu völlig unsinnigem Programmverhalten führen.

## Verwendung von Sourcery G++ Lite

Die Sourcery G++ Lite Cross-Compiler-Suite ist eine kostenlose Version von Sourcery G++ von [CodeSourcery](http://www.codesourcery.com/). Es gibt eine Seite für die [GNU-Toolchain für ARM-Prozessoren](http://www.codesourcery.com/sgpp/lite/arm). Bestimmen Sie die Version, die Sie für Ihre Host-/Ziel-Kombination benötigen.

Die folgenden Anweisungen verwenden [2009q1-203 for ARM GNU/Linux](http://www.codesourcery.com/sgpp/lite/arm/portal/release858), und wenn Sie eine andere Version verwenden, ändern Sie bitte die URLs und `TOOL_PREFIX` unten entsprechend.

### Installation auf Host und Ziel

Der einfachste Weg, dies einzurichten, besteht darin, das vollständige Sourcery G++ Lite-Paket sowohl auf dem Host als auch auf dem Ziel am gleichen Ort zu installieren. Dies stellt sicher, dass alle erforderlichen Bibliotheken auf beiden Seiten verfügbar sind. Wenn Sie die Standardbibliotheken auf dem Host verwenden möchten, ist keine Installation auf dem Ziel erforderlich.

Das folgende Skript wird unter `/opt/codesourcery` installiert:

```bash
#!/bin/sh

sudo mkdir /opt/codesourcery
cd /opt/codesourcery
sudo chown "$USERNAME" .
chmod g+ws .
umask 2
wget http://www.codesourcery.com/sgpp/lite/arm/portal/package4571/public/arm-none-linux-gnueabi/arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
tar -xvf arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
```

## Profil

- Kompilieren Sie eine Binärdatei, schieben Sie sie auf das Gerät und behalten Sie eine Kopie auf dem Host:

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- Erstellen Sie ein Profilprotokoll und kopieren Sie es auf den Host:

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- Öffnen Sie `v8.log` in Ihrem bevorzugten Editor und bearbeiten Sie die erste Zeile so, dass sie dem vollständigen Pfad zur `d8-version.under.test`-Binärdatei auf Ihrem Arbeitsplatzrechner entspricht (anstelle des `/data/local/tmp/v8/bin/`-Pfads, der auf dem Gerät verwendet wurde).

- Führen Sie den Tick-Processor mit der `d8`-Binärdatei des Hosts und einer entsprechenden `nm`-Binärdatei aus:

    ```bash
    cp out/x64.release/d8 .  # nur einmal erforderlich
    cp out/x64.release/natives_blob.bin .  # nur einmal erforderlich
    cp out/x64.release/snapshot_blob.bin .  # nur einmal erforderlich
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
