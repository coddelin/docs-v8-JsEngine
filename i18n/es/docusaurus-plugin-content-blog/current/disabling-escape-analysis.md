---
title: &apos;Desactivación temporal del análisis de escape&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)), analista de escape de sandbox&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-09-22 13:33:37
tags:
  - seguridad
description: &apos;Hemos desactivado el análisis de escape de V8 en Chrome 61 para proteger a los usuarios contra una vulnerabilidad de seguridad.&apos;
tweet: &apos;911339802884284416&apos;
---
En JavaScript, un objeto asignado _escapa_ si es accesible desde fuera de la función actual. Normalmente, V8 asigna nuevos objetos en el heap de JavaScript, pero utilizando el análisis de escape, un compilador optimizador puede identificar cuándo un objeto puede ser tratado de manera especial porque su tiempo de vida está demostrablemente limitado a la activación de la función. Cuando la referencia a un objeto recién asignado no escapa de la función que lo crea, los motores de JavaScript no necesitan asignar explícitamente ese objeto en el heap. En su lugar, pueden tratar los valores del objeto como variables locales de la función. Esto, a su vez, permite todo tipo de optimizaciones, como almacenar estos valores en la pila o en registros, o en algunos casos, eliminar los valores por completo. Los objetos que escapan (más precisamente, los objetos de los que no se puede demostrar que no escapan) deben ser asignados en el heap.

<!--truncate-->
Por ejemplo, el análisis de escape permite a V8 reescribir eficazmente el siguiente código:

```js
function foo(a, b) {
  const object = { a, b };
  return object.a + object.b;
  // Nota: `object` no escapa.
}
```

…en este código, que permite varias optimizaciones internas:

```js
function foo(a, b) {
  const object_a = a;
  const object_b = b;
  return object_a + object_b;
}
```

V8 v6.1 y versiones anteriores utilizaban una implementación de análisis de escape que era compleja y generaba muchos errores desde su introducción. Esta implementación ha sido eliminada desde entonces y una base de código completamente nueva de análisis de escape está disponible en [V8 v6.2](/blog/v8-release-62).

No obstante, [se ha descubierto una vulnerabilidad de seguridad en Chrome](https://chromereleases.googleblog.com/2017/09/stable-channel-update-for-desktop_21.html) relacionada con la antigua implementación de análisis de escape en V8 v6.1, y fue divulgada responsablemente a nosotros. Para proteger a nuestros usuarios, hemos desactivado el análisis de escape en Chrome 61. Node.js no debería verse afectado, ya que el exploit depende de la ejecución de JavaScript no confiable.

Desactivar el análisis de escape tiene un impacto negativo en el rendimiento porque desactiva las optimizaciones mencionadas anteriormente. Específicamente, las siguientes características de ES2015 podrían sufrir ralentizaciones temporales:

- desestructuración
- iteración con `for`-`of`
- propagación de arrays
- parámetros rest

Tenga en cuenta que la desactivación del análisis de escape es solo una medida temporal. Con Chrome 62, lanzaremos la nueva — y lo que es más importante, habilitada — implementación de análisis de escape que se encuentra en V8 v6.2.
