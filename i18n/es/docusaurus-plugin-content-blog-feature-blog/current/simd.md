---
title: "Aplicaciones rápidas y paralelas con WebAssembly SIMD"
author: "Deepti Gandluri ([@dptig](https://twitter.com/dptig)), Thomas Lively ([@tlively52](https://twitter.com/tlively52)), Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
date: 2020-01-30
updated: 2022-11-06
tags:
  - WebAssembly
description: "Trayendo operaciones vectoriales a WebAssembly"
tweet: "1222944308183085058"
---
SIMD significa _Single Instruction, Multiple Data_ (Instrucción Única, Múltiples Datos). Las instrucciones SIMD son una clase especial de instrucciones que aprovechan el paralelismo de datos en las aplicaciones al realizar simultáneamente la misma operación en múltiples elementos de datos. Las aplicaciones intensivas en cálculo, como códecs de audio/video, procesadores de imágenes, son ejemplos de aplicaciones que se benefician de las instrucciones SIMD para acelerar el rendimiento. La mayoría de las arquitecturas modernas admiten algunas variantes de instrucciones SIMD.

<!--truncate-->
La propuesta de SIMD para WebAssembly define un subconjunto portátil y eficiente de operaciones SIMD que están disponibles en la mayoría de las arquitecturas modernas. Esta propuesta derivó muchos elementos de la [propuesta SIMD.js](https://github.com/tc39/ecmascript_simd), que a su vez se derivó originalmente de la especificación [Dart SIMD](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages). La propuesta SIMD.js fue una API propuesta en TC39 con nuevos tipos y funciones para realizar cálculos SIMD, pero esta fue archivada a favor de admitir operaciones SIMD de manera más transparente en WebAssembly. La [propuesta de SIMD de WebAssembly](https://github.com/WebAssembly/simd) se introdujo como una forma para que los navegadores aprovechen el paralelismo a nivel de datos utilizando el hardware subyacente.

## Propuesta de SIMD para WebAssembly

El objetivo principal de la propuesta de SIMD para WebAssembly es introducir operaciones vectoriales en la Especificación de WebAssembly, de una manera que garantice un rendimiento portátil.

El conjunto de instrucciones SIMD es grande y variado entre arquitecturas. El conjunto de operaciones incluidas en la propuesta SIMD de WebAssembly consiste en operaciones que están bien soportadas en una amplia variedad de plataformas y que han demostrado ser eficientes. Para este fin, la propuesta actual se limita a estandarizar operaciones SIMD de ancho fijo de 128 bits.

La propuesta actual introduce un nuevo tipo de valor `v128` y una serie de nuevas operaciones que operan en este tipo. Los criterios utilizados para determinar estas operaciones son:

- Las operaciones deben estar bien soportadas en múltiples arquitecturas modernas.
- Las mejoras en el rendimiento deben ser positivas en múltiples arquitecturas relevantes dentro de un grupo de instrucciones.
- El conjunto elegido de operaciones debe minimizar cualquier posible caída de rendimiento.

La propuesta ahora está en [estado finalizado (fase 4)](https://github.com/WebAssembly/simd/issues/480), y tanto V8 como la cadena de herramientas tienen implementaciones funcionales.

## Habilitando soporte para SIMD

### Detección de características

Primero, tenga en cuenta que SIMD es una característica nueva y aún no está disponible en todos los navegadores con soporte para WebAssembly. Puede encontrar qué navegadores admiten nuevas características de WebAssembly en el sitio web de [webassembly.org](https://webassembly.org/roadmap/).

Para garantizar que todos los usuarios puedan cargar su aplicación, necesitará construir dos versiones diferentes: una con SIMD habilitado y otra sin él, y cargar la versión correspondiente según los resultados de detección de características. Para detectar SIMD en tiempo de ejecución, puede usar la biblioteca [`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect) y cargar el módulo correspondiente de esta manera:

```js
import { simd } from 'wasm-feature-detect';

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import('./module-with-simd.js')
      : import('./module-without-simd.js')
  );
  // …ahora use el `module` como lo haría normalmente
})();
```

Para aprender sobre cómo compilar código con soporte para SIMD, consulte la sección [a continuación](#building-with-simd-support).

### Soporte para SIMD en navegadores

El soporte para SIMD en WebAssembly está disponible de forma predeterminada a partir de Chrome 91. Asegúrese de utilizar la última versión de la cadena de herramientas como se detalla a continuación, así como la última versión de wasm-feature-detect para detectar motores que admitan la versión final de la especificación. Si algo no se ve bien, por favor [reporta un error](https://crbug.com/v8).

SIMD de WebAssembly también es compatible con Firefox 89 y versiones posteriores.

## Compilando con soporte para SIMD

### Compilando C / C++ para apuntar a SIMD

El soporte para SIMD en WebAssembly depende del uso de una versión reciente de clang con el backend LLVM de WebAssembly habilitado. Emscripten también tiene soporte para la propuesta de SIMD de WebAssembly. Instale y active la distribución `latest` de emscripten utilizando [emsdk](https://emscripten.org/docs/getting_started/downloads.html) para usar las funciones SIMD.

```bash
./emsdk install latest
./emsdk activate latest
```

Hay un par de formas diferentes de habilitar la generación de código SIMD al portar su aplicación para usar SIMD. Una vez que se haya instalado la última versión upstream de emscripten, compile usando emscripten y pase la bandera `-msimd128` para habilitar SIMD.

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

Las aplicaciones que ya han sido portadas para usar WebAssembly pueden beneficiarse de SIMD sin modificaciones en el código fuente gracias a las optimizaciones de autovectorización de LLVM.

Estas optimizaciones pueden transformar automáticamente bucles que realizan operaciones aritméticas en cada iteración en bucles equivalentes que realizan las mismas operaciones aritméticas en múltiples entradas a la vez usando instrucciones SIMD. Los autovectorizadores de LLVM están habilitados por defecto en los niveles de optimización `-O2` y `-O3` cuando se proporciona la bandera `-msimd128`.

Por ejemplo, considere la siguiente función que multiplica los elementos de dos matrices de entrada y almacena los resultados en una matriz de salida.

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

Sin pasar la bandera `-msimd128`, el compilador emite este bucle en WebAssembly:

```wasm
(loop
  (i32.store
    … obtener la dirección en `out` …
    (i32.mul
      (i32.load … obtener la dirección en `in_a` …)
      (i32.load … obtener la dirección en `in_b` …)
  …
)
```

Pero cuando se utiliza la bandera `-msimd128`, el autovectorizador convierte esto en código que incluye el siguiente bucle:

```wasm
(loop
  (v128.store align=4
    … obtener la dirección en `out` …
    (i32x4.mul
       (v128.load align=4 … obtener la dirección en `in_a` …)
       (v128.load align=4 … obtener la dirección en `in_b` …)
    …
  )
)
```

El cuerpo del bucle tiene la misma estructura, pero se están utilizando instrucciones SIMD para cargar, multiplicar y almacenar cuatro elementos a la vez dentro del cuerpo del bucle.

Para un control más detallado sobre las instrucciones SIMD generadas por el compilador, incluya el [archivo de encabezado `wasm_simd128.h`](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h), que define un conjunto de intrínsecos. Los intrínsecos son funciones especiales que, cuando se llaman, serán convertidas por el compilador en las instrucciones SIMD correspondientes de WebAssembly, a menos que pueda realizar más optimizaciones.

Como ejemplo, aquí está la misma función de antes reescrita manualmente para usar los intrínsecos SIMD.

```cpp
#include <wasm_simd128.h>

void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i += 4) {
    v128_t a = wasm_v128_load(&in_a[i]);
    v128_t b = wasm_v128_load(&in_b[i]);
    v128_t prod = wasm_i32x4_mul(a, b);
    wasm_v128_store(&out[i], prod);
  }
}
```

Este código reescrito manualmente asume que las matrices de entrada y salida están alineadas y no se sobreponen, y que el tamaño es un múltiplo de cuatro. El autovectorizador no puede hacer estas suposiciones y tiene que generar código adicional para manejar los casos en los que no son verdaderos, por lo que el código SIMD escrito a mano suele ser más pequeño que el código SIMD autovectorizado.

### Compilación cruzada de proyectos existentes en C / C++

Muchos proyectos existentes ya admiten SIMD al orientarse a otras plataformas, en particular las instrucciones [SSE](https://en.wikipedia.org/wiki/Streaming_SIMD_Extensions) y [AVX](https://en.wikipedia.org/wiki/Advanced_Vector_Extensions) en plataformas x86 / x86-64 y las instrucciones [NEON](https://en.wikipedia.org/wiki/ARM_architecture#Advanced_SIMD_(Neon)) en plataformas ARM. Hay dos formas en que esto generalmente se implementa.

La primera es mediante archivos de ensamblaje que se encargan de las operaciones SIMD y se enlazan junto con C / C++ durante el proceso de compilación. La sintaxis y las instrucciones de ensamblaje dependen en gran medida de la plataforma y no son portátiles, por lo que, para utilizar SIMD, dichos proyectos deben agregar WebAssembly como un objetivo adicional compatible y reimplementar las funciones correspondientes utilizando ya sea el [formato de texto WebAssembly](https://webassembly.github.io/spec/core/text/index.html) o los intrínsecos descritos [anteriormente](#building-c-%2F-c%2B%2B-to-target-simd).

Otro enfoque común es usar directamente intrínsecos SSE / SSE2 / AVX / NEON desde el código en C / C++ y aquí Emscripten puede ayudar. Emscripten [proporciona encabezados compatibles y una capa de emulación](https://emscripten.org/docs/porting/simd.html) para todos estos conjuntos de instrucciones, y una capa de emulación que los compila directamente en intrínsecos Wasm donde sea posible, o a código escalarizado en caso contrario.

Para compilar cruzadamente tales proyectos, primero habilite SIMD mediante las banderas de configuración específicas del proyecto, por ejemplo, `./configure --enable-simd` para que pase `-msse`, `-msse2`, `-mavx` o `-mfpu=neon` al compilador y llame a los intrínsecos correspondientes. Luego, adicionalmente pase `-msimd128` para habilitar también SIMD en WebAssembly, ya sea utilizando `CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …` o modificando directamente la configuración de la compilación al orientar hacia Wasm.

### Compilación de Rust dirigida a SIMD

Al compilar código Rust para orientarlo a WebAssembly SIMD, deberá habilitar la misma característica `simd128` de LLVM como en Emscripten anteriormente.

Si puede controlar directamente las banderas de `rustc` o mediante la variable de entorno `RUSTFLAGS`, pase `-C target-feature=+simd128`:

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

o

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

Al igual que en Clang / Emscripten, los autovectorizadores de LLVM están habilitados por defecto para el código optimizado cuando la característica `simd128` está habilitada.

Por ejemplo, el equivalente en Rust del ejemplo `multiply_arrays` mencionado anteriormente

```rust
pub fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.iter()
    .zip(in_b)
    .zip(out)
    .for_each(|((a, b), dst)| {
        *dst = a * b;
    });
}
```

produciría un código similar autovectorizado para la parte alineada de las entradas.

Para tener control manual sobre las operaciones SIMD, puedes usar la herramienta nightly, habilitar la característica `wasm_simd` de Rust e invocar las intrínsecas directamente desde el namespace [`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd):

