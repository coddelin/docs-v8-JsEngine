---
title: 'V8s Linux `perf`-Integration'
description: 'Dieses Dokument erklärt, wie die Leistung von V8s JIT-Code mit dem Linux-Tool `perf` analysiert werden kann.'
---
V8 verfügt über integrierte Unterstützung für das Linux-Tool `perf`. Es wird über die Befehlszeilenoptionen `--perf-prof` aktiviert.
V8 schreibt während der Ausführung Leistungsdaten in eine Datei, die verwendet werden kann, um die Leistung des JIT-Codes von V8 (einschließlich der JS-Funktionsnamen) mit dem Linux-Tool `perf` zu analysieren.

## Anforderungen

- `linux-perf` Version 5 oder höher (ältere Versionen unterstützen `jit` nicht). (Siehe Anweisungen am [Ende](#build-perf))
- Baue V8/Chrome mit `enable_profiling=true`, um besser symbolisierten C++-Code zu erhalten.

## V8 bauen

Um die Integration von V8 mit Linux perf zu nutzen, musst du V8 mit dem gn-Flag `enable_profiling = true` bauen:

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## Profiling von `d8` mit [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py)

Nach dem Bauen von `d8` kannst du mit Linux perf beginnen:

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

Ein vollständigeres Beispiel:

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# Verwende benutzerdefinierte V8-Flags und ein separates Ausgabeverzeichnis für weniger Unordnung:
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# Elegante Benutzeroberfläche (`-flame` ist nur für Googler, benutze `-web` als öffentliche Alternative):
pprof -flame perf_results/XXX_perf.data.jitted;
# Werkzeug für terminalbasierte Nutzung:
perf report -i perf_results/XXX_perf.data.jitted;
```

Überprüfe `linux-perf-d8.py --help` für weitere Details. Beachte, dass du nach dem d8-Binärargument alle `d8`-Flags verwenden kannst.


## Profiling von Chrome oder content_shell mit [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)

1. Du kannst das Skript [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) verwenden, um Chrome zu profilieren. Stelle sicher, dass du die [erforderlichen Chrome-gn-Flags](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) hinzufügst, um ordentliche C++-Symbole zu erhalten.

1. Sobald dein Build fertig ist, kannst du eine Website mit vollständigen Symbolen für C++ und JS-Code profilieren.

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. Navigiere zu deiner Website und schließe dann den Browser (oder warte, bis die `--timeout`-Zeit abgelaufen ist)
1. Nachdem du den Browser geschlossen hast, wird `linux-perf.py` die Dateien nachbearbeiten und eine Liste mit einem Ergebnisfile für jeden Rendererprozess anzeigen:

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## Erkunden der Linux-perf-Ergebnisse

Schließlich kannst du das Linux-Tool `perf` verwenden, um das Profil eines d8- oder Chrome-Rendererprozess zu erkunden:

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

Du kannst auch [pprof](https://github.com/google/pprof) verwenden, um weitere Visualisierungen zu erstellen:

```bash
# Hinweis: `-flame` ist nur für Google-Intern, benutze `-web` als öffentliche Alternative:
pprof -flame perf_results/XXX_perf.data.jitted;
```

## Geringes-Level-Nutzung von Linux-perf

### Verwendung von Linux-perf direkt mit `d8`

Abhängig von deinem Anwendungsfall möchtest du möglicherweise Linux-perf direkt mit `d8` verwenden.
Dies erfordert einen zweistufigen Prozess, zuerst erstellt `perf record` eine Datei `perf.data`, die anschließend mit `perf inject` nachbearbeitet werden muss, um die JS-Symbole einzufügen.

```bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### V8 Linux-perf Flags

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof) wird in der V8-Befehlszeile verwendet, um Leistungssamples im JIT-Code zu erfassen.

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory) ist erforderlich, um den Schreibschutz für Code-Speicher zu deaktivieren. Dies ist notwendig, da `perf` Informationen über Code-Seiten verwirft, wenn es das Ereignis sieht, das dem Entfernen des Schreibschutzbits von der Code-Seite entspricht. Hier ist ein Beispiel, das Samples aus einer Test-JavaScript-Datei erfasst:

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) wird verwendet, um unterschiedliche Einstiegspunkte (kopierte Versionen von InterpreterEntryTrampoline) für interpretierte Funktionen zu erstellen, sodass sie von `perf` anhand der Adresse allein unterschieden werden können. Da der InterpreterEntryTrampoline kopiert werden muss, führt dies zu einer geringfügigen Leistungseinbuße und einem erhöhten Speicherverbrauch.


### Verwendung von linux-perf direkt mit Chrome

1. Sie können dieselben V8-Flags verwenden, um Chrome selbst zu profilieren. Befolgen Sie die oben angegebenen Anweisungen für die richtigen V8-Flags und fügen Sie die [erforderlichen Chrome GN-Flags](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) zu Ihrem Chrome-Build hinzu.

1. Sobald Ihr Build bereit ist, können Sie eine Website mit vollständigen Symbolen für C++- und JS-Code profilieren.

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. Nachdem Sie Chrome gestartet haben, finden Sie die Renderer-Prozess-ID mithilfe des Task-Managers und verwenden Sie diese, um mit der Profilerstellung zu beginnen:

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. Navigieren Sie zu Ihrer Website und fahren Sie anschließend mit dem nächsten Abschnitt fort, wie Sie die perf-Ausgabe auswerten.

1. Nachdem die Ausführung abgeschlossen ist, kombinieren Sie die von `perf` gesammelten statischen Informationen mit den Leistungsproben, die von V8 für JIT-Code ausgegeben werden:

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. Schließlich können Sie das Linux `perf` [Tool verwenden, um die Ergebnisse zu erkunden](#Explore-linux-perf-results)

## `perf` erstellen

Wenn Sie einen veralteten Linux-Kernel haben, können Sie linux-perf mit JIT-Unterstützung lokal erstellen.

- Installieren Sie einen neuen Linux-Kernel und starten Sie dann Ihren Rechner neu:

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- Installieren Sie Abhängigkeiten:

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- Laden Sie Kernel-Quellen herunter, die die neueste `perf` Tool-Quelle enthalten:

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

In den folgenden Schritten führen Sie `perf` als `some/director/tip/tools/perf/perf` aus.
