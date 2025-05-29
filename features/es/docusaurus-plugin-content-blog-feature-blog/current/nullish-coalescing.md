---
title: &apos;Coalescencia nula&apos;
author: &apos;Justin Ridgewell&apos;
avatars:
  - &apos;justin-ridgewell&apos;
date: 2019-09-17
tags:
  - ECMAScript
  - ES2020
description: &apos;El operador de coalescencia nula de JavaScript permite expresiones predeterminadas más seguras.&apos;
tweet: &apos;1173971116865523714&apos;
---
La [propuesta de coalescencia nula](https://github.com/tc39/proposal-nullish-coalescing/) (`??`) agrega un nuevo operador de cortocircuito destinado a manejar valores predeterminados.

Probablemente ya estés familiarizado con los otros operadores de cortocircuito `&&` y `||`. Ambos operadores manejan valores “truthy” y “falsy”. Imagina el ejemplo de código `lhs && rhs`. Si `lhs` (_lado izquierdo_) es falsy, la expresión se evalúa como `lhs`. De lo contrario, se evalúa como `rhs` (_lado derecho_). Lo opuesto ocurre con el ejemplo de código `lhs || rhs`. Si `lhs` es truthy, la expresión se evalúa como `lhs`. De lo contrario, se evalúa como `rhs`.

<!--truncate-->
Pero, ¿qué significan exactamente “truthy” y “falsy”? En términos de la especificación, equivale a la operación abstracta [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean). Para los desarrolladores regulares de JavaScript, **todo** es truthy excepto los valores falsy `undefined`, `null`, `false`, `0`, `NaN`, y la cadena vacía `&apos;&apos;`. (Técnicamente, el valor asociado con `document.all` también es falsy, pero llegaremos a eso más tarde).

Entonces, ¿cuál es el problema con `&&` y `||`? ¿Y por qué necesitamos un nuevo operador de coalescencia nula? Es porque esta definición de truthy y falsy no se ajusta a todos los escenarios y esto conduce a errores. Imagina lo siguiente:

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

En este ejemplo, tratemos la propiedad `enabled` como una propiedad booleana opcional que controla si alguna funcionalidad en el componente está habilitada. Es decir, podemos establecer explícitamente `enabled` como `true` o `false`. Pero, como es una propiedad _opcional_, podemos implícitamente establecerla como `undefined` al no asignarla en absoluto. Si es `undefined`, queremos tratarlo como si el componente tuviera `enabled = true` (su valor predeterminado).

Probablemente ya puedes identificar el error en el ejemplo de código. Si establecemos explícitamente `enabled = true`, entonces la variable `enable` es `true`. Si establecemos implícitamente `enabled = undefined`, entonces la variable `enable` es `true`. ¡Y si establecemos explícitamente `enabled = false`, entonces la variable `enable` sigue siendo `true`! Nuestra intención era _predeterminar_ el valor a `true`, pero en realidad forzamos el valor en su lugar. La solución en este caso es ser muy explícito con los valores que esperamos:

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

Vemos este tipo de errores surgir con todos los valores falsy. Esto podría haberse tratado fácilmente de una cadena opcional (donde la cadena vacía `&apos;&apos;` es considerada una entrada válida), o un número opcional (donde `0` es considerado una entrada válida). Este es un problema tan común que estamos introduciendo el operador de coalescencia nula para manejar este tipo de asignación de valores predeterminados:

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

El operador de coalescencia nula (`??`) actúa de manera muy similar al operador `||`, excepto que no usamos “truthy” al evaluar el operador. En su lugar, usamos la definición de “nulo”, que significa “es el valor estrictamente igual a `null` o `undefined`”. Así que imagina la expresión `lhs ?? rhs`: si `lhs` no es nulo, se evalúa como `lhs`. De lo contrario, se evalúa como `rhs`.

Explícitamente, eso significa que los valores `false`, `0`, `NaN`, y la cadena vacía `&apos;&apos;` son todos valores falsy que no son nulos. Cuando estos valores falsy-pero-no-nulos están en el lado izquierdo de un `lhs ?? rhs`, la expresión se evalúa como ellos en lugar del lado derecho. ¡Adiós a los errores!

```js
false ?? true;   // => false
0 ?? 1;          // => 0
&apos;&apos; ?? &apos;default&apos;; // => &apos;&apos;

null ?? [];      // => []
undefined ?? []; // => []
```

## ¿Qué pasa con la asignación predeterminada al destructurar?

Puede que hayas notado que el último ejemplo de código también se podría haber corregido usando una asignación predeterminada dentro de una desestructuración de objeto:

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

Es un poco extenso, pero sigue siendo completamente válido en JavaScript. Sin embargo, utiliza una semántica ligeramente diferente. La asignación predeterminada dentro de desestructuraciones de objetos verifica si la propiedad es estrictamente igual a `undefined`, y si es así, predetermina la asignación.

Pero estas pruebas de igualdad estricta solo para `undefined` no siempre son deseables, y no siempre hay un objeto disponible para realizar la desestructuración. Por ejemplo, tal vez quieras establecer un valor predeterminado en los valores de retorno de una función (no hay objeto para desestructurar). O tal vez la función devuelva `null` (lo cual es común en las API del DOM). Estas son las situaciones en las que querrás recurrir a la coalescencia nula:

```js
// Coalescencia nula concisa
const link = document.querySelector(&apos;link&apos;) ?? document.createElement(&apos;link&apos;);

// Estructuración predeterminada con plantilla inicial
const {
  link = document.createElement(&apos;link&apos;),
} = {
  link: document.querySelector(&apos;link&apos;) || undefined
};
```

Además, ciertas características nuevas como [chaining opcional](/features/optional-chaining) no funcionan perfectamente con la estructuración. Dado que la estructuración requiere un objeto, debes proteger la estructuración en caso de que el chaining opcional devuelva `undefined` en lugar de un objeto. Con la coalescencia nulosa, no tenemos ese problema:

```js
// Chaining opcional y coalescencia nulosa combinados
const link = obj.deep?.container.link ?? document.createElement(&apos;link&apos;);

// Estructuración predeterminada con chaining opcional
const {
  link = document.createElement(&apos;link&apos;),
} = (obj.deep?.container || {});
```

## Combinar y ajustar operadores

El diseño del lenguaje es complicado, y no siempre podemos crear nuevos operadores sin una cierta cantidad de ambigüedad en la intención del desarrollador. Si alguna vez has combinado los operadores `&&` y `||` juntos, probablemente te hayas encontrado con esta ambigüedad tú mismo. Imagina la expresión `lhs && middle || rhs`. En JavaScript, esto se analiza realmente de la misma manera que la expresión `(lhs && middle) || rhs`. Ahora imagina la expresión `lhs || middle && rhs`. Esta se analiza realmente de la misma manera que `lhs || (middle && rhs)`.

Probablemente puedes ver que el operador `&&` tiene una mayor precedencia para su lado izquierdo y derecho que el operador `||`, lo que significa que los paréntesis implícitos envuelven el `&&` en lugar de el `||`. Al diseñar el operador `??`, tuvimos que decidir cuál sería la precedencia. Podría tener:

1. menor precedencia que ambos `&&` y `||`
1. menor precedencia que `&&` pero mayor que `||`
1. mayor precedencia que ambos `&&` y `||`

Para cada una de estas definiciones de precedencia, luego tuvimos que probarla con los cuatro casos posibles:

1. `lhs && middle ?? rhs`
1. `lhs ?? middle && rhs`
1. `lhs || middle ?? rhs`
1. `lhs ?? middle || rhs`

En cada expresión de prueba, tuvimos que decidir dónde pertenecían los paréntesis implícitos. Y si no envolvían la expresión exactamente de la manera que el desarrollador pretendía, entonces tendríamos un código mal escrito. Desafortunadamente, sin importar el nivel de precedencia que eligiéramos, una de las expresiones de prueba podría violar las intenciones del desarrollador.

Al final, decidimos requerir paréntesis explícitos al combinar `??` y (`&&` o `||`) (¡observa que fui explícito con mi agrupación de paréntesis! ¡broma meta!). Si combinas, debes envolver uno de los grupos de operadores en paréntesis, o obtendrás un error de sintaxis.

```js
// Se requiere grupos explícitos de paréntesis para combinar
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

De esta manera, el analizador del lenguaje siempre coincide con lo que el desarrollador pretendía. Y cualquier persona que lea el código más tarde también puede comprenderlo de inmediato. ¡Genial!

## Háblame sobre `document.all`

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all) es un valor especial que nunca jamás deberías usar. Pero si decides usarlo, es mejor que sepas cómo interactúa con lo “verdadero” y lo “nulo”.

`document.all` es un objeto similar a un array, lo que significa que tiene propiedades indexadas como un array y una longitud. Los objetos generalmente son verdaderos — pero sorprendentemente, `document.all` pretende ser un valor falso. De hecho, es igual en forma laxa a ambos `null` y `undefined` (lo que normalmente significa que no puede tener propiedades en absoluto).

Cuando se usa `document.all` con `&&` o `||`, pretende ser falso. Pero no es estrictamente igual a `null` ni a `undefined`, por lo que no es nulo. Así que cuando se usa `document.all` con `??`, se comporta como cualquier otro objeto lo haría.

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## Soporte para coalescencia nulosa

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="sí https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
