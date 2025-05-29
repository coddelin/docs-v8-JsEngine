---
title: "Lançamento do V8 v7.1"
author: "Stephan Herhut ([@herhut](https://twitter.com/herhut)), clonador clonado de clones"
avatars:
  - stephan-herhut
date: 2018-10-31 15:44:37
tags:
  - lançamento
description: "O V8 v7.1 apresenta manipuladores de bytecode embutidos, análise de escape TurboFan aprimorada, postMessage(wasmModule), Intl.RelativeTimeFormat e globalThis!"
tweet: "1057645773465235458"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada diretamente do Git master do V8 antes de um marco Beta do Chrome. Hoje estamos animados em anunciar nosso mais novo branch, [V8 versão 7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1), que está em beta até seu lançamento em coordenação com o Chrome 71 Stable em algumas semanas. O V8 v7.1 está repleto de todos os tipos de novidades para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Memória

Seguindo o trabalho nas versões v6.9/v7.0 para [embutir builtins diretamente no binário](/blog/embedded-builtins), os manipuladores de bytecode para o interpretador agora também estão [embutidos no binário](https://bugs.chromium.org/p/v8/issues/detail?id=8068). Isso economiza cerca de 200 KB em média por Isolate.

## Desempenho

A análise de escape no TurboFan, que realiza substituição escalar para objetos locais de uma unidade de otimização, foi aprimorada para também [lidar com contextos de função local para funções de ordem superior](https://bit.ly/v8-turbofan-context-sensitive-js-operators) quando variáveis do contexto circundante escapam para um fechamento local. Considere o exemplo a seguir:

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

Observe que `x` é uma variável livre do fechamento local `y => y + x`. O V8 v7.1 agora consegue eliminar totalmente a alocação do contexto de `x`, resultando em melhorias de até **40%** em alguns casos.

![Melhoria de desempenho com nova análise de escape (quanto menor, melhor)](/_img/v8-release-71/improved-escape-analysis.svg)

A análise de escape agora também é capaz de eliminar alguns casos de acesso por índice de variáveis a arrays locais. Aqui está um exemplo:

```js
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; ++i)
    total += args[i];
  return total;
}

function sum2(x, y) {
  return sum(x, y);
}
```

Observe que os `args` são locais para `sum2` (assumindo que `sum` é inline em `sum2`). No V8 v7.1, o TurboFan agora pode eliminar completamente a alocação de `args` e substituir o acesso por índice `args[i]` por uma operação ternária da forma `i === 0 ? x : y`. Isso resulta em uma melhoria de ~2% no benchmark JetStream/EarleyBoyer. Podemos estender essa otimização para arrays com mais de dois elementos no futuro.

## Clonagem estruturada de módulos Wasm

Finalmente, [`postMessage` é suportado para módulos Wasm](https://github.com/WebAssembly/design/pull/1074). Objetos `WebAssembly.Module` agora podem ser enviados via `postMessage` para web workers. Para esclarecer, isso se aplica apenas a web workers (mesmo processo, thread diferente) e não se estende a cenários de processos cruzados (como `postMessage` entre origens ou shared web workers).

## Recursos da linguagem JavaScript

[A API `Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) permite o formato localizado de tempos relativos (por exemplo, “ontem”, “há 42 segundos” ou “em 3 meses”) sem sacrificar desempenho. Aqui está um exemplo:

```js
// Cria um formatador de tempo relativo para o idioma inglês que não
// precisa sempre usar valor numérico na saída.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'ontem'

rtf.format(0, 'day');
// → 'hoje'

rtf.format(1, 'day');
// → 'amanhã'

rtf.format(-1, 'week');
// → 'semana passada'

rtf.format(0, 'week');
// → 'esta semana'

rtf.format(1, 'week');
// → 'semana que vem'
```

Leia [nosso explicador sobre `Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) para mais informações.

O V8 v7.1 também adiciona suporte para [a proposta `globalThis`](/features/globalthis), permitindo um mecanismo universal para acessar o objeto global mesmo em funções strict ou módulos, independentemente da plataforma.

## API V8

Por favor, use `git log branch-heads/7.0..branch-heads/7.1 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.1 -t branch-heads/7.1` para experimentar os novos recursos no V8 v7.1. Alternativamente, você pode [inscrever-se no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
