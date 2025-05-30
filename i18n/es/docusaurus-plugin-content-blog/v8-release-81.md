---
title: "Lanzamiento de V8 v8.1"
author: "Dominik Inführ, el hombre internacional (de la internacionalización) misterioso"
avatars: 
  - "dominik-infuehr"
date: 2020-02-25
tags: 
  - lanzamiento
description: "V8 v8.1 incluye soporte mejorado para internacionalización mediante la nueva API Intl.DisplayNames."
---

Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se crea a partir del maestro Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra más reciente rama, [V8 versión 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1), que estará en beta hasta su lanzamiento en coordinación con Chrome 81 estable en varias semanas. V8 v8.1 está lleno de todo tipo de novedades para desarrolladores. Este artículo ofrece un adelanto de algunos de los aspectos destacados antes del lanzamiento.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

La nueva API `Intl.DisplayNames` permite a los programadores mostrar nombres traducidos de idiomas, regiones, escrituras y monedas con facilidad.

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → 'Francés'
enRegionNames.of('US');
// → 'Estados Unidos'
itScriptNames.of('Latn');
// → 'latino'
deCurrencyNames.of('JPY');
// → 'Yen japonés'
```

¡Desplaza hoy la carga de mantenimiento de datos de traducción al entorno de ejecución! Consulta [nuestro explicador de funciones](https://v8.dev/features/intl-displaynames) para obtener detalles sobre la API completa y más ejemplos.

## API de V8

Por favor, utiliza `git log branch-heads/8.0..branch-heads/8.1 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden utilizar `git checkout -b 8.1 -t branch-heads/8.1` para experimentar con las nuevas características de V8 v8.1. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características próximamente.
