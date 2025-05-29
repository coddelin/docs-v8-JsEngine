---
title: 'Mejor almacenamiento en caché del código'
author: 'Mythri Alle, Jefa del Almacenamiento en Caché de Código'
date: 2018-04-24 13:33:37
avatars:
  - 'mythri-alle'
tags:
  - internals
tweet: '988728000677142528'
description: 'A partir de Chrome 66, V8 almacena más (byte)código en caché al generar el caché después de la ejecución a nivel superior.'
---
V8 utiliza [almacenamiento en caché de código](/blog/code-caching) para guardar el código generado de scripts usados frecuentemente. A partir de Chrome 66, almacenamos más código en caché al generar el caché después de la ejecución a nivel superior. Esto genera una reducción del 20–40% en el tiempo de análisis y compilación durante la carga inicial.

<!--truncate-->
## Antecedentes

V8 utiliza dos tipos de almacenamiento en caché de código para guardar el código generado y reutilizarlo más tarde. El primero es el caché en memoria, disponible dentro de cada instancia de V8. El código generado después de la compilación inicial se almacena en este caché, utilizando la cadena del código fuente como clave. Este caché está disponible para reutilización dentro de la misma instancia de V8. El otro tipo de almacenamiento en caché de código serializa el código generado y lo guarda en disco para su uso futuro. Este caché no es específico de una instancia particular de V8 y puede usarse entre diferentes instancias de V8. Esta entrada se centra en este segundo tipo de almacenamiento en caché de código, tal como se usa en Chrome. (Otros integradores también usan este tipo de almacenamiento en caché de código; no está limitado a Chrome. Sin embargo, esta entrada solo se centra en su uso en Chrome).

Chrome almacena el código generado serializado en la memoria caché del disco y lo relaciona con la URL del recurso del script. Al cargar un script, Chrome verifica la memoria caché del disco. Si el script ya está almacenado en caché, Chrome pasa los datos serializados a V8 como parte de la solicitud de compilación. Luego, V8 deserializa estos datos en lugar de analizar y compilar el script. También se realizan comprobaciones adicionales para garantizar que el código todavía sea utilizable (por ejemplo: una incompatibilidad de versiones hace que los datos del caché no sean utilizables).

Los datos del mundo real muestran que las tasas de éxito del caché de código (para scripts que podrían almacenarse en caché) son altas (~86%). Aunque las tasas de éxito del caché son altas para estos scripts, la cantidad de código que almacenamos en caché por script no es muy alta. Nuestro análisis mostró que aumentar la cantidad de código almacenado en caché reduciría el tiempo dedicado a analizar y compilar código JavaScript en alrededor del 40%.

## Aumentar la cantidad de código que se almacena en caché

En el enfoque anterior, el almacenamiento en caché de código estaba vinculado con las solicitudes para compilar el script.

Los integradores podían solicitar que V8 serializara el código que generaba durante su compilación a nivel superior de un nuevo archivo fuente de JavaScript. V8 devolvía el código serializado después de compilar el script. Cuando Chrome solicitaba el mismo script nuevamente, V8 recuperaba el código serializado del caché y lo deserializaba. V8 evitaba completamente volver a compilar funciones que ya estaban en el caché. Estos escenarios se muestran en la siguiente figura:

![](/_img/improved-code-caching/warm-hot-run-1.png)

V8 solo compila las funciones que se espera que se ejecuten inmediatamente (IIFEs) durante la compilación a nivel superior y marca otras funciones para compilación diferida. Esto ayuda a mejorar los tiempos de carga de las páginas evitando compilar funciones que no son necesarias, sin embargo, significa que los datos serializados solo contienen el código de las funciones que se compilan de manera inmediata.

Antes de Chrome 59, teníamos que generar el caché de código antes de que comenzara cualquier ejecución. El compilador base anterior de V8 (Full-codegen) generaba código especializado para el contexto de ejecución. Full-codegen utilizaba parches de código para optimizar las operaciones para el contexto de ejecución específico. Tal código no puede ser serializado fácilmente eliminando los datos específicos del contexto para ser usados en otros contextos de ejecución.

Con [el lanzamiento de Ignition](/blog/launching-ignition-and-turbofan) en Chrome 59, esta restricción ya no es necesaria. Ignition utiliza [cachés en línea impulsados por datos](https://www.youtube.com/watch?v=u7zRSm8jzvA) para optimizar operaciones en el contexto de ejecución actual. Los datos dependientes del contexto se almacenan en vectores de retroalimentación y están separados del código generado. Esto ha abierto la posibilidad de generar cachés de código incluso después de la ejecución del script. A medida que ejecutamos el script, se compilan más funciones (que fueron marcadas para compilación diferida), permitiéndonos almacenar más código en el caché.

V8 expone una nueva API, `ScriptCompiler::CreateCodeCache`, para solicitar cachés de código de forma independiente de las solicitudes de compilación. Solicitar cachés de código junto con solicitudes de compilación está obsoleto y no funcionará en V8 v6.6 en adelante. Desde la versión 66, Chrome utiliza esta API para solicitar el caché de código después de la ejecución de nivel superior. La siguiente figura muestra el nuevo escenario de solicitud del caché de código. El caché de código se solicita después de la ejecución de nivel superior y, por lo tanto, contiene el código para funciones que se compilaron más tarde durante la ejecución del script. En las ejecuciones posteriores (mostradas como ejecuciones calientes en la figura siguiente), se evita la compilación de funciones durante la ejecución de nivel superior.

![](/_img/improved-code-caching/warm-hot-run-2.png)

## Resultados

El rendimiento de esta función se mide utilizando nuestros [benchmarks del mundo real](https://cs.chromium.org/chromium/src/tools/perf/page_sets/v8_top_25.py?q=v8.top&sq=package:chromium&l=1) internos. El siguiente gráfico muestra la reducción en el tiempo de análisis y compilación con respecto al esquema de almacenamiento en caché anterior. Hay una reducción de alrededor del 20–40% en el tiempo de análisis y compilación en la mayoría de las páginas.

![](/_img/improved-code-caching/parse.png)

![](/_img/improved-code-caching/compile.png)

Los datos recopilados muestran resultados similares con una reducción del 20–40% en el tiempo dedicado a compilar código JavaScript tanto en escritorio como en móviles. En Android, esta optimización también se traduce en una reducción del 1–2% en las métricas de carga de página de nivel superior, como el tiempo que tarda una página web en ser interactiva. Además, monitoreamos el uso de memoria y disco de Chrome y no observamos regresiones notables.
