---
title: &apos;Investiguer les fuites de mémoire&apos;
description: &apos;Ce document fournit des conseils pour enquêter sur les fuites de mémoire dans V8.&apos;
---
Si vous enquêtez sur une fuite de mémoire et vous demandez pourquoi un objet n'est pas collecté par le ramasse-miettes, vous pouvez utiliser `%DebugTrackRetainingPath(object)` pour imprimer le chemin de rétention réel de l'objet à chaque GC.

Cela nécessite les options d'exécution `--allow-natives-syntax --track-retaining-path` et fonctionne à la fois en mode release et debug. Plus d'informations dans la description du CL.

Considérez le script suivant `test.js` :

```js
function foo() {
  const x = { bar: &apos;bar&apos; };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

Exemple (utilisez le mode debug ou `v8_enable_object_print = true` pour un affichage beaucoup plus détaillé) :

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
Chemin de rétention pour 0x245c59f0c1a1:

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distance de la racine 6: 0x245c59f0c1a1 <Object map = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distance de la racine 5: 0x245c59f0c169 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distance de la racine 4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distance de la racine 3: 0x1fbb02e2d679 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distance de la racine 2: 0x245c59f0c139 <FixedArray[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distance de la racine 1: 0x1fbb02e03d91 <FixedArray[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Racine: (Isolate)
-------------------------------------------------
```

## Support du débogueur

Pendant une session de débogueur (par exemple `gdb`/`lldb`), et en supposant que vous avez passé les options ci-dessus au processus (c'est-à-dire `--allow-natives-syntax --track-retaining-path`), vous pouvez peut-être `print isolate->heap()->PrintRetainingPath(HeapObject*)` sur un objet d'intérêt.
