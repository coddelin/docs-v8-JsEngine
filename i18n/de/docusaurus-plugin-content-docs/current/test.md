---
title: &apos;Testen&apos;
description: &apos;Dieses Dokument erklärt das Testframework, das Teil des V8-Repositorys ist.&apos;
---
V8 umfasst ein Testframework, mit dem Sie die Engine testen können. Das Framework ermöglicht es Ihnen, sowohl unsere eigenen Testsuiten, die mit dem Quellcode enthalten sind, als auch andere wie [die Test262-Test-Suite](https://github.com/tc39/test262) auszuführen.

## V8-Tests ausführen

[Verwendung von `gm`](/docs/build-gn#gm), Sie können einfach `.check` an ein beliebiges Build-Ziel anhängen, um Tests dafür auszuführen, z. B.

```bash
gm x64.release.check
gm x64.optdebug.check  # empfohlen: recht schnell, mit DCHECKs.
gm ia32.check
gm release.check
gm check  # baut und testet alle Standardplattformen
```

`gm` baut automatisch alle erforderlichen Ziele, bevor die Tests ausgeführt werden. Sie können die auszuführenden Tests auch einschränken:

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

Wenn Sie V8 bereits erstellt haben, können Sie die Tests manuell ausführen:

```bash
tools/run-tests.py --outdir=out/ia32.release
```

Wieder können Sie angeben, welche Tests ausgeführt werden sollen:

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

Führen Sie das Skript mit `--help` aus, um mehr über die anderen Optionen zu erfahren.

## Weitere Tests ausführen

Der Standardsatz von Tests, die ausgeführt werden sollen, umfasst nicht alle verfügbaren Tests. Sie können zusätzliche Testsuiten in der Befehlszeile von entweder `gm` oder `run-tests.py` angeben:

- `benchmarks` (nur für Korrektheit; liefert keine Benchmark-Ergebnisse!)
- `mozilla`
- `test262`
- `webkit`

## Microbenchmarks ausführen

Unter `test/js-perf-test` verfügen wir über Microbenchmarks, um die Leistungsfähigkeit von Funktionen zu verfolgen. Es gibt einen speziellen Runner dafür: `tools/run_perf.py`. Führen Sie sie aus wie:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

Wenn Sie nicht alle `JSTests` ausführen möchten, können Sie ein `filter`-Argument bereitstellen:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## Aktualisieren der Inspektor-Test-Erwartungen

Nachdem Sie Ihren Test aktualisiert haben, müssen Sie möglicherweise die Erwartungsdatei dafür regenerieren. Sie können dies erreichen, indem Sie Folgendes ausführen:

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

Dies kann auch nützlich sein, wenn Sie herausfinden möchten, wie sich die Ausgabe Ihres Tests geändert hat. Generieren Sie zunächst die erwartete Datei mit dem obigen Befehl neu und überprüfen Sie dann den Unterschied mit:

```bash
git diff
```

## Aktualisieren der Bytecode-Erwartungen (Rebaselining)

Manchmal können sich die Bytecode-Erwartungen ändern, was zu `cctest`-Fehlern führt. Um die Gold-Dateien zu aktualisieren, erstellen Sie `test/cctest/generate-bytecode-expectations`, indem Sie Folgendes ausführen:

```bash
gm x64.release generate-bytecode-expectations
```

…und dann den Standardsatz von Eingaben aktualisieren, indem Sie die `--rebaseline`-Flagge an die generierte Binärdatei übergeben:

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

Die aktualisierten Goldens sind jetzt verfügbar in `test/cctest/interpreter/bytecode_expectations/`.

## Hinzufügen eines neuen Bytecode-Erwartungstests

1. Fügen Sie einen neuen Testfall zu `cctest/interpreter/test-bytecode-generator.cc` hinzu und geben Sie eine Gold-Datei mit demselben Testnamen an.

1. Erstellen Sie `generate-bytecode-expectations`:

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. Führen Sie aus

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    wobei `testcase.js` das JavaScript-Testfall enthält, das zu `test-bytecode-generator.cc` hinzugefügt wurde, und `testname` der Name des Tests ist, der in `test-bytecode-generator.cc` definiert wurde.
