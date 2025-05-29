---
title: '`String.prototype.replaceAll`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-11-11
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: 'O JavaScript agora tem suporte de primeira classe para substituições globais de substrings através da nova API `String.prototype.replaceAll`.'
tweet: '1193917549060280320'
---
Se você já trabalhou com strings em JavaScript, é provável que tenha se deparado com o método `String#replace`. `String.prototype.replace(searchValue, replacement)` retorna uma string com algumas correspondências substituídas, com base nos parâmetros especificados:

<!--truncate-->
```js
'abc'.replace('b', '_');
// → 'a_c'

'🍏🍋🍊🍓'.replace('🍏', '🥭');
// → '🥭🍋🍊🍓'
```

Um caso de uso comum é substituir _todas_ as instâncias de uma determinada substring. No entanto, `String#replace` não aborda diretamente esse caso de uso. Quando `searchValue` é uma string, apenas a primeira ocorrência da substring é substituída:

```js
'aabbcc'.replace('b', '_');
// → 'aa_bcc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace('🍏', '🥭');
// → '🥭🍏🍋🍋🍊🍊🍓🍓'
```

Para contornar isso, os desenvolvedores frequentemente transformam a string de busca em uma expressão regular com a flag global (`g`). Dessa forma, `String#replace` substitui _todas_ as correspondências:

```js
'aabbcc'.replace(/b/g, '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace(/🍏/g, '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'
```

Como desenvolvedor, é irritante ter que fazer essa conversão de string para expressão regular quando tudo o que você realmente quer é uma substituição global de substring. Mais importante, essa conversão é propensa a erros e uma fonte comum de bugs! Considere o seguinte exemplo:

```js
const queryString = 'q=query+string+parameters';

queryString.replace('+', ' ');
// → 'q=query string+parameters' ❌
// Apenas a primeira ocorrência é substituída.

queryString.replace(/+/, ' ');
// → SyntaxError: expressão regular inválida ❌
// Como se vê, `+` é um caractere especial em padrões de expressão regular.

queryString.replace(/\+/, ' ');
// → 'q=query string+parameters' ❌
// Escapar caracteres especiais faz a expressão regular válida, mas
// isso ainda substitui apenas a primeira ocorrência de `+` na string.

queryString.replace(/\+/g, ' ');
// → 'q=query string parameters' ✅
// Escapar caracteres especiais E usar a flag `g` faz funcionar.
```

Transformar um literal de string como `'+`' em uma expressão regular global não é apenas uma questão de remover as aspas `’`, envolvê-lo em barras `/` e adicionar a flag `g` — é necessário escapar quaisquer caracteres que tenham significado especial em expressões regulares. Isso é fácil de esquecer e difícil de fazer corretamente, já que o JavaScript não oferece um mecanismo embutido para escapar padrões de expressão regular.

Uma solução alternativa é combinar `String#split` com `Array#join`:

```js
const queryString = 'q=query+string+parameters';
queryString.split('+').join(' ');
// → 'q=query string parameters'
```

Essa abordagem evita qualquer necessidade de escapar, mas traz o custo adicional de dividir a string em um array de partes só para juntá-la novamente.

Claramente, nenhuma dessas soluções alternativas é ideal. Não seria bom se uma operação básica, como substituição global de substring, fosse simples no JavaScript?

## `String.prototype.replaceAll`

O novo método `String#replaceAll` resolve esses problemas e fornece um mecanismo direto para realizar substituições globais de substring:

```js
'aabbcc'.replaceAll('b', '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replaceAll('🍏', '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'

const queryString = 'q=query+string+parameters';
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

Para manter consistência com as APIs já existentes na linguagem, `String.prototype.replaceAll(searchValue, replacement)` se comporta exatamente como `String.prototype.replace(searchValue, replacement)`, com as seguintes duas exceções:

1. Se `searchValue` é uma string, então `String#replace` substitui apenas a primeira ocorrência da substring, enquanto `String#replaceAll` substitui _todas_ as ocorrências.
1. Se `searchValue` é uma RegExp não-global, então `String#replace` substitui apenas uma única correspondência, semelhante ao comportamento para strings. `String#replaceAll`, por outro lado, lança uma exceção nesse caso, já que provavelmente isso é um erro: se você realmente quer “substituir todas” as correspondências, você usaria uma expressão regular global; se deseja substituir apenas uma única correspondência, pode usar `String#replace`.

A parte importante da nova funcionalidade está no primeiro item. O `String.prototype.replaceAll` aprimora o JavaScript com suporte de primeira classe para substituições globais de substrings, sem a necessidade de expressões regulares ou outras soluções alternativas.

## Uma nota sobre padrões de substituição especiais

Vale a pena destacar: tanto `replace` quanto `replaceAll` suportam [padrões especiais de substituição](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement). Embora esses padrões sejam mais úteis em combinação com expressões regulares, alguns deles (`$$`, `$&`, ``$` ``, e `$'`) também têm efeito ao realizar substituições simples de strings, o que pode ser surpreendente:

```js
'xyz'.replaceAll('y', '$$');
// → 'x$z' (não 'x$$z')
```

Caso sua string de substituição contenha um desses padrões e você queira usá-los como estão, pode desativar o comportamento mágico de substituição usando uma função substituta que retorna a string como está:

```js
'xyz'.replaceAll('y', () => '$$');
// → 'x$$z'
```

## Suporte para `String.prototype.replaceAll`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
