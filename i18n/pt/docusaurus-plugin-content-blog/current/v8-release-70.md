---
title: "Lançamento do V8 v7.0"
author: "Michael Hablich"
avatars:
  - michael-hablich
date: 2018-10-15 17:17:00
tags:
  - lançamento
description: "O V8 v7.0 inclui threads WebAssembly, Symbol.prototype.description e funções embutidas em mais plataformas!"
tweet: "1051857446279532544"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do master do Git do V8 imediatamente antes de uma etapa Beta do Chrome. Hoje estamos felizes em anunciar nosso branch mais recente, [V8 versão 7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0), que está em beta até seu lançamento em coordenação com o Chrome 70 Stable em algumas semanas. O V8 v7.0 está repleto de várias novidades para desenvolvedores. Este post fornece uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## Funções embutidas integradas

[Funções embutidas integradas](/blog/embedded-builtins) economizam memória ao compartilhar código gerado entre vários Isolates do V8. A partir do V8 v6.9, habilitamos funções embutidas integradas na arquitetura x64. O V8 v7.0 traz essas economias de memória para todas as plataformas restantes, exceto ia32.

## Uma prévia de threads em WebAssembly

O WebAssembly (Wasm) permite a compilação de código escrito em C++ e outras linguagens para ser executado na web. Um recurso muito útil de aplicativos nativos é a capacidade de usar threads — um primitivo para computação paralela. A maioria dos desenvolvedores C e C++ está familiarizada com pthreads, que é uma API padronizada para gerenciamento de threads de aplicativos.

O [Grupo Comunitário WebAssembly](https://www.w3.org/community/webassembly/) tem trabalhado para trazer threads para a web e possibilitar aplicativos verdadeiramente multithread. Como parte desse esforço, o V8 implementou o suporte necessário para threads no mecanismo WebAssembly. Para usar este recurso no Chrome, você pode ativá-lo via `chrome://flags/#enable-webassembly-threads` ou seu site pode se inscrever em um [Origin Trial](https://github.com/GoogleChrome/OriginTrials). Os Origin Trials permitem que os desenvolvedores experimentem novos recursos da web antes que sejam completamente padronizados, o que nos ajuda a coletar feedback do mundo real, crucial para validar e melhorar novos recursos.

## Recursos de linguagem JavaScript

[Uma propriedade `description`](https://tc39.es/proposal-Symbol-description/) está sendo adicionada ao `Symbol.prototype`. Isso fornece uma maneira mais ergonômica de acessar a descrição de um `Symbol`. Anteriormente, a descrição só podia ser acessada indiretamente através de `Symbol.prototype.toString()`. Obrigado à Igalia por contribuir com esta implementação!

`Array.prototype.sort` agora é estável no V8 v7.0. Anteriormente, o V8 usava um QuickSort instável para arrays com mais de 10 elementos. Agora, usamos o algoritmo TimSort estável. Veja [nosso post no blog](/blog/array-sort) para mais detalhes.

## API do V8

Por favor, use `git log branch-heads/6.9..branch-heads/7.0 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.0 -t branch-heads/7.0` para experimentar os novos recursos no V8 v7.0. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
