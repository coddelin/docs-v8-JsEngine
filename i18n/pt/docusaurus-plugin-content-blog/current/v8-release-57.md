---
title: &apos;Lançamento do V8 v5.7&apos;
author: &apos;A equipe V8&apos;
date: 2017-02-06 13:33:37
tags:
  - lançamento
description: &apos;O V8 v5.7 habilita o WebAssembly por padrão e inclui melhorias de desempenho e aumento do suporte aos recursos de linguagem ECMAScript.&apos;
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada a partir do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje, estamos felizes em anunciar nosso mais novo branch, [V8 versão 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7), que estará em beta até seu lançamento em coordenação com o Chrome 57 Stable em algumas semanas. O V8 5.7 está repleto de novidades voltadas para desenvolvedores. Gostaríamos de oferecer um prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## Melhorias de desempenho

### Funções assíncronas nativas tão rápidas quanto Promises

As funções assíncronas agora são aproximadamente tão rápidas quanto o mesmo código escrito com Promises. O desempenho de execução das funções assíncronas quadruplicou de acordo com nossos [microbenchmarks](https://codereview.chromium.org/2577393002). Durante o mesmo período, o desempenho geral de Promises também dobrou.

![Melhorias no desempenho assíncrono do V8 em Linux x64](/_img/v8-release-57/async.png)

### Melhoria contínua do ES2015

O V8 continua a tornar os recursos da linguagem ES2015 mais rápidos para que os desenvolvedores utilizem novos recursos sem sofrer custos de desempenho. O operador spread, a desestruturação e os geradores agora são [aproximadamente tão rápidos quanto seus equivalentes ingênuos do ES5](https://fhinkel.github.io/six-speed/).

### RegExp 15% mais rápido

Migrar funções RegExp de uma implementação de JavaScript auto-hospedada para uma que se conecta à arquitetura de geração de código do TurboFan resultou em um desempenho de RegExp ~15% mais rápido no geral. Mais detalhes podem ser encontrados no [post dedicado do blog](/blog/speeding-up-regular-expressions).

## Recursos da linguagem JavaScript

Várias adições recentes à biblioteca padrão ECMAScript estão incluídas nesta versão. Dois métodos de String, [`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) e [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd), fornecem recursos úteis de formatação de strings, enquanto [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts) oferece aos autores a capacidade de personalizar a formatação de data/hora de forma sensível ao idioma.

## WebAssembly habilitado

O Chrome 57 (que inclui o V8 v5.7) será o primeiro lançamento a habilitar o WebAssembly por padrão. Para mais detalhes, consulte os documentos introdutórios em [webassembly.org](http://webassembly.org/) e a documentação da API no [MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API).

## Adições à API do V8

Por favor, confira nosso [resumo das alterações da API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada grande lançamento. Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 5.7 -t branch-heads/5.7` para experimentar os novos recursos do V8 v5.7. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.

### `PromiseHook`

Esta API C++ permite aos usuários implementar código de perfil que rastreia o ciclo de vida de Promises. Isso habilita a futura [API AsyncHook](https://github.com/nodejs/node-eps/pull/18) do Node, que permite construir [propagação de contexto assíncrono](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#).

A API `PromiseHook` fornece quatro ganchos de ciclo de vida: init, resolve, antes e depois. O gancho init é executado quando uma nova Promise é criada; o gancho resolve é executado quando uma Promise é resolvida; os ganchos antes & depois são executados imediatamente antes e depois de um [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob). Para mais informações, confira o [issue de acompanhamento](https://bugs.chromium.org/p/v8/issues/detail?id=4643) e o [documento de design](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit).
