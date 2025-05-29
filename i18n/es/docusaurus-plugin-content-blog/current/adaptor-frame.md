---
title: 'Llamadas más rápidas en JavaScript'
author: '[Victor Gomes](https://twitter.com/VictorBFG), el destructor de marcos'
avatars:
  - 'victor-gomes'
date: 2021-02-15
tags:
  - internals
description: 'Llamadas más rápidas en JavaScript eliminando el marco adaptador de argumentos'
tweet: '1361337569057865735'
---

JavaScript permite llamar a una función con un número de argumentos diferente al número esperado de parámetros; es decir, se pueden pasar menos o más argumentos de los parámetros formales declarados. El primer caso se llama subaplicación y el segundo se llama sobreaplicación.

<!--truncate-->
En el caso de subaplicación, los parámetros restantes se asignan al valor undefined. En el caso de sobreaplicación, los argumentos restantes pueden ser accedidos utilizando el parámetro rest y la propiedad `arguments`, o simplemente son superfluos y pueden ser ignorados. Muchos frameworks Web/Node.js hoy en día utilizan esta característica de JS para aceptar parámetros opcionales y crear una API más flexible.

Hasta hace poco, V8 tenía una maquinaria especial para lidiar con desajustes en el tamaño de los argumentos: el marco adaptador de argumentos. Desafortunadamente, la adaptación de argumentos tiene un costo de rendimiento, pero es comúnmente necesaria en frameworks modernos de front-end y middleware. Resulta que, con un truco ingenioso, podemos eliminar este marco adicional, simplificar la base de código de V8 y deshacernos de casi toda la sobrecarga.

Podemos calcular el impacto en el rendimiento de eliminar el marco adaptador de argumentos a través de un micro-benchmark.

```js
console.time();
function f(x, y, z) {}
for (let i = 0; i <  N; i++) {
  f(1, 2, 3, 4, 5);
}
console.timeEnd();
```

![Impacto en el rendimiento de eliminar el marco adaptador de argumentos, medido a través de un micro-benchmark.](/_img/v8-release-89/perf.svg)

