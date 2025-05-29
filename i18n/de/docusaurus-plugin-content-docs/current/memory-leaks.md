---
title: 'Untersuchung von Speicherlecks'
description: 'Dieses Dokument bietet Anleitungen zur Untersuchung von Speicherlecks in V8.'
---
Wenn Sie ein Speicherleck untersuchen und sich fragen, warum ein Objekt nicht vom Garbage Collector gesammelt wird, können Sie `%DebugTrackRetainingPath(object)` verwenden, um den tatsächlichen Haltepfad des Objekts bei jeder GC auszugeben.

Dies erfordert die Laufzeit-Flags `--allow-natives-syntax --track-retaining-path` und funktioniert sowohl im Release- als auch im Debug-Modus. Mehr Informationen finden Sie in der CL-Beschreibung.

Betrachten Sie folgendes `test.js`:

```js
function foo() {
  const x = { bar: 'bar' };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

Beispiel (verwenden Sie den Debug-Modus oder `v8_enable_object_print = true` für eine viel ausführlichere Ausgabe):

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
Haltepfad für 0x245c59f0c1a1:

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Abstand zur Wurzel 6: 0x245c59f0c1a1 <Object map = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Abstand zur Wurzel 5: 0x245c59f0c169 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Abstand zur Wurzel 4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Abstand zur Wurzel 3: 0x1fbb02e2d679 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Abstand zur Wurzel 2: 0x245c59f0c139 <FixedArray[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Abstand zur Wurzel 1: 0x1fbb02e03d91 <FixedArray[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Wurzel: (Isolate)
-------------------------------------------------
```

## Debugger-Unterstützung

Während einer Debugger-Sitzung (z. B. `gdb`/`lldb`) und vorausgesetzt, dass Sie die oben genannten Flags an den Prozess übergeben haben (d. h. `--allow-natives-syntax --track-retaining-path`), können Sie möglicherweise `print isolate->heap()->PrintRetainingPath(HeapObject*)` für ein interessiertes Objekt ausführen.
