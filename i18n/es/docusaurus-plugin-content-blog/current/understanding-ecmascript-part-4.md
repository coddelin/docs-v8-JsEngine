---
title: "Comprendiendo la especificación ECMAScript, parte 4"
author: "[Marja Hölttä](https://twitter.com/marjakh), espectadora especulativa de especificaciones"
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - Comprendiendo ECMAScript
description: "Tutorial sobre cómo leer la especificación ECMAScript"
tweet: "1262815621756014594"
---

[Todos los episodios](/blog/tags/understanding-ecmascript)

## Mientras tanto, en otras partes de la Web

[Jason Orendorff](https://github.com/jorendorff) de Mozilla publicó [un excelente análisis en profundidad de las peculiaridades sintácticas de JS](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme). Aunque los detalles de implementación difieran, cada motor JS enfrenta los mismos problemas con estas peculiaridades.

<!--truncate-->
## Gramáticas de cobertura

En este episodio, profundizamos en las *gramáticas de cobertura*. Son una forma de especificar la gramática para construcciones sintácticas que inicialmente parecen ambiguas.

Nuevamente, omitiremos los subíndices para `[In, Yield, Await]` por brevedad, ya que no son importantes para esta publicación del blog. Consulta [parte 3](/blog/understanding-ecmascript-part-3) para una explicación de su significado y uso.

## Miradas limitadas finitas

Por lo general, los analizadores deciden qué producción usar basándose en un número limitado de miradas hacia adelante (una cantidad fija de tokens siguientes).

En algunos casos, el siguiente token determina de manera inequívoca la producción a usar. [Por ejemplo](https://tc39.es/ecma262/#prod-UpdateExpression):

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

Si estamos analizando un `UpdateExpression` y el siguiente token es `++` o `--`, sabemos la producción a usar de inmediato. Si el siguiente token no es ninguno de los dos, aún no es demasiado difícil: podemos analizar un `LeftHandSideExpression` comenzando desde la posición en la que estamos y decidir qué hacer después de haberlo analizado.

Si el token que sigue al `LeftHandSideExpression` es `++`, la producción a usar es `UpdateExpression : LeftHandSideExpression ++`. El caso de `--` es similar. Y si el token que sigue al `LeftHandSideExpression` no es ni `++` ni `--`, usamos la producción `UpdateExpression : LeftHandSideExpression`.

### ¿Lista de parámetros de una función flecha o una expresión entre paréntesis?

Distinguir las listas de parámetros de funciones flecha de las expresiones entre paréntesis es más complicado.

Por ejemplo:

```js
let x = (a,
```

¿Es este el comienzo de una función flecha, como esta?

```js
let x = (a, b) => { return a + b };
```

¿O tal vez es una expresión entre paréntesis, como esta?

```js
let x = (a, 3);
```

Lo que sea que esté entre paréntesis puede ser arbitrariamente largo - no podemos saber qué es en base a una cantidad finita de tokens.

Imaginemos por un momento que tuviéramos las siguientes producciones simples:

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

Ahora no podemos elegir la producción a usar con una limitada mirada hacia adelante. Si tuviéramos que analizar un `AssignmentExpression` y el siguiente token fuera `(`, ¿cómo decidiríamos qué analizar a continuación? Podríamos analizar un `ArrowParameterList` o un `ParenthesizedExpression`, pero nuestra decisión podría ser incorrecta.

### El nuevo símbolo muy permisivo: `CPEAAPL`

La especificación resuelve este problema introduciendo el símbolo `CoverParenthesizedExpressionAndArrowParameterList` (abreviado como `CPEAAPL`). `CPEAAPL` es un símbolo que en realidad es un `ParenthesizedExpression` o un `ArrowParameterList` detrás de escena, pero aún no sabemos cuál de los dos.

Las [producciones](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList) para `CPEAAPL` son muy permisivas, permitiendo todas las construcciones que pueden ocurrir en `ParenthesizedExpression`s y en `ArrowParameterList`s:

```grammar
CPEAAPL :
  ( Expression )
  ( Expression , )
  ( )
  ( ... BindingIdentifier )
  ( ... BindingPattern )
  ( Expression , ... BindingIdentifier )
  ( Expression , ... BindingPattern )
```

Por ejemplo, las siguientes expresiones son válidas `CPEAAPL`s:

```js
// Expresión entre paréntesis y lista de parámetros de función flecha válidas:
(a, b)
(a, b = 1)

// Expresión entre paréntesis válida:
(1, 2, 3)
(function foo() { })

// Lista de parámetros de función flecha válidas:
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// No válidas tampoco, pero aún son `CPEAAPL`s:
(1, ...b)
(1, )
```

La coma final y el `...` pueden ocurrir solo en `ArrowParameterList`. Algunas construcciones, como `b = 1`, pueden aparecer en ambas, pero tienen significados diferentes: dentro de `ParenthesizedExpression` es una asignación, dentro de `ArrowParameterList` es un parámetro con un valor predeterminado. Números y otros `PrimaryExpressions`, que no son nombres de parámetros válidos (ni patrones de desestructuración de parámetros), solo pueden ocurrir en `ParenthesizedExpression`. Pero todos pueden ocurrir dentro de un `CPEAAPL`.

### Usando `CPEAAPL` en producciones

Ahora podemos utilizar el muy permisivo `CPEAAPL` en las [producciones de `AssignmentExpression`](https://tc39.es/ecma262/#prod-AssignmentExpression). (Nota: `ConditionalExpression` lleva a `PrimaryExpression` a través de una larga cadena de producción que no se muestra aquí.)

```grammar
AssignmentExpression :
  ConditionalExpression
  ArrowFunction
  ...

ArrowFunction :
  ArrowParameters => ConciseBody

ArrowParameters :
  BindingIdentifier
  CPEAAPL

PrimaryExpression :
  ...
  CPEAAPL

```

Imagina que nuevamente estamos en la situación de necesitar analizar un `AssignmentExpression` y el siguiente token es `(`. Ahora podemos analizar un `CPEAAPL` y determinar posteriormente qué producción usar. No importa si estamos analizando un `ArrowFunction` o un `ConditionalExpression`, el próximo símbolo a analizar es `CPEAAPL` en cualquier caso.

Después de haber analizado el `CPEAAPL`, podemos decidir qué producción usar para el `AssignmentExpression` original (el que contiene el `CPEAAPL`). Esta decisión se toma según el token que sigue al `CPEAAPL`.

Si el token es `=>`, usamos la producción:

```grammar
AssignmentExpression :
  ArrowFunction
```

Si el token es otra cosa, usamos la producción:

```grammar
AssignmentExpression :
  ConditionalExpression
```

Por ejemplo:

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             El token que sigue al CPEAAPL

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            El token que sigue al CPEAAPL
```

En ese punto podemos mantener el `CPEAAPL` tal como está y continuar analizando el resto del programa. Por ejemplo, si el `CPEAAPL` está dentro de un `ArrowFunction`, aún no necesitamos verificar si es una lista de parámetros válida para una función flecha - eso puede hacerse más adelante. (Los analizadores en el mundo real podrían optar por realizar la verificación de validez de inmediato, pero desde el punto de vista de la especificación, no necesitamos hacerlo).

### Restringiendo los CPEAAPLs

Como vimos anteriormente, las producciones de gramática para `CPEAAPL` son muy permisivas y permiten construcciones (como `(1, ...a)`) que nunca son válidas. Después de haber analizado el programa según la gramática, necesitamos descartar las construcciones ilegales correspondientes.

La especificación hace esto añadiendo las siguientes restricciones:

:::ecmascript-algorithm
> [Semánticas Estáticas: Errores Tempranos](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> Es un Error de Sintaxis si `CPEAAPL` no está cubriendo un `ParenthesizedExpression`.

:::ecmascript-algorithm
> [Sintaxis Suplementaria](https://tc39.es/ecma262/#sec-primary-expression)
>
> Al procesar una instancia de la producción
>
> `PrimaryExpression : CPEAAPL`
>
> la interpretación de `CPEAAPL` se refina usando la siguiente gramática:
>
> `ParenthesizedExpression : ( Expression )`

Esto significa que: si un `CPEAAPL` ocurre en el lugar de `PrimaryExpression` en el árbol de sintaxis, en realidad es un `ParenthesizedExpression` y esta es su única producción válida.

`Expression` nunca puede estar vacío, por lo que `( )` no es un `ParenthesizedExpression` válido. Las listas separadas por comas como `(1, 2, 3)` se crean mediante [el operador coma](https://tc39.es/ecma262/#sec-comma-operator):

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

De manera similar, si un `CPEAAPL` ocurre en el lugar de `ArrowParameters`, se aplican las siguientes restricciones:

:::ecmascript-algorithm
> [Semánticas Estáticas: Errores Tempranos](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> Es un Error de Sintaxis si `CPEAAPL` no está cubriendo un `ArrowFormalParameters`.

:::ecmascript-algorithm
> [Sintaxis Suplementaria](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> Cuando se reconoce la producción
>
> `ArrowParameters` : `CPEAAPL`
>
> se utiliza la siguiente gramática para refinar la interpretación de `CPEAAPL`:
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### Otras gramáticas de cobertura

Además de `CPEAAPL`, la especificación utiliza gramáticas de cobertura para otros constructos que parecen ambiguos.

`ObjectLiteral` se utiliza como gramática de cobertura para `ObjectAssignmentPattern`, que ocurre dentro de las listas de parámetros de funciones flecha. Esto significa que `ObjectLiteral` permite construcciones que no pueden ocurrir dentro de literales de objeto reales.

```grammar
ObjectLiteral :
  ...
  { PropertyDefinitionList }

PropertyDefinition :
  ...
  CoverInitializedName

CoverInitializedName :
  IdentifierReference Initializer

Initializer :
  = AssignmentExpression
```

Por ejemplo:

```js
let o = { a = 1 }; // error de sintaxis

// Función flecha con un parámetro de desestructuración con un valor
// predeterminado:
let f = ({ a = 1 }) => { return a; };
f({}); // devuelve 1
f({a : 6}); // devuelve 6
```

Las funciones flecha asíncronas también parecen ambiguas con una anticipación finita:

```js
let x = async(a,
```

¿Es esto una llamada a una función llamada `async` o una función flecha asíncrona?

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

Con este fin, la gramática define un símbolo de gramática de cobertura `CoverCallExpressionAndAsyncArrowHead` que funciona de manera similar a `CPEAAPL`.

## Resumen

En este episodio examinamos cómo la especificación define las gramáticas de cobertura y las usa en casos donde no podemos identificar la construcción sintáctica actual basándonos en una anticipación finita.

En particular, analizamos cómo distinguir las listas de parámetros de funciones flecha de las expresiones entre paréntesis y cómo la especificación utiliza una gramática de cobertura para analizar primero de manera permisiva construcciones aparentemente ambiguas y restringirlas con reglas semánticas estáticas más adelante.
