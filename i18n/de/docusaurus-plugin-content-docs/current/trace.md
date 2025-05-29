---
title: 'V8-Tracing'
description: 'Dieses Dokument erklärt, wie man die in V8 integrierte Tracing-Unterstützung nutzt.'
---
V8 bietet Unterstützung für Tracing. Es [funktioniert automatisch, wenn V8 über das Chrome-Tracing-System in Chrome eingebettet ist](/docs/rcs). Sie können es jedoch auch in einem eigenständigen V8 oder innerhalb eines Embedders, der die Standardplattform verwendet, aktivieren. Weitere Details über den Trace-Viewer finden Sie [hier](https://github.com/catapult-project/catapult/blob/master/tracing/README.md).

## Tracing in `d8`

Um mit dem Tracing zu beginnen, verwenden Sie die Option `--enable-tracing`. V8 generiert eine Datei `v8_trace.json`, die Sie in Chrome öffnen können. Um sie in Chrome zu öffnen, gehen Sie zu `chrome://tracing`, klicken Sie auf "Load" und laden Sie dann die Datei `v8-trace.json`.

Jedes Trace-Event ist mit einer Reihe von Kategorien verbunden. Sie können die Aufzeichnung von Trace-Events basierend auf deren Kategorien aktivieren/deaktivieren. Mit der obigen Option aktivieren wir nur die Standardkategorien (eine Reihe von Kategorien mit geringer Auslastung). Um weitere Kategorien zu aktivieren und eine feinere Steuerung der verschiedenen Parameter zu haben, müssen Sie eine Konfigurationsdatei übergeben.

Hier ist ein Beispiel für eine Konfigurationsdatei `traceconfig.json`:

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

Ein Beispiel für den Aufruf von `d8` mit Tracing und einer Traceconfig-Datei:

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

Das Trace-Konfigurationsformat ist kompatibel mit dem von Chrome Tracing. Wir unterstützen jedoch keine regulären Ausdrücke in der Liste der enthaltenen Kategorien, und V8 benötigt keine Liste der ausgeschlossenen Kategorien. Daher kann die Trace-Konfigurationsdatei für V8 auch in Chrome Tracing verwendet werden. Sie können jedoch keine Chrome-Trace-Konfigurationsdatei in V8-Tracing wiederverwenden, falls die Datei reguläre Ausdrücke enthält. Außerdem ignoriert V8 die Liste der ausgeschlossenen Kategorien.

## Aktivierung der Laufzeitaufrufstatistiken im Tracing

Um Laufzeitaufrufstatistiken (<abbr>RCS</abbr>) zu erhalten, zeichnen Sie den Trace mit den folgenden beiden aktivierten Kategorien auf: `v8` und `disabled-by-default-v8.runtime_stats`. Jedes Top-Level-V8-Trace-Event enthält die Laufzeitstatistiken für den Zeitraum dieses Events. Wenn Sie eines dieser Ereignisse im `trace-viewer` auswählen, werden die Laufzeitstatistiken im unteren Bereich angezeigt. Wenn Sie mehrere Ereignisse auswählen, wird eine zusammengeführte Ansicht erstellt.

![](/_img/docs/trace/runtime-stats.png)

## Aktivierung der GC-Objektstatistiken im Tracing

Um die GC-Objektstatistiken im Tracing zu erhalten, müssen Sie einen Trace mit der Kategorie `disabled-by-default-v8.gc_stats` aufzeichnen. Zudem müssen Sie die folgenden `--js-flags` verwenden:

```
--track_gc_object_stats --noincremental-marking
```

Sobald Sie den Trace im `trace-viewer` laden, suchen Sie nach Slices mit dem Namen: `V8.GC_Object_Stats`. Die Statistiken werden im unteren Bereich angezeigt. Wenn Sie mehrere Slices auswählen, wird eine zusammengeführte Ansicht erstellt.

![](/_img/docs/trace/gc-stats.png)
