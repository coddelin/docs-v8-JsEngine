---
title: 'Benchmarks lokal ausführen'
description: 'Dieses Dokument erklärt, wie man klassische Benchmark-Suiten in d8 ausführt.'
---
Wir haben einen einfachen Arbeitsablauf für die Nutzung der „klassischen“ Benchmarks SunSpider, Kraken und Octane. Sie können mit verschiedenen Binärdateien und Flag-Kombinationen arbeiten, wobei die Ergebnisse über mehrere Durchläufe gemittelt werden.

## CPU

Bauen Sie die `d8`-Shell gemäß den Anweisungen unter [Building with GN](/docs/build-gn).

Bevor Sie Benchmarks ausführen, stellen Sie sicher, dass Sie den CPU-Taktfrequenz-Skalierungs-Regler auf Leistung setzen.

```bash
sudo tools/cpu.sh fast
```

Die Befehle, die `cpu.sh` versteht, sind

- `fast`, Leistung (Alias für `fast`)
- `slow`, Energiesparen (Alias für `slow`)
- `default`, Bedarfsgesteuert (Alias für `default`)
- `dualcore` (deaktiviert alle außer zwei Kerne), Dual (Alias für `dualcore`)
- `allcores` (aktiviert alle verfügbaren Kerne wieder), alle (Alias für `allcores`).

## CSuite

`CSuite` ist unser einfacher Benchmark-Runner:

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <Pfad zur d8-Binärdatei>
    [-x "<optionale zusätzliche d8-Kommandozeilen-Flags>"]
```

Führen Sie zuerst den `baseline`-Modus aus, um die Basiswerte zu erstellen, und anschließend den `compare`-Modus, um Ergebnisse zu erhalten. Standardmäßig führt `CSuite` Octane 10-mal, SunSpider 100-mal und Kraken 80-mal aus, aber Sie können dies für schnellere Ergebnisse mit der Option `-r` überschreiben.

`CSuite` erstellt zwei Unterverzeichnisse im Verzeichnis, von dem aus Sie ausführen:

1. `./_benchmark_runner_data` — Dies ist der zwischengespeicherte Ausgang der N-Durchläufe.
1. `./_results` — Es schreibt die Ergebnisse hier in die Datei `master`. Sie können diese
  Dateien unter verschiedenen Namen speichern, und sie werden im Vergleichsmodus angezeigt.

Im Vergleichsmodus verwenden Sie natürlich eine andere Binärdatei oder zumindest andere Flags.

## Beispielnutzung

Angenommen, Sie haben zwei Versionen von `d8` erstellt und möchten sehen, was mit SunSpider passiert. Erstellen Sie zunächst die Basiswerte:

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
Schrieb ./_results/master.
Führen Sie SunSpider erneut im Vergleichsmodus aus, um Ergebnisse zu sehen.
```

Wie vorgeschlagen, führen Sie erneut aus, aber diesmal im `compare`-Modus mit einer anderen Binärdatei:

```
$ test/benchmarks/csuite/csuite.py sunspider compare out.gn/x64.release/d8

                               Benchmark:    Wert |   Master |      % |
===================================================+==========+========+
                       3d-cube-sunspider:     13,9 S     13,4 S   -3,6 |
                      3d-morph-sunspider:      8,6 S      8,4 S   -2,3 |
                   3d-raytrace-sunspider:     15,1 S     14,9 S   -1,3 |
           access-binary-trees-sunspider:      3,7 S      3,9 S    5,4 |
               access-fannkuch-sunspider:     11,9 S     11,8 S   -0,8 |
                  access-nbody-sunspider:      4,6 S      4,8 S    4,3 |
                 access-nsieve-sunspider:      8,4 S      8,1 S   -3,6 |
      bitops-3bit-bits-in-byte-sunspider:      2,0 |      2,0 |        |
           bitops-bits-in-byte-sunspider:      3,7 S      3,9 S    5,4 |
            bitops-bitwise-and-sunspider:      2,7 S      2,9 S    7,4 |
            bitops-nsieve-bits-sunspider:      5,3 S      5,6 S    5,7 |
         controlflow-recursive-sunspider:      3,8 S      3,6 S   -5,3 |
                    crypto-aes-sunspider:     10,9 S      9,8 S  -10,1 |
                    crypto-md5-sunspider:      7,0 |      7,4 S    5,7 |
                   crypto-sha1-sunspider:      9,2 S      9,0 S   -2,2 |
             date-format-tofte-sunspider:      9,8 S      9,9 S    1,0 |
             date-format-xparb-sunspider:     10,3 S     10,3 S        |
                   math-cordic-sunspider:      6,1 S      6,2 S    1,6 |
             math-partial-sums-sunspider:     20,2 S     20,1 S   -0,5 |
            math-spectral-norm-sunspider:      3,2 S      3,0 S   -6,2 |
                    regexp-dna-sunspider:      7,6 S      7,8 S    2,6 |
                 string-base64-sunspider:     14,2 S     14,0 |   -1,4 |
                  string-fasta-sunspider:     12,8 S     12,6 S   -1,6 |
               string-tagcloud-sunspider:     18,2 S     18,2 S        |
            string-unpack-code-sunspider:     20,0 |     20,1 S    0,5 |
         string-validate-input-sunspider:      9,4 S      9,4 S        |
                               SunSpider:    242,6 S    241,1 S   -0,6 |
---------------------------------------------------+----------+--------+
```

