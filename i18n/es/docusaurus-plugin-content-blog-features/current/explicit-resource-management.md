---
title: "El nuevo superpoder de JavaScript: Gestión explícita de recursos"
author: "Rezvan Mahdavi Hezaveh"
avatars: 
  - "rezvan-mahdavi-hezaveh"
date: 2025-05-09
tags: 
  - ECMAScript
description: "La propuesta de Gestión Explícita de Recursos otorga a los desarrolladores la capacidad de gestionar explícitamente el ciclo de vida de los recursos."
tweet: ""
---

La propuesta de *Gestión Explícita de Recursos* introduce un enfoque determinista para gestionar explícitamente el ciclo de vida de recursos como manejadores de archivos, conexiones de red y más. Esta propuesta aporta las siguientes adiciones al lenguaje: las declaraciones `using` y `await using`, que llaman automáticamente al método de eliminación cuando un recurso sale del ámbito; los símbolos `[Symbol.dispose]()` y `[Symbol.asyncDispose]()` para operaciones de limpieza; dos nuevos objetos globales `DisposableStack` y `AsyncDisposableStack` como contenedores para agrupar recursos eliminables; y `SuppressedError` como un nuevo tipo de error (que contiene tanto el error más recientemente lanzado como el error que fue suprimido) para abordar el escenario donde ocurre un error durante la eliminación de un recurso, que potencialmente puede enmascarar un error existente lanzado desde el cuerpo o desde la eliminación de otro recurso. Estas adiciones permiten a los desarrolladores escribir código más robusto, eficiente y mantenible al proporcionar un control detallado sobre la eliminación de recursos.

<!--truncate-->
## Declaraciones `using` y `await using`

El núcleo de la propuesta de Gestión Explícita de Recursos radica en las declaraciones `using` y `await using`. La declaración `using` está diseñada para recursos síncronos, asegurando que el método `[Symbol.dispose]()` de un recurso eliminable se llame cuando el ámbito en el que se declara finaliza. Para recursos asíncronos, la declaración `await using` funciona de manera similar pero asegura que el método `[Symbol.asyncDispose]()` sea llamado y el resultado de esta llamada sea esperado, permitiendo operaciones de limpieza asíncronas. Esta distinción permite a los desarrolladores gestionar de manera confiable tanto recursos síncronos como asíncronos, previniendo fugas y mejorando la calidad general del código. Las palabras clave `using` y `await using` pueden usarse dentro de llaves `{}` (como bloques, bucles for y cuerpos de funciones), y no pueden usarse en niveles superiores.

Por ejemplo, al trabajar con [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader), es crucial llamar a `reader.releaseLock()` para desbloquear el flujo y permitir que se utilice en otro lugar. Sin embargo, el manejo de errores introduce un problema común: si ocurre un error durante el proceso de lectura y olvidas llamar a `releaseLock()` antes de que el error se propague, el flujo permanece bloqueado. Empecemos con un ejemplo ingenuo:

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // Solo obtener si aún no tenemos una promesa
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`¡Error HTTP! estado: ${response.status}`);
    }
    const processedData = await processData(response);

    // Hacer algo con processedData
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Procesar datos y guardar el resultado en processedData
            ...
            // ¡Se lanza un error aquí!
        }
    }
    
    // Debido a que el error se lanza antes de esta línea, el flujo permanece bloqueado.
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Por lo tanto, es crucial para los desarrolladores tener un bloque `try...finally` mientras usan flujos y colocar `reader.releaseLock()` en el bloque `finally`. Este patrón asegura que `reader.releaseLock()` siempre se llame.

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // Procesar datos y guardar el resultado en processedData
                ...
                // ¡Se lanza un error aquí!
            }
        }
    } finally {
        // El bloqueo del flujo por parte del lector siempre se liberará.
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Una alternativa para escribir este código es crear un objeto desechable `readerResource`, que tiene el lector (`response.body.getReader()`) y el método `[Symbol.dispose]()` que llama a `this.reader.releaseLock()`. La declaración `using` asegura que `readerResource[Symbol.dispose]()` sea llamado cuando el bloque de código salga, y ya no es necesario recordar llamar a `releaseLock` porque la declaración `using` lo maneja. La integración de `[Symbol.dispose]` y `[Symbol.asyncDispose]` en APIs web como streams puede ocurrir en el futuro, para que los desarrolladores no tengan que escribir el objeto envoltorio manual.

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // Envolver el lector en un recurso desechable
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Procesar los datos y guardar el resultado en processedData
            ...
            // ¡Aquí se lanza un error!
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]() se llama automáticamente.

 readFile('https://example.com/largefile.dat');
```

## `DisposableStack` y `AsyncDisposableStack`

Para facilitar aún más la gestión de múltiples recursos desechables, la propuesta introduce `DisposableStack` y `AsyncDisposableStack`. Estas estructuras basadas en stack permiten a los desarrolladores agrupar y desechar múltiples recursos de manera coordinada. Los recursos se agregan al stack, y cuando el stack se desecha, ya sea de manera sincrónica o asincrónica, los recursos se desechan en el orden inverso en que fueron agregados, asegurando que cualquier dependencia entre ellos se maneje correctamente. Esto simplifica el proceso de limpieza al tratar con escenarios complejos que incluyen múltiples recursos relacionados. Ambas estructuras proporcionan métodos como `use()`, `adopt()` y `defer()` para agregar recursos o acciones de eliminación, y un método `dispose()` o `asyncDispose()` para activar la limpieza. `DisposableStack` y `AsyncDisposableStack` tienen `[Symbol.dispose]()` y `[Symbol.asyncDispose]()` respectivamente, por lo que pueden ser usados con las palabras clave `using` y `await using`. Ofrecen una forma robusta de gestionar la eliminación de múltiples recursos dentro de un alcance definido.

Veamos cada método y un ejemplo de este:

`use(value)` agrega un recurso en la parte superior del stack.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Bloqueo del lector liberado.');
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// Bloqueo del lector liberado.
```

`adopt(value, onDispose)` agrega un recurso no desechable y una devolución de llamada de eliminación en la parte superior del stack.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('Bloqueo del lector liberado.');
      });
}
// Bloqueo del lector liberado.
```

`defer(onDispose)` agrega una devolución de llamada de eliminación en la parte superior del stack. Es útil para agregar acciones de limpieza que no tienen un recurso asociado.

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("hecho."));
}
// hecho.
```

`move()` mueve todos los recursos actualmente en este stack a un nuevo `DisposableStack`. Esto puede ser útil si necesitas transferir la propiedad de recursos a otra parte de tu código.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('Bloqueo del lector liberado.');
      });
    using newStack = stack.move();
}
// Aquí solo existe el newStack y el recurso dentro de él será eliminado.
// Bloqueo del lector liberado.
```

`dispose()` en DisposableStack y `disposeAsync()` en AsyncDisposableStack eliminan los recursos dentro de este objeto.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Bloqueo del lector liberado.');
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// Bloqueo del lector liberado.
```

## Disponibilidad

La Gestión Explícita de Recursos se encuentra disponible en Chromium 134 y V8 v13.8.

## Soporte para Gestión de Recursos Explícita

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="no"
                 babel="sí https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
