---
title: &apos;Emscripten y el backend WebAssembly de LLVM&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - herramientas
description: &apos;Emscripten está cambiando al backend WebAssembly de LLVM, lo que resulta en tiempos de enlace mucho más rápidos y muchos otros beneficios.&apos;
tweet: &apos;1145704863377981445&apos;
---
WebAssembly normalmente se compila desde un lenguaje fuente, lo que significa que los desarrolladores necesitan *herramientas* para usarlo. Debido a esto, el equipo de V8 trabaja en proyectos de código abierto relevantes como [LLVM](http://llvm.org/), [Emscripten](https://emscripten.org/), [Binaryen](https://github.com/WebAssembly/binaryen/) y [WABT](https://github.com/WebAssembly/wabt). Esta publicación describe parte del trabajo que hemos estado haciendo en Emscripten y LLVM, que pronto permitirá que Emscripten cambie al [backend WebAssembly de LLVM](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly) por defecto, ¡pruébalo e informa cualquier problema!

<!--truncate-->
El backend WebAssembly de LLVM ha sido una opción en Emscripten durante algún tiempo, ya que hemos estado trabajando en el backend en paralelo a su integración en Emscripten, y en colaboración con otros en la comunidad de herramientas de WebAssembly de código abierto. Ahora ha alcanzado el punto en que el backend WebAssembly supera al antiguo backend “[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)” en la mayoría de métricas, y por lo tanto nos gustaría cambiar el predeterminado a este. Este anuncio se realiza antes de eso, para obtener la mayor cantidad de pruebas posible.

Esta es una actualización importante por varias razones emocionantes:

- **Enlace mucho más rápido**: el backend WebAssembly de LLVM junto con [`wasm-ld`](https://lld.llvm.org/WebAssembly.html) tiene soporte completo para compilación incremental utilizando archivos de objeto de WebAssembly. Fastcomp usaba LLVM IR en archivos de bitcode, lo que significaba que en el momento del enlace, todo el IR debía ser compilado por LLVM. Esta era la principal razón de los tiempos de enlace lentos. Con los archivos de objeto de WebAssembly, por otro lado, los archivos `.o` contienen WebAssembly ya compilado (en una forma reubicable que se puede enlazar, muy parecido al enlace nativo). Como resultado, la etapa de enlace puede ser mucho, mucho más rápida que con fastcomp; veremos una medición del mundo real a continuación con una mejora de velocidad de 7×.
- **Código más rápido y más pequeño**: hemos trabajado arduamente en el backend WebAssembly de LLVM, así como en el optimizador Binaryen que Emscripten ejecuta después de él. El resultado es que el camino del backend WebAssembly de LLVM ahora supera a fastcomp tanto en velocidad como en tamaño en la mayoría de los benchmarks que seguimos.
- **Soporte para todo LLVM IR**: Fastcomp podía manejar el LLVM IR emitido por `clang`, pero debido a su arquitectura, a menudo fallaba en otras fuentes, específicamente en “legalizar” el IR en tipos que fastcomp podía manejar. El backend WebAssembly de LLVM, por otro lado, utiliza la infraestructura común de backend de LLVM, por lo que puede manejar todo.
- **Nuevas características de WebAssembly**: Fastcomp compila a asm.js antes de ejecutar `asm2wasm`, lo que significa que es difícil manejar nuevas características de WebAssembly como llamadas en cola, excepciones, SIMD y demás. El backend WebAssembly es el lugar natural para trabajar en esas, ¡y de hecho estamos trabajando en todas las características mencionadas!
- **Actualizaciones generales más rápidas desde arriba**: relacionado con el último punto, usar el backend WebAssembly de corriente principal significa que podemos usar la versión más reciente de LLVM corriente arriba en todo momento, lo que significa que podemos obtener nuevas características del lenguaje C++ en `clang`, nuevas optimizaciones de IR de LLVM, etc., tan pronto como se implementen.

## Probando

Para probar el backend WebAssembly, simplemente usa el [último `emsdk`](https://github.com/emscripten-core/emsdk) y ejecuta

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

“Corriente arriba” aquí se refiere al hecho de que el backend WebAssembly de LLVM está en el LLVM corriente arriba, a diferencia de fastcomp. De hecho, dado que está en corriente arriba, ¡no necesitas usar el `emsdk` si construyes LLVM+`clang` tú mismo! (Para usar dicha compilación con Emscripten, simplemente agrega la ruta a ella en tu archivo `.emscripten`.)

Actualmente usar `emsdk [install|activate] latest` todavía usa fastcomp. También existe “latest-fastcomp”, que hace lo mismo. Cuando cambiemos el backend predeterminado, haremos que “latest” haga lo mismo que “latest-upstream”, y en ese momento “latest-fastcomp” será la única forma de obtener fastcomp. Fastcomp sigue siendo una opción mientras siga siendo útil; consulta más notas sobre esto al final.

## Historia

Este será el **tercer** backend en Emscripten y la **segunda** migración. El primer backend estaba escrito en JavaScript y analizaba LLVM IR en forma de texto. Esto fue útil para la experimentación en 2010, pero tenía desventajas obvias, incluyendo que el formato de texto de LLVM cambiaba y la velocidad de compilación no era tan rápida como deseábamos. En 2013 se escribió un nuevo backend en un fork de LLVM, apodado "fastcomp". Fue diseñado para emitir [asm.js](https://en.wikipedia.org/wiki/Asm.js), algo que el backend de JS anterior había sido adaptado para hacer (pero no lo hacía muy bien). Como resultado, fue una gran mejora en calidad de código y tiempos de compilación.

También fue un cambio relativamente menor en Emscripten. Aunque Emscripten es un compilador, el backend original y fastcomp siempre han sido una parte relativamente pequeña del proyecto; hay mucho más código en las bibliotecas del sistema, integración de herramientas, enlaces de lenguaje, etc. Así que mientras cambiar el backend del compilador es un cambio dramático, afecta solo una parte del proyecto general.

## Comparativas

### Tamaño del código

![Mediciones del tamaño del código (más bajo es mejor)](/_img/emscripten-llvm-wasm/size.svg)

(Todos los tamaños aquí están normalizados a fastcomp). Como puedes ver, ¡los tamaños del backend de WebAssembly son casi siempre más pequeños! La diferencia es más notable en los microbenchmarks pequeños de la izquierda (nombres en minúsculas), donde las nuevas mejoras en las bibliotecas del sistema importan más. Pero hay una reducción de tamaño de código incluso en la mayoría de los macrobenchmarks de la derecha (nombres en MAYÚSCULAS), que son bases de código del mundo real. La única regresión en los macrobenchmarks es LZMA, donde LLVM más reciente toma una decisión de inlining diferente que resulta desafortunada.

En general, los macrobenchmarks se reducen en promedio un **3.7%**. ¡Nada mal para una actualización del compilador! Vemos cosas similares en bases de código del mundo real que no están en la suite de pruebas, por ejemplo, [BananaBread](https://github.com/kripken/BananaBread/), un port del [motor de juego Cube 2](http://cubeengine.com/) para la web, se reduce más de un **6%**, y [Doom 3 se reduce](http://www.continuation-labs.com/projects/d3wasm/) un **15%**.

Estas mejoras en tamaño (y las mejoras de velocidad que discutiremos a continuación) se deben a varios factores:

- El generador de código del backend de LLVM es inteligente y puede hacer cosas que backends simples como fastcomp no pueden, como [GVN](https://en.wikipedia.org/wiki/Value_numbering).
- LLVM más reciente tiene mejores optimizaciones de IR.
- Hemos trabajado mucho ajustando el optimizador Binaryen en la salida del backend de WebAssembly, como se mencionó anteriormente.

### Velocidad

![Mediciones de velocidad (más bajo es mejor)](/_img/emscripten-llvm-wasm/speed.svg)

(Las mediciones son en V8). Entre los microbenchmarks, la velocidad presenta un panorama mixto — lo cual no es tan sorprendente, ya que la mayoría de ellos están dominados por una sola función o incluso bucle, por lo que cualquier cambio en el código emitido por Emscripten puede llevar a una elección de optimización afortunada o desafortunada por la VM. En general, un número igual de microbenchmarks permanece igual en comparación con los que mejoran o los que retroceden. Observando los macrobenchmarks más realistas, una vez más LZMA es un caso atípico, nuevamente debido a una decisión de inlining desafortunada como se mencionó antes, pero aparte de eso ¡cada macrobenchmark mejora!

El cambio promedio en los macrobenchmarks es una aceleración del **3.2%**.

### Tiempo de compilación

![Mediciones de tiempo de compilación y enlace en BananaBread (más bajo es mejor)](/_img/emscripten-llvm-wasm/build.svg)

Los cambios en el tiempo de compilación variarán según el proyecto, pero aquí hay algunos números de ejemplo de BananaBread, que es un motor de juego completo pero compacto que consta de 112 archivos y 95,287 líneas de código. A la izquierda tenemos los tiempos de compilación para el paso de compilación, es decir, compilar archivos de origen a archivos objeto, usando el `-O3` predeterminado del proyecto (todos los tiempos están normalizados a fastcomp). Como puedes ver, el paso de compilación toma un poco más de tiempo con el backend de WebAssembly, lo cual tiene sentido porque estamos haciendo más trabajo en esta etapa, en lugar de solo compilar el código fuente a bytecode como lo hace fastcomp, también compilamos el bytecode a WebAssembly.

Mirando a la derecha, tenemos los números para el paso de enlace (también normalizados a fastcomp), es decir, produciendo el ejecutable final, aquí con `-O0`, que es adecuado para una compilación incremental (para una optimizada completamente, probablemente usarías `-O3` también, ver más abajo). Resulta que el ligero aumento durante el paso de compilación vale la pena, porque el enlace es **más de 7× más rápido**. Esa es la verdadera ventaja de la compilación incremental: la mayor parte del paso de enlace es solo una rápida concatenación de archivos objeto. Y si cambias solo un archivo fuente y vuelves a compilar, entonces casi todo lo que necesitas es ese paso de enlace rápido, por lo que puedes ver esta mejora de velocidad todo el tiempo durante el desarrollo del mundo real.

Como se mencionó anteriormente, los cambios en el tiempo de compilación variarán según el proyecto. En un proyecto más pequeño que BananaBread, la velocidad de enlace podría ser menor, mientras que en un proyecto más grande podría ser mayor. Otro factor son las optimizaciones: como se mencionó anteriormente, la prueba se vinculó con `-O0`, pero para una compilación de lanzamiento probablemente querrás usar `-O3`, y en ese caso Emscripten invocará el optimizador de Binaryen en el WebAssembly final, ejecutará [meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/) y otras cosas útiles para el tamaño y la velocidad del código. Eso, por supuesto, lleva más tiempo, pero vale la pena para una compilación final: en BananaBread reduce el WebAssembly de 2.65 a 1.84 MB, una mejora de más del **30%**. Sin embargo, para una compilación incremental rápida puedes omitir eso con `-O0`.

## Problemas conocidos

Si bien el backend LLVM WebAssembly generalmente gana tanto en tamaño de código como en velocidad, hemos visto algunas excepciones:

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp) muestra retrocesos sin [conversión de punto flotante a entero sin trampa](https://github.com/WebAssembly/nontrapping-float-to-int-conversions), una nueva característica de WebAssembly que no estaba en el MVP de WebAssembly. El problema subyacente es que en el MVP una conversión de punto flotante a entero se detendrá si está fuera del rango de enteros válidos. La razón era que esto ya es un comportamiento indefinido en C y fácil de implementar para las máquinas virtuales. Sin embargo, resultó no ser una buena combinación para cómo LLVM compila las conversiones de punto flotante a entero, lo que resulta en la necesidad de protecciones adicionales, sumando tamaño al código y sobrecarga. Las operaciones más recientes que no generan trampas evitan esto, pero es posible que no estén presentes en todos los navegadores todavía. Puedes usarlas compilando los archivos fuente con `-mnontrapping-fptoint`.
- El backend LLVM WebAssembly no solo es diferente de fastcomp, sino que también usa una versión mucho más reciente de LLVM. Una versión más nueva de LLVM puede tomar decisiones de inlining diferentes, que (como todas las decisiones de inlining en ausencia de optimización guiada por perfiles) están impulsadas por heurísticas y pueden terminar ayudando o perjudicando. Un ejemplo específico mencionado anteriormente está en el benchmark de LZMA donde una versión más reciente de LLVM termina inlineando una función 5 veces de una manera que resulta más perjudicial. Si encuentras esto en tus propios proyectos, puedes construir selectivamente ciertos archivos fuente con `-Os` para enfocarte en el tamaño del código, usar `__attribute__((noinline))`, etc.

Pueden haber más problemas de los que no estamos al tanto y que deberían ser optimizados. ¡Por favor avísanos si encuentras algo!

## Otros cambios

Hay un pequeño número de características de Emscripten que están ligadas a fastcomp y/o asm.js, lo que significa que no pueden funcionar automáticamente con el backend WebAssembly, por lo que hemos estado trabajando en alternativas.

### Salida en JavaScript

Una opción para obtener salida no basada en WebAssembly sigue siendo importante en algunos casos: aunque todos los navegadores principales han tenido soporte para WebAssembly durante algún tiempo, todavía hay una larga cola de máquinas antiguas, teléfonos viejos, etc., que no tienen soporte para WebAssembly. Además, a medida que WebAssembly agrega nuevas características, algún tipo de este problema seguirá siendo relevante. Compilar a JS es una forma de garantizar que puedes llegar a todos, incluso si la compilación no es tan pequeña o rápida como lo sería en WebAssembly. Con fastcomp simplemente usábamos la salida asm.js directamente para esto, pero con el backend WebAssembly, obviamente se necesita algo diferente. Estamos usando [`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js) de Binaryen para ese propósito, que como su nombre lo indica, compila WebAssembly a JS.

Esto probablemente justifica una publicación completa en un blog, pero en resumen, una decisión clave de diseño aquí es que ya no tiene sentido admitir asm.js. asm.js puede ejecutarse mucho más rápido que el JS general, pero resulta que prácticamente todos los navegadores que admiten optimizaciones AOT de asm.js también admiten WebAssembly de todos modos (de hecho, Chrome optimiza asm.js convirtiéndolo internamente en WebAssembly). Así que cuando hablamos de una opción de respaldo en JS, bien podría no usar asm.js; de hecho, es más simple, nos permite admitir más características en WebAssembly y también resulta en un JS mucho más pequeño. Por lo tanto, `wasm2js` no tiene como objetivo asm.js.

Sin embargo, un efecto secundario de ese diseño es que si pruebas una compilación asm.js de fastcomp en comparación con una compilación JS con el backend WebAssembly, entonces asm.js puede ser mucho más rápido, si pruebas en un navegador moderno con optimizaciones AOT de asm.js. Ese probablemente sea el caso de tu propio navegador, pero no de los navegadores que realmente necesitarían la opción no basada en WebAssembly. ¡Para una comparación adecuada, deberías usar un navegador sin optimizaciones de asm.js o con ellas deshabilitadas! Si la salida `wasm2js` sigue siendo más lenta, ¡por favor avísanos!

`wasm2js` carece de algunas características menos usadas como vínculos dinámicos e hilos, pero la mayoría del código ya debería funcionar, y se ha probado cuidadosamente. Para probar la salida en JS, simplemente compila con `-s WASM=0` para deshabilitar WebAssembly. `emcc` luego ejecuta `wasm2js` por ti, y si esta es una compilación optimizada, también ejecuta varias optimizaciones útiles.

### Otras cosas que puedes notar

- Las opciones [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify) y [Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter) solo funcionan en fastcomp. Un reemplazo [está](https://github.com/WebAssembly/binaryen/pull/2172) [siendo](https://github.com/WebAssembly/binaryen/pull/2173) [trabajado](https://github.com/emscripten-core/emscripten/pull/8808) [en](https://github.com/emscripten-core/emscripten/issues/8561). Esperamos que eventualmente sea una mejora con respecto a las opciones anteriores.
- Las bibliotecas precompiladas deben ser reconstruidas: si tienes alguna `library.bc` que fue compilada con fastcomp, entonces necesitarás recompilarla desde el código fuente utilizando una versión más reciente de Emscripten. Esto siempre ha sido el caso cuando fastcomp actualizaba LLVM a una nueva versión que cambiaba el formato de bitcode, y el cambio ahora (a archivos de objeto WebAssembly en lugar de bitcode) tiene el mismo efecto.

## Conclusión

Nuestro objetivo principal en este momento es corregir cualquier error relacionado con este cambio. ¡Por favor prueba y reporta problemas!

Después de que las cosas sean estables, cambiaremos el backend predeterminado del compilador al backend de WebAssembly corriente. Fastcomp seguirá siendo una opción, como se mencionó anteriormente.

Nos gustaría eventualmente eliminar fastcomp por completo. Hacerlo eliminaría una carga significativa de mantenimiento, nos permitiría centrarnos más en nuevas características en el backend de WebAssembly, acelerar mejoras generales en Emscripten y otras cosas positivas. Por favor, háznos saber cómo van las pruebas en tus bases de código para que podamos empezar a planificar una línea de tiempo para la eliminación de fastcomp.

### Gracias

Gracias a todos los que participaron en el desarrollo del backend de LLVM WebAssembly, `wasm-ld`, Binaryen, Emscripten y las otras cosas mencionadas en este artículo. Una lista parcial de esas personas increíbles es: aardappel, aheejin, alexcrichton, dschuff, jfbastien, jgravelle, nwilson, sbc100, sunfish, tlively, yurydelendik.
