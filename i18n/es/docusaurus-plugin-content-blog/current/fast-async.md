---
title: "Funciones asíncronas y promesas más rápidas"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), anticipadora siempre a la espera, y Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), prometedor profesional de rendimiento"
avatars:
  - "maya-armyanova"
  - "benedikt-meurer"
date: 2018-11-12 16:45:07
tags:
  - ECMAScript
  - benchmarks
  - presentations
description: "Las funciones asíncronas y las promesas más rápidas y fáciles de depurar están llegando a V8 v7.2 / Chrome 72."
tweet: "1062000102909169670"
---
El procesamiento asíncrono en JavaScript tradicionalmente tenía la reputación de no ser particularmente rápido. Para empeorar las cosas, depurar aplicaciones JavaScript en vivo — en particular servidores Node.js — no es una tarea fácil, _especialmente_ cuando se trata de programación asíncrona. Afortunadamente, los tiempos están cambiando. Este artículo explora cómo optimizamos las funciones asíncronas y las promesas en V8 (y hasta cierto punto en otros motores de JavaScript), y describe cómo mejoramos la experiencia de depuración para el código asíncrono.

<!--truncate-->
:::note
**Nota:** Si prefieres ver una presentación en lugar de leer artículos, ¡disfruta el video a continuación! Si no, salta el video y sigue leyendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Un nuevo enfoque para la programación asíncrona

### De callbacks a promesas a funciones asíncronas

Antes de que las promesas fueran parte del lenguaje JavaScript, las APIs basadas en callbacks eran comúnmente utilizadas para el código asíncrono, especialmente en Node.js. Aquí hay un ejemplo:

```js
function handler(done) {
  validateParams((error) => {
    if (error) return done(error);
    dbQuery((error, dbResults) => {
      if (error) return done(error);
      serviceCall(dbResults, (error, serviceResults) => {
        console.log(result);
        done(error, serviceResults);
      });
    });
  });
}
```

El patrón específico de usar callbacks profundamente anidados de esta manera es comúnmente referido como _“infierno de callbacks”_, porque hace que el código sea menos legible y más difícil de mantener.

Afortunadamente, ahora que las promesas son parte del lenguaje JavaScript, el mismo código puede ser escrito de una manera más elegante y mantenible:

```js
function handler() {
  return validateParams()
    .then(dbQuery)
    .then(serviceCall)
    .then(result => {
      console.log(result);
      return result;
    });
}
```

