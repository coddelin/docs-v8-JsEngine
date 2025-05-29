---
title: "Introduciendo la API de Integración de Promesas de JavaScript para WebAssembly"
description: "Este documento presenta JSPI y proporciona algunos ejemplos simples para que comiences a usarlo"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-07-01
tags: 
  - WebAssembly
---
La API de Integración de Promesas de JavaScript (JSPI) permite que las aplicaciones WebAssembly escritas bajo la suposición de acceso _sincrónico_ a la funcionalidad externa operen sin problemas en un entorno en el que la funcionalidad es _asíncrona_.

<!--truncate-->
Esta nota describe cuáles son las capacidades principales de la API JSPI, cómo acceder a ella, cómo desarrollar software para usarlas y ofrece algunos ejemplos para probar.

## ¿Para qué sirve ‘JSPI’?

Las APIs asíncronas operan separando la _iniciación_ de la operación de su _resolución_; siendo esta última realizada algún tiempo después del inicio. Lo más importante es que la aplicación continúa ejecutándose después de iniciar la operación y se le notifica cuando dicha operación se completa.

Por ejemplo, utilizando la API `fetch`, las aplicaciones web pueden acceder al contenido asociado con una URL; sin embargo, la función `fetch` no devuelve directamente los resultados de la operación, en su lugar devuelve un objeto `Promise`. La conexión entre la respuesta de `fetch` y la solicitud original se restablece adjuntando un _callback_ a ese objeto `Promise`. La función callback puede inspeccionar la respuesta y recopilar los datos (si están disponibles, por supuesto).

En muchos casos, las aplicaciones en C/C++ (y muchos otros lenguajes) originalmente se escriben para trabajar con una API _sincrónica_. Por ejemplo, la función Posix `read` no completa su ejecución hasta que la operación de E/S ha terminado: la función `read` *bloquea* hasta que la lectura termina.

Sin embargo, no está permitido bloquear el hilo principal del navegador; y muchos entornos no admiten la programación sincrónica. Esto genera un desajuste entre los deseos del programador de aplicaciones de usar una API simple y el ecosistema más amplio, que requiere que las operaciones de entrada/salida (I/O) se realicen utilizando código asíncrono. Esto es especialmente problemático para aplicaciones heredadas existentes, cuya migración puede resultar costosa.

JSPI es una API que cierra la brecha entre las aplicaciones sincrónicas y las APIs web asíncronas. Funciona interceptando los objetos `Promise` devueltos por las funciones de las APIs web asíncronas y _suspendiendo_ la aplicación WebAssembly. Cuando la operación de E/S asíncrona completa, se _reanuda_ la aplicación WebAssembly. Esto permite que la aplicación WebAssembly utilice código lineal para realizar operaciones asíncronas y procesar sus resultados.

De manera crucial, usar JSPI requiere muy pocos cambios en la propia aplicación WebAssembly.

### ¿Cómo funciona JSPI?

JSPI funciona interceptando el objeto `Promise` devuelto por las llamadas a JavaScript y suspendiendo la lógica principal de la aplicación WebAssembly. Un callback se adjunta a este objeto `Promise`, el cual reanuda el código WebAssembly suspendido cuando es invocado por el bucle de eventos del navegador.

Además, la exportación de WebAssembly se reforma para devolver un objeto `Promise` &mdash; en lugar del valor original devuelto por la exportación. Este objeto `Promise` se convierte en el valor devuelto por la aplicación WebAssembly: cuando el código WebAssembly se suspende,[^first] el objeto `Promise` de exportación se devuelve como el valor de la llamada a WebAssembly.

[^first]: Si la aplicación WebAssembly se suspende más de una vez, las suspensiones posteriores regresarán al bucle de eventos del navegador y no serán directamente visibles para la aplicación web.

El Promise de exportación se resuelve cuando la llamada original se completa: si la función original de WebAssembly devuelve un valor normal, el objeto `Promise` de exportación se resuelve con ese valor (convertido a un objeto JavaScript); si se lanza una excepción, entonces el objeto `Promise` de exportación se rechaza.

#### Envolviendo importaciones y exportaciones

Esto se habilita _envolviendo_ las importaciones y exportaciones durante la fase de instanciación del módulo WebAssembly. Las funciones envolventes añaden el comportamiento de suspensión a las importaciones normales asíncronas y enrutan las suspensiones hacia los callbacks de los objetos `Promise`.

