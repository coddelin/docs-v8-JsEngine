---
title: "Tubería de compilación de WebAssembly"
description: "Este artículo explica los compiladores de WebAssembly de V8 y cuándo compilan el código de WebAssembly."
---

WebAssembly es un formato binario que permite ejecutar código de lenguajes de programación diferentes a JavaScript en la web de manera eficiente y segura. En este documento profundizamos en la tubería de compilación de WebAssembly en V8 y explicamos cómo utilizamos los diferentes compiladores para proporcionar un buen rendimiento.

## Liftoff

Inicialmente, V8 no compila ninguna función en un módulo de WebAssembly. En su lugar, las funciones se compilan de manera perezosa con el compilador básico [Liftoff](/blog/liftoff) cuando la función es llamada por primera vez. Liftoff es un [compilador de una sola pasada](https://en.wikipedia.org/wiki/One-pass_compiler), lo que significa que recorre el código de WebAssembly una vez y emite código máquina de inmediato por cada instrucción de WebAssembly. Los compiladores de una sola pasada destacan por su rápida generación de código, pero solo pueden aplicar un conjunto limitado de optimizaciones. De hecho, Liftoff puede compilar código de WebAssembly muy rápido, decenas de megabytes por segundo.

Una vez que la compilación de Liftoff se completa, el código máquina resultante se registra en el módulo de WebAssembly, de modo que para futuras llamadas a la función, el código compilado pueda ser utilizado de inmediato.

## TurboFan

Liftoff emite código máquina razonablemente rápido en un período de tiempo muy corto. Sin embargo, debido a que emite código para cada instrucción de WebAssembly de manera independiente, hay muy poco margen para optimizaciones, como mejorar las asignaciones de registros o las optimizaciones comunes del compilador como eliminación de cargas redundantes, reducción de fuerza o inclusión de funciones.

Es por eso que las funciones _calientes_, que son funciones que se ejecutan frecuentemente, se recompilan con [TurboFan](/docs/turbofan), el compilador optimizador en V8 tanto para WebAssembly como para JavaScript. TurboFan es un [compilador de varias pasadas](https://en.wikipedia.org/wiki/Multi-pass_compiler), lo que significa que construye múltiples representaciones internas del código compilado antes de emitir el código máquina. Estas representaciones internas adicionales permiten optimizaciones y mejores asignaciones de registros, resultando en un código significativamente más rápido.

V8 monitorea cuántas veces se llaman las funciones de WebAssembly. Una vez que una función alcanza un cierto umbral, se considera _caliente_ y se desencadena la recompilación en un hilo de fondo. Una vez que la compilación se completa, el nuevo código se registra en el módulo de WebAssembly, reemplazando el código existente de Liftoff. Cualquier nueva llamada a esa función entonces utilizará el nuevo código optimizado producido por TurboFan, no el código de Liftoff. Cabe mencionar que no realizamos reemplazo en la pila. Esto significa que si el código de TurboFan está disponible después de que la función fue llamada, la llamada de la función completará su ejecución con el código de Liftoff.

## Caché de código

Si el módulo de WebAssembly se compiló con `WebAssembly.compileStreaming`, entonces el código máquina generado por TurboFan también se almacenará en caché. Cuando el mismo módulo de WebAssembly se solicite nuevamente desde la misma URL, se podrá usar el código en caché inmediatamente sin necesidad de una compilación adicional. Más información sobre el almacenamiento en caché de código está disponible [en un artículo separado del blog](/blog/wasm-code-caching).

El almacenamiento en caché de código se desencadena cada vez que la cantidad de código generado por TurboFan alcanza un cierto umbral. Esto significa que para módulos grandes de WebAssembly, el código de TurboFan se almacena en caché de manera incremental, mientras que para módulos pequeños de WebAssembly, el código de TurboFan puede nunca almacenarse en caché. El código de Liftoff no se almacena en caché, ya que la compilación de Liftoff es casi tan rápida como cargar código desde el caché.

## Depuración

Como se mencionó anteriormente, TurboFan aplica optimizaciones, muchas de las cuales implican reordenar el código, eliminar variables o incluso omitir secciones completas de código. Esto significa que si deseas establecer un punto de interrupción en una instrucción específica, puede que no esté claro dónde debe detenerse realmente la ejecución del programa. En otras palabras, el código de TurboFan no es muy adecuado para depuración. Por lo tanto, cuando se inicia la depuración al abrir DevTools, todo el código de TurboFan se reemplaza nuevamente por código de Liftoff ("degradado"), ya que cada instrucción de WebAssembly se corresponde exactamente con una sección de código máquina y todas las variables locales y globales están intactas.

## Perfilado

Para hacer las cosas un poco más confusas, dentro de DevTools todo el código se volverá a escalar (recompilado con TurboFan) nuevamente cuando se abra la pestaña de Rendimiento y se haga clic en el botón "Record". El botón "Record" inicia el perfilado de rendimiento. Perfilar el código de Liftoff no sería representativo, ya que solo se usa mientras TurboFan no ha terminado y puede ser significativamente más lento que la salida de TurboFan, que se ejecutará durante la gran mayoría del tiempo.

## Flags para experimentación

Para la experimentación, se puede configurar V8 y Chrome para compilar código WebAssembly solo con Liftoff o solo con TurboFan. Incluso es posible experimentar con la compilación diferida, donde las funciones solo se compilan cuando se llaman por primera vez. Las siguientes banderas habilitan estos modos experimentales:

- Solo Liftoff:
    - En V8, establezca las banderas `--liftoff --no-wasm-tier-up`.
    - En Chrome, deshabilite la jerarquización de WebAssembly (`chrome://flags/#enable-webassembly-tiering`) y habilite el compilador básico de WebAssembly (`chrome://flags/#enable-webassembly-baseline`).

- Solo TurboFan:
    - En V8, establezca las banderas `--no-liftoff --no-wasm-tier-up`.
    - En Chrome, deshabilite la jerarquización de WebAssembly (`chrome://flags/#enable-webassembly-tiering`) y deshabilite el compilador básico de WebAssembly (`chrome://flags/#enable-webassembly-baseline`).

- Compilación diferida:
    - La compilación diferida es un modo de compilación donde una función solo se compila cuando se llama por primera vez. Similar a la configuración de producción, la función primero se compila con Liftoff (bloqueando la ejecución). Después de que finaliza la compilación con Liftoff, la función se recompila con TurboFan en segundo plano.
    - En V8, establezca la bandera `--wasm-lazy-compilation`.
    - En Chrome, habilite la compilación diferida de WebAssembly (`chrome://flags/#enable-webassembly-lazy-compilation`).

## Tiempo de compilación

Existen diferentes formas de medir el tiempo de compilación de Liftoff y TurboFan. En la configuración de producción de V8, el tiempo de compilación de Liftoff se puede medir desde JavaScript midiendo el tiempo que toma que `new WebAssembly.Module()` termine, o el tiempo que toma que `WebAssembly.compile()` resuelva la promesa. Para medir el tiempo de compilación de TurboFan, se puede hacer lo mismo en una configuración que use solo TurboFan.

![La traza para la compilación de WebAssembly en [Google Earth](https://earth.google.com/web).](/_img/wasm-compilation-pipeline/trace.svg)

La compilación también puede medirse con más detalle en `chrome://tracing/` habilitando la categoría `v8.wasm`. La compilación con Liftoff es el tiempo transcurrido desde que comienza la compilación hasta el evento `wasm.BaselineFinished`, la compilación con TurboFan termina en el evento `wasm.TopTierFinished`. La compilación comienza en el evento `wasm.StartStreamingCompilation` para `WebAssembly.compileStreaming()`, en el evento `wasm.SyncCompile` para `new WebAssembly.Module()`, y en el evento `wasm.AsyncCompile` para `WebAssembly.compile()`, respectivamente. La compilación con Liftoff se indica con los eventos `wasm.BaselineCompilation`, la compilación con TurboFan con los eventos `wasm.TopTierCompilation`. La figura anterior muestra la traza registrada para Google Earth, con los eventos clave destacados.

Datos de traza más detallados están disponibles con la categoría `v8.wasm.detailed`, que, entre otra información, proporciona el tiempo de compilación de funciones individuales.
