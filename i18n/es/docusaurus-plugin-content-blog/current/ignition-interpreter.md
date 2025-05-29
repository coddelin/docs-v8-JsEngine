---
title: "Encendiendo el intérprete Ignition"
author: "Ross McIlroy, V8 Ignition Jump Starter"
avatars:
  - "ross-mcilroy"
date: 2016-08-23 13:33:37
tags:
  - internals
description: "Con el intérprete Ignition, V8 compila funciones JavaScript en un bytecode conciso, que es entre el 50% y el 25% del tamaño del código máquina base equivalente."
---
V8 y otros motores JavaScript modernos obtienen su velocidad mediante la [compilación justo a tiempo (JIT)](https://es.wikipedia.org/wiki/Compilaci%C3%B3n_justo_a_tiempo) del script al código máquina nativo inmediatamente antes de la ejecución. Inicialmente, el código es compilado por un compilador base, que puede generar código máquina no optimizado rápidamente. El código compilado es analizado durante el tiempo de ejecución y, opcionalmente, recompilado dinámicamente con un compilador avanzado optimizador para mejorar el rendimiento. En V8, esta línea de ejecución del script tiene una variedad de casos especiales y condiciones que requieren maquinaria compleja para alternar entre el compilador base y dos compiladores optimizadores, Crankshaft y TurboFan.

<!--truncate-->
Uno de los problemas de este enfoque (además de la complejidad arquitectónica) es que el código máquina JIT puede consumir una cantidad significativa de memoria, incluso si el código solo se ejecuta una vez. Para mitigar este sobrecoste, el equipo de V8 ha creado un nuevo intérprete de JavaScript, llamado Ignition, que puede reemplazar el compilador base de V8, ejecutando el código con menor consumo de memoria y allanando el camino para una línea de ejecución de scripts más simple.

Con Ignition, V8 compila funciones JavaScript en un bytecode conciso, que es entre el 50% y el 25% del tamaño del código máquina base equivalente. Este bytecode luego es ejecutado por un intérprete de alto rendimiento, que proporciona velocidades de ejecución en sitios web reales cercanas a las del código generado por el compilador base actual de V8.

En Chrome 53, Ignition estará habilitado para dispositivos Android que tengan una RAM limitada (512 MB o menos), donde más se necesitan los ahorros de memoria. Los resultados de los primeros experimentos en el campo muestran que Ignition reduce la memoria de cada pestaña de Chrome alrededor de un 5%.

![Línea de compilación de V8 con Ignition habilitado](/_img/ignition-interpreter/ignition-pipeline.png)

## Detalles

Al construir el intérprete de bytecode de Ignition, el equipo consideró una serie de posibles enfoques de implementación. Un intérprete tradicional, escrito en C++, no podría interactuar eficientemente con el resto del código generado por V8. Una alternativa hubiera sido codificar manualmente el intérprete en código ensamblador, sin embargo, dado que V8 admite nueve arquitecturas, esto habría implicado un sobrecoste sustancial de ingeniería.

En cambio, optamos por un enfoque que aprovechó la fortaleza de TurboFan, nuestro nuevo compilador optimizador, que ya está ajustado para una interacción óptima con el entorno de ejecución de V8 y otros códigos generados. El intérprete Ignition utiliza las instrucciones de macroensamblaje de bajo nivel independientes de la arquitectura de TurboFan para generar manejadores de bytecode para cada opcode. TurboFan compila estas instrucciones a la arquitectura objetivo, realizando la selección de instrucciones de bajo nivel y la asignación de registros de máquina en el proceso. Esto da como resultado un código de intérprete altamente optimizado que puede ejecutar las instrucciones de bytecode e interactuar con el resto de la máquina virtual de V8 de una manera de bajo coste, con una cantidad mínima de nueva maquinaria añadida al código base.

Ignition es una máquina de registro, donde cada bytecode especifica sus entradas y salidas como operandos de registro explícitos, a diferencia de una máquina de pila donde cada bytecode consumiría entradas y empujaría salidas en una pila implícita. Un registro acumulador especial es un registro de entrada y salida implícito para muchos bytecodes. Esto reduce el tamaño de los bytecodes al evitar la necesidad de especificar operandos de registro específicos. Dado que muchas expresiones JavaScript involucran cadenas de operaciones que se evalúan de izquierda a derecha, los resultados temporales de estas operaciones pueden permanecer en el acumulador durante la evaluación de la expresión, minimizando la necesidad de operaciones para cargar y almacenar en registros explícitos.

A medida que se genera el bytecode, pasa por una serie de etapas de optimización en línea. Estas etapas realizan un análisis simple en el flujo de bytecode, reemplazando patrones comunes con secuencias más rápidas, eliminando algunas operaciones redundantes y minimizando el número de cargas y transferencias de registros innecesarias. Juntas, las optimizaciones reducen aún más el tamaño del bytecode y mejoran el rendimiento.

Para más detalles sobre la implementación de Ignition, vea nuestra charla en BlinkOn:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Futuro

Hasta ahora, nuestro enfoque con Ignition ha sido reducir la sobrecarga de memoria de V8. Sin embargo, agregar Ignition a nuestra línea de ejecución de scripts abre una serie de posibilidades futuras. La línea de ejecución de Ignition ha sido diseñada para permitirnos tomar decisiones más inteligentes sobre cuándo ejecutar y optimizar el código para acelerar la carga de páginas web y reducir los problemas de rendimiento, así como para hacer más eficiente el intercambio entre los diversos componentes de V8.

Esté atento a los futuros desarrollos de Ignition y V8.
