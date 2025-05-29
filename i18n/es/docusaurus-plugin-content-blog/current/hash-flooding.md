---
title: "Sobre esa vulnerabilidad de inundación de hash en Node.js…"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed))"
avatars:
  - "yang-guo"
date: 2017-08-11 13:33:37
tags:
  - seguridad
description: "Node.js sufrió una vulnerabilidad de inundación de hash. Esta publicación ofrece algunos antecedentes y explica la solución en V8."
---
A principios de julio de este año, Node.js lanzó una [actualización de seguridad](https://nodejs.org/en/blog/vulnerability/july-2017-security-releases/) para todas las ramas actualmente mantenidas para abordar una vulnerabilidad de inundación de hash. Esta solución intermedia tiene el costo de una regresión significativa en el rendimiento al inicio. Mientras tanto, V8 ha implementado una solución que evita la penalización de rendimiento.

<!--truncate-->
En esta publicación, queremos dar algunos antecedentes e historia sobre la vulnerabilidad y la solución final.

## Ataque de inundación de hash

Las tablas hash son una de las estructuras de datos más importantes en la informática. Son ampliamente utilizadas en V8, por ejemplo, para almacenar las propiedades de un objeto. En promedio, insertar una nueva entrada es muy eficiente en [𝒪(1)](https://en.wikipedia.org/wiki/Big_O_notation). Sin embargo, las colisiones de hash podrían llevar a un caso peor de 𝒪(n). Eso significa que insertar n entradas puede tomar hasta 𝒪(n²).

En Node.js, los [encabezados HTTP](https://nodejs.org/api/http.html#http_response_getheaders) se representan como objetos JavaScript. Los pares de nombres y valores de los encabezados se almacenan como propiedades del objeto. Con solicitudes HTTP cuidadosamente preparadas, un atacante podría realizar un ataque de denegación de servicio. Un proceso de Node.js se volvería no respondiera, estando ocupado con inserciones de tabla hash en el peor de los casos.

Este ataque se dio a conocer desde [diciembre de 2011](https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html), y se demostró que afecta a una amplia gama de lenguajes de programación. ¿Por qué tomó tanto tiempo para que V8 y Node.js abordaran finalmente este problema?

De hecho, muy pronto después de la divulgación, los ingenieros de V8 trabajaron con la comunidad de Node.js en una [mitigación](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40). Desde Node.js v0.11.8 en adelante, este problema había sido abordado. La solución introdujo un llamado _valor de semilla de hash_. La semilla de hash se elige aleatoriamente en el inicio y se utiliza para sembrar cada valor de hash en una instancia particular de V8. Sin el conocimiento de la semilla de hash, a un atacante le resulta difícil alcanzar el peor de los casos, y mucho menos idear un ataque que apunte a todas las instancias de Node.js.

Este es parte del mensaje del [commit](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40) de la solución:

> Esta versión solo resuelve el problema para aquellos que compilan V8 por sí mismos o para aquellos que no usan instantáneas. Una V8 precompilada basada en instantáneas todavía tendrá códigos de hash de cadena predecibles.

Esta versión solo resuelve el problema para aquellos que compilan V8 por sí mismos o para aquellos que no usan instantáneas. Una V8 precompilada basada en instantáneas todavía tendrá códigos de hash de cadena predecibles.

## Instantánea de inicio

Las instantáneas de inicio son un mecanismo en V8 para acelerar dramáticamente tanto el inicio del motor como la creación de nuevos contextos (es decir, a través del [módulo vm](https://nodejs.org/api/vm.html) en Node.js). En lugar de configurar objetos iniciales y estructuras de datos internas desde cero, V8 deserializa desde una instantánea existente. Una compilación actualizada de V8 con instantánea se inicia en menos de 3ms y requiere una fracción de milisegundo para crear un nuevo contexto. Sin la instantánea, el inicio toma más de 200ms, y un nuevo contexto más de 10ms. Esta es una diferencia de dos órdenes de magnitud.

Cubrimos cómo cualquier integrador de V8 puede aprovechar las instantáneas de inicio en [una publicación anterior](/blog/custom-startup-snapshots).

Una instantánea preconstruida contiene tablas hash y otras estructuras de datos basadas en valores hash. Una vez inicializada desde la instantánea, la semilla de hash ya no se puede cambiar sin corromper estas estructuras de datos. Una versión de Node.js que agrupa la instantánea tiene una semilla de hash fija, lo que hace que la mitigación sea ineficaz.

De eso se trataba la advertencia explícita en el mensaje del commit.

## Casi solucionado, pero no del todo

Avanzando hasta 2015, un [problema](https://github.com/nodejs/node/issues/1631) en Node.js informa que la creación de un nuevo contexto ha tenido un retroceso en el rendimiento. No es sorprendente, ya que la instantánea de inicio ha sido deshabilitada como parte de la mitigación. Pero para ese momento no todos los participantes en la discusión eran conscientes de la [razón](https://github.com/nodejs/node/issues/528#issuecomment-71009086).

Como se explica en este [post](/blog/math-random), V8 utiliza un generador de números pseudoaleatorios para generar resultados de Math.random. Cada contexto de V8 tiene su propia copia del estado del generador de números aleatorios. Esto es para evitar que los resultados de Math.random sean predecibles entre contextos.

El estado del generador de números aleatorios se inicializa a partir de una fuente externa justo después de que se crea el contexto. No importa si el contexto se crea desde cero o se deserializa desde un snapshot.

De alguna manera, el estado del generador de números aleatorios se ha [confundido](https://github.com/nodejs/node/issues/1631#issuecomment-100044148) con la semilla del hash. Como resultado, un snapshot preconstruido comenzó a formar parte de la versión oficial desde [io.js v2.0.2](https://github.com/nodejs/node/pull/1679).

## Segundo intento

No fue hasta mayo de 2017, durante algunas discusiones internas entre V8, el [Project Zero de Google](https://googleprojectzero.blogspot.com/) y la plataforma en la nube de Google, cuando nos dimos cuenta de que Node.js aún era vulnerable a ataques de inundación de hash.

La respuesta inicial vino de nuestros colegas [Ali](https://twitter.com/ofrobots) y [Myles](https://twitter.com/MylesBorins) del equipo detrás de las [ofertas de Node.js de la plataforma de nube de Google](https://cloud.google.com/nodejs/). Trabajaron con la comunidad de Node.js para [deshabilitar el snapshot de inicio](https://github.com/nodejs/node/commit/eff636d8eb7b009c40fb053802c169ba1417293d) por defecto, nuevamente. Esta vez, también agregaron un [caso de prueba](https://github.com/nodejs/node/commit/9fedc1f09648ff7cebed65883966f5647686a38a).

Pero no queríamos dejarlo ahí. Deshabilitar el snapshot de inicio tiene [impactos significativos](https://github.com/nodejs/node/issues/14229) en el rendimiento. Durante los años, hemos añadido muchas nuevas [características del lenguaje](/blog/high-performance-es2015) [webassembly](/blog/webassembly-browser-preview) y [optimizaciones sofisticadas](/blog/launching-ignition-and-turbofan) [de expresiones regulares](/blog/speeding-up-regular-expressions) en V8. Algunas de estas mejoras hicieron que iniciar desde cero fuera aún más costoso. Inmediatamente después de la publicación de seguridad, comenzamos a trabajar en una solución a largo plazo. El objetivo es poder [volver a habilitar el snapshot de inicio](https://github.com/nodejs/node/issues/14171) sin ser vulnerables a la inundación de hash.

Entre las [soluciones propuestas](https://docs.google.com/document/d/1br7T3jk5JAJSYaT8eZdQlqrPTDRClheGpRU1-BpY1ss/edit), elegimos e implementamos la más pragmática. Después de deserializar desde un snapshot, escogeremos una nueva semilla de hash. Luego, las estructuras de datos afectadas serán rehashadas para garantizar la consistencia.

Resulta que, en un snapshot ordinario de inicio, pocas estructuras de datos están realmente afectadas. Y, para nuestra alegría, el [rehashing de tablas hash](https://github.com/v8/v8/commit/0e8e0030775518b69eb8522823ea3754e6bddc69) se ha facilitado en V8 en el intermedio. La sobrecarga que esto añade es insignificante.

El parche para volver a habilitar el snapshot de inicio ha sido [fusionado](https://github.com/nodejs/node/commit/2ae2874ae7dfec2c55b5d390d25b6eed9932f78d) [en](https://github.com/nodejs/node/commit/14e4254f68f71a6afaf3ebe16794172b08e68d7b) Node.js. Forma parte de la reciente versión Node.js v8.3.0 [lanzada](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367).
