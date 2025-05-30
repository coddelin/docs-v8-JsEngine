---
title: "Cache de código melhorado"
author: "Mythri Alle, Chefe de Cache de Código"
date: "2018-04-24 13:33:37"
avatars: 
  - "mythri-alle"
tags: 
  - internos
tweet: "988728000677142528"
description: "A partir do Chrome 66, o V8 armazena em cache mais (byte)código gerando o cache após a execução de alto nível."
---
O V8 usa [armazenamento em cache de código](/blog/code-caching) para guardar o código gerado de scripts usados frequentemente. A partir do Chrome 66, estamos armazenando mais código em cache ao gerar o cache após a execução de alto nível. Isso resulta em uma redução de 20–40% no tempo de análise e compilação durante o carregamento inicial.

<!--truncate-->
## Contexto

O V8 utiliza dois tipos de armazenamento em cache de código para guardar o código gerado e reutilizá-lo posteriormente. O primeiro é o cache em memória, disponível dentro de cada instância do V8. O código gerado após a compilação inicial é armazenado nesse cache, baseado na string de origem. Isso está disponível para reutilização dentro da mesma instância do V8. O outro tipo de armazenamento em cache de código serializa o código gerado e o armazena no disco para uso futuro. Este cache não é específico de uma instância particular do V8 e pode ser usado em diferentes instâncias do V8. Este post foca nesse segundo tipo de cache de código usado no Chrome. (Outros sistemas que utilizam o V8 também usam este tipo de cache de código; ele não é exclusivo do Chrome. No entanto, este post apenas explora seu uso no Chrome.)

O Chrome armazena o código gerado serializado no cache do disco e o indexa com a URL do recurso de script. Ao carregar um script, o Chrome verifica o cache do disco. Se o script já estiver em cache, o Chrome passa os dados serializados para o V8 como parte da solicitação de compilação. O V8, então, desserializa esses dados em vez de analisar e compilar o script. Há também verificações adicionais para garantir que o código ainda seja utilizável (por exemplo, uma incompatibilidade de versão torna os dados em cache inviáveis).

Dados do mundo real mostram que as taxas de acerto do cache de código (para scripts que poderiam ser armazenados em cache) são altas (~86%). Embora as taxas de acerto do cache sejam altas para esses scripts, a quantidade de código que armazenamos em cache por script não é muito alta. Nossa análise mostrou que aumentar a quantidade de código armazenada em cache reduziria o tempo gasto na análise e compilação de código JavaScript em cerca de 40%.

## Aumentando a quantidade de código armazenada em cache

Na abordagem anterior, o armazenamento em cache do código estava vinculado às solicitações para compilar o script.

Os sistemas que utilizam o V8 podiam solicitar que o V8 serializasse o código gerado durante sua compilação de alto nível de um novo arquivo de origem JavaScript. O V8 retornava o código serializado após compilar o script. Quando o Chrome solicitava o mesmo script novamente, o V8 buscava o código serializado no cache e o desserializava. O V8 evitava completamente recompilar funções que já estavam no cache. Esses cenários são mostrados na figura a seguir:

![](/_img/improved-code-caching/warm-hot-run-1.png)

O V8 apenas compila as funções que se espera serem executadas imediatamente (IIFEs) durante a compilação de alto nível e marca outras funções para compilação preguiçosa. Isso ajuda a melhorar os tempos de carregamento da página ao evitar compilar funções que não são necessárias, no entanto, significa que os dados serializados contêm apenas o código das funções que são compiladas imediatamente.

Antes do Chrome 59, tínhamos que gerar o cache de código antes que qualquer execução tivesse começado. O compilador anterior do V8 (Full-codegen) gerava código especializado para o contexto de execução. O Full-codegen usava patch de código para caminhos rápidos de operações no contexto de execução específico. Tal código não podia ser serializado facilmente removendo os dados específicos do contexto para serem usados em outros contextos de execução.

Com [o lançamento do Ignition](/blog/launching-ignition-and-turbofan) no Chrome 59, essa restrição não é mais necessária. O Ignition usa [caches inline orientados por dados](https://www.youtube.com/watch?v=u7zRSm8jzvA) para acelerar operações no contexto de execução atual. Os dados dependentes do contexto são armazenados em vetores de feedback e estão separados do código gerado. Isso abriu a possibilidade de gerar caches de código mesmo após a execução do script. Conforme executamos o script, mais funções (que foram marcadas para compilação preguiçosa) são compiladas, permitindo armazenar mais código em cache.

O V8 expõe uma nova API, `ScriptCompiler::CreateCodeCache`, para solicitar caches de código independentemente das solicitações de compilação. Solicitar caches de código junto com solicitações de compilação está obsoleto e não funcionará a partir do V8 v6.6. Desde a versão 66, o Chrome usa essa API para solicitar o cache de código após a execução de nível superior. A figura a seguir mostra o novo cenário de solicitação do cache de código. O cache de código é solicitado após a execução de nível superior e, portanto, contém o código para funções que foram compiladas posteriormente durante a execução do script. Nas execuções posteriores (mostradas como execuções quentes na figura a seguir), isso evita a compilação de funções durante a execução de nível superior.

![](/_img/improved-code-caching/warm-hot-run-2.png)

## Resultados

O desempenho deste recurso foi medido usando nossos [benchmarks de mundo real](https://cs.chromium.org/chromium/src/tools/perf/page_sets/v8_top_25.py?q=v8.top&sq=package:chromium&l=1). O gráfico a seguir mostra a redução no tempo de análise e compilação em comparação ao esquema de cache anterior. Há uma redução de cerca de 20–40% tanto no tempo de análise quanto no tempo de compilação na maioria das páginas.

![](/_img/improved-code-caching/parse.png)

![](/_img/improved-code-caching/compile.png)

Dados coletados em condições reais mostram resultados semelhantes, com uma redução de 20–40% no tempo gasto para compilar o código JavaScript, tanto em desktops quanto em dispositivos móveis. No Android, essa otimização também se traduz em uma redução de 1–2% em métricas de carregamento de página de nível superior, como o tempo necessário para que uma página da web se torne interativa. Também monitoramos o uso de memória e disco do Chrome e não observamos regressões perceptíveis.