```rust
#![feature(wasm_simd)]

use std::arch::wasm32::*;

pub unsafe fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.chunks(4)
    .zip(in_b.chunks(4))
    .zip(out.chunks_mut(4))
    .for_each(|((a, b), dst)| {
      let a = v128_load(a.as_ptr() as *const v128);
      let b = v128_load(b.as_ptr() as *const v128);
      let prod = i32x4_mul(a, b);
      v128_store(dst.as_mut_ptr() as *mut v128, prod);
    });
}
```

Alternativamente, utiliza una biblioteca auxiliar como [`packed_simd`](https://crates.io/crates/packed_simd_2) que abstrae las implementaciones de SIMD en varias plataformas.

## Casos de uso convincentes

La propuesta SIMD para WebAssembly busca acelerar aplicaciones de alto cómputo como códecs de audio y video, aplicaciones de procesamiento de imágenes, aplicaciones criptográficas, etc. Actualmente SIMD en WebAssembly es compatible de manera experimental en proyectos de código abierto ampliamente utilizados como [Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md), [OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html) y [XNNPACK](https://github.com/google/XNNPACK).

Algunos demos interesantes provienen del proyecto [MediaPipe](https://github.com/google/mediapipe) del equipo de Investigación de Google.

Según su descripción, MediaPipe es un marco para construir pipelines de ML multimodales (por ejemplo, video, audio, cualquier dato de series temporales). ¡Y también tienen una [versión web](https://developers.googleblog.com/2020/01/mediapipe-on-web.html)!

Uno de los demos más atractivos visualmente donde es fácil observar la diferencia en rendimiento que hace SIMD, es una versión únicamente para CPU (sin GPU) de un sistema de seguimiento de manos. [Sin SIMD](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html), solo puedes obtener alrededor de 14-15 FPS (fotogramas por segundo) en una laptop moderna, mientras que [con SIMD habilitado en Chrome Canary](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html) obtienes una experiencia mucho más fluida, con 38-40 FPS.

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

Otro conjunto interesante de demos que utilizan SIMD para una experiencia fluida, provienen de OpenCV, una popular biblioteca de visión por computadora que también puede ser compilada a WebAssembly. Están disponibles en este [enlace](https://bit.ly/opencv-camera-demos), o puedes ver las versiones grabadas a continuación:

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>Lectura de tarjetas</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>Capa de invisibilidad</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>Reemplazo de emojis</figcaption>
</figure>

## Trabajo futuro

La propuesta actual de SIMD de ancho fijo está en la [Fase 4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group), por lo que se considera completa.

Algunas exploraciones de extensiones futuras de SIMD han comenzado en las propuestas [Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) y [Flexible Vectors](https://github.com/WebAssembly/flexible-vectors), que, al momento de escribir esto, están en la Fase 1.
