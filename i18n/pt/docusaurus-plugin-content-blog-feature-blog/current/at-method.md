---
title: 'Método `at` para indexação relativa'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2021-07-13
tags:
  - ECMAScript
description: 'O JavaScript agora possui um método de indexação relativa para Arrays, TypedArrays e Strings.'
---

O novo método `at` em `Array.prototype`, nos diversos protótipos de TypedArray e em `String.prototype` torna mais fácil e conciso acessar um elemento próximo ao final da coleção.

Acessar o N-ésimo elemento a partir do final de uma coleção é uma operação comum. No entanto, as formas usuais de fazê-lo são verbosas, como `my_array[my_array.length - N]`, ou podem não ser performáticas, como `my_array.slice(-N)[0]`. O novo método `at` torna essa operação mais ergonômica ao interpretar índices negativos como significando "a partir do final". Os exemplos anteriores podem ser expressos como `my_array.at(-N)`.

<!--truncate-->
Para uniformidade, índices positivos também são suportados e são equivalentes ao acesso de propriedade ordinário.

Este novo método é tão pequeno que sua semântica completa pode ser entendida pela seguinte implementação compatível de polyfill abaixo:

```js
function at(n) {
  // Converte o argumento para um inteiro
  n = Math.trunc(n) || 0;
  // Permite indexação negativa a partir do final
  if (n < 0) n += this.length;
  // Acesso fora dos limites retorna undefined
  if (n < 0 || n >= this.length) return undefined;
  // Caso contrário, este é apenas um acesso normal à propriedade
  return this[n];
}
```

## Uma palavra sobre Strings

Como `at` realiza, em última análise, uma indexação ordinária, chamar `at` em valores de String retorna unidades de código, assim como a indexação ordinária faria. E, como na indexação ordinária em Strings, unidades de código podem não ser o que você deseja para strings Unicode! Considere se [`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt) é mais apropriado para o seu caso de uso.

## Suporte ao método `at`

<feature-support chrome="92"
                 firefox="90"
                 safari="no"
                 nodejs="no"
                 babel="sim https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