Die Ausgabe des vorherigen Durchlaufs wird in einem Unterverzeichnis im aktuellen Verzeichnis zwischengespeichert (`_benchmark_runner_data`). Die aggregierten Ergebnisse werden ebenfalls im Verzeichnis `_results` zwischengespeichert. Diese Verzeichnisse können gelöscht werden, nachdem Sie den Vergleichsschritt durchgeführt haben.

Eine andere Situation ist, wenn Sie dasselbe Binär verwenden, aber die Ergebnisse verschiedener Flags sehen möchten. Sie möchten sehen, wie Octane ohne Optimierungskompiler abschneidet. Zuerst die Basis:

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

Normalerweise benötigt Octane 10 Durchläufe, um stabile Ergebnisse zu erhalten.
Schrieb /usr/local/google/home/mvstanton/src/v8/_results/master.
Führen Sie Octane erneut im Vergleichsmodus aus, um die Ergebnisse zu sehen.
```

Beachten Sie die Warnung, dass ein einzelner Durchlauf normalerweise nicht ausreicht, um viele Leistungsoptimierungen sicher zu beurteilen. Allerdings sollte unsere „Änderung“ mit nur einem Durchlauf eine reproduzierbare Wirkung haben! Lassen Sie uns nun vergleichen, indem wir das `--noopt`-Flag übergeben, um [TurboFan](/docs/turbofan) zu deaktivieren:

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

Normalerweise benötigt Octane 10 Durchläufe, um stabile Ergebnisse zu erhalten.
                               Benchmark:    Punktzahl |   Master |      % |
===================================================+==========+========+
                                Richards:    973.0 |  26770.0 |  -96.4 |
                               DeltaBlue:   1070.0 |  57245.0 |  -98.1 |
                                  Crypto:    923.0 |  32550.0 |  -97.2 |
                                RayTrace:   2896.0 |  75035.0 |  -96.1 |
                             EarleyBoyer:   4363.0 |  42779.0 |  -89.8 |
                                  RegExp:   2881.0 |   6611.0 |  -56.4 |
                                   Splay:   4241.0 |  19489.0 |  -78.2 |
                            SplayLatency:  14094.0 |  57192.0 |  -75.4 |
                            NavierStokes:   1308.0 |  39208.0 |  -96.7 |
                                   PdfJS:   6385.0 |  26645.0 |  -76.0 |
                                Mandreel:    709.0 |  33166.0 |  -97.9 |
                         MandreelLatency:   5407.0 |  97749.0 |  -94.5 |
                                 Gameboy:   5440.0 |  54336.0 |  -90.0 |
                                CodeLoad:  25631.0 |  25282.0 |    1.4 |
                                   Box2D:   3288.0 |  67572.0 |  -95.1 |
                                    zlib:  59154.0 |  58775.0 |    0.6 |
                              Typescript:  12700.0 |  23310.0 |  -45.5 |
                                  Octane:   4070.0 |  37234.0 |  -89.1 |
---------------------------------------------------+----------+--------+
```

Interessant zu sehen, dass `CodeLoad` und `zlib` relativ unbeschadet blieben.

## Unter der Haube

`CSuite` basiert auf zwei Skripten im selben Verzeichnis, `benchmark.py` und `compare-baseline.py`. Es gibt mehr Optionen in diesen Skripten. Zum Beispiel können Sie mehrere Baselines aufzeichnen und 3-, 4- oder 5-Wege-Vergleiche durchführen. `CSuite` ist auf schnelle Nutzung optimiert und opfert dafür etwas Flexibilität.
