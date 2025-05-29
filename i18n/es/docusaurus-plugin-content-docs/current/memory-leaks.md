---
title: 'Investigando pérdidas de memoria'
description: 'Este documento proporciona orientación sobre cómo investigar pérdidas de memoria en V8.'
---
Si estás investigando una pérdida de memoria y te preguntas por qué un objeto no es recolectado como basura, puedes usar `%DebugTrackRetainingPath(object)` para imprimir la ruta de retención actual del objeto en cada GC.

Esto requiere las banderas de tiempo de ejecución `--allow-natives-syntax --track-retaining-path` y funciona tanto en modos de lanzamiento como de depuración. Más información en la descripción de CL.

Considera el siguiente `test.js`:

```js
function foo() {
  const x = { bar: 'bar' };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

Ejemplo (usa el modo de depuración o `v8_enable_object_print = true` para una salida mucho más detallada):

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
Ruta de retención para 0x245c59f0c1a1:

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distancia desde la raíz 6: 0x245c59f0c1a1 <Object map = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distancia desde la raíz 5: 0x245c59f0c169 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distancia desde la raíz 4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distancia desde la raíz 3: 0x1fbb02e2d679 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distancia desde la raíz 2: 0x245c59f0c139 <FixedArray[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distancia desde la raíz 1: 0x1fbb02e03d91 <FixedArray[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Raíz: (Isolate)
-------------------------------------------------
```

## Soporte de depurador

Mientras estés en una sesión de depuración (por ejemplo, `gdb`/`lldb`), y suponiendo que pasaste las banderas mencionadas al proceso (es decir, `--allow-natives-syntax --track-retaining-path`), podrías `print isolate->heap()->PrintRetainingPath(HeapObject*)` en un objeto de interés.
