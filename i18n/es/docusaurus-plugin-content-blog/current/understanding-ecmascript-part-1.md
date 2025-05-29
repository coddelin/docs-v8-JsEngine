---
title: &apos;Entendiendo la especificación ECMAScript, parte 1&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh), espectadora de especificaciones especulativas&apos;
avatars:
  - marja-holtta
date: 2020-02-03 13:33:37
tags:
  - ECMAScript
  - Entendiendo ECMAScript
description: &apos;Tutorial sobre cómo leer la especificación ECMAScript&apos;
tweet: &apos;1224363301146189824&apos;
---

[Todos los episodios](/blog/tags/understanding-ecmascript)

En este artículo, tomamos una función simple de la especificación y tratamos de entender la notación. ¡Vamos allá!

## Prefacio

Incluso si conoces JavaScript, leer la especificación del lenguaje, [Especificación del lenguaje ECMAScript, o simplemente la especificación ECMAScript](https://tc39.es/ecma262/), puede ser bastante desalentador. Al menos así me sentí cuando la leí por primera vez.

<!--truncate-->
Empecemos con un ejemplo concreto y recorramos la especificación para entenderla. El siguiente código demuestra el uso de `Object.prototype.hasOwnProperty`:

```js
const o = { foo: 1 };
o.hasOwnProperty(&apos;foo&apos;); // true
o.hasOwnProperty(&apos;bar&apos;); // false
```

En el ejemplo, `o` no tiene una propiedad llamada `hasOwnProperty`, así que subimos por la cadena de prototipos y la buscamos. La encontramos en el prototipo de `o`, que es `Object.prototype`.

Para describir cómo funciona `Object.prototype.hasOwnProperty`, la especificación utiliza descripciones similares a pseudocódigo:

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> Cuando se llama al método `hasOwnProperty` con el argumento `V`, se llevan a cabo los siguientes pasos:
>
> 1. Que `P` sea `? ToPropertyKey(V)`.
> 2. Que `O` sea `? ToObject(this value)`.
> 3. Devuelve `? HasOwnProperty(O, P)`.
:::

…y…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> La operación abstracta `HasOwnProperty` se utiliza para determinar si un objeto tiene una propiedad propia con la clave de propiedad especificada. Se devuelve un valor booleano. La operación se llama con los argumentos `O` y `P` donde `O` es el objeto y `P` es la clave de propiedad. Esta operación abstracta realiza los siguientes pasos:
>
> 1. Asegura: `Type(O)` es `Object`.
> 2. Asegura: `IsPropertyKey(P)` es `true`.
> 3. Que `desc` sea `? O.[[GetOwnProperty]](P)`.
> 4. Si `desc` es `undefined`, devuelve `false`.
> 5. Devuelve `true`.
:::

Pero, ¿qué es una “operación abstracta”? ¿Qué son las cosas dentro de `[[ ]]`? ¿Por qué hay un `?` delante de una función? ¿Qué significan las afirmaciones?

¡Vamos a averiguarlo!

## Tipos de lenguaje y tipos de especificación

Empecemos por algo que parece familiar. La especificación utiliza valores como `undefined`, `true` y `false`, que ya conocemos de JavaScript. Todos ellos son [**valores del lenguaje**](https://tc39.es/ecma262/#sec-ecmascript-language-types), valores de **tipos de lenguaje** que también define la especificación.

La especificación también utiliza valores del lenguaje internamente. Por ejemplo, un tipo de dato interno podría contener un campo cuyos valores posibles sean `true` y `false`. En contraste, los motores de JavaScript generalmente no utilizan los valores del lenguaje internamente. Por ejemplo, si el motor de JavaScript está escrito en C++, típicamente utiliza los valores `true` y `false` de C++ (y no sus representaciones internas de los valores de JavaScript `true` y `false`).

Además de los tipos de lenguaje, la especificación también utiliza [**tipos de especificación**](https://tc39.es/ecma262/#sec-ecmascript-specification-types), que son tipos que solo aparecen en la especificación, pero no en el lenguaje JavaScript. El motor de JavaScript no necesita (pero puede optar por) implementarlos. En esta publicación del blog, conoceremos el tipo de especificación Record (y su subtipo Completion Record).

## Operaciones abstractas

[**Operaciones abstractas**](https://tc39.es/ecma262/#sec-abstract-operations) son funciones definidas en la especificación ECMAScript; se definen con el propósito de escribir la especificación de manera concisa. Un motor de JavaScript no tiene que implementarlas como funciones separadas dentro del motor. No pueden ser llamadas directamente desde JavaScript.

## Ranuras internas y métodos internos

[**Ranuras internas** y **métodos internos**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots) utilizan nombres encerrados en `[[ ]]`.

Las ranuras internas son miembros de datos de un objeto de JavaScript o de un tipo de especificación. Se usan para almacenar el estado del objeto. Los métodos internos son funciones miembros de un objeto de JavaScript.

Por ejemplo, cada objeto de JavaScript tiene una ranura interna `[[Prototype]]` y un método interno `[[GetOwnProperty]]`.

Las ranuras internas y los métodos no son accesibles desde JavaScript. Por ejemplo, no puedes acceder a `o.[[Prototype]]` ni llamar a `o.[[GetOwnProperty]]()`. Un motor de JavaScript puede implementarlos para su propio uso interno, pero no está obligado a hacerlo.

A veces los métodos internos delegan en operaciones abstractas con nombres similares, como en el caso de los objetos ordinarios `[[GetOwnProperty]]:`

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> Cuando se llama al método interno `[[GetOwnProperty]]` de `O` con la clave de propiedad `P`, se realizan los siguientes pasos:
>
> 1. Devuelve `! OrdinaryGetOwnProperty(O, P)`.
:::

(Descubriremos qué significa el signo de exclamación en el próximo capítulo).

`OrdinaryGetOwnProperty` no es un método interno, ya que no está asociado con ningún objeto; en su lugar, el objeto en el que opera se pasa como un parámetro.

`OrdinaryGetOwnProperty` se llama “ordinario” porque opera en objetos ordinarios. Los objetos de ECMAScript pueden ser **ordinarios** o **exóticos**. Los objetos ordinarios deben tener el comportamiento predeterminado para un conjunto de métodos llamados **métodos internos esenciales**. Si un objeto se desvía del comportamiento predeterminado, es exótico.

El objeto exótico más conocido es el `Array`, ya que su propiedad length se comporta de una manera no predeterminada: establecer la propiedad `length` puede eliminar elementos del `Array`.

Los métodos internos esenciales son los métodos listados [aquí](https://tc39.es/ecma262/#table-5).

## Registros de finalización

¿Y qué hay de los signos de interrogación y exclamación? ¡Para entenderlos, necesitamos analizar los [**Registros de Finalización**](https://tc39.es/ecma262/#sec-completion-record-specification-type)!

Un Registro de Finalización es un tipo de especificación (definido solo para fines de especificación). Un motor de JavaScript no necesita tener un tipo de datos interno correspondiente.

Un Registro de Finalización es un “registro” — un tipo de datos que tiene un conjunto fijo de campos con nombre. Un Registro de Finalización tiene tres campos:

:::table-wrapper
| Nombre         | Descripción                                                                                                                                |
| ------------   | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `[[Type]]`     | Uno de: `normal`, `break`, `continue`, `return` o `throw`. Todos los demás tipos excepto `normal` son **finalizaciones abruptas**.          |
| `[[Value]]`    | El valor que se produjo cuando ocurrió la finalización, por ejemplo, el valor de retorno de una función o la excepción (si se lanzó alguna).|
| `[[Target]]`   | Usado para transferencias de control dirigidas (no relevante para esta publicación de blog).                                               |
:::

Cada operación abstracta devuelve implícitamente un Registro de Finalización. Incluso si parece que una operación abstracta devolvería un tipo simple como Boolean, está implícitamente envuelto en un Registro de Finalización con el tipo `normal` (ver [Valores Implícitos de Finalización](https://tc39.es/ecma262/#sec-implicit-completion-values)).

Nota 1: La especificación no es completamente coherente en este sentido; hay algunas funciones auxiliares que devuelven valores simples y cuyos valores de retorno se utilizan tal cual, sin extraer el valor del Registro de Finalización. Esto generalmente es claro en el contexto.

Nota 2: Los editores de la especificación están considerando hacer más explícita la gestión de los Registros de Finalización.

Si un algoritmo lanza una excepción, significa devolver un Registro de Finalización con `[[Type]]` `throw` cuyo `[[Value]]` es el objeto de la excepción. Ignoraremos por ahora los tipos `break`, `continue` y `return`.

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt) significa realizar los siguientes pasos:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Si `argument` es abrupto, devuelve `argument`.
> 2. Establece `argument` en `argument.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Es decir, inspeccionamos un Registro de Finalización; si es una finalización abrupta, devolvemos inmediatamente. De lo contrario, extraemos el valor del Registro de Finalización.

`ReturnIfAbrupt` podría parecer una llamada a función, pero no lo es. Hace que la función en la que ocurre `ReturnIfAbrupt()` devuelva, no la propia función `ReturnIfAbrupt`. Se comporta más como una macro en lenguajes tipo C.

`ReturnIfAbrupt` puede ser usado así:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Que `obj` sea `Foo()`. (`obj` es un Registro de Finalización).
> 2. `ReturnIfAbrupt(obj)`.
> 3. `Bar(obj)`. (Si aún estamos aquí, `obj` es el valor extraído del Registro de Finalización.)
<!-- markdownlint-enable blanks-around-lists -->
:::

Y ahora el [signo de interrogación](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands) entra en juego: `? Foo()` es equivalente a `ReturnIfAbrupt(Foo())`. Usar una abreviatura es práctico: no necesitamos escribir el código de manejo de errores explícitamente cada vez.

De manera similar, `Que val sea ! Foo()` es equivalente a:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Que `val` sea `Foo()`.
> 2. Afirma: `val` no es una finalización abrupta.
> 3. Establece `val` en `val.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Usando este conocimiento, podemos reescribir `Object.prototype.hasOwnProperty` de esta manera:

:::algoritmo-ecmascript
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. Que `P` sea `ToPropertyKey(V)`.
> 2. Si `P` es una finalización abrupta, devuelve `P`.
> 3. Establece `P` en `P.[[Value]]`.
> 4. Que `O` sea `ToObject(this value)`.
> 5. Si `O` es una finalización abrupta, devuelve `O`.
> 6. Establece `O` en `O.[[Value]]`.
> 7. Que `temp` sea `HasOwnProperty(O, P)`.
> 8. Si `temp` es una finalización abrupta, devuelve `temp`.
> 9. Establece `temp` en `temp.[[Value]]`.
> 10. Devuelve `NormalCompletion(temp)`.
:::

…y podemos reescribir `HasOwnProperty` de esta forma:

:::algoritmo-ecmascript
> **`HasOwnProperty(O, P)`**
>
> 1. Asegúrate: `Type(O)` es `Object`.
> 2. Asegúrate: `IsPropertyKey(P)` es `true`.
> 3. Que `desc` sea `O.[[GetOwnProperty]](P)`.
> 4. Si `desc` es una finalización abrupta, devuelve `desc`.
> 5. Establece `desc` en `desc.[[Value]]`.
> 6. Si `desc` es `undefined`, devuelve `NormalCompletion(false)`.
> 7. Devuelve `NormalCompletion(true)`.
:::

También podemos reescribir el método interno `[[GetOwnProperty]]` sin el signo de admiración:

:::algoritmo-ecmascript
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. Que `temp` sea `OrdinaryGetOwnProperty(O, P)`.
> 2. Asegúrate: `temp` no es una finalización abrupta.
> 3. Establece `temp` en `temp.[[Value]]`.
> 4. Devuelve `NormalCompletion(temp)`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Aquí asumimos que `temp` es una variable temporal completamente nueva que no colisiona con nada más.

También hemos usado el conocimiento de que cuando una declaración de retorno devuelve algo diferente de un Registro de Finalización, se envuelve implícitamente dentro de un `NormalCompletion`.

### Desvío: `Return ? Foo()`

La especificación usa la notación `Return ? Foo()` — ¿por qué el signo de interrogación?

`Return ? Foo()` se expande a:

:::algoritmo-ecmascript
<!-- markdownlint-disable blanks-around-lists -->
> 1. Que `temp` sea `Foo()`.
> 2. Si `temp` es una finalización abrupta, devuelve `temp`.
> 3. Establece `temp` en `temp.[[Value]]`.
> 4. Devuelve `NormalCompletion(temp)`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Lo cual es lo mismo que `Return Foo()`; se comporta de la misma manera para ambas finalizaciones abruptas y normales.

`Return ? Foo()` se usa solo por razones editoriales, para hacer más explícito que `Foo` devuelve un Registro de Finalización.

## Afirmaciones

Las afirmaciones en la especificación aseguran condiciones invariantes de los algoritmos. Se agregan para mayor claridad, pero no añaden ningún requisito a la implementación; la implementación no necesita verificarlas.

## Continuamos

Las operaciones abstractas delegan en otras operaciones abstractas (ver imagen abajo), pero basándonos en este artículo del blog deberíamos ser capaces de determinar lo que hacen. Nos encontraremos con Descriptores de Propiedades, que son solo otro tipo de especificación.

![Gráfico de llamadas a partir de `Object.prototype.hasOwnProperty`](/_img/understanding-ecmascript-part-1/call-graph.svg)

## Resumen

Leímos un método simple — `Object.prototype.hasOwnProperty` — y **operaciones abstractas** que invoca. Nos familiarizamos con las abreviaturas `?` y `!` relacionadas con el manejo de errores. Nos encontramos con **tipos de lenguaje**, **tipos de especificación**, **ranuras internas** y **métodos internos**.

## Enlaces útiles

[Cómo leer la especificación de ECMAScript](https://timothygu.me/es-howto/): un tutorial que cubre gran parte del material tratado en esta entrada, desde un ángulo ligeramente diferente.
