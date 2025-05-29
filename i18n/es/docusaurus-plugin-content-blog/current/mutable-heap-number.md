---
title: 'Turboalimentando V8 con números mutables en el montón'
author: '[Victor Gomes](https://twitter.com/VictorBFG), el cambiador de bits'
avatars:
  - victor-gomes
date: 2025-02-25
tags:
  - JavaScript
  - benchmarks
  - internals
description: "Añadiendo números mutables en el montón al contexto de scripts"
tweet: ''
---

En V8, siempre estamos buscando mejorar el rendimiento de JavaScript. Como parte de este esfuerzo, recientemente volvimos a analizar el conjunto de pruebas de [JetStream2](https://browserbench.org/JetStream2.1/) para eliminar caídas de rendimiento. Esta publicación detalla una optimización específica que realizamos y que generó una mejora significativa de `2.5x` en la prueba de referencia `async-fs`, contribuyendo a un aumento notable en la puntuación general. La optimización se inspiró en el benchmark, pero este tipo de patrones también aparecen en [código del mundo real](https://github.com/WebAssembly/binaryen/blob/3339c1f38da5b68ce8bf410773fe4b5eee451ab8/scripts/fuzz_shell.js#L248).

<!--truncate-->
# El objetivo `async-fs` y un peculiar `Math.random`

El benchmark `async-fs`, como su nombre indica, es una implementación de un sistema de archivos en JavaScript, centrado en operaciones asíncronas. Sin embargo, existe un sorprendente cuello de botella de rendimiento: la implementación de `Math.random`. Utiliza una implementación personalizada y determinista de `Math.random` para obtener resultados consistentes entre ejecuciones. La implementación es:

```js
let seed;
Math.random = (function() {
  return function () {
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
    return (seed & 0xfffffff) / 0x10000000;
  };
})();
```

La variable clave aquí es `seed`. Se actualiza en cada llamada a `Math.random`, generando la secuencia pseudoaleatoria. Es crucial destacar que aquí `seed` se almacena en un `ScriptContext`.

Un `ScriptContext` sirve como un lugar de almacenamiento para valores accesibles dentro de un script en particular. Internamente, este contexto se representa como un arreglo de valores etiquetados de V8. En la configuración predeterminada de V8 para sistemas de 64 bits, cada uno de estos valores etiquetados ocupa 32 bits. El bit menos significativo de cada valor actúa como una etiqueta. Un `0` indica un _Entero Pequeño_ (`SMI`) de 31 bits. El valor entero real se almacena directamente, desplazado a la izquierda por un bit. Un `1` indica un [puntero comprimido](https://v8.dev/blog/pointer-compression) a un objeto en el montón, donde el valor del puntero comprimido se incrementa en uno.

![Diseño de `ScriptContext`: las ranuras azules son punteros a los metadatos del contexto y al objeto global (`NativeContext`). La ranura amarilla indica un valor de punto flotante de precisión doble sin etiquetar.](/_img/mutable-heap-number/script-context.svg)

Esta etiquetación diferencia cómo se almacenan los números. Los `SMIs` residen directamente en el `ScriptContext`. Los números más grandes o aquellos con partes decimales se almacenan indirectamente como objetos `HeapNumber` inmutables en el montón (un doble de 64 bits), con el `ScriptContext` conteniendo un puntero comprimido hacia ellos. Este enfoque maneja de manera eficiente varios tipos numéricos mientras optimiza para el caso común de `SMI`.

# El cuello de botella

El análisis del rendimiento de `Math.random` reveló dos problemas importantes:

- **Asignación de `HeapNumber`:** La ranura dedicada a la variable `seed` en el contexto del script apunta a un `HeapNumber` estándar e inmutable. Cada vez que la función `Math.random` actualiza `seed`, se debe asignar un nuevo objeto `HeapNumber` en el montón, lo que genera una presión significativa de asignación y recolección de basura.

- **Aritmética en punto flotante:** Aunque los cálculos dentro de `Math.random` son operaciones enteras (usando desplazamientos y sumas en bits), el compilador no puede aprovechar esto completamente. Debido a que `seed` se almacena como un `HeapNumber` genérico, el código generado utiliza instrucciones en punto flotante más lentas. El compilador no puede demostrar que `seed` siempre contendrá un valor representable como entero. Aunque el compilador podría especular sobre rangos de enteros de 32 bits, V8 principalmente se centra en `SMIs`. Incluso con especulación en enteros de 32 bits, todavía sería necesaria una conversión potencialmente costosa de punto flotante de 64 bits a entero de 32 bits, junto con una verificación sin pérdida.

# La solución

Para abordar estos problemas, implementamos una optimización de dos partes:

- **Seguimiento de tipos de ranuras / ranuras de números de montón mutables:** Extendimos el [seguimiento de valores constantes del contexto de script](https://issues.chromium.org/u/2/issues/42203515) (variables `let` que se inicializaron pero nunca se modificaron) para incluir información de tipo. Rastreamos si ese valor de ranura es constante, un `SMI`, un `HeapNumber` o un valor etiquetado genérico. También introdujimos el concepto de ranuras de números de montón mutables dentro de los contextos de script, similar a los [campos de números de montón mutables](https://v8.dev/blog/react-cliff#smi-heapnumber-mutableheapnumber) para `JSObjects`. En lugar de apuntar a un `HeapNumber` inmutable, la ranura del contexto de script posee el `HeapNumber`, y no debe filtrar su dirección. Esto elimina la necesidad de asignar un nuevo `HeapNumber` en cada actualización para el código optimizado. El `HeapNumber` propio se modifica directamente en su lugar.

- **`Int32` en montón mutable:** Mejoramos los tipos de ranuras de contexto de script para rastrear si un valor numérico está dentro del rango de `Int32`. Si lo está, el `HeapNumber` mutable almacena el valor como un `Int32` sin procesar. Si es necesario, la transición a un `double` lleva el beneficio adicional de no requerir la reasignación del `HeapNumber`. En el caso de `Math.random`, el compilador puede observar que `seed` se actualiza constantemente con operaciones enteras y marcar la ranura como conteniendo un `Int32` mutable.

![Máquina de estados de tipo de ranura. Una flecha verde indica una transición desencadenada por almacenar un valor `SMI`. Las flechas azules representan transiciones al almacenar un valor `Int32`, y las rojas, un valor de punto flotante de doble precisión. El estado `Other` actúa como un estado de hundimiento, previniendo transiciones adicionales.](/_img/mutable-heap-number/transitions.svg)

Es importante notar que estas optimizaciones introducen una dependencia de código en el tipo del valor almacenado en la ranura del contexto. El código optimizado generado por el compilador JIT depende de que la ranura contenga un tipo específico (aquí, un `Int32`). Si algún código escribe un valor en la ranura `seed` que cambia su tipo (por ejemplo, escribiendo un número de punto flotante o una cadena), el código optimizado tendrá que desoptimizarse. Esta desoptimización es necesaria para garantizar la corrección. Por lo tanto, la estabilidad del tipo almacenado en la ranura es crucial para mantener el máximo rendimiento. En el caso de `Math.random`, el enmascaramiento de bits en el algoritmo asegura que la variable seed siempre contenga un valor `Int32`.

# Los resultados

Estos cambios aceleran significativamente la peculiar función `Math.random`:

- **Sin asignación / actualizaciones rápidas en su lugar:** El valor `seed` se actualiza directamente dentro de su ranura mutable en el contexto de script. No se asignan nuevos objetos durante la ejecución de `Math.random`.

- **Operaciones con enteros:** El compilador, armado con el conocimiento de que la ranura contiene un `Int32`, puede generar instrucciones enteras altamente optimizadas (desplazamientos, sumas, etc.). Esto evita la sobrecarga de la aritmética de punto flotante.

![Resultados del benchmark `async-fs` en un Mac M1. Puntajes más altos son mejores.](/_img/mutable-heap-number/result.png)

El efecto combinado de estas optimizaciones es una notable aceleración de `~2.5x` en el benchmark `async-fs`. Esto, a su vez, contribuye a una mejora de `~1.6%` en la puntuación general de JetStream2. Esto demuestra que un código aparentemente simple puede crear cuellos de botella de rendimiento inesperados, y que pequeñas optimizaciones específicas pueden tener un gran impacto no solo para el benchmark.

