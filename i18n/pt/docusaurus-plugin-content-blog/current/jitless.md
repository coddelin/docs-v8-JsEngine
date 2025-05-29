---
title: "V8 sem JIT"
author: "Jakob Gruber ([@schuay](https://twitter.com/schuay))"
avatars:
  - "jakob-gruber"
date: 2019-03-13 13:03:19
tags:
  - internos
description: "O V8 v7.4 suporta execução de JavaScript sem alocar memória executável em tempo de execução."
tweet: "1105777150051999744"
---
O V8 v7.4 agora suporta execução de JavaScript sem alocar memória executável em tempo de execução.

Na sua configuração padrão, o V8 depende muito da capacidade de alocar e modificar memória executável em tempo de execução. Por exemplo, o [compilador otimizador TurboFan](/blog/turbofan-jit) cria código nativo para funções JavaScript (JS) em tempo de execução, e a maioria das expressões regulares de JS são compiladas em código nativo pelo [motor irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html). Criar memória executável em tempo de execução é parte do que torna o V8 rápido.

<!--truncate-->
Mas em algumas situações pode ser desejável executar o V8 sem alocar memória executável:

1. Algumas plataformas (por exemplo, iOS, smart TVs, consoles de jogos) proíbem o acesso de escrita à memória executável para aplicativos sem privilégios, e até agora tem sido impossível usar o V8 nessas plataformas; e
1. proibir a escrita em memória executável reduz a superfície de ataque do aplicativo a explorações.

O novo modo sem JIT do V8 é destinado a abordar esses pontos. Quando o V8 é iniciado com a flag `--jitless`, ele é executado sem nenhuma alocação de memória executável em tempo de execução.

Como funciona? Essencialmente, o V8 muda para um modo apenas de interpretador com base na nossa tecnologia existente: todo o código de usuário em JS é executado pelo [interpretador Ignition](/blog/ignition-interpreter), e o padrão de correspondência de expressões regulares também é interpretado. WebAssembly atualmente não é suportado, mas interpretação está dentro das possibilidades. Os builtins do V8 ainda são compilados para código nativo, mas não fazem mais parte da heap gerenciada de JS, graças aos nossos esforços recentes para [incorporá-los no binário do V8](/blog/embedded-builtins).

Por fim, estas mudanças nos permitiram criar a heap do V8 sem exigir permissões executáveis para nenhuma de suas regiões de memória.

## Resultados

Como o modo sem JIT desativa o compilador otimizador, isso resulta em uma penalidade de desempenho. Analisamos uma variedade de benchmarks para entender melhor como as características de desempenho do V8 mudam. [Speedometer 2.0](/blog/speedometer-2) é destinado a representar um aplicativo web típico; o [Web Tooling Benchmark](/blog/web-tooling-benchmark) inclui um conjunto de ferramentas comuns para desenvolvedores JS; e também incluímos um benchmark que simula um [fluxo de navegação no aplicativo YouTube da sala de estar](https://chromeperf.appspot.com/report?sid=518c637ffa0961f965afe51d06979375467b12b87e72061598763e5a36876306). Todas as medições foram feitas localmente em um desktop Linux x64 durante 5 execuções.

![Sem JIT vs. V8 padrão. Pontuações são normalizadas para 100 na configuração padrão do V8.](/_img/jitless/benchmarks.svg)

O Speedometer 2.0 é cerca de 40% mais lento no modo sem JIT. Aproximadamente metade da regressão pode ser atribuída ao compilador otimizador desativado. A outra metade é causada pelo interpretador de expressões regulares, que foi originalmente projetado como um auxílio para depuração, e verá melhorias de desempenho no futuro.

O Web Tooling Benchmark tende a gastar mais tempo em código otimizado pelo TurboFan e, portanto, mostra uma regressão maior de 80% quando o modo sem JIT está ativado.

Finalmente, medimos uma sessão de navegação simulada no aplicativo YouTube da sala de estar, que inclui tanto reprodução de vídeo quanto navegação no menu. Aqui, o modo sem JIT está aproximadamente equivalente e apresenta apenas uma desaceleração de 6% na execução de JS em comparação com uma configuração padrão do V8. Este benchmark demonstra como o desempenho máximo de código otimizado nem sempre está correlacionado com o [desempenho do mundo real](/blog/real-world-performance), e em muitas situações os utilizadores podem manter um desempenho razoável mesmo no modo sem JIT.

O consumo de memória mudou apenas ligeiramente, com uma mediana de 1,7% de diminuição no tamanho da heap do V8 para carregar um conjunto representativo de websites.

Encorajamos os utilizadores em plataformas restritas ou com requisitos especiais de segurança a considerar o novo modo sem JIT do V8, disponível agora no V8 v7.4. Como sempre, perguntas e feedback são bem-vindos no grupo de discussão [v8-users](https://groups.google.com/forum/#!forum/v8-users).

## Perguntas Frequentes

*Qual é a diferença entre `--jitless` e `--no-opt`?*

`--no-opt` desativa o compilador otimizador TurboFan. `--jitless` desativa toda a alocação de memória executável em tempo de execução.
