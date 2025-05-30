---
title: "Mejorando las expresiones regulares de V8"
author: "Patrick Thier y Ana Peško, expresadores regulares de opiniones sobre expresiones regulares"
avatars: 
  - "patrick-thier"
  - "ana-pesko"
date: "2019-10-04 15:24:16"
tags: 
  - internals
  - RegExp
description: "En esta publicación de blog describimos cómo aprovechamos las ventajas de interpretar expresiones regulares y mitigamos las desventajas."
tweet: "1180131710568030208"
---
En su configuración predeterminada, V8 compila las expresiones regulares a código nativo en la primera ejecución. Como parte de nuestro trabajo en [V8 sin JIT](/blog/jitless), introdujimos un intérprete para expresiones regulares. Interpretar expresiones regulares tiene la ventaja de usar menos memoria, pero conlleva una penalización de rendimiento. En esta publicación de blog describimos cómo aprovechamos las ventajas de interpretar expresiones regulares mientras mitigamos las desventajas.

<!--truncate-->
## Estrategia de escalonado para RegExp

Queremos usar ‘lo mejor de ambos mundos’ para las expresiones regulares. Para hacerlo, primero compilamos todas las expresiones regulares a bytecode y las interpretamos. De esta manera, ahorramos mucha memoria y, en general (y con el nuevo intérprete más rápido), la penalización de rendimiento es aceptable. Si se usa nuevamente una expresión regular con el mismo patrón, la consideramos ‘caliente’, por lo que la recompilamos a código nativo. Desde este punto en adelante, continuamos la ejecución tan rápido como podemos.

Hay muchos caminos diferentes a través del código de expresiones regulares en V8, dependiendo del método invocado, si es una RegExp global o no global, y si estamos tomando la ruta rápida o lenta. Dicho esto, queremos que la decisión de escalonado esté lo más centralizada posible. Hemos agregado un campo de ticks al objeto RegExp de V8 que se inicializa a un valor específico en tiempo de ejecución. Este valor representa la cantidad de veces que se interpretará la expresión regular antes de escalar al compilador. Cada vez que se interpreta la expresión regular, decrementamos el campo de ticks en 1. En una función integrada escrita en [CodeStubAssembler](/blog/csa) que se invoca para todas las expresiones regulares, verificamos el indicador de ticks en cada ejecución. Una vez que los ticks llegan a 0, sabemos que necesitamos recompilar la expresión regular a código nativo y saltamos a tiempo de ejecución para hacerlo.

Mencionamos que las expresiones regulares pueden tener diferentes caminos de ejecución. Para el caso de reemplazos globales con funciones como parámetros, las implementaciones para el código nativo y el bytecode difieren. El código nativo espera un array para almacenar todas las coincidencias de inmediato, y el bytecode coincide una por una. Debido a esto, hemos decidido siempre escalar de inmediato al código nativo para este caso de uso.

## Acelerando el intérprete de RegExp

### Eliminar la sobrecarga en tiempo de ejecución

Cuando se ejecuta una expresión regular, se invoca una función integrada escrita en [CodeStubAssembler](/blog/csa). Esta función integrada previamente verificaba si el campo de código del objeto JSRegExp contenía código nativo JITted que podía ejecutarse directamente, y de lo contrario llamaba a un método de tiempo de ejecución para compilar (o interpretar en modo sin JIT) el RegExp. En el modo sin JIT, cada ejecución de una expresión regular pasaba por el tiempo de ejecución de V8, lo cual es bastante costoso porque necesitamos pasar entre el código JavaScript y C++ en la pila de ejecución.

A partir de V8 v7.8, cada vez que el compilador de RegExp genera bytecode para interpretar una expresión regular, ahora se almacena un trampolín al intérprete de RegExp en el campo de código del objeto JSRegExp además del bytecode generado. De esta manera, el intérprete ahora se llama directamente desde la función integrada sin un desvío por el tiempo de ejecución.

### Nuevo método de envío

El intérprete de RegExp anteriormente utilizaba un método de envío basado en `switch` simple. La principal desventaja de este método es que la CPU tiene muchas dificultades para predecir el próximo bytecode a ejecutar, lo que resulta en muchas predicciones erróneas de ramificación, ralentizando la ejecución.

