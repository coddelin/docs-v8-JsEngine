---
title: &apos;Lançamento do V8 versão v8.9&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), aguardando uma chamada&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-02-04
tags:
 - lançamento
description: &apos;O lançamento do V8 v8.9 traz melhorias de desempenho em chamadas com discrepância no tamanho dos argumentos.&apos;
tweet: &apos;1357358418902802434&apos;
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é derivada do master do Git do V8 imediatamente antes de um marco Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9), que está em beta até seu lançamento em coordenação com o Chrome 89 Stable em várias semanas. O V8 v8.9 está cheio de recursos úteis para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## JavaScript

### `await` no nível superior

[`await` no nível superior](https://v8.dev/features/top-level-await) está disponível no [motor de renderização Blink](https://www.chromium.org/blink) 89, um dos principais integradores do V8.

No V8 independente, o `await` no nível superior permanece atrás da flag `--harmony-top-level-await`.

Por favor, veja [nosso explicador](https://v8.dev/features/top-level-await) para mais detalhes.

## Desempenho

### Chamadas mais rápidas com discrepância no tamanho dos argumentos

O JavaScript permite chamar uma função com um número diferente de argumentos do que o número esperado de parâmetros, ou seja, pode-se passar menos ou mais argumentos do que os parâmetros formais declarados. O caso de passar menos argumentos é chamado de subaplicação, e passar mais é chamado de sobreaplicação.

No caso de subaplicação, os parâmetros restantes são atribuídos ao valor `undefined`. No caso de sobreaplicação, os argumentos restantes podem ser acessados usando o parâmetro de repouso e a propriedade `Function.prototype.arguments`, ou são simplesmente supérfluos e ignorados. Muitos frameworks da web e do Node.js atualmente usam esse recurso do JavaScript para aceitar parâmetros opcionais e criar uma API mais flexível.

Até recentemente, o V8 tinha uma maquinaria especial para lidar com a discrepância no tamanho dos argumentos: o frame adaptador de argumentos. Infelizmente, a adaptação de argumentos tem um custo de desempenho e é comumente necessária em frameworks modernos de front-end e middleware. Acontece que, com um design inteligente (como inverter a ordem dos argumentos na pilha), podemos remover esse frame extra, simplificar a base de código do V8 e eliminar o overhead quase completamente.

![Impacto no desempenho ao remover o frame adaptador de argumentos, medido por meio de um micro-benchmark.](/_img/v8-release-89/perf.svg)

O gráfico mostra que não há mais overhead ao executar no [modo sem JIT](https://v8.dev/blog/jitless) (Ignition) com uma melhoria de desempenho de 11,2%. Ao usar TurboFan, obtemos um aumento de velocidade de até 40%. O overhead em comparação com o caso sem discrepância é devido a uma pequena otimização no [epílogo da função](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052). Para mais detalhes, consulte [o documento de design](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit).

Se você quiser saber mais sobre os detalhes por trás dessas melhorias, confira o [post dedicado no blog](https://v8.dev/blog/adaptor-frame).

## API do V8

Por favor, use `git log branch-heads/8.8..branch-heads/8.9 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 8.9 -t branch-heads/8.9` para experimentar os novos recursos no V8 v8.9. Alternativamente, você pode [se inscrever no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
