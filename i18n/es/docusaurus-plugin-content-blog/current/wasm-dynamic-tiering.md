---
title: "WebAssembly Dynamic Tiering listo para probar en Chrome 96"
author: "Andreas Haas — Diversión Tierisch"
avatars: 
  - andreas-haas
date: 2021-10-29
tags: 
  - WebAssembly
description: "WebAssembly Dynamic Tiering listo para probar en V8 v9.6 y Chrome 96, ya sea mediante una bandera de línea de comandos o una prueba de origen"
tweet: "1454158971674271760"
---

V8 tiene dos compiladores para compilar código WebAssembly en código de máquina que luego puede ser ejecutado: el compilador básico __Liftoff__ y el compilador optimizador __TurboFan__. Liftoff puede generar código mucho más rápido que TurboFan, lo que permite un inicio rápido. TurboFan, por otro lado, puede generar código más rápido, lo que permite un alto rendimiento máximo.

<!--truncate-->
En la configuración actual de Chrome, un módulo de WebAssembly primero se compila completamente con Liftoff. Después de que finaliza la compilación de Liftoff, todo el módulo se compila nuevamente inmediatamente en segundo plano con TurboFan. Con la compilación en flujo, la compilación de TurboFan puede comenzar antes si Liftoff compila código WebAssembly más rápido de lo que se descarga el código WebAssembly. La compilación inicial de Liftoff permite un inicio rápido, mientras que la compilación de TurboFan en segundo plano proporciona un alto rendimiento máximo lo antes posible. Se pueden encontrar más detalles sobre Liftoff, TurboFan y todo el proceso de compilación en un [documento separado](https://v8.dev/docs/wasm-compilation-pipeline).

Compilar todo el módulo de WebAssembly con TurboFan proporciona el mejor rendimiento posible una vez que se completa la compilación, pero eso tiene un costo:

- Los núcleos de CPU que ejecutan la compilación de TurboFan en segundo plano pueden bloquear otras tareas que requerirían la CPU, por ejemplo, los trabajadores de la aplicación web.
- La compilación de TurboFan de funciones no importantes puede retrasar la compilación de TurboFan de funciones más importantes, lo que puede retrasar que la aplicación web alcance su máximo rendimiento.
- Algunas funciones de WebAssembly pueden nunca ejecutarse, y gastar recursos en compilar estas funciones con TurboFan puede no valer la pena.

## Tiering dinámico

El tiering dinámico debe aliviar estos problemas al compilar solo aquellas funciones con TurboFan que realmente se ejecutan varias veces. De esta manera, el tiering dinámico puede cambiar el rendimiento de las aplicaciones web de varias formas: el tiering dinámico puede acelerar el tiempo de inicio al reducir la carga en las CPU y permitir que las tareas de inicio, además de la compilación de WebAssembly, utilicen más la CPU. También puede ralentizar el rendimiento al retrasar la compilación de TurboFan para funciones importantes. Como V8 no utiliza reemplazo en la pila para el código WebAssembly, la ejecución puede quedar atrapada en un bucle con código Liftoff, por ejemplo. Además, el almacenamiento en caché del código se ve afectado, porque Chrome solo almacena en caché el código TurboFan, y todas las funciones que nunca califican para la compilación TurboFan se compilan con Liftoff al inicio, incluso cuando el módulo WebAssembly compilado ya existe en caché.

## Cómo probarlo

Animamos a los desarrolladores interesados a experimentar con el impacto del rendimiento del tiering dinámico en sus aplicaciones web. Esto nos permitirá reaccionar y evitar posibles regresiones de rendimiento a tiempo. El tiering dinámico se puede habilitar localmente ejecutando Chrome con la bandera de línea de comandos `--enable-blink-features=WebAssemblyDynamicTiering`.

Los embebedores de V8 que deseen habilitar el tiering dinámico pueden hacerlo configurando la bandera de V8 `--wasm-dynamic-tiering`.

### Pruebas en el campo con una Prueba de Origen

Ejecutar Chrome con una bandera de línea de comandos es algo que un desarrollador puede hacer, pero no debería esperarse de un usuario final. Para experimentar con su aplicación en el campo, es posible unirse a lo que se llama una [Prueba de Origen](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md). Las pruebas de origen permiten probar funciones experimentales con usuarios finales a través de un token especial que está vinculado a un dominio. Este token especial habilita el tiering dinámico de WebAssembly para el usuario final en páginas específicas que incluyen el token. Para obtener su propio token para ejecutar una prueba de origen, [utilice el formulario de solicitud](https://developer.chrome.com/origintrials/#/view_trial/3716595592487501825).

## Danos tu opinión

Estamos buscando la opinión de los desarrolladores que prueban esta función, ya que nos ayudará a ajustar las heurísticas sobre cuándo la compilación de TurboFan es útil y cuándo no vale la pena y puede evitarse. La mejor manera de enviar comentarios es [informar problemas](https://bugs.chromium.org/p/chromium/issues/detail?id=1260322).
