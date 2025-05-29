---
title: "BigInt: enteros de precisión arbitraria en JavaScript"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-05-01
tags:
  - ECMAScript
  - ES2020
  - io19
description: "BigInts son un nuevo tipo de primitiva numérica en JavaScript que puede representar enteros con precisión arbitraria. Este artículo presenta algunos casos de uso y explica la nueva funcionalidad en Chrome 67 al comparar BigInts con Numbers en JavaScript."
tweet: "990991035630206977"
---
`BigInt`s son un nuevo tipo de primitiva numérica en JavaScript que puede representar enteros con precisión arbitraria. Con `BigInt`s, puedes almacenar y operar de manera segura con enteros grandes incluso más allá del límite seguro de enteros para `Number`s. Este artículo presenta algunos casos de uso y explica la nueva funcionalidad en Chrome 67 al comparar `BigInt`s con `Number`s en JavaScript.

<!--truncate-->
## Casos de uso

Los enteros de precisión arbitraria desbloquean muchos nuevos casos de uso para JavaScript.

`BigInt`s hacen posible realizar correctamente aritmética de enteros sin desbordarse. Eso, por sí solo, habilita innumerables nuevas posibilidades. Las operaciones matemáticas con números grandes se utilizan comúnmente en tecnología financiera, por ejemplo.

