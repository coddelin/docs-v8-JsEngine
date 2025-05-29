---
title: "Lançando Ignition e TurboFan"
author: "a equipe do V8"
date: 2017-05-15 13:33:37
tags:
  - internos
description: "O V8 v5.9 vem com um pipeline de execução JavaScript totalmente novo, baseado no interpretador Ignition e no compilador otimizador TurboFan."
---
Hoje estamos entusiasmados em anunciar o lançamento de um novo pipeline de execução JavaScript para o V8 v5.9 que chegará ao Chrome Stable na versão 59. Com o novo pipeline, alcançamos grandes melhorias de desempenho e economias significativas de memória em aplicativos JavaScript do mundo real. Discutiremos os números com mais detalhes no final deste post, mas primeiro vamos dar uma olhada no próprio pipeline.

<!--truncate-->
O novo pipeline é baseado no [Ignition](/docs/ignition), o interpretador do V8, e no [TurboFan](/docs/turbofan), o mais novo compilador otimizador do V8. Essas tecnologias [devem](/blog/turbofan-jit) [ser](/blog/ignition-interpreter) [familiares](/blog/test-the-future) para aqueles que têm acompanhado o blog do V8 nos últimos anos, mas a mudança para o novo pipeline marca um grande novo marco para ambos.

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo do Ignition, o mais novo interpretador do V8</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo do TurboFan, o mais novo compilador otimizador do V8</figcaption>
</figure>

Pela primeira vez, Ignition e TurboFan são usados universalmente e exclusivamente para execução de JavaScript no V8 v5.9. Além disso, a partir da versão 5.9, Full-codegen e Crankshaft, as tecnologias que [serviram bem ao V8 desde 2010](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), não são mais utilizadas no V8 para execução de JavaScript, pois já não conseguem acompanhar os novos recursos da linguagem JavaScript e as otimizações que esses recursos exigem. Planejamos removê-los completamente em breve. Isso significa que o V8 terá uma arquitetura geral muito mais simples e mais fácil de manter no futuro.

## Uma longa jornada

O pipeline combinado de Ignition e TurboFan esteve em desenvolvimento por quase 3½ anos. Representa o culminar do conhecimento coletivo que a equipe do V8 adquiriu ao medir o desempenho de JavaScript no mundo real e ao considerar cuidadosamente as deficiências do Full-codegen e Crankshaft. É um alicerce com o qual poderemos continuar a otimizar toda a linguagem JavaScript nos próximos anos.

O projeto TurboFan começou originalmente no final de 2013 para abordar as deficiências do Crankshaft. O Crankshaft só consegue otimizar um subconjunto da linguagem JavaScript. Por exemplo, ele não foi projetado para otimizar código JavaScript usando tratamento estruturado de exceções, ou seja, blocos de código demarcados pelas palavras-chave try, catch e finally do JavaScript. É difícil adicionar suporte para novos recursos de linguagem no Crankshaft, já que esses recursos quase sempre exigem a escrita de código específico para nove plataformas suportadas. Além disso, a arquitetura do Crankshaft é limitada na medida em que pode gerar código de máquina otimizado. Ele só consegue extrair um desempenho limitado do JavaScript, apesar de exigir que a equipe do V8 mantenha mais de dez mil linhas de código por arquitetura de chip.

O TurboFan foi projetado desde o início não apenas para otimizar todos os recursos da linguagem encontrados no padrão JavaScript na época, ES5, mas também todos os recursos futuros planejados para ES2015 e além. Ele introduz um design de compilador em camadas que permite uma separação clara entre otimizações de compilador de alto nível e baixo nível, facilitando a adição de novos recursos de linguagem sem modificar o código específico da arquitetura. O TurboFan adiciona uma fase explícita de seleção de instrução na compilação que torna possível escrever muito menos código específico para cada plataforma suportada. Com esta nova fase, o código específico de arquitetura é escrito uma vez e raramente precisa ser alterado. Essas e outras decisões levam a um compilador otimizador mais fácil de manter e extensível para todas as arquiteturas que o V8 suporta.

