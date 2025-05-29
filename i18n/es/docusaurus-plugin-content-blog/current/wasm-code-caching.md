---
title: "Almacenamiento en caché de código para desarrolladores de WebAssembly"
author: "[Bill Budge](https://twitter.com/billb), poniendo el ¡Ca-ching! en el almacenamiento en caché"
avatars:
  - bill-budge
date: 2019-06-17
tags:
  - WebAssembly
  - internals
description: "Este artículo explica el almacenamiento en caché de código de WebAssembly en Chrome y cómo los desarrolladores pueden aprovecharlo para acelerar la carga de aplicaciones con módulos WebAssembly grandes."
tweet: "1140631433532334081"
---
Hay un dicho entre los desarrolladores que dice que el código más rápido es aquel que no se ejecuta. Del mismo modo, el código más rápido para compilar es aquel que no necesita ser compilado. El almacenamiento en caché de código de WebAssembly es una nueva optimización en Chrome y V8 que intenta evitar la compilación de código almacenando en caché el código nativo generado por el compilador. Hemos [escrito](/blog/code-caching) [sobre](/blog/improved-code-caching) [cómo](/blog/code-caching-for-devs) Chrome y V8 almacenan en caché el código de JavaScript en el pasado, y sobre las mejores prácticas para aprovechar esta optimización. En esta publicación de blog, describimos el funcionamiento del almacenamiento en caché de código de WebAssembly en Chrome y cómo los desarrolladores pueden aprovecharlo para acelerar la carga de aplicaciones con módulos WebAssembly grandes.

<!--truncate-->
## Recapitulación sobre la compilación de WebAssembly

WebAssembly es una forma de ejecutar código que no es JavaScript en la Web. Una aplicación web puede usar WebAssembly cargando un recurso `.wasm`, que contiene código parcialmente compilado de otro lenguaje, como C, C++ o Rust (y más en el futuro). El trabajo del compilador de WebAssembly es decodificar el recurso `.wasm`, validar que esté bien formado y luego compilarlo en código máquina nativo que pueda ejecutarse en el dispositivo del usuario.

V8 tiene dos compiladores para WebAssembly: Liftoff y TurboFan. [Liftoff](/blog/liftoff) es el compilador básico, que compila módulos tan rápido como sea posible para que la ejecución pueda comenzar lo antes posible. TurboFan es el compilador optimizador de V8 tanto para JavaScript como para WebAssembly. Se ejecuta en segundo plano para generar código nativo de alta calidad y ofrecer un rendimiento óptimo a largo plazo a una aplicación web. Para módulos grandes de WebAssembly, TurboFan puede tardar una cantidad significativa de tiempo —entre 30 segundos y un minuto o más— en completar la compilación de un módulo WebAssembly al código nativo.

Ahí es donde entra el almacenamiento en caché de código. Una vez que TurboFan ha finalizado la compilación de un módulo WebAssembly grande, Chrome puede guardar el código en su caché para que la próxima vez que se cargue el módulo, podamos omitir tanto la compilación de Liftoff como la de TurboFan, lo que lleva a un inicio más rápido y un menor consumo de energía —la compilación de código consume muchos recursos de CPU.

