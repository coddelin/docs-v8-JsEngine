---
title: "O Chrome saúda o Speedometer 2.0!"
author: "as equipes Blink e V8"
date: 2018-01-24 13:33:37
tags:
  - benchmarks
description: "Uma visão geral das melhorias de desempenho que fizemos até agora no Blink e no V8 com base no Speedometer 2.0."
tweet: "956232641736421377"
---
Desde o lançamento inicial do Speedometer 1.0 em 2014, as equipes Blink e V8 têm usado o benchmark como um proxy para uso real de frameworks populares de JavaScript e conseguimos ganhos de velocidade consideráveis nesse benchmark. Verificamos independentemente que essas melhorias se traduzem em benefícios reais para os usuários, medindo contra sites reais e observando que as melhorias nos tempos de carregamento de páginas de sites populares também melhoraram a pontuação no Speedometer.

<!--truncate-->
O JavaScript evoluiu rapidamente nesse meio tempo, adicionando muitas novas funcionalidades de linguagem com os padrões ES2015 e posteriores. O mesmo é verdadeiro para os próprios frameworks, e como tal, o Speedometer 1.0 tornou-se obsoleto com o tempo. Portanto, usar o Speedometer 1.0 como um indicador de otimização aumenta o risco de não medir padrões de código mais recentes que estão sendo ativamente utilizados.

As equipes Blink e V8 saúdam [o lançamento recente do benchmark atualizado Speedometer 2.0](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/). Aplicar o conceito original a uma lista de frameworks contemporâneos, transpiladores e funcionalidades do ES2015 torna o benchmark novamente um candidato principal para otimizações. Speedometer 2.0 é uma ótima adição [à nossa ferramenta de benchmarking de desempenho no mundo real](/blog/real-world-performance).

## Avanços do Chrome até agora

As equipes Blink e V8 já concluíram uma primeira rodada de melhorias, sublinhando a importância deste benchmark para nós e continuando nossa jornada de foco no desempenho do mundo real. Comparando o Chrome 60 de julho de 2017 com o mais recente Chrome 64, alcançamos uma melhoria de cerca de 21% na pontuação total (execuções por minuto) em um Macbook Pro de meados de 2016 (4 núcleos, 16GB de RAM).

![Comparação das pontuações do Speedometer 2 entre o Chrome 60 e o 64](/_img/speedometer-2/scores.png)

Vamos dar um zoom nos itens individuais do Speedometer 2.0. Dobrámos o desempenho do runtime do React ao melhorar [`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18). Vanilla-ES2015, AngularJS, Preact e VueJS melhoraram de 19% a 42% devido a [aceleração na análise do JSON](https://chromium-review.googlesource.com/c/v8/v8/+/700494) e várias outras correções de desempenho. O runtime do app jQuery-TodoMVC foi reduzido por melhorias na implementação do DOM do Blink, incluindo [controles de formulário mais leves](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd) e [ajustes em nosso parser HTML](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef). Ajustes adicionais nos caches inline do V8 em combinação com o compilador de otimização resultaram em melhorias gerais.

![Melhorias de pontuação para cada subteste do Speedometer 2 no Chrome 60 a 64](/_img/speedometer-2/improvements.png)

Uma mudança significativa em relação ao Speedometer 1.0 é o cálculo da pontuação final. Anteriormente, a média de todas as pontuações favorecia o trabalho apenas nos itens mais lentos. Quando olhamos para os tempos absolutos gastos em cada item, vemos, por exemplo, que a versão EmberJS-Debug demora aproximadamente 35 vezes mais que o benchmark mais rápido. Portanto, para melhorar a pontuação geral, focar no EmberJS-Debug tem o maior potencial.

![](/_img/speedometer-2/time.png)

O Speedometer 2.0 usa a média geométrica para a pontuação final, favorecendo investimentos iguais em cada framework. Consideremos nossa recente melhoria de 16,5% no Preact mencionada acima. Seria bastante injusto abandonar a melhoria de 16,5% apenas por causa de sua contribuição menor ao tempo total.

Estamos ansiosos para trazer mais melhorias de desempenho ao Speedometer 2.0 e, consequentemente, à web como um todo. Fique ligado para mais atualizações de desempenho.
