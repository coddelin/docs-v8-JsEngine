---
title: &apos;Lanzamiento de V8 v9.4&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-09-06
tags:
 - lanzamiento
description: &apos;El lanzamiento de V8 v9.4 trae bloques de inicialización estáticos de clase a JavaScript.&apos;
tweet: &apos;1434915404418277381&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se crea a partir del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4), que está en beta hasta su lanzamiento en coordinación con Chrome 94 Stable en varias semanas. V8 v9.4 está lleno de todo tipo de novedades orientadas a los desarrolladores. Esta publicación proporciona un avance de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### Bloques de inicialización estáticos de clase

Las clases obtienen la capacidad de agrupar código que debería ejecutarse una vez por evaluación de clase a través de bloques de inicialización estáticos.

```javascript
class C {
  // Este bloque se ejecutará cuando se evalúe la clase en sí misma
  static { console.log("Bloque estático de C&apos;"); }
}
```

A partir de la versión 9.4, los bloques de inicialización estáticos de clase estarán disponibles sin necesidad de la bandera `--harmony-class-static-blocks`. Para obtener todos los detalles sobre la semántica del alcance de estos bloques, consulte [nuestra explicación](https://v8.dev/features/class-static-initializer-blocks).

## API de V8

Utilice `git log branch-heads/9.3..branch-heads/9.4 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con una copia activa de V8 pueden usar `git checkout -b 9.4 -t branch-heads/9.4` para experimentar con las nuevas funciones en V8 v9.4. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones pronto.
