---
title: 'Lanzamiento de V8 v8.4'
author: 'Camillo Bruni, disfrutando de algunos booleanos frescos'
avatars:
 - 'camillo-bruni'
date: 2020-06-30
tags:
 - lanzamiento
description: 'V8 v8.4 incluye referencias débiles y un rendimiento mejorado de WebAssembly.'
tweet: '1277983235641761795'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se bifurca del maestro de Git de V8 justo antes de un hito de Chrome Beta. Hoy estamos encantados de anunciar nuestra rama más reciente, [V8 versión 8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4), que está en beta hasta su lanzamiento en coordinación con Chrome 84 Stable en varias semanas. V8 v8.4 está lleno de todo tipo de novedades orientadas a desarrolladores. Esta publicación ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## WebAssembly

### Tiempo de inicio mejorado

El compilador base de WebAssembly ([Liftoff](https://v8.dev/blog/liftoff)) ahora es compatible con [instrucciones atómicas](https://github.com/WebAssembly/threads) y [operaciones de memoria en bloque](https://github.com/WebAssembly/bulk-memory-operations). Esto significa que incluso si usas estas adiciones a la especificación bastante recientes, obtendrás tiempos de inicio extremadamente rápidos.

### Mejor depuración

En un esfuerzo continuo por mejorar la experiencia de depuración en WebAssembly, ahora podemos inspeccionar cualquier marco de WebAssembly que esté activo cuando pauses la ejecución o alcances un punto de interrupción.
Esto se logró reutilizando [Liftoff](https://v8.dev/blog/liftoff) para la depuración. En el pasado, todo el código que tenía puntos de interrupción o se ejecutaba paso a paso necesitaba ejecutarse en el intérprete de WebAssembly, lo que reducía considerablemente la velocidad de ejecución (a menudo alrededor de 100 veces menos). Con Liftoff, solo pierdes aproximadamente un tercio de tu rendimiento, pero puedes ejecutar paso a paso todo el código e inspeccionarlo en cualquier momento.

### Prueba de origen SIMD

La propuesta SIMD permite que WebAssembly aproveche las instrucciones vectoriales de hardware comúnmente disponibles para acelerar cargas de trabajo intensivas en cálculos. V8 tiene [soporte](https://v8.dev/features/simd) para la [propuesta SIMD de WebAssembly](https://github.com/WebAssembly/simd). Para habilitar esto en Chrome, utiliza la bandera `chrome://flags/#enable-webassembly-simd` o regístrate en una [prueba de origen](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567). [Las pruebas de origen](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md) permiten a los desarrolladores experimentar con una función antes de que se estandarice y proporcionar valiosa retroalimentación. Una vez que un origen se ha inscrito en la prueba, los usuarios están inscritos en la función durante el período de prueba sin tener que actualizar las banderas de Chrome.

## JavaScript

### Referencias débiles y finalizadores

:::note
**¡Advertencia!** Las referencias débiles y los finalizadores son características avanzadas. ¡Dependen del comportamiento de la recolección de basura, que es no determinista y puede que no ocurra en absoluto!
:::

JavaScript es un lenguaje de recolección de basura, lo que significa que la memoria ocupada por objetos que ya no son accesibles por el programa puede ser automáticamente reclamada cuando se ejecuta el recolector de basura. Con la excepción de las referencias en `WeakMap` y `WeakSet`, todas las referencias en JavaScript son fuertes y evitan que el objeto referenciado sea recolectado por el recolector de basura. Por ejemplo:

```js
const globalRef = {
  callback() { console.log('foo'); }
};
// Mientras globalRef sea accesible a través del ámbito global,
// ni este ni la función en su propiedad callback serán recolectados.
```

Los programadores de JavaScript ahora pueden manejar objetos débilmente mediante la función `WeakRef`. Los objetos referenciados por referencias débiles no evitan su recolección de basura si no son también referenciados fuertemente.

```js
const globalWeakRef = new WeakRef({
  callback() { console.log('foo'); }
});

(async function() {
  globalWeakRef.deref().callback();
  // Registra “foo” en la consola. globalWeakRef está garantizado a estar vivo
  // durante el primer ciclo del bucle de eventos después de que fue creado.

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve('foo'); }, 42);
  });
  // Esperar un ciclo del bucle de eventos.

  globalWeakRef.deref()?.callback();
  // El objeto dentro de globalWeakRef podría ser recolectado por el recolector de basura
  // después del primer ciclo, ya que no es accesible por otros medios.
})();
```

La función complementaria de `WeakRef`s es `FinalizationRegistry`, que permite a los programadores registrar callbacks para ser invocados después de que un objeto sea recolectado por el recolector de basura. Por ejemplo, el programa a continuación podría registrar `42` en la consola después de que el objeto inaccesible en la IIFE sea recolectado.

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // El segundo argumento es el valor “retenido” que se pasa
  // al finalizador cuando el primer argumento es recolectado por el recolector de basura.
})();
```

Los finalizadores están programados para ejecutarse en el bucle de eventos y nunca interrumpen la ejecución sincrónica de JavaScript.

Estas son características avanzadas y poderosas, y con suerte, tu programa no las necesitará. ¡Por favor, consulta nuestra [explicación](https://v8.dev/features/weak-references) para aprender más sobre ellas!

### Métodos y accesores privados

Los campos privados, que se lanzaron en la versión 7.4, se completan con soporte para métodos y accesores privados. Sintácticamente, los nombres de los métodos y accesores privados comienzan con `#`, al igual que los campos privados. A continuación se muestra un breve ejemplo de la sintaxis.

```js
class Component {
  #privateMethod() {
    console.log("¡Solo puedo ser llamado dentro de Component!");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

Los métodos y accesores privados tienen las mismas reglas de alcance y semántica que los campos privados. Por favor, consulta nuestra [explicación](https://v8.dev/features/class-fields) para aprender más.

¡Gracias a [Igalia](https://twitter.com/igalia) por contribuir con la implementación!

## API de V8

Por favor, utiliza `git log branch-heads/8.3..branch-heads/8.4 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un repositorio activo de V8 pueden usar `git checkout -b 8.4 -t branch-heads/8.4` para experimentar con las nuevas características en V8 v8.4. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
