---
title: 'Un motor adicional de RegExp sin retroceso'
author: 'Martin Bidlingmaier'
date: 2021-01-11
tags:
 - internals
 - RegExp
description: 'V8 ahora tiene un motor de RegExp adicional que sirve como respaldo y evita muchas instancias de retroceso catastrófico.'
tweet: '1348635270762139650'
---
A partir de la versión v8.8, V8 incluye un nuevo motor experimental de RegExp sin retroceso (además del existente [motor Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)) que garantiza la ejecución en tiempo lineal con respecto al tamaño de la cadena de entrada. El motor experimental está disponible detrás de las banderas de características mencionadas a continuación.

<!--truncate-->
![Tiempo de ejecución de `/(a*)*b/.exec('a'.repeat(n))` para n ≤ 100](/_img/non-backtracking-regexp/runtime-plot.svg)

Aquí está cómo puedes configurar el nuevo motor de RegExp:

- `--enable-experimental-regexp_engine-on-excessive-backtracks` habilita el respaldo al motor sin retroceso en caso de retrocesos excesivos.
- `--regexp-backtracks-before-fallback N` (por defecto N = 50,000) especifica cuántos retrocesos se consideran "excesivos", es decir, cuándo entra en acción el respaldo.
- `--enable-experimental-regexp-engine` activa el reconocimiento de la bandera no estándar `l` ("lineal") para RegExps, como en e.g. `/(a*)*b/l`. Los RegExps construidos con esta bandera siempre se ejecutan de forma proactiva con el nuevo motor; Irregexp no participa en absoluto. Si el nuevo motor de RegExp no puede manejar el patrón de un `l`-RegExp, entonces se lanza una excepción durante la construcción. Esperamos que esta característica eventualmente pueda usarse para reforzar aplicaciones que ejecutan RegExps con entradas no confiables. Por ahora, sigue siendo experimental porque Irregexp es órdenes de magnitud más rápido que el nuevo motor en la mayoría de los patrones comunes.

El mecanismo de respaldo no se aplica a todos los patrones. Para que el mecanismo de respaldo entre en acción, el RegExp debe:

- no contener referencias posteriores,
- no contener verificaciones hacia adelante ni hacia atrás,
- no contener repeticiones finitas grandes o profundamente anidadas, como en e.g. `/a{200,500}/`, y
- no tener activadas las banderas `u` (Unicode) o `i` (sin distinción entre mayúsculas y minúsculas).

## Antecedentes: retroceso catastrófico

La coincidencia de RegExp en V8 es manejada por el motor Irregexp. Irregexp compila dinámicamente los RegExps a código nativo especializado (o [bytecode](/blog/regexp-tier-up)) y es extremadamente rápido para la mayoría de los patrones. Sin embargo, para algunos patrones, el tiempo de ejecución de Irregexp puede crecer exponencialmente con el tamaño de la cadena de entrada. El ejemplo anterior, `/(a*)*b/.exec('a'.repeat(100))`, no termina dentro de nuestras vidas si se ejecuta con Irregexp.

Entonces, ¿qué está pasando aquí? Irregexp es un motor *con retroceso*. Cuando enfrenta una elección sobre cómo puede continuar una coincidencia, Irregexp explora la primera alternativa en su totalidad y luego retrocede si es necesario para explorar la segunda alternativa. Considera, por ejemplo, la coincidencia del patrón `/abc|[az][by][0-9]/` contra la cadena de entrada `'ab3'`. Aquí Irregexp intenta coincidir con `/abc/` primero y falla después del segundo carácter. Luego retrocede dos caracteres y coincide exitosamente con la segunda alternativa `/[az][by][0-9]/`. En patrones con cuantificadores como `/(abc)*xyz/`, Irregexp debe elegir después de una coincidencia del cuerpo si debe coincidir el cuerpo nuevamente o continuar con el patrón restante.

Intentemos entender qué está pasando al coincidir `/(a*)*b/` contra una cadena de entrada más pequeña, digamos `'aaa'`. Este patrón contiene cuantificadores anidados, por lo que estamos pidiendo a Irregexp que coincida una *secuencia de secuencias* de `'a'`, y luego coincida `'b'`. Claramente no hay coincidencia porque la cadena de entrada no contiene `'b'`. Sin embargo, `/(a*)*/` coincide, y lo hace de manera exponencialmente en muchas formas diferentes:

