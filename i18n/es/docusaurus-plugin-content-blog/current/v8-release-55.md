---
title: "Versión V8 v5.5"
author: "el equipo de V8"
date: "2016-10-24 13:33:37"
tags: 
  - versión
description: "V8 v5.5 llega con un menor consumo de memoria y un mayor soporte para las características del lenguaje ECMAScript."
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se crea a partir de la rama maestra de Git de V8 inmediatamente antes de un hito beta de Chrome. Hoy nos complace anunciar nuestra nueva rama, la [versión V8 5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5), que estará en beta hasta su lanzamiento en coordinación con Chrome 55 Stable en varias semanas. V8 v5.5 está lleno de todo tipo de novedades para los desarrolladores, por lo que queremos ofrecerte un avance de algunos de los aspectos destacados en anticipo al lanzamiento.

<!--truncate-->
## Características del lenguaje

### Funciones asincrónicas

En la versión 5.5, V8 incluye las [funciones asincrónicas](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) de JavaScript ES2017, lo que facilita escribir código que utiliza y crea Promesas. Al usar funciones asincrónicas, esperar a que una Promesa se resuelva es tan simple como escribir await antes de ella y proceder como si el valor estuviera disponible de manera síncrona, sin necesidad de callbacks. Consulta [este artículo](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) para una introducción.

Aquí tienes una función de ejemplo que obtiene una URL y devuelve el texto de la respuesta, escrita en un estilo típico asincrónico basado en Promesas.

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('fallo al obtener', err);
    });
}
```

Aquí está el mismo código reescrito para eliminar callbacks, utilizando funciones asincrónicas.

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('fallo al obtener', err);
  }
}
```

## Mejoras de rendimiento

V8 v5.5 ofrece una serie de mejoras clave en el uso de memoria.

### Memoria

El consumo de memoria es una dimensión importante en el espacio de trade-offs de rendimiento de las máquinas virtuales de JavaScript. Durante las últimas versiones, el equipo de V8 analizó y redujo significativamente el consumo de memoria de varios sitios web que se identificaron como representativos de patrones modernos de desarrollo web. V8 5.5 reduce el consumo general de memoria de Chrome hasta en un 35 % en **dispositivos con poca memoria** (en comparación con V8 5.3 en Chrome 53) gracias a reducciones en el tamaño del heap de V8 y el uso de memoria de zona. Otros segmentos de dispositivos también se benefician de las reducciones de memoria de zona. Consulta el [post dedicado en el blog](/blog/optimizing-v8-memory) para una visión detallada.

## API de V8

Consulta nuestro [resumen de cambios de API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

### Inspector de V8 migrado

El inspector de V8 se migró de Chromium a V8. El código del inspector ahora reside totalmente en el [repositorio de V8](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/).

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 5.5 -t branch-heads/5.5` para experimentar con las nuevas características de V8 5.5. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto tú mismo.
