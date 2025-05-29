---
title: "Explorando o TurboFan JIT"
author: "Ben L. Titzer, Engenheiro de Software e Mecânico TurboFan"
avatars:
  - "ben-titzer"
date: 2015-07-13 13:33:37
tags:
  - internals
description: "Uma análise profunda do design do novo compilador otimizador TurboFan do V8."
---
[Na semana passada anunciamos](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html) que habilitamos o TurboFan para certos tipos de JavaScript. Neste post queremos explorar mais profundamente o design do TurboFan.

<!--truncate-->
Performance sempre esteve no núcleo da estratégia do V8. O TurboFan combina uma representação intermediária de ponta com um pipeline de tradução e otimização multicamadas para gerar código de máquina de melhor qualidade do que o que era possível com o JIT CrankShaft. As otimizações no TurboFan são mais numerosas, mais sofisticadas e aplicadas de maneira mais completa do que no CrankShaft, permitindo movimentos fluidos de código, otimizações de fluxo de controle e análise precisa de intervalo numérico, todos anteriormente inatingíveis.

## Uma arquitetura em camadas

Compiladores tendem a se tornar complexos ao longo do tempo à medida que novos recursos de linguagem são suportados, novas otimizações são adicionadas e novas arquiteturas de computador são visadas. Com o TurboFan, tiramos lições de muitos compiladores e desenvolvemos uma arquitetura em camadas para permitir que o compilador lide com essas demandas ao longo do tempo. Uma separação mais clara entre a linguagem de nível de fonte (JavaScript), as capacidades da VM (V8) e as complexidades da arquitetura (de x86 a ARM a MIPS) permite um código mais limpo e robusto. O uso de camadas permite que os desenvolvedores do compilador raciocinem localmente ao implementar otimizações e recursos, bem como escrevam testes unitários mais eficazes. Também economiza código. Cada uma das 7 arquiteturas alvo suportadas pelo TurboFan requer menos de 3.000 linhas de código específico da plataforma, contra 13.000-16.000 no CrankShaft. Isso permitiu que engenheiros da ARM, Intel, MIPS e IBM contribuíssem de forma muito mais eficaz para o TurboFan. O design flexível do TurboFan separa o frontend JavaScript dos backends dependentes da arquitetura, permitindo um suporte mais fácil a todos os recursos futuros do ES6.

## Otimizações mais sofisticadas

O JIT TurboFan implementa otimizações mais agressivas do que o CrankShaft por meio de uma série de técnicas avançadas. O JavaScript entra no pipeline do compilador em uma forma principalmente não otimizada e é traduzido e otimizado para formas progressivamente inferiores até que o código de máquina seja gerado. O ponto central do design é uma representação interna (IR) de código em formato mais relaxado por um mar de nós, permitindo reordenação e otimização mais eficazes.

![Exemplo de gráfico do TurboFan](/_img/turbofan-jit/example-graph.png)

A análise de intervalo numérico ajuda o TurboFan a compreender muito melhor o código que manipula números. A IR baseada em gráficos permite que a maioria das otimizações sejam expressas como reduções locais simples, que são mais fáceis de escrever e testar de forma independente. Um motor de otimização aplica essas regras locais de forma sistemática e meticulosa. A transição da representação gráfica envolve um algoritmo inovador de escalonamento que usa a liberdade de reordenamento para mover trechos de código para fora de loops e caminhos menos frequentemente executados. Finalmente, otimizações específicas de arquitetura, como seleção complexa de instruções, exploram os recursos de cada plataforma alvo para obter o melhor código de qualidade.

## Entregando um novo nível de desempenho

Já [estamos observando alguns ótimos ganhos de velocidade](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html) com o TurboFan, mas ainda há muito trabalho a ser feito. Fiquem atentos enquanto habilitamos mais otimizações e ativamos o TurboFan para mais tipos de código!
