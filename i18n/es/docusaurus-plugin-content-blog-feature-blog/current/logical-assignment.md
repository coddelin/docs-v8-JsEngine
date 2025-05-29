---
title: 'Asignación lógica'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2020-05-07
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: 'JavaScript ahora admite asignación compuesta con operaciones lógicas.'
tweet: '1258387483823345665'
---
JavaScript admite una gama de [operadores de asignación compuesta](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators) que permiten a los programadores expresar de manera sucinta una operación binaria junto con la asignación. Actualmente, solo se admiten operaciones matemáticas o de bits.

<!--truncate-->
Lo que ha faltado es la capacidad de combinar operaciones lógicas con asignación. ¡Hasta ahora! JavaScript ahora admite la asignación lógica con los nuevos operadores `&&=`, `||=` y `??=`.

## Operadores de asignación lógica

Antes de explorar los nuevos operadores, hagamos un repaso de los operadores de asignación compuesta existentes. Por ejemplo, el significado de `lhs += rhs` es aproximadamente equivalente a `lhs = lhs + rhs`. Esta equivalencia aproximada se aplica a todos los operadores existentes `@=` donde `@` representa un operador binario como `+`, o `|`. Cabe señalar que esto, estrictamente hablando, solo es correcto cuando `lhs` es una variable. Para lados izquierdos más complejos en expresiones como `obj[computedPropertyName()] += rhs`, el lado izquierdo solo se evalúa una vez.

Ahora vamos a explorar los nuevos operadores. A diferencia de los operadores existentes, `lhs @= rhs` no significa aproximadamente `lhs = lhs @ rhs` cuando `@` es una operación lógica: `&&`, `||`, o `??`.

```js
// Como repaso adicional, aquí están los semánticos del lógico AND:
x && y
// → y cuando x es verdadero
// → x cuando x no es verdadero

// Primero, asignación lógica AND. Las dos líneas siguientes a este
// bloque de comentarios son equivalentes.
// Nota que, al igual que con los operadores de asignación compuesta existentes,
// los lados izquierdos más complejos solo se evalúan una vez.
x &&= y;
x && (x = y);

// Los semánticos del lógico OR:
x || y
// → x cuando x es verdadero
// → y cuando x no es verdadero

// De manera similar, asignación lógica OR:
x ||= y;
x || (x = y);

// Los semánticos del operador de coalescencia de nulo:
x ?? y
// → y cuando x es nulo (null o undefined)
// → x cuando x no es nulo

// Finalmente, asignación de coalescencia de nulo:
x ??= y;
x ?? (x = y);
```

## Semánticos de cortocircuito

A diferencia de sus contrapartes matemáticas y de bits, las asignaciones lógicas siguen el comportamiento de cortocircuito de sus respectivas operaciones lógicas. _Sólo_ realizan una asignación si la operación lógica evaluaría el lado derecho.

Al principio esto puede parecer confuso. ¿Por qué no asignar incondicionalmente al lado izquierdo como en otras asignaciones compuestas?

Hay una buena razón práctica para la diferencia. Al combinar operaciones lógicas con asignación, la asignación puede causar un efecto secundario que debería ocurrir de manera condicional según el resultado de esa operación lógica. Causar el efecto secundario incondicionalmente puede afectar negativamente el rendimiento o incluso la corrección del programa.

Hagamos esto concreto con un ejemplo de dos versiones de una función que establece un mensaje predeterminado en un elemento.

```js
// Mostrar un mensaje predeterminado si no hay nada establecido.
// Solo asigna a innerHTML si está vacío. No causa que los elementos
// internos de msgElement pierdan el foco.
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>No hay mensajes<p>';
}

// Mostrar un mensaje predeterminado si no hay nada establecido.
// ¡Defectuoso! Puede causar que los elementos internos de msgElement
// pierdan el foco cada vez que se llame.
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>No hay mensajes<p>';
}
```

:::note
**Nota:** Debido a que la propiedad `innerHTML` está [especificada](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml) para devolver la cadena vacía en lugar de `null` o `undefined`, se debe usar `||=` en lugar de `??=`. Al escribir código, recuerde que muchas API web no utilizan `null` o `undefined` para significar vacío o inexistente.
:::

En HTML, asignar a la propiedad `.innerHTML` en un elemento es destructivo. Los hijos internos se eliminan y los nuevos hijos que se analizan a partir de la cadena recién asignada se insertan. Incluso cuando la nueva cadena es la misma que la antigua, causa trabajo adicional y que los elementos internos pierdan el foco. Por esta razón práctica de no causar efectos secundarios no deseados, los semánticos de los operadores de asignación lógica cortocircuitan la asignación.

Puede ser útil pensar en la simetría con otros operadores de asignación compuesta de la siguiente manera. Los operadores matemáticos y de bits son incondicionales, y por lo tanto la asignación también es incondicional. Los operadores lógicos son condicionales, y por lo tanto la asignación también es condicional.

## Soporte para asignación lógica

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#New-Features:~:text=Compatibilidad%20con%20los%20operadores%20de%20asignación%20lógica%20añadida."
                 nodejs="16"
                 babel="sí https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
