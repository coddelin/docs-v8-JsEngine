---
title: "V8 lanza la versión v7.7"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), creador perezoso de notas de lanzamiento"
avatars:
  - "mathias-bynens"
date: 2019-08-13 16:45:00
tags:
  - lanzamiento
description: "V8 v7.7 incluye asignación perezosa de retroalimentación, compilación en segundo plano de WebAssembly más rápida, mejoras en las trazas de pila y nueva funcionalidad para Intl.NumberFormat."
tweet: "1161287541611323397"
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 7.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7), que está en beta hasta su lanzamiento en coordinación con Chrome 77 Stable en varias semanas. V8 v7.7 está lleno de todo tipo de novedades para desarrolladores. Este artículo proporciona un avance de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Rendimiento (tamaño y velocidad)

### Asignación perezosa de retroalimentación

Para optimizar JavaScript, V8 recopila retroalimentación sobre los tipos de operandos que se pasan a varias operaciones (por ejemplo, `+` o `o.foo`). Esta retroalimentación se utiliza para optimizar estas operaciones adaptándolas a esos tipos específicos. Esta información se almacena en “vectores de retroalimentación” y, aunque esta información es muy importante para lograr tiempos de ejecución más rápidos, también pagamos un costo por el uso de memoria requerido para asignar estos vectores de retroalimentación.

Para reducir el uso de memoria de V8, ahora asignamos los vectores de retroalimentación de manera perezosa solo después de que la función ha ejecutado una cierta cantidad de bytecode. Esto evita asignar vectores de retroalimentación para funciones de corta duración que no se benefician de la retroalimentación recopilada. Nuestros experimentos de laboratorio muestran que asignar vectores de retroalimentación de manera perezosa ahorra aproximadamente un 2–8% del tamaño del montón de V8.

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

Nuestros experimentos en entornos reales muestran que esto reduce el tamaño del montón de V8 en un 1–2% en plataformas de escritorio y en un 5–6% en plataformas móviles para los usuarios de Chrome. No hay regresiones de rendimiento en escritorio, y en plataformas móviles de hecho vimos una mejora en el rendimiento en teléfonos de gama baja con memoria limitada. Por favor, estén atentos a una publicación en el blog más detallada sobre nuestro trabajo reciente para ahorrar memoria.

### Compilación en segundo plano escalable de WebAssembly

En los últimos hitos, hemos trabajado en la escalabilidad de la compilación en segundo plano de WebAssembly. Cuantos más núcleos tenga tu computadora, más te beneficiarás de este esfuerzo. Los gráficos a continuación se han creado en una máquina Xeon de 24 núcleos, compilando [la demostración Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html). Dependiendo de la cantidad de hilos utilizados, la compilación lleva menos de la mitad del tiempo en comparación con V8 v7.4.

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### Mejoras en las trazas de pila

Casi todos los errores lanzados por V8 capturan una traza de pila cuando se crean. Esta traza de pila se puede acceder desde JavaScript a través de la propiedad no estándar `error.stack`. La primera vez que se recupera una traza de pila mediante `error.stack`, V8 serializa la traza de pila estructurada subyacente en una cadena. Esta traza de pila serializada se conserva para acelerar futuros accesos a `error.stack`.

En las últimas versiones hemos trabajado en algunas [reorganizaciones internas en la lógica de las trazas de pila](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit) ([bug en seguimiento](https://bugs.chromium.org/p/v8/issues/detail?id=8742)), simplificando el código y mejorando el rendimiento de la serialización de trazas de pila hasta en un 30%.

## Características del lenguaje JavaScript

[La API `Intl.NumberFormat`](/features/intl-numberformat) para formato de números según el idioma gana nuevas funcionalidades en esta versión. Ahora admite notación compacta, notación científica, notación de ingeniería, visualización de signos y unidades de medida.

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299,792,458 m/s'
```

Consulta [nuestro explicador de funciones](/features/intl-numberformat) para más detalles.

## API de V8

Por favor usa `git log branch-heads/7.6..branch-heads/7.7 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [entorno activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.7 -t branch-heads/7.7` para experimentar con las nuevas funcionalidades de V8 v7.7. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones por ti mismo pronto.
