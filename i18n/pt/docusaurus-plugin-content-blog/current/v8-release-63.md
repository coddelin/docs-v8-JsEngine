---
title: &apos;Lançamento do V8 v6.3&apos;
author: &apos;A equipe V8&apos;
date: 2017-10-25 13:33:37
tags:
  - lançamento
description: &apos;V8 v6.3 inclui melhorias de desempenho, redução no consumo de memória e suporte para novos recursos da linguagem JavaScript.&apos;
tweet: &apos;923168001108643840&apos;
---
A cada seis semanas, criamos um novo ramo do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso novo ramo, [V8 versão 6.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3), que estará em beta até seu lançamento em conjunto com o Chrome 63 Stable em algumas semanas. O V8 v6.3 está repleto de todos os tipos de benefícios voltados para desenvolvedores. Esta postagem fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Velocidade

[Jank Busters](/blog/jank-busters) III chegou como parte do projeto [Orinoco](/blog/orinoco). A marcação simultânea ([70-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984) da marcação é feita em uma thread não bloqueante) foi lançada.

O analisador agora não [precisa pré-analisar uma função pela segunda vez](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11). Isso se traduz em uma [melhoria mediana de 14% no tempo de análise](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml) em nosso benchmark interno de inicialização Top25.

`string.js` foi completamente portado para CodeStubAssembler. Muito obrigado a [@peterwmwong](https://twitter.com/peterwmwong) por [suas incríveis contribuições](https://chromium-review.googlesource.com/q/peter.wm.wong)! Para os desenvolvedores, isso significa que funções de string embutidas como `String#trim` são muito mais rápidas a partir do V8 v6.3.

O desempenho de `Object.is()` agora está aproximadamente no mesmo nível de alternativas. Em geral, o V8 v6.3 continua o caminho para melhorar o desempenho do ES2015+. Além de outros itens, aumentamos a [velocidade de acesso polimórfico a símbolos](https://bugs.chromium.org/p/v8/issues/detail?id=6367), [inlining polimórfico de chamadas de construtor](https://bugs.chromium.org/p/v8/issues/detail?id=6885) e [(tagged) template literals](https://pasteboard.co/GLYc4gt.png).

![Desempenho do V8 nas últimas seis versões](/_img/v8-release-63/ares6.svg)

A lista de funções otimizadas fracas foi removida. Mais informações podem ser encontradas na [postagem dedicada do blog](/blog/lazy-unlinking).

Os itens mencionados são uma lista não exaustiva de melhorias de velocidade. Muitos outros trabalhos relacionados ao desempenho foram realizados.

## Consumo de memória

[Barreiras de gravação foram transferidas para usar o CodeStubAssembler](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8). Isso economiza cerca de 100 KB de memória por isolado.

## Recursos da linguagem JavaScript

O V8 agora suporta os seguintes recursos de estágio 3: [importação dinâmica de módulos via `import()`](/features/dynamic-import), [`Promise.prototype.finally()`](/features/promise-finally) e [iteradores/geradores assíncronos](https://github.com/tc39/proposal-async-iteration).

Com [importação dinâmica de módulos](/features/dynamic-import) é muito simples importar módulos com base em condições de tempo de execução. Isso é útil quando um aplicativo deve carregar determinados módulos de código de forma preguiçosa.

[`Promise.prototype.finally`](/features/promise-finally) introduz uma maneira fácil de limpar após a resolução de uma promessa.

A iteração com funções assíncronas ficou mais ergonômica com a introdução de [iteradores/geradores assíncronos](https://github.com/tc39/proposal-async-iteration).

No lado do `Intl`, [`Intl.PluralRules`](/features/intl-pluralrules) agora é suportado. Essa API permite pluralizações internacionalizadas de alto desempenho.

## Inspector/Depuração

No Chrome 63, [block coverage](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44) também é suportado na interface do usuário do DevTools. Observe que o protocolo do inspector já suporta block coverage desde o V8 v6.2.

## API V8

Confira nosso [resumo de alterações na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada grande lançamento.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar git checkout -b 6.3 -t branch-heads/6.3 para experimentar os novos recursos no V8 v6.3. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
