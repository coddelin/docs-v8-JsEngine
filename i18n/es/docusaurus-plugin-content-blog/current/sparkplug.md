---
title: 'Sparkplug — un compilador de JavaScript no optimizante'
author: '[Leszek Swirski](https://twitter.com/leszekswirski) — quizás no la chispa más brillante, pero al menos la más rápida'
avatars:
  - leszek-swirski
date: 2021-05-27
tags:
  - JavaScript
extra_links:
  - href: https://fonts.googleapis.com/css?family=Gloria+Hallelujah&display=swap
    rel: stylesheet
description: 'En V8 v9.1 estamos mejorando el rendimiento de V8 entre un 5–15% con Sparkplug: un nuevo compilador de JavaScript no optimizante.'
tweet: '1397945205198835719'
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
<style>
  svg \{
    --other-frame-bg: rgb(200 200 200 / 20%);
    --machine-frame-bg: rgb(200 200 200 / 50%);
    --js-frame-bg: rgb(212 205 100 / 60%);
    --interpreter-frame-bg: rgb(215 137 218 / 50%);
    --sparkplug-frame-bg: rgb(235 163 104 / 50%);
  \}
  svg text \{
    font-family: Gloria Hallelujah, cursive;
  \}
  .flipped .frame \{
    transform: scale(1, -1);
  \}
  .flipped .frame text \{
    transform:scale(1, -1);
  \}
</style>
<!-- markdownlint-restore -->

<!--truncate-->
Escribir un motor de JavaScript de alto rendimiento requiere más que solo tener un compilador altamente optimizante como TurboFan. Particularmente en sesiones de corta duración, como cargar sitios web o herramientas de línea de comandos, hay mucho trabajo que ocurre antes de que el compilador optimizante incluso tenga una oportunidad de comenzar a optimizar, y mucho menos tiempo para generar el código optimizado.

Esta es la razón por la cual, desde 2016, nos hemos alejado de rastrear puntos de referencia sintéticos (como Octane) para medir [el rendimiento en el mundo real](/blog/real-world-performance), y por la que desde entonces hemos trabajado arduamente en el rendimiento de JavaScript fuera del compilador optimizante. Esto ha significado trabajar en el analizador, en la transmisión, en nuestro modelo de objetos, en la concurrencia en el recolector de basura, en el almacenamiento en caché del código compilado… digamos que nunca estuvimos aburridos.

Sin embargo, al enfocarnos en mejorar el rendimiento de la ejecución inicial real de JavaScript, comenzamos a toparnos con limitaciones al optimizar nuestro intérprete. El intérprete de V8 está altamente optimizado y es muy rápido, pero los intérpretes tienen gastos generales inherentes que no podemos eliminar; cosas como gastos por decodificación de código de operación o gastos por envío que son parte intrínseca de la funcionalidad de un intérprete.

Con nuestro modelo actual de dos compiladores, no podemos escalar a un código optimizado mucho más rápido; podemos (y estamos) trabajando en hacer que la optimización sea más rápida, pero en algún momento solo puedes ser más rápido eliminando pases de optimización, lo que reduce el rendimiento pico. Aún peor, realmente no podemos comenzar a optimizar antes porque aún no tendremos comentarios estables sobre la forma del objeto.

Aquí entra Sparkplug: nuestro nuevo compilador de JavaScript no optimizante que estamos lanzando con V8 v9.1, el cual se sitúa entre el intérprete Ignition y el compilador optimizante TurboFan.

![El nuevo pipeline del compilador](/_svg/sparkplug/pipeline.svg)

## Un compilador rápido

Sparkplug está diseñado para compilar rápido. Muy rápido. Tan rápido, que podemos prácticamente compilar cuando queramos, lo que nos permite escalar a código Sparkplug mucho más agresivamente que al código TurboFan.

Hay un par de trucos que hacen que el compilador Sparkplug sea rápido. En primer lugar, hace trampa; las funciones que compila ya han sido compiladas a código de operación, y el compilador de código de operación ya ha hecho la mayoría del trabajo pesado como la resolución de variables, determinar si los paréntesis son realmente funciones de flecha, la desestructuración de sentencias, y así sucesivamente. Sparkplug compila a partir de código de operación en lugar del origen de JavaScript, por lo que no tiene que preocuparse por nada de eso.

El segundo truco es que Sparkplug no genera ninguna representación intermedia (IR) como lo hacen la mayoría de los compiladores. En cambio, Sparkplug compila directamente a código máquina en una única pasada lineal sobre el código de operación, emitiendo código que coincide con la ejecución de ese código de operación. De hecho, todo el compilador es una declaración [`switch`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=465;drc=55cbb2ce3be503d9096688b72d5af0e40a9e598b) dentro de un [`for` loop](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=290;drc=9013bf7765d7febaa58224542782307fa952ac14), despachando funciones de generación de código máquina específicas por código de operación.

