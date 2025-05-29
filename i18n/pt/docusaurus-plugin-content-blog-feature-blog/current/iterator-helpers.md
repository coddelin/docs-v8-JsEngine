---
title: "Ajuda para Iteradores"
author: "Rezvan Mahdavi Hezaveh"
avatars:
  - "rezvan-mahdavi-hezaveh"
date: 2024-03-27
tags:
  - ECMAScript
description: "Interfaces que ajudam no uso geral e consumo de iteradores."
tweet: ""
---

*Ajuda para iteradores* são uma coleção de novos métodos no protótipo Iterator que ajudam no uso geral de iteradores. Como esses métodos auxiliares estão no protótipo do iterador, qualquer objeto que tenha `Iterator.prototype` em sua cadeia de protótipos (por exemplo, iteradores de arrays) terá os métodos. Nas seções a seguir, explicamos as ajudas para iteradores. Todos os exemplos fornecidos funcionam em uma página de arquivo de blog que inclui uma lista de artigos de blog, ilustrando como as ajudas de iterador são úteis para encontrar e manipular postagens. Você pode testá-los na [página do blog do V8](https://v8.dev/blog)!

<!--truncate-->

## .map(mapperFn)

`map` recebe uma função mapper como argumento. Este auxiliar retorna um iterador de valores com a função mapper aplicada aos valores do iterador original.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtém a lista de postagens, retorna uma lista de seu conteúdo de texto (títulos) e as registra.
for (const post de posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter` recebe uma função de filtro como argumento. Este auxiliar retorna um iterador de valores do iterador original para os quais a função de filtro retornou um valor verdadeiro.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Filtra os artigos de blog que incluem `V8` em seu conteúdo de texto (títulos) e os registra.
for (const post de posts.values().filter((x) => x.textContent.includes('V8'))) {
  console.log(post);
} 
```

## .take(limit)

`take` recebe um número inteiro como argumento. Este auxiliar retorna um iterador de valores do iterador original, até o limite de valores.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Seleciona 10 artigos recentes de blog e os registra.
for (const post de posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop` recebe um número inteiro como argumento. Este auxiliar retorna um iterador de valores do iterador original, começando com o valor após os valores do limite.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Descarta 10 artigos recentes de blog e registra o restante.
for (const post de posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap` recebe uma função mapper como argumento. Este auxiliar retorna um iterador dos valores dos iteradores produzidos aplicando a função mapper aos valores do iterador original. Ou seja, os iteradores retornados pela função mapper são achatados no iterador retornado por este auxiliar.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtém a lista de tags dos artigos de blog e as registra. Cada artigo pode ter mais de
// uma tag.
for (const tag de posts.values().flatMap((x) => x.querySelectorAll('.tag').values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce` recebe uma função redutora e um valor inicial opcional. Este auxiliar retorna um valor como resultado de aplicar a função redutora a cada valor do iterador enquanto mantém o controle do último resultado de aplicar o redutor. O valor inicial é usado como ponto de partida para a função redutora ao processar o primeiro valor do iterador.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtém a lista de tags de todos os posts.
const tagLists = posts.values().flatMap((x) => x.querySelectorAll('.tag').values());

// Obtém o contexto de texto para cada tag na lista.
const tags = tagLists.map((x) => x.textContent);

// Conta os posts com a tag segurança.
const count = tags.reduce((soma , valor) => soma + (valor === 'security' ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray` retorna um array de valores do iterador.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Cria um array de uma lista de 10 artigos recentes de blog.
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach` recebe uma função como argumento e é aplicada a cada elemento do iterador. Este auxiliar é chamado por seu efeito colateral e retorna `undefined`.

```javascript
// Seleciona a lista de artigos de blog de uma página de arquivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtenha as datas que pelo menos um post do blog foi publicado e registre-as.
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector('time')));
console.log(dates);
```

## .some(fn)

`some` recebe uma função predicado como argumento. Este auxiliar retorna `true` se algum elemento do iterador retornar verdadeiro quando a função for aplicada a ele. O iterador é consumido após a chamada de `some`.

```javascript
// Selecione a lista de posts do blog de uma página de arquivo do blog.
const posts = document.querySelectorAll('li:not(header li)');

// Descubra se o conteúdo do texto (título) de algum post do blog inclui a palavra-chave `Iterators`.
posts.values().some((x) => x.textContent.includes('Iterators'));
```

## .every(fn)

`every` recebe uma função predicado como argumento. Este auxiliar retorna `true` se todos os elementos do iterador retornarem verdadeiro quando a função for aplicada a eles. O iterador é consumido após a chamada de `every`.

```javascript
// Selecione a lista de posts do blog de uma página de arquivo do blog.
const posts = document.querySelectorAll('li:not(header li)');

// Descubra se o conteúdo do texto (título) de todos os posts do blog inclui a palavra-chave `V8`.
posts.values().every((x) => x.textContent.includes('V8'));
```

## .find(fn)

`find` recebe uma função predicado como argumento. Este auxiliar retorna o primeiro valor do iterador para o qual a função retorna um valor verdadeiro, ou `undefined` se nenhum valor do iterador o fizer.

```javascript
// Selecione a lista de posts do blog de uma página de arquivo do blog.
const posts = document.querySelectorAll('li:not(header li)');

// Registre o conteúdo do texto (título) do post recente do blog que inclui a palavra-chave `V8`.
console.log(posts.values().find((x) => x.textContent.includes('V8')).textContent);
```

## Iterator.from(object)

`from` é um método estático e recebe um objeto como argumento. Se o `object` já for uma instância de Iterator, o auxiliar o retorna diretamente. Se o `object` tiver `Symbol.iterator`, o que significa que é iterável, seu método `Symbol.iterator` é chamado para obter o iterador e o auxiliar o retorna. Caso contrário, um novo objeto `Iterator` (que herda de `Iterator.prototype` e possui métodos `next()` e `return()`) é criado para envolver o `object` e o auxiliar o retorna.

```javascript
// Selecione a lista de posts do blog de uma página de arquivo do blog.
const posts = document.querySelectorAll('li:not(header li)');

// Primeiro crie um iterador a partir dos posts. Em seguida, registre o conteúdo do texto (título)
// do post recente do blog que inclui a palavra-chave `V8`.
console.log(Iterator.from(posts).find((x) => x.textContent.includes('V8')).textContent);
```

## Disponibilidade

Os auxiliares de Iterator estão disponíveis no V8 v12.2.

## Suporte aos auxiliares de Iterator

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
