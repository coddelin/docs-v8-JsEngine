---
title: "Llamadas en cola WebAssembly"
author: "Thibaud Michaud, Thomas Lively"
date: 2023-04-06
tags: 
  - WebAssembly
description: "Este documento explica la propuesta de llamadas en cola de WebAssembly y la demuestra con algunos ejemplos."
tweet: "1644077795059044353"
---
¡Estamos implementando las llamadas en cola de WebAssembly en V8 v11.2! En esta publicación, ofrecemos una breve descripción de esta propuesta, demostramos un caso de uso interesante para las corrutinas en C++ con Emscripten y mostramos cómo maneja V8 las llamadas en cola internamente.

## ¿Qué es la optimización de llamadas en cola?

Una llamada se encuentra en posición de cola si es la última instrucción ejecutada antes de regresar desde la función actual. Los compiladores pueden optimizar estas llamadas descartando el marco del llamador y reemplazando la llamada con un salto.

Esto es particularmente útil para las funciones recursivas. Por ejemplo, considere esta función en C que suma los elementos de una lista enlazada:

```c
int sum(List* list, int acc) {
  if (list == nullptr) return acc;
  return sum(list->next, acc + list->val);
}
```

Con una llamada regular, esto consume un espacio de pila de 𝒪(n): cada elemento de la lista agrega un nuevo marco en la pila de llamadas. Con una lista lo suficientemente larga, esto podría desbordar rápidamente la pila. Al reemplazar la llamada con un salto, la optimización de llamadas en cola convierte efectivamente esta función recursiva en un bucle que utiliza un espacio de pila de 𝒪(1):

<!--truncate-->
```c
int sum(List* list, int acc) {
  while (list != nullptr) {
    acc = acc + list->val;
    list = list->next;
  }
  return acc;
}
```

Esta optimización es particularmente importante para los lenguajes funcionales. Estos dependen en gran medida de las funciones recursivas, y los lenguajes puros como Haskell ni siquiera proporcionan estructuras de control de bucle. Cualquier tipo de iteración personalizada utiliza típicamente la recursión de una manera u otra. Sin la optimización de llamadas en cola, esto rápidamente ocasionaría un desbordamiento de pila para cualquier programa no trivial.

### La propuesta de llamada en cola de WebAssembly

Hay dos formas de llamar a una función en el MPV de Wasm: `call` y `call_indirect`. La propuesta de llamada en cola de WebAssembly agrega sus contrapartes de llamada en cola: `return_call` y `return_call_indirect`. Esto significa que es responsabilidad de la herramienta de cadena de herramientas realizar realmente la optimización de llamadas en cola y emitir el tipo de llamada apropiado, lo que le da más control sobre el rendimiento y el uso del espacio de pila.

Vamos a analizar una función recursiva Fibonacci. El bytecode Wasm se incluye aquí en formato de texto para mayor claridad, pero puedes encontrarlo en C++ en la siguiente sección:

```wasm/4
(func $fib_rec (param $n i32) (param $a i32) (param $b i32) (result i32)
  (if (i32.eqz (local.get $n))
    (then (return (local.get $a)))
    (else
      (return_call $fib_rec
        (i32.sub (local.get $n) (i32.const 1))
        (local.get $b)
        (i32.add (local.get $a) (local.get $b))
      )
    )
  )
)

(func $fib (param $n i32) (result i32)
  (call $fib_rec (local.get $n) (i32.const 0) (i32.const 1))
)
```

En cualquier momento solo hay un marco de `fib_rec`, que se desenrolla antes de realizar la llamada recursiva siguiente. Cuando alcanzamos el caso base, `fib_rec` devuelve directamente el resultado `a` a `fib`.

Una consecuencia observable de las llamadas en cola es (además de un riesgo reducido de desbordamiento de pila) que los llamadores en cola no aparecen en los rastros de pila. Tampoco aparecen en la propiedad de pila de una excepción capturada ni en el trazo de pila de DevTools. En el momento en el que se lanza una excepción o la ejecución se pausa, los marcos de los llamadores en cola han desaparecido y no hay forma de que V8 los recupere.