```cpp
// El compilador Sparkplug (abreviado).
for (; !iterator.done(); iterator.Advance()) {
  VisitSingleBytecode();
}
```

La falta de IR significa que el compilador tiene oportunidades de optimización limitadas, más allá de optimizaciones muy locales. También significa que tenemos que portar toda la implementación por separado para cada arquitectura que respaldamos, ya que no hay una etapa intermedia independiente de la arquitectura. Pero resulta que ninguna de estas cosas es un problema: un compilador rápido es un compilador sencillo, por lo que el código es bastante fácil de portar; y Sparkplug no necesita realizar optimizaciones pesadas, ya que de todos modos tenemos un gran compilador optimizador más adelante en el proceso.

::: nota
Técnicamente, actualmente realizamos dos pasadas del bytecode: una para descubrir bucles y otra para generar el código real. Aunque planeamos deshacernos de la primera eventualmente.
:::

## Marcos compatibles con el intérprete

Agregar un nuevo compilador a una máquina virtual JavaScript madura existente es una tarea desalentadora. Hay todo tipo de cosas que debes respaldar más allá de la ejecución estándar; V8 tiene un depurador, un perfilador de CPU con recorrido de pila, hay trazas de pila para excepciones, integración en el escalamiento, reemplazo en la pila para código optimizado en bucles calientes… es mucho.

Sparkplug realiza un truco ingenioso que simplifica la mayoría de estos problemas, que es que mantiene "marcos de pila compatibles con el intérprete".

Rebobinemos un poco. Los marcos de pila son la forma en que la ejecución del código almacena el estado de las funciones; cada vez que llamas a una nueva función, crea un nuevo marco de pila para las variables locales de esa función. Un marco de pila está definido por un puntero de marco (que marca su inicio) y un puntero de pila (que marca su fin):

![Un marco de pila, con punteros de pila y marco](/_svg/sparkplug/basic-frame.svg)

::: nota
<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
En este punto, aproximadamente la mitad de ustedes estará gritando, diciendo "¡este diagrama no tiene sentido, las pilas obviamente crecen en la dirección opuesta!". No teman, hice un botón para ustedes: <button id="flipStacksButton">Creo que las pilas crecen hacia arriba</button>
<script src="/js/sparkplug.js">
</script>
<!-- markdownlint-restore -->
:::

Cuando se llama a una función, la dirección de retorno se empuja hacia la pila; esto se elimina por la función cuando regresa, para saber a dónde retornar. Luego, cuando esa función crea un nuevo marco, guarda el puntero del marco antiguo en la pila y establece el nuevo puntero de marco al comienzo de su propio marco de pila. Por lo tanto, la pila tiene una cadena de punteros de marco, cada uno marcando el inicio de un marco que apunta al anterior:

![Marcos de pila para múltiples llamadas](/_svg/sparkplug/machine-frame.svg)

::: nota
Estrictamente hablando, esto es solo una convención seguida por el código generado, no un requisito. Sin embargo, es bastante universal; la única vez que realmente se rompe es cuando los marcos de pila se omiten por completo o cuando se pueden usar tablas auxiliares de depuración para recorrer los marcos de pila en su lugar.
:::

Este es el diseño general de la pila para todo tipo de funciones; luego hay convenciones sobre cómo se pasan los argumentos y cómo la función almacena valores en su marco. En V8, tenemos la convención para los marcos de JavaScript de que los argumentos (incluido el receptor) se empujan [en orden inverso](/blog/adaptor-frame) en la pila antes de que se llame a la función, y que las primeras ranuras en la pila son: la función actual que se está llamando; el contexto con el que se está llamando; y la cantidad de argumentos que se pasaron. Este es nuestro diseño "estándar" de marco JS:

![Un marco de pila de JavaScript en V8](/_svg/sparkplug/js-frame.svg)

Esta convención de llamada JS se comparte entre marcos optimizados e interpretados, y es lo que nos permite, por ejemplo, recorrer la pila con una sobrecarga mínima al perfilar código en el panel de rendimiento del depurador.

En el caso del intérprete Ignition, la convención se hace más explícita. Ignition es un intérprete basado en registros, lo que significa que hay registros virtuales (¡no confundirse con los registros de máquina!) que almacenan el estado actual del intérprete — esto incluye locales de funciones JavaScript (declaraciones var/let/const), y valores temporales. Estos registros se almacenan en el marco de pila del intérprete, junto con un puntero al arreglo de bytecode que se está ejecutando, y el desplazamiento del bytecode actual dentro de ese arreglo:

![Un marco de pila del intérprete en V8](/_svg/sparkplug/interpreter-frame.svg)

