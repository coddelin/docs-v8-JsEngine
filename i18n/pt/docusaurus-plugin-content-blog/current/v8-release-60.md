---
title: 'Lançamento do V8 v6.0'
author: 'a equipe V8'
date: 2017-06-09 13:33:37
tags:
  - lançamento
description: 'O V8 v6.0 vem com várias melhorias de desempenho e introduz suporte para `SharedArrayBuffer`s e propriedades de espalhamento/resto em objetos.'
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do master do Git do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0), que estará em beta até ser lançado em coordenação com o Chrome 60 Stable nas próximas semanas. O V8 6.0 está repleto de novidades voltadas para desenvolvedores. Gostaríamos de dar a você uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## `SharedArrayBuffer`s

O V8 v6.0 introduz suporte para [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer), um mecanismo de baixo nível para compartilhar memória entre workers do JavaScript e sincronizar o fluxo de controle entre esses workers. Os SharedArrayBuffers dão ao JavaScript acesso à memória compartilhada, operações atômicas e futexes. Os SharedArrayBuffers também desbloqueiam a capacidade de portar aplicativos com threads para a web via asm.js ou WebAssembly.

Para um breve tutorial de baixo nível, veja a página de tutorial da especificação [tutorial page](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md) ou consulte a [documentação do Emscripten](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html) para portar pthreads.

## Propriedades de espalhamento/resto em objetos

Esta versão introduz propriedades de resto para atribuição de destruição de objeto e propriedades de espalhamento para literais de objeto. As propriedades de espalhamento/resto em objetos são recursos ES.next do Estágio 3.

As propriedades de espalhamento também oferecem uma alternativa concisa ao `Object.assign()` em muitas situações.

```js
// Propriedades de resto para atribuição de destruição de objeto:
const person = {
  firstName: 'Sebastian',
  lastName: 'Markbåge',
  country: 'USA',
  state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: 'USA', state: 'CA' }

// Propriedades de espalhamento para literais de objeto:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

Para mais informações, veja [nosso explicativo sobre propriedades de resto e espalhamento em objetos](/features/object-rest-spread).

## Desempenho do ES2015

O V8 v6.0 continua a melhorar o desempenho dos recursos do ES2015. Esta versão contém otimizações para implementações de recursos de linguagem que resultam, no geral, em uma melhoria de aproximadamente 10% na pontuação do [ARES-6](http://browserbench.org/ARES-6/) do V8.

## API do V8

Por favor, confira nosso [resumo de mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada grande lançamento.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.0 -t branch-heads/6.0` para experimentar os novos recursos no V8 6.0. Alternativamente, você pode [inscrever-se no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
