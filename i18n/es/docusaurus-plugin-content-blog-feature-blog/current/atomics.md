---
title: "`Atomics.wait`, `Atomics.notify`, `Atomics.waitAsync`"
author: "[Marja Hölttä](https://twitter.com/marjakh), una bloguera no bloqueante"
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: "Atomics.wait y Atomics.notify son primitivas de sincronización de bajo nivel útiles para implementar, por ejemplo, mutexes. Atomics.wait solo se puede usar en hilos de trabajo. La versión 8.7 de V8 ahora admite una versión no bloqueante, Atomics.waitAsync, que también es utilizable en el hilo principal."
tweet: "1309118447377358848"
---
[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) y [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) son primitivas de sincronización de bajo nivel útiles para implementar mutexes y otros mecanismos de sincronización. Sin embargo, dado que `Atomics.wait` es bloqueante, no es posible llamarlo en el hilo principal (intentarlo genera un `TypeError`).

<!--truncate-->
A partir de la versión 8.7, V8 admite una versión no bloqueante, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), que también se puede usar en el hilo principal.

En este artículo, explicamos cómo usar estas APIs de bajo nivel para implementar un mutex que funciona tanto de manera sincrónica (para hilos de trabajo) como de forma asincrónica (para hilos de trabajo o el hilo principal).

`Atomics.wait` y `Atomics.waitAsync` reciben los siguientes parámetros:

- `buffer`: un `Int32Array` o `BigInt64Array` respaldado por un `SharedArrayBuffer`
- `index`: un índice válido dentro del array
- `expectedValue`: un valor que esperamos encontrar en la ubicación de memoria descrita por `(buffer, index)`
- `timeout`: un tiempo de espera en milisegundos (opcional, por defecto es `Infinity`)

El valor de retorno de `Atomics.wait` es una cadena. Si la ubicación de memoria no contiene el valor esperado, `Atomics.wait` retorna inmediatamente con el valor `'not-equal'`. De lo contrario, el hilo queda bloqueado hasta que otro hilo llama a `Atomics.notify` con la misma ubicación de memoria o se alcanza el tiempo de espera. En el primer caso, `Atomics.wait` retorna el valor `'ok'`, en el segundo caso, retorna el valor `'timed-out'`.

`Atomics.notify` recibe los siguientes parámetros:

- un `Int32Array` o `BigInt64Array` respaldado por un `SharedArrayBuffer`
- un índice (válido dentro del array)
- la cantidad de hilos en espera que se notificarán (opcional, por defecto es `Infinity`)

Notifica la cantidad especificada de hilos en espera, en orden FIFO, que están esperando en la ubicación de memoria descrita por `(buffer, index)`. Si hay varias llamadas pendientes de `Atomics.wait` o `Atomics.waitAsync` relacionadas con la misma ubicación, todas están en la misma cola FIFO.

A diferencia de `Atomics.wait`, `Atomics.waitAsync` siempre retorna inmediatamente. El valor de retorno es uno de los siguientes:

- `{ async: false, value: 'not-equal' }` (si la ubicación de memoria no contenía el valor esperado)
- `{ async: false, value: 'timed-out' }` (solo para el tiempo de espera inmediato 0)
- `{ async: true, value: promise }`

La promesa puede luego resolverse con un valor de cadena `'ok'` (si `Atomics.notify` fue llamada con la misma ubicación de memoria) o `'timed-out'` (si se alcanzó el tiempo de espera). La promesa nunca será rechazada.

El siguiente ejemplo demuestra el uso básico de `Atomics.waitAsync`:

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ tiempo de espera (opt)
//                                     |  ^ valor esperado
//                                     ^ índice

if (result.value === 'not-equal') {
  // El valor en el SharedArrayBuffer no era el esperado.
} else {
  result.value instanceof Promise; // true
  result.value.then(
    (value) => {
      if (value == 'ok') { /* notificado */ }
      else { /* valor es 'timed-out' */ }
    });
}

