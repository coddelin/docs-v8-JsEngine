---
title: "Lanzamiento de V8 v5.2"
author: "el equipo de V8"
date: "2016-06-04 13:33:37"
tags: 
  - lanzamiento
description: "V8 v5.2 incluye soporte para características del lenguaje ES2016."
---
Aproximadamente cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el Git master de V8 inmediatamente antes de que Chrome se ramifique para un hito de Chrome Beta. Hoy estamos encantados de anunciar nuestra nueva rama, [V8 versión 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2), que estará en beta hasta que se lance en coordinación con Chrome 52 Estable. V8 5.2 está lleno de todo tipo de novedades orientadas a desarrolladores, por lo que nos gustaría ofrecerles un adelanto de algunos de los aspectos más destacados en anticipación a su lanzamiento en varias semanas.

<!--truncate-->
## Soporte para ES2015 y ES2016

V8 v5.2 incluye soporte para ES2015 (también conocido como ES6) y ES2016 (también conocido como ES7).

### Operador de exponenciación

Esta versión incluye soporte para el operador de exponenciación de ES2016, una notación infija para reemplazar `Math.pow`.

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### Especificación en evolución

Para más información sobre las complejidades detrás del soporte para especificaciones en evolución y las discusiones continuas sobre estándares relacionadas con errores de compatibilidad web y llamadas en cola, consulta la publicación del blog de V8 [ES2015, ES2016, y más allá](/blog/modern-javascript).

## Rendimiento

V8 v5.2 incluye más optimizaciones para mejorar el rendimiento de las funciones integradas de JavaScript, incluidas mejoras para operaciones de Array como el método isArray, el operador in y Function.prototype.bind. Esto forma parte de un trabajo continuo para acelerar las funciones integradas basándose en nuevos análisis de estadísticas de llamadas en tiempo de ejecución en páginas web populares. Para más información, consulta la [charla de V8 en Google I/O 2016](https://www.youtube.com/watch?v=N1swY14jiKc) y espera una próxima publicación en el blog sobre optimizaciones de rendimiento obtenidas de sitios web del mundo real.

## API de V8

Consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 5.2 -t branch-heads/5.2` para experimentar con las nuevas características de V8 v5.2. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características por ti mismo pronto.
