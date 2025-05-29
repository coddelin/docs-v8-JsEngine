---
title: "Lançamento do V8 v6.1"
author: "a equipe do V8"
date: 2017-08-03 13:33:37
tags:
  - lançamento
description: "V8 v6.1 vem com um tamanho reduzido de binário e inclui melhorias de desempenho. Além disso, asm.js agora é validado e compilado para WebAssembly."
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1), que está em beta até seu lançamento em coordenação com o Chrome 61 Stable em algumas semanas. V8 v6.1 está repleto de várias novidades voltadas para desenvolvedores. Gostaríamos de dar a você uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## Melhorias de desempenho

Visitar todos os elementos de Maps e Sets — seja por meio de [iteração](http://exploringjs.com/es6/ch_iteration.html) ou pelos métodos [`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) — tornou-se significativamente mais rápido, com uma melhoria bruta de desempenho de até 11× desde a versão 6.0 do V8. Confira o [post dedicado no blog](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/) para obter informações adicionais.

![](/_img/v8-release-61/iterating-collections.svg)

Além disso, o trabalho continuou no desempenho de outros recursos da linguagem. Por exemplo, o método [`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf), que é importante para códigos sem construtores que usam principalmente literais de objeto e `Object.create` em vez de classes e funções construtoras, agora é sempre tão rápido quanto e muitas vezes mais rápido que usar [o operador `instanceof`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof).

![](/_img/v8-release-61/checking-prototype.svg)

Chamadas de função e invocações de construtores com número variável de argumentos também ficaram significativamente mais rápidas. Chamadas feitas com [`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) e [`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct) receberam um aumento de desempenho de até 17× na versão mais recente.

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach` agora é inserido em TurboFan e otimizado para todos os principais [tipos de elementos](/blog/elements-kinds) não fragmentados.

## Redução de tamanho do binário

A equipe do V8 removeu completamente o compilador Crankshaft obsoleto, proporcionando uma redução significativa no tamanho do binário. Juntamente com a remoção do gerador de builtins, isso reduz o tamanho do binário distribuído do V8 em mais de 700 KB, dependendo da plataforma exata.

## asm.js agora é validado e compilado para WebAssembly

Se o V8 encontrar código asm.js, ele agora tentará validá-lo. Código asm.js válido é então transpilado para WebAssembly. De acordo com avaliações de desempenho do V8, isso geralmente aumenta o desempenho de processamento. Devido à etapa adicional de validação, regressões isoladas no desempenho de inicialização podem ocorrer.

Observe que esse recurso foi ativado por padrão apenas no lado do Chromium. Se você é um embedder e deseja utilizar o validador asm.js, habilite a flag `--validate-asm`.

## WebAssembly

Ao depurar WebAssembly, agora é possível exibir variáveis locais no DevTools quando um ponto de interrupção no código WebAssembly é atingido.

## API do V8

Por favor, confira nosso [resumo de mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada lançamento importante.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.1 -t branch-heads/6.1` para experimentar os novos recursos do V8 v6.1. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
