---
title: "Fuera de la web: binarios independientes de WebAssembly usando Emscripten"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2019-11-21
tags:
  - WebAssembly
  - tooling
description: "Emscripten ahora admite archivos Wasm independientes, que no necesitan JavaScript."
tweet: "1197547645729988608"
---
Emscripten siempre se ha centrado principalmente en compilar para la Web y otros entornos JavaScript como Node.js. Pero a medida que WebAssembly comienza a ser utilizado *sin* JavaScript, surgen nuevos casos de uso, y por eso hemos estado trabajando en el soporte para emitir [**Wasm independiente**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone) desde Emscripten, que no depende del runtime de JavaScript de Emscripten. ¡Esta publicación explica por qué eso es interesante!

<!--truncate-->
## Usando el modo independiente en Emscripten

¡Primero, veamos qué puedes hacer con esta nueva funcionalidad! Similar a [esta publicación](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/), comencemos con un programa tipo "hola mundo" que exporta una función única que suma dos números:

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

Normalmente lo compilaríamos con algo como `emcc -O3 add.c -o add.js`, que emitiría `add.js` y `add.wasm`. En cambio, pidamos a `emcc` que solo emita Wasm:

```
emcc -O3 add.c -o add.wasm
```

Cuando `emcc` detecta que solo queremos Wasm, lo hace "independiente": un archivo Wasm que puede ejecutarse por sí mismo tanto como sea posible, sin ningún código de runtime de JavaScript de Emscripten.

Desensamblándolo, es muy mínimo: ¡solo 87 bytes! Contiene la obvia función `add`

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

y una función más, `_start`,

```lisp
(func $_start
 (nop)
)
```