No es necesario envolver todas las exportaciones e importaciones de un módulo WebAssembly. Algunas exportaciones cuyos caminos de ejecución no impliquen llamar APIs asíncronas es mejor dejarlas sin envolver. De manera similar, no todas las importaciones de un módulo WebAssembly corresponden a funciones de APIs asíncronas; esas importaciones tampoco deberían ser envueltas.

Por supuesto, hay una cantidad significativa de mecanismos internos que permiten que esto suceda;[^1] pero ni el lenguaje JavaScript ni WebAssembly en sí mismo se cambian por el JSPI. Sus operaciones están confinadas al límite entre JavaScript y WebAssembly.

Desde la perspectiva de un desarrollador de aplicaciones web, el resultado es un conjunto de código que participa en el mundo JavaScript de funciones async y Promises de manera análoga a otras funciones async escritas en JavaScript. Desde la perspectiva del desarrollador de WebAssembly, esto les permite crear aplicaciones utilizando APIs sincrónicas y, a la vez, participar en el ecosistema asíncrono de la web.

### Rendimiento esperado

Dado que los mecanismos utilizados al suspender y reanudar los módulos de WebAssembly son esencialmente de tiempo constante, no anticipamos altos costos al usar JSPI &mdash; especialmente en comparación con otros métodos basados en transformaciones.

Hay una cantidad constante de trabajo necesaria para propagar el objeto `Promise` devuelto por la llamada a la API asíncrona al WebAssembly. De manera similar, cuando se resuelve una Promise, la aplicación de WebAssembly puede reanudarse con un sobrecoste de tiempo constante.

Sin embargo, al igual que con otras APIs basadas en Promises en el navegador, cada vez que la aplicación de WebAssembly se suspende, no será 'reactivada' nuevamente excepto por el ejecutor de tareas del navegador. Esto requiere que la ejecución del código JavaScript que inició la computación de WebAssembly retorne al navegador.

### ¿Puedo usar JSPI para suspender programas en JavaScript?

JavaScript ya tiene un mecanismo bien desarrollado para representar cálculos asíncronos: el objeto `Promise` y la notación de función `async`. El JSPI está diseñado para integrarse bien con esto pero no para reemplazarlo.

### ¿Cómo puedo usar JSPI hoy?

El JSPI está actualmente siendo estandarizado por el Grupo de Trabajo de WebAssembly de W3C. A partir de este escrito, está en la fase 3 del proceso de estándares y anticipamos una estandarización completa antes de finales de 2024.

JSPI está disponible para Chrome en Linux, MacOS, Windows y ChromeOS, en plataformas Intel y Arm, tanto de 64 bits como de 32 bits.[^firefox]

[^firefox]: JSPI también está disponible en Firefox nightly: active "`javascript.options.wasm_js_promise_integration`" en el panel about:config &mdash; y reinicie.

JSPI puede usarse de dos formas hoy en día: a través de un [origin trial](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889) y localmente mediante una bandera de Chrome. Para probarla localmente, vaya a `chrome://flags` en Chrome, busque “Experimental WebAssembly JavaScript Promise Integration (JSPI)” y marque la casilla. Reinicie como se recomienda para que tenga efecto.

Debe usar al menos la versión `126.0.6478.26` para obtener la versión más reciente de la API. Recomendamos usar el canal Dev para garantizar que se apliquen actualizaciones de estabilidad. Además, si desea usar Emscripten para generar WebAssembly (lo que recomendamos), debe usar una versión que sea al menos `3.1.61`.

Una vez habilitado, debería ser capaz de ejecutar scripts que utilicen JSPI. A continuación mostramos cómo puede usar Emscripten para generar un módulo de WebAssembly en C/C++ que utiliza JSPI. Si su aplicación implica un lenguaje diferente, por ejemplo, no usa Emscripten, entonces sugerimos que examine cómo funciona la API, consulte la [propuesta](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md).

#### Limitaciones

La implementación de JSPI en Chrome ya soporta casos de uso típicos. Sin embargo, todavía se considera experimental, por lo que hay algunas limitaciones que se deben tener en cuenta:

