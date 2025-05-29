---
title: 'WebAssembly JSPI tiene una nueva API'
description: 'Este artículo detalla algunos cambios próximos en la API de Integración de Promesas de JavaScript (JSPI).'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-06-04
tags:
  - WebAssembly
---
La API de Integración de Promesas de JavaScript (JSPI) para WebAssembly tiene una nueva API, disponible en la versión M126 de Chrome. Hablamos sobre lo que ha cambiado, cómo usarla con Emscripten y cuál es la hoja de ruta para JSPI.

JSPI es una API que permite a las aplicaciones de WebAssembly que usan APIs *secuenciales* acceder a APIs web que son *asíncronas*. Muchas APIs web están diseñadas en términos de objetos `Promise` de JavaScript: en lugar de realizar inmediatamente la operación solicitada, devuelven un `Promise` para hacerlo. Por otro lado, muchas aplicaciones compiladas a WebAssembly provienen del universo C/C++, dominado por APIs que bloquean al llamador hasta que se completan.

<!--truncate-->
JSPI se conecta a la arquitectura web para permitir que una aplicación de WebAssembly se suspenda cuando se devuelve el `Promise` y se reanude cuando el `Promise` se resuelva.

Puedes obtener más información sobre JSPI y cómo usarlo [en este artículo del blog](https://v8.dev/blog/jspi) y en la [especificación](https://github.com/WebAssembly/js-promise-integration).

## ¿Qué hay de nuevo?

### El fin de los objetos `Suspender`

En enero de 2024, el subgrupo Stacks del Wasm CG [votó](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md) para modificar la API de JSPI. Específicamente, en lugar de un objeto `Suspender` explícito, usaremos el límite entre JavaScript y WebAssembly como delimitador para determinar qué cálculos se suspenden.

La diferencia es relativamente pequeña pero potencialmente significativa: cuando un cálculo debe ser suspendido, la llamada más reciente a una exportación de WebAssembly envuelta determina el 'punto de corte' de lo que se suspende.

La implicación de esto es que un desarrollador que use JSPI tiene un poco menos de control sobre ese punto de corte. Por otro lado, no tener que gestionar explícitamente objetos `Suspender` hace que la API sea significativamente más fácil de usar.

### Adiós a `WebAssembly.Function`

Otro cambio es el estilo de la API. En lugar de caracterizar los envoltorios de JSPI en términos del constructor `WebAssembly.Function`, proporcionamos funciones y constructores específicos.

Esto tiene una serie de beneficios:

- Elimina la dependencia de la [Propuesta de *Reflexión de Tipos*](https://github.com/WebAssembly/js-types).
- Simplifica las herramientas para JSPI: las nuevas funciones de la API ya no necesitan referirse explícitamente a los tipos de funciones de WebAssembly.

Este cambio es posible gracias a la decisión de ya no tener objetos `Suspender` referenciados explícitamente.

### Retornar sin suspender

Un tercer cambio se refiere al comportamiento de las llamadas que suspenden. En lugar de suspender siempre al llamar a una función de JavaScript desde una importación suspendida, solo suspenderemos cuando la función de JavaScript realmente devuelva un `Promise`.

Este cambio, aunque aparentemente va en contra de las [recomendaciones](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises) del W3C TAG, representa una optimización segura para los usuarios de JSPI. Es seguro porque JSPI en realidad asume el rol de *llamador* a una función que devuelve un `Promise`.

Este cambio probablemente tendrá un impacto mínimo en la mayoría de las aplicaciones; sin embargo, algunas aplicaciones verán un beneficio notable al evitar viajes innecesarios al bucle de eventos del navegador.

### La nueva API

La API es sencilla: hay una función que toma una función exportada desde un módulo de WebAssembly y la convierte en una función que devuelve un `Promise`:

```js
Function Webassembly.promising(Function wsFun)
```

Ten en cuenta que incluso si el argumento está tipado como una `Function` de JavaScript, en realidad está restringido a funciones de WebAssembly.

En el lado de suspensión, hay una nueva clase `WebAssembly.Suspending`, junto con un constructor que toma una función de JavaScript como argumento. En WebIDL, esto se escribe de la siguiente manera:

```js
interface Suspending{
  constructor (Function fun);
}
```

Ten en cuenta que esta API tiene una sensación asimétrica: hay una función que toma una función de WebAssembly y devuelve una nueva función prometedora (_sic_); mientras que para marcar una función que suspende, la encierres en un objeto `Suspending`. Esto refleja una realidad más profunda sobre lo que sucede bajo el capó.

El comportamiento de suspensión de una importación es intrínsecamente parte de la *llamada* a la importación: es decir, alguna función dentro del módulo instanciado llama a la importación y se suspende como resultado.

Por otro lado, la función `promising` toma una función regular de WebAssembly y devuelve una nueva que puede responder a ser suspendida y que devuelve un `Promise`.

### Usando la nueva API

Si eres un usuario de Emscripten, entonces usar la nueva API típicamente no implicará cambios en tu código. Debes estar utilizando una versión de Emscripten que sea al menos la 3.1.61, y una versión de Chrome que sea al menos la 126.0.6478.17 (Chrome M126).

Si estás implementando tu propia integración, tu código debería ser significativamente más simple. En particular, ya no es necesario tener código que almacene el objeto `Suspender` pasado (y lo recupere al llamar a la importación). Simplemente puedes usar código secuencial regular dentro del módulo WebAssembly.

### La API antigua

La API antigua continuará funcionando al menos hasta el 29 de octubre de 2024 (Chrome M128). Después de esa fecha, planeamos eliminar la API antigua.

Ten en cuenta que Emscripten mismo ya no admitirá la API antigua a partir de la versión 3.1.61.

### Detectar qué API está en tu navegador

Cambiar APIs nunca se debe tomar a la ligera. Podemos hacerlo en este caso porque JSPI en sí aún es provisional. Hay una forma sencilla de probar qué API está habilitada en tu navegador:

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

La función `oldAPI` devuelve true si la antigua API JSPI está habilitada en tu navegador, y la función `newAPI` devuelve true si la nueva API JSPI está habilitada.

## ¿Qué está sucediendo con JSPI?

### Aspectos de implementación

El mayor cambio en JSPI en el que estamos trabajando es en realidad invisible para la mayoría de los programadores: las llamadas pilas crecientes.

La implementación actual de JSPI se basa en la asignación de pilas de tamaño fijo. De hecho, las pilas asignadas son bastante grandes. Esto se debe a que tenemos que poder acomodar cálculos arbitrarios de WebAssembly que pueden requerir pilas profundas para manejar la recursión correctamente.

Sin embargo, esta no es una estrategia sostenible: nos gustaría admitir aplicaciones con millones de corutinas suspendidas; esto no es posible si cada pila tiene un tamaño de 1MB.

Las pilas crecientes se refieren a una estrategia de asignación de pilas que permite que una pila de WebAssembly crezca según sea necesario. De esa manera, podemos comenzar con pilas muy pequeñas para aquellas aplicaciones que solo necesitan un pequeño espacio de pila, y crecer la pila cuando la aplicación se quede sin espacio (también conocido como desbordamiento de pila).

Hay varias técnicas potenciales para implementar pilas crecientes. Una que estamos investigando son las pilas segmentadas. Una pila segmentada consiste en una cadena de regiones de pila &mdash; cada una de las cuales tiene un tamaño fijo, pero segmentos diferentes pueden tener tamaños diferentes.

Ten en cuenta que aunque podamos estar resolviendo el problema de desbordamiento de pila para las corutinas, no estamos planeando hacer que la pila principal o central sea creciente. Por lo tanto, si tu aplicación se queda sin espacio de pila, las pilas crecientes no solucionarán tu problema a menos que uses JSPI.

### El proceso de estandarización

A partir de esta publicación, hay una [prueba de origen activa para JSPI](https://v8.dev/blog/jspi-ot). La nueva API estará activa durante el resto de la prueba de origen &mdash; disponible con Chrome M126.

La API anterior también estará disponible durante la prueba de origen; sin embargo, se planea retirarla poco después de Chrome M128.

Después de eso, el enfoque principal de JSPI gira en torno al proceso de estandarización. JSPI está actualmente (en el momento de esta publicación) en la fase 3 del proceso del W3C Wasm CG. El siguiente paso, es decir, pasar a la fase 4, marca la adopción crucial de JSPI como una API estándar para los ecosistemas de JavaScript y WebAssembly.

¡Nos gustaría saber tu opinión sobre estos cambios en JSPI! Únete a la discusión en el [repositorio del Grupo Comunitario de WebAssembly de W3C](https://github.com/WebAssembly/js-promise-integration).
