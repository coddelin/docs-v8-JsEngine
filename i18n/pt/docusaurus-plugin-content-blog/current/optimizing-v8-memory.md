---
title: &apos;Otimizando o consumo de memória do V8&apos;
author: &apos;os Engenheiros de Saneamento de Memória do V8 Ulan Degenbaev, Michael Lippautz, Hannes Payer e Toon Verwaest&apos;
avatars:
  - &apos;ulan-degenbaev&apos;
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2016-10-07 13:33:37
tags:
  - memória
  - benchmarks
description: &apos;A equipe do V8 analisou e reduziu significativamente o consumo de memória de diversos websites que foram identificados como representativos dos padrões modernos de desenvolvimento web.&apos;
---
O consumo de memória é uma dimensão importante no espaço de trade-off de desempenho das máquinas virtuais JavaScript. Nos últimos meses, a equipe do V8 analisou e reduziu significativamente o consumo de memória de diversos websites que foram identificados como representativos dos padrões modernos de desenvolvimento web. Neste post, apresentamos os workloads e ferramentas que utilizamos em nossa análise, destacamos as otimizações de memória no coletor de lixo e mostramos como reduzimos a memória consumida pelo parser e pelos compiladores do V8.

<!--truncate-->
## Benchmarks

Para perfilar o V8 e descobrir otimizações que têm impacto para o maior número de usuários, é crucial definir workloads que sejam reproduzíveis, significativos e que simulem cenários comuns de uso de JavaScript no mundo real. Uma ótima ferramenta para esta tarefa é o [Telemetry](https://catapult.gsrc.io/telemetry), uma estrutura de testes de desempenho que executa interações programadas em websites no Chrome e registra todas as respostas do servidor para permitir a repetição previsível dessas interações em nosso ambiente de testes. Selecionamos um conjunto de websites populares de notícias, redes sociais e mídia e definimos as seguintes interações comuns de usuários para eles:

Um workload para navegar em websites de notícias e redes sociais:

1. Abra um website popular de notícias ou redes sociais, por exemplo, Hacker News.
1. Clique no primeiro link.
1. Aguarde até que o novo website seja carregado.
1. Role para baixo algumas páginas.
1. Clique no botão de voltar.
1. Clique no próximo link no website original e repita os passos 3-6 algumas vezes.

Um workload para navegar em websites de mídia:

1. Abra um item em um website popular de mídia, por exemplo, um vídeo no YouTube.
1. Consuma esse item aguardando alguns segundos.
1. Clique no próximo item e repita os passos 2-3 algumas vezes.

Uma vez que o fluxo de trabalho é capturado, ele pode ser reproduzido tantas vezes quanto necessário em uma versão de desenvolvimento do Chrome, por exemplo, sempre que há uma nova versão do V8. Durante a reprodução, o uso de memória do V8 é amostrado em intervalos fixos para obter uma média significativa. Os benchmarks podem ser encontrados [aqui](https://cs.chromium.org/chromium/src/tools/perf/page_sets/system_health/browsing_stories.py?q=browsing+news&sq=package:chromium&dr=CS&l=11).

## Visualização de memória

Um dos principais desafios na otimização de desempenho em geral é obter uma imagem clara do estado interno da máquina virtual para acompanhar o progresso ou avaliar possíveis compensações. Para otimizar o consumo de memória, isso significa acompanhar de forma precisa o consumo de memória do V8 durante a execução. Há duas categorias de memória que devem ser rastreadas: memória alocada no heap gerenciado do V8 e memória alocada no heap C++. A funcionalidade **V8 Heap Statistics** é um mecanismo usado pelos desenvolvedores que trabalham nos internos do V8 para obter uma visão detalhada de ambos. Quando a flag `--trace-gc-object-stats` é especificada ao executar o Chrome (versão 54 ou mais recente) ou a interface de linha de comando `d8`, o V8 exibe estatísticas relacionadas à memória no console. Construímos uma ferramenta personalizada, [o visualizador de heap do V8](https://mlippautz.github.io/v8-heap-stats/), para visualizar essa saída. A ferramenta mostra uma visão baseada em linha do tempo para os heaps gerenciado e C++. A ferramenta também fornece uma análise detalhada do uso de memória de certos tipos de dados internos e histogramas baseados em tamanho para cada um desses tipos.

Um fluxo de trabalho comum durante nossos esforços de otimização envolve selecionar um tipo de instância que ocupa uma grande porção do heap na visão de linha do tempo, conforme mostrado na Figura 1. Uma vez que um tipo de instância é selecionado, a ferramenta mostra uma distribuição de usos desse tipo. Neste exemplo, selecionamos a estrutura de dados interna FixedArray do V8, que é um contêiner semelhante a um vetor não tipado usado amplamente em vários lugares na VM. A Figura 2 mostra uma distribuição típica de FixedArray, onde podemos ver que a maioria da memória pode ser atribuída a um cenário específico de uso de FixedArray. Neste caso, os FixedArrays são usados como armazenamento base para arrays esparsos do JavaScript (o que chamamos de DICTIONARY\_ELEMENTS). Com essas informações, é possível referir-se ao código real e verificar se essa distribuição é de fato o comportamento esperado ou se existe uma oportunidade de otimização. Usamos a ferramenta para identificar ineficiências em diversos tipos internos.

![Figura 1: Visão de linha do tempo de memória gerenciada e memória fora do heap](/_img/optimizing-v8-memory/timeline-view.png)

![Figura 2: Distribuição do tipo de instância](/_img/optimizing-v8-memory/distribution.png)

A Figura 3 mostra o consumo de memória do heap do C++, que consiste principalmente em memória de zonas (regiões temporárias de memória usadas pelo V8 por um curto período de tempo; discutidas em mais detalhes abaixo). Como a memória de zonas é mais extensivamente utilizada pelo analisador e compiladores do V8, os picos correspondem a eventos de análise e compilação. Uma execução bem-comportada consiste apenas de picos, indicando que a memória é liberada assim que não é mais necessária. Em contraste, platôs (ou seja, períodos mais longos de tempo com maior consumo de memória) indicam que há espaço para otimização.

![Figura 3: Memória de zonas](/_img/optimizing-v8-memory/zone-memory.png)

Adotantes precoces também podem experimentar a integração na [infraestrutura de rastreamento do Chrome](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool). Para isso, é necessário executar a última versão do Chrome Canary com `--track-gc-object-stats` e [capturar um rastreamento](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/recording-tracing-runs#TOC-Capture-a-trace-on-Chrome-desktop) incluindo a categoria `v8.gc_stats`. Os dados aparecerão então no evento `V8.GC_Object_Stats`.

## Redução do tamanho do heap de JavaScript

Há uma compensação inerente entre a taxa de transferência da coleta de lixo, a latência e o consumo de memória. Por exemplo, a latência da coleta de lixo (que causa interrupções visíveis ao usuário) pode ser reduzida ao usar mais memória para evitar convocações frequentes de coleta de lixo. Para dispositivos móveis de baixa memória, ou seja, dispositivos com menos de 512 MB de RAM, priorizar latência e taxa de transferência sobre o consumo de memória pode resultar em falhas por falta de memória e abas suspensas no Android.

Para equilibrar melhor as compensações corretas para esses dispositivos móveis de baixa memória, introduzimos um modo especial de redução de memória que ajusta várias heurísticas de coleta de lixo para reduzir o uso de memória do heap coletado por lixo do JavaScript.

1. No final de uma coleta completa de lixo, a estratégia de crescimento do heap do V8 determina quando a próxima coleta de lixo ocorrerá com base na quantidade de objetos vivos com uma margem adicional. No modo de redução de memória, o V8 usa menos margem, resultando em menos uso de memória devido a coletas de lixo mais frequentes.
1. Além disso, essa estimativa é tratada como um limite rígido, forçando o trabalho de marcação incremental não finalizado a ser concluído na pausa principal da coleta de lixo. Normalmente, quando não está no modo de redução de memória, o trabalho de marcação incremental não finalizado pode resultar em exceder arbitrariamente esse limite para acionar a pausa principal da coleta de lixo apenas quando a marcação estiver concluída.
1. A fragmentação de memória é ainda mais reduzida ao realizar uma compactação de memória mais agressiva.

A Figura 4 apresenta algumas melhorias em dispositivos de baixa memória desde o Chrome 53. Mais notadamente, o consumo médio de memória do heap do V8 no benchmark móvel do New York Times foi reduzido em cerca de 66%. No geral, observamos uma redução de 50% no tamanho médio do heap do V8 neste conjunto de benchmarks.

![Figura 4: Redução da memória do heap do V8 desde o Chrome 53 em dispositivos de baixa memória](/_img/optimizing-v8-memory/heap-memory-reduction.png)

Outra otimização introduzida recentemente não apenas reduz memória em dispositivos de baixa memória, mas também em dispositivos móveis mais robustos e máquinas de desktop. Reduzir o tamanho da página do heap do V8 de 1 MB para 512 kB resulta em uma pegada de memória menor quando há poucos objetos vivos presentes e menor fragmentação geral de memória em até 2 vezes. Também permite que o V8 realize mais trabalho de compactação desde que blocos de trabalho menores permitem mais trabalho sendo feito em paralelo pelos threads de compactação de memória.

## Redução da memória de zonas

Além do heap de JavaScript, o V8 usa memória fora do heap para operações internas da VM. O maior pedaço de memória é alocado através de áreas de memória chamadas _zonas_. Zonas são um tipo de alocador de memória baseado em regiões que permite alocação rápida e desallocação em massa onde toda a memória alocada em zonas é liberada de uma vez quando a zona é destruída. Zonas são usadas ao longo do analisador e compiladores do V8.

Uma das principais melhorias no Chrome 55 vem da redução do consumo de memória durante a análise em segundo plano. A análise em segundo plano permite que o V8 analise scripts enquanto uma página está sendo carregada. A ferramenta de visualização de memória nos ajudou a descobrir que o analisador em segundo plano mantinha uma zona inteira viva muito tempo depois que o código já havia sido compilado. Ao liberar a zona imediatamente após a compilação, reduzimos significativamente o tempo de vida das zonas, o que resultou na redução do uso médio e do uso máximo de memória.

Outra melhoria resulta de uma melhor compactação dos campos em nós da _árvore sintática abstrata_ gerados pelo analisador. Anteriormente, confiávamos no compilador C++ para compactar campos juntos sempre que possível. Por exemplo, dois valores booleanos exigem apenas dois bits e devem estar localizados dentro de uma palavra ou na fração não utilizada da palavra anterior. O compilador C++ nem sempre encontra a compactação mais densa, então, em vez disso, organizamos manualmente os bits. Isso não apenas resulta em uma diminuição no uso máximo de memória, mas também melhora o desempenho do analisador e do compilador.

A Figura 5 mostra as melhorias no uso máximo de memória da zona desde o Chrome 54, que foi reduzido em cerca de 40% em média nos sites medidos.

![Figura 5: Redução no uso máximo de memória da zona no V8 desde o Chrome 54 em desktops](/_img/optimizing-v8-memory/peak-zone-memory-reduction.png)

Nos próximos meses, continuaremos trabalhando na redução da pegada de memória do V8. Temos mais otimizações planejadas para a memória da zona no analisador e pretendemos focar em dispositivos com memória que varia de 512 MB a 1 GB.

**Atualização:** Todas as melhorias discutidas acima reduzem o consumo geral de memória do Chrome 55 em até 35% em _dispositivos com pouca memória_ em comparação com o Chrome 53. Outros segmentos de dispositivos só se beneficiam das melhorias na memória da zona.
