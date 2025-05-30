---
title: "Lançamento do V8 v7.3"
author: "Clemens Backes, especialista em compiladores"
avatars: 
  - clemens-backes
date: "2019-02-07 11:30:42"
tags: 
  - lançamento
description: "V8 v7.3 apresenta melhorias de desempenho para WebAssembly e async, rastreamentos de pilha assincrônicos, Object.fromEntries, String#matchAll e muito mais!"
tweet: "1093457099441561611"
---
A cada seis semanas, criamos um novo branch do V8 como parte de nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes de um marco do Chrome Beta. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3), que está em beta até seu lançamento em coordenação com o Chrome 73 Stable em algumas semanas. O V8 v7.3 está repleto de melhorias voltadas aos desenvolvedores. Este post fornece uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## Rastreamentos de pilha assincrônicos

Estamos ativando [a flag `--async-stack-traces`](/blog/fast-async#improved-developer-experience) por padrão. [Rastreamentos de pilha assincrônicos sem custo](https://bit.ly/v8-zero-cost-async-stack-traces) tornam mais fácil diagnosticar problemas em produção com código intensivamente assíncrono, já que a propriedade `error.stack`, que geralmente é enviada para arquivos/serviços de log, agora oferece mais informações sobre o que causou o problema.

## `await` mais rápido

Relacionado à flag mencionada acima, `--async-stack-traces`, também estamos ativando a flag `--harmony-await-optimization` por padrão, que é um pré-requisito para o `--async-stack-traces`. Veja [funções assíncronas e promessas mais rápidas](/blog/fast-async#await-under-the-hood) para mais detalhes.

## Inicialização mais rápida do Wasm

Por meio de otimizações nos detalhes internos do Liftoff, melhoramos significativamente a velocidade de compilação do WebAssembly sem prejudicar a qualidade do código gerado. Para a maioria das cargas de trabalho, o tempo de compilação foi reduzido em 15–25%.

![Tempo de compilação do Liftoff no [demo Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)](/_img/v8-release-73/liftoff-epic.svg)

## Recursos de linguagem JavaScript

V8 v7.3 vem com vários novos recursos de linguagem JavaScript.

### `Object.fromEntries`

A API `Object.entries` não é novidade:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

Infelizmente, não há uma maneira fácil de voltar do resultado de `entries` para um objeto equivalente… até agora! O V8 v7.3 suporta [`Object.fromEntries()`](/features/object-fromentries), uma nova API interna que realiza o inverso de `Object.entries`:

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Para mais informações e exemplos de casos de uso, veja [nosso explicador de recurso `Object.fromEntries`](/features/object-fromentries).

### `String.prototype.matchAll`

Um caso comum de uso de expressões regulares globais (`g`) ou adesivas (`y`) é aplicá-las a uma string e iterar por todas as correspondências. A nova API `String.prototype.matchAll` torna isso mais fácil do que nunca, especialmente para expressões regulares com grupos de captura:

```js
const string = 'Repositórios favoritos do GitHub: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} em ${match.index} com '${match.input}'`);
  console.log(`→ proprietário: ${match.groups.owner}`);
  console.log(`→ repositório: ${match.groups.repo}`);
}

// Saída:
//
// tc39/ecma262 em 23 com 'Repositórios favoritos do GitHub: tc39/ecma262 v8/v8.dev'
// → proprietário: tc39
// → repositório: ecma262
// v8/v8.dev em 36 com 'Repositórios favoritos do GitHub: tc39/ecma262 v8/v8.dev'
// → proprietário: v8
// → repositório: v8.dev
```

Para mais detalhes, leia [nosso explicador sobre `String.prototype.matchAll`](/features/string-matchall).

### `Atomics.notify`

`Atomics.wake` foi renomeado para `Atomics.notify`, correspondendo a [uma recente mudança na especificação](https://github.com/tc39/ecma262/pull/1220).

## API do V8

Utilize `git log branch-heads/7.2..branch-heads/7.3 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.3 -t branch-heads/7.3` para experimentar os novos recursos no V8 v7.3. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