```js
'aaa'           'aa', 'a'           'aa', ''
'a', 'aa'       'a', 'a', 'a'       'a', 'a', ''
…
```

A priori, Irregexp no puede descartar que la falla para coincidir con el final `/b/` se deba a elegir de manera incorrecta cómo coincidir `/(a*)*/`, por lo que tiene que probar todas las variantes. Este problema se conoce como "retroceso exponencial" o "catastrófico".

## RegExps como autómatas y bytecode

Para entender un algoritmo alternativo que sea inmune al retroceso catastrófico, tenemos que hacer un breve desvío por [autómatas](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton). Toda expresión regular es equivalente a un autómata. Por ejemplo, el RegExp `/(a*)*b/` mencionado antes corresponde al siguiente autómata:

![Autómata correspondiente a `/(a*)*b/`](/_img/non-backtracking-regexp/example-automaton.svg)

Cabe destacar que el autómata no está determinado de manera única por el patrón; el que ves arriba es el autómata que obtendrás mediante un proceso de traducción mecánico, y es el que se utiliza dentro del nuevo motor de RegExp de V8 para `/(a*)*/`.
Los bordes no etiquetados son transiciones epsilon: no consumen entrada. Las transiciones epsilon son necesarias para mantener el tamaño del autómata aproximadamente del mismo tamaño que el patrón. La eliminación ingenua de las transiciones epsilon puede resultar en un aumento cuadrático del número de transiciones.
Las transiciones epsilon también permiten construir el autómata correspondiente a una RegExp a partir de los siguientes cuatro tipos básicos de estados:

![Instrucciones de bytecode RegExp](/_img/non-backtracking-regexp/state-types.svg)

Aquí solo clasificamos las transiciones *desde* el estado, mientras que las transiciones hacia el estado aún se permiten ser arbitrarias. Los autómatas construidos solo con estos tipos de estados pueden representarse como *programas de bytecode*, con cada estado correspondiente a una instrucción. Por ejemplo, un estado con dos transiciones epsilon es representado como una instrucción `FORK`.

## El algoritmo de retroceso

Revisemos el algoritmo de retroceso en el que se basa Irregexp y describámoslo en términos de autómatas. Supongamos que tenemos un arreglo de bytecode `code` correspondiente al patrón y queremos `test` para ver si una `input` coincide con el patrón. Supongamos que `code` se parece a esto:

```js
const code = [
  {opcode: &apos;FORK&apos;, forkPc: 4},
  {opcode: &apos;CONSUME&apos;, char: &apos;1&apos;},
  {opcode: &apos;CONSUME&apos;, char: &apos;2&apos;},
  {opcode: &apos;JMP&apos;, jmpPc: 6},
  {opcode: &apos;CONSUME&apos;, char: &apos;a&apos;},
  {opcode: &apos;CONSUME&apos;, char: &apos;b&apos;},
  {opcode: &apos;ACCEPT&apos;}
];
```

Este bytecode corresponde al patrón (pegajoso) `/12|ab/y`. El campo `forkPc` de la instrucción `FORK` es el índice (“contador de programa”) del estado alternativo/instrucción al que podemos continuar, y de manera similar para `jmpPc`. Los índices comienzan desde cero. El algoritmo de retroceso ahora puede implementarse en JavaScript de la siguiente manera.

```js
let ip = 0; // Posición de entrada.
let pc = 0; // Contador de programa: índice de la siguiente instrucción.
const stack = []; // Pila de retroceso.
while (true) {
  const inst = code[pc];
  switch (inst.opcode) {
    case &apos;CONSUME&apos;:
      if (ip < input.length && input[ip] === inst.char) {
        // La entrada coincide con lo que esperamos: Continuar.
        ++ip;
        ++pc;
      } else if (stack.length > 0) {
        // Caracter de entrada incorrecto, pero podemos retroceder.
        const back = stack.pop();
        ip = back.ip;
        pc = back.pc;
      } else {
        // Caracter incorrecto, no se puede retroceder.
        return false;
      }
      break;
    case &apos;FORK&apos;:
      // Guardar la alternativa para retroceder más tarde.
      stack.push({ip: ip, pc: inst.forkPc});
      ++pc;
      break;
    case &apos;JMP&apos;:
      pc = inst.jmpPc;
      break;
    case &apos;ACCEPT&apos;:
      return true;
  }
}
```

