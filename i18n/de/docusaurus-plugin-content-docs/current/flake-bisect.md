---
title: 'Flake bisektieren'
description: 'Dieses Dokument erklärt, wie man instabile Tests bisektieren kann.'
---
Instabile Tests werden in einem separaten Schritt auf den Bots gemeldet ([Beispiel-Build](https://ci.chromium.org/ui/p/v8/builders/ci/V8%20Linux64%20TSAN/38630/overview)).

Jedes Testprotokoll bietet eine vorab ausgefüllte Befehlszeile zum Auslösen eines automatisierten Flake-Bisects wie:

```
Flake bisektieren über die Befehlszeile auslösen:
bb add v8/try.triggered/v8_flako -p 'to_revision="deadbeef"' -p 'test_name="MyTest"' ...
```

Bevor Benutzer zum ersten Mal Flake-Bisects auslösen, müssen sie sich mit einem google.com-Konto anmelden:

```bash
bb auth-login
```

Führen Sie dann den bereitgestellten Befehl aus, der eine Build-URL zurückgibt, die ein Flake-Bisect ausführt ([Beispiel](https://ci.chromium.org/ui/p/v8/builders/try.triggered/v8_flako/b8836020260675019825/overview)).

Wenn Sie Glück haben, weist die Bisektion auf einen Verdächtigen hin. Wenn nicht, könnten Sie weiter lesen wollen…

## Detaillierte Beschreibung

Technische Details finden Sie auch im Implementierungs-[Tracker-Bug](https://crbug.com/711249). Der Flake-Bisect-Ansatz hat die gleichen Absichten wie [findit](https://sites.google.com/chromium.org/cat/findit), verwendet jedoch eine andere Implementierung.

### Wie funktioniert es?

Ein Bisect-Job hat 3 Phasen: Kalibrierung, rückwärts und eingehende Bisektion. Während der Kalibrierung wird der Test wiederholt, wobei das Gesamttimeout (oder die Anzahl der Wiederholungen) verdoppelt wird, bis genug Flakes in einem Durchlauf erkannt werden. Anschließend verdoppelt die rückwärtige Bisektion den Git-Bereich, bis eine Revision ohne Flakes gefunden wird. Schließlich bisektieren wir den Bereich der guten Revision und der ältesten schlechten. Beachten Sie, dass die Bisektion keine neuen Build-Produkte erzeugt, sondern ausschließlich auf zuvor von der kontinuierlichen Infrastruktur von V8 erstellten Builds basiert.

### Bisektion schlägt fehl, wenn…

- Während der Kalibrierung keine Sicherheit erreicht werden kann. Dies ist typisch für ein-in-einer-Million-Flakes oder instabiles Verhalten, das nur sichtbar ist, wenn andere Tests parallel laufen (z. B. speicherintensive Tests).
- Der Schuldige zu alt ist. Die Bisektion bricht nach einer bestimmten Anzahl von Schritten ab oder wenn ältere Builds auf dem Isolate-Server nicht mehr verfügbar sind.
- Der gesamte Bisect-Job times out. In diesem Fall könnte es möglich sein, ihn mit einer älteren bekannten schlechten Revision neu zu starten.

## Eigenschaften zur Anpassung von Flake-Bisects

- `extra_args`: Zusätzliche Argumente, die an V8s `run-tests.py`-Skript übergeben werden.
- repetitions: Anfangsanzahl der Testwiederholungen (übergeben an die Option `--random-seed-stress-count` von `run-tests.py`; ungenutzt, wenn `total_timeout_sec` verwendet wird).
- `timeout_sec`: Timeout-Parameter, der an `run-tests.py` übergeben wird.
- `to_revision`: Revision, die als schlecht bekannt ist. Hier beginnt die Bisektion.
- `total_timeout_sec`: Anfangs-Gesamttimeout für einen gesamten Bisect-Schritt. Während der Kalibrierung wird diese Zeit bei Bedarf mehrmals verdoppelt. Auf 0 setzen, um zu deaktivieren und stattdessen die Eigenschaft `repetitions` zu verwenden.
- `variant`: Name der Testvariante, die an `run-tests.py` übergeben wird.

## Eigenschaften, die Sie nicht ändern müssen

- `bisect_buildername`: Mastername des Builders, der die Builds für die Bisektion erzeugt hat.
- `bisect_mastername`: Name des Builders, der die Builds für die Bisektion erzeugt hat.
- `build_config`: Build-Konfiguration, die an V8s `run-tests.py`-Skript übergeben wird (dort heißt der Parameter `--mode`, Beispiel: `Release` oder `Debug`).
- `isolated_name`: Name der isolierten Datei (z. B. `bot_default`, `mjsunit`).
- `swarming_dimensions`: Swarming-Dimensionen, die die Art des Bots klassifizieren, auf dem die Tests ausgeführt werden sollen. Übergeben als Liste von Zeichenfolgen, jede im Format `name:value`.
- `test_name`: Vollständig qualifizierter Testname, der an `run-tests.py` übergeben wird. Z. B. `mjsunit/foobar`.

## Tipps und Tricks

### Bisektion eines blockierenden Tests (z. B. Deadlock)

Wenn ein fehlerhafter Durchlauf timeouts hat, während ein erfolgreicher Durchlauf sehr schnell läuft, ist es sinnvoll, den Parameter timeout_sec anzupassen, damit die Bisektion nicht verzögert wird, während auf die blockierenden Durchläufe gewartet wird, bis sie timeouts. Z. B. wenn der erfolgreiche Durchlauf normalerweise in &lt;1 Sekunde erreicht wird, setzen Sie das Timeout auf etwas Kleines, z. B. 5 Sekunden.

### Mehr Vertrauen in einen Verdächtigen gewinnen

In einigen Durchläufen ist das Vertrauen sehr gering. Z. B. wird die Kalibrierung erfüllt, wenn vier Flakes in einem Durchlauf gesehen werden. Während der Bisektion gilt jeder Durchlauf mit einem oder mehreren Flakes als schlecht. In solchen Fällen könnte es nützlich sein, den Bisect-Job neu zu starten, den Parameter `to_revision` auf den Schuldigen zu setzen und eine höhere Anzahl von Wiederholungen oder ein höheres Gesamttimeout als der ursprüngliche Job zu verwenden, um zu bestätigen, dass dieselbe Schlussfolgerung erneut erreicht wird.

### Umgang mit Timeout-Problemen

Falls die Option für das Gesamttimeout dazu führt, dass Builds hängen bleiben, ist es am besten, eine passende Anzahl von Wiederholungen zu schätzen und `total_timeout_sec` auf `0` zu setzen.

### Testverhalten abhängig von Zufallszahlen
