---
title: "`String.prototype.replaceAll`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-11-11
tags: 
  - ECMAScript
  - ES2021
  - Node.js 16
description: "JavaScript ahora tiene soporte de primera clase para la sustitución global de subcadenas a través de la nueva API `String.prototype.replaceAll`."
tweet: "1193917549060280320"
---
Si alguna vez has trabajado con cadenas en JavaScript, es probable que te hayas encontrado con el método `String#replace`. `String.prototype.replace(searchValue, replacement)` devuelve una cadena con algunas coincidencias reemplazadas, basándose en los parámetros que especifiques:

<!--truncate-->
```js
'abc'.replace('b', '_');
// → 'a_c'

'🍏🍋🍊🍓'.replace('🍏', '🥭');
// → '🥭🍋🍊🍓'
```

Un caso de uso común es reemplazar _todas_ las instancias de una subcadena dada. Sin embargo, `String#replace` no aborda directamente este caso de uso. Cuando `searchValue` es una cadena, solo se reemplaza la primera aparición de la subcadena:

```js
'aabbcc'.replace('b', '_');
// → 'aa_bcc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace('🍏', '🥭');
// → '🥭🍏🍋🍋🍊🍊🍓🍓'
```

Para resolver esto, los desarrolladores a menudo convierten la cadena de búsqueda en una expresión regular con el indicador global (`g`). De esta manera, `String#replace` reemplaza _todas_ las coincidencias:

```js
'aabbcc'.replace(/b/g, '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace(/🍏/g, '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'
```

Como desarrollador, es molesto tener que hacer esta conversión de cadena a expresión regular si lo único que realmente deseas es un reemplazo global de subcadenas. Más importante aún, esta conversión es propensa a errores y una fuente común de problemas. Considera el siguiente ejemplo:

```js
const queryString = 'q=query+string+parameters';

queryString.replace('+', ' ');
// → 'q=query string+parameters' ❌
// Solo se reemplaza la primera aparición.

queryString.replace(/+/, ' ');
// → SyntaxError: expresión regular inválida ❌
// Resulta que `+` es un carácter especial dentro de los patrones de expresión regular.

queryString.replace(/\+/, ' ');
// → 'q=query string+parameters' ❌
// Escapar los caracteres especiales de expresión regular hace que la expresión sea válida, pero
// esto todavía reemplaza solo la primera aparición de `+` en la cadena.

queryString.replace(/\+/g, ' ');
// → 'q=query string parameters' ✅
// Escapar los caracteres especiales de expresión regular Y usar el indicador `g` hace que funcione.
```

Convertir un literal de cadena como `'+'` en una expresión regular global no es solo cuestión de quitar las comillas `'`, envolverlo en barras `/` y agregar el indicador `g`, sino que debemos escapar cualquier carácter que tenga un significado especial en las expresiones regulares. Esto es fácil de olvidar y difícil de realizar correctamente, ya que JavaScript no ofrece un mecanismo incorporado para escapar patrones de expresión regular.

Una alternativa es combinar `String#split` con `Array#join`:

```js
const queryString = 'q=query+string+parameters';
queryString.split('+').join(' ');
// → 'q=query string parameters'
```

Este enfoque evita cualquier escape, pero implica el trabajo adicional de dividir la cadena en una matriz de partes solo para volver a unirla.

Claramente, ninguna de estas alternativas es ideal. ¿No sería genial si una operación básica como el reemplazo global de subcadenas fuera sencilla en JavaScript?

## `String.prototype.replaceAll`

El nuevo método `String#replaceAll` resuelve estos problemas y proporciona un mecanismo directo para realizar reemplazos globales de subcadenas:

```js
'aabbcc'.replaceAll('b', '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replaceAll('🍏', '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'

const queryString = 'q=query+string+parameters';
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

Para mantener la consistencia con las API preexistentes en el lenguaje, `String.prototype.replaceAll(searchValue, replacement)` se comporta exactamente como `String.prototype.replace(searchValue, replacement)`, con las siguientes dos excepciones:

1. Si `searchValue` es una cadena, entonces `String#replace` solo reemplaza la primera aparición de la subcadena, mientras que `String#replaceAll` reemplaza _todas_ las ocurrencias.
1. Si `searchValue` es una expresión regular no global, entonces `String#replace` reemplaza solo una coincidencia, similar a cómo se comporta con cadenas. Por otro lado, `String#replaceAll` lanza una excepción en este caso, ya que probablemente sea un error: si realmente deseas "reemplazar todas" las coincidencias, usarías una expresión regular global; si solo deseas reemplazar una única coincidencia, puedes usar `String#replace`.

La pieza importante de la nueva funcionalidad radica en ese primer punto. `String.prototype.replaceAll` enriquece JavaScript con soporte de primera clase para reemplazos globales de subcadenas, sin necesidad de expresiones regulares ni alternativas.

## Una nota sobre los patrones especiales de reemplazo

Vale la pena mencionar: tanto `replace` como `replaceAll` admiten [patrones especiales de reemplazo](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement). Aunque estos son más útiles en combinación con expresiones regulares, algunos de ellos (`$$`, `$&`, ``$` ``, y `$'`) también tienen efecto al realizar un reemplazo de cadena simple, lo cual puede ser sorprendente:

```js
'xyz'.replaceAll('y', '$$');
// → 'x$z' (no 'x$$z')
```

En caso de que tu cadena de reemplazo contenga uno de estos patrones, y desees usarlos tal cual, puedes desactivar el comportamiento mágico de sustitución utilizando una función reemplazadora que devuelva la cadena:

```js
'xyz'.replaceAll('y', () => '$$');
// → 'x$$z'
```

## Compatibilidad con `String.prototype.replaceAll`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