[IDs enteros grandes](https://developer.twitter.com/en/docs/basics/twitter-ids) y [marca de tiempo de alta precisión](https://github.com/nodejs/node/pull/20220) no pueden ser representados de manera segura como `Number`s en JavaScript. Esto [a menudo](https://github.com/stedolan/jq/issues/1399) conduce a [errores en el mundo real](https://github.com/nodejs/node/issues/12115), y hace que los desarrolladores de JavaScript los representen como cadenas en su lugar. Con `BigInt`, estos datos ahora pueden ser representados como valores numéricos.

`BigInt` podría formar la base de una futura implementación de `BigDecimal`. Esto sería útil para representar sumas de dinero con precisión decimal, y operar sobre ellas con precisión (también conocido como el problema `0.10 + 0.20 !== 0.30`).

Anteriormente, las aplicaciones de JavaScript con cualquiera de estos casos de uso tenían que recurrir a bibliotecas de usuario que emularan la funcionalidad de tipo `BigInt`. Cuando `BigInt` se vuelva ampliamente disponible, tales aplicaciones pueden prescindir de estas dependencias en tiempo de ejecución en favor de los `BigInt`s nativos. Esto ayuda a reducir el tiempo de carga, tiempo de análisis y tiempo de compilación, y además de todo eso, ofrece mejoras significativas de rendimiento en tiempo de ejecución.

![La implementación nativa de `BigInt` en Chrome funciona mejor que las bibliotecas de usuario populares.](/_img/bigint/performance.svg)

## El estado actual: `Number`

`Number`s en JavaScript están representados como [flotantes de doble precisión](https://en.wikipedia.org/wiki/Floating-point_arithmetic). Esto significa que tienen precisión limitada. La constante `Number.MAX_SAFE_INTEGER` da el mayor entero posible que puede ser incrementado de manera segura. Su valor es `2**53-1`.

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**Nota:** Para mayor legibilidad, agrupo los dígitos de este número grande por mil, usando guiones bajos como separadores. [La propuesta de separadores de literal numérico](/features/numeric-separators) habilita exactamente eso para los literales numéricos comunes de JavaScript.
:::

Incrementarlo una vez da el resultado esperado:

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

Pero si lo incrementamos una segunda vez, el resultado ya no es exactamente representable como un `Number` de JavaScript:

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

Observa cómo `max + 1` produce el mismo resultado que `max + 2`. Siempre que obtengamos este valor particular en JavaScript, no hay forma de decir si es preciso o no. Cualquier cálculo en enteros fuera del rango seguro de enteros (es decir, desde `Number.MIN_SAFE_INTEGER` hasta `Number.MAX_SAFE_INTEGER`) puede perder precisión. Por esta razón, solo podemos confiar en valores enteros numéricos dentro del rango seguro.

## La novedad: `BigInt`

`BigInt`s son un nuevo tipo de primitiva numérica en JavaScript que puede representar enteros con [precisión arbitraria](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic). Con `BigInt`s, puedes almacenar y operar de manera segura con enteros grandes incluso más allá del límite seguro de enteros para `Number`s.

Para crear un `BigInt`, agrega el sufijo `n` a cualquier literal entero. Por ejemplo, `123` se convierte en `123n`. La función global `BigInt(number)` puede usarse para convertir un `Number` en un `BigInt`. En otras palabras, `BigInt(123) === 123n`. Utilicemos estas dos técnicas para resolver el problema que teníamos antes:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

Aquí va otro ejemplo, donde estamos multiplicando dos `Number`s:

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

Mirando los últimos dígitos significativos, `9` y `3`, sabemos que el resultado de la multiplicación debería terminar en `7` (porque `9 * 3 === 27`). Sin embargo, el resultado termina en un montón de ceros. ¡Eso no puede estar bien! Volvamos a intentarlo con `BigInt`s en su lugar:

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

Esta vez obtenemos el resultado correcto.

Los límites de enteros seguros para `Number` no se aplican a `BigInt`. Por lo tanto, con `BigInt` podemos realizar operaciones aritméticas de enteros correctas sin preocuparnos por perder precisión.

### Un nuevo tipo primitivo

Los `BigInt` son un nuevo tipo primitivo en el lenguaje JavaScript. Como tal, tienen su propio tipo que puede detectarse utilizando el operador `typeof`:

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

Debido a que los `BigInt` son un tipo independiente, un `BigInt` nunca es estrictamente igual a un `Number`, por ejemplo, `42n !== 42`. Para comparar un `BigInt` con un `Number`, convierte uno de ellos al tipo del otro antes de realizar la comparación o utiliza la igualdad abstracta (`==`):

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

Cuando se convierten a booleanos (lo que ocurre al usar `if`, `&&`, `||`, o `Boolean(int)`, por ejemplo), los `BigInt` siguen la misma lógica que los `Number`.

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → logs 'else', porque `0n` es falsy.
```

### Operadores

Los `BigInt` soportan los operadores más comunes. Los binarios `+`, `-`, `*` y `**` funcionan como se espera. `/` y `%` funcionan y redondean hacia cero según sea necesario. Las operaciones de bits `|`, `&`, `<<`, `>>` y `^` realizan aritmética de bits asumiendo una [representación en complemento a dos](https://es.wikipedia.org/wiki/Complemento_a_dos) para valores negativos, tal como lo hacen para los `Number`.

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

Unario `-` puede usarse para denotar un valor `BigInt` negativo, por ejemplo, `-42n`. El unario `+` _no_ está soportado porque rompería el código asm.js, que espera que `+x` siempre produzca un `Number` o una excepción.

Un problema es que no se permite mezclar operaciones entre `BigInt` y `Number`. Esto es algo positivo, ya que cualquier conversión implícita podría perder información. Considera este ejemplo:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

¿Cuál debería ser el resultado? No hay una buena respuesta aquí. Los `BigInt` no pueden representar fracciones, y los `Number` no pueden representar `BigInt` más allá del límite de enteros seguros. Por esa razón, mezclar operaciones entre `BigInt` y `Number` resulta en una excepción `TypeError`.

La única excepción a esta regla son los operadores de comparación como `===` (como se discutió anteriormente), `<` y `>=`, ya que devuelven valores booleanos y no hay riesgo de pérdida de precisión.

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

Dado que los `BigInt` y los `Number` generalmente no se mezclan, evita sobrecargar o “actualizar mágicamente” tu código existente para usar `BigInt` en lugar de `Number`. Decide en cuál de estos dos dominios operar, y sigue en él. Para las _nuevas_ APIs que operan con enteros potencialmente grandes, `BigInt` es la mejor elección. Los `Number` aún tienen sentido para valores enteros que se sabe están dentro del rango seguro.

Otra cosa a tener en cuenta es que [el operador `>>>`](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift), que realiza un desplazamiento a la derecha sin signo, no tiene sentido para los `BigInt` ya que siempre tienen signo. Por esta razón, `>>>` no funciona para `BigInt`.

### API

Existen varias nuevas APIs específicas de `BigInt`.

El constructor global `BigInt` es similar al constructor `Number`: convierte su argumento en un `BigInt` (como se mencionó anteriormente). Si la conversión falla, lanza una excepción `SyntaxError` o `RangeError`.

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

El primero de estos ejemplos pasa un literal numérico a `BigInt()`. Esto es una mala práctica, ya que los `Number` sufren de pérdida de precisión, y podríamos perder precisión antes de que ocurra la conversión `BigInt`:

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

Por esta razón, recomendamos utilizar ya sea la notación literal de `BigInt` (con el sufijo `n`), o pasar una cadena (¡no un `Number`!) a `BigInt()` en su lugar:

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

Dos funciones de biblioteca permiten envolver valores `BigInt` como enteros con o sin signo, limitados a un número específico de bits. `BigInt.asIntN(width, value)` envuelve un valor `BigInt` a un entero binario con signo de `width` dígitos, y `BigInt.asUintN(width, value)` envuelve un valor `BigInt` a un entero binario sin signo de `width` dígitos. Si estás realizando cálculos de 64 bits, por ejemplo, puedes usar estas APIs para mantenerte dentro del rango apropiado:

```js
// El valor BigInt más alto posible que puede representarse como un
// entero con signo de 64 bits.
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
→ 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ negativo debido al desbordamiento
```

Observa cómo ocurre un desbordamiento tan pronto como pasamos un valor de `BigInt` que excede el rango de enteros de 64 bits (es decir, 63 bits para el valor numérico absoluto + 1 bit para el signo).

Los `BigInt` permiten representar con precisión enteros firmados y sin firmar de 64 bits, que son comúnmente utilizados en otros lenguajes de programación. Dos nuevos tipos de arrays `BigInt64Array` y `BigUint64Array` facilitan la representación y operación eficiente en listas de tales valores:

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

El tipo `BigInt64Array` asegura que sus valores permanezcan dentro del límite firmado de 64 bits.

```js
// El valor máximo posible de BigInt que puede ser representado como un
// entero firmado de 64 bits.
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ negativo debido al desbordamiento
```

El tipo `BigUint64Array` hace lo mismo utilizando el límite sin firmar de 64 bits en su lugar.

## Polyfill y transpilación de BigInts

En el momento de escribir esto, los `BigInt` solo son compatibles con Chrome. Otros navegadores están trabajando activamente en implementarlos. Pero, ¿qué pasa si quieres usar la funcionalidad de `BigInt` *hoy* sin sacrificar la compatibilidad del navegador? ¡Me alegra que lo preguntes! La respuesta es… interesante, por decir lo menos.

A diferencia de la mayoría de otras características modernas de JavaScript, los `BigInt` no pueden transpilarse razonablemente a ES5.

La propuesta de `BigInt` [cambia el comportamiento de los operadores](#operators) (como `+`, `>=`, etc.) para trabajar con `BigInt`. Estos cambios son imposibles de polyfill directamente, y también hacen que sea inviable (en la mayoría de los casos) transpilar el código de `BigInt` al código de respaldo utilizando Babel u herramientas similares. La razón es que tal transpiler tendría que reemplazar *cada operador individual* en el programa con una llamada a alguna función que realice verificaciones de tipo en sus entradas, lo que generaría una penalización de rendimiento en tiempo de ejecución inaceptable. Además, aumentaría significativamente el tamaño del archivo de cualquier paquete transpilerizado, impactando negativamente los tiempos de descarga, análisis y compilación.

Una solución más viable y preparada para el futuro es escribir tu código utilizando [la biblioteca JSBI](https://github.com/GoogleChromeLabs/jsbi#why) por ahora. JSBI es un puerto de JavaScript de la implementación de `BigInt` en V8 y Chrome — por diseño, funciona exactamente como la funcionalidad nativa de `BigInt`. La diferencia es que, en lugar de depender de la sintaxis, expone [una API](https://github.com/GoogleChromeLabs/jsbi#how):

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt('2');
const result = JSBI.add(max, two);
console.log(result.toString());
// → '9007199254740993'
```

Una vez que `BigInt` esté soportado nativamente en todos los navegadores que te importan, puedes [usar `babel-plugin-transform-jsbi-to-bigint` para transpilar tu código a código nativo de `BigInt`](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) y eliminar la dependencia de JSBI. Por ejemplo, el ejemplo anterior se transpila a:

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → '9007199254740993'
```

## Lecturas adicionales

Si estás interesado en cómo funcionan los `BigInt` tras bambalinas (por ejemplo, cómo se representan en memoria y cómo se realizan las operaciones con ellos), [lee nuestra publicación en el blog de V8 con detalles de implementación](/blog/bigint).

## Compatibilidad de `BigInt`

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
