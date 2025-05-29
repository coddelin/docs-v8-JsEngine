---
title: &apos;`JSON.stringify` bien formado&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: &apos;JSON.stringify ahora produce secuencias de escape para sustitutos solitarios, haciendo que su salida sea Unicode válido (y representable en UTF-8).&apos;
---
`JSON.stringify` anteriormente estaba especificado para devolver cadenas Unicode mal formadas si la entrada contenía algún sustituto solitario:

```js
JSON.stringify(&apos;\uD800&apos;);
// → &apos;"�"&apos;
```

[La propuesta de “`JSON.stringify` bien formado”](https://github.com/tc39/proposal-well-formed-stringify) cambia `JSON.stringify` para que produzca secuencias de escape para sustitutos solitarios, haciendo que su salida sea Unicode válido (y representable en UTF-8):

<!--truncate-->
```js
JSON.stringify(&apos;\uD800&apos;);
// → &apos;"\\ud800"&apos;
```

Tenga en cuenta que `JSON.parse(stringified)` sigue produciendo los mismos resultados que antes.

Esta característica es una pequeña corrección que llevaba mucho tiempo pendiente en JavaScript. Es una cosa menos de la que preocuparse como desarrollador de JavaScript. En combinación con [_JSON ⊂ ECMAScript_](/features/subsume-json), permite incrustar de forma segura datos serializados con JSON como literales en programas de JavaScript y escribir el código generado en disco con cualquier codificación compatible con Unicode (por ejemplo, UTF-8). Esto es súper útil para [casos de uso de metaprogramación](/features/subsume-json#embedding-json).

## Compatibilidad de la característica

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
