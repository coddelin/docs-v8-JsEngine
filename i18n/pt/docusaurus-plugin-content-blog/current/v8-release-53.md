---
title: &apos;Lançamento do V8 versão v5.3&apos;
author: &apos;a equipe do V8&apos;
date: 2016-07-18 13:33:37
tags:
  - lançamento
description: &apos;O V8 v5.3 vem com melhorias de desempenho e menor consumo de memória.&apos;
---
A cada aproximadamente seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de a ramificação do Chrome ser feita para um marco Beta do Chrome. Hoje estamos animados em anunciar nosso mais novo branch, [V8 versão 5.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.3), que estará em beta até ser lançado em coordenação com o Chrome 53 Stable. O V8 v5.3 está cheio de novidades voltadas para desenvolvedores, então gostaríamos de dar-lhe um preview de alguns dos destaques em antecipação ao lançamento em algumas semanas.

<!--truncate-->
## Memória

### Novo interpretador Ignition

O Ignition, o novo interpretador do V8, está completo em termos de funcionalidades e será ativado no Chrome 53 para dispositivos Android com baixa memória. O interpretador traz economias imediatas de memória para código JIT e permitirá que o V8 faça otimizações futuras para uma inicialização mais rápida durante a execução de código. O Ignition trabalha em conjunto com os compiladores otimizadores existentes do V8 (TurboFan e Crankshaft) para garantir que o código "quente" continue otimizado para desempenho máximo. Continuamos a melhorar o desempenho do interpretador e esperamos ativar o Ignition em breve em todas as plataformas, tanto móveis quanto desktop. Fique atento a uma postagem futura no blog com mais informações sobre o design, a arquitetura e os ganhos de desempenho do Ignition. Versões embarcadas do V8 podem ativar o interpretador Ignition com a flag `--ignition`.

### Redução do jank

O V8 v5.3 inclui várias mudanças para reduzir o jank de aplicativos e os tempos de coleta de lixo. Essas mudanças incluem:

- Otimização de handles globais fracos para reduzir o tempo gasto no manuseio de memória externa
- Unificação do heap para coletas de lixo completas, reduzindo o jank de evacuação
- Otimização das [alocações pretas](/blog/orinoco) no V8 durante a fase de marcação da coleta de lixo

Juntas, essas melhorias reduzem o tempo de pausa da coleta de lixo completa em cerca de 25%, medido durante a navegação em um corpus de páginas populares. Para mais detalhes sobre as otimizações recentes de coleta de lixo para reduzir o jank, veja as postagens no blog “Jank Busters” [Parte 1](/blog/jank-busters) & [Parte 2](/blog/orinoco).

## Desempenho

### Melhorando o tempo de inicialização de páginas

A equipe do V8 começou recentemente a acompanhar melhorias de desempenho com base em um corpus de 25 carregamentos de páginas de sites do mundo real (incluindo sites populares como Facebook, Reddit, Wikipedia e Instagram). Entre o V8 v5.1 (medido no Chrome 51 de abril) e o V8 v5.3 (medido no recente Chrome Canary 53), melhoramos o tempo de inicialização em média, em todos os sites medidos, em ~7%. Essas melhorias no carregamento de sites reais refletiram ganhos semelhantes no benchmark Speedometer, que ficou 14% mais rápido no V8 v5.3. Para mais detalhes sobre nosso novo ambiente de testes, melhorias de runtime e análise detalhada de onde o V8 gasta tempo durante carregamentos de páginas, veja nossa postagem futura no blog sobre desempenho de inicialização.

### Desempenho de `Promise` do ES2015

O desempenho do V8 no conjunto de benchmarks [Promise do ES2015 do Bluebird](https://github.com/petkaantonov/bluebird/tree/master/benchmark) melhorou entre 20–40% no V8 v5.3, dependendo da arquitetura e do benchmark.

![Desempenho do Promise no V8 ao longo do tempo em um Nexus 5x](/_img/v8-release-53/promise.png)

## API do V8

Por favor, confira nosso [resumo das mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada grande lançamento.

Desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 5.3 -t branch-heads/5.3` para experimentar os novos recursos do V8 5.3. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