// En este hilo o en otro hilo:
Atomics.notify(i32a, 0);
```

A continuación, mostraremos cómo implementar un mutex que pueda usarse tanto de forma sincrónica como asincrónica. La implementación de la versión sincrónica del mutex se ha discutido previamente, por ejemplo, [en este artículo de blog](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/).

En el ejemplo, no utilizamos el parámetro de tiempo de espera en `Atomics.wait` y `Atomics.waitAsync`. Este parámetro puede usarse para implementar variables de condición con un tiempo de espera.

Nuestra clase de mutex, `AsyncLock`, opera sobre un `SharedArrayBuffer` e implementa los siguientes métodos:

- `lock` — bloquea el hilo hasta que podamos bloquear el mutex (utilizable solo en un hilo de trabajo)
- `unlock` — desbloquea el mutex (contraparte de `lock`)
- `executeLocked(callback)` — bloqueo no bloqueante, se puede usar en el hilo principal; programa `callback` para ejecutarse una vez que logremos obtener el bloqueo

Veamos cómo se puede implementar cada uno de esos casos. La definición de la clase incluye constantes y un constructor que toma el `SharedArrayBuffer` como parámetro.

```js
class AsyncLock {
  static INDEX = 0;
  static UNLOCKED = 0;
  static LOCKED = 1;

  constructor(sab) {
    this.sab = sab;
    this.i32a = new Int32Array(sab);
  }

  lock() {
    /* … */
  }

  unlock() {
    /* … */
  }

  executeLocked(f) {
    /* … */
  }
}
```

Aquí `i32a[0]` contiene el valor `LOCKED` o `UNLOCKED`. También es la ubicación de espera para `Atomics.wait` y `Atomics.waitAsync`. La clase `AsyncLock` asegura las siguientes invariantes:

1. Si `i32a[0] == LOCKED`, y un hilo comienza a esperar (ya sea mediante `Atomics.wait` o `Atomics.waitAsync`) en `i32a[0]`, eventualmente será notificado.
1. Después de ser notificado, el hilo intenta obtener el bloqueo. Si lo consigue, notificará nuevamente al liberarlo.

## Bloqueo y desbloqueo sincronizados

A continuación, mostramos el método de bloqueo bloqueante `lock` que solo puede ser llamado desde un hilo de trabajo:

```js
lock() {
  while (true) {
    const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                        /* valor antiguo >>> */  AsyncLock.UNLOCKED,
                        /* nuevo valor >>> */  AsyncLock.LOCKED);
    if (oldValue == AsyncLock.UNLOCKED) {
      return;
    }
    Atomics.wait(this.i32a, AsyncLock.INDEX,
                 AsyncLock.LOCKED); // <<< valor esperado al inicio
  }
}
```

Cuando un hilo llama a `lock()`, primero intenta obtener el bloqueo usando `Atomics.compareExchange` para cambiar el estado del bloqueo de `UNLOCKED` a `LOCKED`. `Atomics.compareExchange` intenta hacer el cambio de estado de forma atómica y devuelve el valor original de la ubicación de memoria. Si el valor original era `UNLOCKED`, sabemos que el cambio de estado tuvo éxito y el hilo adquirió el bloqueo. No se necesita nada más.

Si `Atomics.compareExchange` no logra cambiar el estado del bloqueo, otro hilo debe estar manteniendo el bloqueo. Por lo tanto, este hilo intenta `Atomics.wait` para esperar a que el otro hilo libere el bloqueo. Si la ubicación de memoria aún contiene el valor esperado (en este caso, `AsyncLock.LOCKED`), llamar a `Atomics.wait` bloqueará el hilo y la llamada a `Atomics.wait` solo retornará cuando otro hilo llame a `Atomics.notify`.

El método `unlock` establece el bloqueo en el estado `UNLOCKED` y llama a `Atomics.notify` para despertar a un hilo en espera que estaba esperando el bloqueo. El cambio de estado siempre se espera que tenga éxito, ya que este hilo está manteniendo el bloqueo, y nadie más debería llamar a `unlock()` mientras tanto.

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* valor antiguo >>> */  AsyncLock.LOCKED,
                      /* nuevo valor >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error('Intentó liberar sin tener el mutex');
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

El caso sencillo es el siguiente: el bloqueo está libre y el hilo T1 lo adquiere cambiando el estado del bloqueo con `Atomics.compareExchange`. El hilo T2 intenta adquirir el bloqueo llamando a `Atomics.compareExchange`, pero no logra cambiar el estado del bloqueo. T2 luego llama a `Atomics.wait`, lo que bloquea el hilo. En algún momento T1 libera el bloqueo y llama a `Atomics.notify`. Eso hace que la llamada `Atomics.wait` en T2 retorne `'ok'`, despertando a T2. T2 luego intenta adquirir el bloqueo nuevamente, y esta vez tiene éxito.

También hay 2 posibles casos límite — estos demuestran la razón por la cual `Atomics.wait` y `Atomics.waitAsync` verifican un valor específico en el índice:

- T1 está manteniendo el bloqueo y T2 intenta obtenerlo. Primero, T2 intenta cambiar el estado del bloqueo con `Atomics.compareExchange`, pero no lo logra. Pero luego, T1 libera el bloqueo antes de que T2 logre llamar a `Atomics.wait`. Cuando T2 llama a `Atomics.wait`, retorna inmediatamente con el valor `'not-equal'`. En ese caso, T2 continúa con la siguiente iteración del bucle, intentando adquirir el bloqueo nuevamente.
- T1 está manteniendo el bloqueo y T2 está esperando por él con `Atomics.wait`. T1 libera el bloqueo — T2 se despierta (la llamada a `Atomics.wait` retorna) e intenta hacer `Atomics.compareExchange` para adquirir el bloqueo, pero otro hilo T3 fue más rápido y ya obtuvo el bloqueo. Entonces, la llamada a `Atomics.compareExchange` falla al obtener el bloqueo, y T2 llama a `Atomics.wait` nuevamente, bloqueándose hasta que T3 libera el bloqueo.

Debido al último caso límite, el mutex no es “justo”. Es posible que T2 haya estado esperando que se libere el bloqueo, pero T3 llega y lo obtiene inmediatamente. Una implementación de bloqueo más realista puede usar varios estados para diferenciar entre “bloqueado” y “bloqueado con contención”.

## Bloqueo asíncrono

El método no bloqueante `executeLocked` puede ser llamado desde el hilo principal, a diferencia del método bloqueante `lock`. Recibe una función de devolución de llamada como su único parámetro y programa la ejecución de la devolución de llamada una vez que haya adquirido el bloqueo exitosamente.

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    mientras (true) {
      const valorAntiguo = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* valor antiguo >>> */  AsyncLock.UNLOCKED,
                          /* nuevo valor >>> */  AsyncLock.LOCKED);
      si (valorAntiguo == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        return;
      }
      const resultado = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                         AsyncLock.LOCKED);
                                   //  ^ valor esperado al inicio
      await resultado.value;
    }
  }

  tryGetLock();
}
```

