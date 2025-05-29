---
title: 'Índices de coincidencia de RegExp'
author: 'Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), expresando nuevas características regularmente'
avatars:
  - 'maya-armyanova'
date: 2019-12-17
tags:
  - ECMAScript
  - Node.js 16
description: 'Los índices de coincidencia de RegExp proporcionan los índices de `inicio` y `fin` de cada grupo de captura coincidente.'
tweet: '1206970814400270338'
---
JavaScript ahora está equipado con una nueva mejora de expresiones regulares, llamada “índices de coincidencia”. Imagínate que quieres encontrar nombres de variables inválidos en el código JavaScript que coincidan con palabras reservadas, y mostrar un símbolo de intercalación y una “línea de subrayado” debajo del nombre de la variable, como:

<!--truncate-->
```js
const function = foo;
      ^------- Nombre de variable inválido
```

En el ejemplo anterior, `function` es una palabra reservada y no puede usarse como nombre de variable. Para eso podríamos escribir la siguiente función:

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // El índice `1` corresponde al primer grupo de captura.
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // Ajusta la posición del símbolo de intercalación.
    '^' +
    '-'.repeat(end - start - 1) +   // Añadir la línea de subrayado.
    ' ' + message;                  // Añadir el mensaje.
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // código erróneo
displayError(code, 'Nombre de variable inválido');
```

:::note
**Nota:** Para simplificar, el ejemplo anterior contiene solo algunas [palabras reservadas de JavaScript](https://mathiasbynens.be/notes/reserved-keywords).
:::

En resumen, el nuevo array `indices` almacena las posiciones de inicio y fin de cada grupo de captura coincidente. Este nuevo array está disponible cuando la expresión regular de origen utiliza el flag `/d` para todos los productos internos que generen objetos de coincidencia de expresiones regulares, incluidos `RegExp#exec`, `String#match` y [`String#matchAll`](https://v8.dev/features/string-matchall).

Sigue leyendo si estás interesado en cómo funciona en más detalle.

## Motivación

Pasemos a un ejemplo más complejo y pensemos en cómo resolverías la tarea de analizar un lenguaje de programación (por ejemplo, lo que hace el [compilador de TypeScript](https://github.com/microsoft/TypeScript/tree/master/src/compiler)) — primero divide el código fuente de entrada en tokens, luego da una estructura sintáctica a esos tokens. Si el usuario escribió un código sintácticamente incorrecto, querrás presentarle un error significativo, idealmente señalando la ubicación donde se encontró el código problemático por primera vez. Por ejemplo, dado el siguiente fragmento de código:

```js
let foo = 42;
// algún otro código
let foo = 1337;
```

Queremos presentar al programador con un error como:

```js
let foo = 1337;
    ^
SyntaxError: El identificador 'foo' ya ha sido declarado
```

Para lograr esto, necesitamos algunos bloques de construcción, el primero de los cuales es reconocer los identificadores de TypeScript. Luego nos enfocaremos en ubicar el lugar exacto donde ocurrió el error. Consideremos el siguiente ejemplo, usando una expresión regular para saber si una cadena es un identificador válido:

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**Nota:** Un analizador del mundo real podría usar las recién introducidas [escapatorias de propiedades en expresiones regulares](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples) y usar la siguiente expresión regular para coincidir con todos los nombres de identificadores válidos de ECMAScript:

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

Para simplificar, sigamos con nuestra expresión regular anterior, que coincide solo con caracteres latinos, números y guiones bajos.
:::

Si encontramos un error con una declaración de variable como se indicó anteriormente y queremos imprimir la posición exacta al usuario, podríamos querer extender la expresión regular anterior y usar una función similar:

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

Uno podría usar la propiedad `index` en el objeto de coincidencia devuelto por `RegExp.prototype.exec`, que devuelve la posición inicial de toda la coincidencia. Para casos de uso como el descrito anteriormente, sin embargo, a menudo querrás usar (posiblemente múltiples) grupos de captura. Hasta hace poco, JavaScript no exponía los índices donde comienzan y terminan las subcadenas coincidentes por los grupos de captura.

## Explicación de los índices de coincidencia de RegExp

Idealmente queremos imprimir un error en la posición del nombre de la variable, no en la palabra clave `let`/`const` (como hace el ejemplo anterior). Pero para eso necesitaríamos encontrar la posición del grupo de captura con el índice `2`. (El índice `1` se refiere al grupo de captura `(let|const|var)` y `0` se refiere a toda la coincidencia.)

Como se mencionó anteriormente, [la nueva característica de JavaScript](https://github.com/tc39/proposal-regexp-match-indices) agrega una propiedad `indices` al resultado (el array de subcadenas) de `RegExp.prototype.exec()`. Vamos a mejorar nuestro ejemplo de arriba para utilizar esta nueva propiedad:

```js
function getVariablePosition(source) {
  // Note la bandera `d`, que habilita `match.indices`
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition(&apos;let foo&apos;);
// → [4, 7]
```

Este ejemplo devuelve el array `[4, 7]`, que es la posición `[inicio, fin)` de la subcadena coincidente del grupo con índice `2`. Basándonos en esta información, nuestro compilador ahora puede imprimir el error deseado.

## Características adicionales

El objeto `indices` también contiene una propiedad `groups`, que puede ser indexada por los nombres de los [grupos de captura nombrados](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups). Usando esto, la función anterior puede reescribirse de la siguiente manera:

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition(&apos;let foo&apos;);
```

## Soporte para índices de coincidencia de RegExp

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="no"></feature-support>