A motivação original por trás do interpretador Ignition do V8 foi reduzir o consumo de memória em dispositivos móveis. Antes do Ignition, o código gerado pelo compilador básico Full-codegen do V8 geralmente ocupava quase um terço do heap JavaScript geral no Chrome. Isso deixava menos espaço para os dados reais de um aplicativo web. Quando o Ignition foi habilitado para o Chrome M53 em dispositivos Android com RAM limitada, a pegada de memória necessária para JavaScript básico, não otimizado, diminuiu em um fator de nove em dispositivos móveis baseados em ARM64.

Posteriormente, a equipe do V8 aproveitou o fato de que o bytecode do Ignition pode ser usado para gerar código de máquina otimizado diretamente com o TurboFan, sem precisar re-compilar a partir do código-fonte, como fazia o Crankshaft. O bytecode do Ignition fornece um modelo de execução base mais limpo e menos propenso a erros no V8, simplificando o mecanismo de desotimização, que é uma característica fundamental da [otimização adaptativa](https://en.wikipedia.org/wiki/Adaptive_optimization) do V8. Finalmente, como a geração de bytecode é mais rápida do que a geração do código compilado base do Full-codegen, ativar o Ignition geralmente melhora os tempos de inicialização dos scripts e, consequentemente, o carregamento das páginas da web.

Ao integrar estreitamente o design do Ignition e do TurboFan, há ainda mais benefícios para toda a arquitetura. Por exemplo, em vez de escrever os manipuladores de bytecode de alto desempenho do Ignition em montagem codificada manualmente, a equipe do V8 usa a [representação intermediária](https://en.wikipedia.org/wiki/Intermediate_representation) do TurboFan para expressar a funcionalidade dos manipuladores e deixa o TurboFan fazer a otimização e a geração de código final para as várias plataformas suportadas pelo V8. Isso garante que o Ignition tenha um bom desempenho em todas as arquiteturas de chip compatíveis com o V8, além de eliminar o ônus de manter nove portas de plataforma separadas.

## Executando os números

Deixando a história de lado, agora vamos dar uma olhada no desempenho e no consumo de memória do pipeline na prática.

A equipe do V8 monitora continuamente o desempenho de casos de uso reais usando o framework [Telemetry - Catapult](https://catapult.gsrc.io/telemetry). [Anteriormente](/blog/real-world-performance), discutimos neste blog por que é tão importante usar dados de testes do mundo real para orientar nosso trabalho de otimização de desempenho e como usamos [WebPageReplay](https://github.com/chromium/web-page-replay) juntamente com o Telemetry para isso. A mudança para o Ignition e o TurboFan mostra melhorias de desempenho nesses casos de teste do mundo real. Especificamente, o novo pipeline resulta em acelerações significativas em testes de interação com o usuário para sites conhecidos:

![Redução no tempo gasto no V8 em benchmarks de interação do usuário](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

Embora o Speedometer seja um benchmark sintético, descobrimos anteriormente que ele faz um trabalho melhor ao aproximar as cargas de trabalho reais do JavaScript moderno do que outros benchmarks sintéticos. A mudança para o Ignition e o TurboFan melhora a pontuação do Speedometer do V8 entre 5%-10%, dependendo da plataforma e do dispositivo.

O novo pipeline também acelera o JavaScript no lado do servidor. [AcmeAir](https://github.com/acmeair/acmeair-nodejs), um benchmark para Node.js que simula a implementação de backend de um servidor de uma companhia aérea fictícia, executa mais de 10% mais rápido usando o V8 v5.9.

![Melhorias nos benchmarks da Web e Node.js](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

Ignition e TurboFan também reduzem a pegada de memória geral do V8. No Chrome M59, o novo pipeline reduz a pegada de memória do V8 em desktops e dispositivos móveis de alto desempenho em 5-10%. Essa redução é resultado de trazer as economias de memória do Ignition, que foram [anteriormente abordadas](/blog/ignition-interpreter) neste blog, para todos os dispositivos e plataformas suportados pelo V8.

Essas melhorias são apenas o começo. O novo pipeline do Ignition e do TurboFan abre caminho para futuras otimizações que aumentarão o desempenho do JavaScript e reduzirão a pegada do V8 tanto no Chrome quanto no Node.js por muitos anos. Estamos ansiosos para compartilhar essas melhorias com você conforme as lançamos para desenvolvedores e usuários. Fique atento.
