---
title: "Aserciones lookbehind en RegExp"
author: "Yang Guo, Ingeniero de Expresiones Regulares"
avatars:
  - "yang-guo"
date: 2016-02-26 13:33:37
tags:
  - ECMAScript
  - RegExp
description: "Las expresiones regulares en JavaScript están obteniendo nueva funcionalidad: las aserciones lookbehind."
---
Introducidas con la tercera edición de la especificación ECMA-262, las expresiones regulares han sido parte de JavaScript desde 1999. En términos de funcionalidad y expresividad, la implementación de las expresiones regulares en JavaScript refleja aproximadamente la de otros lenguajes de programación.

<!--truncate-->
Una característica en las expresiones regulares de JavaScript que a menudo pasa desapercibida, pero que a veces puede ser bastante útil, son las aserciones lookahead. Por ejemplo, para coincidir con una secuencia de dígitos seguida de un signo de porcentaje, podemos usar `/\d+(?=%)/`. El signo de porcentaje en sí no forma parte del resultado de la coincidencia. Su negación, `/\d+(?!%)/`, coincidiría con una secuencia de dígitos que no esté seguida de un signo de porcentaje:

```js
/\d+(?=%)/.exec('100% de los presidentes de EE.UU. han sido hombres'); // ['100']
/\d+(?!%)/.exec('esos son todos los 44 de ellos');                // ['44']
```

El opuesto del lookahead, las aserciones lookbehind, han estado ausentes en JavaScript, pero están disponibles en otras implementaciones de expresiones regulares, como en el marco .NET. En lugar de leer hacia adelante, el motor de expresiones regulares lee hacia atrás para encontrar la coincidencia dentro de la aserción. Una secuencia de dígitos que sigue a un signo de dólar puede coincidir con `/(?<=\$)\d+/`, donde el signo de dólar no forma parte del resultado de la coincidencia. Su negación, `/(?<!\$)\d+/`, coincide con una secuencia de dígitos que sigue a cualquier cosa excepto a un signo de dólar.

```js
/(?<=\$)\d+/.exec('Benjamin Franklin está en el billete de $100'); // ['100']
/(?<!\$)\d+/.exec('vale aproximadamente €90');                  // ['90']
```

En general, hay dos maneras de implementar las aserciones lookbehind. Perl, por ejemplo, requiere que los patrones lookbehind tengan una longitud fija. Eso significa que los cuantificadores como `*` o `+` no están permitidos. De esta manera, el motor de expresiones regulares puede retroceder por esa longitud fija y hacer coincidir el lookbehind de la misma manera en que haría coincidir un lookahead, desde la posición retrocedida.

El motor de expresiones regulares en el marco .NET toma un enfoque diferente. En lugar de necesitar saber cuántos caracteres coincidirá el patrón lookbehind, simplemente coincide el patrón lookbehind hacia atrás, mientras lee los caracteres en contra de la dirección normal de lectura. Esto significa que el patrón lookbehind puede aprovechar toda la sintaxis de las expresiones regulares y coincidir con patrones de longitud arbitraria.

Claramente, la segunda opción es más poderosa que la primera. Por eso, el equipo de V8 y los defensores de esta característica en TC39 han acordado que JavaScript debería adoptar la versión más expresiva, aunque su implementación sea ligeramente más compleja.

Debido a que las aserciones lookbehind coinciden hacia atrás, hay algunos comportamientos sutiles que de otro modo se considerarían sorprendentes. Por ejemplo, un grupo de captura con un cuantificador captura la última coincidencia. Por lo general, esa es la coincidencia más a la derecha. Pero dentro de una aserción lookbehind, hacemos coincidir de derecha a izquierda, por lo que se captura la coincidencia más a la izquierda:

```js
/h(?=(\w)+)/.exec('hodor');  // ['h', 'r']
/(?<=(\w)+)r/.exec('hodor'); // ['r', 'h']
```

Un grupo de captura puede referirse mediante una referencia inversa después de haber sido capturado. Por lo general, la referencia inversa debe estar a la derecha del grupo de captura. De lo contrario, coincidiría con la cadena vacía, ya que aún no se ha capturado nada. Sin embargo, dentro de una aserción lookbehind, la dirección de coincidencia se invierte:

```js
/(?<=(o)d\1)r/.exec('hodor'); // null
/(?<=\1d(o))r/.exec('hodor'); // ['r', 'o']
```

Las aserciones lookbehind se encuentran actualmente en una etapa muy [temprana](https://github.com/tc39/proposal-regexp-lookbehind) en el proceso de especificación de TC39. Sin embargo, debido a que son una extensión tan obvia de la sintaxis de las expresiones regulares, decidimos priorizar su implementación. Ya puedes experimentar con las aserciones lookbehind ejecutando la versión 4.9 o posterior de V8 con `--harmony`, o habilitando las características experimentales de JavaScript (usa `about:flags`) en Chrome a partir de la versión 49.
