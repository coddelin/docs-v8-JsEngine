---
title: "Lançamento do V8 v5.9"
author: "a equipe do V8"
date: "2017-04-27 13:33:37"
tags: 
  - lançamento
description: "O V8 v5.9 inclui o novo pipeline Ignition + TurboFan e adiciona suporte ao WebAssembly TrapIf em todas as plataformas."
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada a partir do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje, estamos felizes em anunciar nosso mais novo branch, [V8 versão 5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9), que estará em beta até ser lançado em coordenação com o Chrome 59 Stable nas próximas semanas. O V8 5.9 está cheio de recursos voltados para desenvolvedores. Gostaríamos de apresentar uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Lançamento do Ignition+TurboFan

O V8 v5.9 será a primeira versão com Ignition+TurboFan ativado por padrão. Em geral, essa mudança deve levar a um menor consumo de memória e a um início mais rápido das aplicações web em geral, e não esperamos problemas de estabilidade ou desempenho, pois o novo pipeline já passou por testes significativos. No entanto, [entre em contato conosco](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline) caso seu código subitamente comece a apresentar regressões significativas no desempenho.

Para mais informações, veja [nosso post dedicado no blog](/blog/launching-ignition-and-turbofan).

## Suporte ao WebAssembly `TrapIf` em todas as plataformas

[O suporte ao WebAssembly `TrapIf`](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe) reduziu significativamente o tempo gasto compilando código (~30%).

![](/_img/v8-release-59/angrybots.png)

## API do V8

Por favor, confira nosso [resumo das mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada lançamento importante.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 5.9 -t branch-heads/5.9` para experimentar os novos recursos do V8 5.9. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