## Usando las llamadas en cola con Emscripten

Los lenguajes funcionales a menudo dependen de llamadas en cola, pero también es posible usarlas como programador de C o C++. Emscripten (y Clang, que utiliza Emscripten) admite el atributo `musttail`, que le dice al compilador que una llamada debe compilarse como una llamada en cola. Como ejemplo, considere esta implementación recursiva de una función Fibonacci que calcula el número `n` de Fibonacci mod 2^32 (porque los enteros se desbordan para valores grandes de `n`):

```c
#include <stdio.h>

unsigned fib_rec(unsigned n, unsigned a, unsigned b) {
  if (n == 0) {
    return a;
  }
  return fib_rec(n - 1, b, a + b);
}

unsigned fib(unsigned n) {
  return fib_rec(n, 0, 1);
}

int main() {
  for (unsigned i = 0; i < 10; i++) {
    printf("fib(%d): %d\n", i, fib(i));
  }

  printf("fib(1000000): %d\n", fib(1000000));
}
```

Después de compilar con `emcc test.c -o test.js`, ejecutar este programa en Node.js genera un error de desbordamiento de pila. Podemos solucionar esto agregando `__attribute__((__musttail__))` al retorno en `fib_rec` y añadiendo `-mtail-call` a los argumentos de compilación. Ahora los módulos Wasm producidos contienen las nuevas instrucciones de llamada en cola, por lo que debemos pasar `--experimental-wasm-return_call` a Node.js, pero la pila ya no se desborda.

Aquí hay un ejemplo que también utiliza recursión mutua:

```c
#include <stdio.h>
#include <stdbool.h>

bool is_odd(unsigned n);
bool is_even(unsigned n);

bool is_odd(unsigned n) {
  if (n == 0) {
    return false;
  }
  __attribute__((__musttail__))
  return es_impar(n - 1);
}

bool es_par(unsigned n) {
  if (n == 0) {
    return true;
  }
  __attribute__((__musttail__))
  return es_impar(n - 1);
}

int main() {
  printf("es_par(1000000): %d\n", es_par(1000000));
}
```

Ten en cuenta que ambos ejemplos son lo suficientemente sencillos como para que, si compilamos con `-O2`, el compilador pueda precomputar la respuesta y evitar agotar la pila incluso sin llamadas en cola, pero esto no sería cierto con código más complejo. En código del mundo real, el atributo musttail puede ser útil para escribir bucles de intérprete de alto rendimiento como se describe en [esta publicación de blog](https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html) de Josh Haberman.

Además del atributo `musttail`, C++ depende de las llamadas en cola para otra característica: las corutinas de C++20. La relación entre las llamadas en cola y las corutinas de C++20 se aborda en profundidad extrema en [esta publicación de blog](https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer) de Lewis Baker, pero para resumir, es posible usar corutinas en un patrón que causaría sutilmente desbordamiento de pila aunque el código fuente no parezca tener un problema. Para resolver este problema, el comité de C++ agregó un requisito de que los compiladores implementen “transferencia simétrica” para evitar el desbordamiento de pila, lo que en la práctica significa usar llamadas en cola detrás de escena.

Cuando las llamadas en cola de WebAssembly están habilitadas, Clang implementa la transferencia simétrica como se describe en esa publicación de blog, pero cuando las llamadas en cola no están habilitadas, Clang compila el código de manera silenciosa sin transferencia simétrica, lo que podría llevar a desbordamientos de pila y técnicamente no sería una implementación correcta de C++20.

Para ver la diferencia en acción, usa Emscripten para compilar el último ejemplo de la publicación del blog enlazada arriba y observa que solo evita desbordar la pila si las llamadas en cola están habilitadas. Ten en cuenta que debido a un error recientemente resuelto, esto solo funciona correctamente en Emscripten 3.1.35 o posterior.

