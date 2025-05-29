---
title: &apos;Mitigaciones para código no confiable&apos;
description: &apos;Si incrustas V8 y ejecutas código JavaScript no confiable, habilita las mitigaciones de V8 para ayudar a protegerte contra ataques de canales laterales especulativos.&apos;
---
A principios de 2018, investigadores del Proyecto Cero de Google divulgaron [una nueva clase de ataques](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) que [explotan](https://security.googleblog.com/2018/01/more-details-about-mitigations-for-cpu_4.html) optimizaciones de ejecución especulativa utilizadas por muchos CPUs. Debido a que V8 utiliza un compilador JIT optimizado, TurboFan, para ejecutar JavaScript rápidamente, en ciertas circunstancias es vulnerable a los ataques de canales laterales descritos en la divulgación.

## Nada cambia si solo ejecutas código confiable

Si tu producto solo utiliza una instancia incrustada de V8 para ejecutar código JavaScript o WebAssembly que está completamente bajo tu control, entonces el uso de V8 probablemente no se verá afectado por la vulnerabilidad de Ataques de Canales Laterales Especulativos (SSCA). Una instancia de Node.js que ejecuta solo código confiable es un ejemplo no afectado.

Para aprovechar la vulnerabilidad, un atacante debe ejecutar un código JavaScript o WebAssembly cuidadosamente diseñado en tu entorno incrustado. Si, como desarrollador, tienes control total sobre el código ejecutado en tu instancia incrustada de V8, entonces eso es muy poco probable. Sin embargo, si tu instancia incrustada de V8 permite que se descargue y ejecute código JavaScript o WebAssembly arbitrario o de otra manera no confiable, o incluso genera y ejecuta posteriormente código JavaScript o WebAssembly que no está completamente bajo tu control (por ejemplo, si lo usa como objetivo de compilación), es posible que necesites considerar mitigaciones.

## Si ejecutas código no confiable…

### Actualiza a la última versión de V8 para beneficiarte de las mitigaciones y habilitarlas

Las mitigaciones para esta clase de ataques están disponibles en V8 a partir de [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1), por lo que se recomienda actualizar tu copia incrustada de V8 a [v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1) o posteriores. Las versiones anteriores de V8, incluidas las versiones que aún utilizan FullCodeGen y/o CrankShaft, no tienen mitigaciones para SSCA.

A partir de [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1), se introdujo una nueva bandera en V8 para ayudar a proteger contra las vulnerabilidades de SSCA. Esta bandera, llamada `--untrusted-code-mitigations`, se habilita por defecto en tiempo de ejecución a través de una bandera GN de tiempo de compilación llamada `v8_untrusted_code_mitigations`.

Estas mitigaciones se habilitan mediante la bandera de tiempo de ejecución `--untrusted-code-mitigations`:

- Enmascaramiento de direcciones antes de accesos a memoria en WebAssembly y asm.js para garantizar que las cargas de memoria especulativamente ejecutadas no puedan acceder a memoria fuera de los heaps de WebAssembly y asm.js.
- Enmascaramiento de índices en código JIT utilizado para acceder a arreglos y cadenas de JavaScript en rutas ejecutadas especulativamente para garantizar que no se puedan realizar cargas especulativas con arreglos y cadenas en direcciones de memoria que no deberían ser accesibles para el código JavaScript.

Los embebedores deben tener en cuenta que las mitigaciones pueden implicar un compromiso de rendimiento. El impacto real depende significativamente de tu carga de trabajo. Para cargas de trabajo como Speedometer, el impacto es insignificante, pero para cargas de trabajo computacionales más extremas, puede ser de hasta un 15%. Si confías plenamente en el código JavaScript y WebAssembly que ejecuta tu instancia incrustada de V8, puedes optar por deshabilitar estas mitigaciones JIT especificando la bandera `--no-untrusted-code-mitigations` en tiempo de ejecución. La bandera GN `v8_untrusted_code_mitigations` puede usarse para habilitar o deshabilitar las mitigaciones en tiempo de compilación.

Ten en cuenta que V8 deshabilita estas mitigaciones por defecto en plataformas donde se asume que el embedder usará aislamiento de procesos, como plataformas donde Chromium utiliza aislamiento de sitios.

### Aislar la ejecución no confiable en un proceso separado

Si ejecutas código JavaScript y WebAssembly no confiable en un proceso separado de cualquier dato sensible, el impacto potencial de SSCA se reduce considerablemente. A través del aislamiento de procesos, los ataques SSCA solo pueden observar datos que están aislados dentro del mismo proceso junto con el código ejecutante, y no datos de otros procesos.

### Considera ajustar tus temporizadores de alta precisión ofrecidos

Un temporizador de alta precisión facilita la observación de canales laterales en la vulnerabilidad SSCA. Si tu producto ofrece temporizadores de alta precisión que pueden ser accedidos por código JavaScript o WebAssembly no confiable, considera hacer que estos temporizadores sean más imprecisos o agregarles variación.
