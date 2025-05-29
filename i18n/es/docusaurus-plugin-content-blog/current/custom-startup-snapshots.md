---
title: 'Instantáneas personalizadas de inicio'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed)), Ingeniero de software y proveedor de precalentadores de motores'
avatars:
  - 'yang-guo'
date: 2015-09-25 13:33:37
tags:
  - internos
description: 'Los integradores de V8 pueden utilizar instantáneas para evitar el tiempo de inicio generado por las inicializaciones de los programas de JavaScript.'
---
La especificación de JavaScript incluye una gran cantidad de funcionalidades integradas, desde [funciones matemáticas](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math) hasta un [motor de expresiones regulares completo](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions). Cada contexto de V8 recién creado tiene estas funciones disponibles desde el inicio. Para que esto funcione, el objeto global (por ejemplo, el objeto window en un navegador) y toda la funcionalidad integrada deben configurarse e inicializarse en el heap de V8 en el momento en que se crea el contexto. Hacer esto desde cero lleva bastante tiempo.

<!--truncate-->
Afortunadamente, V8 utiliza un atajo para acelerar las cosas: al igual que descongelar una pizza congelada para una cena rápida, deserializamos una instantánea preparada previamente directamente en el heap para obtener un contexto inicializado. En una computadora de escritorio regular, esto puede reducir el tiempo para crear un contexto de 40 ms a menos de 2 ms. En un teléfono móvil promedio, esto podría significar una diferencia entre 270 ms y 10 ms.

Aplicaciones distintas de Chrome que integran V8 pueden requerir más que JavaScript estándar. Muchas cargan scripts de biblioteca adicionales al inicio, antes de que se ejecute la aplicación “real”. Por ejemplo, una simple máquina virtual de TypeScript basada en V8 tendría que cargar el compilador de TypeScript al inicio para traducir el código fuente de TypeScript a JavaScript en tiempo real.

A partir del lanzamiento de V8 v4.3 hace dos meses, los integradores pueden utilizar la creación de instantáneas para evitar el tiempo de inicio generado por dicha inicialización. El [caso de prueba](https://chromium.googlesource.com/v8/v8.git/+/4.5.103.9/test/cctest/test-serialize.cc#661) para esta función muestra cómo funciona esta API.

Para crear una instantánea, podemos llamar a `v8::V8::CreateSnapshotDataBlob` con el script a incrustar como una cadena C terminada en nulo. Después de crear un nuevo contexto, este script se compila y ejecuta. En nuestro ejemplo, creamos dos instantáneas personalizadas de inicio, cada una de las cuales define funciones además de lo que JavaScript ya tiene incorporado.

Luego podemos usar `v8::Isolate::CreateParams` para configurar un aislado recién creado para que inicialice contextos a partir de una instantánea personalizada de inicio. Los contextos creados en ese aislado son copias exactas del contexto del cual tomamos una instantánea. Las funciones definidas en la instantánea están disponibles sin tener que volver a definirlas.

Hay una limitación importante en esto: la instantánea solo puede capturar el heap de V8. Cualquier interacción de V8 con el exterior está prohibida al crear la instantánea. Dichas interacciones incluyen:

- definir y llamar a devoluciones de llamada de la API (es decir, funciones creadas mediante `v8::FunctionTemplate`)
- crear arrays tipados, ya que la memoria respaldada puede asignarse fuera de V8

Y por supuesto, los valores derivados de fuentes como `Math.random` o `Date.now` se fijan una vez que se ha capturado la instantánea. Ya no son realmente aleatorios ni reflejan el tiempo actual.

A pesar de las limitaciones, las instantáneas de inicio siguen siendo una excelente manera de ahorrar tiempo en la inicialización. Podemos ahorrar 100 ms del tiempo de inicio dedicado a cargar el compilador de TypeScript en nuestro ejemplo anterior (en una computadora de escritorio regular). ¡Esperamos ver cómo puedes usar instantáneas personalizadas!