Sparkplug crea y mantiene intencionalmente un diseño de marco que coincide con el del intérprete; cada vez que el intérprete habría almacenado un valor de registro, Sparkplug también lo almacena. Hace esto por varias razones:

1. Simplifica la compilación de Sparkplug; Sparkplug puede simplemente reflejar el comportamiento del intérprete sin tener que mantener algún tipo de mapeo entre los registros del intérprete y el estado de Sparkplug.
1. También acelera la compilación, ya que el compilador de bytecode ha hecho el trabajo duro de asignación de registros.
1. Hace que la integración con el resto del sistema sea casi trivial; el depurador, el perfilador, el desenrollado de pila por excepciones, la impresión de trazas de pila, todas estas operaciones realizan recorridos de pila para descubrir cuál es la pila actual de funciones en ejecución, y todas estas operaciones continúan funcionando con Sparkplug casi sin cambios, porque, en lo que a ellos respecta, todo lo que tienen es un marco de intérprete.
1. Hace que el reemplazo en la pila (OSR) sea trivial. OSR ocurre cuando la función que se está ejecutando actualmente se reemplaza mientras se está ejecutando; actualmente esto sucede cuando una función interpretada está dentro de un bucle caliente (donde se optimiza el código para ese bucle), y cuando el código optimizado se desoptimiza (donde se degrada y continúa la ejecución de la función en el intérprete). Con los marcos de Sparkplug reflejando los marcos del intérprete, cualquier lógica OSR que funcione para el intérprete funcionará para Sparkplug; aún mejor, podemos intercambiar entre el código del intérprete y Sparkplug con casi cero sobrecarga de traducción de marcos.

Hay un pequeño cambio que hacemos en el marco de pila del intérprete, que es no mantener el desplazamiento de código de bytes actualizado durante la ejecución de código Sparkplug. En su lugar, almacenamos una asignación bidireccional desde el rango de direcciones del código de Sparkplug al desplazamiento correspondiente de código de bytes; una asignación relativamente simple de codificar, ya que el código Sparkplug se emite directamente desde un recorrido lineal sobre el código de bytes. Siempre que un acceso al marco de pila quiera conocer el "desplazamiento de código de bytes" para un marco de Sparkplug, buscamos la instrucción que se está ejecutando actualmente en esta asignación y devolvemos el desplazamiento correspondiente de código de bytes. De manera similar, cuando queremos hacer OSR desde el intérprete a Sparkplug, podemos buscar el desplazamiento actual de código de bytes en la asignación y saltar a la instrucción correspondiente de Sparkplug.

Podrías notar que ahora tenemos un espacio no utilizado en el marco de pila, donde estaría el desplazamiento de código de bytes; uno que no podemos eliminar ya que queremos mantener el resto de la pila sin cambios. Reutilizamos este espacio de pila para almacenar en caché el “vector de retroalimentación” para la función que se está ejecutando; este es el vector que almacena datos de forma de objeto, y necesita cargarse para la mayoría de las operaciones. Todo lo que tenemos que hacer es tener un poco de cuidado alrededor de OSR para asegurarnos de que intercambiamos ya sea el desplazamiento correcto del código de bytes o el vector de retroalimentación correcto para este espacio.

Así, el marco de pila de Sparkplug es:

![Un marco de pila de Sparkplug de V8](/_svg/sparkplug/sparkplug-frame.svg)

## Delegar a funciones integradas

Sparkplug en realidad genera muy poco código propio. Las semánticas de JavaScript son complejas, y tomaría mucho código realizar incluso las operaciones más simples. Forzar a Sparkplug a regenerar este código en línea en cada compilación sería malo por múltiples razones:

  1. Aumentaría los tiempos de compilación notablemente debido a la gran cantidad de código que necesita generarse,
  2. Aumentaría el consumo de memoria del código de Sparkplug, y
  3. Tendríamos que reimplementar la generación de código para un montón de funcionalidades de JavaScript para Sparkplug, lo que probablemente significaría más errores y una mayor superficie de seguridad.

Así que en lugar de todo esto, la mayoría del código de Sparkplug simplemente llama a las “funciones integradas”, pequeños fragmentos de código máquina integrados en el binario, para hacer el trabajo sucio real. Estas funciones integradas son las mismas que utiliza el intérprete, o al menos comparten la mayoría de su código con los manejadores de código de bytes del intérprete.

De hecho, el código Sparkplug es básicamente llamadas a funciones integradas y flujo de control:

Ahora podrías estar pensando, "Bueno, ¿cuál es el propósito de todo esto entonces? ¿No está Sparkplug haciendo el mismo trabajo que el intérprete?" — y no estarías completamente equivocado. En muchos sentidos, Sparkplug es “solo” una serialización de la ejecución del intérprete, llamando a las mismas funciones integradas y manteniendo el mismo marco de pila. Sin embargo, incluso solo esto vale la pena, porque elimina (o más precisamente, precompila) esos inevitables gastos generales del intérprete, como la decodificación de operandos y la gestión de la siguiente instrucción de código.

Resulta que los intérpretes obstaculizan muchas optimizaciones de CPU: los operandos estáticos se leen dinámicamente desde la memoria por el intérprete, obligando a la CPU a detenerse o especular sobre los posibles valores; despachar al siguiente código de bytes requiere una predicción de rama exitosa para mantenerse eficiente, e incluso si las especulaciones y predicciones son correctas, aún has tenido que ejecutar todo ese código de decodificación y despacho, y aún has utilizado espacio valioso en tus diversos búferes y cachés. Una CPU es efectivamente un intérprete en sí misma, aunque para código máquina; visto de esta manera, Sparkplug es un “transpiler” de código de bytes de Ignition a código de bytes de CPU, moviendo tus funciones de ejecutarse en un “emulador” a ejecutarse como “nativo”.

## Rendimiento

Entonces, ¿qué tan bien funciona Sparkplug en la vida real? Ejecutamos Chrome 91 con un par de benchmarks, en algunos de nuestros bots de rendimiento, con y sin Sparkplug, para ver su impacto.

Spoiler: estamos bastante satisfechos.

::: nota
Los benchmarks a continuación enumeran varios bots ejecutando varios sistemas operativos. Aunque el sistema operativo es prominente en el nombre del bot, no creemos que en realidad tenga mucho impacto en los resultados. Más bien, las diferentes máquinas también tienen diferentes configuraciones de CPU y memoria, que creemos son la principal fuente de diferencias.
:::

# Speedometer

[Speedometer](https://browserbench.org/Speedometer2.0/) es un benchmark que intenta emular el uso de marcos de sitios web del mundo real, construyendo una webapp de seguimiento de tareas usando un par de marcos populares, y evaluando el rendimiento de esa aplicación al agregar y eliminar tareas. Hemos encontrado que refleja muy bien los comportamientos de carga e interacción en el mundo real, y hemos encontrado repetidamente que las mejoras en Speedometer se reflejan en nuestras métricas del mundo real.

Con Sparkplug, la puntuación de Speedometer mejora entre un 5 y un 10%, dependiendo de cuál bot estemos observando.

![Mejora media en la puntuación de Speedometer con Sparkplug, en varios bots de rendimiento. Las barras de error indican el rango intercuartílico.](/_img/sparkplug/benchmark-speedometer.svg)

# Pruebas de navegación

Speedometer es un excelente punto de referencia, pero solo cuenta parte de la historia. Además, tenemos un conjunto de "pruebas de navegación", que son grabaciones de un conjunto de sitios web reales que podemos reproducir, scriptar un poco de interacción y obtener una visión más realista de cómo se comportan nuestras diversas métricas en el mundo real.

En estas pruebas, elegimos observar nuestra métrica de "tiempo en el hilo principal de V8", que mide el tiempo total que se pasa en V8 (incluyendo compilación y ejecución) en el hilo principal (es decir, excluyendo el análisis por streaming o la compilación optimizada en segundo plano). Esta es nuestra mejor manera de ver qué tan bien se amortiza Sparkplug mientras excluimos otras fuentes de ruido en las pruebas.

Los resultados son variados y muy dependientes de la máquina y el sitio web, pero en general se ven excelentes: observamos mejoras en el orden del 5–15%.

::: figura Mejora media en el tiempo del hilo principal de V8 en nuestras pruebas de navegación con 10 repeticiones. Las barras de error indican el rango intercuartílico.
![Resultado para el bot linux-perf](/_img/sparkplug/benchmark-browsing-linux-perf.svg) ![Resultado para el bot win-10-perf](/_img/sparkplug/benchmark-browsing-win-10-perf.svg) ![Resultado para el bot benchmark-browsing-mac-10_13_laptop_high_end-perf](/_img/sparkplug/benchmark-browsing-mac-10_13_laptop_high_end-perf.svg) ![Resultado para el bot mac-10_12_laptop_low_end-perf](/_img/sparkplug/benchmark-browsing-mac-10_12_laptop_low_end-perf.svg) ![Resultado para el bot mac-m1_mini_2020](/_img/sparkplug/benchmark-browsing-mac-m1_mini_2020-perf.svg)
:::

En conclusión: V8 tiene un nuevo compilador súper rápido sin optimización, que mejora el rendimiento de V8 en pruebas del mundo real en un 5–15%. Ya está disponible en V8 v9.1 detrás del indicador `--sparkplug`, y lo estaremos implementando en Chrome 91.