- Requiere el uso de una bandera en la línea de comandos o la participación en el ensayo de origen.
- Cada llamada a una exportación de JSPI se ejecuta en una pila de tamaño fijo.
- El soporte de depuración es algo mínimo. En particular, puede ser difícil ver los diferentes eventos que ocurren en el panel de herramientas para desarrolladores. Proporcionar un soporte más rico para depurar aplicaciones JSPI está en la hoja de ruta.

## Una pequeña demostración

Para ver todo esto funcionando, probemos un ejemplo simple. Este programa en C calcula Fibonacci de una manera espectacularmente mala: pidiendo a JavaScript que haga la suma, aún peor al usar objetos `Promise` de JavaScript para hacerlo:[^2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// prometer una suma
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

La función `promiseFib` en sí misma es una versión recursiva directa de la función de Fibonacci. La parte intrigante (desde nuestro punto de vista) es la definición de `promiseAdd`, que realiza la suma de las dos mitades de Fibonacci — ¡usando JSPI!

Usamos la macro `EM_ASYNC_JS` de Emscripten para escribir la función `promiseFib` como una función de JavaScript dentro del cuerpo de nuestro programa en C. Dado que la suma normalmente no implica Promises en JavaScript, tenemos que forzarla construyendo un `Promise`.

La macro `EM_ASYNC_JS` genera todo el código necesario para que podamos usar JSPI y acceder al resultado del Promise como si fuera una función normal.

Para compilar nuestra pequeña demostración, usamos el compilador `emcc` de Emscripten:[^4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

Esto compila nuestro programa, creando un archivo HTML cargable (`b.html`). La opción de línea de comandos más especial aquí es `-s JSPI`. Esto invoca la opción para generar código que utiliza JSPI para interactuar con las importaciones de JavaScript que devuelven Promises.

Si carga el archivo `b.html` generado en Chrome, debería ver un resultado aproximado a:

```
fib(0) 0μs 0μs 0μs
fib(1) 0μs 0μs 0μs
fib(2) 0μs 0μs 3μs
fib(3) 0μs 0μs 4μs
…
fib(15) 0μs 13μs 1225μs
```

Esta es simplemente una lista de los primeros 15 números de Fibonacci seguida por el tiempo promedio en microsegundos que tomó calcular un único número de Fibonacci. Los tres valores de tiempo en cada línea se refieren al tiempo tomado para un cálculo puro en WebAssembly, para un cálculo mixto de JavaScript/WebAssembly y el tercer número da el tiempo para una versión que suspende el cálculo.

Nota que `fib(2)` es el cálculo más pequeño que involucra acceder a una Promesa, y, para cuando se calcula `fib(15)`, se han realizado aproximadamente 1000 llamadas a `promiseAdd`. Esto sugiere que el costo real de una función con JSPI es aproximadamente 1μs — significativamente más alto que sumar dos enteros pero mucho menor que los milisegundos típicamente requeridos para acceder a una función de entrada/salida externa.

## Usar JSPI para cargar código de manera diferida

En este próximo ejemplo vamos a observar lo que puede ser un uso algo sorprendente de JSPI: cargar código de manera dinámica. La idea es `fetch` un módulo que contiene código necesario, pero retrasarlo hasta que la función necesaria sea llamada por primera vez.

Necesitamos usar JSPI porque las APIs como `fetch` son inherentemente asíncronas en naturaleza, pero queremos poder invocarlas desde lugares arbitrarios en nuestra aplicación—en particular, desde la mitad de una llamada a una función que aún no existe.

La idea principal es reemplazar una función cargada dinámicamente por un stub; este stub primero carga el código de la función faltante, se reemplaza por el código cargado y luego llama al código recién cargado con los argumentos originales. Cualquier llamada subsiguiente a la función va directamente a la función cargada. Esta estrategia permite un enfoque esencialmente transparente para cargar código de manera dinámica.

El módulo que vamos a cargar es bastante simple, contiene una función que devuelve `42`:

```c
// Este es un proveedor simple de cuarenta y dos
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

que está en un archivo llamado `p42.c`, y se compila usando Emscripten sin construir ningún 'extra':

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

El prefijo `EMSCRIPTEN_KEEPALIVE` es un macro de Emscripten que asegura que la función `provide42` no sea eliminada aunque no se use dentro del código. Esto da como resultado un módulo de WebAssembly que contiene la función que queremos cargar dinámicamente.

La bandera `-Wl,--import-memory` que añadimos a la compilación de `p42.c` es para asegurar que tenga acceso a la misma memoria que tiene el módulo principal.[^3]

Para cargar código de manera dinámica, usamos la API estándar `WebAssembly.instantiateStreaming`:

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

Esta expresión usa `fetch` para localizar el módulo Wasm compilado, `WebAssembly.instantiateStreaming` para compilar el resultado de la llamada fetch y para crear un módulo instanciado a partir de él. Tanto `fetch` como `WebAssembly.instantiateStreaming` retornan Promesas; por ello no podemos simplemente acceder al resultado y extraer nuestra función necesaria. En cambio, envolvemos esto en una importación estilo JSPI usando el macro `EM_ASYNC_JS`:

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('cargando promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

Observa la llamada `console.log`, la usaremos para asegurarnos de que nuestra lógica es correcta.

El `addFunction` es parte de la API de Emscripten, pero para asegurarnos de que esté disponible para nosotros en tiempo de ejecución, debemos informar a `emcc` que es una dependencia requerida. Lo hacemos en la siguiente línea:

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

En una situación donde queremos cargar código de manera dinámica, nos gustaría asegurarnos de que no cargamos código innecesariamente; en este caso, nos gustaría asegurarnos de que llamadas subsiguientes a `provide42` no desencadenen recargas. C tiene una característica simple que podemos usar para esto: no llamamos a `provide42` directamente, sino que lo hacemos a través de un trampolín que hará que la función sea cargada, y luego, justo antes de invocar realmente la función, cambia el trampolín para que se omita a sí mismo. Podemos hacer esto usando un puntero de función apropiado:

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

Desde la perspectiva del resto del programa, la función que queremos llamar se llama `get42`. Su implementación inicial es a través de `stub`, que llama a `resolveFun` para cargar realmente la función. Después de la carga exitosa, cambiamos get42 para que apunte a la función recién cargada – y la llamamos.

Nuestra función principal llama a `get42` dos veces:[^6]

```c
int main() {
  printf("primera llamada p42() = %ld\n", get42());
  printf("segunda llamada = %ld\n", get42());
}
```

El resultado de ejecutar esto en el navegador es un registro que se ve como:

```
cargando promesa42
primera llamada p42() = 42
segunda llamada = 42
```

Nota que la línea `cargando promesa42` aparece solo una vez, mientras que `get42` se llama realmente dos veces.

Este ejemplo demuestra que JSPI se puede usar de maneras inesperadas: cargar código dinámicamente parece estar lejos de crear promesas. Además, existen otras formas de vincular dinámicamente módulos de WebAssembly entre sí; esto no pretende representar la solución definitiva a ese problema.

¡Definitivamente esperamos ver lo que puedes hacer con esta nueva capacidad! Únete a la discusión en el Grupo Comunitario de WebAssembly de la W3C [repo](https://github.com/WebAssembly/js-promise-integration).

## Apéndice A: Listado completo de `badfib`


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define microSeconds (1000000)

long add(long x, long y) {
  return x + y;
}

// Pedirle a JS que realice la suma
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// prometer una suma
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * microSeconds;
    double jsTime = (runTest(runJs, ix, count) / count) * microSeconds;
    double promiseTime = (runTest(runPromise, ix, count) / count) * microSeconds;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## Apéndice B: Listado de `u42.c` y `p42.c`

El código C de `u42.c` representa la parte principal de nuestro ejemplo de carga dinámica:

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// prometer una función
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('cargando promesa42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("primera llamada p42() = %ld\n", get42());
  printf("segunda llamada = %ld\n", get42());
}
```

El código `p42.c` es el módulo cargado dinámicamente.

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- Las notas al pie mismas al final. -->
## Notas

[^1]: Para los técnicamente curiosos, consulta [la propuesta de WebAssembly para JSPI](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) y [el portafolio de diseño de cambio de pila de V8](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y).

[^2]: Nota: incluimos el programa completo a continuación, en el Apéndice A.

[^3]: No necesitamos esta bandera para nuestro ejemplo específico, pero probablemente la necesitarías para algo más grande.

[^4]: Nota: necesitas una versión de Emscripten que sea ≥ 3.1.61.

[^6]: El programa completo se muestra en el Apéndice B.
