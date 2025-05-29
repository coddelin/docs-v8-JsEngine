---
title: &apos;Como o V8 mede o desempenho no mundo real&apos;
author: &apos;a equipe do V8&apos;
date: 2016-12-21 13:33:37
tags:
  - benchmarks
description: &apos;A equipe do V8 desenvolveu uma nova metodologia para medir e entender o desempenho do JavaScript no mundo real.&apos;
---
Ao longo do último ano, a equipe do V8 desenvolveu uma nova metodologia para medir e entender o desempenho do JavaScript no mundo real. Utilizamos os insights que obtivemos dela para mudar como a equipe do V8 torna o JavaScript mais rápido. Nosso novo foco no mundo real representa uma mudança significativa em relação ao nosso foco tradicional em desempenho. Estamos confiantes de que, ao continuarmos aplicando essa metodologia em 2017, ela melhorará significativamente a capacidade de usuários e desenvolvedores de contar com o desempenho previsível do V8 para JavaScript no mundo real, tanto no Chrome quanto no Node.js.

<!--truncate-->
O antigo ditado “o que é medido é melhorado” é particularmente verdadeiro no mundo do desenvolvimento de máquinas virtuais (VM) de JavaScript. Escolher as métricas certas para orientar a otimização de desempenho é uma das coisas mais importantes que uma equipe de VM pode fazer ao longo do tempo. A linha do tempo a seguir ilustra, de forma abrangente, como o benchmarking de JavaScript evoluiu desde o lançamento inicial do V8:

![Evolução dos benchmarks de JavaScript](/_img/real-world-performance/evolution.png)

