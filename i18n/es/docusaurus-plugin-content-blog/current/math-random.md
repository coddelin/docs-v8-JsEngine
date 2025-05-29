---
title: &apos;Hay `Math.random()`, y luego hay `Math.random()`&apos;
author: &apos;Yang Guo ([@hashseed](https://twitter.com/hashseed)), ingeniero de software y diseñador de dados&apos;
avatars:
  - &apos;yang-guo&apos;
date: 2015-12-17 13:33:37
tags:
  - ECMAScript
  - internals
description: &apos;La implementación de Math.random en V8 ahora utiliza un algoritmo llamado xorshift128+, mejorando la aleatoriedad en comparación con la antigua implementación MWC1616.&apos;
---
> `Math.random()` devuelve un valor de tipo `Number` con signo positivo, mayor o igual a `0` pero menor que `1`, elegido aleatoriamente o pseudo-aleatoriamente con una distribución aproximadamente uniforme en ese rango, utilizando un algoritmo o estrategia dependiente de la implementación. Esta función no toma argumentos.

<!--truncate-->
— _[ES 2015, sección 20.2.2.27](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()` es la fuente de aleatoriedad más conocida y utilizada frecuentemente en JavaScript. En V8 y la mayoría de otros motores de JavaScript, se implementa usando un [generador de números pseudoaleatorios](https://es.wikipedia.org/wiki/Generador_de_n%C3%BAmeros_pseudoaleatorios) (PRNG). Como ocurre con todos los PRNGs, el número aleatorio se deriva de un estado interno que se modifica mediante un algoritmo fijo para cada nuevo número aleatorio. Entonces, para un estado inicial dado, la secuencia de números aleatorios es determinista. Dado que el tamaño en bits n del estado interno está limitado, los números que genera un PRNG eventualmente se repiten. El límite superior para la longitud del periodo de este [ciclo de permutación](https://es.wikipedia.org/wiki/Permutaci%C3%B3n_c%C3%ADclica) es 2<sup>n</sup>.

Existen muchos algoritmos PRNG diferentes; entre los más conocidos están [Mersenne-Twister](https://es.wikipedia.org/wiki/Mersenne_Twister) y [LCG](https://es.wikipedia.org/wiki/Generador_congruencial_lineal). Cada uno tiene sus características particulares, ventajas y desventajas. Idealmente, debería usar la menor cantidad de memoria posible para el estado inicial, ser rápido de ejecutar, tener una longitud de periodo grande y ofrecer una distribución aleatoria de alta calidad. Mientras que el uso de memoria, el rendimiento y la longitud del periodo se pueden medir o calcular fácilmente, la calidad es más difícil de determinar. Hay muchas matemáticas detrás de las pruebas estadísticas para verificar la calidad de los números aleatorios. El estándar de facto de las pruebas PRNG, [TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html), implementa muchas de estas pruebas.

Hasta [finales de 2015](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143) (hasta la versión 4.9.40), la elección de PRNG de V8 era MWC1616 (multiplica con transporte, combinando dos partes de 16 bits). Usa 64 bits de estado interno y se ve aproximadamente así:

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

El valor de 32 bits se convierte luego en un número de punto flotante entre 0 y 1 de acuerdo con la especificación.

MWC1616 usa poca memoria y es bastante rápido de calcular, pero desafortunadamente ofrece una calidad inferior:

- La cantidad de valores aleatorios que puede generar está limitada a 2<sup>32</sup>, en lugar de los 2<sup>52</sup> números entre 0 y 1 que el punto flotante de doble precisión puede representar.
- La mitad más significativa del resultado depende casi por completo del valor de state0. La longitud del periodo sería como máximo 2<sup>32</sup>, pero en lugar de unos pocos ciclos de permutación grandes, hay muchos cortos. Con un estado inicial mal elegido, la longitud del ciclo podría ser menos de 40 millones.
- Falla muchas pruebas estadísticas en el conjunto de pruebas TestU01.

Esto nos fue [señalado](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d), y tras comprender el problema y realizar algunas investigaciones, decidimos reimplementar `Math.random` basándonos en un algoritmo llamado [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf). Usa 128 bits de estado interno, tiene una longitud de periodo de 2<sup>128</sup> - 1 y pasa todas las pruebas del conjunto TestU01.

La implementación [aterrizó en V8 v4.9.41.0](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102) pocos días después de que fuéramos conscientes del problema. Se volvió disponible con Chrome 49. Tanto [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99) como [Safari](https://bugs.webkit.org/show_bug.cgi?id=151641) también cambiaron a xorshift128+.

En V8 v7.1, la implementación se ajustó nuevamente [CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5) dependiendo únicamente de state0. Por favor, encuentren más detalles de la implementación en el [código fuente](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium).

No te equivoques: aunque xorshift128+ es una gran mejora con respecto a MWC1616, todavía no es [criptográficamente seguro](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator). Para casos de uso como hash, generación de firmas y cifrado/descifrado, los PRNG ordinarios no son adecuados. La API de Criptografía Web introduce [`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues), un método que devuelve valores aleatorios criptográficamente seguros, a un costo de rendimiento.

Ten en cuenta, si encuentras áreas de mejora en V8 y Chrome, incluso aquellas que — como esta — no afectan directamente el cumplimiento de especificaciones, la estabilidad o la seguridad, por favor reporta [un problema en nuestro rastreador de errores](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user).
