---
title: "Un año con Spectre: una perspectiva de V8"
author: "Ben L. Titzer y Jaroslav Sevcik"
avatars:
  - "ben-titzer"
  - "jaroslav-sevcik"
date: 2019-04-23 14:15:22
tags:
  - seguridad
tweet: "1120661732836499461"
description: "El equipo de V8 detalla su análisis y estrategia de mitigación para Spectre, uno de los principales problemas de seguridad informática de 2018."
---
El 3 de enero de 2018, Google Project Zero y otros [revelaron](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) las tres primeras vulnerabilidades de una nueva clase que afecta a las CPU que realizan ejecución especulativa, denominadas [Spectre](https://spectreattack.com/spectre.pdf) y [Meltdown](https://meltdownattack.com/meltdown.pdf). Utilizando los mecanismos de [ejecución especulativa](https://en.wikipedia.org/wiki/Speculative_execution) de las CPU, un atacante podía eludir temporalmente tanto las verificaciones de seguridad implícitas como explícitas en el código que impiden que los programas lean datos no autorizados en la memoria. Aunque la especulación del procesador fue diseñada para ser un detalle microarquitectónico, invisible a nivel arquitectónico, los programas elaborados cuidadosamente podían leer información no autorizada en especulación y divulgarla a través de canales encubiertos como el tiempo de ejecución de un fragmento de programa.

<!--truncate-->
Cuando se demostró que JavaScript podía ser usado para llevar a cabo ataques Spectre, el equipo de V8 se involucró en abordar el problema. Formamos un equipo de respuesta de emergencia y trabajamos de cerca con otros equipos dentro de Google, nuestros socios de otros proveedores de navegadores y nuestros socios de hardware. En conjunto con ellos, participamos proactivamente en investigaciones ofensivas (construcción de gadgets de prueba de concepto) e investigaciones defensivas (mitigaciones para posibles ataques).

Un ataque Spectre consta de dos partes:

1. _Filtrar datos inaccesibles al estado oculto de la CPU._ Todos los ataques Spectre conocidos utilizan la especulación para filtrar bits de datos inaccesibles en las cachés de la CPU.
1. _Extraer el estado oculto_ para recuperar los datos inaccesibles. Para esto, el atacante necesita un reloj de suficiente precisión. (Relojes de resolución sorprendentemente baja pueden ser suficientes, especialmente con técnicas como el umbral de borde).

En teoría, sería suficiente derrotar cualquiera de los dos componentes de un ataque. Debido a que no conocemos ninguna forma de derrotar perfectamente cualquier parte, diseñamos e implementamos mitigaciones que reducen significativamente la cantidad de información filtrada en las cachés de la CPU _y_ mitigaciones que hacen difícil recuperar el estado oculto.

## Temporizadores de alta precisión

Los pequeños cambios de estado que pueden sobrevivir a la ejecución especulativa dan lugar a diferencias de tiempo igualmente pequeñas, casi imposiblemente pequeñas, del orden de una milmillonésima de segundo. Para detectar directamente diferencias individuales tan pequeñas, un programa atacante necesita un temporizador de alta precisión. Las CPU ofrecen tales temporizadores, pero la Plataforma Web no los expone. El temporizador más preciso de la Plataforma Web, `performance.now()`, tenía una resolución de microsegundos de un solo dígito, lo que originalmente se pensó que era inutilizable para este propósito. Sin embargo, hace dos años, un equipo de investigación académica especializado en ataques microarquitectónicos publicó [un artículo](https://gruss.cc/files/fantastictimers.pdf) que estudió la disponibilidad de temporizadores en la plataforma web. Llegaron a la conclusión de que la memoria compartida mutable concurrente y varias técnicas de recuperación de resolución podían permitir la construcción de temporizadores de resolución aún más alta, hasta resoluciones de nanosegundos. Dichos temporizadores son lo suficientemente precisos como para detectar aciertos y fallos individuales en la caché L1, que es generalmente cómo los gadgets Spectre filtran información.

## Mitigaciones de temporizadores

Para interrumpir la capacidad de detectar pequeñas diferencias de tiempo, los proveedores de navegadores tomaron un enfoque multifacético. En todos los navegadores, la resolución de `performance.now()` se redujo (en Chrome, de 5 microsegundos a 100) y se introdujo un ruido aleatorio uniforme para prevenir la recuperación de la resolución. Tras la consulta entre todos los proveedores, juntos decidimos tomar el paso sin precedentes de deshabilitar de forma inmediata y retroactiva la API `SharedArrayBuffer` en todos los navegadores para evitar la construcción de un temporizador de nanosegundos que pudiera utilizarse para ataques Spectre.

## Amplificación

Quedó claro desde el principio en nuestra investigación ofensiva que las mitigaciones de temporizadores por sí solas no serían suficientes. Una de las razones es que un atacante podría simplemente ejecutar repetidamente su gadget para que la diferencia de tiempo acumulativa sea mucho mayor que un solo acierto o fallo en la caché. Pudimos desarrollar gadgets confiables que usan muchas líneas de caché a la vez, hasta la capacidad de la caché, produciendo diferencias de tiempo de hasta 600 microsegundos. Más tarde descubrimos técnicas de amplificación arbitrarias que no están limitadas por la capacidad de la caché. Estas técnicas de amplificación dependen de múltiples intentos para leer los datos secretos.

## Mitigaciones JIT

Para leer datos inaccesibles utilizando Spectre, el atacante engaña a la CPU para que ejecute especulativamente código que lee datos normalmente inaccesibles y los codifica en la caché. El ataque se puede romper de dos maneras:

1. Prevenir la ejecución especulativa del código.
1. Prevenir que la ejecución especulativa lea datos inaccesibles.

Hemos experimentado con (1) insertando las instrucciones recomendadas de barrera de especulación, como `LFENCE` de Intel, en cada rama condicional crítica, y utilizando [retpolines](https://support.google.com/faqs/answer/7625886) para ramas indirectas. Desafortunadamente, tales mitigaciones drásticas reducen enormemente el rendimiento (2–3× de ralentización en el benchmark Octane). En cambio, elegimos el enfoque (2), insertando secuencias de mitigación que evitan la lectura de datos secretos debido a mala especulación. Ilustremos la técnica en el siguiente fragmento de código:

```js
if (condition) {
  return a[i];
}
```

Por simplicidad, asumamos que la condición es `0` o `1`. El código anterior es vulnerable si la CPU lee especulativamente de `a[i]` cuando `i` está fuera de los límites, accediendo a datos normalmente inaccesibles. La observación importante es que, en tal caso, la especulación intenta leer `a[i]` cuando `condition` es `0`. Nuestra mitigación reescribe este programa para que se comporte exactamente como el programa original pero no filtre datos cargados especulativamente.

Reservamos un registro de la CPU que llamamos el veneno para rastrear si el código se está ejecutando en una rama mal predicha. El registro de veneno se mantiene en todas las ramas y llamadas en el código generado, de modo que cualquier rama mal predicha hace que el registro de veneno se vuelva `0`. Luego instrumentamos todos los accesos a memoria para que condicionen incondicionalmente el resultado de todas las cargas con el valor actual del registro de veneno. Esto no impide que el procesador prediga (o falle en la predicción de) ramas, pero destruye la información de los valores cargados (potencialmente fuera de los límites) debido a ramas mal predichas. El código instrumentado se muestra a continuación (asumiendo que `a` es un arreglo de números).

```js/0,3,4
let poison = 1;
// …
if (condition) {
  poison *= condition;
  return a[i] * poison;
}
```

El código adicional no tiene ningún efecto sobre el comportamiento normal (definido por la arquitectura) del programa. Solo afecta al estado microarquitectónico cuando se ejecuta en CPUs que especulan. Si el programa se instrumentó a nivel de fuente, las optimizaciones avanzadas en compiladores modernos podrían eliminar dicha instrumentación. En V8, evitamos que nuestro compilador elimine las mitigaciones insertándolas en una fase muy tardía de la compilación.

También utilizamos la técnica de envenenamiento para prevenir fugas de ramas indirectas mal especuladas en el bucle de despachador de bytecode del intérprete y en la secuencia de llamadas a funciones de JavaScript. En el intérprete, configuramos el veneno a `0` si el manejador de bytecode (es decir, la secuencia de código máquina que interpreta un único bytecode) no coincide con el bytecode actual. Para las llamadas de JavaScript, pasamos la función objetivo como un parámetro (en un registro) y configuramos el veneno a `0` al inicio de cada función si la función objetivo entrante no coincide con la función actual. Con las mitigaciones de envenenamiento en su lugar, observamos menos del 20% de ralentización en el benchmark Octane.

Las mitigaciones para WebAssembly son más simples, ya que la principal verificación de seguridad es asegurar que los accesos a memoria estén dentro de los límites. Para plataformas de 32 bits, además de las verificaciones de límites normales, rellenamos todas las memorias al siguiente poder de dos y enmascaramos incondicionalmente cualquier bit superior de un índice de memoria proporcionado por el usuario. Las plataformas de 64 bits no necesitan tal mitigación, ya que la implementación utiliza protección de memoria virtual para las verificaciones de límites. Experimentamos con compilar declaraciones switch/case a código de búsqueda binaria en lugar de usar una rama indirecta potencialmente vulnerable, pero esto es demasiado costoso en algunas cargas de trabajo. Las llamadas indirectas están protegidas con retpolines.

## Las mitigaciones de software son un camino insostenible

Afortunadamente o desafortunadamente, nuestra investigación ofensiva avanzó mucho más rápido que nuestra investigación defensiva, y rápidamente descubrimos que la mitigación de software de todas las posibles filtraciones debidas a Spectre era inviable. Esto se debió a una variedad de razones. Primero, el esfuerzo de ingeniería desviado a combatir Spectre era desproporcionado en comparación con su nivel de amenaza. En V8 enfrentamos muchas otras amenazas de seguridad que son mucho peores, desde lecturas fuera de límites directas debido a errores regulares (más rápidas y directas que Spectre), escrituras fuera de límites (imposibles con Spectre y peores) y ejecución remota de código potencial (imposible con Spectre y mucho, mucho peor). Segundo, las mitigaciones cada vez más complicadas que diseñamos e implementamos conllevaban una complejidad significativa, lo que constituye una deuda técnica y podría aumentar la superficie de ataque y los costos de rendimiento. Tercero, probar y mantener mitigaciones para filtraciones microarquitectónicas es aún más complicado que diseñar los dispositivos mismos, ya que es difícil estar seguro de que las mitigaciones continúan funcionando como se diseñaron. Al menos una vez, mitigaciones importantes fueron efectivamente deshechas por optimizaciones de compiladores posteriores. Cuarto, encontramos que la mitigación efectiva de algunas variantes de Spectre, particularmente la variante 4, era simplemente inviable en software, incluso después de un esfuerzo heroico de nuestros socios en Apple para combatir el problema en su compilador JIT.

## Aislamiento de sitios

Nuestra investigación llegó a la conclusión de que, en principio, el código no confiable puede leer todo el espacio de direcciones de un proceso utilizando Spectre y canales laterales. Las mitigaciones de software reducen la efectividad de muchos dispositivos potenciales, pero no son eficientes ni exhaustivas. La única mitigación efectiva es mover los datos sensibles fuera del espacio de direcciones del proceso. Afortunadamente, Chrome ya tenía un esfuerzo en curso durante muchos años para separar los sitios en diferentes procesos para reducir la superficie de ataque debido a vulnerabilidades convencionales. Esta inversión dio frutos, y implementamos y desplegamos [aislamiento de sitios](https://developers.google.com/web/updates/2018/07/site-isolation) en tantas plataformas como fue posible para mayo de 2018. Así, el modelo de seguridad de Chrome ya no asume confidencialidad impuesta por el lenguaje dentro de un proceso de renderizado.

Spectre ha sido un largo camino y ha resaltado lo mejor en la colaboración entre proveedores de la industria y la academia. Hasta ahora, los sombreros blancos parecen estar por delante de los sombreros negros. Todavía no conocemos ataques en el mundo real, fuera de los curiosos experimentadores y los investigadores profesionales que desarrollan dispositivos de prueba de concepto. Nuevas variantes de estas vulnerabilidades siguen surgiendo poco a poco y pueden continuar haciéndolo durante algún tiempo. Seguimos monitoreando estas amenazas y tomándolas en serio.

Como muchos con experiencia en lenguajes de programación y sus implementaciones, la idea de que los lenguajes seguros imponen un límite de abstracción adecuado, no permitiendo que programas bien tipados lean memoria arbitraria, ha sido una garantía sobre la cual se han construido nuestros modelos mentales. Es una conclusión deprimente que nuestros modelos estaban equivocados: esta garantía no es cierta en el hardware actual. Por supuesto, todavía creemos que los lenguajes seguros tienen grandes beneficios de ingeniería y seguirán siendo la base para el futuro, pero... en el hardware actual filtran un poco.

Los lectores interesados pueden profundizar más en los detalles en [nuestro documento técnico](https://arxiv.org/pdf/1902.05178.pdf).
