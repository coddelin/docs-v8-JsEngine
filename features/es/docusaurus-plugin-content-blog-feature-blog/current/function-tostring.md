---
title: &apos;Revisión de `Function.prototype.toString`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Function.prototype.toString ahora devuelve fragmentos exactos del texto del código fuente, incluyendo espacios en blanco y comentarios.&apos;
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) ahora devuelve fragmentos exactos del texto del código fuente, incluyendo espacios en blanco y comentarios. Aquí hay un ejemplo que compara el comportamiento antiguo y el nuevo:

<!--truncate-->
```js
// Nota el comentario entre la palabra clave `function`
// y el nombre de la función, así como el espacio que sigue
// al nombre de la función.
function /* un comentario */ foo () {}

// Anteriormente, en V8:
foo.toString();
// → &apos;function foo() {}&apos;
//             ^ sin comentario
//                ^ sin espacio

// Ahora:
foo.toString();
// → &apos;function /* comentario */ foo () {}&apos;
```

## Compatibilidad con la función

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="yes"
                 safari="no"
                 nodejs="8"
                 babel="no"></feature-support>