Cambiamos el método de envío a código enhebrado en V8 v7.8. Este método permite al predictor de ramificaciones de la CPU predecir el próximo bytecode en función del bytecode que se está ejecutando actualmente, lo que resulta en menos predicciones erróneas. En más detalle, utilizamos una tabla de envío, almacenando un mapeo entre cada ID de bytecode y la dirección del manejador que implementa el bytecode. El intérprete [Ignition](/docs/ignition) de V8 también utiliza este enfoque. Sin embargo, una gran diferencia entre Ignition y el intérprete de RegExp es que los manejadores de bytecode de Ignition están escritos en [CodeStubAssembler](/blog/csa), mientras que todo el intérprete de RegExp está escrito en C++ utilizando [gotolabels calculados](https://gcc.gnu.org/onlinedocs/gcc/Labels-as-Values.html) (una extensión GNU también soportada por clang), que es más fácil de leer y mantener que CSA. Para los compiladores que no soportan gotolabels calculados, volvemos al antiguo método de envío basado en `switch`.

### Optimización peephole de bytecode

Antes de hablar sobre la optimización de peephole del bytecode, veamos un ejemplo motivador.

```js
const re = /[^_]*/;
const str = 'a0b*c_ef';
re.exec(str);
// → coincide con 'a0b*c'
```

Para este patrón sencillo, el compilador de RegExp crea 3 bytecodes que se ejecutan por cada carácter. A alto nivel, estos son:

1. Cargar el carácter actual.
1. Comprobar si el carácter es igual a `'_'`.
1. Si no lo es, avanzar la posición actual en la cadena de sujeto y `goto 1`.

Para nuestra cadena de sujeto, interpretamos 17 bytecodes hasta encontrar un carácter que no coincide. La idea de la optimización de peephole es reemplazar secuencias de bytecodes por un nuevo bytecode optimizado que combine la funcionalidad de múltiples bytecodes. En nuestro ejemplo, incluso podemos manejar el bucle implícito creado por el `goto` explícitamente en el nuevo bytecode, de modo que un único bytecode maneja todos los caracteres coincidentes, ahorrando 16 despachos.

Aunque el ejemplo es inventado, la secuencia de bytecodes descrita aquí ocurre frecuentemente en sitios web del mundo real. Analizamos [sitios web reales](/blog/real-world-performance) y creamos nuevos bytecodes optimizados para las secuencias de bytecodes más frecuentes que encontramos.

## Resultados

![Figura 1: Ahorro de memoria para diferentes valores de tier-up](/_img/regexp-tier-up/results-memory.svg)

La Figura 1 muestra el impacto en la memoria de distintas estrategias de tier-up para historias de navegación en Facebook, Reddit, Twitter y Tumblr. El valor predeterminado es el tamaño del código compilado con JIT, y luego tenemos el tamaño del código RegExp que terminamos usando (tamaño del bytecode si no hacemos tier-up, tamaño del código nativo si lo hacemos) para ticks inicializados a 1, 10 y 100. Finalmente, tenemos el tamaño del código RegExp si interpretamos todas las expresiones regulares. Utilizamos estos resultados y otros benchmarks para decidir activar el tier-up con ticks inicializados en 1, es decir, interpretamos la expresión regular una vez y luego hacemos tier-up.

Con esta estrategia de tier-up en su lugar, hemos reducido el tamaño de heap del código de V8 entre un 4 y un 7% en sitios reales y el tamaño efectivo de V8 entre un 1 y un 2%.

![Figura 2: Comparación de rendimiento de RegExp](/_img/regexp-tier-up/results-speed.svg)

La Figura 2 muestra el impacto en el rendimiento del intérprete de RegExp para todas las mejoras descritas en este post de blog[^strict-bounds] en el conjunto de benchmarks RexBench. Como referencia, también se muestra el rendimiento de las RegExp compiladas con JIT (Nativo).

[^strict-bounds]: Los resultados mostrados aquí también incluyen una mejora para las expresiones regulares ya descrita en las [notas de lanzamiento de V8 v7.8](/blog/v8-release-78#faster-regexp-match-failures).

El nuevo intérprete es hasta 2 veces más rápido que el anterior, con un promedio de aproximadamente 1.45 veces más rápido. Incluso nos acercamos bastante al rendimiento de las RegExp compiladas con JIT para la mayoría de los benchmarks, siendo Regex DNA la única excepción. La razón por la que las RegExp interpretadas son mucho más lentas que las compiladas con JIT en este benchmark se debe a las cadenas de sujeto largas (~300,000 caracteres) utilizadas. Aunque redujimos el overhead del despacho al mínimo, el overhead se acumula en cadenas con más de 1,000 caracteres, lo que resulta en una ejecución más lenta. Debido a que el intérprete es mucho más lento con cadenas largas, hemos añadido una heurística que realiza tier-up de forma anticipada para estas cadenas.

## Conclusión

A partir de V8 v7.9 (Chrome 79), hacemos tier-up a las expresiones regulares en lugar de compilarlas de manera anticipada. Por lo tanto, el intérprete, anteriormente solo utilizado en la versión sin JIT de V8, ahora se usa en todas partes. Como resultado, ahorramos memoria. Aceleramos el intérprete para hacer esto viable. Pero esta no es el fin de la historia: se pueden esperar más mejoras en el futuro.

Nos gustaría aprovechar esta oportunidad para agradecer a todos en el equipo de V8 por su apoyo durante nuestra pasantía. ¡Fue una experiencia increíble!