Incluso más recientemente, JavaScript obtuvo soporte para [funciones asíncronas](https://web.dev/articles/async-functions). El código asíncrono anterior ahora puede ser escrito de una manera que se parece mucho al código síncrono:

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

Con las funciones asíncronas, el código se vuelve más conciso, y el flujo de control y de datos es mucho más fácil de seguir, a pesar de que la ejecución sigue siendo asíncrona. (Ten en cuenta que la ejecución de JavaScript aún ocurre en un único hilo, lo que significa que las funciones asíncronas no terminan creando hilos físicos por sí mismas).

### De callbacks de eventos a iteración asíncrona

Otro paradigma asíncrono que es especialmente común en Node.js es el de [`ReadableStream`s](https://nodejs.org/api/stream.html#stream_readable_streams). Aquí hay un ejemplo:

```js
const http = require('http');

http.createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    res.write(body);
    res.end();
  });
}).listen(1337);
```

Este código puede ser un poco difícil de seguir: los datos entrantes se procesan en fragmentos que solo son accesibles dentro de los callbacks, y la señalización de fin de flujo también ocurre dentro de un callback. Es fácil introducir errores aquí cuando no te das cuenta de que la función termina inmediatamente y que el procesamiento real tiene que ocurrir en los callbacks.

Afortunadamente, una nueva función interesante de ES2018 llamada [iteración asíncrona](http://2ality.com/2016/10/asynchronous-iteration.html) puede simplificar este código:

```js
const http = require('http');

http.createServer(async (req, res) => {
  try {
    let body = '';
    req.setEncoding('utf8');
    for await (const chunk of req) {
      body += chunk;
    }
    res.write(body);
    res.end();
  } catch {
    res.statusCode = 500;
    res.end();
  }
}).listen(1337);
```

En lugar de colocar la lógica que maneja el procesamiento real de la solicitud en dos callbacks diferentes — el `'data'` y el callback `'end'` — ahora podemos poner todo en una sola función asíncrona, y usar el nuevo bucle `for await…of` para iterar sobre los fragmentos de manera asíncrona. También añadimos un bloque `try-catch` para evitar el problema de `unhandledRejection`[^1].

[^1]: Gracias a [Matteo Collina](https://twitter.com/matteocollina) por señalarnos [este problema](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem).

¡Ya puedes utilizar estas nuevas características en producción hoy mismo! Las funciones async son **totalmente compatibles a partir de Node.js 8 (V8 v6.2 / Chrome 62)**, y los iteradores y generadores async son **totalmente compatibles a partir de Node.js 10 (V8 v6.8 / Chrome 68)**.

## Mejoras de rendimiento en Async

Hemos logrado mejorar significativamente el rendimiento del código asincrónico entre V8 v5.5 (Chrome 55 y Node.js 7) y V8 v6.8 (Chrome 68 y Node.js 10). Alcanzamos un nivel de rendimiento donde los desarrolladores pueden utilizar con confianza estos nuevos paradigmas de programación sin preocuparse por la velocidad.

![](/_img/fast-async/doxbee-benchmark.svg)

El gráfico anterior muestra el [doxbee benchmark](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js), el cual mide el rendimiento de código que utiliza intensivamente promesas. Ten en cuenta que el gráfico visualiza el tiempo de ejecución, lo que significa que menor es mejor.

Los resultados en el [benchmark paralelo](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js), que específicamente pone a prueba el rendimiento de [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all), son aún más emocionantes:

![](/_img/fast-async/parallel-benchmark.svg)

Hemos logrado mejorar el rendimiento de `Promise.all` por un factor de **8×**.

Sin embargo, los benchmarks anteriores son micro-benchmarks sintéticos. El equipo de V8 está más interesado en cómo nuestras optimizaciones afectan el [rendimiento del mundo real en código de usuarios reales](/blog/real-world-performance).

![](/_img/fast-async/http-benchmarks.svg)

El gráfico anterior visualiza el rendimiento de algunos frameworks populares de middleware HTTP que utilizan intensivamente promesas y funciones `async`. Observa que este gráfico muestra el número de solicitudes por segundo, por lo que, a diferencia de los gráficos anteriores, mayor es mejor. El rendimiento de estos frameworks mejoró significativamente entre Node.js 7 (V8 v5.5) y Node.js 10 (V8 v6.8).

Estas mejoras de rendimiento son el resultado de tres logros clave:

- [TurboFan](/docs/turbofan), el nuevo compilador optimizador 🎉
- [Orinoco](/blog/orinoco), el nuevo recolector de basura 🚛
- un error en Node.js 8 que hacía que `await` omitiera microticks 🐛

Cuando [lanzamos TurboFan](/blog/launching-ignition-and-turbofan) en [Node.js 8](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367), esto dio un gran impulso de rendimiento en general.

También hemos estado trabajando en un nuevo recolector de basura, llamado Orinoco, que mueve el trabajo de recolección de basura fuera del hilo principal, mejorando así significativamente el procesamiento de solicitudes.

Y por último, pero no menos importante, había un error útil en Node.js 8 que hacía que `await` omitiera microticks en algunos casos, lo que resultaba en un mejor rendimiento. El error comenzó como una violación no intencionada de la especificación, pero luego nos dio la idea para una optimización. Empecemos explicando el comportamiento erróneo:

:::note
**Nota:** El siguiente comportamiento era correcto según la especificación de JavaScript en el momento de escribir esto. Desde entonces, nuestra propuesta de especificación fue aceptada, y el siguiente comportamiento "erróneo" ahora es correcto.
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log('after:await');
})();

p.then(() => console.log('tick:a'))
 .then(() => console.log('tick:b'));
```

El programa anterior crea una promesa cumplida `p`, y realiza un `await` en su resultado, pero también encadena dos manejadores a ella. ¿En qué orden esperarías que se ejecuten las llamadas `console.log`?

Dado que `p` está cumplida, podrías esperar que imprima primero `'after:await'` y luego los `'tick's. De hecho, ese es el comportamiento que obtendrías en Node.js 8:

![El error de `await` en Node.js 8](/_img/fast-async/await-bug-node-8.svg)

Aunque este comportamiento parece intuitivo, no es correcto según la especificación. Node.js 10 implementa el comportamiento correcto, que es ejecutar primero los manejadores encadenados, y solo después continuar con la función async.

![Node.js 10 ya no tiene el error de `await`](/_img/fast-async/await-bug-node-10.svg)

Este _“comportamiento correcto”_ no es inmediatamente obvio y fue sorprendente para los desarrolladores de JavaScript, por lo que merece una explicación. Antes de sumergirnos en el mundo mágico de las promesas y las funciones async, comencemos con algunos fundamentos.

### Tareas vs. microtareas

A un nivel alto hay _tareas_ y _microtareas_ en JavaScript. Las tareas manejan eventos como I/O y temporizadores, y se ejecutan una a la vez. Las microtareas implementan ejecución diferida para `async`/`await` y promesas, y se ejecutan al final de cada tarea. La cola de microtareas siempre se vacía antes de que la ejecución regrese al event loop.

![La diferencia entre microtareas y tareas](/_img/fast-async/microtasks-vs-tasks.svg)

Para más detalles, consulta la explicación de Jake Archibald sobre [tareas, microtareas, colas y cronogramas en el navegador](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/). El modelo de tareas en Node.js es muy similar.

### Funciones Async

Según MDN, una función async es una función que opera de forma asíncrona utilizando una promesa implícita para devolver su resultado. Las funciones async están diseñadas para hacer que el código asíncrono parezca sincrónico, ocultando parte de la complejidad del procesamiento asíncrono al desarrollador.

La función async más sencilla posible se ve así:

```js
async function computeAnswer() {
  return 42;
}
```

Cuando se llama, devuelve una promesa, y puedes obtener su valor como con cualquier otra promesa.

```js
const p = computeAnswer();
// → Promesa

p.then(console.log);
// imprime 42 en el siguiente turno
```

Solo obtienes el valor de esta promesa `p` la próxima vez que se ejecuten las microtareas. En otras palabras, el programa anterior es semánticamente equivalente a usar `Promise.resolve` con el valor:

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

El verdadero poder de las funciones async proviene de las expresiones `await`, que causan que la ejecución de la función se pause hasta que se resuelva una promesa, y se reanude después de que se haya cumplido. El valor de `await` es el de la promesa cumplida. Aquí hay un ejemplo que muestra lo que eso significa:

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

La ejecución de `fetchStatus` se suspende en el `await`, y se reanuda más tarde cuando se cumple la promesa de `fetch`. Esto es, más o menos, equivalente a encadenar un manejador a la promesa devuelta por `fetch`.

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

Ese manejador contiene el código que sigue al `await` en la función async.

Normalmente pasarías una `Promesa` a `await`, pero en realidad puedes esperar cualquier valor arbitrario de JavaScript. Si el valor de la expresión después de `await` no es una promesa, se convierte en una promesa. Eso significa que puedes hacer `await 42` si quieres hacerlo:

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → Promesa

p.then(console.log);
// imprime `42` eventualmente
```

Más interesante aún, `await` funciona con cualquier [“thenable”](https://promisesaplus.com/), es decir, cualquier objeto con un método `then`, incluso si no es una verdadera promesa. Por lo tanto, puedes implementar cosas curiosas como un sleep asíncrono que mide el tiempo real que se ha esperado:

```js
class Sleep {
  constructor(timeout) {
    this.timeout = timeout;
  }
  then(resolve, reject) {
    const startTime = Date.now();
    setTimeout(() => resolve(Date.now() - startTime),
               this.timeout);
  }
}

(async () => {
  const actualTime = await new Sleep(1000);
  console.log(actualTime);
})();
```

Veamos qué hace V8 para `await` bajo el capó, siguiendo la [especificación](https://tc39.es/ecma262/#await). Aquí tienes una función async simple `foo`:

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

Cuando se llama, envuelve el parámetro `v` en una promesa y suspende la ejecución de la función async hasta que esa promesa se resuelva. Una vez que eso ocurre, la ejecución de la función se reanuda y a `w` se le asigna el valor de la promesa cumplida. Este valor luego se devuelve desde la función async.

### `await` bajo el capó

Primero que nada, V8 marca esta función como _resumable_, lo que significa que la ejecución puede suspenderse y luego reanudarse (en los puntos `await`). Luego crea la llamada `implicit_promise`, que es la promesa que se devuelve cuando invocas la función async, y que eventualmente se resuelve con el valor producido por la función async.

![Comparación entre una función async simple y lo que el motor convierte](/_img/fast-async/await-under-the-hood.svg)

Luego viene la parte interesante: el `await` real. Primero, el valor pasado a `await` se envuelve en una promesa. Luego, se adjuntan manejadores a esta promesa envuelta para reanudar la función una vez que la promesa se cumpla, y la ejecución de la función async se suspende, devolviendo la `implicit_promise` al llamador. Una vez que la `promise` se cumple, la ejecución de la función async se reanuda con el valor `w` de la `promise`, y la `implicit_promise` se resuelve con `w`.

En resumen, los pasos iniciales para `await v` son:

1. Envolver `v`, el valor pasado a `await`, en una promesa.
1. Adjuntar manejadores para reanudar la función async más tarde.
1. Suspender la función async y devolver la `implicit_promise` al llamador.

Repasemos las operaciones individuales paso a paso. Supongamos que lo que se está `await`ando ya es una promesa, que se cumplió con el valor `42`. Luego, el motor crea una nueva `promise` y la resuelve con lo que sea que se esté `await`ando. Esto realiza un encadenamiento diferido de estas promesas en el siguiente turno, expresado a través de lo que la especificación llama [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob).

![](/_img/fast-async/await-step-1.svg)

Luego, el motor crea otra promesa llamada `desechable`. Se llama *desechable* porque nunca se encadena nada a ella; es completamente interna para el motor. Esta promesa `desechable` luego se encadena a la `promesa`, con los manejadores apropiados para reanudar la función asíncrona. Esta operación `performPromiseThen` es esencialmente lo que [`Promise.prototype.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) hace, detrás de escena. Finalmente, la ejecución de la función asíncrona se suspende y el control vuelve al llamador.

![](/_img/fast-async/await-step-2.svg)

La ejecución continúa en el llamador y eventualmente la pila de llamadas queda vacía. Luego, el motor de JavaScript comienza a ejecutar las microtareas: ejecuta la [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) programada anteriormente, que programa un nuevo [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) para encadenar la `promesa` al valor pasado a `await`. A continuación, el motor vuelve a procesar la cola de microtareas, ya que la cola de microtareas debe vaciarse antes de continuar con el bucle principal de eventos.

![](/_img/fast-async/await-step-3.svg)

El siguiente paso es el [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob), que cumple la `promesa` con el valor de la promesa que estamos `await`ando — `42` en este caso — y programa la reacción en la promesa `desechable`. Luego, el motor regresa al bucle de microtareas nuevamente, que contiene una microtarea final para ser procesada.

![](/_img/fast-async/await-step-4-final.svg)

Ahora este segundo [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) propaga la resolución a la promesa `desechable` y reanuda la ejecución suspendida de la función asíncrona, devolviendo el valor `42` del `await`.

![Resumen del sobrecoste de `await`](/_img/fast-async/await-overhead.svg)

Resumiendo lo que hemos aprendido, por cada `await` el motor tiene que crear **dos promesas adicionales** (incluso si el lado derecho ya es una promesa) y necesita **al menos tres** ticks de la cola de microtareas. ¿Quién hubiera pensado que una sola expresión `await` resultaría en _tanto sobrecoste_?!

![](/_img/fast-async/await-code-before.svg)

Echemos un vistazo a de dónde proviene este sobrecoste. La primera línea es responsable de crear la promesa de envoltura. La segunda línea resuelve inmediatamente esa promesa de envoltura con el valor `v` que se está `await`ando. Estas dos líneas son responsables de una promesa adicional más dos de los tres ticks de la cola de microtareas. Esto es bastante costoso si `v` ya es una promesa (que es el caso común, ya que las aplicaciones normalmente hacen `await` sobre promesas). En el caso poco probable de que un desarrollador haga `await` sobre, por ejemplo, `42`, el motor aún necesita envolverlo en una promesa.

Resulta que ya existe una operación [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve) en la especificación que solo realiza el envoltorio cuando es necesario:

![](/_img/fast-async/await-code-comparison.svg)

Esta operación devuelve promesas sin cambios, y solo envuelve otros valores en promesas según sea necesario. De esta manera, se ahorra una de las promesas adicionales, más dos ticks en la cola de microtareas, en el caso común de que el valor pasado a `await` ya sea una promesa. Este nuevo comportamiento ya está [habilitado por defecto en V8 v7.2](/blog/v8-release-72#async%2Fawait). Para V8 v7.1, el nuevo comportamiento puede habilitarse mediante el indicador `--harmony-await-optimization`. También hemos [propuesto este cambio a la especificación de ECMAScript](https://github.com/tc39/ecma262/pull/1250).

Así es como el nuevo y mejorado `await` funciona detrás de escena, paso a paso:

![](/_img/fast-async/await-new-step-1.svg)

Supongamos nuevamente que hacemos `await` a una promesa que se cumplió con `42`. Gracias a la magia de [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve), la `promesa` ahora simplemente se refiere a la misma promesa `v`, así que no hay nada que hacer en este paso. Después, el motor continúa exactamente como antes, creando la promesa `desechable`, programando un [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) para reanudar la función asíncrona en el siguiente tick de la cola de microtareas, suspendiendo la ejecución de la función y volviendo al llamador.

![](/_img/fast-async/await-new-step-2.svg)

Finalmente, cuando todas las ejecuciones de JavaScript terminan, el motor comienza a ejecutar las microtareas, así que ejecuta el [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob). Este trabajo propaga la resolución de la `promesa` a la `desechable` y reanuda la ejecución de la función asíncrona, generando `42` desde el `await`.

![Resumen de la reducción en el sobrecoste de `await`](/_img/fast-async/await-overhead-removed.svg)

Esta optimización evita la necesidad de crear una promesa de envoltura si el valor pasado a `await` ya es una promesa, y en ese caso pasamos de un mínimo de **tres** ticks de microtareas a solo **uno**. Este comportamiento es similar a lo que hace Node.js 8, excepto que ahora ya no es un error, ¡es una optimización que se está estandarizando!

Todavía se siente incorrecto que el motor tenga que crear esta promesa `desechable`, a pesar de ser completamente interna para el motor. Resulta que la promesa `desechable` solo estaba allí para satisfacer las restricciones de la API de la operación interna `performPromiseThen` en la especificación.

![](/_img/fast-async/await-optimized.svg)

Esto se abordó recientemente en un [cambio editorial](https://github.com/tc39/ecma262/issues/694) en la especificación de ECMAScript. Los motores ya no necesitan crear la promesa `throwaway` para `await`, la mayor parte del tiempo[^2].

[^2]: V8 todavía necesita crear la promesa `throwaway` si se están utilizando [`async_hooks`](https://nodejs.org/api/async_hooks.html) en Node.js, ya que los hooks `before` y `after` se ejecutan dentro del _contexto_ de la promesa `throwaway`.

![Comparación del código `await` antes y después de las optimizaciones](/_img/fast-async/node-10-vs-node-12.svg)

Comparar `await` en Node.js 10 con el `await` optimizado que probablemente estará en Node.js 12 muestra el impacto de rendimiento de este cambio:

![](/_img/fast-async/benchmark-optimization.svg)

**`async`/`await` supera el código de promesas escrito a mano ahora**. La conclusión clave aquí es que hemos reducido significativamente la sobrecarga de las funciones asincrónicas, no solo en V8, sino en todos los motores JavaScript, mediante la actualización de la especificación.

**Actualización:** A partir de V8 v7.2 y Chrome 72, `--harmony-await-optimization` está habilitado por defecto. [El cambio](https://github.com/tc39/ecma262/pull/1250) en la especificación de ECMAScript fue integrado.

## Experiencia mejorada para desarrolladores

Además del rendimiento, a los desarrolladores de JavaScript también les importa la capacidad de diagnosticar y resolver problemas, lo que no siempre es fácil al tratar con código asincrónico. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools) admite *trazas de pila asincrónicas*, es decir, trazas de pila que incluyen no solo la parte sincrónica actual de la pila, sino también la parte asincrónica:

![](/_img/fast-async/devtools.png)

Esta es una característica increíblemente útil durante el desarrollo local. Sin embargo, este enfoque realmente no te ayuda una vez que la aplicación está desplegada. Durante la depuración post-mortem, solo verás la salida de `Error#stack` en tus archivos de registro, y eso no te dice nada sobre las partes asincrónicas.

Recientemente hemos estado trabajando en [*trazas de pila asincrónicas de costo cero*](https://bit.ly/v8-zero-cost-async-stack-traces) que enriquecen la propiedad `Error#stack` con llamadas a funciones asincrónicas. ¿“Costo cero” suena emocionante, no? ¿Cómo puede ser de costo cero, cuando la característica de Chrome DevTools conlleva una gran sobrecarga? Considera este ejemplo donde `foo` llama a `bar` de manera asincrónica, y `bar` lanza una excepción después de `await` a una promesa:

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error('BEEP BEEP');
}

foo().catch(error => console.log(error.stack));
```

Ejecutar este código en Node.js 8 o Node.js 10 resulta en la siguiente salida:

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

Ten en cuenta que aunque la llamada a `foo()` causa el error, `foo` no forma parte de la traza de pila en absoluto. Esto hace que sea complicado para los desarrolladores de JavaScript realizar depuración post-mortem, independientemente de si tu código está desplegado en una aplicación web o dentro de algún contenedor en la nube.

Lo interesante aquí es que el motor sabe dónde tiene que continuar cuando `bar` termine: justo después del `await` en la función `foo`. Por casualidad, ese también es el lugar donde la función `foo` fue suspendida. El motor puede usar esta información para reconstruir partes de la traza de pila asincrónica, concretamente los lugares de `await`. Con este cambio, la salida se convierte en:

```text/2,7
$ node --async-stack-traces index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
    at async foo (index.js:2:3)
```

En la traza de pila, la función más reciente viene primero, seguida por el resto de la traza de pila sincrónica, seguida por la llamada asincrónica a `bar` en la función `foo`. Este cambio se implementa en V8 detrás de la nueva bandera `--async-stack-traces`. **Actualización**: A partir de V8 v7.3, `--async-stack-traces` está habilitado por defecto.

Sin embargo, si comparas esto con el rastro de pila asincrónico en Chrome DevTools mencionado anteriormente, notarás que el sitio real de la llamada a `foo` falta en la parte asincrónica del rastro de pila. Como se mencionó antes, este enfoque utiliza el hecho de que para `await` los lugares de reanudación y suspensión son los mismos — pero para las llamadas regulares a [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) o [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch), este no es el caso. Para más información, consulta la explicación de Mathias Bynens sobre [por qué `await` supera a `Promise#then()`](https://mathiasbynens.be/notes/async-stack-traces).

## Conclusión

Hemos hecho que las funciones asincrónicas sean más rápidas gracias a dos optimizaciones significativas:

- la eliminación de dos microtics adicionales, y
- la eliminación de la promesa `throwaway`.

Además de eso, hemos mejorado la experiencia del desarrollador mediante [*rastros de pila asincrónicos sin costo*](https://bit.ly/v8-zero-cost-async-stack-traces), que funcionan con `await` en funciones asincrónicas y `Promise.all()`.

También tenemos algunos buenos consejos de rendimiento para los desarrolladores de JavaScript:

- favorece las funciones `async` y `await` por encima del código de promesas escrito a mano, y
- utiliza la implementación de promesas nativa ofrecida por el motor de JavaScript para beneficiarte de las optimizaciones, es decir, evitando dos microtics con `await`.
