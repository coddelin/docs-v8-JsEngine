---
title: "Maglev - El JIT de optimización más rápido de V8"
author: "[Toon Verwaest](https://twitter.com/tverwaes), [Leszek Swirski](https://twitter.com/leszekswirski), [Victor Gomes](https://twitter.com/VictorBFG), Olivier Flückiger, Darius Mercadier y Camillo Bruni — no hay demasiados cocineros para estropear el caldo"
avatars:
  - toon-verwaest
  - leszek-swirski
  - victor-gomes
  - olivier-flueckiger
  - darius-mercadier
  - camillo-bruni
date: 2023-12-05
tags:
  - JavaScript
description: "El nuevo compilador de V8, Maglev, mejora el rendimiento mientras reduce el consumo de energía"
tweet: ""
---

En Chrome M117 presentamos un nuevo compilador de optimización: Maglev. Maglev se sitúa entre nuestros compiladores existentes Sparkplug y TurboFan, y cumple el rol de un compilador de optimización rápida que genera un código suficientemente bueno, lo suficientemente rápido.


# Antecedentes

Hasta 2021, V8 tenía dos niveles principales de ejecución: Ignition, el intérprete; y [TurboFan](/docs/turbofan), el compilador de optimización de V8 enfocado en el rendimiento máximo. Todo el código JavaScript se compila primero en bytecode de Ignition y se ejecuta interpretándolo. Durante la ejecución, V8 rastrea cómo se comporta el programa, incluyendo el seguimiento de formas y tipos de objetos. Tanto los metadatos de ejecución en tiempo de ejecución como el bytecode se ingresan en el compilador de optimización para generar código máquina de alto rendimiento, a menudo especulativo, que se ejecuta significativamente más rápido que el intérprete.

