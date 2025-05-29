---
title: &apos;Añadiendo BigInts a V8&apos;
author: &apos;Jakob Kummerow, árbitro de la precisión&apos;
date: 2018-05-02 13:33:37
tags:
  - ECMAScript
description: &apos;V8 ahora soporta BigInts, una característica del lenguaje JavaScript que permite enteros de precisión arbitraria.&apos;
tweet: &apos;991705626391732224&apos;
---
En los últimos meses, hemos implementado soporte para [BigInts](/features/bigint) en V8, tal como se especifica actualmente en [esta propuesta](https://github.com/tc39/proposal-bigint), para incluirse en una futura versión de ECMAScript. La siguiente publicación relata la historia de nuestras aventuras.

<!--truncate-->
## Resumen

Como programador de JavaScript, ahora[^1] tienes enteros con precisión arbitraria[^2] en tu caja de herramientas:

```js
const a = 2172141653n;
const b = 15346349309n;
a * b;
// → 33334444555566667777n     // ¡Genial!
Number(a) * Number(b);
// → 33334444555566670000      // ¡Qué mal!
const such_many = 2n ** 222n;
// → 6739986666787659948666753771754907668409286105635143120275902562304n
```

Para obtener detalles sobre la nueva funcionalidad y cómo podría usarse, consulta [nuestro artículo en profundidad sobre BigInt](/features/bigint). ¡Estamos ansiosos por ver las cosas increíbles que construirás con ellas!

[^1]: _Ahora_ si ejecutas Chrome Beta, Dev o Canary, o una [versión previa de Node.js](https://github.com/v8/node/tree/vee-eight-lkgr), de lo contrario _pronto_ (Chrome 67, Node.js en la rama principal probablemente al mismo tiempo).

[^2]: Arbitraria hasta un límite definido por la implementación. Lo sentimos, aún no hemos descubierto cómo comprimir una cantidad infinita de datos en la cantidad finita de memoria de tu computadora.

## Representando BigInts en memoria

Típicamente, las computadoras almacenan enteros en los registros de su CPU (que hoy en día suelen tener 32 o 64 bits de ancho), o en fragmentos de memoria del tamaño de un registro. Esto conduce a los valores mínimos y máximos que podrías conocer. Por ejemplo, un entero con signo de 32 bits puede contener valores desde -2,147,483,648 hasta 2,147,483,647. Sin embargo, la idea de BigInts es no estar restringido por tales límites.

Entonces, ¿cómo se puede almacenar un BigInt con cien, mil o un millón de bits? No cabe en un registro, así que asignamos un objeto en la memoria. Lo hacemos lo suficientemente grande para contener todos los bits del BigInt, en una serie de fragmentos que llamamos “dígitos”, porque esto es conceptualmente muy similar a cómo se pueden escribir números más grandes que “9” usando más dígitos, como en “10”; excepto que, mientras el sistema decimal usa dígitos del 0 al 9, nuestros BigInts usan dígitos del 0 al 4294967295 (es decir, `2**32-1`). Ese es el rango de valores de un registro de CPU de 32 bits[^3], sin un bit de signo; almacenamos el bit de signo por separado. En pseudocódigo, un objeto `BigInt` con `3*32 = 96` bits se vería así:

```js
{
  type: &apos;BigInt&apos;,
  sign: 0,
  num_digits: 3,
  digits: [0x12…, 0x34…, 0x56…],
}
```

[^3]: En máquinas de 64 bits, usamos dígitos de 64 bits, es decir, de 0 a 18446744073709551615 (es decir, `2n**64n-1n`).

## De vuelta a la escuela y a Knuth

Trabajar con enteros alojados en los registros de la CPU es realmente fácil: por ejemplo, para multiplicar dos de ellos, hay una instrucción de máquina que el software puede usar para decirle a la CPU “¡multiplica el contenido de estos dos registros!”, y la CPU lo hará. Para la aritmética de BigInts, tenemos que idear nuestra propia solución. Afortunadamente, esta tarea en particular es algo que literalmente cada niño aprende cómo resolver en algún momento: ¿recuerdas lo que hacías en la escuela cuando tenías que multiplicar 345 \* 678 y no te permitían usar una calculadora?

```
345 * 678
---------
     30    //   5 * 6
+   24     //  4  * 6
+  18      // 3   * 6
+     35   //   5 *  7
+    28    //  4  *  7
+   21     // 3   *  7
+      40  //   5 *   8
+     32   //  4  *   8
+    24    // 3   *   8
=========
   233910
```

Así es exactamente como V8 multiplica BigInts: un dígito a la vez, sumando los resultados intermedios. El algoritmo funciona igual de bien para `0` a `9` como para los dígitos mucho más grandes de un BigInt.

Donald Knuth publicó una implementación específica de la multiplicación y división de números grandes compuestos de fragmentos más pequeños en el Volumen 2 de su clásico _The Art of Computer Programming_, allá por 1969. La implementación de V8 sigue este libro, lo que demuestra que es una pieza bastante atemporal de la informática.

## ¿Menos “desugarización” == más dulce?

Quizás sorprendentemente, tuvimos que dedicar bastante esfuerzo a lograr que operaciones unarias aparentemente simples, como `-x`, funcionaran. Hasta ahora, `-x` hacía exactamente lo mismo que `x * (-1)`, por lo que para simplificar las cosas, V8 aplicaba precisamente este reemplazo tan pronto como fuera posible al procesar JavaScript, concretamente en el analizador. Este enfoque se llama “desugarización”, porque trata una expresión como `-x` como “azúcar sintáctico” para `x * (-1)`. Otros componentes (el intérprete, el compilador, todo el sistema de tiempo de ejecución) ni siquiera necesitaban saber qué es una operación unaria, porque solo veían la multiplicación, que por supuesto deben soportar de todos modos.

Sin embargo, con BigInts, esta implementación de repente se vuelve inválida, porque multiplicar un BigInt con un Número (como `-1`) debe lanzar un `TypeError`[^4]. El analizador tendría que descomponer `-x` en `x * (-1n)` si `x` es un BigInt, pero el analizador no tiene forma de saber en qué evaluará `x`. Así que tuvimos que dejar de depender de este descomposición temprana y, en su lugar, agregar soporte adecuado para operaciones unarias tanto en Números como en BigInts en todas partes.

[^4]: Mezclar tipos de operandos `BigInt` y `Number` generalmente no está permitido. Eso es algo inusual para JavaScript, pero hay [una explicación](/features/bigint#operators) para esta decisión.

## Un poco de diversión con operaciones bitwise

La mayoría de los sistemas informáticos en uso hoy en día almacenan enteros con signo utilizando un truco ingenioso llamado "complemento a dos", que tiene las propiedades interesantes de que el primer bit indica el signo, y sumar 1 al patrón de bits siempre incrementa el número en 1, cuidando automáticamente del bit de signo. Por ejemplo, para enteros de 8 bits:

- `10000000` es -128, el número representable más bajo,
- `10000001` es -127,
- `11111111` es -1,
- `00000000` es 0,
- `00000001` es 1,
- `01111111` es 127, el número representable más alto.

Esta codificación es tan común que muchos programadores la esperan y dependen de ella, y la especificación de BigInt refleja este hecho al prescribir que los BigInts deben comportarse como si usaran la representación de complemento a dos. ¡Como se describe arriba, los BigInts de V8 no lo hacen!

Para realizar operaciones bitwise de acuerdo con la especificación, nuestros BigInts por lo tanto deben pretender estar usando complemento a dos internamente. Para valores positivos, no hace diferencia, pero los números negativos deben hacer trabajo extra para lograr esto. Eso tiene el efecto algo sorprendente de que `a & b`, si `a` y `b` son ambos BigInts negativos, en realidad realiza _cuatro_ pasos (en lugar de solo uno si ambos fueran positivos): ambas entradas se convierten al formato falso de complemento a dos, luego se realiza la operación real, luego el resultado se convierte nuevamente a nuestra representación real. ¿Por qué el ida y vuelta, podrías preguntar? Porque todas las operaciones que no son bitwise son mucho más fáciles de esa manera.

## Dos nuevos tipos de TypedArrays

La propuesta de BigInt incluye dos nuevos sabores de TypedArray: `BigInt64Array` y `BigUint64Array`. Ahora podemos tener TypedArrays con elementos enteros de 64 bits de ancho porque BigInts proporcionan una forma natural de leer y escribir todos los bits en esos elementos, mientras que si uno intentara usar Números para eso, algunos bits podrían perderse. Es por eso que los nuevos arreglos no son exactamente como los TypedArrays enteros existentes de 8/16/32 bits: el acceso a sus elementos siempre se realiza con BigInts; intentar usar Números lanza una excepción.

```js
> const big_array = new BigInt64Array(1);
> big_array[0] = 123n;  // OK
> big_array[0]
123n
> big_array[0] = 456;
TypeError: No se puede convertir 456 a un BigInt
> big_array[0] = BigInt(456);  // OK
```

Así como el código JavaScript que trabaja con estos tipos de arreglos se ve y funciona un poco diferente al código tradicional de TypedArrays, tuvimos que generalizar nuestra implementación de TypedArray para comportarse de manera diferente con los dos recién llegados.

## Consideraciones de optimización

Por ahora, estamos lanzando una implementación básica de BigInts. Es funcionalmente completa y debería ofrecer un rendimiento sólido (un poco más rápido que las bibliotecas existentes en el lado del usuario), pero no está particularmente optimizada. La razón es que, en línea con nuestro objetivo de priorizar aplicaciones del mundo real sobre referencias artificiales, primero queremos ver cómo usarás BigInts, para que podamos optimizar precisamente los casos que más te interesan.

Por ejemplo, si vemos que los BigInts relativamente pequeños (hasta 64 bits) son un caso de uso importante, podríamos hacer que sean más eficientes en términos de memoria utilizando una representación especial para ellos:

```js
{
  type: &apos;BigInt-Int64&apos;,
  value: 0x12…,
}
```

Uno de los detalles que queda por resolver es si deberíamos hacer esto para rangos de valores "int64", rangos "uint64" o ambos, teniendo en cuenta que tener que admitir menos vías rápidas significa que podemos lanzarlas antes, y también que cada vía rápida adicional irónicamente hace que todo lo demás sea un poco más lento, porque las operaciones afectadas siempre tienen que verificar si es aplicable.

Otra historia es el soporte para BigInts en el compilador optimizador. Para aplicaciones computationalmente intensivas que operen en valores de 64 bits y se ejecuten en hardware de 64 bits, mantener esos valores en registros sería mucho más eficiente que asignarlos como objetos en el heap como hacemos actualmente. Tenemos planes sobre cómo implementar dicho soporte, pero es otro caso donde primero nos gustaría averiguar si realmente es lo que tú, nuestros usuarios, valoras más, o si deberíamos dedicar nuestro tiempo a otra cosa.

Por favor, envíanos tus comentarios sobre para qué estás utilizando BigInts y cualquier problema que encuentres. Puedes contactarnos a través de nuestro rastreador de errores [crbug.com/v8/new](https://crbug.com/v8/new), por correo a [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com), o [@v8js](https://twitter.com/v8js) en Twitter.