`_start` es parte de la especificación [WASI](https://github.com/WebAssembly/WASI), y el modo independiente de Emscripten lo emite para que podamos ejecutarlo en runtimes WASI. (Normalmente `_start` haría inicialización global, pero aquí simplemente no necesitamos ninguna, así que está vacío).

### Escribe tu propio cargador de JavaScript

Una buena característica de un archivo Wasm independiente como este es que puedes escribir JavaScript personalizado para cargarlo y ejecutarlo, lo que puede ser muy mínimo dependiendo de tu caso de uso. Por ejemplo, podemos hacer esto en Node.js:

```js
// load-add.js
const binary = require('fs').readFileSync('add.wasm');

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

¡Solo 4 líneas! Ejecutarlo imprime `42` como se esperaba. Ten en cuenta que si bien este ejemplo es muy simplista, hay casos en los que simplemente no necesitas mucho JavaScript y puedes hacerlo mejor que el runtime de JavaScript predeterminado de Emscripten (que admite un montón de entornos y opciones). Un ejemplo del mundo real de eso está en [meshoptimizer de zeux](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js): ¡solo 57 líneas, incluyendo gestión de memoria, crecimiento, etc.!

### Ejecutando en runtimes Wasm

Otra buena característica de los archivos Wasm independientes es que puedes ejecutarlos en runtimes Wasm como [wasmer](https://wasmer.io), [wasmtime](https://github.com/bytecodealliance/wasmtime) o [WAVM](https://github.com/WAVM/WAVM). Por ejemplo, considera este hola mundo:

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("¡hola, mundo!\n");
  return 0;
}
```

Podemos compilar y ejecutar eso en cualquiera de esos runtimes:

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
¡hola, mundo!
$ wasmtime hello.wasm
¡hola, mundo!
$ wavm run hello.wasm
¡hola, mundo!
```

Emscripten utiliza APIs WASI tanto como sea posible, por lo que programas como este terminan utilizando 100% WASI y pueden ejecutarse en runtimes que soportan WASI (ver notas más adelante sobre qué programas requieren más que WASI).

### Construyendo plugins de Wasm

Además de la Web y el servidor, un área emocionante para Wasm son los **plugins**. Por ejemplo, un editor de imágenes podría tener plugins Wasm que puedan realizar filtros y otras operaciones en la imagen. Para ese tipo de caso de uso, quieres un binario Wasm independiente, como en los ejemplos hasta ahora, pero donde también tenga una API adecuada para la aplicación de integración.

Los plugins a veces están relacionados con bibliotecas dinámicas, ya que las bibliotecas dinámicas son una forma de implementarlos. Emscripten tiene soporte para bibliotecas dinámicas con la opción [SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking), y esta ha sido una manera de construir plugins Wasm. La nueva opción independiente de Wasm descrita aquí es una mejora en varios aspectos: Primero, una biblioteca dinámica tiene memoria relocatable, lo que agrega sobrecarga si no la necesitas (y no la necesitas si no estás vinculando el Wasm con otro Wasm después de cargarlo). Segundo, la salida independiente está diseñada para ejecutarse también en entornos de ejecución de Wasm, como se mencionó anteriormente.

De acuerdo, hasta ahora todo bien: Emscripten puede emitir JavaScript + WebAssembly como siempre lo hizo, y ahora también puede emitir solo WebAssembly por sí solo, lo que permite ejecutarlo en lugares que no tienen JavaScript, como entornos de ejecución Wasm, o puedes escribir tu propio código cargador de JavaScript personalizado, etc. Ahora hablemos del contexto y los detalles técnicos.

## Las dos APIs estándar de WebAssembly

WebAssembly solo puede acceder a las API que recibe como importaciones: la especificación principal de Wasm no tiene detalles concretos de API. Dada la trayectoria actual de Wasm, parece que habrá 3 categorías principales de API que las personas importan y utilizan:

- **APIs Web**: Esto es lo que los programas Wasm usan en la Web, que son las APIs estandarizadas existentes que JavaScript también puede usar. Actualmente se llaman indirectamente, a través del código glue de JS, pero en el futuro con [interface types](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md) se llamarán directamente.
- **APIs WASI**: WASI se centra en estandarizar APIs para Wasm en el servidor.
- **Otras APIs**: Varios embebidos personalizados definirán sus propias APIs específicas de la aplicación. Por ejemplo, dimos el ejemplo anteriormente de un editor de imágenes con plugins Wasm que implementan una API para realizar efectos visuales. Ten en cuenta que un plugin también podría tener acceso a APIs “sistemas”, como lo haría una biblioteca dinámica nativa, o podría estar muy aislado y no tener importaciones en absoluto (si el embebido solo llama a sus métodos).

WebAssembly está en la posición interesante de tener [dos conjuntos de APIs estandarizados](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so). Esto tiene sentido en que uno es para la Web y otro para el servidor, y esos entornos tienen diferentes requisitos; por razones similares Node.js no tiene APIs idénticas a JavaScript en la Web.

Sin embargo, hay más que la Web y el servidor, en particular también hay plugins Wasm. Por un lado, los plugins pueden ejecutarse dentro de una aplicación que puede estar en la Web (tal como [plugins JS](https://www.figma.com/blog/an-update-on-plugin-security/#a-technology-change)) o fuera de la Web; por otro, independientemente de dónde esté la aplicación embebida, un entorno de plugin no es un entorno de Web ni de servidor. Por lo tanto, no es inmediatamente obvio qué conjuntos de APIs se usarán - puede depender del código que se porte, el entorno de ejecución Wasm que se embeba, etc.

## Unifiquemos todo lo posible

Una forma concreta en que Emscripten espera ayudar aquí es que usando APIs WASI tanto como sea posible podemos evitar diferencias de API **innecesarias**. Como se mencionó anteriormente, en la Web el código de Emscripten accede a APIs Web indirectamente, a través de JavaScript, por lo que donde esa API de JavaScript podría parecerse a WASI, estaríamos eliminando una diferencia de API innecesaria, y ese mismo binario también puede ejecutarse en el servidor. En otras palabras, si Wasm quiere registrar información, necesita llamar a JS, algo como esto:

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev` es una implementación de la interfaz de llamada al sistema Linux que [musl libc](https://www.musl-libc.org) utiliza para escribir datos en un descriptor de archivos, y eso termina llamando a `console.log` con los datos correctos. El módulo Wasm importa y llama a esa `musl_writev`, que define una ABI entre el JS y el Wasm. Esa ABI es arbitraria (y, de hecho, Emscripten ha cambiado su ABI con el tiempo para optimizarla). Si reemplazamos eso con una ABI que coincida con WASI, podemos obtener esto:

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

Esto no es un gran cambio, solo requiere un poco de refactorización de la ABI, y cuando se ejecuta en un entorno JS no importa mucho. Pero ahora el Wasm puede ejecutarse sin el JS ya que esa API WASI es reconocida por entornos de ejecución WASI. Así es como funcionan los ejemplos independientes de Wasm de antes, solo refactorizando Emscripten para usar APIs WASI.

Otra ventaja de que Emscripten use APIs WASI es que podemos ayudar a la especificación WASI encontrando problemas del mundo real. Por ejemplo, descubrimos que [cambiar las constantes "whence" de WASI](https://github.com/WebAssembly/WASI/pull/106) sería útil, y hemos comenzado algunas discusiones sobre [tamaño de código](https://github.com/WebAssembly/WASI/issues/109) y [compatibilidad POSIX](https://github.com/WebAssembly/WASI/issues/122).

Que Emscripten use WASI tanto como sea posible también es útil porque permite a los usuarios usar un único SDK para apuntar a entornos de Web, servidores y plugins. Emscripten no es el único SDK que permite eso, ya que la salida del SDK WASI puede ejecutarse en la Web usando el [WASI Web Polyfill](https://wasi.dev/polyfill/) o el [wasmer-js](https://github.com/wasmerio/wasmer-js) de Wasmer, pero la salida Web de Emscripten es más compacta, por lo que permite usar un único SDK sin comprometer el rendimiento en la Web.

Hablando de eso, puedes generar un archivo Wasm independiente desde Emscripten con un archivo JS opcional en un solo comando:

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

Eso genera `add.js` y `add.wasm`. El archivo Wasm es independiente, como antes cuando solo generamos un archivo Wasm por sí mismo (el `STANDALONE_WASM` se configuró automáticamente cuando indicamos `-o add.wasm`), pero ahora, además, hay un archivo JS que puede cargarlo y ejecutarlo. El JS es útil para ejecutarlo en la Web si no deseas escribir tu propio JS para eso.

## ¿Necesitamos Wasm *no* independiente?

¿Por qué existe la bandera `STANDALONE_WASM`? En teoría, Emscripten siempre podría establecer `STANDALONE_WASM`, lo cual sería más simple. Pero los archivos Wasm independientes no pueden depender de JS, y eso tiene algunas desventajas:

- No podemos minimizar los nombres de importación y exportación de Wasm, ya que la minimización solo funciona si ambas partes están de acuerdo, el Wasm y lo que lo carga.
- Normalmente creamos la Memoria de Wasm en JS para que JS pueda empezar a usarla durante la inicialización, lo que nos permite realizar trabajos en paralelo. Pero en Wasm independiente debemos crear la Memoria dentro del Wasm.
- Algunas API son simplemente más fáciles de implementar en JS. Por ejemplo, [`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558), que se llama cuando falla una aserción en C, normalmente está [implementada en JS](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235). Solo requiere una línea, e incluso si incluyes las funciones JS que llama, el tamaño total del código es bastante pequeño. Por otro lado, en una compilación independiente no podemos depender de JS, por lo que usamos [`assert.c` de musl](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4). Este usa `fprintf`, lo que significa que termina incluyendo una gran cantidad de soporte de `stdio` de C, incluyendo elementos con llamadas indirectas que dificultan eliminar funciones no utilizadas. En general, hay muchos detalles de este tipo que terminan marcando una diferencia en el tamaño total del código.

Si deseas ejecutar tanto en la Web como en otros entornos, y quieres un tamaño de código y tiempos de inicio 100% óptimos, deberías realizar dos compilaciones separadas, una con `-s STANDALONE` y otra sin ella. ¡Es muy fácil, ya que solo es cambiar una bandera!

## Diferencias necesarias de API

Vimos que Emscripten utiliza las API de WASI tanto como sea posible para evitar diferencias de API **innecesarias**. ¿Existen algunas **necesarias**? Tristemente, sí: algunas API de WASI requieren compensaciones. Por ejemplo:

- WASI no admite varias características de POSIX, como [permisos de archivos de usuario/grupo/mundo](https://github.com/WebAssembly/WASI/issues/122), como resultado de lo cual no puedes implementar completamente un sistema `ls` (Linux) por ejemplo (ver detalles en ese enlace). La capa de sistema de archivos existente de Emscripten sí admite algunas de esas cosas, por lo que si cambiásemos a API de WASI para todas las operaciones del sistema de archivos, estaríamos [perdiendo algo de soporte POSIX](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711).
- La función `path_open` de WASI [tiene un costo en el tamaño del código](https://github.com/WebAssembly/WASI/issues/109) porque fuerza un manejo adicional de permisos dentro del Wasm. Ese código es innecesario en la Web.
- WASI no proporciona una [API de notificación para el crecimiento de la memoria](https://github.com/WebAssembly/WASI/issues/82), y como resultado, los entornos en JS deben verificar constantemente si la memoria creció y, de ser así, actualizar sus vistas en cada importación y exportación. Para evitar esa sobrecarga, Emscripten proporciona una API de notificación, `emscripten_notify_memory_growth`, que [puedes ver implementada en una sola línea](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10) en el optimizador de mallas de zeux que mencionamos anteriormente.

Con el tiempo, WASI puede agregar más soporte POSIX, una notificación de crecimiento de memoria, etc. - WASI sigue siendo altamente experimental y se espera que cambie significativamente. Por ahora, para evitar regresiones en Emscripten, no emitimos binarios 100% WASI si usas ciertas características. En particular, la apertura de archivos utiliza un método POSIX en lugar de WASI, lo que significa que si llamas a `fopen`, el archivo Wasm resultante no será 100% WASI. Sin embargo, si todo lo que haces es usar `printf`, que opera en el `stdout` ya abierto, entonces será 100% WASI, como en el ejemplo de "hola mundo" que vimos cerca del principio, donde la salida de Emscripten se ejecuta en entornos WASI.

Si es útil para los usuarios, podemos agregar una opción `PURE_WASI` que sacrificaría el tamaño del código a cambio de un cumplimiento estricto de WASI. Pero si eso no es urgente (y la mayoría de los casos de uso de plugins que hemos visto hasta ahora no necesitan una entrada/salida completa de archivos), entonces tal vez podamos esperar a que WASI mejore hasta el punto en el que Emscripten pueda eliminar estas API no WASI. Ese sería el mejor resultado, y estamos trabajando hacia eso, como puedes ver en los enlaces anteriores.

Sin embargo, incluso si WASI mejora, no se puede evitar el hecho de que Wasm tiene dos APIs estandarizadas, como se mencionó anteriormente. En el futuro, espero que Emscripten llame a las APIs de Web directamente usando tipos de interfaz, porque será más compacto que llamar a una API de JS similar a WASI que luego llama a una API de Web (como en el ejemplo de `musl_writev` mencionado antes). Podríamos tener un polyfill o una capa de traducción de algún tipo para ayudar aquí, pero no querríamos usarlo innecesariamente, por lo que necesitaremos compilaciones separadas para los entornos de Web y WASI. (Esto es algo desafortunado; en teoría, esto podría haberse evitado si WASI fuera un superconjunto de las APIs de Web, pero obviamente eso habría significado compromisos del lado del servidor).

## Estado actual

¡Ya funciona bastante! Las principales limitaciones son:

- **Limitaciones de WebAssembly**: Varias características, como excepciones en C++, `setjmp` y `pthreads`, dependen de JavaScript debido a las limitaciones de Wasm, y aún no hay un buen reemplazo sin JS. (Emscripten puede comenzar a admitir algunas de ellas [usando Asyncify](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s), o tal vez simplemente esperaremos a que [las características nativas de Wasm](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md) lleguen a los VMs).
- **Limitaciones de WASI**: Bibliotecas y APIs como OpenGL y SDL aún no tienen WAPIs correspondientes en WASI.

Aún **puedes** usar todas estas en el modo autónomo de Emscripten, pero la salida contendrá llamadas al código de soporte de tiempo de ejecución de JS. Como resultado, no será 100% WASI (por razones similares, esas características tampoco funcionan en el SDK de WASI). Esos archivos de Wasm no se ejecutarán en entornos de WASI, pero puedes usarlos en la Web y puedes escribir tu propio tiempo de ejecución de JS para ellos. También puedes usarlos como complementos; por ejemplo, un motor de juego podría tener complementos que renderizan usando OpenGL, y el desarrollador los compilaría en modo autónomo y luego implementaría las importaciones de OpenGL en el entorno de Wasm del motor. El modo autónomo de Wasm aún ayuda aquí porque hace que la salida sea tan autónoma como Emscripten puede hacerla.

También puedes encontrar APIs que **sí** tienen un reemplazo sin JS que aún no hemos convertido, ya que el trabajo sigue en curso. Por favor, [informa errores](https://github.com/emscripten-core/emscripten/issues), ¡y como siempre, cualquier ayuda es bienvenida!