## Llamadas en cola en V8

Como vimos antes, no es responsabilidad del motor detectar las llamadas en posición de cola. Esto debería hacerse corriente arriba por la cadena de herramientas. Así que lo único que queda por hacer para TurboFan (el compilador optimizador de V8) es emitir una secuencia adecuada de instrucciones basada en el tipo de llamada y la firma de la función de destino. Para nuestro ejemplo de fibonacci de antes, la pila se vería así:

![Llamada en cola simple en TurboFan](/_img/wasm-tail-calls/tail-calls.svg)

A la izquierda estamos dentro de `fib_rec` (verde), llamado por `fib` (azul) y a punto de realizar una llamada en cola recursiva a `fib_rec`. Primero deshacemos el marco actual restableciendo el puntero del marco y el puntero de pila. El puntero del marco simplemente restaura su valor anterior leyendo desde la ranura “FP del llamador”. El puntero de pila se mueve a la parte superior del marco del padre, más suficiente espacio para cualquier parámetro de pila potencial y valores de devolución de pila para el llamado (0 en este caso, todo se pasa por registros). Los parámetros se mueven a sus registros esperados según el enlace de `fib_rec` (no mostrado en el diagrama). Y finalmente comenzamos a ejecutar `fib_rec`, que comienza creando un nuevo marco.

`fib_rec` se deshace y se rehace a sí mismo así hasta que `n == 0`, momento en el cual devuelve `a` por registro a `fib`.

Este es un caso simple donde todos los parámetros y valores de retorno caben en registros, y el llamado tiene la misma firma que el llamador. En el caso general, podríamos necesitar realizar manipulaciones complejas en la pila:

- Leer parámetros salientes del marco anterior
- Mover parámetros al nuevo marco
- Ajustar el tamaño del marco moviendo la dirección de retorno hacia arriba o hacia abajo, dependiendo del número de parámetros de pila en el llamado

Todas estas lecturas y escrituras pueden entrar en conflicto, porque estamos reutilizando el mismo espacio de pila. Esta es una diferencia crucial con una llamada no en cola, que simplemente empujaría todos los parámetros de pila y la dirección de retorno en la parte superior de la pila.

![Llamada en cola compleja en TurboFan](/_img/wasm-tail-calls/tail-calls-complex.svg)

TurboFan maneja estas manipulaciones de pila y registros con el “resolutor de huecos”, un componente que toma una lista de movimientos que, semánticamente, deberían ejecutarse en paralelo, y genera la secuencia adecuada de movimientos para resolver interferencias potenciales entre las fuentes y destinos de los movimientos. Si los conflictos son acíclicos, esto es solo una cuestión de reordenar los movimientos de tal manera que todas las fuentes se lean antes de que sean sobrescritas. Para conflictos cíclicos (por ejemplo, si intercambiamos dos parámetros de pila), esto puede implicar mover una de las fuentes a un registro temporal o a una ranura temporal de pila para romper el ciclo.

Las llamadas de retorno también son compatibles en Liftoff, nuestro compilador base. De hecho, deben ser compatibles, o el código base podría quedarse sin espacio en la pila. Sin embargo, no están optimizadas en este nivel: Liftoff empuja los parámetros, la dirección de retorno y el puntero de marco para completar el marco como si fuera una llamada regular, y luego mueve todo hacia abajo para descartar el marco del llamador:

![Llamadas de retorno en Liftoff](/_img/wasm-tail-calls/tail-calls-liftoff.svg)

Antes de saltar a la función objetivo, también sacamos el FP del llamador al registro FP para restaurar su valor previo, y permitir que la función objetivo lo empuje nuevamente en el prólogo.

Esta estrategia no requiere que analicemos y resolvamos conflictos de movimiento, lo cual hace que la compilación sea más rápida. El código generado es más lento, pero eventualmente [asciende de nivel](/blog/wasm-dynamic-tiering) a TurboFan si la función es lo suficientemente utilizada.
