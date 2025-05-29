---
title: "Entendiendo la especificación ECMAScript, parte 3"
author: "[Marja Hölttä](https://twitter.com/marjakh), espectadora especulativa de especificaciones"
avatars: 
  - marja-holtta
date: 2020-04-01
tags: 
  - ECMAScript
  - Entendiendo ECMAScript
description: "Tutorial sobre cómo leer la especificación de ECMAScript"
tweet: "1245400717667577857"
---

[Todos los episodios](/blog/tags/understanding-ecmascript)

En este episodio, profundizaremos en la definición del lenguaje ECMAScript y su sintaxis. Si no estás familiarizado con las gramáticas libres de contexto, ahora es un buen momento para revisar los conceptos básicos, ya que la especificación utiliza gramáticas libres de contexto para definir el lenguaje. Consulta [el capítulo sobre gramáticas libres de contexto en "Crafting Interpreters"](https://craftinginterpreters.com/representing-code.html#context-free-grammars) para una introducción accesible o la [página de Wikipedia](https://en.wikipedia.org/wiki/Context-free_grammar) para una definición más matemática.

<!--truncate-->
## Gramáticas de ECMAScript

La especificación ECMAScript define cuatro gramáticas:

La [gramática léxica](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar) describe cómo los [puntos de código Unicode](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology) se traducen en una secuencia de **elementos de entrada** (tokens, terminadores de línea, comentarios, espacios en blanco).

La [gramática sintáctica](https://tc39.es/ecma262/#sec-syntactic-grammar) define cómo los programas sintácticamente correctos se componen de tokens.

La [gramática RegExp](https://tc39.es/ecma262/#sec-patterns) describe cómo los puntos de código Unicode se traducen en expresiones regulares.

La [gramática de cadenas numéricas](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type) describe cómo las cadenas se traducen en valores numéricos.

Cada gramática se define como una gramática libre de contexto, que consiste en un conjunto de producciones.

Las gramáticas utilizan una notación ligeramente diferente: la gramática sintáctica usa `LeftHandSideSymbol :` mientras que la gramática léxica y la gramática RegExp usan `LeftHandSideSymbol ::` y la gramática de cadenas numéricas usa `LeftHandSideSymbol :::`.

A continuación, veremos en más detalle la gramática léxica y la gramática sintáctica.

## Gramática léxica

La especificación define el texto fuente de ECMAScript como una secuencia de puntos de código Unicode. Por ejemplo, los nombres de las variables no están limitados a caracteres ASCII sino que también pueden incluir otros caracteres Unicode. La especificación no menciona la codificación real (por ejemplo, UTF-8 o UTF-16). Asume que el código fuente ya se ha convertido en una secuencia de puntos de código Unicode según la codificación que tenía.

No es posible tokenizar el código fuente de ECMAScript de antemano, lo que hace que definir la gramática léxica sea un poco más complicado.

Por ejemplo, no podemos determinar si `/` es el operador de división o el inicio de una expresión regular sin mirar el contexto más amplio en el que ocurre:

```js
const x = 10 / 5;
```

Aquí `/` es un `DivPunctuator`.

```js
const r = /foo/;
```

Aquí el primer `/` es el inicio de un `RegularExpressionLiteral`.

Las plantillas introducen una ambigüedad similar: la interpretación de <code>}`</code> depende del contexto en el que ocurre:

```js
const what1 = 'temp';
const what2 = 'late';
const t = `Soy un ${ what1 + what2 }`;
```

Aquí <code>`Soy un ${`</code> es `TemplateHead` y <code>}`</code> es un `TemplateTail`.

```js
if (0 == 1) {
}`no muy útil`;
```

Aquí `}` es un `RightBracePunctuator` y <code>`</code> es el inicio de un `NoSubstitutionTemplate`.

Aunque la interpretación de `/` y <code>}`</code> depende de su “contexto” — su posición en la estructura sintáctica del código — las gramáticas que describiremos a continuación siguen siendo libres de contexto.

La gramática léxica utiliza varios símbolos meta para distinguir entre los contextos donde algunos elementos de entrada están permitidos y otros no. Por ejemplo, el símbolo meta `InputElementDiv` se utiliza en contextos donde `/` es una división y `/=` es una asignación de división. Las producciones de [`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv) enumeran los posibles tokens que pueden ser producidos en este contexto:

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

En este contexto, encontrar `/` produce el elemento de entrada `DivPunctuator`. Producir un `RegularExpressionLiteral` no es una opción aquí.

Por otro lado, [`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp) es el símbolo meta para los contextos donde `/` es el inicio de una expresión regular:

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

Como vemos en las producciones, es posible que esto produzca el elemento de entrada `RegularExpressionLiteral`, pero producir `DivPunctuator` no es posible.

Del mismo modo, existe otro símbolo objetivo, `InputElementRegExpOrTemplateTail`, para contextos donde se permiten `TemplateMiddle` y `TemplateTail`, además de `RegularExpressionLiteral`. Y finalmente, `InputElementTemplateTail` es el símbolo objetivo para contextos donde solo se permiten `TemplateMiddle` y `TemplateTail`, pero no se permite `RegularExpressionLiteral`.

En las implementaciones, el analizador de gramática sintáctica ("parser") puede llamar al analizador de gramática léxica ("tokenizador" o "lexer"), pasando el símbolo objetivo como parámetro y solicitando el siguiente elemento de entrada adecuado para ese símbolo objetivo.

## Gramática sintáctica

Hemos analizado la gramática léxica, que define cómo construimos tokens a partir de puntos de código Unicode. La gramática sintáctica se basa en esto: define cómo los programas sintácticamente correctos están compuestos por tokens.

### Ejemplo: Permitir identificadores heredados

Introducir una nueva palabra clave en la gramática es un cambio potencialmente perjudicial: ¿qué pasa si el código existente ya utiliza la palabra clave como un identificador?

Por ejemplo, antes de que `await` fuera una palabra clave, alguien podría haber escrito el siguiente código:

```js
function old() {
  var await;
}
```

La gramática de ECMAScript agregó cuidadosamente la palabra clave `await` de tal manera que este código sigue funcionando. Dentro de funciones asincrónicas, `await` es una palabra clave, por lo que esto no funciona:

```js
async function modern() {
  var await; // Error de sintaxis
}
```

Permitir `yield` como un identificador en funciones no generadoras y desactivarlo en generadoras funciona de manera similar.

Entender cómo se permite `await` como identificador requiere comprender la notación de gramática sintáctica específica de ECMAScript. ¡Vamos a profundizar en ello!

### Producciones y abreviaturas

Veamos cómo se definen las producciones para [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement). A primera vista, la gramática puede parecer un poco intimidante:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

¿Qué significan los subíndices (`[Yield, Await]`) y prefijos (`+` en `+In` y `?` en `?Async`)?

La notación se explica en la sección [Notación de gramática](https://tc39.es/ecma262/#sec-grammar-notation).

Los subíndices son una abreviatura para expresar un conjunto de producciones, para un conjunto de símbolos del lado izquierdo, todo a la vez. El símbolo del lado izquierdo tiene dos parámetros, que se expanden en cuatro símbolos "reales" del lado izquierdo: `VariableStatement`, `VariableStatement_Yield`, `VariableStatement_Await` y `VariableStatement_Yield_Await`.

Nota que aquí el `VariableStatement` simple significa "`VariableStatement` sin `_Await` y `_Yield`". No debe confundirse con <code>VariableStatement<sub>[Yield, Await]</sub></code>.

En el lado derecho de la producción, vemos la abreviatura `+In`, que significa "usar la versión con `_In`", y `?Await`, que significa “usar la versión con `_Await` si y solo si el símbolo del lado izquierdo tiene `_Await`” (similar con `?Yield`).

La tercera abreviatura, `~Foo`, que significa "usar la versión sin `_Foo`", no se utiliza en esta producción.

Con esta información, podemos expandir las producciones así:

```grammar
VariableStatement :
  var VariableDeclarationList_In ;

VariableStatement_Yield :
  var VariableDeclarationList_In_Yield ;

VariableStatement_Await :
  var VariableDeclarationList_In_Await ;

VariableStatement_Yield_Await :
  var VariableDeclarationList_In_Yield_Await ;
```

En última instancia, necesitamos averiguar dos cosas:

1. ¿Dónde se decide si estamos en el caso con `_Await` o sin `_Await`?
2. ¿Dónde hace una diferencia, dónde divergen las producciones para `Something_Await` y `Something` (sin `_Await`)?

### `_Await` o no `_Await`?

Abordemos primero la pregunta 1. Es algo fácil adivinar que las funciones no asincrónicas y las funciones asincrónicas difieren en si elegimos el parámetro `_Await` para el cuerpo de la función o no. Al leer las producciones para declaraciones de funciones asincrónicas, encontramos [esto](https://tc39.es/ecma262/#prod-AsyncFunctionBody):

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

Cabe señalar que `AsyncFunctionBody` no tiene parámetros: se agregan al `FunctionBody` en el lado derecho.

Si expandimos esta producción, obtenemos:

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

En otras palabras, las funciones asincrónicas tienen `FunctionBody_Await`, lo que significa un cuerpo de función donde `await` se trata como una palabra clave.

Por otro lado, si estamos dentro de una función no asincrónica, [la producción relevante](https://tc39.es/ecma262/#prod-FunctionDeclaration) es:

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

(La `FunctionDeclaration` tiene otra producción, pero no es relevante para nuestro ejemplo de código).

Para evitar una expansión combinatoria, ignoremos el parámetro `Default`, que no se utiliza en esta producción en particular.

La forma expandida de la producción es:

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield_Await :
  function BindingIdentifier_Yield_Await ( FormalParameters ) { FunctionBody }
```

En esta producción siempre obtenemos `FunctionBody` y `FormalParameters` (sin `_Yield` y sin `_Await`), ya que están parametrizados con `[~Yield, ~Await]` en la producción no expandida.

El nombre de la función se trata de manera diferente: obtiene los parámetros `_Await` y `_Yield` si el símbolo del lado izquierdo los tiene.

En resumen: Las funciones async tienen un `FunctionBody_Await` y las funciones no-async tienen un `FunctionBody` (sin `_Await`). Dado que estamos hablando de funciones no generadoras, tanto nuestra función async de ejemplo como nuestra función no-async de ejemplo están parametrizadas sin `_Yield`.

Quizás sea difícil recordar cuál es `FunctionBody` y cuál `FunctionBody_Await`. ¿`FunctionBody_Await` es para una función donde `await` es un identificador o para una función donde `await` es una palabra clave?

Puedes pensar en el parámetro `_Await` como "`await` es una palabra clave". Este enfoque también es a prueba de futuro. Imagina una nueva palabra clave, `blob` siendo agregada, pero solo dentro de funciones "blobby". Las funciones no-blobby no-async no generadoras aún tendrían `FunctionBody` (sin `_Await`, `_Yield` o `_Blob`), exactamente igual que ahora. Las funciones blobby tendrían un `FunctionBody_Blob`, las funciones async blobby tendrían `FunctionBody_Await_Blob` y así sucesivamente. Aún necesitaríamos agregar el subíndice `Blob` a las producciones, pero las formas expandidas de `FunctionBody` para funciones ya existentes permanecen igual.

### Prohibir `await` como identificador

A continuación, necesitamos averiguar cómo `await` se prohíbe como identificador si estamos dentro de un `FunctionBody_Await`.

Podemos seguir las producciones más adelante para ver que el parámetro `_Await` se transmite sin cambios desde `FunctionBody` hasta la producción de `VariableStatement` que estábamos mirando previamente.

Por lo tanto, dentro de una función async, tendremos un `VariableStatement_Await` y dentro de una función no-async, tendremos un `VariableStatement`.

Podemos seguir las producciones más adelante y mantener un registro de los parámetros. Ya hemos visto las producciones para [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement):

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

Todas las producciones para [`VariableDeclarationList`](https://tc39.es/ecma262/#prod-VariableDeclarationList) simplemente llevan los parámetros tal como están:

```grammar
VariableDeclarationList[In, Yield, Await] :
  VariableDeclaration[?In, ?Yield, ?Await]
```

(Aquí mostramos solo la [producción](https://tc39.es/ecma262/#prod-VariableDeclaration) relevante para nuestro ejemplo.)

```grammar
VariableDeclaration[In, Yield, Await] :
  BindingIdentifier[?Yield, ?Await] Initializer[?In, ?Yield, ?Await] opt
```

El shorthand `opt` significa que el símbolo del lado derecho es opcional; de hecho hay dos producciones, una con el símbolo opcional y otra sin él.

En el caso simple relevante para nuestro ejemplo, `VariableStatement` consiste en la palabra clave `var`, seguida de un único `BindingIdentifier` sin un inicializador, y finalizando con un punto y coma.

Para prohibir o permitir `await` como un `BindingIdentifier`, esperamos terminar con algo como esto:

```grammar
BindingIdentifier_Await :
  Identifier
  yield

BindingIdentifier :
  Identifier
  yield
  await
```

Esto prohibiría `await` como un identificador dentro de funciones async y lo permitiría como un identificador dentro de funciones no-async.

Pero la especificación no lo define de esta manera, en cambio encontramos esta [producción](https://tc39.es/ecma262/#prod-BindingIdentifier):

```grammar
BindingIdentifier[Yield, Await] :
  Identifier
  yield
  await
```

Expandido, esto significa las siguientes producciones:

```grammar
BindingIdentifier_Await :
  Identifier
  yield
  await

BindingIdentifier :
  Identifier
  yield
  await
```

(Estamos omitiendo las producciones para `BindingIdentifier_Yield` y `BindingIdentifier_Yield_Await` que no son necesarias en nuestro ejemplo.)

Esto parece como si `await` y `yield` siempre se permitieran como identificadores. ¿Qué pasa con eso? ¿Todo el artículo del blog no sirve de nada?

### La semántica estática al rescate

Resulta que se necesitan **semánticas estáticas** para prohibir `await` como identificador dentro de funciones async.

Las semánticas estáticas describen reglas estáticas — es decir, reglas que se verifican antes de que el programa se ejecute.

En este caso, las [semánticas estáticas para `BindingIdentifier`](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors) definen la siguiente regla dirigida por la sintaxis:

> ```grammar
> BindingIdentifier[Yield, Await] : await
> ```
>
> Es un error de sintaxis si esta producción tiene un <code><sub>[Await]</sub></code> parámetro.

Efectivamente, esto prohíbe la producción `BindingIdentifier_Await : await`.

La especificación explica que la razón de tener esta producción pero definirla como un Error de Sintaxis mediante la semántica estática es debido a la interferencia con la inserción automática de punto y coma (ASI).

Recuerda que la ASI entra en acción cuando no podemos analizar una línea de código de acuerdo con las producciones de la gramática. La ASI intenta agregar puntos y comas para satisfacer el requisito de que las declaraciones y sentencias deben terminar con un punto y coma. (Describiremos la ASI en más detalle en un episodio posterior).

Considera el siguiente código (ejemplo de la especificación):

```js
async function too_few_semicolons() {
  let
  await 0;
}
```

Si la gramática no permitiera `await` como identificador, la ASI actuaría y transformaría el código en el siguiente código gramaticalmente correcto, que también usa `let` como identificador:

```js
async function too_few_semicolons() {
  let;
  await 0;
}
```

Este tipo de interferencia con la ASI fue considerada demasiado confusa, por lo que se utilizaron semánticas estáticas para deshabilitar `await` como identificador.

### Valores de cadena de identificadores no permitidos (`StringValues`)

También hay otra regla relacionada:

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> Es un Error de Sintaxis si esta producción tiene un parámetro <code><sub>[Await]</sub></code> y el `StringValue` del `Identifier` es `"await"`.

Esto podría ser confuso al principio. [`Identifier`](https://tc39.es/ecma262/#prod-Identifier) se define así:

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName but not ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await` es una `ReservedWord`, entonces ¿cómo puede un `Identifier` ser alguna vez `await`?

Resulta que el `Identifier` no puede ser `await`, pero puede ser otra cosa cuyo `StringValue` sea `"await"` — una representación diferente de la secuencia de caracteres `await`.

[Las semánticas estáticas para nombres de identificadores](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue) definen cómo se calcula el `StringValue` de un nombre de identificador. Por ejemplo, la secuencia de escape Unicode para `a` es `\u0061`, por lo que `\u0061wait` tiene el `StringValue` `"await"`. `\u0061wait` no será reconocido como una palabra clave por la gramática léxica, en cambio será un `Identifier`. Las semánticas estáticas prohíben usarlo como nombre de variable dentro de funciones asincrónicas.

Por lo tanto, esto funciona:

```js
function old() {
  var \u0061wait;
}
```

Y esto no:

```js
async function modern() {
  var \u0061wait; // Error de sintaxis
}
```

## Resumen

En este episodio, nos familiarizamos con la gramática léxica, la gramática sintáctica y las abreviaturas utilizadas para definir la gramática sintáctica. Como ejemplo, analizamos cómo prohibir el uso de `await` como identificador dentro de funciones asincrónicas pero permitirlo dentro de funciones no asincrónicas.

Otras partes interesantes de la gramática sintáctica, como la inserción automática de punto y coma y las gramáticas de cobertura serán tratadas en un episodio posterior. ¡Mantente atento!