Historicamente, o V8 e outros motores de JavaScript mediram o desempenho usando benchmarks sintéticos. Inicialmente, os desenvolvedores de VM utilizavam microbenchmarks como [SunSpider](https://webkit.org/perf/sunspider/sunspider.html) e [Kraken](http://krakenbenchmark.mozilla.org/). À medida que o mercado de navegadores amadureceu, uma segunda era de benchmarks começou, durante a qual eles usaram conjuntos de testes maiores, mas ainda assim sintéticos, como [Octane](http://chromium.github.io/octane/) e [JetStream](http://browserbench.org/JetStream/).

Os microbenchmarks e conjuntos de testes estáticos têm alguns benefícios: são fáceis de iniciar, simples de entender e capazes de rodar em qualquer navegador, facilitando a análise comparativa. No entanto, essa conveniência traz uma série de desvantagens. Como incluem um número limitado de casos de teste, é difícil projetar benchmarks que refletam com precisão as características gerais da web. Além disso, benchmarks geralmente são atualizados com pouca frequência; assim, têm dificuldade em acompanhar novas tendências e padrões de desenvolvimento de JavaScript em geral. Finalmente, ao longo dos anos, os autores de VM exploraram todos os detalhes dos benchmarks tradicionais e, nesse processo, descobriram e aproveitaram oportunidades para melhorar as pontuações de benchmark deslocando ou até mesmo pulando trabalho externamente não observável durante a execução de benchmarks. Esse tipo de melhoria baseada em pontuação de benchmark e superotimização dos benchmarks nem sempre proporciona muitos benefícios para o usuário ou desenvolvedor, e a história mostrou que, a longo prazo, é muito difícil criar um benchmark sintético impossível de manipular.

## Medindo sites reais: WebPageReplay e Runtime Call Stats

Partindo da intuição de que estávamos vendo apenas uma parte da história de desempenho com benchmarks estáticos tradicionais, a equipe do V8 começou a medir o desempenho no mundo real, fazendo benchmarking do carregamento de sites reais. Queríamos medir casos de uso que refletissem como os usuários finais realmente navegam na web, então decidimos derivar métricas de desempenho de sites como Twitter, Facebook e Google Maps. Usando uma infraestrutura do Chrome chamada [WebPageReplay](https://github.com/chromium/web-page-replay), conseguimos gravar e reproduzir carregamentos de páginas de forma determinística.

Ao mesmo tempo, desenvolvemos uma ferramenta chamada Runtime Call Stats que nos permitiu fazer um perfil de como diferentes códigos JavaScript afetavam diferentes componentes do V8. Pela primeira vez, tivemos a capacidade não apenas de testar facilmente alterações no V8 em sites reais, mas também de entender completamente como e por que o V8 desempenhava de maneira diferente sob diferentes cargas de trabalho.

Agora monitoramos mudanças em um conjunto de testes com aproximadamente 25 websites para orientar a otimização do V8. Além dos websites mencionados e outros do Alexa Top 100, selecionamos sites implementados com frameworks comuns (React, Polymer, Angular, Ember e outros), sites de uma variedade de locais geográficos diferentes e sites ou bibliotecas cujas equipes de desenvolvimento colaboraram conosco, como Wikipedia, Reddit, Twitter e Webpack. Acreditamos que esses 25 sites são representativos da web em geral e que melhorias de desempenho nesses sites serão diretamente refletidas em acelerações semelhantes para sites que estão sendo escritos atualmente por desenvolvedores de JavaScript.

Para uma apresentação detalhada sobre o desenvolvimento de nosso conjunto de testes de websites e Runtime Call Stats, veja a [apresentação do BlinkOn 6 sobre desempenho no mundo real](https://www.youtube.com/watch?v=xCx4uC7mn6Y). Você pode até [executar a ferramenta Runtime Call Stats você mesmo](/docs/rcs).

## Fazendo uma diferença real

Analisar essas novas métricas de desempenho do mundo real e compará-las aos benchmarks tradicionais com Runtime Call Stats também nos deu mais insights sobre como diferentes cargas de trabalho impactam o V8 de diferentes maneiras.

A partir dessas medições, descobrimos que o desempenho do Octane era, na verdade, um representante fraco do desempenho na maioria dos 25 sites testados. Você pode ver no gráfico abaixo: a distribuição de cores da barra do Octane é muito diferente de qualquer outra carga de trabalho, especialmente aquelas dos sites do mundo real. Ao executar o Octane, o gargalo do V8 muitas vezes é a execução do código JavaScript. No entanto, a maioria dos sites do mundo real, em vez disso, pressiona o analisador e o compilador do V8. Percebemos que as otimizações feitas para o Octane muitas vezes não tinham impacto significativo em páginas da web do mundo real e, em alguns casos, essas [otimizações tornaram os sites do mundo real mais lentos](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#a-closer-look-at-octane).

![Distribuição do tempo ao executar todo o Octane, executando os itens de linha do Speedometer e carregando os sites do nosso conjunto de testes no Chrome 57](/_img/real-world-performance/startup-distribution.png)

Também descobrimos que outro benchmark era, na verdade, um representante melhor para sites reais. [Speedometer](http://browserbench.org/Speedometer/), um benchmark do WebKit que inclui aplicações escritas em React, Angular, Ember e outros frameworks, demonstrou um perfil de tempo de execução muito semelhante aos 25 sites. Embora nenhum benchmark corresponda à precisão das páginas da web reais, acreditamos que o Speedometer faz um trabalho melhor ao aproximar as cargas de trabalho do mundo real do JavaScript moderno na web do que o Octane.

## Resultado final: um V8 mais rápido para todos

Ao longo do último ano, o conjunto de testes do site do mundo real e nossa ferramenta Runtime Call Stats nos permitiram entregar otimizações de desempenho do V8 que aceleraram o carregamento das páginas em geral por uma média de 10-20%. Dado o foco histórico na otimização do carregamento de páginas no Chrome, uma melhoria de dois dígitos no métrico em 2016 é uma conquista significativa. As mesmas otimizações também melhoraram nossa pontuação no Speedometer em 20-30%.

Essas melhorias de desempenho devem ser refletidas em outros sites escritos por desenvolvedores da web que usam frameworks modernos e padrões semelhantes de JavaScript. Nossas melhorias em funções internas, como `Object.create` e [`Function.prototype.bind`](https://benediktmeurer.de/2015/12/25/a-new-approach-to-function-prototype-bind/), otimizações em torno do padrão de fábrica de objetos, trabalho nos [caches inline](https://en.wikipedia.org/wiki/Inline_caching) do V8 e melhorias contínuas no analisador têm como objetivo serem melhorias geralmente aplicáveis a áreas pouco exploradas do JavaScript usadas por todos os desenvolvedores, não apenas os sites representativos que rastreamos.

Planejamos expandir o uso de sites reais para orientar o trabalho de desempenho do V8. Fique ligado para mais insights sobre benchmarks e desempenho de scripts.