Esta implementación entra en un bucle indefinido si el programa de bytecode contiene bucles que no consumen ningún carácter, es decir, si el autómata contiene un bucle que consiste únicamente en transiciones epsilon. Este problema puede resolverse con un vistazo anticipado por un único carácter. Irregexp es mucho más sofisticado que esta implementación simple, pero en última instancia se basa en el mismo algoritmo.

## El algoritmo sin retroceso

El algoritmo de retroceso corresponde a un recorrido *en profundidad* del autómata: siempre exploramos la primera alternativa de una instrucción `FORK` en su totalidad y luego retrocedemos a la segunda alternativa si es necesario. La alternativa a esto, el algoritmo sin retroceso, se basa, como era de esperarse, en un recorrido *en amplitud* del autómata. Aquí consideramos todas las alternativas simultáneamente, avanzando de manera sincronizada con respecto a la posición actual en la cadena de entrada. Por lo tanto, mantenemos una lista de estados actuales y luego avanzamos todos los estados tomando transiciones correspondientes a cada carácter de entrada. Crucialmente, eliminamos duplicados de la lista de estados actuales.

Una implementación simple en JavaScript se parece a esto:

```js
// Posición de entrada.
let ip = 0;
// Lista de valores de pc actuales, o `&apos;ACCEPT&apos;` si hemos encontrado una coincidencia. Comenzamos en
// pc 0 y seguimos las transiciones epsilon.
let pcs = followEpsilons([0]);

while (true) {
  // Hemos terminado si hemos encontrado una coincidencia…
  if (pcs === &apos;ACCEPT&apos;) return true;
  // …o si hemos agotado la cadena de entrada.
  if (ip >= input.length) return false;

  // Continúa solo con los pcs que CONSUMEN el carácter correcto.
  pcs = pcs.filter(pc => code[pc].char === input[ip]);
  // Avanzar los pcs restantes a la siguiente instrucción.
  pcs = pcs.map(pc => pc + 1);
  // Seguir las transiciones epsilon.
  pcs = followEpsilons(pcs);

  ++ip;
}
```

Aquí `followEpsilons` es una función que toma una lista de contadores de programa y calcula la lista de contadores de programa en instrucciones `CONSUME` que se pueden alcanzar mediante transiciones epsilon (es decir, solo ejecutando FORK y JMP). La lista devuelta no debe contener duplicados. Si se puede alcanzar una instrucción `ACCEPT`, la función devuelve `&apos;ACCEPT&apos;`. Se puede implementar así:

```js
function followEpsilons(pcs) {
  // Conjunto de pcs vistos hasta ahora.
  const visitedPcs = new Set();
  const result = [];

  while (pcs.length > 0) {
    const pc = pcs.pop();

    // Podemos ignorar pc si lo hemos visto antes.
    if (visitedPcs.has(pc)) continue;
    visitedPcs.add(pc);

    const inst = code[pc];
    switch (inst.opcode) {
      case &apos;CONSUME&apos;:
        result.push(pc);
        break;
      case 'FORK':
        pcs.push(pc + 1, inst.forkPc);
        break;
      case 'JMP':
        pcs.push(inst.jmpPc);
        break;
      case 'ACCEPT':
        return 'ACEPTAR';
    }
  }

  return result;
}
```

Debido a la eliminación de duplicados a través del conjunto `visitedPcs`, sabemos que cada contador de programa solo se examina una vez en `followEpsilons`. Esto garantiza que la lista `result` no contenga duplicados y que el tiempo de ejecución de `followEpsilons` esté limitado por el tamaño del arreglo `code`, es decir, el tamaño del patrón. `followEpsilons` se llama como mucho `input.length` veces, por lo que el tiempo total de ejecución de la coincidencia con expresiones regulares está limitado por `𝒪(pattern.length * input.length)`.

El algoritmo sin retroceso puede extenderse para admitir la mayoría de las características de las expresiones regulares de JavaScript, por ejemplo, límites de palabras o el cálculo de límites de coincidencias (sub). Desafortunadamente, las referencias inversas, el lookahead y el lookbehind no se pueden admitir sin cambios importantes que alteren la complejidad asintótica en el peor de los casos.

El nuevo motor de expresiones regulares de V8 se basa en este algoritmo y su implementación en las bibliotecas [re2](https://github.com/google/re2) y [Rust regex](https://github.com/rust-lang/regex). El algoritmo se analiza con mucho más detalle que aquí en una excelente [serie de publicaciones de blog](https://swtch.com/~rsc/regexp/) por Russ Cox, quien también es el autor original de la biblioteca re2.
