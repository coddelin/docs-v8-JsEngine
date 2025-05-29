---
title: &apos;Lançamento do V8 v5.8&apos;
author: &apos;a equipe do V8&apos;
date: 2017-03-20 13:33:37
tags:
  - lançamento
description: &apos;O V8 v5.8 permite o uso de tamanhos de heap arbitrários e melhora o desempenho de inicialização.&apos;
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos satisfeitos em anunciar nosso mais novo branch, [V8 versão 5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8), que estará em beta até ser lançado em coordenação com o Chrome 58 Stable em algumas semanas. O V8 5.8 está repleto de vários recursos voltados para desenvolvedores. Gostaríamos de apresentar um preview de alguns dos destaques, antecipando o lançamento.

<!--truncate-->
## Tamanhos de heap arbitrários

Historicamente, o limite de heap do V8 foi convenientemente definido para caber no intervalo de inteiros de 32 bits assinados com alguma margem. Com o tempo, essa conveniência levou a códigos descuidados no V8 que misturavam tipos de diferentes larguras de bits, efetivamente quebrando a capacidade de aumentar o limite. No V8 v5.8, habilitamos o uso de tamanhos de heap arbitrários. Confira o [post dedicado no blog](/blog/heap-size-limit) para mais informações.

## Desempenho de inicialização

No V8 v5.8, continuamos o trabalho para reduzir incrementalmente o tempo gasto no V8 durante a inicialização. Reduções no tempo gasto compilando e analisando código, bem como otimizações no sistema IC, resultaram em melhorias de ~5% em nossos [workloads de inicialização do mundo real](/blog/real-world-performance).

## API do V8

Por favor, confira nosso [resumo de mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada grande lançamento.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 5.8 -t branch-heads/5.8` para experimentar os novos recursos do V8 5.8. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar você mesmo os novos recursos em breve.