El almacenamiento en caché de código de WebAssembly utiliza la misma maquinaria en Chrome que se utiliza para el almacenamiento en caché de código JavaScript. Usamos el mismo tipo de almacenamiento y la misma técnica de almacenamiento en caché con doble clave que mantiene separados los códigos compilados por diferentes orígenes, de acuerdo con [el aislamiento de sitios](https://developers.google.com/web/updates/2018/07/site-isolation), una importante característica de seguridad de Chrome.

## Algoritmo de almacenamiento en caché de código de WebAssembly

Por ahora, el almacenamiento en caché de WebAssembly solo está implementado para las llamadas de API de transmisión, `compileStreaming` e `instantiateStreaming`. Estas operan sobre una solicitud HTTP de un recurso `.wasm`, lo que facilita el uso de los mecanismos de recuperación y almacenamiento en caché de recursos de Chrome, y proporciona una práctica URL de recurso para usar como clave para identificar el módulo WebAssembly. El algoritmo de almacenamiento en caché funciona de la siguiente manera:

1. Cuando se solicita un recurso `.wasm` por primera vez (es decir, una _ejecución en frío_), Chrome lo descarga desde la red y lo transmite a V8 para compilar. Chrome también guarda el recurso `.wasm` en el caché de recursos del navegador, almacenado en el sistema de archivos del dispositivo del usuario. Este caché de recursos permite que Chrome cargue el recurso más rápido la próxima vez que se necesite.
1. Cuando TurboFan ha terminado completamente de compilar el módulo, y si el recurso `.wasm` es suficientemente grande (actualmente 128 kB), Chrome escribe el código compilado en el caché de código de WebAssembly. Este caché de código está físicamente separado del caché de recursos del paso 1.
1. Cuando se solicita un recurso `.wasm` por segunda vez (es decir, una _ejecución en caliente_), Chrome carga el recurso `.wasm` desde el caché de recursos y simultáneamente consulta el caché de código. Si hay un acierto en la caché, entonces los bytes del módulo compilado se envían al proceso del renderer y se pasan a V8, que deserializa el código en lugar de compilar el módulo. La deserialización es más rápida y consume menos CPU que la compilación.
1. Puede suceder que el código almacenado en caché ya no sea válido. Esto puede ocurrir porque el recurso `.wasm` ha cambiado, o porque V8 ha cambiado, algo que se espera que ocurra al menos cada 6 semanas debido al rápido ciclo de lanzamientos de Chrome. En este caso, el código nativo almacenado en caché se elimina de la caché, y la compilación procede como en el paso 1.

De acuerdo con esta descripción, podemos dar algunas recomendaciones para mejorar el uso del caché de código de WebAssembly en tu sitio web.

## Consejo 1: utiliza la API de transmisión de WebAssembly

Dado que el almacenamiento en caché de código solo funciona con la API de transmisión, compila o instancia tu módulo de WebAssembly con `compileStreaming` o `instantiateStreaming`, como en este fragmento de JavaScript:

```js
(async () => {
  const fetchPromise = fetch('fibonacci.wasm');
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();
```

Este [artículo](https://developers.google.com/web/updates/2018/04/loading-wasm) detalla las ventajas de usar la API de transmisión de WebAssembly. Emscripten intenta usar esta API de manera predeterminada cuando genera código de carga para tu aplicación. Ten en cuenta que la transmisión requiere que el recurso `.wasm` tenga el tipo MIME correcto, por lo que el servidor debe enviar el encabezado `Content-Type: application/wasm` en su respuesta.

## Consejo 2: favorece la caché

Dado que el almacenamiento en caché de código depende de la URL del recurso y de si el recurso `.wasm` está actualizado, los desarrolladores deben intentar mantener ambos estables. Si el recurso `.wasm` se obtiene de una URL diferente, se considera diferente y V8 tiene que compilar el módulo nuevamente. De manera similar, si el recurso `.wasm` ya no es válido en la caché de recursos, Chrome tiene que descartar cualquier código almacenado en caché.

### Mantén tu código estable

Cada vez que distribuyas un nuevo módulo de WebAssembly, debe recompilarse por completo. Distribuye nuevas versiones de tu código solo cuando sea necesario para ofrecer nuevas funciones o corregir errores. Cuando tu código no haya cambiado, informa a Chrome. Cuando el navegador realiza una solicitud HTTP para una URL de recurso, como un módulo de WebAssembly, incluye la fecha y hora de la última recuperación de esa URL. Si el servidor sabe que el archivo no ha cambiado, puede enviar una respuesta `304 Not Modified`, que indica a Chrome y a V8 que el recurso en caché y, por lo tanto, el código almacenado en caché, aún son válidos. Por otro lado, devolver una respuesta `200 OK` actualiza el recurso `.wasm` almacenado en caché e invalida la caché de código, haciendo que WebAssembly vuelva a ejecutarse desde cero. Sigue las [mejores prácticas de recursos web](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching) utilizando la respuesta para informar al navegador si el recurso `.wasm` es almacenable en caché, cuánto tiempo se espera que sea válido o cuándo se modificó por última vez.

### No cambies la URL de tu código

El código compilado en caché está asociado con la URL del recurso `.wasm`, lo que facilita su búsqueda sin necesidad de escanear el recurso real. Esto significa que cambiar la URL de un recurso (¡incluidos los parámetros de consulta!) crea una nueva entrada en nuestra caché de recursos, lo que también requiere una recompilación completa y crea una nueva entrada en la caché de código.

### Hazlo grande (¡pero no demasiado grande!)

El principal criterio para almacenar en caché el código de WebAssembly es el tamaño del recurso `.wasm`. Si el recurso `.wasm` es más pequeño que un tamaño umbral determinado, no almacenamos los bytes del módulo compilado en caché. La razón es que V8 puede compilar módulos pequeños rápidamente, posiblemente más rápido que cargar el código compilado desde la caché. Actualmente, el límite es para recursos `.wasm` de 128 kB o más.

Pero más grande es mejor solo hasta cierto punto. Dado que las cachés ocupan espacio en la máquina del usuario, Chrome tiene cuidado de no consumir demasiado espacio. Ahora, en máquinas de escritorio, las cachés de código suelen contener algunos cientos de megabytes de datos. Dado que las cachés de Chrome también restringen las entradas más grandes en la caché a una fracción del tamaño total de la caché, existe un límite adicional de aproximadamente 150 MB para el código de WebAssembly compilado (la mitad del tamaño total de la caché). Es importante señalar que los módulos compilados suelen ser de 5 a 7 veces más grandes que el recurso `.wasm` correspondiente en una máquina de escritorio típica.

Este criterio de tamaño, al igual que el resto del comportamiento de caché, puede cambiar a medida que determinemos qué funciona mejor para usuarios y desarrolladores.

### Usa un service worker

El almacenamiento en caché del código de WebAssembly está habilitado para workers y service workers, por lo que es posible utilizarlos para cargar, compilar y almacenar en caché una nueva versión del código para que esté disponible la próxima vez que inicie tu aplicación. Cada sitio web debe realizar al menos una compilación completa de un módulo de WebAssembly — utiliza workers para ocultar eso a tus usuarios.

## Rastreo

Como desarrollador, es posible que desees comprobar que tu módulo compilado se está almacenando en caché por Chrome. Los eventos de almacenamiento en caché de código de WebAssembly no se exponen de manera predeterminada en Herramientas para desarrolladores de Chrome, por lo que la mejor manera de averiguar si tus módulos se están almacenando en caché es usar la función ligeramente más técnica `chrome://tracing`.

`chrome://tracing` registra rastreos instrumentados de Chrome durante un período de tiempo. El rastreo registra el comportamiento de todo el navegador, incluidas otras pestañas, ventanas y extensiones, por lo que funciona mejor cuando se realiza en un perfil de usuario limpio, con extensiones deshabilitadas y sin otras pestañas del navegador abiertas:

```bash
# Inicia una nueva sesión del navegador Chrome con un perfil de usuario limpio y extensiones deshabilitadas
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Navega a `chrome://tracing` y haz clic en ‘Record’ para comenzar una sesión de tracing. En la ventana de diálogo que aparece, haz clic en ‘Edit Categories’ y marca la categoría `devtools.timeline` a la derecha, bajo ‘Disabled by Default Categories’. (Puedes desmarcar cualquier otra categoría preseleccionada para reducir la cantidad de datos recopilados). Luego haz clic en el botón ‘Record’ en el diálogo para comenzar el tracing.

En otra pestaña carga o recarga tu aplicación. Déjala ejecutarse el tiempo suficiente, 10 segundos o más, para asegurarte de que la compilación de TurboFan se complete. Cuando termines, haz clic en ‘Stop’ para finalizar el tracing. Aparecerá una vista de línea de tiempo de eventos. En la parte superior derecha de la ventana de tracing, hay una caja de texto, justo a la derecha de ‘View Options’. Escribe `v8.wasm` para filtrar eventos que no sean de WebAssembly. Deberías ver uno o más de los siguientes eventos:

- `v8.wasm.streamFromResponseCallback` — La solicitud de recursos pasada a instantiateStreaming recibió una respuesta.
- `v8.wasm.compiledModule` — TurboFan terminó de compilar el recurso `.wasm`.
- `v8.wasm.cachedModule` — Chrome escribió el módulo compilado en la caché de código.
- `v8.wasm.moduleCacheHit` — Chrome encontró el código en su caché mientras cargaba el recurso `.wasm`.
- `v8.wasm.moduleCacheInvalid` — V8 no pudo deserializar el código en caché porque estaba desactualizado.

En una ejecución en frío, esperamos ver los eventos `v8.wasm.streamFromResponseCallback` y `v8.wasm.compiledModule`. Esto indica que el módulo de WebAssembly fue recibido y la compilación tuvo éxito. Si no se observa ninguno de estos eventos, verifica que las llamadas de tu API de streaming de WebAssembly estén funcionando correctamente.

Después de una ejecución en frío, si se excedió el límite de tamaño, también esperamos ver un evento `v8.wasm.cachedModule`, lo que significa que el código compilado fue enviado a la caché. Es posible que obtengamos este evento pero que por alguna razón la escritura no tenga éxito. Actualmente no hay una forma de observar esto, pero los metadatos de los eventos pueden mostrar el tamaño del código. Los módulos muy grandes pueden no caber en la caché.

Cuando el almacenamiento en caché funciona correctamente, una ejecución en caliente produce dos eventos: `v8.wasm.streamFromResponseCallback` y `v8.wasm.moduleCacheHit`. Los metadatos de estos eventos te permiten ver el tamaño del código compilado.

Para más información sobre cómo usar `chrome://tracing`, consulta [nuestro artículo sobre la caché de código (byte) de JavaScript para desarrolladores](/blog/code-caching-for-devs).

## Conclusión

Para la mayoría de los desarrolladores, la caché de código debería “simplemente funcionar”. Funciona mejor, como cualquier caché, cuando las cosas son estables. Las heurísticas de caché de Chrome pueden cambiar entre versiones, pero la caché de código tiene comportamientos que se pueden utilizar y limitaciones que se pueden evitar. Un análisis cuidadoso usando `chrome://tracing` puede ayudarte a ajustar y optimizar el uso de la caché de código de WebAssembly en tu aplicación web.
