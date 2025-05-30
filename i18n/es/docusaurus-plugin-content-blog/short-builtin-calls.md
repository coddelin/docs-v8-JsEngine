---
title: "Llamadas internas cortas"
author: "[Toon Verwaest](https://twitter.com/tverwaes), The Big Short"
avatars: 
  - toon-verwaest
date: 2021-05-06
tags: 
  - JavaScript
description: "En V8 v9.1 hemos deshabilitado temporalmente los builtins incrustados en el escritorio para evitar problemas de rendimiento debido a llamadas indirectas lejanas."
tweet: "1394267917013897216"
---

En V8 v9.1 hemos deshabilitado temporalmente los [builtins incrustados](https://v8.dev/blog/embedded-builtins) en el escritorio. Si bien incrustar builtins mejora significativamente el uso de memoria, nos hemos dado cuenta de que las llamadas a funciones entre builtins incrustados y código compilado por JIT pueden conllevar un considerable costo de rendimiento. Este costo depende de la microarquitectura de la CPU. En esta publicación explicaremos por qué sucede esto, cómo se ve el rendimiento y qué planeamos hacer para resolverlo a largo plazo.

<!--truncate-->
## Asignación de código

El código máquina generado por los compiladores just-in-time (JIT) de V8 se asigna dinámicamente en páginas de memoria propiedad de la máquina virtual (VM). V8 asigna páginas de memoria dentro de una región de espacio de direcciones contiguas, que a su vez se encuentra de forma aleatoria en la memoria (por razones de [aleatorización de diseño del espacio de direcciones](https://en.wikipedia.org/wiki/Address_space_layout_randomization)) o dentro de la jaula de memoria virtual de 4 GiB que asignamos para [compresión de punteros](https://v8.dev/blog/pointer-compression).

El código JIT de V8 llama muy comúnmente a los builtins. Los builtins son esencialmente fragmentos de código máquina que se envían como parte de la VM. Hay builtins que implementan funciones completas de la biblioteca estándar de JavaScript, como [`Function.prototype.bind`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_objects/Function/bind), pero muchos builtins son fragmentos auxiliares de código máquina que llenan el vacío entre la semántica de alto nivel de JavaScript y las capacidades de bajo nivel de la CPU. Por ejemplo, si una función de JavaScript desea llamar a otra función de JavaScript, es común que la implementación de la función llame a un builtin `CallFunction` que determine cómo debe llamarse la función de JavaScript de destino; es decir, si es un proxy o una función regular, cuántos argumentos espera, etc. Dado que estos fragmentos se conocen al construir la VM, están "incrustados" en el binario de Chrome, lo que significa que terminan dentro de la región de código binario de Chrome.

## Llamadas directas vs indirectas

En arquitecturas de 64 bits, el binario de Chrome, que incluye estos builtins, se encuentra arbitrariamente lejos del código JIT. Con el conjunto de instrucciones [x86-64](https://en.wikipedia.org/wiki/X86-64), esto significa que no podemos usar llamadas directas: toman un inmediato con signo de 32 bits que se usa como un desplazamiento a la dirección de la llamada, y el destino puede estar a más de 2 GiB de distancia. En su lugar, necesitamos confiar en las llamadas indirectas a través de un registro o un operando de memoria. Tales llamadas dependen más de las predicciones, ya que no es inmediatamente evidente por la instrucción de llamada en sí cuál es el objetivo. En [ARM64](https://en.wikipedia.org/wiki/AArch64) tampoco podemos usar llamadas directas, ya que el rango se limita a 128 MiB. Esto significa que en ambos casos dependemos de la precisión del predictor de ramas indirectas de la CPU.

## Limitaciones de la predicción de ramas indirectas

Cuando se dirige x86-64, sería ideal confiar en las llamadas directas. Esto debería reducir la carga en el predictor de ramas indirectas, ya que el objetivo se conoce después de que se decodifica la instrucción, pero también evita que sea necesario cargar el objetivo en un registro desde una constante o memoria. Sin embargo, no solo se trata de las diferencias obvias visibles en el código máquina.

Debido a [Spectre v2](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html), varias combinaciones de dispositivos/SO han desactivado la predicción de ramas indirectas. Esto significa que en tales configuraciones obtendremos pausas muy costosas en las llamadas a funciones desde el código JIT que confían en el builtin `CallFunction`.

Más importante aún, aunque los conjuntos de instrucciones de arquitectura de 64 bits (el “lenguaje de alto nivel de la CPU”) admiten llamadas indirectas a direcciones lejanas, la microarquitectura es libre de implementar optimizaciones con limitaciones arbitrarias. Parece común que los predictores de ramas indirectas supongan que las distancias de llamada no exceden una cierta distancia (por ejemplo, 4 GiB), lo que requiere menos memoria por predicción. Por ejemplo, el [Manual de Optimización de Intel](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf) declara explícitamente:

> Para aplicaciones de 64 bits, el rendimiento de la predicción de ramas puede verse afectado negativamente cuando el objetivo de una rama está a más de 4 GB de distancia de la rama.

Aunque en ARM64 el rango de llamada arquitectónico para llamadas directas está limitado a 128 MiB, resulta que el chip [M1 de Apple](https://en.wikipedia.org/wiki/Apple_M1) tiene la misma limitación de rango microarquitectónico de 4 GiB para la predicción de llamadas indirectas. Las llamadas indirectas a un destino de llamada más lejano que 4 GiB siempre parecen ser mal predichas. Debido al particularmente grande [buffer de reordenamiento](https://en.wikipedia.org/wiki/Re-order_buffer) del M1, el componente de la CPU que permite que las instrucciones predichas futuras se ejecuten de manera especulativa fuera de orden, las predicciones incorrectas frecuentes resultan en una penalización de rendimiento excepcionalmente grande.

## Solución temporal: copiar los builtins

Para evitar el costo de predicciones incorrectas frecuentes, y para evitar confiar innecesariamente en la predicción de ramas cuando sea posible en x86-64, hemos decidido copiar temporalmente los builtins en la zona de compresión de punteros de V8 en máquinas de escritorio con suficiente memoria. Esto coloca el código builtin copiado cerca del código generado dinámicamente. Los resultados de rendimiento dependen en gran medida de la configuración del dispositivo, pero aquí hay algunos resultados de nuestros bots de rendimiento:

![Benchmarks de navegación registrados desde páginas en vivo](/_img/short-builtin-calls/v8-browsing.svg)

![Mejora en puntuación de benchmarks](/_img/short-builtin-calls/benchmarks.svg)

Desembedir los builtins aumenta el uso de memoria en los dispositivos afectados en 1.2 a 1.4 MiB por instancia de V8. Como una mejor solución a largo plazo, estamos explorando asignar el código JIT más cerca del binario de Chrome. De esa manera podemos reembedir los builtins para recuperar los beneficios de memoria, mientras mejoramos adicionalmente el rendimiento de las llamadas del código generado por V8 al código C++.