La función interna `tryGetLock` intenta primero obtener el bloqueo con `Atomics.compareExchange`, como antes. Si logra cambiar exitosamente el estado del bloqueo, puede ejecutar el callback, desbloquear el bloqueo y retornar.

Si `Atomics.compareExchange` no logra obtener el bloqueo, necesitamos intentar nuevamente cuando probablemente el bloqueo esté libre. No podemos bloquear y esperar que el bloqueo se libere; en cambio, programamos un nuevo intento utilizando `Atomics.waitAsync` y la Promesa que retorna.

Si logramos iniciar exitosamente `Atomics.waitAsync`, la Promesa retornada se resuelve cuando el hilo que tiene el bloqueo ejecuta `Atomics.notify`. Luego, el hilo que estaba esperando por el bloqueo intenta obtener el bloqueo nuevamente, como antes.

Los mismos casos extremos (el bloqueo liberándose entre la llamada a `Atomics.compareExchange` y la llamada a `Atomics.waitAsync`, así como el bloqueo siendo adquirido nuevamente entre la resolución de la Promesa y la llamada a `Atomics.compareExchange`) son posibles también en la versión asíncrona, por lo que el código debe manejarlos de manera robusta.

## Conclusión

En este artículo, mostramos cómo usar las primitivas de sincronización `Atomics.wait`, `Atomics.waitAsync` y `Atomics.notify` para implementar un mutex que es utilizable tanto en el hilo principal como en los hilos trabajadores.

## Compatibilidad de características

### `Atomics.wait` y `Atomics.notify`

<feature-support chrome="68"
                 firefox="78"
                 safari="no"
                 nodejs="8.10.0"
                 babel="no"></feature-support>

### `Atomics.waitAsync`

<feature-support chrome="87"
                 firefox="no"
                 safari="no"
                 nodejs="16"
                 babel="no"></feature-support>