El gráfico muestra que ya no hay sobrecarga cuando se ejecuta en [modo sin JIT](https://v8.dev/blog/jitless) (Ignition) con una mejora del rendimiento del 11,2%. Al utilizar [TurboFan](https://v8.dev/docs/turbofan), logramos hasta un 40% de aumento de velocidad.

Este microbenchmark fue diseñado naturalmente para maximizar el impacto del marco adaptador de argumentos. Sin embargo, hemos observado una mejora considerable en muchos benchmarks, como en [nuestro benchmark interno JSTests/Array](https://chromium.googlesource.com/v8/v8/+/b7aa85fe00c521a704ca83cc8789354e86482a60/test/js-perf-test/JSTests.json) (7%) y en [Octane2](https://github.com/chromium/octane) (4,6% en Richards y 6,1% en EarleyBoyer).

## TL;DR: Invertir los argumentos

El objetivo principal de este proyecto fue eliminar el marco adaptador de argumentos, que ofrece una interfaz consistente al callee al acceder a sus argumentos en la pila. Para lograrlo, necesitamos invertir los argumentos en la pila y añadir un nuevo espacio en el marco del callee que contenga el conteo real de argumentos. La figura a continuación muestra el ejemplo de un marco típico antes y después del cambio.

![Un marco de pila de JavaScript típico antes y después de eliminar el marco adaptador de argumentos.](/_img/adaptor-frame/frame-diff.svg)

## Haciendo las llamadas de JavaScript más rápidas

Para comprender qué hemos hecho para hacer las llamadas más rápidas, veamos cómo V8 realiza una llamada y cómo funciona el marco adaptador de argumentos.

¿Qué sucede dentro de V8 cuando invocamos una llamada de función en JS? Supongamos el siguiente script de JS:

```js
function add42(x) {
  return x + 42;
}
add42(3);
```

![Flujo de ejecución dentro de V8 durante una llamada de función.](/_img/adaptor-frame/flow.svg)

## Ignition

V8 es una VM de múltiples niveles. Su primer nivel se llama [Ignition](https://v8.dev/docs/ignition), es una máquina de pila de bytecode con un registro acumulador. V8 comienza compilando el código en [bytecodes de Ignition](https://medium.com/dailyjs/understanding-v8s-bytecode-317d46c94775). La llamada anterior se compila de la siguiente manera:

```
0d              LdaUndefined              ;; Cargar undefined en el acumulador
26 f9           Star r2                   ;; Almacenar en el registro r2
13 01 00        LdaGlobal [1]             ;; Cargar global señalado por const 1 (add42)
26 fa           Star r1                   ;; Almacenar en el registro r1
0c 03           LdaSmi [3]                ;; Cargar entero pequeño 3 en el acumulador
26 f8           Star r3                   ;; Almacenar en el registro r3
5f fa f9 02     CallNoFeedback r1, r2-r3  ;; Invocar llamada
```

El primer argumento de una llamada generalmente se refiere como el receptor. El receptor es el objeto `this` dentro de una JSFunction, y cada llamada a una función JS debe tener uno. El manejador de bytecode de `CallNoFeedback` necesita llamar al objeto `r1` con los argumentos en la lista de registros `r2-r3`.

Antes de adentrarnos en el manejador de bytecode, nota cómo se codifican los registros en el bytecode. Son enteros negativos de un solo byte: `r1` se codifica como `fa`, `r2` como `f9` y `r3` como `f8`. Podemos referirnos a cualquier registro ri como `fb - i`, de hecho, como veremos, la codificación correcta es `- 2 - kFixedFrameHeaderSize - i`. Las listas de registros se codifican utilizando el primer registro y el tamaño de la lista, entonces `r2-r3` es `f9 02`.

En Ignition hay muchos manejadores de llamadas para bytecode. Puedes ver una lista de ellos [aquí](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/bytecodes.h;drc=3965dcd5cb1141c90f32706ac7c965dc5c1c55b3;l=184). Varían ligeramente entre sí. Hay bytecodes optimizados para llamadas con un receptor `undefined`, para llamadas a propiedades, para llamadas con un número fijo de parámetros o para llamadas genéricas. Aquí analizamos `CallNoFeedback`, que es una llamada genérica en la que no acumulamos retroalimentación de la ejecución.

El manejador de este bytecode es bastante simple. Está escrito en [`CodeStubAssembler`](https://v8.dev/docs/csa-builtins), puedes consultarlo [aquí](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/interpreter-generator.cc;drc=6cdb24a4ce9d4151035c1f133833137d2e2881d1;l=1467). Esencialmente, realiza una tailcall a una función básica dependiente de la arquitectura [`InterpreterPushArgsThenCall`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1277).

La función básica esencialmente extrae la dirección de retorno a un registro temporal, empuja todos los argumentos (incluido el receptor) y vuelve a empujar la dirección de retorno. En este punto, no sabemos si el callee es un objeto callable ni cuántos argumentos espera el callee, es decir, su número formal de parámetros.

![Estado del marco después de la ejecución de la función básica `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/normal-push.svg)

Eventualmente, la ejecución realiza una tailcall a la función básica [`Call`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2256). Allí, verifica si el objetivo es una función adecuada, un constructor o cualquier objeto callable. También lee la estructura `shared function info` para obtener su número formal de parámetros.

Si el callee es un objeto función, realiza una tailcall a la función básica [`CallFunction`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2038), donde se realizan varias verificaciones, incluida si tenemos un objeto `undefined` como receptor. Si tenemos un objeto `undefined` o `null` como receptor, deberíamos modificarlo para que se refiera al objeto proxy global, según la [especificación ECMA](https://262.ecma-international.org/11.0/#sec-ordinarycallbindthis).

Luego, la ejecución realiza una tailcall a la función básica [`InvokeFunctionCode`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/codegen/x64/macro-assembler-x64.cc;drc=a723767935dec385818d1134ea729a4c3a3ddcfb;l=2781), que en ausencia de una discrepancia de argumentos simplemente llama a lo que sea que esté señalado por el campo `Code` en el objeto callee. Esto podría ser una función optimizada o la función básica [`InterpreterEntryTrampoline`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1037).

Si asumimos que estamos llamando a una función que aún no ha sido optimizada, el trampolín de Ignition configurará un `IntepreterFrame`. Puedes ver un resumen breve de los tipos de marcos en V8 [aquí](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/execution/frame-constants.h;drc=574ac5d62686c3de8d782dc798337ce1355dc066;l=14).

Sin entrar en demasiados detalles sobre lo que sucede a continuación, podemos ver un snapshot del marco del intérprete durante la ejecución del callee.

![El `InterpreterFrame` para la llamada `add42(3)`.](/_img/adaptor-frame/normal-frame.svg)

Vemos que tenemos un número fijo de slots en el marco: la dirección de retorno, el puntero de marco anterior, el contexto, el objeto función actual que estamos ejecutando, la matriz de bytecode de esta función y el desplazamiento del bytecode actual que estamos ejecutando. Finalmente, tenemos una lista de registros dedicados a esta función (puedes pensarlos como variables locales de función). La función `add42` no tiene realmente ningún registro, pero el llamador tiene un marco similar con 3 registros.

Como se esperaba, `add42` es una función sencilla:

```
25 02             Ldar a0          ;; Carga el primer argumento en el acumulador
40 2a 00          AddSmi [42]      ;; Le suma 42
ab                Return           ;; Devuelve el acumulador
```

Nota cómo codificamos el argumento en el bytecode `Ldar` _(Load Accumulator Register)_: el argumento `1` (`a0`) está codificado con el número `02`. De hecho, la codificación de cualquier argumento es simplemente `[ai] = 2 + parameter_count - i - 1` y el receptor `[this] = 2 + parameter_count`, o en este ejemplo `[this] = 3`. El número de parámetros aquí no incluye el receptor.

Ahora podemos entender por qué codificamos los registros y argumentos de esta manera. Simplemente denotan un desplazamiento desde el puntero del marco. Luego podemos tratar la carga y el almacenamiento de argumentos/registros de la misma manera. El desplazamiento del último argumento desde el puntero del marco es `2` (puntero del marco anterior y la dirección de retorno). Eso explica el `2` en la codificación. La parte fija del marco del intérprete es de `6` espacios (`4` desde el puntero del marco), por lo que el registro cero está ubicado en el desplazamiento `-5`, es decir, `fb`, el registro `1` en `fa`. ¿Ingenioso, verdad?

Sin embargo, tenga en cuenta que para poder acceder a los argumentos, la función debe saber cuántos argumentos hay en la pila. ¡El índice `2` apunta al último argumento independientemente de cuántos argumentos haya!

El manejador de bytecode de `Return` finalizará llamando al incorporado `LeaveInterpreterFrame`. Este incorporado esencialmente lee el objeto de función para obtener el recuento de parámetros del marco, elimina el marco actual, recupera el puntero del marco, guarda la dirección de retorno en un registro temporal, elimina los argumentos según el recuento de parámetros y salta a la dirección en los registros temporales.

¡Todo este flujo es excelente! Pero, ¿qué sucede cuando llamamos a una función con menos o más argumentos que su recuento de parámetros? El acceso ingenioso a argumentos/registros fallará, ¿y cómo limpiamos los argumentos al final de la llamada?

## Marco adaptador de argumentos

Ahora llamemos a `add42` con menos y más argumentos:

```js
add42();
add42(1, 2, 3);
```

Los desarrolladores de JS entre nosotros sabrán que en el primer caso, `x` se asignará como `undefined` y la función devolverá `undefined + 42 = NaN`. En el segundo caso, `x` se asignará como `1` y la función devolverá `43`, los argumentos restantes serán ignorados. Tenga en cuenta que el llamador no sabe si eso sucederá. Incluso si el llamador verifica el recuento de parámetros, el receptor puede usar el parámetro restante o el objeto de argumentos para acceder a todos los demás argumentos. De hecho, el objeto de argumentos incluso puede ser accesible fuera de `add42` en modo negligente.

Si seguimos los mismos pasos que antes, primero llamaremos al incorporado `InterpreterPushArgsThenCall`. Este empujará los argumentos a la pila de esta forma:

![Estado de los marcos después de la ejecución del incorporado `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/adaptor-push.svg)

Continuando con el mismo procedimiento que antes, verificamos si el receptor es un objeto de función, obtenemos su recuento de parámetros y ajustamos el receptor al proxy global. Eventualmente llegamos a `InvokeFunctionCode`.

Aquí, en lugar de saltar al `Code` en el objeto receptor, verificamos que tenemos una discrepancia entre el tamaño de los argumentos y el recuento de parámetros y saltamos a `ArgumentsAdaptorTrampoline`.

En este incorporado, construimos un marco adicional, el famoso marco adaptador de argumentos. En lugar de explicar lo que sucede dentro del incorporado, presentaré el estado del marco antes de que el incorporado llame al `Code` del receptor. Tenga en cuenta que esto es una llamada propiamente de tipo `x64 call` (no un `jmp`) y después de la ejecución del receptor, regresaremos al `ArgumentsAdaptorTrampoline`. Esto contrasta con `InvokeFunctionCode`, que realiza llamadas finales.

![Marcos de pila con adaptación de argumentos.](/_img/adaptor-frame/adaptor-frames.svg)

Puede observar que creamos otro marco que copia todos los argumentos necesarios para tener precisamente el recuento de parámetros de argumentos en la parte superior del marco del receptor. Esto crea una interfaz para la función receptora, de manera que esta última no necesita saber el número de argumentos. El receptor siempre podrá acceder a sus parámetros con el mismo cálculo que antes, es decir, `[ai] = 2 + parameter_count - i - 1`.

V8 tiene incorporados especiales que comprenden el marco adaptador siempre que necesiten acceder a los argumentos restantes a través del parámetro restante o el objeto de argumentos. Siempre necesitarán verificar el tipo de marco adaptador en la parte superior del marco del receptor y actuar en consecuencia.

Como puede ver, solucionamos el problema de acceso a argumentos/registros, pero creamos mucha complejidad. Cada incorporado que necesita acceder a todos los argumentos deberá comprender y verificar la existencia del marco adaptador. Además, debemos tener cuidado de no acceder a datos caducados y antiguos. Considere los siguientes cambios en `add42`:

```js
function add42(x) {
  x += 42;
  return x;
}
```

El arreglo de bytecode ahora es:

```
25 02             Ldar a0       ;; Cargar el primer argumento al acumulador
40 2a 00          AddSmi [42]   ;; Sumar 42 a este
26 02             Star a0       ;; Almacenar el acumulador en la primera ranura de argumento
ab                Return        ;; Devolver el acumulador
```

Como puede observar, ahora modificamos `a0`. Entonces, en el caso de una llamada `add42(1, 2, 3)`, la ranura en el marco adaptador de argumentos será modificada, pero el marco del llamador aún contendrá el número `1`. Debemos tener cuidado de que el objeto de argumentos acceda al valor modificado en lugar del antiguo.

Regresar de la función es sencillo, aunque lento. ¿Recuerda lo que hace `LeaveInterpreterFrame`? Básicamente elimina el marco del receptor y los argumentos hasta el número de recuento de parámetros. Entonces, cuando regresamos al stub del marco adaptador de argumentos, la pila luce así:

![Estado de los marcos después de la ejecución del receptor `add42`.](/_img/adaptor-frame/adaptor-frames-cleanup.svg)

Solo necesitamos sacar el número de argumentos, sacar el marco del adaptador, sacar todos los argumentos según el conteo real de argumentos y regresar a la ejecución del llamador.

En resumen: la maquinaria del adaptador de argumentos no solo es compleja, sino costosa.

## Eliminando el marco del adaptador de argumentos

¿Podemos hacerlo mejor? ¿Podemos eliminar el marco del adaptador? Resulta que sí podemos.

Revisemos nuestros requisitos:

1. Necesitamos poder acceder a los argumentos y registros sin dificultad como antes. No se pueden realizar verificaciones al acceder a ellos. Eso sería demasiado caro.
2. Necesitamos poder construir el parámetro rest y el objeto arguments desde la pila.
3. Necesitamos poder limpiar fácilmente un número desconocido de argumentos al regresar de una llamada.
4. Y, por supuesto, queremos hacerlo sin un marco extra.

Si queremos eliminar el marco extra, entonces debemos decidir dónde colocar los argumentos: en el marco del callee o en el marco del caller.

### Argumentos en el marco del callee

Supongamos que colocamos los argumentos en el marco del callee. Esto en realidad parece una buena idea, ya que cada vez que sacamos el marco, también sacamos todos los argumentos de una vez.

Los argumentos tendrían que estar ubicados en algún lugar entre el puntero del marco guardado y el final del marco. Esto implica que el tamaño del marco no será conocido de manera estática. Acceder a un argumento aún sería fácil, es un simple desplazamiento desde el puntero de marco. Pero ahora acceder a un registro es mucho más complicado, ya que varía según el número de argumentos.

El puntero de la pila siempre apunta al último registro, podríamos usarlo para acceder a los registros sin conocer el conteo de argumentos. Este enfoque podría funcionar, pero tiene un inconveniente importante. Implicaría duplicar todos los bytecodes que pueden acceder a registros y argumentos. Necesitaríamos un `LdaArgument` y un `LdaRegister` en lugar de simplemente `Ldar`. Por supuesto, también podríamos comprobar si estamos accediendo a un argumento o un registro (desplazamientos positivos o negativos), pero eso requeriría una verificación en cada acceso de argumento y registro. ¡Claramente muy caro!

### Argumentos en el marco del caller

Bien… ¿y si nos quedamos con los argumentos en el marco del caller?

Recuerda cómo calcular el desplazamiento del argumento `i` en un marco: `[ai] = 2 + parameter_count - i - 1`. Si tenemos todos los argumentos (no solo los parámetros), el desplazamiento será `[ai] = 2 + argument_count - i - 1`. Es decir, para cada acceso de argumento, necesitaríamos cargar el conteo real de argumentos.

Pero, ¿qué sucede si invertimos los argumentos? Ahora el desplazamiento se puede calcular simplemente como `[ai] = 2 + i`. No necesitamos saber cuántos argumentos hay en la pila, pero si podemos garantizar que siempre tendremos al menos la cantidad de parámetros de argumentos en la pila, entonces siempre podemos usar este esquema para calcular el desplazamiento.

En otras palabras, el número de argumentos empujados en la pila siempre será el máximo entre el número de argumentos y la cantidad formal de parámetros, y se rellenará con objetos undefined si es necesario.

¡Esto tiene otro beneficio adicional! El receptor siempre se encuentra en el mismo desplazamiento para cualquier función JS, justo encima de la dirección de retorno: `[this] = 2`.

Esta es una solución limpia para nuestro requisito número `1` y número `4`. ¿Qué hay de los otros dos requisitos? ¿Cómo podemos construir el parámetro rest y el objeto arguments? ¿Y cómo limpiar los argumentos en la pila al regresar al caller? Para eso solo nos falta el conteo de argumentos. Necesitamos guardarlo en algún lugar. La elección aquí es un poco arbitraria, siempre y cuando sea fácil acceder a esta información. Dos opciones básicas son: empujarlo justo después del receptor en el marco del caller o como parte del marco del callee en la parte fija del encabezado. Implementamos la última opción, ya que agrupa la parte fija del encabezado de los marcos de Interpreter y Optimized.

Si ejecutamos nuestro ejemplo en V8 v8.9 veremos la siguiente pila después de `InterpreterArgsThenPush` (nota que los argumentos ahora están invertidos):

![Estado de los marcos después de la ejecución del built-in `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/no-adaptor-push.svg)

Toda la ejecución sigue un camino similar hasta que llegamos a InvokeFunctionCode. Aquí moldeamos los argumentos en caso de sub-aplicación, empujando tantos objetos undefined como sea necesario. Nota que no cambiamos nada en caso de sobre-aplicación. Finalmente pasamos el número de argumentos al `Code` del callee a través de un registro. En el caso de `x64`, usamos el registro `rax`.

Si el callee aún no ha sido optimizado, llegamos a `InterpreterEntryTrampoline`, que construye el siguiente marco de pila.

![Marcos de pila sin adaptadores de argumentos.](/_img/adaptor-frame/no-adaptor-frames.svg)

El marco del callee tiene un espacio extra que contiene el número de argumentos que se pueden usar para construir el parámetro rest o el objeto arguments, y para limpiar los argumentos en la pila antes de regresar al caller.

Para regresar, modificamos `LeaveInterpreterFrame` para leer la cantidad de argumentos en la pila y sacar el número máximo entre la cantidad de argumentos y la cantidad de parámetros formales.

## TurboFan

¿Qué pasa con el código optimizado? Cambiemos ligeramente nuestro script inicial para forzar a V8 a compilarlo con TurboFan:

```js
function add42(x) { return x + 42; }
function callAdd42() { add42(3); }
%PrepareFunctionForOptimization(callAdd42);
callAdd42();
%OptimizeFunctionOnNextCall(callAdd42);
callAdd42();
```

Aquí usamos intrínsecos de V8 para forzar a V8 a optimizar la llamada; de otro modo, V8 solo optimizaría nuestra pequeña función si se vuelve muy utilizada. La llamamos una vez antes de la optimización para recopilar cierta información de tipos que puede ser utilizada para guiar la compilación. Lee más sobre TurboFan [aquí](https://v8.dev/docs/turbofan).

Solo te mostraré aquí la parte del código generado que es relevante para nosotros.

```nasm
movq rdi,0x1a8e082126ad    ;; Cargar el objeto de la función <JSFunction add42>
push 0x6                   ;; Empujar SMI 3 como argumento
movq rcx,0x1a8e082030d1    ;; <Objeto Global de JS>
push rcx                   ;; Empujar receptor (el objeto proxy global)
movl rax,0x1               ;; Guardar la cantidad de argumentos en rax
movl rcx,[rdi+0x17]        ;; Cargar el campo {Code} del objeto función en rcx
call rcx                   ;; Finalmente, llamar el objeto de código!
```

Aunque está escrito en ensamblador, este fragmento de código no debería ser difícil de leer si sigues mis comentarios. Esencialmente, al compilar la llamada, TF necesita realizar todo el trabajo que se hizo en los built-ins `InterpreterPushArgsThenCall`, `Call`, `CallFunction` e `InvokeFunctionCall`. Con suerte, tiene más información estática para hacer eso y emitir menos instrucciones computacionales.

### TurboFan con el marco adaptador de argumentos

Ahora, veamos el caso de una cantidad desajustada de argumentos y parámetros formales. Considera la llamada `add42(1, 2, 3)`. Esto se compila como:

```nasm
movq rdi,0x4250820fff1    ;; Cargar el objeto de la función <JSFunction add42>
;; Empujar receptor y argumentos SMIs 1, 2 y 3
movq rcx,0x42508080dd5    ;; <Objeto Global de JS>
push rcx
push 0x2
push 0x4
push 0x6
movl rax,0x3              ;; Guardar la cantidad de argumentos en rax
movl rbx,0x1              ;; Guardar la cantidad de parámetros formales en rbx
movq r10,0x564ed7fdf840   ;; <ArgumentsAdaptorTrampoline>
call r10                  ;; Llamar a ArgumentsAdaptorTrampoline
```

Como puedes ver, no es difícil agregar soporte a TF para el desajuste de cantidad de argumentos y parámetros. ¡Simplemente llama al trampolín adaptador de argumentos!

Sin embargo, esto es costoso. Para cada llamada optimizada, ahora necesitamos entrar en el trampolín adaptador de argumentos y modificar el marco como en el código no optimizado. Eso explica por qué la ganancia de rendimiento de eliminar el marco adaptador en código optimizado es mucho mayor que en Ignition.

Sin embargo, el código generado es muy simple. Y retornar desde él es extremadamente fácil (epílogo):

```nasm
movq rsp,rbp   ;; Limpiar el marco del llamado
pop rbp
ret 0x8        ;; Extraer un solo argumento (el receptor)
```

Sacamos nuestro marco y emitimos una instrucción de retorno según la cantidad de parámetros. Si tenemos un desajuste en la cantidad de argumentos y parámetros, el trampolín del marco adaptador lo manejará.

### TurboFan sin el marco adaptador de argumentos

El código generado es esencialmente el mismo que en una llamada con una cantidad coincidente de argumentos. Considera la llamada `add42(1, 2, 3)`. Esto genera:

```nasm
movq rdi,0x35ac082126ad    ;; Cargar el objeto de la función <JSFunction add42>
;; Empujar receptor y argumentos 1, 2 y 3 (en orden inverso)
push 0x6
push 0x4
push 0x2
movq rcx,0x35ac082030d1    ;; <Objeto Global de JS>
push rcx
movl rax,0x3               ;; Guardar la cantidad de argumentos en rax
movl rcx,[rdi+0x17]        ;; Cargar el campo {Code} del objeto función en rcx
call rcx                   ;; Finalmente, llamar al objeto de código!
```

¿Qué pasa con el epílogo de la función? Ya no regresamos al trampolín del marco adaptador, por lo que el epílogo es de hecho un poco más complejo que antes.

```nasm
movq rcx,[rbp-0x18]        ;; Cargar el conteo de argumentos (del marco del llamado) en rcx
movq rsp,rbp               ;; Sacar el marco del llamado
pop rbp
cmpq rcx,0x0               ;; Comparar la cantidad de argumentos con la cantidad de parámetros formales
jg 0x35ac000840c6  <+0x86>
;; Si la cantidad de argumentos es menor (o igual) que la cantidad de parámetros formales:
ret 0x8                    ;; Retornar como de costumbre (la cantidad de parámetros se conoce estáticamente)
;; Si tenemos más argumentos en la pila que parámetros formales:
pop r10                    ;; Guardar la dirección de retorno
leaq rsp,[rsp+rcx*8+0x8]   ;; Sacar todos los argumentos de acuerdo con rcx
push r10                   ;; Recuperar la dirección de retorno
retl
```

# Conclusión
