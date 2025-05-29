---
title: 'Encontrando elementos em `Array`s e TypedArrays'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2021-10-27
tags:
  - ECMAScript
description: 'Métodos JavaScript para encontrar elementos em Arrays e TypedArrays'
tweet: '1453354998063149066'
---
## Encontrando elementos desde o início

Encontrar um elemento que satisfaça alguma condição em um `Array` é uma tarefa comum e é feita com os métodos `find` e `findIndex` em `Array.prototype` e nos vários protótipos de TypedArray. `Array.prototype.find` recebe um predicado e retorna o primeiro elemento no array para o qual o predicado retorna `true`. Se o predicado não retornar `true` para nenhum elemento, o método retorna `undefined`.

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex` funciona de forma semelhante, exceto que retorna o índice quando encontrado, e `-1` quando não encontrado. As versões TypedArray de `find` e `findIndex` funcionam exatamente igual, com a única diferença de que operam em instâncias de TypedArray em vez de instâncias de Array.

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## Encontrando elementos desde o final

E se você quiser encontrar o último elemento no `Array`? Este caso de uso frequentemente surge naturalmente, como ao optar por remover duplicados em favor do último elemento, ou sabendo de antemão que o elemento provavelmente está próximo ao final do `Array`. Com o método `find`, uma solução é inverter primeiro o input assim:

```js
inputArray.reverse().find(predicate)
```

No entanto, isso inverte o `inputArray` original no local, o que às vezes é indesejável.

Com os métodos `findLast` e `findLastIndex`, este caso de uso pode ser resolvido de forma direta e ergonômica. Eles se comportam exatamente como seus equivalentes `find` e `findIndex`, exceto que começam sua busca do final do `Array` ou TypedArray.

```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.findLast((element) => element.v % 2 === 0);
// → {v:4}
inputArray.findLast((element) => element.v % 7 === 0);
// → undefined
inputArray.findLastIndex((element) => element.v % 2 === 0);
// → 3
inputArray.findLastIndex((element) => element.v % 7 === 0);
// → -1
```

## Suporte para `findLast` e `findLastIndex`

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