<!--truncate-->
Estas mejoras son claramente visibles en benchmarks como [JetStream](https://browserbench.org/JetStream2.1/), una colección de benchmarks tradicionales de JavaScript puro que miden el inicio, la latencia y el rendimiento máximo. ¡TurboFan ayuda a que V8 ejecute la suite 4.35 veces más rápido! JetStream pone menos énfasis en el rendimiento sostenido comparado con benchmarks pasados (como el [retirado benchmark Octane](/blog/retiring-octane)), pero debido a la simplicidad de muchos elementos, el código optimizado sigue siendo donde se pasa la mayor parte del tiempo.

[Speedometer](https://browserbench.org/Speedometer2.1/) es un tipo diferente de suite de benchmarks que JetStream. Está diseñado para medir la capacidad de respuesta de una aplicación web cronometrando interacciones simuladas del usuario. En lugar de aplicaciones de JavaScript más pequeñas y autónomas, la suite consiste en páginas web completas, la mayoría de las cuales están construidas utilizando frameworks populares. Como ocurre durante la mayoría de las cargas de páginas web, los elementos de Speedometer pasan mucho menos tiempo ejecutando bucles ajustados de JavaScript y mucho más ejecutando código que interactúa con el resto del navegador.

TurboFan todavía tiene un gran impacto en Speedometer: ¡se ejecuta más de 1.5 veces más rápido! Pero el impacto es claramente mucho más atenuado que en JetStream. Parte de esta diferencia resulta del hecho de que las páginas completas [simplemente pasan menos tiempo en JavaScript puro](/blog/real-world-performance#making-a-real-difference). Pero en parte se debe a que el benchmark pasa mucho tiempo en funciones que no se calientan lo suficiente como para ser optimizadas por TurboFan.

![Benchmarks de rendimiento web que comparan la ejecución no optimizada y optimizada](/_img/maglev/I-IT.svg)

::: nota
Todos los puntajes de benchmarks en esta publicación se midieron con Chrome 117.0.5897.3 en un Macbook Air M2 de 13”.
:::

Dado que la diferencia en velocidad de ejecución y tiempo de compilación entre Ignition y TurboFan es tan grande, en 2021 introdujimos un nuevo JIT de línea base llamado [Sparkplug](/blog/sparkplug). Está diseñado para compilar bytecode a código máquina equivalente casi de manera instantánea.

En JetStream, Sparkplug mejora significativamente el rendimiento en comparación con Ignition (+45%). Incluso cuando TurboFan también está en la imagen, todavía vemos una mejora sólida en el rendimiento (+8%). En Speedometer vemos una mejora del 41% sobre Ignition, acercándola al rendimiento de TurboFan, y una mejora del 22% sobre Ignition + TurboFan. Dado que Sparkplug es tan rápido, podemos implementarlo ampliamente con facilidad y obtener un aumento de velocidad consistente. Si el código no depende únicamente de bucles ajustados de JavaScript de larga duración y fácilmente optimizables, es una gran adición.

![Benchmarks de rendimiento web con Sparkplug añadido](/_img/maglev/I-IS-IT-IST.svg)

Sin embargo, la simplicidad de Sparkplug impone un límite superior relativamente bajo en la aceleración que puede proporcionar. Esto se demuestra claramente por la gran brecha entre Ignition + Sparkplug e Ignition + TurboFan.

Aquí es donde entra Maglev, nuestro nuevo JIT de optimización que genera código mucho más rápido que el código de Sparkplug, pero que se genera mucho más rápido que TurboFan.


# Maglev: Un compilador JIT simple basado en SSA

Cuando comenzamos este proyecto vimos dos caminos posibles para cubrir el vacío entre Sparkplug y TurboFan: intentar generar mejor código utilizando el enfoque de paso único adoptado por Sparkplug o construir un JIT con una representación intermedia (IR). Como sentimos que no tener una IR durante la compilación probablemente restringiría severamente al compilador, decidimos optar por un enfoque algo tradicional basado en asignación estática única (SSA), utilizando un CFG (grafo de flujo de control) en lugar de la representación más flexible pero poco amigable con la caché del "mar de nodos" de TurboFan.

El propio compilador está diseñado para ser rápido y fácil de trabajar. Tiene un conjunto mínimo de pasos y una sencilla IR única que codifica semánticas especializadas de JavaScript.


## Preprocesamiento

Primero, Maglev realiza un preprocesamiento del bytecode para encontrar objetivos de ramificación, incluidos bucles, y asignaciones a variables en el bucle. Este paso también recoge información sobre la vigencia, codificando qué valores en qué variables aún son necesarios en qué expresiones. Esta información puede reducir la cantidad de estado que el compilador necesita rastrear posteriormente.


## SSA

![Una impresión del gráfico SSA de Maglev en la línea de comandos](/_img/maglev/graph.svg)

Maglev realiza una interpretación abstracta del estado del marco, creando nodos SSA que representan los resultados de la evaluación de expresiones. Las asignaciones de variables se emulan almacenando esos nodos SSA en el registro respectivo del intérprete abstracto. En el caso de bifurcaciones y switches, se evalúan todas las rutas.

Cuando varias rutas convergen, los valores en los registros del intérprete abstracto se fusionan insertando los llamados nodos Phi: nodos de valor que saben qué valor elegir dependiendo de qué ruta se tomó en tiempo de ejecución.

Los bucles pueden fusionar valores de variables "en el tiempo", con los datos fluyendo hacia atrás desde el final del bucle hasta el encabezado del bucle, en el caso cuando las variables se asignan en el cuerpo del bucle. Ahí es donde los datos del preprocesamiento resultan útiles: dado que ya sabemos qué variables se asignan dentro de los bucles, podemos pre-crear los nodos Phi de bucle antes de siquiera comenzar a procesar el cuerpo del bucle. Al final del bucle, podemos completar la entrada Phi con el nodo SSA correcto. Esto permite que la generación del gráfico SSA sea un único pase hacia adelante, sin necesidad de "corregir" variables de bucle, mientras se minimiza también la cantidad de nodos Phi que necesitan ser asignados.


## Información de Nodos Conocida

Para ser lo más rápido posible, Maglev realiza todo lo que puede al mismo tiempo. En lugar de construir un gráfico genérico de JavaScript y luego degradarlo durante fases de optimización posteriores, lo que es un enfoque teóricamente limpio pero computacionalmente costoso, Maglev realiza la mayor cantidad de trabajo inmediatamente durante la construcción del gráfico.

Durante la construcción del gráfico, Maglev analizará la metainformación de retroalimentación en tiempo de ejecución recopilada durante una ejecución no optimizada y generará nodos SSA especializados para los tipos observados. Si Maglev observa `o.x` y sabe por la retroalimentación de tiempo de ejecución que `o` siempre tiene una forma específica, generará un nodo SSA para comprobar en tiempo de ejecución que `o` aún tiene la forma esperada, seguido de un nodo `LoadField` barato que realiza un acceso simple por desplazamiento.

Además, Maglev creará un nodo secundario que indica que ahora conoce la forma de `o`, lo que hace innecesario volver a comprobar la forma más adelante. Si Maglev posteriormente encuentra una operación en `o` que no tiene retroalimentación por alguna razón, este tipo de información aprendida durante la compilación se puede utilizar como una segunda fuente de retroalimentación.

La información en tiempo de ejecución puede venir en varias formas. Algunas informaciones necesitan ser comprobadas en tiempo de ejecución, como la comprobación de forma descrita anteriormente. Otras pueden ser utilizadas sin comprobaciones en tiempo de ejecución registrando dependencias en el tiempo de ejecución. Las globales que son de facto constantes (no cambian entre la inicialización y cuando Maglev ve su valor) entran en esta categoría: Maglev no necesita generar código para cargar dinámicamente y comprobar su identidad. Maglev puede cargar el valor en tiempo de compilación e incrustarlo directamente en el código de máquina; si el tiempo de ejecución alguna vez muta esa global, también se encargará de invalidar y desoptimizar ese código de máquina.

Algunas formas de información son “inestables”. Dicha información solo puede ser utilizada en la medida que el compilador sepa con certeza que no puede cambiar. Por ejemplo, si acabamos de asignar un objeto, sabemos que es un nuevo objeto y podemos omitir completamente barreras de escritura costosas. Una vez que ha habido otra asignación potencial, el recolector de basura podría haber movido el objeto, y ahora necesitamos emitir esas comprobaciones. Otros son "estables": si nunca hemos visto que un objeto transicione fuera de una forma determinada, entonces podemos registrar una dependencia de este evento (cualquier objeto que transicione fuera de esa forma particular) y no necesitamos volver a comprobar la forma del objeto, incluso después de una llamada a una función desconocida con efectos secundarios desconocidos.


## Desoptimización

Dado que Maglev puede utilizar información especulativa que verifica en tiempo de ejecución, el código de Maglev necesita ser capaz de desoptimizar. Para que esto funcione, Maglev adjunta el estado del marco del intérprete abstracto a los nodos que pueden desoptimizar. Este estado asigna registros del intérprete a valores SSA. Este estado se convierte en metadatos durante la generación de código, proporcionando un mapeo del estado optimizado al estado no optimizado. El desoptimizador interpreta estos datos, leyendo valores del marco del intérprete y de los registros de la máquina, y colocándolos en los lugares requeridos para la interpretación. Esto se basa en el mismo mecanismo de desoptimización utilizado por TurboFan, lo que nos permite compartir la mayor parte de la lógica y aprovechar las pruebas del sistema existente.


## Selección de Representación

Los números de JavaScript representan, según [la especificación](https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type), un valor de punto flotante de 64 bits. Sin embargo, esto no significa que el motor siempre tenga que almacenarlos como flotantes de 64 bits, especialmente porque, en la práctica, muchos números son enteros pequeños (por ejemplo, índices de arreglos). V8 intenta codificar números como enteros etiquetados de 31 bits (internamente llamados "Small Integers" o "Smi"), tanto para ahorrar memoria (32 bits debido a la [compresión de punteros](/blog/pointer-compression)) como para mejorar el rendimiento (las operaciones con enteros son más rápidas que las operaciones con flotantes).

Para que el código en JavaScript intensivo en cálculos numéricos sea rápido, es importante que se elijan representaciones óptimas para los nodos de valor. A diferencia del intérprete y Sparkplug, el compilador optimizador puede descomponer los valores una vez que conoce su tipo, operando en números crudos en lugar de valores de JavaScript que representan números, y volviendo a empaquetar los valores solo si es estrictamente necesario. Los flotantes pueden pasarse directamente en registros de punto flotante en lugar de asignar un objeto en el heap que contenga el flotante.

Maglev aprende sobre la representación de los nodos SSA principalmente al observar la retroalimentación en tiempo de ejecución de operaciones binarias, por ejemplo, y propagando esa información hacia adelante a través del mecanismo "Known Node Info". Cuando valores SSA con representaciones específicas fluyen hacia Phis, se debe elegir una representación correcta que admita todas las entradas. Los phis de bucle son nuevamente complicados, ya que las entradas dentro del bucle se ven después de que se debe elegir una representación para el phi, el mismo problema "retroactivo" que para la construcción del grafo. Esta es la razón por la que Maglev tiene una fase separada después de la construcción del grafo para hacer la selección de representación en los phis de bucle.


## Asignación de Registros

Después de la construcción del grafo y la selección de representación, Maglev sabe en su mayoría qué tipo de código quiere generar y está "listo" desde el punto de vista clásico de la optimización. Sin embargo, para poder generar código, necesitamos elegir dónde vivirán realmente los valores SSA al ejecutar el código de máquina: cuándo están en registros de máquina y cuándo están guardados en la pila. Esto se logra a través de la asignación de registros.

Cada nodo de Maglev tiene requisitos de entrada y salida, incluidos los requisitos sobre temporales necesarios. El asignador de registros realiza un único recorrido hacia adelante por el grafo, manteniendo un estado abstracto de registro de máquina no muy diferente del estado de interpretación abstracta mantenido durante la construcción del grafo, y satisface esos requisitos, reemplazándolos por ubicaciones reales en el nodo. Esas ubicaciones luego se pueden usar para la generación de código.

Primero, se realiza un preprocesamiento sobre el grafo para encontrar rangos de vida lineales de los nodos, de modo que podamos liberar registros una vez que un nodo SSA ya no sea necesario. Este preprocesamiento también realiza un seguimiento de la cadena de usos. Saber qué tan lejos en el futuro se necesitará un valor puede ser útil para decidir qué valores priorizar y cuáles descartar cuando nos quedamos sin registros.

Después del preprocesamiento, se ejecuta la asignación de registros. La asignación de registros sigue algunas reglas simples y locales: Si un valor ya está en un registro, ese registro se usa si es posible. Los nodos llevan un seguimiento de en qué registros están almacenados durante el recorrido del grafo. Si el nodo aún no tiene un registro, pero hay un registro libre, se elige. El nodo se actualiza para indicar que está en el registro, y el estado abstracto del registro se actualiza para saber que contiene el nodo. Si no hay registro libre, pero se requiere uno, se expulsa otro valor del registro. Idealmente, tenemos un nodo que ya está en un registro diferente y podemos descartarlo "gratis"; de lo contrario, elegimos un valor que no será necesario durante mucho tiempo y lo volcamos a la pila.

En las uniones de ramas, se combinan los estados abstractos de registro de las ramas entrantes. Tratamos de mantener la mayor cantidad posible de valores en registros. Esto puede significar que necesitamos introducir transferencias entre registros, o que necesitamos recuperar valores de la pila, usando movimientos llamados "gap moves". Si una unión de ramas tiene un nodo phi, la asignación de registros asignará registros de salida a los phis. Maglev prefiere asignar los phis a los mismos registros que sus entradas para minimizar los movimientos.

Si más valores SSA están vivos de los que tenemos registros, necesitaremos derramar algunos valores en la pila y restaurarlos más tarde. En el espíritu de Maglev, lo mantenemos simple: si un valor necesita ser derramado, se le indica retroactivamente que derrame inmediatamente en la definición (justo después de que el valor se crea), y la generación de código se encargará de emitir el código de derrame. La definición está garantizada para ‘dominar’ todos los usos del valor (para alcanzar el uso, debemos haber pasado por la definición y, por lo tanto, el código de derrame). Esto también significa que un valor derramado tendrá exactamente un espacio de derrame durante toda la duración del código; los valores con tiempos de vida que se superponen tendrán asignados espacios de derrame que no se superponen.

Debido a la selección de representación, algunos valores en el marco de Maglev serán punteros etiquetados, punteros que el recolector de basura (GC) de V8 entiende y necesita considerar; y algunos no estarán etiquetados, valores que el recolector de basura no debería examinar. TurboFan maneja esto rastreando con precisión qué ranuras de la pila contienen valores etiquetados y cuáles contienen valores no etiquetados, lo cual cambia durante la ejecución a medida que las ranuras se reutilizan para diferentes valores. Para Maglev decidimos simplificar las cosas para reducir la memoria requerida para rastrear esto: dividimos el marco de la pila en una región etiquetada y otra no etiquetada, y solo almacenamos este punto de división.


## Generación de Código

Una vez que sabemos qué expresiones queremos generar código y dónde queremos colocar sus salidas y entradas, Maglev está listo para generar código.

Los nodos de Maglev saben directamente cómo generar código ensamblador usando un “ensamblador macro”. Por ejemplo, un nodo `CheckMap` sabe cómo emitir instrucciones de ensamblador que comparan la forma (internamente llamada el “mapa”) de un objeto de entrada con un valor conocido, y desoptimizar el código si el objeto tenía una forma incorrecta.

Un poco de código algo complicado maneja los movimientos de huecos: los movimientos solicitados creados por el asignador de registros saben que un valor vive en algún lugar y necesita ir a otro lugar. Si hay una secuencia de tales movimientos, un movimiento precedente podría sobrescribir la entrada necesaria para un movimiento subsecuente. El Resolutor de Movimiento Paralelo calcula cómo realizar los movimientos de manera segura para que todos los valores terminen en el lugar correcto.


# Resultados

Entonces, el compilador que acabamos de presentar es claramente mucho más complejo que Sparkplug y mucho más simple que TurboFan. ¿Cómo le va?

En términos de velocidad de compilación, hemos logrado construir un JIT que es aproximadamente 10 veces más lento que Sparkplug, y 10 veces más rápido que TurboFan.

![Comparación del tiempo de compilación de los niveles de compilación, para todas las funciones compiladas en JetStream](/_img/maglev/compile-time.svg)

Esto nos permite implementar Maglev mucho antes de lo que querríamos implementar TurboFan. Si los comentarios en los que se basaba no resultaron ser muy estables todavía, no hay un gran costo en desoptimizar y recompilar más tarde. También nos permite usar TurboFan un poco más tarde: estamos funcionando mucho más rápido de lo que funcionaríamos con Sparkplug.

Colocar Maglev entre Sparkplug y TurboFan resulta en mejoras notables en los benchmarks:

![Benchmarks de rendimiento web con Maglev](/_img/maglev/I-IS-IT-IST-ISTM.svg)

También hemos validado Maglev con datos del mundo real, y vemos buenas mejoras en [Core Web Vitals](https://web.dev/vitals/).

Dado que Maglev compila mucho más rápido, y dado que ahora podemos esperar más tiempo antes de compilar funciones con TurboFan, esto resulta en un beneficio secundario que no es tan visible en la superficie. Los benchmarks se centran en la latencia del hilo principal, pero Maglev también reduce significativamente el consumo total de recursos de V8 al usar menos tiempo de CPU fuera del hilo principal. El consumo de energía de un proceso se puede medir fácilmente en una Macbook basada en M1 o M2 usando `taskinfo`.

:::table-wrapper
| Benchmark   | Consumo de Energía |
| :---------: | :----------------: |
| JetStream   | -3.5%              |
| Speedometer | -10%               |
:::

Maglev no está completo de ninguna manera. Todavía tenemos mucho trabajo por hacer, más ideas para experimentar y más oportunidades fáciles que aprovechar. A medida que Maglev sea más completo, esperamos ver puntuaciones más altas y más reducción en el consumo de energía.

Maglev ya está disponible para Chrome de escritorio y pronto se implementará en dispositivos móviles.
